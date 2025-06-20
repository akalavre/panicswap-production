import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import config from '../config';
import { RaydiumPoolDecoder } from './pool-decoders/RaydiumPoolDecoder';
import { PumpFunPoolDecoder } from './pool-decoders/PumpFunPoolDecoder';
import supabase from '../utils/supabaseClient';
import { EnhancedPoolDiscoveryService } from './EnhancedPoolDiscoveryService';
import { broadcastService } from './SupabaseBroadcastService';

interface PoolData {
  poolAddress: string;
  tokenMint: string;
  baselineLiquidity: number;
  currentLiquidity: number;
  lastUpdate: Date;
  lastChecked?: Date;
  liquidityThreshold?: number;
}

interface RugpullAlert {
  tokenMint: string;
  poolAddress: string;
  type: 'LIQUIDITY_REMOVAL' | 'LARGE_DUMP' | 'DEV_MOVEMENT' | string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  liquidityChange: number;
  timestamp: Date;
}

export class PoolMonitoringService {
  private connection: Connection;
  private monitoredPools: Map<string, PoolData> = new Map();
  private subscriptions: Map<string, number> = new Map();
  private raydiumDecoder: RaydiumPoolDecoder;
  private pumpFunDecoder: PumpFunPoolDecoder;
  // private webSocketService: any; // REMOVED: Using Supabase Realtime
  private enhancedPoolDiscovery: EnhancedPoolDiscoveryService;

  constructor() {
    const rpcUrl = config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, {
      wsEndpoint: rpcUrl.replace('https', 'wss'),
      commitment: 'confirmed'
    });
    
    this.raydiumDecoder = new RaydiumPoolDecoder();
    this.pumpFunDecoder = new PumpFunPoolDecoder();
    this.enhancedPoolDiscovery = new EnhancedPoolDiscoveryService(this.connection);
    
