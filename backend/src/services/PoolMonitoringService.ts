import { Connection, PublicKey, AccountInfo, VersionedTransaction } from '@solana/web3.js';
import config from '../config';
import { RaydiumPoolDecoder } from './pool-decoders/RaydiumPoolDecoder';
import { PumpFunPoolDecoder } from './pool-decoders/PumpFunPoolDecoder';
import { poolDecoderRegistry } from './pool-decoders/PoolDecoderRegistry';
import supabase from '../utils/supabaseClient';
import { EnhancedPoolDiscoveryService } from './EnhancedPoolDiscoveryService';
import { broadcastService } from './SupabaseBroadcastService';
import { wsClient, SolanaWebsocketClient } from './SolanaWebsocketClient';
import { transactionCache } from './TransactionCache';
import { prioritySender } from './PrioritySender';
import { rugCheckPollingServiceV2 } from './RugCheckPollingServiceV2';
import { getJupiterPriceUrl, getJupiterFetchOptions } from '../utils/jupiterEndpoints';
import { monitoringStatsService } from './MonitoringStatsService';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { canExecuteSwaps } from '../utils/subscriptionUtils';

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
  private poolLogSubs: Map<string, number> = new Map(); // poolAddress -> subscription ID for logs
  private raydiumDecoder: RaydiumPoolDecoder;
  private pumpFunDecoder: PumpFunPoolDecoder;
  private enhancedPoolDiscovery: EnhancedPoolDiscoveryService;
  private wsClient: SolanaWebsocketClient;
  private realtimeSubscription: any;
  private activeTokens: Map<string, Set<string>> = new Map(); // tokenMint -> Set<walletAddress>
  // --- anti-spam / rate-limit helpers ---
  private analyzedSignatures: Set<string> = new Set();
  private rpcSemaphore = 0;
  private readonly MAX_RPC_CONCURRENT = config.maxRpcConcurrent;
  private readonly analyzedExpiryMs = config.analyzedSignatureExpiry;

  constructor() {
    const rpcUrl = config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, {
      wsEndpoint: rpcUrl.replace('https', 'wss'),
      commitment: 'confirmed'
    });
    
    this.raydiumDecoder = new RaydiumPoolDecoder();
    this.pumpFunDecoder = new PumpFunPoolDecoder();
    this.enhancedPoolDiscovery = new EnhancedPoolDiscoveryService(this.connection);
    this.wsClient = wsClient;
    
    // Register decoders
    poolDecoderRegistry.register(this.raydiumDecoder);
    poolDecoderRegistry.register(this.pumpFunDecoder);
    
    console.log('PoolMonitoringService initialized with WebSocket support');
    console.log('Registered pool decoders:', poolDecoderRegistry.getDecoders());
    this.initializeRealtimeSubscription();
    this.initializeWebSocketMonitoring();
    
    // periodic cleanup of analysed signatures to prevent memory growth
    setInterval(() => {
      // More aggressive cleanup based on configured max size
      if (this.analyzedSignatures.size > config.analyzedSignatureMaxSize) {
        // Clear oldest half of signatures
        const toDelete = Math.floor(this.analyzedSignatures.size / 2);
        const iter = this.analyzedSignatures.values();
        for (let i = 0; i < toDelete; i++) {
          const sig = iter.next().value;
          if (sig) this.analyzedSignatures.delete(sig);
        }
      }
    }, 60_000);
  }

  // REMOVED: setWebSocketService - no longer needed with Supabase Realtime

  /**
   * Trigger asynchronous pool discovery for a token
   */
  private async triggerAsyncPoolDiscovery(tokenMint: string, walletAddress: string): Promise<void> {
    try {
      console.log(`[PoolMonitoring] Triggering async pool discovery for ${tokenMint}`);
      
      // Run discovery in background
      setTimeout(async () => {
        try {
          const poolInfo = await this.enhancedPoolDiscovery.discoverPool(tokenMint);
          if (poolInfo) {
            console.log(`[PoolMonitoring] Async discovery found pool for ${tokenMint}: ${poolInfo.address}`);
            
            // Update protected_tokens with discovered pool
            await supabase
              .from('protected_tokens')
              .update({
                pool_address: poolInfo.address,
                pool_monitoring_enabled: true,
                updated_at: new Date().toISOString()
              })
              .eq('token_mint', tokenMint)
              .eq('wallet_address', walletAddress);
            
            // Now start actual pool monitoring
            await this.protectTokenWithPool(tokenMint, walletAddress, poolInfo.address);
          }
        } catch (error) {
          console.error(`[PoolMonitoring] Async pool discovery error for ${tokenMint}:`, error);
        }
      }, 1000); // Start after 1 second to not block main flow
    } catch (error) {
      console.error(`[PoolMonitoring] Error triggering async discovery:`, error);
    }
  }

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

      // Subscribe to pool changes via WebSocket for ultra-low latency
      const subscriptionId = await this.wsClient.subscribeToAccount(
        new PublicKey(poolAddress),
        (accountInfo, context) => this.handlePoolChangeWebSocket(poolAddress, accountInfo, context)
      );

      this.subscriptions.set(poolAddress, subscriptionId);
      
      // Pre-compute emergency transactions
      await this.precomputeEmergencyTransactions(tokenMint, userWallet);

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
      
      // Subscribe to pool-specific logs for ultra-low latency monitoring
      try {
        const poolLogSubId = await this.wsClient.subscribeToLogs({
          mentions: [new PublicKey(poolAddress)]
        });
        this.poolLogSubs.set(poolAddress, poolLogSubId);
        console.log(`[PoolMonitoring] Subscribed to pool-specific logs for ${poolAddress}`);
      } catch (error) {
        console.error(`[PoolMonitoring] Failed to subscribe to pool logs for ${poolAddress}:`, error);
      }
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection status updates are automatically broadcast when we write to protected_tokens table

      // Start tracking velocity data for this token
      await liquidityVelocityTracker.trackToken(tokenMint);
      
      // Force update monitoring stats for immediate display
      await monitoringStatsService.forceUpdate(tokenMint, userWallet);

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
        console.log(`No pool found for token ${tokenMint} - will enable protection without pool monitoring`);
        
        // Still enable protection but without pool monitoring
        // This allows monitoring of other metrics like price velocity
        await supabase
          .from('protected_tokens')
          .upsert({
            token_mint: tokenMint,
            wallet_address: userWallet,
            pool_address: null,
            baseline_liquidity: 0,
            monitoring_active: true,
            pool_monitoring_enabled: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'token_mint,wallet_address' });
        
        // Start tracking velocity data even without pool
        await liquidityVelocityTracker.trackToken(tokenMint);
        
        // Force update monitoring stats
        await monitoringStatsService.forceUpdate(tokenMint, userWallet);
        
        // Trigger async pool discovery
        this.triggerAsyncPoolDiscovery(tokenMint, userWallet);
        
        return true;
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

      // Subscribe to pool changes via WebSocket for ultra-low latency
      const subscriptionId = await this.wsClient.subscribeToAccount(
        new PublicKey(poolAddress),
        (accountInfo, context) => this.handlePoolChangeWebSocket(poolAddress, accountInfo, context)
      );

      this.subscriptions.set(poolAddress, subscriptionId);
      
      // Pre-compute emergency transactions
      await this.precomputeEmergencyTransactions(tokenMint, userWallet);

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
      
      // Subscribe to pool-specific logs for ultra-low latency monitoring
      try {
        const poolLogSubId = await this.wsClient.subscribeToLogs({
          mentions: [new PublicKey(poolAddress)]
        });
        this.poolLogSubs.set(poolAddress, poolLogSubId);
        console.log(`[PoolMonitoring] Subscribed to pool-specific logs for ${poolAddress}`);
      } catch (error) {
        console.error(`[PoolMonitoring] Failed to subscribe to pool logs for ${poolAddress}:`, error);
      }
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection status updates are automatically broadcast when we write to protected_tokens table

      // Start tracking velocity data for this token
      await liquidityVelocityTracker.trackToken(tokenMint);
      
      // Force update monitoring stats for immediate display
      await monitoringStatsService.forceUpdate(tokenMint, userWallet);

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

      // Unsubscribe from account changes
      const subscriptionId = this.subscriptions.get(poolAddress);
      if (subscriptionId !== undefined) {
        await this.wsClient.unsubscribe(subscriptionId);
        this.subscriptions.delete(poolAddress);
      }
      
      // Unsubscribe from pool-specific logs
      const poolLogSubId = this.poolLogSubs.get(poolAddress);
      if (poolLogSubId !== undefined) {
        await this.wsClient.unsubscribe(poolLogSubId);
        this.poolLogSubs.delete(poolAddress);
        console.log(`[PoolMonitoring] Unsubscribed from pool logs for ${poolAddress}`);
      }
      
      // Clear cached transactions
      await transactionCache.invalidateToken(tokenMint);

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

      // Start tracking velocity data for this token
      await liquidityVelocityTracker.trackToken(tokenMint);
      
      // Force update monitoring stats for immediate display
      await monitoringStatsService.forceUpdate(tokenMint, userWallet);

      return true;
    } catch (error) {
      console.error(`Error unprotecting token ${tokenMint}:`, error);
      return false;
    }
  }

  /**
   * Initialize Supabase realtime subscription for protected tokens
   */
  private async initializeRealtimeSubscription() {
    // Subscribe to protected_tokens changes
    this.realtimeSubscription = supabase
      .channel('protected_tokens_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'protected_tokens'
      }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const token = payload.new as any;
          if (token.is_active && token.monitoring_enabled) {
            // Add to active tokens
            if (!this.activeTokens.has(token.token_mint)) {
              this.activeTokens.set(token.token_mint, new Set());
            }
            this.activeTokens.get(token.token_mint)!.add(token.wallet_address);
            
            // Start monitoring if not already
            if (!this.monitoredPools.has(token.pool_address)) {
              await this.protectTokenWithPool(
                token.token_mint,
                token.wallet_address,
                token.pool_address
              );
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const token = payload.old as any;
          const wallets = this.activeTokens.get(token.token_mint);
          if (wallets) {
            wallets.delete(token.wallet_address);
            if (wallets.size === 0) {
              this.activeTokens.delete(token.token_mint);
              // Stop monitoring if no more wallets
              await this.unprotectToken(token.token_mint, token.wallet_address);
            }
          }
        }
      })
      .subscribe();
  }

  /**
   * Initialize WebSocket monitoring for key programs
   */
  private async initializeWebSocketMonitoring() {
    try {
      // Try to connect WebSocket, but don't fail if it doesn't work
      try {
        await this.wsClient.connect();
        console.log('[PoolMonitoring] ✅ WebSocket connected - real-time monitoring enabled');
      } catch (wsError) {
        console.log('[PoolMonitoring] ⚠️ WebSocket connection failed - falling back to aggressive polling for memecoin trading');
        console.log('[PoolMonitoring] This is normal with Helius free tier - Premium tier required for real-time mempool');
        
        // Enable aggressive polling mode for memecoin trading
        this.enableAggressivePolling();
        return;
      }
      
      // Only subscribe to global program logs if explicitly enabled (for development/debugging)
      if (config.enableGlobalProgramMonitoring) {
        console.log('[PoolMonitoring] ⚠️ Global program monitoring enabled - this may cause high RPC usage');
        
        // Subscribe to logs for key DEX programs
        const programs = [
          '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM V4
          '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
          'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
          'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ', // Saber
        ];
        
        for (const programId of programs) {
          await this.wsClient.subscribeToLogs({
            programId: new PublicKey(programId)
          });
        }
      }
      
      // Always listen for log events (pool-specific logs will still emit)
      this.wsClient.on('logs', async (event) => {
        await this.handleLogEvent(event);
      });
      
      console.log('[PoolMonitoring] ✅ WebSocket monitoring initialized');
    } catch (error) {
      console.error('[PoolMonitoring] Failed to initialize WebSocket monitoring:', error);
    }
  }

  /**
   * Handle log events for rug detection
   */
  private async handleLogEvent(event: any) {
    try {
      const { logs, signature } = event;
      
      // Early bailout: Extract pool address from logs and check if we're monitoring it
      // This prevents analyzing transactions for pools we don't care about
      let involvedPoolAddress: string | null = null;
      
      // Try to extract pool address from the logs (first few entries often contain account keys)
      for (const log of logs.slice(0, 5)) {
        // Look for base58 encoded addresses in logs
        const addressMatch = log.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
        if (addressMatch) {
          const potentialAddress = addressMatch[0];
          if (this.monitoredPools.has(potentialAddress)) {
            involvedPoolAddress = potentialAddress;
            break;
          }
        }
      }
      
      // If no monitored pool is involved, skip this transaction entirely
      if (!involvedPoolAddress && !config.enableGlobalProgramMonitoring) {
        return;
      }
      
      // Look for suspicious patterns
      const suspiciousPatterns = [
        'RemoveLiquidity',
        'ClosePool',
        'WithdrawAll',
        'SetAuthority',
        'Transfer authority',
        'Burn',
        'Close account'
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (logs.some((log: string) => log.includes(pattern))) {
          // Deduplicate to avoid analysing the same tx repeatedly
          if (!this.analyzedSignatures.has(signature)) {
            this.analyzedSignatures.add(signature);
            console.log(`[PoolMonitoring] ⚠️ Suspicious activity detected: ${pattern} in tx ${signature}`);
            
            // Further analysis would be done here
            await this.analyzeTransaction(signature, pattern);
          }
        }
      }
    } catch (error) {
      console.error('[PoolMonitoring] Error handling log event:', error);
    }
  }

  /**
   * Analyze suspicious transaction
   */
  private async analyzeTransaction(signature: string, pattern: string) {
    try {
      const tx = await this.safeGetTransaction(signature);
      
      if (!tx) return;
      
      // Extract involved accounts
      const accounts = tx.transaction.message.staticAccountKeys || [];
      
      // Check if any monitored pools are involved
      for (const [poolAddress, poolData] of this.monitoredPools) {
        if (accounts.some(acc => acc.toString() === poolAddress)) {
          console.error(`[PoolMonitoring] 🚨 RUGPULL PATTERN DETECTED for pool ${poolAddress}`);
          
          // Trigger immediate protection
          await broadcastService.broadcastRugpullAlert({
            tokenMint: poolData.tokenMint,
            poolAddress,
            severity: 'CRITICAL',
            liquidityChange: 100, // Assume worst case
            type: pattern
          });
        }
      }
    } catch (error) {
      const msg = (error as any)?.message || '';
      if (msg.includes('rate limited') || msg.includes('429')) {
        // Already handled by retry logic – downgrade to warn to avoid log spam
        console.warn('[PoolMonitoring] Still rate-limited after retries while analyzing transaction');
      } else {
        console.error('[PoolMonitoring] Error analyzing transaction:', error);
      }
    }
  }

  /**
   * Fetch a transaction with automatic retry/back-off to avoid RPC 429 spam.
   */
  private async getTransactionWithRetry(signature: string, maxRetries = 6) {
    await this.acquireRpcSlot();
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await this.connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0
        });
      } catch (err: any) {
        const msg = err?.message || '';
        // Solana RPC rate-limit: -32429 / "rate limited"
        const isRateLimited = msg.includes('rate limited') || msg.includes('429');
        if (isRateLimited && attempt < maxRetries) {
          const delay = Math.min(4000, 2 ** attempt * config.rpcRetryDelay) + Math.floor(Math.random() * 200);
          if (attempt === 0) {
            console.warn(`[PoolMonitoring] RPC rate-limited – retrying ${signature} in ${delay}ms (attempt ${attempt + 1})`);
          }
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        }
        // For non-rate-limit errors or after exhausting retries, re-throw
        throw err;
      }
    }
    this.releaseRpcSlot();
    return null;
  }

  /**
   * Acquire an RPC slot respecting global concurrency limit
   */
  private async acquireRpcSlot() {
    while (this.rpcSemaphore >= this.MAX_RPC_CONCURRENT) {
      await new Promise(res => setTimeout(res, 50));
    }
    this.rpcSemaphore++;
  }

  /**
   * Release RPC slot
   */
  private releaseRpcSlot() {
    if (this.rpcSemaphore > 0) this.rpcSemaphore--;
  }

  /**
   * Ensure semaphore release on success or failure
   */
  private async safeGetTransaction(signature: string) {
    try {
      return await this.getTransactionWithRetry(signature);
    } finally {
      this.releaseRpcSlot();
    }
  }

  /**
   * Handle pool account changes via WebSocket
   */
  private async handlePoolChangeWebSocket(
    poolAddress: string, 
    accountInfo: any,
    context: any
  ) {
    const startTime = Date.now();
    
    try {
      const poolData = this.monitoredPools.get(poolAddress);
      if (!poolData) return;
      
      // Decode the account data
      const decoded = await this.decodePoolData(poolAddress, {
        ...accountInfo.accountInfo,
        data: Buffer.from(accountInfo.accountInfo.data[0], 'base64')
      } as AccountInfo<Buffer>);
      
      if (!decoded) return;
      
      const oldLiquidity = poolData.currentLiquidity;
      const newLiquidity = decoded.liquidity;
      const liquidityChange = ((oldLiquidity - newLiquidity) / oldLiquidity) * 100;
      
      const latency = Date.now() - startTime;
      console.log(`[PoolMonitoring] WebSocket update processed in ${latency}ms`);
      
      // Update current liquidity
      poolData.currentLiquidity = newLiquidity;
      poolData.lastUpdate = new Date();
      poolData.lastChecked = new Date();
      
      // Ultra-fast rug detection
      if (liquidityChange > 20) {
        console.error(`[PoolMonitoring] 🚨 INSTANT RUG DETECTED via WebSocket: ${liquidityChange.toFixed(2)}% drop!`);
        
        // Trigger immediate protection
        await this.triggerInstantProtection(poolData, liquidityChange, context.slot);
      }
    } catch (error) {
      console.error('[PoolMonitoring] Error in WebSocket handler:', error);
    }
  }

  /**
   * Trigger instant protection with pre-computed transactions
   */
  private async triggerInstantProtection(
    poolData: PoolData,
    liquidityChange: number,
    slot: number
  ) {
    const startTime = Date.now();
    
    try {
      // Get all wallets protecting this token
      const wallets = this.activeTokens.get(poolData.tokenMint) || new Set();
      
      console.log(`[PoolMonitoring] Triggering instant protection for ${wallets.size} wallets`);
      
      // Execute protection for each wallet in parallel
      const protectionPromises = Array.from(wallets).map(async (walletAddress) => {
        try {
          // Get pre-computed transaction
          const cached = await transactionCache.getTransaction(
            poolData.tokenMint,
            walletAddress,
            true // emergency
          );
          
          if (cached) {
            // Deserialize transaction from base64
            const txBuffer = Buffer.from(cached.transaction, 'base64');
            const transaction = VersionedTransaction.deserialize(txBuffer);
            
            // Send via priority sender
            const result = await prioritySender.sendEmergencyTransaction(
              transaction,
              null as any, // Signer would be retrieved securely
              {
                jitoTipAmount: 100000, // 0.0001 SOL tip
                priorityFeeMicroLamports: cached.metadata.priorityFee
              }
            );
            
            const executionTime = Date.now() - startTime;
            console.log(`[PoolMonitoring] Protection executed in ${executionTime}ms: ${result.success ? '✅' : '❌'}`);
            
            return result;
          } else {
            console.warn(`[PoolMonitoring] No cached transaction for ${walletAddress}`);
          }
        } catch (error) {
          console.error(`[PoolMonitoring] Protection failed for ${walletAddress}:`, error);
        }
      });
      
      await Promise.allSettled(protectionPromises);
      
      // Broadcast the event
      await broadcastService.broadcastRugpullAlert({
        tokenMint: poolData.tokenMint,
        poolAddress: poolData.poolAddress,
        severity: 'CRITICAL',
        liquidityChange,
        type: 'INSTANT_LIQUIDITY_REMOVAL'
      });
      
    } catch (error) {
      console.error('[PoolMonitoring] Error in instant protection:', error);
    }
  }

  /**
   * Handle pool account changes (legacy method kept for compatibility)
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
        
        // CRITICAL: Trigger immediate risk score recalculation
        try {
          console.log(`[PoolMonitoring] Triggering risk score recalculation for ${poolData.tokenMint} due to ${liquidityChange.toFixed(2)}% liquidity drop`);
          
          // Force immediate risk check with updated liquidity data
          await rugCheckPollingServiceV2.checkSingleToken(poolData.tokenMint, {
            liquidityUSD: newLiquidity,
            liquidityVelocity: liquidityChange / (timeWindowSeconds / 60), // Convert to % per minute
            forceUpdate: true,
            source: 'liquidity_alert'
          });
        } catch (error) {
          console.error('Error triggering risk recalculation:', error);
        }
        
        // Trigger emergency sell through broadcast but only for full protection users
        const { data: protectedWallets } = await supabase
          .from('protected_tokens')
          .select('wallet_address')
          .eq('token_mint', poolData.tokenMint)
          .eq('is_active', true);
        
        if (protectedWallets) {
          for (const protectedWallet of protectedWallets) {
            const canExecute = await canExecuteSwaps(protectedWallet.wallet_address);
            if (canExecute) {
              await broadcastService.broadcastProtectionExecution({
                tokenMint: poolData.tokenMint,
                walletAddress: protectedWallet.wallet_address,
                action: 'emergency_sell',
                reason: `Liquidity dropped ${liquidityChange.toFixed(2)}%`
              });
            } else {
              console.log(`[PoolMonitoring] Watch-only user ${protectedWallet.wallet_address} - sending alert only`);
              // Alert will be sent via rugpull_alerts table insert above
            }
          }
        }
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
      const poolPubkey = new PublicKey(poolAddress);
      
      // Use the decoder registry
      const decodedData = poolDecoderRegistry.decode(accountInfo, poolPubkey);
      
      if (!decodedData) {
        console.error(`Unable to decode pool data for ${poolAddress}`);
        return null;
      }
      
      return decodedData;
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
        const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
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
      const priceUrl = getJupiterPriceUrl(tokenMint);
      const fetchOptions = getJupiterFetchOptions({
        timeout: 10000,
        maxRetries: 3
      });
      
      const response = await fetch(priceUrl, fetchOptions);
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
   * Pre-compute emergency transactions for faster execution
   */
  private async precomputeEmergencyTransactions(tokenMint: string, walletAddress: string) {
    try {
      // This would integrate with TransactionCache service
      // For now, just log
      console.log(`[PoolMonitoring] Pre-computing emergency transactions for ${tokenMint}`);
    } catch (error) {
      console.error(`[PoolMonitoring] Failed to pre-compute transactions:`, error);
    }
  }

  /**
   * Get active monitor count for a token (used by MonitoringStatsService)
   */
  public getActiveMonitorCount(tokenMint: string): number {
    let count = 0;
    
    // Count pools being monitored for this token
    for (const [poolAddress, poolData] of this.monitoredPools) {
      if (poolData.tokenMint === tokenMint) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Enable aggressive polling mode for memecoin trading when WebSocket is unavailable
   */
  private enableAggressivePolling() {
    console.log('[PoolMonitoring] 🚀 Enabling aggressive polling mode for memecoin trading');
    console.log('[PoolMonitoring] - Price checks: every 2 seconds');
    console.log('[PoolMonitoring] - Liquidity checks: every 5 seconds');
    console.log('[PoolMonitoring] - Pattern analysis: every 10 seconds');
    
    // Price monitoring - every 2 seconds for memecoins
    setInterval(async () => {
      await this.pollPriceChanges();
    }, config.priceCheckInterval || 2000);
    
    // Liquidity monitoring - every 5 seconds
    setInterval(async () => {
      await this.pollLiquidityChanges();
    }, config.liquidityCheckInterval || 5000);
    
    // Risk pattern analysis - every 10 seconds
    setInterval(async () => {
      await this.pollRiskPatterns();
    }, config.riskPatternInterval || 10000);
    
    // Adaptive polling based on risk level
    this.enableAdaptivePolling();
  }
  
  /**
   * Enable adaptive polling based on token risk levels
   */
  private enableAdaptivePolling() {
    // High-risk tokens: every 1 second
    setInterval(async () => {
      await this.pollHighRiskTokens();
    }, config.highRiskPollInterval || 1000);
    
    // Medium-risk tokens: every 3 seconds  
    setInterval(async () => {
      await this.pollMediumRiskTokens();
    }, config.mediumRiskPollInterval || 3000);
    
    // Low-risk tokens: every 10 seconds
    setInterval(async () => {
      await this.pollLowRiskTokens();
    }, config.lowRiskPollInterval || 10000);
  }
  
  /**
   * Poll for price changes across all monitored tokens
   */
  private async pollPriceChanges() {
    try {
      for (const [poolAddress, poolData] of this.monitoredPools) {
        try {
          // Check if enough time has passed since last check
          const timeSinceLastCheck = Date.now() - (poolData.lastChecked?.getTime() || 0);
          if (timeSinceLastCheck < 1000) continue; // Skip if checked less than 1s ago
          
          // Fetch current pool state
          const accountInfo = await this.connection.getAccountInfo(new PublicKey(poolAddress));
          if (accountInfo) {
            await this.handlePoolChange(poolAddress, accountInfo);
            poolData.lastChecked = new Date();
          }
        } catch (error) {
          console.warn(`[AggressivePolling] Error checking pool ${poolAddress}:`, error);
        }
      }
    } catch (error) {
      console.error('[AggressivePolling] Error in price polling:', error);
    }
  }
  
  /**
   * Poll for liquidity changes
   */
  private async pollLiquidityChanges() {
    try {
      // Similar to price changes but focused on liquidity metrics
      for (const [poolAddress, poolData] of this.monitoredPools) {
        try {
          const accountInfo = await this.connection.getAccountInfo(new PublicKey(poolAddress));
          if (accountInfo) {
            const decoded = await this.decodePoolData(poolAddress, accountInfo);
            if (decoded && decoded.liquidity !== poolData.currentLiquidity) {
              const liquidityChange = ((poolData.currentLiquidity - decoded.liquidity) / poolData.currentLiquidity) * 100;
              
              // Fast liquidity drop detection
              if (liquidityChange > 15) {
                console.warn(`[AggressivePolling] ⚠️ Liquidity drop detected: ${liquidityChange.toFixed(2)}% for ${poolData.tokenMint}`);
                await this.handlePoolChange(poolAddress, accountInfo);
              }
            }
          }
        } catch (error) {
          console.warn(`[AggressivePolling] Error checking liquidity for ${poolAddress}:`, error);
        }
      }
    } catch (error) {
      console.error('[AggressivePolling] Error in liquidity polling:', error);
    }
  }
  
  /**
   * Poll for risk patterns and suspicious activity
   */
  private async pollRiskPatterns() {
    try {
      // Check for transaction patterns that might indicate rug pulls
      const recentBlocks = await this.connection.getRecentBlockhash();
      // This would involve checking recent transactions for suspicious patterns
      // For now, just log that we're checking
      console.log('[AggressivePolling] Checking risk patterns...');
    } catch (error) {
      console.error('[AggressivePolling] Error in pattern polling:', error);
    }
  }
  
  /**
   * Poll high-risk tokens more frequently
   */
  private async pollHighRiskTokens() {
    try {
      // Get high-risk tokens from database
      const { data: highRiskTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint, pool_address')
        .eq('monitoring_active', true)
        .eq('risk_threshold', 'CRITICAL');
      
      if (highRiskTokens && highRiskTokens.length > 0) {
        console.log(`[AggressivePolling] Checking ${highRiskTokens.length} high-risk tokens...`);
        
        for (const token of highRiskTokens) {
          if (token.pool_address && this.monitoredPools.has(token.pool_address)) {
            const accountInfo = await this.connection.getAccountInfo(new PublicKey(token.pool_address));
            if (accountInfo) {
              await this.handlePoolChange(token.pool_address, accountInfo);
            }
          }
        }
      }
    } catch (error) {
      console.error('[AggressivePolling] Error polling high-risk tokens:', error);
    }
  }
  
  /**
   * Poll medium-risk tokens
   */
  private async pollMediumRiskTokens() {
    try {
      const { data: mediumRiskTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint, pool_address')
        .eq('monitoring_active', true)
        .eq('risk_threshold', 'HIGH');
      
      if (mediumRiskTokens && mediumRiskTokens.length > 0) {
        for (const token of mediumRiskTokens) {
          if (token.pool_address && this.monitoredPools.has(token.pool_address)) {
            const accountInfo = await this.connection.getAccountInfo(new PublicKey(token.pool_address));
            if (accountInfo) {
              await this.handlePoolChange(token.pool_address, accountInfo);
            }
          }
        }
      }
    } catch (error) {
      console.error('[AggressivePolling] Error polling medium-risk tokens:', error);
    }
  }
  
  /**
   * Poll low-risk tokens
   */
  private async pollLowRiskTokens() {
    try {
      const { data: lowRiskTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint, pool_address')
        .eq('monitoring_active', true)
        .in('risk_threshold', ['MODERATE', 'LOW']);
      
      if (lowRiskTokens && lowRiskTokens.length > 0) {
        for (const token of lowRiskTokens) {
          if (token.pool_address && this.monitoredPools.has(token.pool_address)) {
            const accountInfo = await this.connection.getAccountInfo(new PublicKey(token.pool_address));
            if (accountInfo) {
              await this.handlePoolChange(token.pool_address, accountInfo);
            }
          }
        }
      }
    } catch (error) {
      console.error('[AggressivePolling] Error polling low-risk tokens:', error);
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
    
    // Remove all pool log subscriptions
    for (const [poolAddress, subId] of this.poolLogSubs) {
      await this.wsClient.unsubscribe(subId);
    }
    
    this.subscriptions.clear();
    this.poolLogSubs.clear();
    this.monitoredPools.clear();
  }
}

// Export singleton instance
export const poolMonitoringService = new PoolMonitoringService();