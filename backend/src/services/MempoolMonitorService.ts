import { Connection, PublicKey, ParsedTransactionWithMeta, TransactionSignature } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { wsClient, SolanaWebsocketClient } from './SolanaWebsocketClient';
import { TransactionAnalyzer } from './TransactionAnalyzer';
import { transactionCacheService } from './TransactionCacheService';
import { MessageProcessor } from '../utils/MessageProcessor';
import { connectionPool } from './ConnectionPool';
import { batchProcessor } from '../utils/BatchProcessor';
import supabase from '../utils/supabaseClient';
import config from '../config';
import { BloomFilter, CountingBloomFilter } from '../utils/BloomFilter';
import { getJupiterHealthStatus } from '../utils/jupiterEndpoints';

interface MempoolTransaction {
  signature: string;
  slot: number;
  blockTime?: number;
  programId: string;
  accounts: string[];
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface ProtectedToken {
  tokenMint: string;
  walletAddress: string;
  poolAddress?: string;
  riskThreshold: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  priorityFeeMultiplier: number;
}

export class MempoolMonitorService extends EventEmitter {
  private connection: Connection;
  private wsClient: SolanaWebsocketClient;
  private analyzer: TransactionAnalyzer;
  private messageProcessor: MessageProcessor;
  private isRunning: boolean = false;
  private protectedTokens: Map<string, ProtectedToken[]> = new Map();
  private analyzedSignatures: Set<string> = new Set();
  
  // Bloom filters for efficient lookups
  private tokenBloomFilter: BloomFilter;
  private walletBloomFilter: CountingBloomFilter;
  private poolBloomFilter: BloomFilter;
  
  // Performance tracking
  private detectionTimes: number[] = [];
  private monitoredPrograms: string[] = [
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM V4
    '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter Aggregator v6
  ];

  constructor() {
    super();
    
    const rpcUrl = config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: rpcUrl.replace('https://', 'wss://')
    });
    
    this.wsClient = wsClient;
    this.analyzer = new TransactionAnalyzer(this.connection);
    
    // Initialize bloom filters with expected token counts
    this.tokenBloomFilter = new BloomFilter(10000, 0.001); // Very low false positive rate
    this.walletBloomFilter = new CountingBloomFilter(5000, 0.01); // Allows removal
    this.poolBloomFilter = new BloomFilter(20000, 0.01);
    
    // Initialize message processor with optimized settings
    this.messageProcessor = new MessageProcessor({
      workerCount: 4,
      batchSize: 20,
      processingTimeout: 80, // 80ms to leave room for execution
      maxQueueSize: 2000
    });
    
    // Listen for threats from message processor
    this.messageProcessor.on('threatDetected', async (threat) => {
      await this.handleProcessedThreat(threat);
    });
    
    console.log('[MempoolMonitor] Initialized with programs:', this.monitoredPrograms);
    
    // Load protected tokens on startup
    this.loadProtectedTokens();
    
    // Reload protected tokens periodically
    setInterval(() => this.loadProtectedTokens(), 30000); // Every 30 seconds
    
