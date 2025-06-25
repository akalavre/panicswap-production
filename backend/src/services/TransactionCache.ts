import { VersionedTransaction } from '@solana/web3.js';
import { LRUCache } from 'lru-cache';
import { executeRedisCommand, getRedisHealth } from '../utils/upstashClient';
import config from '../config';

export interface CachedTransaction {
  transaction: string; // base64 encoded
  route: string[];
  estimatedOutput: number;
  priceImpact: number;
  slippage: number;
  priorityFee: number;
  computeUnits: number;
  presigned?: boolean;
  blockhash?: string;
  createdAt: number;
  expiresAt: number;
}

export interface TransactionTemplate {
  tokenMint: string;
  walletAddress: string;
  tokenAmount: number;
  outputMint: string;
  slippageBps: number;
}

export class TransactionCache {
  private fallbackCache!: LRUCache<string, string>;
  private readonly TTL = 300; // 5 minutes default TTL
  private readonly EMERGENCY_TTL = 60; // 1 minute for emergency txs
  private cacheMode: 'redis' | 'memory' = 'redis';
  
  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    // Always initialize fallback cache
    this.fallbackCache = new LRUCache<string, string>({
      max: 1000,
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => value.length,
      ttl: this.TTL * 1000 // Convert to milliseconds
    });
    
