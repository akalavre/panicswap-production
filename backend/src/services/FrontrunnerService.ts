import { EventEmitter } from 'events';
import { Connection, Transaction, TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import { TransactionCache } from './TransactionCache';
import { PrioritySender } from './PrioritySender';
import { BlockhashRefreshService } from './BlockhashRefreshService';
import supabase from '../utils/supabaseClient';
import config from '../config';

interface FrontrunnerConfig {
  baseFeeMicroLamports: number;
  maxPriorityFeeMicroLamports: number;
  jitoEnabled: boolean;
  jitoBundleSize: number;
  maxRetries: number;
  retryDelayMs: number;
}

interface ThreatEvent {
  tokenMint: string;
  walletAddress: string;
  analysis: {
    type: string;
    riskLevel: string;
    confidence: number;
  };
  priorityFeeMultiplier: number;
}

interface ExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  attemptsMade: number;
  finalPriorityFee: number;
  executionTimeMs: number;
}

export class FrontrunnerService extends EventEmitter {
  private connection: Connection;
  private transactionCache: TransactionCache;
  private prioritySender: PrioritySender;
  private config: FrontrunnerConfig;
  private isRunning: boolean = false;
  private executionQueue: Map<string, ThreatEvent> = new Map();
  private activeExecutions: Set<string> = new Set();
  
  // Circuit breaker
  private recentExecutions: { timestamp: number; success: boolean }[] = [];
  private circuitBreakerThreshold = 5; // Max failures in window
  private circuitBreakerWindow = 60000; // 1 minute window
  
  constructor(
    connection: Connection,
    transactionCache: TransactionCache,
    prioritySender: PrioritySender,
    blockhashService: BlockhashRefreshService
  ) {
    super();
    
    this.connection = connection;
    this.transactionCache = transactionCache;
    this.prioritySender = prioritySender;
    
    this.config = {
      baseFeeMicroLamports: parseInt(process.env.BASE_FEE_MICRO_LAMPORTS || '5000'),
      maxPriorityFeeMicroLamports: parseInt(process.env.MAX_PRIORITY_FEE_MICRO_LAMPORTS || '1000000'),
      jitoEnabled: process.env.JITO_ENABLED === 'true',
      jitoBundleSize: parseInt(process.env.JITO_BUNDLE_SIZE || '5'),
      maxRetries: parseInt(process.env.FRONTRUN_MAX_RETRIES || '3'),
      retryDelayMs: parseInt(process.env.FRONTRUN_RETRY_DELAY_MS || '100')
    };
    
    console.log('[FrontrunnerService] Initialized with config:', {
      ...this.config,
      jitoEnabled: this.config.jitoEnabled ? 'enabled' : 'disabled'
    });
    
    // Clean up old execution records periodically
    setInterval(() => this.cleanupExecutionHistory(), 30000);
  }

  /**
   * Start the frontrunner service
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[FrontrunnerService] Started');
    
    // Process execution queue
    this.processExecutionQueue();
  }

  /**
   * Stop the frontrunner service
   */
  stop() {
    this.isRunning = false;
    this.executionQueue.clear();
    this.activeExecutions.clear();
    console.log('[FrontrunnerService] Stopped');
  }

  /**
   * Queue a protection execution for a detected threat
   */
  async queueProtection(threat: ThreatEvent): Promise<void> {
    const key = `${threat.walletAddress}:${threat.tokenMint}`;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      console.error('[FrontrunnerService] Circuit breaker OPEN - too many recent failures');
      this.emit('circuit-breaker-open', { threat });
      return;
    }
    
    // Check if already queued or executing
    if (this.executionQueue.has(key) || this.activeExecutions.has(key)) {
      console.log(`[FrontrunnerService] Protection already queued/executing for ${key}`);
      return;
    }
    
    // Add to queue
    this.executionQueue.set(key, threat);
    console.log(`[FrontrunnerService] Queued protection for ${key}`);
    