    // Clean up analyzed signatures periodically
    setInterval(() => {
      if (this.analyzedSignatures.size > 10000) {
        const toDelete = Math.floor(this.analyzedSignatures.size / 2);
        const iter = this.analyzedSignatures.values();
        for (let i = 0; i < toDelete; i++) {
          const sig = iter.next().value;
          if (sig) this.analyzedSignatures.delete(sig);
        }
      }
    }, 60000);
  }

  /**
   * Start monitoring mempool
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[MempoolMonitor] Starting mempool monitoring...');
    
    try {
      // Connect WebSocket
      await this.wsClient.connect();
      
      // Subscribe to pending transactions for monitored programs
      if (config.mempoolEnabled !== false) { // Only if explicitly enabled
        console.log('[MempoolMonitor] ⚠️ Mempool monitoring enabled - requires Helius premium tier');
        
        // Subscribe to program logs as a proxy for pending transactions
        for (const programId of this.monitoredPrograms) {
          try {
            const subId = await this.wsClient.subscribeToLogs({
              programId: new PublicKey(programId)
            });
            console.log(`[MempoolMonitor] Subscribed to ${programId} logs (ID: ${subId})`);
          } catch (error) {
            console.error(`[MempoolMonitor] Failed to subscribe to ${programId}:`, error);
          }
        }
        
        // Listen for log events
        this.wsClient.on('logs', async (event) => {
          await this.handlePendingTransaction(event);
        });
      } else {
        console.log('[MempoolMonitor] Mempool monitoring disabled - using on-chain monitoring only');
      }
      
      // Subscribe to protected token changes
      this.subscribeToProtectedTokenChanges();
      
      console.log('[MempoolMonitor] ✅ Started successfully');
      
      // Periodic stats reporting
      setInterval(() => {
        this.reportPerformanceStats();
      }, 60000); // Every minute
      
    } catch (error) {
      console.error('[MempoolMonitor] Failed to start:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stop() {
    this.isRunning = false;
    console.log('[MempoolMonitor] Stopping...');
    
    // Shutdown message processor
    await this.messageProcessor.shutdown();
    
    // Shutdown batch processor
    batchProcessor.shutdown();
    
    // Shutdown connection pool
    connectionPool.shutdown();
    
    // Disconnect WebSocket
    this.wsClient.disconnect();
    
    // Clear data
    this.protectedTokens.clear();
    this.analyzedSignatures.clear();
    
    // Clear bloom filters
    this.tokenBloomFilter.clear();
    this.walletBloomFilter.clear();
    this.poolBloomFilter.clear();
  }

  /**
   * Load protected tokens from database
   */
    private async loadProtectedTokens() {
    // Remove the broken fetchRealtimeTokenData call - this should be handled by the monitoring service
    // setInterval(() => this.fetchRealtimeTokenData(), 1000); // Fetch every second for memecoins
    try {
      const { data: tokens, error } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('is_active', true)
        .eq('mempool_monitoring', true)
        .neq('status', 'RUGGED');
        
      if (error) {
        console.error('[MempoolMonitor] Error loading protected tokens:', error);
        return;
      }
      
      // Clear bloom filters before repopulating
      this.tokenBloomFilter.clear();
      this.walletBloomFilter.clear();
      this.poolBloomFilter.clear();
      
      // Group by token mint
      const tokenMap = new Map<string, ProtectedToken[]>();
      
      for (const token of tokens || []) {
        const protectedToken: ProtectedToken = {
          tokenMint: token.token_mint,
          walletAddress: token.wallet_address,
          poolAddress: token.pool_address,
          riskThreshold: token.risk_threshold || 'HIGH',
          priorityFeeMultiplier: token.priority_fee_multiplier || 1.5
        };
        
        if (!tokenMap.has(token.token_mint)) {
          tokenMap.set(token.token_mint, []);
        }
        tokenMap.get(token.token_mint)!.push(protectedToken);
        
        // Add to bloom filters for fast lookups
        this.tokenBloomFilter.add(token.token_mint);
        this.walletBloomFilter.add(token.wallet_address);
        if (token.pool_address) {
          this.poolBloomFilter.add(token.pool_address);
        }
      }
      
      this.protectedTokens = tokenMap;
      console.log(`[MempoolMonitor] Loaded ${this.protectedTokens.size} protected tokens`);
      console.log(`[MempoolMonitor] Bloom filter stats:`, {
        tokens: this.tokenBloomFilter.getStats(),
        wallets: this.walletBloomFilter.getStats(),
        pools: this.poolBloomFilter.getStats()
      });
      
    } catch (error) {
      console.error('[MempoolMonitor] Failed to load protected tokens:', error);
    }
  }

  /**
   * Subscribe to protected token changes
   */
  private subscribeToProtectedTokenChanges() {
    supabase
      .channel('protected_tokens_mempool')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'protected_tokens'
      }, async (payload) => {
        console.log('[MempoolMonitor] Protected token change:', payload.eventType);
        
        // Handle incremental updates for better performance
        if (payload.eventType === 'INSERT' && payload.new) {
          await this.handleTokenInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          await this.handleTokenUpdate(payload.old, payload.new);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          await this.handleTokenDelete(payload.old);
        } else {
          // Full reload for other cases
          await this.loadProtectedTokens();
        }
      })
      .subscribe();
  }

  /**
   * Handle pending transaction from logs
   */
  private async handlePendingTransaction(event: any) {
    const { signature, logs } = event;
    const startTime = Date.now();
    
    // Deduplicate
    if (this.analyzedSignatures.has(signature)) {
      return;
    }
    this.analyzedSignatures.add(signature);
    
    try {
      // Use bloom filters for quick filtering before detailed checks
      const involvedTokens = this.extractPotentialTokens(logs);
      let protectedInvolved = false;
      
      // Quick bloom filter check first
      for (const token of involvedTokens) {
        if (this.tokenBloomFilter.contains(token)) {
          // Bloom filter says maybe - check the actual map
          if (this.protectedTokens.has(token)) {
            protectedInvolved = true;
            break;
          }
        }
      }
      
      // Also check if any addresses are protected wallets or pools
      if (!protectedInvolved) {
        for (const addr of involvedTokens) {
          if (this.walletBloomFilter.contains(addr) || this.poolBloomFilter.contains(addr)) {
            protectedInvolved = true;
            break;
          }
        }
      }
      
      if (!protectedInvolved) {
        return; // Skip if no protected entities involved
      }
      
      // Determine priority based on initial analysis
      const priority = this.determinePriority(logs);
      
      // Send to message processor for fast initial analysis
      await this.messageProcessor.processMessage({
        signature,
        logs,
        involvedTokens,
        timestamp: Date.now()
      }, priority);
      
      // Track detection time
      const detectionTime = Date.now() - startTime;
      this.trackDetectionTime(detectionTime);
      
      // Log if detection is slow
      if (detectionTime > 100) {
        console.warn(`[MempoolMonitor] Slow detection: ${detectionTime}ms for ${signature}`);
      }
    } catch (error) {
      console.error(`[MempoolMonitor] Error analyzing transaction ${signature}:`, error);
    }
  }

  /**
   * Extract potential token addresses from logs
   */
  private extractPotentialTokens(logs: string[]): string[] {
    const tokens = new Set<string>();
    
    // Look for base58 addresses in logs
    const addressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    
    for (const log of logs) {
      const matches = log.match(addressRegex) || [];
      matches.forEach(match => {
        // Basic validation - must be valid length for Solana address
        if (match.length >= 32 && match.length <= 44) {
          tokens.add(match);
        }
      });
    }
    
    return Array.from(tokens);
  }

  /**
   * Fetch transaction with retry and caching
   */
  private async fetchTransactionWithRetry(
    signature: string, 
    maxRetries = 3
  ): Promise<ParsedTransactionWithMeta | null> {
    // Check cache first
    const cached = transactionCacheService.get(signature);
    if (cached) {
      return cached;
    }
    
    try {
      // Use batch processor for efficient fetching
      const tx = await batchProcessor.add<ParsedTransactionWithMeta | null>(
        'getTransaction',
        { signature },
        'high' // High priority for threat detection
      );
      
      if (tx) {
        // Cache the transaction
        transactionCacheService.set(signature, tx);
        return tx;
      }
      
      return null;
      
    } catch (error: any) {
      // Fallback to connection pool with retry
      return connectionPool.execute(
        async (conn) => {
          const tx = await conn.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (tx) {
            transactionCacheService.set(signature, tx);
          }
          
          return tx;
        },
        { retries: maxRetries, priority: true }
      );
    }
  }

  /**
   * Store detected threat
   */
  private async storeThreat(
    tokenMint: string, 
    signature: string, 
    analysis: any
  ) {
    try {
      // Update last threat detected
      await supabase
        .from('protected_tokens')
        .update({ 
          last_threat_detected: new Date().toISOString() 
        })
        .eq('token_mint', tokenMint);
      
      // Store in pattern alerts
      await supabase
        .from('pattern_alerts')
        .insert({
          token_mint: tokenMint,
          pattern_type: analysis.type,
          confidence: analysis.confidence || 1.0,
          risk_score: analysis.riskScore || 100,
          recommendation: 'IMMEDIATE_EXIT',
          alert_type: 'mempool_threat',
          details: {
            signature,
            analysis,
            source: 'mempool_monitor'
          },
          timestamp: new Date().toISOString()
        });
        
    } catch (error) {
      console.error('[MempoolMonitor] Error storing threat:', error);
    }
  }

  /**
   * Add pending transaction subscription method for WebSocket client
   */
  async subscribeToPendingTransactions(programIds: string[]): Promise<number[]> {
    const subscriptionIds: number[] = [];
    
    for (const programId of programIds) {
      try {
        const subId = await this.wsClient.subscribeToLogs({
          programId: new PublicKey(programId)
        });
        subscriptionIds.push(subId);
      } catch (error) {
        console.error(`[MempoolMonitor] Failed to subscribe to ${programId}:`, error);
      }
    }
    
    return subscriptionIds;
  }
  
  /**
   * Handle token insert - add to bloom filters
   */
  private async handleTokenInsert(token: any) {
    if (!token.is_active || !token.mempool_monitoring) return;
    
    const protectedToken: ProtectedToken = {
      tokenMint: token.token_mint,
      walletAddress: token.wallet_address,
      poolAddress: token.pool_address,
      riskThreshold: token.risk_threshold || 'HIGH',
      priorityFeeMultiplier: token.priority_fee_multiplier || 1.5
    };
    
    // Add to map
    if (!this.protectedTokens.has(token.token_mint)) {
      this.protectedTokens.set(token.token_mint, []);
    }
    this.protectedTokens.get(token.token_mint)!.push(protectedToken);
    
    // Add to bloom filters
    this.tokenBloomFilter.add(token.token_mint);
    this.walletBloomFilter.add(token.wallet_address);
    if (token.pool_address) {
      this.poolBloomFilter.add(token.pool_address);
    }
    
    console.log(`[MempoolMonitor] Added token ${token.token_symbol} to monitoring`);
  }
  
  /**
   * Handle token update - update bloom filters if needed
   */
  private async handleTokenUpdate(oldToken: any, newToken: any) {
    // If monitoring status changed, reload everything
    if (oldToken.mempool_monitoring !== newToken.mempool_monitoring ||
        oldToken.is_active !== newToken.is_active) {
      await this.loadProtectedTokens();
      return;
    }
    
    // Otherwise just update the map entry
    const tokens = this.protectedTokens.get(newToken.token_mint);
    if (tokens) {
      const index = tokens.findIndex(t => t.walletAddress === newToken.wallet_address);
      if (index >= 0) {
        tokens[index] = {
          tokenMint: newToken.token_mint,
          walletAddress: newToken.wallet_address,
          poolAddress: newToken.pool_address,
          riskThreshold: newToken.risk_threshold || 'HIGH',
          priorityFeeMultiplier: newToken.priority_fee_multiplier || 1.5
        };
      }
    }
  }
  
  /**
   * Handle token delete - remove from bloom filters (requires full reload for regular bloom filter)
   */
  private async handleTokenDelete(token: any) {
    // Log for debugging
    console.log('[MempoolMonitor] Handling token delete:', JSON.stringify(token));
    
    // Ensure we have required fields
    if (!token || !token.token_mint) {
      console.warn('[MempoolMonitor] Invalid token delete payload - missing token_mint');
      return;
    }
    
    // Remove from map
    const tokens = this.protectedTokens.get(token.token_mint);
    if (tokens) {
      const filtered = tokens.filter(t => t.walletAddress !== token.wallet_address);
      if (filtered.length === 0) {
        this.protectedTokens.delete(token.token_mint);
      } else {
        this.protectedTokens.set(token.token_mint, filtered);
      }
    }
    
    // Remove from counting bloom filter (wallet) - only if wallet_address exists
    if (token.wallet_address) {
      this.walletBloomFilter.remove(token.wallet_address);
    }
    
    // For regular bloom filters, we need to rebuild (can't remove)
    // Only rebuild if this was the last instance of this token
    if (!this.protectedTokens.has(token.token_mint)) {
      await this.loadProtectedTokens();
    }
  }
  
  /**
   * Report performance statistics
   */
  private reportPerformanceStats(): void {
    const cacheStats = transactionCacheService.getStats();
    const bloomStats = {
      tokens: this.tokenBloomFilter.getStats(),
      wallets: this.walletBloomFilter.getStats(),
      pools: this.poolBloomFilter.getStats()
    };
    const processorStats = this.messageProcessor.getMetrics();
    const poolStats = connectionPool.getStats();
    const batchStats = batchProcessor.getStats();
    
    console.log('\n[MempoolMonitor] Performance Stats:');
    console.log('├─ Protected Tokens:', this.protectedTokens.size);
    console.log('├─ Analyzed Signatures:', this.analyzedSignatures.size);
    console.log('├─ Transaction Cache:');
    console.log('│  ├─ Size:', cacheStats.size);
    console.log('│  ├─ Hit Rate:', `${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log('│  ├─ Hits:', cacheStats.hits);
    console.log('│  ├─ Misses:', cacheStats.misses);
    console.log('│  └─ Evictions:', cacheStats.evictions);
    console.log('├─ Bloom Filters:');
    console.log('│  ├─ Token Filter:', `${bloomStats.tokens.itemCount} items, ${(bloomStats.tokens.falsePositiveRate * 100).toFixed(3)}% FPR`);
    console.log('│  ├─ Wallet Filter:', `${bloomStats.wallets.itemCount} items`);
    console.log('│  └─ Pool Filter:', `${bloomStats.pools.itemCount} items`);
    console.log('├─ Message Processor:');
    console.log('│  ├─ Queue Size:', processorStats.queueSize);
    console.log('│  ├─ Avg Processing:', `${processorStats.avgProcessingTime.toFixed(1)}ms`);
    console.log('│  ├─ P95 Processing:', `${processorStats.p95ProcessingTime.toFixed(1)}ms`);
    console.log('│  ├─ P99 Processing:', `${processorStats.p99ProcessingTime.toFixed(1)}ms`);
    console.log('│  └─ Throughput:', `${processorStats.throughput.toFixed(0)} msg/s`);
    console.log('├─ Connection Pool:');
    console.log('│  ├─ Healthy:', `${poolStats.healthyCount}/${poolStats.endpoints.length}`);
    console.log('│  ├─ Requests:', poolStats.totalRequests);
    console.log('│  ├─ Avg Latency:', `${poolStats.averageLatency.toFixed(1)}ms`);
    console.log('│  └─ Error Rate:', `${(poolStats.errorRate * 100).toFixed(2)}%`);
    console.log('├─ Batch Processor:');
    console.log('│  ├─ Total Batches:', batchStats.totalBatches);
    console.log('│  ├─ Avg Batch Size:', batchStats.avgBatchSize.toFixed(1));
    console.log('│  ├─ Saved RPC Calls:', batchStats.savedRpcCalls);
    console.log('│  └─ Efficiency:', `${(batchStats.efficiency * 100).toFixed(1)}%`);
    
    // Add Jupiter health status
    const jupiterHealth = getJupiterHealthStatus();
    console.log('├─ Jupiter API:');
    console.log('│  ├─ Status:', jupiterHealth.isHealthy ? '✅ Healthy' : '❌ Unhealthy');
    console.log('│  ├─ Uptime:', `${(jupiterHealth.uptime * 100).toFixed(1)}%`);
    console.log('│  ├─ Avg Response:', `${jupiterHealth.avgResponseTime.toFixed(0)}ms`);
    if (!jupiterHealth.isHealthy && jupiterHealth.lastError) {
      console.log('│  └─ Last Error:', jupiterHealth.lastError);
    } else {
      console.log('│  └─ Success Count:', jupiterHealth.successCount);
    }
    
    console.log('├─ Detection Times:');
    console.log('│  ├─ Avg:', `${this.getAvgDetectionTime().toFixed(1)}ms`);
    console.log('│  ├─ P95:', `${this.getP95DetectionTime().toFixed(1)}ms`);
    console.log('│  └─ P99:', `${this.getP99DetectionTime().toFixed(1)}ms`);
    console.log('└─ Memory Usage:', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\n`);
  }
  
  /**
   * Determine priority based on log patterns
   */
  private determinePriority(logs: string[]): 'critical' | 'high' | 'normal' | 'low' {
    const logStr = logs.join(' ').toLowerCase();
    
    // Critical patterns
    if (logStr.includes('removeliquidity') || 
        logStr.includes('freezeaccount') ||
        logStr.includes('setauthority') ||
        logStr.includes('transferownership')) {
      return 'critical';
    }
    
    // High priority patterns
    if (logStr.includes('swap') && /[0-9]{7,}/.test(logStr)) {
      return 'high';
    }
    
    // Normal priority
    if (logStr.includes('swap') || logStr.includes('transfer')) {
      return 'normal';
    }
    
    return 'low';
  }
  
  /**
   * Handle processed threat from message processor
   */
  private async handleProcessedThreat(threat: any): Promise<void> {
    const { signature, threat: threatData, timestamp } = threat;
    
    // Fetch full transaction for detailed analysis
    const tx = await this.fetchTransactionWithRetry(signature);
    if (!tx) {
      console.warn(`[MempoolMonitor] Could not fetch transaction for threat ${signature}`);
      return;
    }
    
    // Perform detailed analysis
    const analysis = await this.analyzer.analyzeTransaction(tx, signature);
    
    if (analysis && analysis.isDangerous) {
      console.error(`[MempoolMonitor] 🚨 THREAT CONFIRMED: ${signature}`);
      console.error(`- Type: ${analysis.type}`);
      console.error(`- Risk: ${analysis.riskLevel}`);
      console.error(`- Detection time: ${Date.now() - timestamp}ms`);
      
      // Check affected tokens
      for (const tokenMint of analysis.affectedTokens) {
        const protectedWallets = this.protectedTokens.get(tokenMint);
        if (protectedWallets && protectedWallets.length > 0) {
          // Emit threat detected event
          this.emit('threat-detected', {
            signature,
            tokenMint,
            analysis,
            protectedWallets,
            timestamp: new Date(),
            detectionTime: Date.now() - timestamp
          });
          
          // Store threat in database
          await this.storeThreat(tokenMint, signature, analysis);
        }
      }
    }
  }
  
  /**
   * Track detection time
   */
  private trackDetectionTime(time: number): void {
    this.detectionTimes.push(time);
    
    // Keep only last 1000 times
    if (this.detectionTimes.length > 1000) {
      this.detectionTimes.shift();
    }
  }
  
  /**
   * Get average detection time
   */
  private getAvgDetectionTime(): number {
    if (this.detectionTimes.length === 0) return 0;
    return this.detectionTimes.reduce((a, b) => a + b, 0) / this.detectionTimes.length;
  }
  
  /**
   * Get P95 detection time
   */
  private getP95DetectionTime(): number {
    if (this.detectionTimes.length === 0) return 0;
    const sorted = [...this.detectionTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }
  
  /**
   * Get P99 detection time
   */
  private getP99DetectionTime(): number {
    if (this.detectionTimes.length === 0) return 0;
    const sorted = [...this.detectionTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.99);
    return sorted[index] || 0;
  }
}

// Export singleton instance
export const mempoolMonitorService = new MempoolMonitorService();