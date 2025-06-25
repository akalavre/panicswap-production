/**
 * BatchProcessor - Efficient batch processing for blockchain operations
 * Reduces RPC calls by batching similar operations
 */

import { EventEmitter } from 'events';
import { PublicKey } from '@solana/web3.js';
import { connectionPool } from '../services/ConnectionPool';

interface BatchOperation<T> {
  id: string;
  type: 'getTransaction' | 'getAccountInfo' | 'getMultipleAccounts' | 'getSignatures';
  params: any;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority?: 'high' | 'normal' | 'low';
}

interface BatchConfig {
  batchSize: number;
  flushInterval: number;
  maxWaitTime: number;
  concurrency: number;
}

export class BatchProcessor extends EventEmitter {
  private queues: Map<string, BatchOperation<any>[]> = new Map();
  private flushTimer?: NodeJS.Timeout;
  private processing: boolean = false;
  
  private stats = {
    totalBatches: 0,
    totalOperations: 0,
    savedRpcCalls: 0,
    avgBatchSize: 0
  };
  
  private readonly config: BatchConfig = {
    batchSize: 100,
    flushInterval: 50, // 50ms
    maxWaitTime: 200, // 200ms max wait
    concurrency: 5
  };
  
  constructor(config?: Partial<BatchConfig>) {
    super();
    
    if (config) {
      Object.assign(this.config, config);
    }
    
    // Start flush timer
    this.startFlushTimer();
    
    console.log('[BatchProcessor] Initialized with config:', this.config);
  }
  
  /**
   * Add operation to batch queue
   */
  async add<T>(
    type: BatchOperation<T>['type'],
    params: any,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operation: BatchOperation<T> = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        params,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };
      
      // Get or create queue for this operation type
      if (!this.queues.has(type)) {
        this.queues.set(type, []);
      }
      
      const queue = this.queues.get(type)!;
      
      // Insert by priority
      if (priority === 'high') {
        queue.unshift(operation);
      } else {
        queue.push(operation);
      }
      
      this.stats.totalOperations++;
      
      // Check if we should flush immediately
      if (queue.length >= this.config.batchSize || 
          (priority === 'high' && queue.length > 0)) {
        this.flushQueue(type);
      }
      
