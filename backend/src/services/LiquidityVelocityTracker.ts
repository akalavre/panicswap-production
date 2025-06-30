import supabase from '../utils/supabaseClient';
import config from '../config';
import { rugcheckConfig } from '../config/rugcheckConfig';
import { SimpleCache } from '../utils/rateLimitWrapper';
import { EventEmitter } from 'events';
import { helius } from '../utils/heliusClient';
import { rpcCall } from '../utils/rpcGate';
import { Connection } from '@solana/web3.js';
import { createAlertingService } from './AlertingService';

interface LiquiditySnapshot {
  tokenMint: string;
  timestamp: number;
  liquidityUSD: number;
  price: number;
  volume24h: number;
  holderCount: number;
  creatorBalancePercent: number;
  source: string;
}

interface VelocityData {
  tokenMint: string;
  current: LiquiditySnapshot;
  velocities: {
    // Ultra-short windows for flash rug detection
    liquidity10s: number;  // % change over 10 seconds
    liquidity20s: number;  // % change over 20 seconds
    liquidity30s: number;  // % change over 30 seconds
    price10s: number;
    price20s: number;
    price30s: number;
    
    // Standard windows (per minute rates)
    liquidity1m: number;   // % change per minute over 1 minute
    liquidity5m: number;   // % change per minute over 5 minutes
    liquidity30m: number;  // % change per minute over 30 minutes
    price1m: number;
    price5m: number;
    price30m: number;
    volume1m: number;
    volume5m: number;
    volume30m: number;
    holders1m: number;
    holders5m: number;
    holders30m: number;
    creator1m: number;     // Creator balance % change per minute over 1 minute
    creator5m: number;     // Creator balance % change per minute over 5 minutes
    creator30m: number;    // Creator balance % change per minute over 30 minutes
  };
  alerts: {
    flashRug: boolean;      // >50% liquidity in <20 seconds
    rapidDrain: boolean;    // >30% liquidity in <1 min
    slowBleed: boolean;     // Consistent 5-10%/hour drain
    volumeSpike: boolean;   // 10x volume increase
    creatorSelling: boolean; // Creator selling >10% in 5 min
    panicSell: boolean;     // Ultra-high risk detected
  };
  // New fields for adaptive polling
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pollingInterval?: number;  // Current polling interval for this token
  lastSignificantChange?: number; // Timestamp of last major change
}

export class LiquidityVelocityTracker extends EventEmitter {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map(); // Per-token polling
  private snapshotCache: SimpleCache<LiquiditySnapshot[]>;
  private velocityCache: SimpleCache<VelocityData>;
  private trackedTokens: Map<string, { interval: number; lastUpdate: number }> = new Map();
  private readonly DEFAULT_POLLING_INTERVAL = config.velocityPollInterval || 10000; // 10 seconds default for memecoins
  private readonly MAX_SNAPSHOTS = 360; // 3 hours of data at 30s intervals, or 30 min at 5s intervals
  private alertingService: ReturnType<typeof createAlertingService>;
  private connection: Connection;
  
  // Adaptive polling intervals based on risk
  private readonly INTERVALS = {
    CRITICAL: 5000,   // 5 seconds for ultra-high risk
    HIGH: 10000,      // 10 seconds for high risk  
    MEDIUM: 15000,    // 15 seconds for medium risk
    LOW: 30000,       // 30 seconds for low risk
    DEFAULT: 30000    // 30 seconds default
  };

  constructor() {
    super();
    this.snapshotCache = new SimpleCache(3600000); // 1 hour TTL
    this.velocityCache = new SimpleCache(60000); // 1 minute TTL
    // Create connection for alerting service
    this.connection = new Connection(config.heliusRpcUrl);
    this.alertingService = createAlertingService(this.connection);
    console.log('[LiquidityVelocityTracker] Initialized with AlertingService');
  }

