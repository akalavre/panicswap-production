import { Connection, Transaction, VersionedTransaction, PublicKey, TransactionError } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { PrioritySender } from './PrioritySender';
import { TransactionCache } from './TransactionCache';
import supabase from '../utils/supabaseClient';

interface EmergencyExecutionConfig {
  maxSlippageBps: number; // Basis points (100 = 1%)
  partialFillThreshold: number; // Minimum % to consider successful
  deadlineSeconds: number; // Max time to try execution
  multiRpcEndpoints: string[]; // Backup RPC endpoints
}

interface ExecutionRequest {
  walletAddress: string;
  tokenMint: string;
  amountToSell: bigint;
  minSolOutput: bigint;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

interface ExecutionResult {
  success: boolean;
  signature?: string;
  solReceived?: bigint;
  percentageFilled?: number;
  slippage?: number;
  executionTimeMs: number;
  rpcUsed?: string;
  error?: string;
}

export class EmergencyExecutor extends EventEmitter {
  private primaryConnection: Connection;
  private backupConnections: Connection[] = [];
  private prioritySender: PrioritySender;
  private transactionCache: TransactionCache;
  private config: EmergencyExecutionConfig;
  private activeExecutions: Map<string, boolean> = new Map();

  constructor(
    connection: Connection,
    prioritySender: PrioritySender,
    transactionCache: TransactionCache
  ) {
    super();
    
    this.primaryConnection = connection;
    this.prioritySender = prioritySender;
    this.transactionCache = transactionCache;
    
    this.config = {
      maxSlippageBps: parseInt(process.env.EMERGENCY_MAX_SLIPPAGE_BPS || '500'), // 5% default
      partialFillThreshold: parseFloat(process.env.EMERGENCY_PARTIAL_FILL_THRESHOLD || '0.8'), // 80%
      deadlineSeconds: parseInt(process.env.EMERGENCY_DEADLINE_SECONDS || '30'),
      multiRpcEndpoints: process.env.EMERGENCY_BACKUP_RPCS?.split(',') || []
    };
    
    // Initialize backup connections
    this.initializeBackupConnections();
    
    console.log('[EmergencyExecutor] Initialized with config:', this.config);
  }

  /**
   * Initialize backup RPC connections
   */
  private initializeBackupConnections() {
    for (const endpoint of this.config.multiRpcEndpoints) {
      if (endpoint && endpoint.trim()) {
        this.backupConnections.push(
          new Connection(endpoint.trim(), {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
          })
        );
      }
    }
    
    console.log(`[EmergencyExecutor] Initialized ${this.backupConnections.length} backup RPC connections`);
  }

  /**
   * Execute emergency sell
   */
  async executeSell(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const key = `${request.walletAddress}:${request.tokenMint}`;
    
    // Check if already executing
    if (this.activeExecutions.get(key)) {
      return {
        success: false,
        error: 'Execution already in progress',
        executionTimeMs: 0
      };
    }
    
    this.activeExecutions.set(key, true);
    
    try {
      console.log(`[EmergencyExecutor] Starting emergency sell for ${key}`);
      console.log(`- Amount: ${request.amountToSell}`);
      console.log(`- Min SOL: ${request.minSolOutput}`);
      console.log(`- Urgency: ${request.urgencyLevel}`);
      
      // Get pre-signed transaction
      const cachedTx = await this.transactionCache.getTransaction(
        request.tokenMint,
        request.walletAddress,
        true // emergency
      );
      
      if (!cachedTx) {
        throw new Error('No pre-signed transaction available');
      }
      
      // Validate slippage
      const validatedTx = await this.validateAndAdjustSlippage(
        cachedTx.transaction,
        request
      );
      
      // Try execution with multiple strategies
      const result = await this.executeWithStrategies(validatedTx, request);
      
      // Log result
      await this.logExecution(request, result);
      
      return result;
      
    } catch (error: any) {
      console.error(`[EmergencyExecutor] Fatal error:`, error);
      
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
      
    } finally {
      this.activeExecutions.delete(key);
    }
  }

  /**
   * Validate and adjust slippage if needed
   */
  private async validateAndAdjustSlippage(
    transaction: Transaction | VersionedTransaction,
    request: ExecutionRequest
  ): Promise<Transaction | VersionedTransaction> {
    // In a real implementation, we would:
    // 1. Decode the swap instruction
    // 2. Check the minimum output amount
    // 3. Adjust if within acceptable slippage
    // 4. Reject if slippage too high
    
    // For now, return as-is
    return transaction;
  }

  /**
   * Execute with multiple strategies
   */
  private async executeWithStrategies(
    transaction: Transaction | VersionedTransaction,
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const deadline = Date.now() + (this.config.deadlineSeconds * 1000);
    const strategies = this.getExecutionStrategies(request.urgencyLevel);
    
    for (const strategy of strategies) {
      if (Date.now() > deadline) {
        console.log('[EmergencyExecutor] Deadline exceeded');
        break;
      }
      
      try {
        console.log(`[EmergencyExecutor] Trying strategy: ${strategy.name}`);
        
        const result = await this.executeStrategy(
          transaction,
          request,
          strategy
        );
        
        if (result.success) {
          return result;
        }
        
        // Check if partial fill is acceptable
        if (result.percentageFilled && 
            result.percentageFilled >= this.config.partialFillThreshold) {
          console.log(`[EmergencyExecutor] Accepting partial fill: ${result.percentageFilled}%`);
          return { ...result, success: true };
        }
        
      } catch (error: any) {
        console.error(`[EmergencyExecutor] Strategy ${strategy.name} failed:`, error.message);
        continue;
      }
    }
    
    // All strategies failed
    return {
      success: false,
      error: 'All execution strategies failed',
      executionTimeMs: Date.now() - (deadline - this.config.deadlineSeconds * 1000)
    };
  }

