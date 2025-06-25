/**
 * TransactionCacheService - Caches parsed transactions to reduce RPC calls
 * Uses LRU cache with TTL for efficient memory management
 */

import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { LRUCache } from 'lru-cache';
import { EventEmitter } from 'events';

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    evictions: number;
}

interface CachedTransaction {
    transaction: ParsedTransactionWithMeta;
    timestamp: number;
    accessCount: number;
}

export class TransactionCacheService extends EventEmitter {
    private cache: LRUCache<string, CachedTransaction>;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        size: 0,
        evictions: 0
    };
    
    constructor(
        private maxSize: number = 10000,
        private ttlMs: number = 5 * 60 * 1000 // 5 minutes default
    ) {
        super();
        
        this.cache = new LRUCache<string, CachedTransaction>({
            max: maxSize,
            ttl: ttlMs,
            updateAgeOnGet: true,
            dispose: (value, key) => {
                this.stats.evictions++;
                this.emit('eviction', key, value);
            }
        });
        
        console.log(`[TransactionCache] Initialized with maxSize=${maxSize}, ttl=${ttlMs}ms`);
    }
    
    /**
     * Get a transaction from cache
     */
    get(signature: string): ParsedTransactionWithMeta | null {
        const cached = this.cache.get(signature);
        
        if (cached) {
            this.stats.hits++;
            cached.accessCount++;
            this.emit('hit', signature);
            return cached.transaction;
        }
        
        this.stats.misses++;
        this.emit('miss', signature);
        return null;
    }
    
    /**
     * Set a transaction in cache
     */
    set(signature: string, transaction: ParsedTransactionWithMeta): void {
        const cached: CachedTransaction = {
            transaction,
            timestamp: Date.now(),
            accessCount: 0
        };
        
        this.cache.set(signature, cached);
        this.stats.size = this.cache.size;
        this.emit('set', signature);
    }
    
    /**
     * Check if a transaction exists in cache
     */
    has(signature: string): boolean {
        return this.cache.has(signature);
    }
    
    /**
     * Delete a transaction from cache
     */
    delete(signature: string): boolean {
        const result = this.cache.delete(signature);
        this.stats.size = this.cache.size;
        return result;
    }
    
    /**
     * Clear all cached transactions
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
        this.emit('clear');
    }
    
    /**
     * Get cache statistics
     */
    getStats(): CacheStats & {
        hitRate: number;
        maxSize: number;
        ttlMs: number;
    } {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
        
        return {
            ...this.stats,
            hitRate,
            maxSize: this.maxSize,
            ttlMs: this.ttlMs
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            size: this.cache.size,
            evictions: 0
        };
    }
    
    /**
     * Get most accessed transactions
     */
    getMostAccessed(limit: number = 10): Array<{
        signature: string;
        accessCount: number;
        timestamp: number;
    }> {
        const entries: Array<{
            signature: string;
            accessCount: number;
            timestamp: number;
        }> = [];
        
        for (const [signature, cached] of this.cache.entries()) {
            entries.push({
                signature,
                accessCount: cached.accessCount,
                timestamp: cached.timestamp
            });
        }
        
        // Sort by access count descending
        entries.sort((a, b) => b.accessCount - a.accessCount);
        
        return entries.slice(0, limit);
    }
    
    /**
     * Prune old entries manually (in addition to TTL)
     */
    prune(): number {
        let pruned = 0;
        const now = Date.now();
        
        for (const [signature, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.ttlMs) {
                this.cache.delete(signature);
                pruned++;
            }
        }
        
        this.stats.size = this.cache.size;
        console.log(`[TransactionCache] Pruned ${pruned} expired entries`);
        return pruned;
    }
    
    /**
     * Batch get multiple transactions
     */
    batchGet(signatures: string[]): Map<string, ParsedTransactionWithMeta | null> {
        const results = new Map<string, ParsedTransactionWithMeta | null>();
        
        for (const signature of signatures) {
            results.set(signature, this.get(signature));
        }
        
        return results;
    }
    
    /**
     * Batch set multiple transactions
     */
    batchSet(transactions: Map<string, ParsedTransactionWithMeta>): void {
        for (const [signature, transaction] of transactions) {
            this.set(signature, transaction);
        }
    }
    
    /**
     * Get cache memory usage estimate (bytes)
     */
    getMemoryUsage(): number {
        // Rough estimate: 1KB per transaction average
        return this.cache.size * 1024;
    }
    
    /**
     * Export cache state for persistence
     */
    export(): {
        entries: Array<[string, CachedTransaction]>;
        stats: CacheStats;
    } {
        return {
            entries: Array.from(this.cache.entries()),
            stats: { ...this.stats }
        };
    }
    
    /**
     * Import cache state from persistence
     */
    import(data: {
        entries: Array<[string, CachedTransaction]>;
        stats: CacheStats;
    }): void {
        this.clear();
        
        // Re-add entries that haven't expired
        const now = Date.now();
        for (const [signature, cached] of data.entries) {
            if (now - cached.timestamp < this.ttlMs) {
                this.cache.set(signature, cached);
            }
        }
        
        this.stats = { ...data.stats };
        this.stats.size = this.cache.size;
    }
}

// Export singleton instance
export const transactionCacheService = new TransactionCacheService();