  /**
   * Start tracking a token with adaptive polling
   */
  public async trackToken(tokenMint: string, initialRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<void> {
    // Determine initial polling interval
    const interval = initialRiskLevel ? this.INTERVALS[initialRiskLevel] : this.DEFAULT_POLLING_INTERVAL;
    
    // Stop any existing polling for this token
    this.stopTrackingToken(tokenMint);
    
    // Add to tracked tokens
    this.trackedTokens.set(tokenMint, {
      interval,
      lastUpdate: Date.now()
    });
    
    console.log(`[LiquidityVelocityTracker] Now tracking ${tokenMint} with ${interval}ms interval`);
    
    // Take initial snapshot
    await this.takeSnapshot(tokenMint);
    
    // Start polling for this specific token
    this.startTokenPolling(tokenMint, interval);
  }

  /**
   * Stop tracking a token
   */
  public stopTrackingToken(tokenMint: string): void {
    // Clear the specific polling interval for this token
    const interval = this.pollingIntervals.get(tokenMint);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(tokenMint);
    }
    
    this.trackedTokens.delete(tokenMint);
    this.snapshotCache.delete(tokenMint);
    this.velocityCache.delete(tokenMint);
    console.log(`[LiquidityVelocityTracker] Stopped tracking ${tokenMint}`);
  }
  
  /**
   * Start polling for a specific token
   */
  private startTokenPolling(tokenMint: string, interval: number): void {
    // Clear any existing interval
    const existingInterval = this.pollingIntervals.get(tokenMint);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Create new interval for this token
    const pollInterval = setInterval(async () => {
      try {
        await this.updateTokenVelocity(tokenMint);
      } catch (error) {
        console.error(`[LiquidityVelocityTracker] Error updating ${tokenMint}:`, error);
      }
    }, interval);
    
    this.pollingIntervals.set(tokenMint, pollInterval);
  }

  /**
   * Start the velocity tracking service
   */
  public start(): void {
    if (this.pollingIntervals.size > 0) {
      console.warn('[LiquidityVelocityTracker] Already running with per-token intervals');
      return;
    }

    console.log('[LiquidityVelocityTracker] Starting velocity tracking with adaptive per-token intervals');
    
    // Load existing tracked tokens from database
    this.loadTrackedTokens();
  }

  /**
   * Stop the velocity tracking service
   */
  public stop(): void {
    // Clear all per-token intervals
    this.pollingIntervals.forEach((interval, tokenMint) => {
      clearInterval(interval);
      console.log(`[LiquidityVelocityTracker] Stopped tracking ${tokenMint}`);
    });
    this.pollingIntervals.clear();
    this.trackedTokens.clear();
    
    console.log('[LiquidityVelocityTracker] Stopped all velocity tracking');
  }

