import supabase from '../utils/supabaseClient';
import config from '../config';
import { rugcheckConfig } from '../config/rugcheckConfig';
import { SimpleCache } from '../utils/rateLimitWrapper';
import { EventEmitter } from 'events';
import { redis, cacheKeys, CACHE_TTL, getCached, setCached } from '../utils/upstashClient';

interface LiquiditySnapshot {
  tokenMint: string;
  timestamp: number;
  liquidityUSD: number;
  price: number;
  volume24h: number;
  holderCount: number;
  source: string;
}

interface VelocityData {
  tokenMint: string;
  current: LiquiditySnapshot;
  velocities: {
    liquidity1m: number;  // % change per minute over 1 minute
    liquidity5m: number;  // % change per minute over 5 minutes
    liquidity30m: number; // % change per minute over 30 minutes
    price1m: number;
    price5m: number;
    price30m: number;
    volume1m: number;
    volume5m: number;
    volume30m: number;
    holders1m: number;
    holders5m: number;
    holders30m: number;
  };
  alerts: {
    flashRug: boolean;      // >50% liquidity in <5 min
    rapidDrain: boolean;    // >30% liquidity in <30 min
    slowBleed: boolean;     // Consistent 5-10%/hour drain
    volumeSpike: boolean;   // 10x volume increase
  };
}

export class LiquidityVelocityTracker extends EventEmitter {
  private pollingInterval: NodeJS.Timeout | null = null;
  private snapshotCache: SimpleCache<LiquiditySnapshot[]>;
  private velocityCache: SimpleCache<VelocityData>;
  private trackedTokens: Set<string> = new Set();
  private readonly POLLING_INTERVAL = config.velocityPollInterval || 30000; // 30 seconds default
  private readonly MAX_SNAPSHOTS = 120; // 1 hour of data at 30s intervals

  constructor() {
    super();
    this.snapshotCache = new SimpleCache(3600000); // 1 hour TTL
    this.velocityCache = new SimpleCache(60000); // 1 minute TTL
    console.log('[LiquidityVelocityTracker] Initialized');
  }

  /**
   * Start tracking a token
   */
  public async trackToken(tokenMint: string): Promise<void> {
    this.trackedTokens.add(tokenMint);
    console.log(`[LiquidityVelocityTracker] Now tracking ${tokenMint}`);
    
    // Take initial snapshot
    await this.takeSnapshot(tokenMint);
  }

  /**
   * Stop tracking a token
   */
  public stopTrackingToken(tokenMint: string): void {
    this.trackedTokens.delete(tokenMint);
    this.snapshotCache.delete(tokenMint);
    this.velocityCache.delete(tokenMint);
    console.log(`[LiquidityVelocityTracker] Stopped tracking ${tokenMint}`);
  }

  /**
   * Start the velocity tracking service
   */
  public start(): void {
    if (this.pollingInterval) {
      console.warn('[LiquidityVelocityTracker] Already running');
      return;
    }

    console.log('[LiquidityVelocityTracker] Starting velocity tracking...');
    
    // Start polling
    this.pollingInterval = setInterval(() => {
      this.pollAllTokens().catch(error => {
        console.error('[LiquidityVelocityTracker] Polling error:', error);
      });
    }, this.POLLING_INTERVAL);

    // Initial poll
    this.pollAllTokens();
  }