  /**
   * Execute a specific strategy
   */
  private async executeStrategy(
    transaction: Transaction | VersionedTransaction,
    request: ExecutionRequest,
    strategy: ExecutionStrategy
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Select connection
      const connection = strategy.useBackupRpc && this.backupConnections.length > 0
        ? this.backupConnections[Math.floor(Math.random() * this.backupConnections.length)]
        : this.primaryConnection;
      
      // Send transaction
      const signature = await this.sendWithStrategy(
        transaction,
        connection,
        strategy
      );
      
      // Wait for confirmation with timeout
      const confirmation = await this.waitForConfirmationWithTimeout(
        signature,
        connection,
        Math.min(strategy.confirmationTimeout, this.config.deadlineSeconds * 1000)
      );
      
      if (confirmation && !confirmation.err) {
        // Get transaction details to calculate actual output
        const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
        const result = this.parseTransactionResult(txDetails, request);
        
        return {
          success: true,
          signature,
          solReceived: result.solReceived,
          percentageFilled: result.percentageFilled,
          slippage: result.slippage,
          executionTimeMs: Date.now() - startTime,
          rpcUsed: connection.rpcEndpoint
        };
      } else {
        throw new Error(`Transaction failed: ${confirmation?.err || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Send transaction with specific strategy
   */
  private async sendWithStrategy(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    strategy: ExecutionStrategy
  ): Promise<string> {
    // Always use direct send since transactions are pre-signed
    const serialized = (transaction as any).serialize();
    return connection.sendRawTransaction(serialized, {
      skipPreflight: strategy.skipPreflight || false,
      preflightCommitment: 'confirmed',
      maxRetries: strategy.maxRetries || 3
    });
  }

  /**
   * Wait for confirmation with timeout
   */
  private async waitForConfirmationWithTimeout(
    signature: string,
    connection: Connection,
    timeoutMs: number
  ): Promise<{ err: TransactionError | null } | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status.value !== null) {
          return { err: status.value.err };
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        // Continue trying
      }
    }
    
    return null; // Timeout
  }

  /**
   * Parse transaction result to get actual output
   */
  private parseTransactionResult(
    txDetails: any,
    request: ExecutionRequest
  ): { solReceived: bigint; percentageFilled: number; slippage: number } {
    // This would parse the actual transaction to determine:
    // 1. How much SOL was received
    // 2. What percentage of tokens were sold
    // 3. Actual slippage vs expected
    
    // For now, return placeholder values
    return {
      solReceived: request.minSolOutput,
      percentageFilled: 100,
      slippage: 0
    };
  }

  /**
   * Get execution strategies based on urgency
   */
  private getExecutionStrategies(urgencyLevel: string): ExecutionStrategy[] {
    const baseStrategies: ExecutionStrategy[] = [
      {
        name: 'priority-sender',
        priorityLevel: 'ultra',
        confirmationTimeout: 5000,
        maxRetries: 3,
        skipPreflight: false,
        useBackupRpc: false
      }
    ];
    
    if (urgencyLevel === 'critical') {
      // Add more aggressive strategies
      return [
        ...baseStrategies,
        {
          name: 'multi-rpc-broadcast',
          priorityLevel: 'ultra',
          confirmationTimeout: 3000,
          maxRetries: 1,
          skipPreflight: true,
          useBackupRpc: true
        },
        {
          name: 'skip-preflight-direct',
          priorityLevel: 'ultra',
          confirmationTimeout: 2000,
          maxRetries: 1,
          skipPreflight: true,
          useBackupRpc: false
        }
      ];
    }
    
    return baseStrategies;
  }

  /**
   * Log execution to database
   */
  private async logExecution(
    request: ExecutionRequest,
    result: ExecutionResult
  ): Promise<void> {
    try {
      await supabase
        .from('emergency_executions')
        .insert({
          wallet_address: request.walletAddress,
          token_mint: request.tokenMint,
          amount_to_sell: request.amountToSell.toString(),
          min_sol_output: request.minSolOutput.toString(),
          urgency_level: request.urgencyLevel,
          reason: request.reason,
          success: result.success,
          signature: result.signature,
          sol_received: result.solReceived?.toString(),
          percentage_filled: result.percentageFilled,
          slippage: result.slippage,
          execution_time_ms: result.executionTimeMs,
          rpc_used: result.rpcUsed,
          error: result.error,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('[EmergencyExecutor] Error logging execution:', error);
    }
  }
}

interface ExecutionStrategy {
  name: string;
  priorityLevel?: 'low' | 'medium' | 'high' | 'ultra';
  confirmationTimeout: number;
  maxRetries: number;
  skipPreflight: boolean;
  useBackupRpc: boolean;
}

// Factory function
export function createEmergencyExecutor(
  connection: Connection,
  prioritySender: PrioritySender,
  transactionCache: TransactionCache
): EmergencyExecutor {
  return new EmergencyExecutor(connection, prioritySender, transactionCache);
}