  /**
   * Load tracked tokens from database and start polling
   */
  private async loadTrackedTokens(): Promise<void> {
    try {
      // Get all protected tokens with monitoring enabled
      const { data: protectedTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint, risk_threshold')
        .eq('monitoring_active', true);
        
      if (!protectedTokens || protectedTokens.length === 0) {
        console.log('[LiquidityVelocityTracker] No protected tokens to track');
        return;
      }
      
      console.log(`[LiquidityVelocityTracker] Loading ${protectedTokens.length} protected tokens`);
      
      // Start tracking each token with appropriate risk level
      for (const token of protectedTokens) {
        const riskLevel = this.mapThresholdToRiskLevel(token.risk_threshold);
        await this.trackToken(token.token_mint, riskLevel);
      }
    } catch (error) {
      console.error('[LiquidityVelocityTracker] Error loading tracked tokens:', error);
    }
  }
  
  /**
   * Map risk threshold to polling risk level
   */
  private mapThresholdToRiskLevel(threshold: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch(threshold?.toUpperCase()) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }

  /**
   * Take a snapshot of current token metrics
   */
  private async takeSnapshot(tokenMint: string): Promise<LiquiditySnapshot | null> {
    try {
      // Get liquidity data - try pool_liquidity first, then token_prices as fallback
      const { data: liquidityData, error: liquidityError } = await supabase
        .from('pool_liquidity')
        .select('liquidity_usd')
        .eq('token_mint', tokenMint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      let liquidityUSD = liquidityData?.liquidity_usd || 0;
      
      // If no pool liquidity data, check token_prices table (used by UI)
      if ((!liquidityData || liquidityUSD === 0) && (liquidityError?.code === 'PGRST116' || liquidityUSD === 0)) {
        console.log(`[LiquidityVelocityTracker] No pool_liquidity data for ${tokenMint}, checking token_prices...`);
        const { data: priceData, error: priceError } = await supabase
          .from('token_prices')
          .select('liquidity')
          .eq('token_mint', tokenMint)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
          
        if (priceData?.liquidity) {
          liquidityUSD = priceData.liquidity;
          console.log(`[LiquidityVelocityTracker] Found liquidity in token_prices: $${liquidityUSD}`);
        } else if (priceError && priceError.code !== 'PGRST116') {
          console.log(`[LiquidityVelocityTracker] Error fetching token_prices liquidity for ${tokenMint}:`, priceError.message);
        }
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
            liquidity: liquidityUSD || null,
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

      // Get creator balance percentage
      const creatorBalancePercent = await this.getCreatorBalancePercent(tokenMint);

      // If we don't have liquidity data but have price data, we can still track price velocity
      const hasValidData = (priceData?.price_usd || priceData?.price) > 0 || liquidityData?.liquidity_usd > 0;
      
      if (!hasValidData) {
        console.log(`[LiquidityVelocityTracker] No valid data for ${tokenMint} snapshot yet`);
        // Still create a minimal snapshot to start tracking
      }

      const snapshot: LiquiditySnapshot = {
        tokenMint,
        timestamp: Date.now(),
        liquidityUSD,
        price: priceData?.price_usd || priceData?.price || 0, // Use price_usd if available, fallback to price
        volume24h: volumeData?.volume_24h_usd || 0,
        holderCount: holderData?.holders || 0,
        creatorBalancePercent,
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
      
      // Calculate ultra-short and standard velocities
      const velocities = {
        // Ultra-short windows (absolute % change, not per minute)
        liquidity10s: this.calculateVelocity(snapshots, currentSnapshot, 10000, 'liquidityUSD', false),
        liquidity20s: this.calculateVelocity(snapshots, currentSnapshot, 20000, 'liquidityUSD', false),
        liquidity30s: this.calculateVelocity(snapshots, currentSnapshot, 30000, 'liquidityUSD', false),
        price10s: this.calculateVelocity(snapshots, currentSnapshot, 10000, 'price', false),
        price20s: this.calculateVelocity(snapshots, currentSnapshot, 20000, 'price', false),
        price30s: this.calculateVelocity(snapshots, currentSnapshot, 30000, 'price', false),
        
        // Standard windows (per minute rates)
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
        creator1m: this.calculateVelocity(snapshots, currentSnapshot, 60000, 'creatorBalancePercent'),
        creator5m: this.calculateVelocity(snapshots, currentSnapshot, 300000, 'creatorBalancePercent'),
        creator30m: this.calculateVelocity(snapshots, currentSnapshot, 1800000, 'creatorBalancePercent'),
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

      // Enhanced alerts using ultra-short windows for memecoin traders
      const alerts = {
        // Flash rug detection with ultra-short windows
        flashRug: velocities.liquidity10s < -50 || // >50% gone in 10 seconds
                  velocities.liquidity20s < -70 || // >70% gone in 20 seconds
                  velocities.liquidity5m < -20,    // >90% in 5 min = DEFINITE RUG
        
        rapidDrain: velocities.liquidity30s < -30 || // >30% in 30 seconds
                    velocities.liquidity1m < -10,    // >10% per minute drain
        
        slowBleed: false, // Disabled for MVP - normal for memecoins
        volumeSpike: false, // Disabled for MVP
        
        creatorSelling: velocities.creator5m < -10 && currentSnapshot.creatorBalancePercent < 10, // Creator dumping
        
        // New ultra-high risk alert
        panicSell: velocities.liquidity10s < -30 && velocities.price10s < -20 // Rapid collapse
      };
      
      // Determine risk level based on velocities for adaptive polling
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      
      if (alerts.flashRug || alerts.panicSell) {
        riskLevel = 'CRITICAL';
      } else if (alerts.rapidDrain || Math.abs(velocities.liquidity30s) > 20) {
        riskLevel = 'HIGH';
      } else if (Math.abs(velocities.liquidity1m) > 5 || Math.abs(velocities.price1m) > 10) {
        riskLevel = 'MEDIUM';
      }

      // Create velocity data
      const velocityData: VelocityData = {
        tokenMint,
        current: currentSnapshot,
        velocities,
        alerts,
        riskLevel,
        pollingInterval: this.INTERVALS[riskLevel],
        lastSignificantChange: alerts.flashRug || alerts.rapidDrain || alerts.panicSell ? now : undefined
      };

      // Store in local cache only (Redis removed)
      this.velocityCache.set(tokenMint, velocityData);
      
      // Adaptive polling: Update interval if risk level changed
      const trackedInfo = this.trackedTokens.get(tokenMint);
      if (trackedInfo) {
        const newInterval = this.INTERVALS[riskLevel];
        if (trackedInfo.interval !== newInterval) {
          console.log(`[LiquidityVelocityTracker] Risk level changed for ${tokenMint}: ${riskLevel} (${newInterval}ms interval)`);
          
          // Update tracking info
          this.trackedTokens.set(tokenMint, {
            interval: newInterval,
            lastUpdate: now
          });
          
          // Restart polling with new interval
          this.startTokenPolling(tokenMint, newInterval);
        }
      }

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

      // Send sell signal alerts when conditions are met
      await this.checkAndSendSellSignals(tokenMint, velocityData);

      // Emit events for critical alerts
      if (alerts.flashRug) {
        console.error(`🚨 [LiquidityVelocityTracker] FLASH RUG DETECTED: ${tokenMint}`);
        this.emit('flash-rug', { tokenMint, velocityData });
        
        // Store critical alert in database instead of Redis
        await supabase
          .from('pattern_alerts')
          .insert({
            token_mint: tokenMint,
            alert_type: 'CRITICAL',
            patterns: ['FLASH_RUG'],
            risk_score: 100,
            severity: 'CRITICAL',
            recommendation: 'SELL IMMEDIATELY',
            metadata: velocityData,
            created_at: new Date().toISOString()
          });
      } else if (alerts.rapidDrain) {
        console.warn(`⚠️ [LiquidityVelocityTracker] Rapid drain detected: ${tokenMint}`);
        this.emit('rapid-drain', { tokenMint, velocityData });
      } else if (alerts.slowBleed) {
        console.warn(`⚠️ [LiquidityVelocityTracker] Slow bleed detected: ${tokenMint}`);
        this.emit('slow-bleed', { tokenMint, velocityData });
      }
      
      // Check for creator selling alert
      if (alerts.creatorSelling) {
        console.warn(`💰 [LiquidityVelocityTracker] Creator selling detected: ${tokenMint} (${Math.abs(velocities.creator5m).toFixed(2)}% in 5 min)`);
        this.emit('creator-selling', { tokenMint, velocityData });
        
        // Update rugcheck_reports with new creator balance
        await supabase
          .from('rugcheck_reports')
          .update({
            creator_balance_percent: currentSnapshot.creatorBalancePercent,
            updated_at: new Date().toISOString()
          })
          .eq('token_mint', tokenMint);
      }

      // Store velocity data in database for historical analysis
      await this.storeVelocityData(velocityData);

    } catch (error) {
      console.error(`[LiquidityVelocityTracker] Error updating velocity for ${tokenMint}:`, error);
    }
  }

  /**
   * Calculate velocity (% change per minute or absolute) for a metric
   */
  private calculateVelocity(
    snapshots: LiquiditySnapshot[],
    current: LiquiditySnapshot,
    windowMs: number,
    metric: keyof LiquiditySnapshot,
    perMinute: boolean = true
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
    
    // Return either per-minute rate or absolute percentage change
    const velocity = perMinute ? (percentChange / timeElapsedMinutes) : percentChange;
    
    // Debug logging for liquidity calculations
    if (metric === 'liquidityUSD' && Math.abs(velocity) > 0.01) {
      console.log(`[calculateVelocity] ${current.tokenMint} ${metric} ${windowMs/1000}s:`);
      console.log(`  Start: $${startValue} at ${new Date(startSnapshot.timestamp).toISOString()}`);
      console.log(`  Current: $${currentValue} at ${new Date(current.timestamp).toISOString()}`);
      console.log(`  Change: ${percentChange.toFixed(2)}% over ${timeElapsedMinutes.toFixed(1)} min`);
      console.log(`  Velocity: ${velocity.toFixed(4)}%${perMinute ? ' per minute' : ' total'}`);
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
    return Array.from(this.trackedTokens.keys());
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
    // Check local in-memory cache only
    const localCached = this.velocityCache.get(tokenMint);
    if (localCached) return localCached;
    
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
        creatorBalancePercent: 0,
        source: 'default'
      },
      velocities: {
        // Ultra-short windows
        liquidity10s: 0,
        liquidity20s: 0,
        liquidity30s: 0,
        price10s: 0,
        price20s: 0,
        price30s: 0,
        // Standard windows
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
        holders30m: 0,
        creator1m: 0,
        creator5m: 0,
        creator30m: 0
      },
      alerts: {
        flashRug: false,
        rapidDrain: false,
        slowBleed: false,
        volumeSpike: false,
        creatorSelling: false,
        panicSell: false
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
            creatorBalancePercent: 0, // Not stored in this table
            source: 'database'
          },
          velocities: {
            // Ultra-short windows (not in DB, default to 0)
            liquidity10s: 0,
            liquidity20s: 0,
            liquidity30s: 0,
            price10s: 0,
            price20s: 0,
            price30s: 0,
            // Standard windows
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
            holders30m: 0,
            creator1m: 0,
            creator5m: 0,
            creator30m: 0
          },
          alerts: {
            flashRug: data.flash_rug_alert || false,
            rapidDrain: data.rapid_drain_alert || false,
            slowBleed: data.slow_bleed_alert || false,
            volumeSpike: false,
            creatorSelling: false,
            panicSell: false
          }
        };
        return velocityData;
      }
    } catch (error) {
      console.error('[LiquidityVelocityTracker] Error fetching latest velocity:', error);
    }

    return null;
  }

  /**
   * Check and send sell signal alerts to Telegram
   */
  private async checkAndSendSellSignals(tokenMint: string, velocityData: VelocityData): Promise<void> {
    const { velocities, current, alerts } = velocityData;
    
    // Get all wallets holding this token for alerts
    const { data: holders } = await supabase
      .from('wallet_tokens')
      .select('wallet_address')
      .eq('token_mint', tokenMint)
      .eq('is_active', true);
      
    if (!holders || holders.length === 0) return;
    
    // Get token metadata for alerts
    const { data: tokenData } = await supabase
      .from('token_metadata')
      .select('symbol, name')
      .eq('mint', tokenMint)
      .single();
      
    const tokenSymbol = tokenData?.symbol || 'Unknown';
    const tokenName = tokenData?.name || 'Unknown Token';
    
    // Enhanced sell signal detection with ultra-short windows
    let sellSignal = null;
    
    // PANIC SELL conditions - Ultra-fast detection
    if (velocities.liquidity10s < -50) { // >50% liquidity gone in 10 seconds!
      sellSignal = {
        action: 'PANIC_SELL',
        confidence: 100,
        reason: 'FLASH RUG: 50% liquidity vanished in 10 seconds!',
        urgency: 'critical',
        timeWindow: '10s'
      };
    } else if (velocities.liquidity20s < -70) { // >70% liquidity gone in 20 seconds
      sellSignal = {
        action: 'PANIC_SELL',
        confidence: 100,
        reason: 'FLASH RUG: 70% liquidity drained in 20 seconds!',
        urgency: 'critical',
        timeWindow: '20s'
      };
    } else if (velocities.liquidity30s < -30 && velocities.price30s < -20) { // Rapid collapse
      sellSignal = {
        action: 'PANIC_SELL',
        confidence: 98,
        reason: 'Market collapse: 30% liquidity + 20% price drop in 30 seconds',
        urgency: 'critical',
        timeWindow: '30s'
      };
    } else if (velocities.liquidity5m < -20) { // >90% liquidity gone in 5 min
      sellSignal = {
        action: 'PANIC_SELL',
        confidence: 95,
        reason: 'Liquidity collapsed - definite rug',
        urgency: 'critical',
        timeWindow: '5m'
      };
    } else if (velocities.creator5m < -15 && current.creatorBalancePercent < 5) {
      sellSignal = {
        action: 'PANIC_SELL',
        confidence: 95,
        reason: 'Creator dumped their entire stack',
        urgency: 'critical',
        timeWindow: '5m'
      };
    }
    // SELL conditions - Fast detection
    else if (velocities.liquidity1m < -10) { // >10% liquidity per minute
      sellSignal = {
        action: 'SELL',
        confidence: 90,
        reason: `Rapid drain: ${Math.abs(velocities.liquidity1m).toFixed(1)}% liquidity/min`,
        urgency: 'high',
        timeWindow: '1m'
      };
    } else if (velocities.liquidity5m < -10) { // >50% liquidity in 5 min
      sellSignal = {
        action: 'SELL',
        confidence: 85,
        reason: 'Rapid liquidity drain detected',
        urgency: 'high',
        timeWindow: '5m'
      };
    } else if (alerts.creatorSelling) {
      sellSignal = {
        action: 'SELL',
        confidence: 80,
        reason: 'Creator is selling significant amounts',
        urgency: 'high',
        timeWindow: '5m'
      };
    } else if (velocities.liquidity30m < -5 && velocities.price30m < -10) {
      sellSignal = {
        action: 'SELL',
        confidence: 75,
        reason: 'Sustained price and liquidity decline',
        urgency: 'medium',
        timeWindow: '30m'
      };
    }
    
    // Send alerts if sell signal detected
    if (sellSignal && (sellSignal.action === 'PANIC_SELL' || sellSignal.action === 'SELL')) {
      console.log(`[LiquidityVelocityTracker] Sending ${sellSignal.action} alerts for ${tokenMint}`);
      
      // Send alert to each holder
      for (const holder of holders) {
        await this.alertingService.sendAlert({
          type: sellSignal.action === 'PANIC_SELL' ? 'panic_sell_signal' : 'sell_signal',
          severity: sellSignal.urgency === 'critical' ? 'critical' : 'high',
          priority: sellSignal.action === 'PANIC_SELL' ? 10 : 8,
          wallet_address: holder.wallet_address,
          token_mint: tokenMint,
          message: `${sellSignal.action} - ${sellSignal.reason}`,
          metadata: {
            sellSignal,
            token_symbol: tokenSymbol,
            token_name: tokenName,
            velocities: {
              liquidity10s: velocities.liquidity10s,
              liquidity20s: velocities.liquidity20s,
              liquidity30s: velocities.liquidity30s,
              liquidity1m: velocities.liquidity1m,
              liquidity5m: velocities.liquidity5m,
              price10s: velocities.price10s,
              price1m: velocities.price1m,
              price5m: velocities.price5m,
              creator5m: velocities.creator5m,
              creatorBalance: current.creatorBalancePercent
            },
            currentData: {
              price: current.price,
              liquidity: current.liquidityUSD
            }
          }
        });
      }
    }
  }

  /**
   * Get creator balance percentage
   */
  private async getCreatorBalancePercent(mint: string): Promise<number> {
    try {
      // Get token metadata to find creator
      const asset = await helius.rpc.getAsset({ id: mint });
      if (!asset || !asset.creators || asset.creators.length === 0) {
        return 0;
      }
      
      const creator = asset.creators[0].address; // First creator is usually the deployer
      
      // Get creator's token balance
      const response = await rpcCall<any>(
        "getTokenAccountsByOwner",
        [
          creator,
          { mint: mint },
          { encoding: "jsonParsed" }
        ]
      );
      
      if (response?.value && response.value.length > 0) {
        const tokenAccount = response.value[0];
        const balance = tokenAccount.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
        
        // Get total supply
        const supplyResponse = await rpcCall<any>(
          "getTokenSupply",
          [mint]
        );
        
        const totalSupply = supplyResponse?.value?.uiAmount || 1;
        const creatorPercent = (balance / totalSupply) * 100;
        
        return creatorPercent;
      }
      
      return 0;
    } catch (error) {
      console.error(`[LiquidityVelocityTracker] Error getting creator balance for ${mint}:`, error);
      return 0;
    }
  }
}

// Export singleton instance
export const liquidityVelocityTracker = new LiquidityVelocityTracker();