    console.log('[TransactionCache] ✅ Initialized with Redis wrapper and LRU fallback');
  }

  /**
   * Generate cache key for a transaction
   */
  private getCacheKey(tokenMint: string, walletAddress: string, type: 'swap' | 'emergency' = 'swap'): string {
    return `tx:${type}:${tokenMint}:${walletAddress}`;
  }

  /**
   * Store pre-computed transaction
   */
  async storeTransaction(
    template: TransactionTemplate,
    transaction: VersionedTransaction,
    metadata: {
      route: string[];
      estimatedOutput: number;
      priceImpact: number;
      priorityFee: number;
      computeUnits: number;
      presigned?: boolean;
      blockhash?: string;
    },
    isEmergency: boolean = false
  ): Promise<void> {
    try {
      const key = this.getCacheKey(template.tokenMint, template.walletAddress, isEmergency ? 'emergency' : 'swap');
      const ttl = isEmergency ? this.EMERGENCY_TTL : this.TTL;
      
      const cached: CachedTransaction = {
        transaction: Buffer.from(transaction.serialize()).toString('base64'),
        route: metadata.route,
        estimatedOutput: metadata.estimatedOutput,
        priceImpact: metadata.priceImpact,
        slippage: template.slippageBps,
        priorityFee: metadata.priorityFee,
        computeUnits: metadata.computeUnits,
        presigned: metadata.presigned,
        blockhash: metadata.blockhash,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000)
      };

      const value = JSON.stringify(cached);
      
      // Try Redis first with fallback to LRU
      await executeRedisCommand(
        async (redis) => {
          await redis.setex(key, ttl, value);
          
          // Also store in a set for tracking
          await redis.sadd(`tokens:${template.walletAddress}`, template.tokenMint);
          await redis.expire(`tokens:${template.walletAddress}`, 3600); // 1 hour
          
          this.cacheMode = 'redis';
        },
        async () => {
          // Fallback to LRU cache
          this.fallbackCache.set(key, value, { ttl: ttl * 1000 });
          
          // Track tokens in fallback cache
          const tokensKey = `tokens:${template.walletAddress}`;
          const existingTokens = this.fallbackCache.get(tokensKey);
          const tokens = existingTokens ? JSON.parse(existingTokens) : [];
          if (!tokens.includes(template.tokenMint)) {
            tokens.push(template.tokenMint);
            this.fallbackCache.set(tokensKey, JSON.stringify(tokens), { ttl: 3600 * 1000 });
          }
          
          this.cacheMode = 'memory';
        }
      );
      
      console.log(`[TransactionCache] Stored ${isEmergency ? 'emergency' : 'swap'} transaction for ${template.tokenMint} (mode: ${this.cacheMode})`);
    } catch (error) {
      console.error('[TransactionCache] Error storing transaction:', error);
    }
  }

  /**
   * Retrieve pre-computed transaction
   */
  async getTransaction(
    tokenMint: string,
    walletAddress: string,
    isEmergency: boolean = false
  ): Promise<{ transaction: VersionedTransaction; metadata: CachedTransaction } | null> {
    try {
      const key = this.getCacheKey(tokenMint, walletAddress, isEmergency ? 'emergency' : 'swap');
      
      const cached = await executeRedisCommand(
        async (redis) => {
          const value = await redis.get(key);
          this.cacheMode = 'redis';
          return value;
        },
        async () => {
          this.cacheMode = 'memory';
          return this.fallbackCache.get(key) || null;
        }
      );
      
      if (!cached) {
        return null;
      }

      const data: CachedTransaction = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > data.expiresAt) {
        // Clean up expired data
        await executeRedisCommand(
          async (redis) => { await redis.del(key); },
          async () => { this.fallbackCache.delete(key); }
        );
        return null;
      }

      // Deserialize transaction
      const txBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      return {
        transaction,
        metadata: data
      };
    } catch (error) {
      console.error('[TransactionCache] Error retrieving transaction:', error);
      return null;
    }
  }

  /**
   * Store multiple transactions for different priority levels
   */
  async storePriorityVariants(
    template: TransactionTemplate,
    variants: Array<{
      transaction: VersionedTransaction;
      priorityFee: number;
      metadata: any;
    }>
  ): Promise<void> {
    try {
      await executeRedisCommand(
        async (redis) => {
          const pipeline = redis.pipeline();
          
          for (const variant of variants) {
            const key = `${this.getCacheKey(template.tokenMint, template.walletAddress)}:${variant.priorityFee}`;
            
            const cached = {
              transaction: Buffer.from(variant.transaction.serialize()).toString('base64'),
              ...variant.metadata,
              priorityFee: variant.priorityFee,
              createdAt: Date.now(),
              expiresAt: Date.now() + (this.EMERGENCY_TTL * 1000)
            };
            
            pipeline.setex(key, this.EMERGENCY_TTL, JSON.stringify(cached));
          }
          
          // Store available priority levels
          const levelsKey = `${this.getCacheKey(template.tokenMint, template.walletAddress)}:levels`;
          pipeline.setex(
            levelsKey, 
            this.EMERGENCY_TTL, 
            JSON.stringify(variants.map(v => v.priorityFee))
          );
          
          await pipeline.exec();
        },
        async () => {
          // Store each variant in the fallback cache
          for (const variant of variants) {
            const key = `${this.getCacheKey(template.tokenMint, template.walletAddress)}:${variant.priorityFee}`;
            
            const cached = {
              transaction: Buffer.from(variant.transaction.serialize()).toString('base64'),
              ...variant.metadata,
              priorityFee: variant.priorityFee,
              createdAt: Date.now(),
              expiresAt: Date.now() + (this.EMERGENCY_TTL * 1000)
            };
            
            this.fallbackCache.set(key, JSON.stringify(cached), { ttl: this.EMERGENCY_TTL * 1000 });
          }
          
          // Store available priority levels
          const levelsKey = `${this.getCacheKey(template.tokenMint, template.walletAddress)}:levels`;
          this.fallbackCache.set(
            levelsKey,
            JSON.stringify(variants.map(v => v.priorityFee)),
            { ttl: this.EMERGENCY_TTL * 1000 }
          );
        }
      );
      
      console.log(`[TransactionCache] Stored ${variants.length} priority variants for ${template.tokenMint}`);
    } catch (error) {
      console.error('[TransactionCache] Error storing priority variants:', error);
    }
  }

  /**
   * Get all priority variants for a token
   */
  async getPriorityVariants(
    tokenMint: string,
    walletAddress: string
  ): Promise<Array<{ transaction: VersionedTransaction; priorityFee: number }>> {
    try {
      const levelsKey = `${this.getCacheKey(tokenMint, walletAddress)}:levels`;
      
      const levelsData = await executeRedisCommand(
        async (redis) => redis.get(levelsKey),
        async () => this.fallbackCache.get(levelsKey) || null
      );
      
      if (!levelsData) {
        return [];
      }
      
      const levels: number[] = JSON.parse(levelsData);
      const variants = [];
      
      for (const level of levels) {
        const key = `${this.getCacheKey(tokenMint, walletAddress)}:${level}`;
        
        const cached = await executeRedisCommand(
          async (redis) => redis.get(key),
          async () => this.fallbackCache.get(key) || null
        );
        
        if (cached) {
          const data = JSON.parse(cached);
          const transaction = VersionedTransaction.deserialize(
            Buffer.from(data.transaction, 'base64')
          );
          
          variants.push({
            transaction,
            priorityFee: level
          });
        }
      }
      
      return variants;
    } catch (error) {
      console.error('[TransactionCache] Error getting priority variants:', error);
      return [];
    }
  }

  /**
   * Invalidate cached transactions for a token
   */
  async invalidateToken(tokenMint: string, walletAddress?: string): Promise<void> {
    try {
      await executeRedisCommand(
        async (redis) => {
          if (walletAddress) {
            // Invalidate specific wallet's transactions
            const pattern = `tx:*:${tokenMint}:${walletAddress}*`;
            const keys = await redis.keys(pattern);
            
            if (keys.length > 0) {
              await redis.del(...keys);
              console.log(`[TransactionCache] Invalidated ${keys.length} transactions for ${tokenMint}`);
            }
          } else {
            // Invalidate all transactions for this token
            const pattern = `tx:*:${tokenMint}:*`;
            const keys = await redis.keys(pattern);
            
            if (keys.length > 0) {
              await redis.del(...keys);
              console.log(`[TransactionCache] Invalidated all ${keys.length} transactions for ${tokenMint}`);
            }
          }
        },
        async () => {
          // For LRU cache, we need to iterate through keys
          const keysToDelete: string[] = [];
          
          if (walletAddress) {
            const pattern = `tx:*:${tokenMint}:${walletAddress}`;
            for (const key of this.fallbackCache.keys()) {
              if (key.includes(tokenMint) && key.includes(walletAddress)) {
                keysToDelete.push(key);
              }
            }
          } else {
            for (const key of this.fallbackCache.keys()) {
              if (key.includes(tokenMint)) {
                keysToDelete.push(key);
              }
            }
          }
          
          keysToDelete.forEach(key => this.fallbackCache!.delete(key));
          
          if (keysToDelete.length > 0) {
            console.log(`[TransactionCache] Invalidated ${keysToDelete.length} transactions for ${tokenMint}`);
          }
        }
      );
    } catch (error) {
      console.error('[TransactionCache] Error invalidating token:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalCached: number;
    byType: { swap: number; emergency: number };
    memoryUsage: string;
  }> {
    try {
      return await executeRedisCommand(
        async (redis) => {
          const swapKeys = await redis.keys('tx:swap:*');
          const emergencyKeys = await redis.keys('tx:emergency:*');
          
          const info = await redis.info('memory');
          const memoryMatch = info.match(/used_memory_human:(.+)\r?\n/);
          const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
          
          return {
            totalCached: swapKeys.length + emergencyKeys.length,
            byType: {
              swap: swapKeys.length,
              emergency: emergencyKeys.length
            },
            memoryUsage
          };
        },
        async () => {
          let swapCount = 0;
          let emergencyCount = 0;
          
          for (const key of this.fallbackCache.keys()) {
            if (key.startsWith('tx:swap:')) swapCount++;
            else if (key.startsWith('tx:emergency:')) emergencyCount++;
          }
          
          const size = this.fallbackCache.calculatedSize || 0;
          const memoryUsage = `${(size / 1024 / 1024).toFixed(2)}MB`;
          
          return {
            totalCached: swapCount + emergencyCount,
            byType: {
              swap: swapCount,
              emergency: emergencyCount
            },
            memoryUsage
          };
        }
      );
    } catch (error) {
      console.error('[TransactionCache] Error getting stats:', error);
      return {
        totalCached: 0,
        byType: { swap: 0, emergency: 0 },
        memoryUsage: 'unknown'
      };
    }
  }

  /**
   * Clear all cached transactions
   */
  async clearAll(): Promise<void> {
    try {
      await executeRedisCommand(
        async (redis) => {
          const keys = await redis.keys('tx:*');
          if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`[TransactionCache] Cleared ${keys.length} cached transactions`);
          }
        },
        async () => {
          const count = this.fallbackCache.size;
          this.fallbackCache.clear();
          console.log(`[TransactionCache] Cleared ${count} cached transactions`);
        }
      );
    } catch (error) {
      console.error('[TransactionCache] Error clearing cache:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    // Connection is managed by the Redis wrapper
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    const health = await getRedisHealth();
    return health.connected || this.fallbackCache.size > 0;
  }
  
  /**
   * Get cache mode
   */
  getCacheMode(): 'redis' | 'memory' {
    return this.cacheMode;
  }
}

// Export singleton instance
export const transactionCache = new TransactionCache();