      // Check max wait time
      const oldestOperation = queue[queue.length - 1];
      if (Date.now() - oldestOperation.timestamp > this.config.maxWaitTime) {
        this.flushQueue(type);
      }
    });
  }
  
  /**
   * Get multiple transactions in batch
   */
  async getTransactions(signatures: string[]): Promise<any[]> {
    const promises = signatures.map(sig => 
      this.add('getTransaction', { signature: sig })
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Get multiple accounts in batch
   */
  async getMultipleAccounts(pubkeys: PublicKey[]): Promise<any[]> {
    // Solana supports getMultipleAccounts natively
    if (pubkeys.length <= 100) {
      return this.add('getMultipleAccounts', { pubkeys });
    }
    
    // Split into chunks for large requests
    const chunks = [];
    for (let i = 0; i < pubkeys.length; i += 100) {
      chunks.push(pubkeys.slice(i, i + 100));
    }
    
    const results = await Promise.all(
      chunks.map(chunk => this.add('getMultipleAccounts', { pubkeys: chunk }))
    );
    
    return results.flat();
  }
  
  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushAllQueues();
    }, this.config.flushInterval);
  }
  
  /**
   * Flush all queues
   */
  private async flushAllQueues(): Promise<void> {
    if (this.processing) return;
    
    const queuesToFlush = Array.from(this.queues.entries())
      .filter(([_, queue]) => queue.length > 0);
    
    if (queuesToFlush.length === 0) return;
    
    this.processing = true;
    
    try {
      await Promise.all(
        queuesToFlush.map(([type, _]) => this.flushQueue(type))
      );
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Flush a specific queue
   */
  private async flushQueue(type: string): Promise<void> {
    const queue = this.queues.get(type);
    if (!queue || queue.length === 0) return;
    
    // Take operations up to batch size
    const batch = queue.splice(0, this.config.batchSize);
    if (batch.length === 0) return;
    
    this.stats.totalBatches++;
    this.stats.avgBatchSize = 
      (this.stats.avgBatchSize * (this.stats.totalBatches - 1) + batch.length) / 
      this.stats.totalBatches;
    
    try {
      switch (type) {
        case 'getTransaction':
          await this.processBatchTransactions(batch);
          break;
          
        case 'getMultipleAccounts':
          await this.processBatchAccounts(batch);
          break;
          
        case 'getSignatures':
          await this.processBatchSignatures(batch);
          break;
          
        default:
          // Process individually for unknown types
          await this.processIndividually(batch);
      }
      
      // Calculate saved RPC calls
      if (batch.length > 1) {
        this.stats.savedRpcCalls += batch.length - 1;
      }
      
    } catch (error) {
      // Reject all operations in batch
      batch.forEach(op => op.reject(error as Error));
    }
  }
  
  /**
   * Process batch transactions
   */
  private async processBatchTransactions(
    batch: BatchOperation<any>[]
  ): Promise<void> {
    // Solana doesn't have native batch transaction fetching
    // Process with concurrency control
    const chunks = [];
    for (let i = 0; i < batch.length; i += this.config.concurrency) {
      chunks.push(batch.slice(i, i + this.config.concurrency));
    }
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (op) => {
          try {
            const result = await connectionPool.execute(
              conn => conn.getParsedTransaction(op.params.signature, {
                maxSupportedTransactionVersion: 0
              })
            );
            op.resolve(result);
          } catch (error) {
            op.reject(error as Error);
          }
        })
      );
    }
  }
  
  /**
   * Process batch accounts
   */
  private async processBatchAccounts(
    batch: BatchOperation<any>[]
  ): Promise<void> {
    // Combine all pubkeys
    const allPubkeys: PublicKey[] = [];
    const opMap = new Map<string, BatchOperation<any>[]>();
    
    for (const op of batch) {
      const pubkeys = op.params.pubkeys as PublicKey[];
      for (const pubkey of pubkeys) {
        const key = pubkey.toString();
        if (!opMap.has(key)) {
          opMap.set(key, []);
          allPubkeys.push(pubkey);
        }
        opMap.get(key)!.push(op);
      }
    }
    
    // Fetch all accounts in one call (up to 100)
    try {
      const results = await connectionPool.execute(
        conn => conn.getMultipleAccountsInfo(allPubkeys.slice(0, 100))
      );
      
      // Distribute results
      results.forEach((result, index) => {
        const pubkey = allPubkeys[index].toString();
        const ops = opMap.get(pubkey) || [];
        ops.forEach(op => {
          // Find the result index for this operation
          const opIndex = op.params.pubkeys.findIndex(
            (pk: PublicKey) => pk.toString() === pubkey
          );
          if (!op.params.results) {
            op.params.results = new Array(op.params.pubkeys.length);
          }
          op.params.results[opIndex] = result;
          
          // Check if all results are ready
          if (op.params.results.filter(Boolean).length === op.params.pubkeys.length) {
            op.resolve(op.params.results);
          }
        });
      });
      
    } catch (error) {
      batch.forEach(op => op.reject(error as Error));
    }
  }
  
  /**
   * Process batch signatures
   */
  private async processBatchSignatures(
    batch: BatchOperation<any>[]
  ): Promise<void> {
    // Process signatures with concurrency control
    const chunks = [];
    for (let i = 0; i < batch.length; i += this.config.concurrency) {
      chunks.push(batch.slice(i, i + this.config.concurrency));
    }
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (op) => {
          try {
            const result = await connectionPool.execute(
              conn => conn.getSignaturesForAddress(
                new PublicKey(op.params.address),
                op.params.options
              )
            );
            op.resolve(result);
          } catch (error) {
            op.reject(error as Error);
          }
        })
      );
    }
  }
  
  /**
   * Process operations individually
   */
  private async processIndividually(
    batch: BatchOperation<any>[]
  ): Promise<void> {
    await Promise.all(
      batch.map(async (op) => {
        try {
          // Execute operation based on type
          const result = await connectionPool.execute(async (conn) => {
            switch (op.type) {
              case 'getAccountInfo':
                return conn.getAccountInfo(new PublicKey(op.params.pubkey));
              default:
                throw new Error(`Unknown operation type: ${op.type}`);
            }
          });
          op.resolve(result);
        } catch (error) {
          op.reject(error as Error);
        }
      })
    );
  }
  
  /**
   * Get batch processor statistics
   */
  getStats(): typeof BatchProcessor.prototype.stats & {
    queueSizes: Record<string, number>;
    efficiency: number;
  } {
    const queueSizes: Record<string, number> = {};
    this.queues.forEach((queue, type) => {
      queueSizes[type] = queue.length;
    });
    
    const efficiency = this.stats.totalOperations > 0
      ? this.stats.savedRpcCalls / this.stats.totalOperations
      : 0;
    
    return {
      ...this.stats,
      queueSizes,
      efficiency
    };
  }
  
  /**
   * Shutdown batch processor
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Reject all pending operations
    this.queues.forEach(queue => {
      queue.forEach(op => {
        op.reject(new Error('BatchProcessor shutting down'));
      });
    });
    
    this.queues.clear();
    this.removeAllListeners();
    
    console.log('[BatchProcessor] Shutdown complete. Stats:', this.getStats());
  }
}

// Export singleton instance
export const batchProcessor = new BatchProcessor({
  batchSize: 100,
  flushInterval: 50,
  maxWaitTime: 200,
  concurrency: 5
});