    console.log('PoolMonitoringService initialized - writing to Supabase for realtime');
  }

  // REMOVED: setWebSocketService - no longer needed with Supabase Realtime

  /**
   * Find the main liquidity pool for a token
   */
  async findMainPool(tokenMint: string): Promise<string | null> {
    try {
      // Check database first for cached pool address
      const { data: existing } = await supabase
        .from('protected_tokens')
        .select('pool_address')
        .eq('token_mint', tokenMint)
        .single();

      if (existing?.pool_address) {
        console.log(`Found cached pool for ${tokenMint}: ${existing.pool_address}`);
        return existing.pool_address;
      }

      // Use enhanced pool discovery first
      try {
        const poolInfo = await this.enhancedPoolDiscovery.discoverPool(tokenMint);
        if (poolInfo) {
          console.log(`✅ Found pool via enhanced discovery for ${tokenMint}: ${poolInfo.address} (${poolInfo.type} via ${poolInfo.source})`);
          return poolInfo.address;
        }
      } catch (error) {
        console.error(`Error in enhanced pool discovery for ${tokenMint}:`, error);
      }

      // Fallback to token metadata check
      const { data: tokenData } = await supabase
        .from('token_metadata')
        .select('platform, pool_address')
        .eq('mint', tokenMint)
        .single();

      if (tokenData?.pool_address) {
        console.log(`Found pool in metadata for ${tokenMint}: ${tokenData.pool_address}`);
        return tokenData.pool_address;
      }

      // Platform-specific pool discovery
      if (tokenData?.platform === 'pump.fun') {
        const pumpPool = await this.findPumpFunPool(tokenMint);
        if (pumpPool) {
          return pumpPool;
        }
      } else if (tokenData?.platform === 'raydium') {
        const raydiumPools = await this.findRaydiumPools(tokenMint);
        if (raydiumPools.length > 0) {
          return raydiumPools[0].address;
        }
      }

      // Fallback: Try Jupiter API to find pools
      const jupiterPool = await this.findPoolViaJupiter(tokenMint);
      if (jupiterPool) {
        console.log(`Found pool via Jupiter for ${tokenMint}: ${jupiterPool}`);
        return jupiterPool;
      }

      console.log(`No pool found for token ${tokenMint}`);
      return null;
    } catch (error) {
      console.error(`Error finding pool for ${tokenMint}:`, error);
      return null;
    }
  }

  /**
   * Start monitoring a token with a specific pool address
   */
  async protectTokenWithPool(tokenMint: string, userWallet: string, poolAddress: string): Promise<boolean> {
    try {
      console.log(`Protecting token ${tokenMint} with pool ${poolAddress}`);
      
      // Get current pool state
      const poolAccount = await this.connection.getAccountInfo(new PublicKey(poolAddress));
      if (!poolAccount) {
        console.error(`Pool account ${poolAddress} not found`);
        return false;
      }

      // Decode actual pool liquidity
      let initialLiquidity = 0;
      try {
        const poolData = await this.decodePoolData(poolAddress, poolAccount);
        if (poolData && poolData.liquidity) {
          initialLiquidity = poolData.liquidity;
          console.log(`[PoolMonitoring] Decoded initial liquidity for ${poolAddress}: $${initialLiquidity.toFixed(2)}`);
        } else {
          // Fallback: estimate liquidity from account lamports
          initialLiquidity = poolAccount.lamports / 1e9 * 50; // Rough estimate assuming $50 SOL
          console.warn(`[PoolMonitoring] Using fallback liquidity estimation for ${poolAddress}: $${initialLiquidity.toFixed(2)}`);
        }
      } catch (decodeError) {
        console.error('Error decoding initial pool data:', decodeError);
        initialLiquidity = 1000; // Fallback value
      }
      
      // Store baseline data
      const baseline: PoolData = {
        poolAddress,
        tokenMint,
        baselineLiquidity: initialLiquidity,
        currentLiquidity: initialLiquidity,
        lastUpdate: new Date(),
        lastChecked: new Date()
      };

      this.monitoredPools.set(poolAddress, baseline);

      // Subscribe to pool changes
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(poolAddress),
        (accountInfo) => this.handlePoolChange(poolAddress, accountInfo),
        'confirmed'
      );

      this.subscriptions.set(poolAddress, subscriptionId);

      // Update database
      await supabase
        .from('protected_tokens')
        .upsert({
          token_mint: tokenMint,
          wallet_address: userWallet,
          pool_address: poolAddress,
          baseline_liquidity: initialLiquidity,
          monitoring_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token_mint,wallet_address' });

      console.log(`Started monitoring pool ${poolAddress} for token ${tokenMint}`);
      
      // Track monitoring presence
      await broadcastService.trackMonitoring(tokenMint, poolAddress);
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection status updates are automatically broadcast when we write to protected_tokens table

      return true;
    } catch (error) {
      console.error(`Error protecting token ${tokenMint} with pool ${poolAddress}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring a token's pool
   */
  async protectToken(tokenMint: string, userWallet: string): Promise<boolean> {
    try {
      // Find the main pool
      const poolAddress = await this.findMainPool(tokenMint);
      if (!poolAddress) {
        console.error(`No pool found for token ${tokenMint}`);
        return false;
      }

      // Get current pool state
      const poolAccount = await this.connection.getAccountInfo(new PublicKey(poolAddress));
      if (!poolAccount) {
        console.error(`Pool account ${poolAddress} not found`);
        return false;
      }

      // Decode pool data
      const poolData = await this.decodePoolData(poolAddress, poolAccount);
      if (!poolData) {
        return false;
      }

      // Store baseline data
      const baseline: PoolData = {
        poolAddress,
        tokenMint,
        baselineLiquidity: poolData.liquidity,
        currentLiquidity: poolData.liquidity,
        lastUpdate: new Date()
      };

      this.monitoredPools.set(poolAddress, baseline);

      // Subscribe to pool changes
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(poolAddress),
        (accountInfo) => this.handlePoolChange(poolAddress, accountInfo),
        'confirmed'
      );

      this.subscriptions.set(poolAddress, subscriptionId);

      // Update database
      await supabase
        .from('protected_tokens')
        .upsert({
          token_mint: tokenMint,
          wallet_address: userWallet,
          pool_address: poolAddress,
          baseline_liquidity: poolData.liquidity,
          monitoring_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token_mint,wallet_address' });

      console.log(`Started monitoring pool ${poolAddress} for token ${tokenMint}`);
      
      // Track monitoring presence
      await broadcastService.trackMonitoring(tokenMint, poolAddress);
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection status updates are automatically broadcast when we write to protected_tokens table

      return true;
    } catch (error) {
      console.error(`Error protecting token ${tokenMint}:`, error);
      return false;
    }
  }

  /**
   * Stop monitoring a token
   */
  async unprotectToken(tokenMint: string, userWallet: string): Promise<boolean> {
    try {
      // Find pool address
      const poolData = Array.from(this.monitoredPools.values())
        .find(p => p.tokenMint === tokenMint);

      if (!poolData) {
        return false;
      }

      const { poolAddress } = poolData;

      // Unsubscribe
      const subscriptionId = this.subscriptions.get(poolAddress);
      if (subscriptionId !== undefined) {
        await this.connection.removeAccountChangeListener(subscriptionId);
        this.subscriptions.delete(poolAddress);
      }

      // Remove from monitored pools
      this.monitoredPools.delete(poolAddress);

      // Update database
      await supabase
        .from('protected_tokens')
        .update({ monitoring_active: false })
        .match({ token_mint: tokenMint, wallet_address: userWallet });

      console.log(`Stopped monitoring pool ${poolAddress} for token ${tokenMint}`);
      
      // Stop tracking monitoring presence
      await broadcastService.untrackMonitoring(tokenMint);
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection status updates are automatically broadcast when we write to protected_tokens table

      return true;
    } catch (error) {
      console.error(`Error unprotecting token ${tokenMint}:`, error);
      return false;
    }
  }

  /**
   * Handle pool account changes
   */
  private async handlePoolChange(poolAddress: string, accountInfo: AccountInfo<Buffer>) {
    try {
      const poolData = this.monitoredPools.get(poolAddress);
      if (!poolData) return;

      // Decode new pool state
      const newPoolData = await this.decodePoolData(poolAddress, accountInfo);
      if (!newPoolData) return;

      const oldLiquidity = poolData.currentLiquidity;
      const newLiquidity = newPoolData.liquidity;
      const liquidityChange = ((oldLiquidity - newLiquidity) / oldLiquidity) * 100;

      // Update current liquidity
      poolData.currentLiquidity = newLiquidity;
      poolData.lastUpdate = new Date();

      // Broadcast liquidity update
      await broadcastService.broadcastPriceAlert({
        tokenMint: poolData.tokenMint,
        priceChange: liquidityChange,
        currentPrice: newLiquidity,
        severity: liquidityChange > 50 ? 'HIGH' : liquidityChange > 20 ? 'MEDIUM' : 'LOW'
      });
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Liquidity updates are automatically broadcast via pool_updates table

      // DUAL-WRITE: Write liquidity update to Supabase for realtime
      try {
        await supabase
          .from('pool_updates')
          .insert({
            pool_address: poolAddress,
            token_mint: poolData.tokenMint,
            update_type: 'liquidity',
            old_value: oldLiquidity,
            new_value: newLiquidity,
            change_percentage: liquidityChange,
            metadata: {
              baselineLiquidity: poolData.baselineLiquidity,
              source: 'pool_monitoring',
              timestamp: Date.now()
            }
          });
      } catch (error) {
        console.error('Error writing liquidity update to Supabase:', error);
      }

      // Enhanced multi-level liquidity detection
      const timeWindow = Date.now() - (poolData.lastChecked?.getTime() || Date.now());
      const timeWindowSeconds = timeWindow / 1000;
      
      // Determine severity based on speed and amount of liquidity removal
      let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
      let alertType: string = 'LIQUIDITY_REMOVAL';
      
      // CRITICAL: Instant rug pull detection
      if (liquidityChange > 80 && timeWindowSeconds < 30) {
        severity = 'CRITICAL';
        alertType = 'INSTANT_RUG_PULL';
        console.error(`🚨 CRITICAL RUG PULL: ${liquidityChange.toFixed(2)}% liquidity removed in ${timeWindowSeconds}s`);
      }
      // HIGH: Rapid liquidity removal
      else if (liquidityChange > 50 && timeWindowSeconds < 60) {
        severity = 'HIGH';
        alertType = 'RAPID_LIQUIDITY_REMOVAL';
      }
      // MEDIUM: Significant liquidity removal
      else if (liquidityChange > 30 && timeWindowSeconds < 300) {
        severity = 'MEDIUM';
        alertType = 'LIQUIDITY_REMOVAL';
      }
      // LOW: Gradual liquidity decrease
      else if (liquidityChange > 15) {
        severity = 'LOW';
        alertType = 'LIQUIDITY_DECREASE';
      }
      
      // Check for rugpull conditions
      if (severity && (severity === 'CRITICAL' || severity === 'HIGH' || 
          (severity === 'MEDIUM' && liquidityChange > 30) || 
          (severity === 'LOW' && liquidityChange > 20))) {
        
        const alert: RugpullAlert = {
          tokenMint: poolData.tokenMint,
          poolAddress,
          type: alertType,
          severity,
          liquidityChange,
          timestamp: new Date()
        };

        console.error(`RUGPULL DETECTED for ${poolData.tokenMint}: ${liquidityChange.toFixed(2)}% liquidity removed!`);
        
        // Also check against user's configured threshold
        const userThreshold = poolData.liquidityThreshold || 30; // Default 30% if not set
        const shouldTriggerProtection = liquidityChange >= userThreshold || severity === 'CRITICAL' || severity === 'HIGH';
        
        console.log(`[PoolMonitoring] Token ${poolData.tokenMint}:
          - Liquidity drop: ${liquidityChange.toFixed(2)}%
          - Time window: ${timeWindowSeconds}s
          - Severity: ${severity}
          - User threshold: ${userThreshold}%
          - Should trigger: ${shouldTriggerProtection}`);
        
        // Broadcast rugpull alert if it meets criteria
        if (shouldTriggerProtection) {
          await broadcastService.broadcastRugpullAlert({
            tokenMint: alert.tokenMint,
            poolAddress: alert.poolAddress,
            severity: alert.severity,
            liquidityChange: alert.liquidityChange,
            type: alert.type
          });
        }
        
        // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
        // Rugpull alerts are automatically broadcast via rugpull_alerts and system_alerts tables

        // DUAL-WRITE: Write rugpull alert to Supabase
        try {
          await supabase
            .from('rugpull_alerts')
            .insert({
              token_mint: alert.tokenMint,
              wallet_address: '*', // Will be filtered by frontend
              severity: alert.severity,
              liquidity_drop: alert.liquidityChange,
              message: `Liquidity dropped ${liquidityChange.toFixed(2)}% - ${alert.type}`
            });

          // Also write to system alerts for broader visibility
          await supabase
            .from('system_alerts')
            .insert({
              alert_type: 'critical',
              category: 'liquidity',
              title: `Rugpull Alert: ${poolData.tokenMint}`,
              message: `Liquidity dropped ${liquidityChange.toFixed(2)}% on ${alert.poolAddress}`,
              metadata: {
                tokenMint: alert.tokenMint,
                poolAddress: alert.poolAddress,
                liquidityChange: alert.liquidityChange,
                oldLiquidity,
                newLiquidity,
                source: 'pool_monitoring'
              }
            });
        } catch (error) {
          console.error('Error writing rugpull alert to Supabase:', error);
        }
        
        // Trigger emergency sell through broadcast
        await broadcastService.broadcastProtectionExecution({
          tokenMint: poolData.tokenMint,
          walletAddress: '*', // Will be handled by subscribers
          action: 'emergency_sell',
          reason: `Liquidity dropped ${liquidityChange.toFixed(2)}%`
        });
      } else if (liquidityChange > 10) {
        // Warning level - use price alert for low severity
        await broadcastService.broadcastPriceAlert({
          tokenMint: poolData.tokenMint,
          priceChange: -liquidityChange, // Negative for drop
          currentPrice: newLiquidity,
          severity: 'LOW'
        });
      }

      // Check for large dumps (simplified - would need transaction parsing)
      if (newPoolData.recentSwapSize && newPoolData.recentSwapSize > oldLiquidity * 0.1) {
        // Someone sold >10% of the pool
        await broadcastService.broadcastPriceAlert({
          tokenMint: poolData.tokenMint,
          priceChange: -(newPoolData.recentSwapSize / oldLiquidity * 100),
          currentPrice: newLiquidity,
          severity: 'MEDIUM'
        });
      }

    } catch (error) {
      console.error(`Error handling pool change for ${poolAddress}:`, error);
    }
  }

  /**
   * Decode pool data based on program
   */
  private async decodePoolData(poolAddress: string, accountInfo: AccountInfo<Buffer>): Promise<any> {
    try {
      // Try Raydium decoder first
      const raydiumData = this.raydiumDecoder.decode(accountInfo.data);
      if (raydiumData) {
        return raydiumData;
      }

      // Try Pump.fun decoder
      const pumpData = this.pumpFunDecoder.decode(accountInfo.data);
      if (pumpData) {
        return pumpData;
      }

      console.error(`Unable to decode pool data for ${poolAddress}`);
      return null;
    } catch (error) {
      console.error(`Error decoding pool data:`, error);
      return null;
    }
  }

  /**
   * Find Raydium pools for a token
   */
  private async findRaydiumPools(tokenMint: string): Promise<any[]> {
    try {
      // First check our database for known pools
      const { data: tokenData } = await supabase
        .from('token_metadata')
        .select('platform, pool_address')
        .eq('mint', tokenMint)
        .single();

      if (tokenData?.pool_address && tokenData?.platform === 'raydium') {
        return [{ address: tokenData.pool_address }];
      }

      // For Raydium tokens without a pool address, we need to query the chain
      // Raydium AMM V4 uses a deterministic PDA for pools
      if (tokenData?.platform === 'raydium') {
        try {
          // Common quote tokens for Raydium pools
          const quoteTokens = [
            'So11111111111111111111111111111111111111112', // SOL
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
          ];

          const RAYDIUM_AMM_V4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
          
          // Try finding pools with common quote tokens
          for (const quoteToken of quoteTokens) {
            // For Raydium V4, pools are accounts owned by the program
            // We'd need to fetch and filter, but for now let's return empty
            // In production, you'd use getProgramAccounts with filters
            console.log(`Checking Raydium pool for ${tokenMint} with quote ${quoteToken}`);
          }
        } catch (error) {
          console.error('Error querying Raydium pools on-chain:', error);
        }
      }

      // Check if it might be a Raydium token even if not marked in database
      // You could also use Jupiter API to find pools
      console.log(`No Raydium pools found for ${tokenMint}`);
      return [];
    } catch (error) {
      console.error('Error finding Raydium pools:', error);
      return [];
    }
  }

  /**
   * Find Pump.fun pool for a token
   */
  private async findPumpFunPool(tokenMint: string): Promise<string | null> {
    try {
      // First check if this is a pump.fun token in our database
      const { data: tokenData } = await supabase
        .from('token_metadata')
        .select('platform, pool_address')
        .eq('mint', tokenMint)
        .single();

      if (tokenData?.platform === 'pump.fun' && tokenData.pool_address) {
        return tokenData.pool_address;
      }

      // If it's a pump.fun token but no pool address, derive the bonding curve PDA
      if (tokenData?.platform === 'pump.fun') {
        const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwzK1P');
        const [bondingCurve] = await PublicKey.findProgramAddress(
          [Buffer.from('bonding-curve'), new PublicKey(tokenMint).toBuffer()],
          PUMP_FUN_PROGRAM
        );
        
        const bondingCurveAddress = bondingCurve.toString();
        console.log(`Derived pump.fun bonding curve for ${tokenMint}: ${bondingCurveAddress}`);
        
        // Update database with the derived pool address for future use
        await supabase
          .from('token_metadata')
          .update({ pool_address: bondingCurveAddress })
          .eq('mint', tokenMint);
        
        return bondingCurveAddress;
      }

      console.log(`Token ${tokenMint} is not a pump.fun token`);
      return null;
    } catch (error) {
      console.error('Error finding pump.fun pool:', error);
      return null;
    }
  }

  /**
   * Get monitoring status for a token
   */
  isTokenProtected(tokenMint: string): boolean {
    return Array.from(this.monitoredPools.values())
      .some(pool => pool.tokenMint === tokenMint);
  }

  /**
   * Get all protected tokens
   */
  getProtectedTokens(): string[] {
    return Array.from(this.monitoredPools.values())
      .map(pool => pool.tokenMint);
  }

  /**
   * Find pool via Jupiter API
   */
  private async findPoolViaJupiter(tokenMint: string): Promise<string | null> {
    try {
      // Jupiter API can provide pool information
      const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenMint}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const tokenData = data.data[tokenMint];

      // Jupiter doesn't directly return pool addresses, but we can use it to verify token exists
      if (tokenData) {
        console.log(`Token ${tokenMint} found on Jupiter, but pool address not available via this API`);
        // In a production system, you might want to use Jupiter's routing API
        // or query the blockchain directly for pools
      }

      return null;
    } catch (error) {
      console.error('Error querying Jupiter API:', error);
      return null;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.log('Shutting down PoolMonitoringService...');
    
    // Remove all subscriptions
    for (const [poolAddress, subscriptionId] of this.subscriptions) {
      await this.connection.removeAccountChangeListener(subscriptionId);
    }
    
    this.subscriptions.clear();
    this.monitoredPools.clear();
  }
}

// Export singleton instance
export const poolMonitoringService = new PoolMonitoringService();