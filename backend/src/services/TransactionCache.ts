import { VersionedTransaction } from '@solana/web3.js';
import { LRUCache } from 'lru-cache';
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
  metadata?: any; // Additional metadata for compatibility
}

export interface TransactionTemplate {
  tokenMint: string;
  walletAddress: string;
  tokenAmount: number;
  outputMint: string;
  slippageBps: number;
}

export class TransactionCache {
  private cache: LRUCache<string, CachedTransaction>;
  private readonly TTL = 300; // 5 minutes default TTL
  private readonly EMERGENCY_TTL = 60; // 1 minute for emergency transactions
  private readonly TEMPLATE_TTL = 3600; // 1 hour for templates

  constructor() {
    // Initialize LRU cache only
    this.cache = new LRUCache({
      max: 1000,
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: this.TTL * 1000 // Convert to milliseconds
    });
    
    console.log('[TransactionCache] ✅ Initialized with LRU cache (no Redis)');
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
        expiresAt: Date.now() + (ttl * 1000),
        metadata: metadata
      };

      // Store in LRU cache with TTL
      this.cache.set(key, cached, { ttl: ttl * 1000 });
      
      console.log(`[TransactionCache] Stored ${isEmergency ? 'emergency' : 'regular'} transaction for ${template.tokenMint}`);
    } catch (error) {
      console.error('[TransactionCache] Error storing transaction:', error);
    }
  }

  /**
   * Get cached transaction
   */
  async getTransaction(
    tokenMint: string,
    walletAddress: string,
    isEmergency: boolean = false
  ): Promise<CachedTransaction | null> {
    try {
      const key = this.getCacheKey(tokenMint, walletAddress, isEmergency ? 'emergency' : 'swap');
      
      const cached = this.cache.get(key);
      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt < Date.now()) {
        this.cache.delete(key);
        return null;
      }

      console.log(`[TransactionCache] Cache hit for ${tokenMint}`);
      return cached;
    } catch (error) {
      console.error('[TransactionCache] Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Store priority fee variants of a transaction
   */
  async storePriorityVariants(
    template: TransactionTemplate,
    variants: Array<{
      transaction: VersionedTransaction;
      priorityFee: number;
      metadata: any;
    }>
  ): Promise<void> {
    console.log(`[TransactionCache] Storing ${variants.length} priority variants for ${template.tokenMint}`);
    
    // Store each variant with a unique key
    for (const [index, variant] of variants.entries()) {
      const key = `${this.getCacheKey(template.tokenMint, template.walletAddress)}:priority:${index}`;
      
      const cached: CachedTransaction = {
        transaction: Buffer.from(variant.transaction.serialize()).toString('base64'),
        route: variant.metadata.route || [],
        estimatedOutput: variant.metadata.estimatedOutput || 0,
        priceImpact: variant.metadata.priceImpact || 0,
        slippage: template.slippageBps,
        priorityFee: variant.priorityFee,
        computeUnits: variant.metadata.computeUnits || 0,
        presigned: variant.metadata.presigned,
        blockhash: variant.metadata.blockhash,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.TTL * 1000),
        metadata: variant.metadata
      };
      
      this.cache.set(key, cached, { ttl: this.TTL * 1000 });
    }
  }

  /**
   * Pre-compute transactions for a wallet
   */
  async precomputeForWallet(walletAddress: string, tokens: string[]): Promise<void> {
    console.log(`[TransactionCache] Pre-computing transactions for ${tokens.length} tokens`);
    
    // Implementation would go here - for now just log
    // This would involve calling Jupiter API to pre-compute swap routes
  }

  /**
   * Invalidate transactions for a token
   */
  async invalidateToken(tokenMint: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    // Find all keys that contain this token
    for (const key of this.cache.keys()) {
      if (key.includes(tokenMint)) {
        keysToDelete.push(key);
      }
    }

    // Delete all matching keys
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    console.log(`[TransactionCache] Invalidated ${keysToDelete.length} transactions for ${tokenMint}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    itemCount: number;
    hitRate: number;
  } {
    const stats = this.cache;
    return {
      size: stats.calculatedSize || 0,
      itemCount: stats.size,
      hitRate: 0 // LRU cache doesn't track hit rate by default
    };
  }

  /**
   * Clear all cached transactions
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    console.log('[TransactionCache] Cleared all cached transactions');
  }
}

// Singleton instance
export const transactionCache = new TransactionCache();