  /**
   * Stop the velocity tracking service
   */
  public stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('[LiquidityVelocityTracker] Stopped');
  }

  /**
   * Poll all tracked tokens
   */
  private async pollAllTokens(): Promise<void> {
    const tokens = Array.from(this.trackedTokens);
    if (tokens.length === 0) return;

    console.log(`[LiquidityVelocityTracker] Polling ${tokens.length} tokens`);

    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      await Promise.all(batch.map(token => this.updateTokenVelocity(token)));
    }
  }

  /**
   * Take a snapshot of current token metrics
   */
  private async takeSnapshot(tokenMint: string): Promise<LiquiditySnapshot | null> {
    try {
      // Get liquidity data
      const { data: liquidityData, error: liquidityError } = await supabase
        .from('pool_liquidity')
        .select('liquidity_usd')
        .eq('token_mint', tokenMint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (liquidityError && liquidityError.code !== 'PGRST116') {
        console.log(`[LiquidityVelocityTracker] No liquidity data for ${tokenMint} (may not have pool yet)`);
      }

      // Get current price from token_prices
      const { data: priceData, error: priceError } = await supabase
        .from('token_prices')
        .select('price, price_usd, market_cap')
        .eq('token_mint', tokenMint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (priceError && priceError.code !== 'PGRST116') {
        console.log(`[LiquidityVelocityTracker] Error fetching price for ${tokenMint}:`, priceError.message);
      }

      // Also store this price in history for future calculations
      if (priceData?.price) {
        const { error: historyError } = await supabase
          .from('token_price_history')
          .insert({
            token_mint: tokenMint,
            price: priceData.price_usd || priceData.price,
            liquidity: liquidityData?.liquidity_usd || null,
            market_cap: priceData.market_cap || null,
            recorded_at: new Date().toISOString(),
            source: 'velocity_tracker'
          });
        
        if (historyError) {
          console.log('[LiquidityVelocityTracker] Price history insert error:', historyError.message);
        }
      }

      // Get volume data
      const { data: volumeData, error: volumeError } = await supabase
        .from('token_volumes')
        .select('volume_24h_usd')
        .eq('token_mint', tokenMint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (volumeError && volumeError.code !== 'PGRST116') {
        console.log(`[LiquidityVelocityTracker] Error fetching volume for ${tokenMint}:`, volumeError.message);
      }

      // Get holder count
      const { data: holderData, error: holderError } = await supabase
        .from('rugcheck_reports')
        .select('holders')
        .eq('token_mint', tokenMint)
        .single();

      if (holderError && holderError.code !== 'PGRST116') {
        console.log(`[LiquidityVelocityTracker] Error fetching holder data for ${tokenMint}:`, holderError.message);
      }

      // If we don't have liquidity data but have price data, we can still track price velocity
      const hasValidData = (priceData?.price_usd || priceData?.price) > 0 || liquidityData?.liquidity_usd > 0;
      
      if (!hasValidData) {
        console.log(`[LiquidityVelocityTracker] No valid data for ${tokenMint} snapshot yet`);
        // Still create a minimal snapshot to start tracking
      }

      const snapshot: LiquiditySnapshot = {
        tokenMint,
        timestamp: Date.now(),
        liquidityUSD: liquidityData?.liquidity_usd || 0,
        price: priceData?.price_usd || priceData?.price || 0, // Use price_usd if available, fallback to price
        volume24h: volumeData?.volume_24h_usd || 0,
        holderCount: holderData?.holders || 0,
        source: 'velocity_tracker'
      };

      // Store snapshot
      const snapshots = this.snapshotCache.get(tokenMint) || [];
      snapshots.push(snapshot);
      
      // Keep only recent snapshots
      if (snapshots.length > this.MAX_SNAPSHOTS) {
        snapshots.shift();
      }
      
      this.snapshotCache.set(tokenMint, snapshots);
      
      return snapshot;
    } catch (error) {
      console.error(`[LiquidityVelocityTracker] Error taking snapshot for ${tokenMint}:`, error);
      return null;
    }
  }

  /**
   * Update velocity metrics for a token
   */
  private async updateTokenVelocity(tokenMint: string): Promise<void> {
    try {
      // Take new snapshot
      const currentSnapshot = await this.takeSnapshot(tokenMint);
      if (!currentSnapshot) return;

      // Get historical snapshots
      const snapshots = this.snapshotCache.get(tokenMint) || [];
      if (snapshots.length < 2) {
        console.log(`[LiquidityVelocityTracker] ${tokenMint}: Need at least 2 snapshots, have ${snapshots.length}`);
        return; // Need at least 2 snapshots
      }
      
      // Debug snapshot information
      console.log(`[LiquidityVelocityTracker] ${tokenMint}: Processing ${snapshots.length} snapshots`);
      console.log(`  Current: $${currentSnapshot.liquidityUSD} liquidity, $${currentSnapshot.price} price`);
      console.log(`  Oldest: $${snapshots[0].liquidityUSD} liquidity at ${new Date(snapshots[0].timestamp).toISOString()}`);
      console.log(`  Newest: $${snapshots[snapshots.length-1].liquidityUSD} liquidity at ${new Date(snapshots[snapshots.length-1].timestamp).toISOString()}`);
      
      // Check if we have any meaningful liquidity data across all snapshots
      const hasAnyLiquidity = snapshots.some(s => s.liquidityUSD > 0) || currentSnapshot.liquidityUSD > 0;
      if (!hasAnyLiquidity) {
        console.log(`[LiquidityVelocityTracker] ${tokenMint}: No liquidity data found in any snapshot - skipping velocity calculation`);
      }

      // Calculate velocities at different time windows
      const now = Date.now();
      
      // Calculate liquidity, volume, and holder velocities from snapshots
      const velocities = {
        liquidity1m: this.calculateVelocity(snapshots, currentSnapshot, 60000, 'liquidityUSD'),
        liquidity5m: this.calculateVelocity(snapshots, currentSnapshot, 300000, 'liquidityUSD'),
        liquidity30m: this.calculateVelocity(snapshots, currentSnapshot, 1800000, 'liquidityUSD'),
        price1m: 0, // Will be calculated with historical data
        price5m: 0, // Will be calculated with historical data
        price30m: this.calculateVelocity(snapshots, currentSnapshot, 1800000, 'price'),
        volume1m: this.calculateVelocity(snapshots, currentSnapshot, 60000, 'volume24h'),
        volume5m: this.calculateVelocity(snapshots, currentSnapshot, 300000, 'volume24h'),
        volume30m: this.calculateVelocity(snapshots, currentSnapshot, 1800000, 'volume24h'),
        holders1m: this.calculateVelocity(snapshots, currentSnapshot, 60000, 'holderCount'),
        holders5m: this.calculateVelocity(snapshots, currentSnapshot, 300000, 'holderCount'),
        holders30m: this.calculateVelocity(snapshots, currentSnapshot, 1800000, 'holderCount'),
      };

      // For short-term price changes, use historical data from database
      if (currentSnapshot.price > 0) {
        // Get historical prices for different time windows
        const [price1mAgo, price5mAgo] = await Promise.all([
          this.getHistoricalPrice(tokenMint, 60000),   // 1 minute ago
          this.getHistoricalPrice(tokenMint, 300000)   // 5 minutes ago
        ]);

        // Calculate price velocities using historical data
        if (price1mAgo !== null && price1mAgo > 0) {
          const percentChange = ((currentSnapshot.price - price1mAgo) / price1mAgo) * 100;
          velocities.price1m = percentChange; // Already per minute for 1m window
        }

        if (price5mAgo !== null && price5mAgo > 0) {
          const percentChange = ((currentSnapshot.price - price5mAgo) / price5mAgo) * 100;
          velocities.price5m = percentChange / 5; // Convert to per-minute rate
        }
        
        // Log price velocity calculations for debugging
        if (velocities.price1m !== 0 || velocities.price5m !== 0) {
          console.log(`[LiquidityVelocityTracker] Price velocities for ${tokenMint}:`);
          console.log(`  Current price: $${currentSnapshot.price}`);
          console.log(`  1m ago: $${price1mAgo} → ${velocities.price1m.toFixed(2)}% per minute`);
          console.log(`  5m ago: $${price5mAgo} → ${velocities.price5m.toFixed(2)}% per minute`);
        }
      }

      // Detect alert conditions
      const alerts = {
        flashRug: velocities.liquidity5m < -10, // >50% in 5 min = -10% per minute
        rapidDrain: velocities.liquidity30m < -1, // >30% in 30 min = -1% per minute
        slowBleed: this.detectSlowBleed(snapshots),
        volumeSpike: velocities.volume5m > 200 // 10x increase = 200% per minute over 5 min
      };

      // Create velocity data
      const velocityData: VelocityData = {
        tokenMint,
        current: currentSnapshot,
        velocities,
        alerts
      };

      // Store in local cache
      this.velocityCache.set(tokenMint, velocityData);
      
      // Store in Redis cache for distributed access
      await setCached(cacheKeys.velocity(tokenMint), velocityData, CACHE_TTL.VELOCITY_DATA);

      // Check if token is rugged (but skip newly added tokens)
      if (currentSnapshot.liquidityUSD < 10) {
        // Check if this is a newly added token before marking as rugged
        const { data: tokenInfo } = await supabase
          .from('wallet_tokens')
          .select('is_newly_added, added_at')
          .eq('token_mint', tokenMint)
          .single();
          
        if (tokenInfo?.is_newly_added) {
          console.log(`[LiquidityVelocityTracker] Skipping rug check for newly added token ${tokenMint}`);
          return;
        }
        
        // Check if token is less than 5 minutes old
        const tokenAge = Date.now() - new Date(tokenInfo?.added_at || Date.now()).getTime();
        if (tokenAge < 5 * 60 * 1000) {
          console.log(`[LiquidityVelocityTracker] Skipping rug check for young token ${tokenMint} (${Math.round(tokenAge / 1000)}s old)`);
          return;
        }
        
        // Only mark as rugged if we have historical data showing it had liquidity before
        if (snapshots.length > 2) {
          const hadLiquidity = snapshots.some(s => s.liquidityUSD > 10);
          if (!hadLiquidity) {
            console.log(`[LiquidityVelocityTracker] Token ${tokenMint} has never had liquidity > $10, skipping rug detection`);
            return;
          }
        }
        
        console.error(`💀 [LiquidityVelocityTracker] TOKEN RUGGED: ${tokenMint} (liquidity: $${currentSnapshot.liquidityUSD})`);
        
        // Update protected_tokens to mark as rugged
        await supabase
          .from('protected_tokens')
          .update({
            status: 'RUGGED',
            monitoring_active: false,
            updated_at: new Date()
          })
          .eq('token_mint', tokenMint);
        
        // Stop tracking this token
        this.stopTrackingToken(tokenMint);
        
        // Emit rugged event
        this.emit('token-rugged', { tokenMint, finalLiquidity: currentSnapshot.liquidityUSD });
        return; // Don't process alerts for rugged tokens
      }

      // Emit events for critical alerts
      if (alerts.flashRug) {
        console.error(`🚨 [LiquidityVelocityTracker] FLASH RUG DETECTED: ${tokenMint}`);
        this.emit('flash-rug', { tokenMint, velocityData });
        
        // Add to critical alerts queue in Redis
        await redis.zadd(cacheKeys.criticalAlerts(), {
          score: Date.now(),
          member: JSON.stringify({
            tokenMint,
            type: 'FLASH_RUG',
            severity: 'CRITICAL',
            timestamp: Date.now()
          })
        });
      } else if (alerts.rapidDrain) {
        console.warn(`⚠️ [LiquidityVelocityTracker] Rapid drain detected: ${tokenMint}`);
        this.emit('rapid-drain', { tokenMint, velocityData });
      } else if (alerts.slowBleed) {
        console.warn(`⚠️ [LiquidityVelocityTracker] Slow bleed detected: ${tokenMint}`);
        this.emit('slow-bleed', { tokenMint, velocityData });
      }

      // Store velocity data in database for historical analysis
      await this.storeVelocityData(velocityData);

    } catch (error) {
      console.error(`[LiquidityVelocityTracker] Error updating velocity for ${tokenMint}:`, error);
    }
  }

  /**
   * Calculate velocity (% change per minute) for a metric
   */
  private calculateVelocity(
    snapshots: LiquiditySnapshot[],
    current: LiquiditySnapshot,
    windowMs: number,
    metric: keyof LiquiditySnapshot
  ): number {
    const windowStart = current.timestamp - windowMs;
    const windowMinutes = windowMs / 60000;
    
    // Find the best snapshot within the time window
    const candidateSnapshots = snapshots.filter(s => s.timestamp >= windowStart && s.timestamp < current.timestamp);
    
    // If no snapshots in window, try to find the closest one before the window
    let startSnapshot: LiquiditySnapshot | undefined;
    if (candidateSnapshots.length > 0) {
      // Use the earliest snapshot in the window for most accurate time calculation
      startSnapshot = candidateSnapshots[0];
    } else {
      // Find the most recent snapshot before the window
      const beforeWindow = snapshots.filter(s => s.timestamp < windowStart);
      startSnapshot = beforeWindow.length > 0 ? beforeWindow[beforeWindow.length - 1] : snapshots[0];
    }
    
    if (!startSnapshot || startSnapshot.timestamp >= current.timestamp) {
      console.log(`[calculateVelocity] No valid start snapshot for ${current.tokenMint} ${metric} ${windowMinutes}m window`);
      return 0;
    }
    
    const startValue = startSnapshot[metric] as number;
    const currentValue = current[metric] as number;
    
    // Handle division by zero - if start value is 0 but current isn't, that's infinite growth
    if (startValue === 0) {
      if (currentValue > 0) {
        console.log(`[calculateVelocity] Start value was 0, current is ${currentValue} for ${metric} - returning high positive velocity`);
        return 100; // Return a large positive velocity to indicate growth from zero
      }
      return 0; // Both are zero
    }
    
    const percentChange = ((currentValue - startValue) / startValue) * 100;
    const timeElapsedMinutes = (current.timestamp - startSnapshot.timestamp) / 60000;
    
    if (timeElapsedMinutes <= 0) {
      console.log(`[calculateVelocity] Invalid time elapsed: ${timeElapsedMinutes} minutes`);
      return 0;
    }
    
    const velocity = percentChange / timeElapsedMinutes;
    
    // Debug logging for liquidity calculations
    if (metric === 'liquidityUSD' && Math.abs(velocity) > 0.01) {
      console.log(`[calculateVelocity] ${current.tokenMint} ${metric} ${windowMinutes}m:`);
      console.log(`  Start: $${startValue} at ${new Date(startSnapshot.timestamp).toISOString()}`);
      console.log(`  Current: $${currentValue} at ${new Date(current.timestamp).toISOString()}`);
      console.log(`  Change: ${percentChange.toFixed(2)}% over ${timeElapsedMinutes.toFixed(1)} min`);
      console.log(`  Velocity: ${velocity.toFixed(4)}% per minute`);
    }
    
    return velocity;
  }

  /**
   * Get historical price data from database for velocity calculation
   */
  private async getHistoricalPrice(tokenMint: string, windowMs: number): Promise<number | null> {
    try {
      const windowStart = new Date(Date.now() - windowMs);
      
      // Get the price from around the window start time
      const { data } = await supabase
        .from('token_price_history')
        .select('price, recorded_at')
        .eq('token_mint', tokenMint)
        .gte('recorded_at', windowStart.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(1);
      
      if (data && data.length > 0) {
        return data[0].price;
      }

      // If no data in window, get the most recent price before window
      const { data: historicalData } = await supabase
        .from('token_price_history')
        .select('price, recorded_at')
        .eq('token_mint', tokenMint)
        .lt('recorded_at', windowStart.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);
      
      if (historicalData && historicalData.length > 0) {
        return historicalData[0].price;
      }

      return null;
    } catch (error) {
      console.error(`[LiquidityVelocityTracker] Error fetching historical price:`, error);
      return null;
    }
  }

  /**
   * Detect slow bleed pattern (consistent 5-10% hourly drain)
   */
  private detectSlowBleed(snapshots: LiquiditySnapshot[]): boolean {
    if (snapshots.length < 10) return false;
    
    // Check last hour of data
    const oneHourAgo = Date.now() - 3600000;
    const recentSnapshots = snapshots.filter(s => s.timestamp > oneHourAgo);
    
    if (recentSnapshots.length < 5) return false;
    
    // Count how many periods show consistent drain
    let drainPeriods = 0;
    for (let i = 1; i < recentSnapshots.length; i++) {
      const prev = recentSnapshots[i - 1];
      const curr = recentSnapshots[i];
      
      if (prev.liquidityUSD > 0) {
        const change = ((curr.liquidityUSD - prev.liquidityUSD) / prev.liquidityUSD) * 100;
        
        // Check if drain is between 5-10% per hour (adjust for time period)
        const timeDiffHours = (curr.timestamp - prev.timestamp) / 3600000;
        const hourlyChange = change / timeDiffHours;
        
        if (hourlyChange < -5 && hourlyChange > -10) {
          drainPeriods++;
        }
      }
    }
    
    // If more than 60% of periods show drain, it's a pattern
    return drainPeriods > recentSnapshots.length * 0.6;
  }

  /**
   * Store velocity data in database
   */
  private async storeVelocityData(data: VelocityData): Promise<void> {
    try {
      await supabase
        .from('liquidity_velocity')
        .insert({
          token_mint: data.tokenMint,
          liquidity_usd: data.current.liquidityUSD,
          liquidity_velocity_1m: data.velocities.liquidity1m,
          liquidity_velocity_5m: data.velocities.liquidity5m,
          liquidity_velocity_30m: data.velocities.liquidity30m,
          price_velocity_1m: data.velocities.price1m,
          price_velocity_5m: data.velocities.price5m,
          price_velocity_30m: data.velocities.price30m,
          flash_rug_alert: data.alerts.flashRug,
          rapid_drain_alert: data.alerts.rapidDrain,
          slow_bleed_alert: data.alerts.slowBleed,
          timestamp: new Date(data.current.timestamp)
        });
    } catch (error) {
      // Table might not exist yet - that's okay
      if ((error as any).code !== '42P01') {
        console.error('[LiquidityVelocityTracker] Error storing velocity data:', error);
      }
    }
  }

  /**
   * Get all tracked tokens
   */
  public getTrackedTokens(): string[] {
    return Array.from(this.trackedTokens);
  }

  /**
   * Get historical snapshots for a token
   */
  public getSnapshots(tokenMint: string): LiquiditySnapshot[] {
    return this.snapshotCache.get(tokenMint) || [];
  }

  /**
   * Get velocity data for a token (used by MonitoringStatsService)
   */
  public async getVelocityData(tokenMint: string): Promise<VelocityData | null> {
    // First check local cache
    const localCached = this.velocityCache.get(tokenMint);
    if (localCached) return localCached;
    
    // Then check Redis cache
    const redisCached = await getCached<VelocityData>(cacheKeys.velocity(tokenMint));
    if (redisCached) {
      // If liquidity is 0, try to get latest from DB to ensure we have fresh data
      if (redisCached.current.liquidityUSD === 0) {
        console.log(`[LiquidityVelocityTracker] Cached liquidity is 0 for ${tokenMint}, checking DB...`);
        const latest = await this.getLatestVelocity(tokenMint);
        if (latest && latest.current.liquidityUSD > 0) {
          console.log(`[LiquidityVelocityTracker] Found fresher liquidity in DB: $${latest.current.liquidityUSD}`);
          this.velocityCache.set(tokenMint, latest); 
          return latest;
        }
      }

      // Update local cache with Redis data
      this.velocityCache.set(tokenMint, redisCached);
      return redisCached;
    }
    
    // If no cached data, return default structure
    // This prevents the UI from showing all zeros
    const defaultData: VelocityData = {
      tokenMint,
      current: {
        tokenMint,
        timestamp: Date.now(),
        liquidityUSD: 0,
        price: 0,
        volume24h: 0,
        holderCount: 0,
        source: 'default'
      },
      velocities: {
        liquidity1m: 0,
        liquidity5m: 0,
        liquidity30m: 0,
        price1m: 0,
        price5m: 0,
        price30m: 0,
        volume1m: 0,
        volume5m: 0,
        volume30m: 0,
        holders1m: 0,
        holders5m: 0,
        holders30m: 0
      },
      alerts: {
        flashRug: false,
        rapidDrain: false,
        slowBleed: false,
        volumeSpike: false
      }
    };
    
    return defaultData;
  }

  /**
   * Get latest velocity data for a token
   */
  public async getLatestVelocity(tokenMint: string): Promise<VelocityData | null> {
    // First check local cache
    const localCached = this.velocityCache.get(tokenMint);
    if (localCached) return localCached;
    
    // Then check Redis cache
    const redisCached = await getCached<VelocityData>(cacheKeys.velocity(tokenMint));
    if (redisCached) {
      this.velocityCache.set(tokenMint, redisCached);
      return redisCached;
    }

    // If not cached, try to fetch from database
    try {
      const { data } = await supabase
        .from('liquidity_velocity')
        .select('*')
        .eq('token_mint', tokenMint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        // Convert database format to VelocityData format
        const velocityData: VelocityData = {
          tokenMint: data.token_mint,
          current: {
            tokenMint: data.token_mint,
            timestamp: new Date(data.timestamp).getTime(),
            liquidityUSD: data.liquidity_usd,
            price: 0, // Not stored in this table
            volume24h: 0, // Not stored in this table
            holderCount: 0, // Not stored in this table
            source: 'database'
          },
          velocities: {
            liquidity1m: data.liquidity_velocity_1m || 0,
            liquidity5m: data.liquidity_velocity_5m || 0,
            liquidity30m: data.liquidity_velocity_30m || 0,
            price1m: data.price_velocity_1m || 0,
            price5m: data.price_velocity_5m || 0,
            price30m: data.price_velocity_30m || 0,
            volume1m: 0,
            volume5m: 0,
            volume30m: 0,
            holders1m: 0,
            holders5m: 0,
            holders30m: 0
          },
          alerts: {
            flashRug: data.flash_rug_alert || false,
            rapidDrain: data.rapid_drain_alert || false,
            slowBleed: data.slow_bleed_alert || false,
            volumeSpike: false
          }
        };
        return velocityData;
      }
    } catch (error) {
      console.error('[LiquidityVelocityTracker] Error fetching latest velocity:', error);
    }

    return null;
  }
}

// Export singleton instance
export const liquidityVelocityTracker = new LiquidityVelocityTracker();