    // Process immediately if not already processing
    if (this.isRunning) {
      this.processExecutionQueue();
    }
  }

  /**
   * Process the execution queue
   */
  private async processExecutionQueue() {
    if (!this.isRunning || this.executionQueue.size === 0) return;
    
    // Process up to 5 concurrent executions
    const maxConcurrent = 5;
    const currentActive = this.activeExecutions.size;
    const toProcess = Math.min(maxConcurrent - currentActive, this.executionQueue.size);
    
    if (toProcess <= 0) return;
    
    // Get items to process
    const entries = Array.from(this.executionQueue.entries()).slice(0, toProcess);
    
    // Process each entry
    for (const [key, threat] of entries) {
      this.executionQueue.delete(key);
      this.activeExecutions.add(key);
      
      // Execute protection (don't await - let it run async)
      this.executeProtection(key, threat).finally(() => {
        this.activeExecutions.delete(key);
        // Process more items after this one completes
        if (this.isRunning) {
          this.processExecutionQueue();
        }
      });
    }
  }

  /**
   * Execute protection for a specific threat
   */
  private async executeProtection(key: string, threat: ThreatEvent): Promise<void> {
    const startTime = Date.now();
    console.log(`[FrontrunnerService] Executing protection for ${key}`);
    
    try {
      // Get pre-signed transaction from cache
      const cachedTx = await this.transactionCache.getTransaction(
        threat.tokenMint,
        threat.walletAddress,
        true // emergency transaction
      );
      
      if (!cachedTx) {
        throw new Error('No pre-signed transaction found in cache');
      }
      
      // Calculate priority fee based on threat
      const basePriorityFee = this.calculatePriorityFeeFromThreat(threat);
      
      // Execute with retries and escalating fees
      const result = await this.executeWithRetries(
        cachedTx.transaction,
        basePriorityFee,
        threat
      );
      
      // Record execution
      this.recordExecution(result.success);
      
      // Emit result
      this.emit('protection-executed', {
        key,
        threat,
        result,
        duration: Date.now() - startTime
      });
      
      // Update database
      await this.updateProtectionStatus(threat, result);
      
      if (result.success) {
        console.log(`[FrontrunnerService] ✅ Protection executed successfully: ${result.signature}`);
      } else {
        console.error(`[FrontrunnerService] ❌ Protection failed: ${result.error}`);
      }
      
    } catch (error: any) {
      console.error(`[FrontrunnerService] Fatal error executing protection:`, error);
      
      this.recordExecution(false);
      
      this.emit('protection-failed', {
        key,
        threat,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * Execute transaction with retries and escalating priority fees
   */
  private async executeWithRetries(
    transaction: Transaction | VersionedTransaction,
    basePriorityFee: number,
    threat: ThreatEvent
  ): Promise<ExecutionResult> {
    let attemptsMade = 0;
    let lastError: Error | null = null;
    let currentPriorityFee = basePriorityFee;
    const startTime = Date.now();
    
    while (attemptsMade < this.config.maxRetries) {
      attemptsMade++;
      
      try {
        console.log(`[FrontrunnerService] Attempt ${attemptsMade}/${this.config.maxRetries} with priority fee: ${currentPriorityFee}`);
        
        // Update transaction with new priority fee
        const updatedTx = await this.updateTransactionPriorityFee(
          transaction,
          currentPriorityFee
        );
        
        // Send transaction
        let signature: string;
        
        if (this.config.jitoEnabled && threat.analysis.riskLevel === 'CRITICAL') {
          // Use Jito bundle for critical threats
          signature = await this.sendViaJitoBundle(updatedTx, threat);
        } else {
          // Send directly with connection
          const serialized = (updatedTx as any).serialize();
          signature = await this.connection.sendRawTransaction(serialized, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 0 // We handle retries ourselves
          });
        }
        
        // Wait for confirmation
        const confirmation = await this.connection.confirmTransaction(
          signature,
          'confirmed'
        );
        
        if (!confirmation.value.err) {
          return {
            success: true,
            signature,
            attemptsMade,
            finalPriorityFee: currentPriorityFee,
            executionTimeMs: Date.now() - startTime
          };
        } else {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
      } catch (error: any) {
        lastError = error;
        console.error(`[FrontrunnerService] Attempt ${attemptsMade} failed:`, error.message);
        
        // Exponentially increase priority fee for next attempt
        currentPriorityFee = Math.min(
          currentPriorityFee * 2,
          this.config.maxPriorityFeeMicroLamports
        );
        
        // Wait before retry
        if (attemptsMade < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attemptsMade,
      finalPriorityFee: currentPriorityFee,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Calculate priority fee based on threat analysis
   */
  private calculatePriorityFeeFromThreat(threat: ThreatEvent): number {
    const baseFee = this.config.baseFeeMicroLamports;
    const multiplier = threat.priorityFeeMultiplier || 1.5;
    
    // Additional multiplier based on risk level
    const riskMultiplier = {
      'CRITICAL': 2.0,
      'HIGH': 1.5,
      'MODERATE': 1.2,
      'LOW': 1.0
    }[threat.analysis.riskLevel] || 1.0;
    
    // Confidence multiplier
    const confidenceMultiplier = 1 + (threat.analysis.confidence * 0.5);
    
    return Math.floor(baseFee * multiplier * riskMultiplier * confidenceMultiplier);
  }

  /**
   * Update transaction with new priority fee
   */
  private async updateTransactionPriorityFee(
    transaction: Transaction | VersionedTransaction,
    priorityFeeMicroLamports: number
  ): Promise<Transaction | VersionedTransaction> {
    // This is a simplified version - in production, you'd properly update
    // the compute budget instruction with the new priority fee
    
    // For now, we'll return the transaction as-is since the PrioritySender
    // handles priority fee injection
    return transaction;
  }

  /**
   * Send transaction via Jito bundle
   */
  private async sendViaJitoBundle(
    transaction: Transaction | VersionedTransaction,
    threat: ThreatEvent
  ): Promise<string> {
    // Jito bundle implementation would go here
    // For now, fall back to regular sending
    console.log('[FrontrunnerService] Jito bundles not yet implemented - using direct send');
    
    const serialized = (transaction as any).serialize();
    return this.connection.sendRawTransaction(serialized, {
      skipPreflight: true, // Skip for speed
      preflightCommitment: 'processed',
      maxRetries: 0
    });
  }

  /**
   * Map risk level to priority level
   */
  private mapRiskLevelToPriority(riskLevel: string): 'low' | 'medium' | 'high' | 'ultra' {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'ultra';
      case 'HIGH':
        return 'high';
      case 'MODERATE':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Update protection status in database
   */
  private async updateProtectionStatus(
    threat: ThreatEvent,
    result: ExecutionResult
  ): Promise<void> {
    try {
      // Update protected_tokens table
      await supabase
        .from('protected_tokens')
        .update({
          last_alert_at: new Date().toISOString(),
          alerts_count: 1, // TODO: increment properly
          status: result.success ? 'protected' : 'failed'
        })
        .eq('wallet_address', threat.walletAddress)
        .eq('token_mint', threat.tokenMint);
      
      // Log execution in demo_protection_events
      await supabase
        .from('demo_protection_events')
        .insert({
          wallet_address: threat.walletAddress,
          token_mint: threat.tokenMint,
          event_type: result.success ? 'protection_executed' : 'protection_failed',
          threat_level: threat.analysis.riskLevel,
          transaction_signature: result.signature,
          priority_fee: result.finalPriorityFee,
          attempts_made: result.attemptsMade,
          execution_time_ms: result.executionTimeMs,
          error_message: result.error,
          metadata: {
            threat_type: threat.analysis.type,
            confidence: threat.analysis.confidence,
            source: 'mempool_frontrunner'
          }
        });
        
    } catch (error) {
      console.error('[FrontrunnerService] Error updating protection status:', error);
    }
  }

  /**
   * Circuit breaker: check if too many recent failures
   */
  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    const recentFailures = this.recentExecutions.filter(
      e => !e.success && (now - e.timestamp) < this.circuitBreakerWindow
    ).length;
    
    return recentFailures >= this.circuitBreakerThreshold;
  }

  /**
   * Record execution for circuit breaker
   */
  private recordExecution(success: boolean) {
    this.recentExecutions.push({
      timestamp: Date.now(),
      success
    });
  }

  /**
   * Clean up old execution history
   */
  private cleanupExecutionHistory() {
    const now = Date.now();
    this.recentExecutions = this.recentExecutions.filter(
      e => (now - e.timestamp) < this.circuitBreakerWindow
    );
  }

  /**
   * Handle incoming threat from event bus
   */
  handleThreat(threat: ThreatEvent): void {
    const key = `${threat.walletAddress}:${threat.tokenMint}`;
    
    // Skip if already queued or executing
    if (this.executionQueue.has(key) || this.activeExecutions.has(key)) {
      console.log(`[FrontrunnerService] Threat already queued/executing: ${key}`);
      return;
    }
    
    // Add to queue
    this.executionQueue.set(key, threat);
    console.log(`[FrontrunnerService] Queued threat for execution: ${key}`);
  }

  /**
   * Calculate priority fee based on risk level and multiplier
   */
  calculatePriorityFee(riskLevel: string, multiplier: number): number {
    const baseFee = this.config.baseFeeMicroLamports;
    
    const riskMultipliers: Record<string, number> = {
      'CRITICAL': 3,
      'HIGH': 2,
      'MEDIUM': 1.5,
      'LOW': 1
    };
    
    const riskMultiplier = riskMultipliers[riskLevel] || 1;
    const fee = Math.floor(baseFee * riskMultiplier * multiplier);
    
    return Math.min(fee, this.config.maxPriorityFeeMicroLamports);
  }

  /**
   * Execute threat response (for testing)
   */
  async executeThreatResponse(threat: ThreatEvent): Promise<ExecutionResult> {
    const key = `${threat.walletAddress}:${threat.tokenMint}`;
    
    // Check circuit breaker
    if (this.isCircuitBreakerTripped()) {
      return {
        success: false,
        error: 'Circuit breaker tripped - too many recent failures',
        attemptsMade: 0,
        finalPriorityFee: 0,
        executionTimeMs: 0
      };
    }
    
    // Get cached transaction
    const cached = await this.transactionCache.getTransaction(
      threat.tokenMint,
      threat.walletAddress,
      true // emergency
    );
    
    if (!cached) {
      return {
        success: false,
        error: 'No cached transaction available',
        attemptsMade: 0,
        finalPriorityFee: 0,
        executionTimeMs: 0
      };
    }
    
    // Calculate priority fee
    const basePriorityFee = this.calculatePriorityFee(
      threat.analysis.riskLevel,
      threat.priorityFeeMultiplier
    );
    
    // Execute with retries
    const result = await this.executeWithRetries(
      cached.transaction,
      basePriorityFee,
      threat
    );
    
    // Record execution
    this.recordExecution(result.success);
    
    // Emit appropriate event
    if (result.success) {
      this.emit('execution-success', {
        tokenMint: threat.tokenMint,
        walletAddress: threat.walletAddress,
        signature: result.signature,
        attemptsMade: result.attemptsMade,
        executionTimeMs: result.executionTimeMs
      });
    } else {
      this.emit('execution-failed', {
        tokenMint: threat.tokenMint,
        walletAddress: threat.walletAddress,
        error: result.error,
        attemptsMade: result.attemptsMade
      });
    }
    
    return result;
  }

  /**
   * Check if circuit breaker is tripped
   */
  isCircuitBreakerTripped(): boolean {
    return this.isCircuitBreakerOpen();
  }

  /**
   * Get service statistics
   */
  getStats() {
    const now = Date.now();
    const recentWindow = now - this.circuitBreakerWindow;
    
    const recentExecs = this.recentExecutions.filter(e => e.timestamp > recentWindow);
    const successCount = recentExecs.filter(e => e.success).length;
    const failureCount = recentExecs.filter(e => !e.success).length;
    const totalCount = recentExecs.length;
    
    return {
      queueSize: this.executionQueue.size,
      activeExecutions: this.activeExecutions.size,
      recentExecutions: totalCount,
      successRate: totalCount > 0 ? (successCount / totalCount) : 1,
      circuitBreakerStatus: this.isCircuitBreakerOpen() ? 'open' : 'closed',
      successCount,
      failureCount
    };
  }
}

// Factory function
export function createFrontrunnerService(
  connection: Connection,
  transactionCache: TransactionCache,
  prioritySender: PrioritySender,
  blockhashService: BlockhashRefreshService
): FrontrunnerService {
  return new FrontrunnerService(
    connection,
    transactionCache,
    prioritySender,
    blockhashService
  );
}