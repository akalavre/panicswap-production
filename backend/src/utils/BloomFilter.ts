/**
 * BloomFilter - Probabilistic data structure for efficient membership tests
 * Used to quickly check if a token is being monitored without database queries
 */

export class BloomFilter {
    private bitArray: Uint8Array;
    private size: number;
    private hashCount: number;
    private itemCount: number = 0;

    constructor(expectedItems: number = 10000, falsePositiveRate: number = 0.01) {
        // Calculate optimal size and hash count
        this.size = this.calculateOptimalSize(expectedItems, falsePositiveRate);
        this.hashCount = this.calculateOptimalHashCount(this.size, expectedItems);
        
        // Initialize bit array
        const byteSize = Math.ceil(this.size / 8);
        this.bitArray = new Uint8Array(byteSize);
    }

    /**
     * Add an item to the bloom filter
     */
    add(item: string): void {
        const hashes = this.getHashes(item);
        
        for (const hash of hashes) {
            const index = hash % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            
            this.bitArray[byteIndex] |= (1 << bitIndex);
        }
        
        this.itemCount++;
    }

    /**
     * Check if an item might be in the set (probabilistic)
     * False positives are possible, false negatives are not
     */
    contains(item: string): boolean {
        const hashes = this.getHashes(item);
        
        for (const hash of hashes) {
            const index = hash % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            
            if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
                return false; // Definitely not in set
            }
        }
        
        return true; // Possibly in set
    }

    /**
     * Clear all items from the filter
     */
    clear(): void {
        this.bitArray.fill(0);
        this.itemCount = 0;
    }

    /**
     * Get the current false positive rate
     */
    getFalsePositiveRate(): number {
        if (this.itemCount === 0) return 0;
        
        // Using the formula: (1 - e^(-k*n/m))^k
        const ratio = this.hashCount * this.itemCount / this.size;
        return Math.pow(1 - Math.exp(-ratio), this.hashCount);
    }

    /**
     * Export the filter state for persistence
     */
    export(): { size: number; hashCount: number; itemCount: number; bitArray: string } {
        return {
            size: this.size,
            hashCount: this.hashCount,
            itemCount: this.itemCount,
            bitArray: Buffer.from(this.bitArray).toString('base64')
        };
    }

    /**
     * Import filter state from persistence
     */
    static import(data: { size: number; hashCount: number; itemCount: number; bitArray: string }): BloomFilter {
        const filter = new BloomFilter();
        filter.size = data.size;
        filter.hashCount = data.hashCount;
        filter.itemCount = data.itemCount;
        filter.bitArray = new Uint8Array(Buffer.from(data.bitArray, 'base64'));
        return filter;
    }

    /**
     * Calculate optimal filter size
     */
    private calculateOptimalSize(n: number, p: number): number {
        // m = -n * ln(p) / (ln(2)^2)
        return Math.ceil(-n * Math.log(p) / Math.pow(Math.log(2), 2));
    }

    /**
     * Calculate optimal hash count
     */
    private calculateOptimalHashCount(m: number, n: number): number {
        // k = (m/n) * ln(2)
        return Math.ceil((m / n) * Math.log(2));
    }

    /**
     * Generate multiple hash values using double hashing
     */
    private getHashes(item: string): number[] {
        const hashes: number[] = [];
        const hash1 = this.fnv1aHash(item);
        const hash2 = this.djb2Hash(item);
        
        for (let i = 0; i < this.hashCount; i++) {
            // Double hashing: h(i) = h1 + i * h2
            hashes.push(Math.abs(hash1 + i * hash2));
        }
        
        return hashes;
    }

    /**
     * FNV-1a hash function
     */
    private fnv1aHash(str: string): number {
        let hash = 2166136261;
        
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash *= 16777619;
        }
        
        return hash >>> 0; // Convert to unsigned 32-bit
    }

    /**
     * DJB2 hash function
     */
    private djb2Hash(str: string): number {
        let hash = 5381;
        
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        
        return hash >>> 0; // Convert to unsigned 32-bit
    }

    /**
     * Get filter statistics
     */
    getStats(): {
        size: number;
        hashCount: number;
        itemCount: number;
        falsePositiveRate: number;
        memoryUsageBytes: number;
    } {
        return {
            size: this.size,
            hashCount: this.hashCount,
            itemCount: this.itemCount,
            falsePositiveRate: this.getFalsePositiveRate(),
            memoryUsageBytes: this.bitArray.length
        };
    }
}

/**
 * Counting Bloom Filter - Allows item removal
 * Useful for dynamic sets where tokens can be unprotected
 */
export class CountingBloomFilter {
    private counters: Uint8Array;
    private size: number;
    private hashCount: number;
    private itemCount: number = 0;

    constructor(expectedItems: number = 10000, falsePositiveRate: number = 0.01) {
        // Calculate optimal parameters
        this.size = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / Math.pow(Math.log(2), 2));
        this.hashCount = Math.ceil((this.size / expectedItems) * Math.log(2));
        
        // Initialize counter array (4 bits per counter, max count 15)
        this.counters = new Uint8Array(this.size);
    }

    /**
     * Add an item to the filter
     */
    add(item: string): void {
        // Guard against undefined/null values
        if (!item) {
            console.warn('[BloomFilter] Attempted to add undefined/null item');
            return;
        }
        
        const hashes = this.getHashes(item);
        
        for (const hash of hashes) {
            const index = hash % this.size;
            if (this.counters[index] < 255) { // Prevent overflow
                this.counters[index]++;
            }
        }
        
        this.itemCount++;
    }

    /**
     * Remove an item from the filter
     */
    remove(item: string): void {
        // Guard against undefined/null values
        if (!item) {
            console.warn('[BloomFilter] Attempted to remove undefined/null item');
            return;
        }
        
        const hashes = this.getHashes(item);
        
        // First check if item might be in the filter
        let canRemove = true;
        for (const hash of hashes) {
            const index = hash % this.size;
            if (this.counters[index] === 0) {
                canRemove = false;
                break;
            }
        }
        
        // Only remove if all counters are non-zero
        if (canRemove) {
            for (const hash of hashes) {
                const index = hash % this.size;
                if (this.counters[index] > 0) {
                    this.counters[index]--;
                }
            }
            this.itemCount--;
        }
    }

    /**
     * Check if an item might be in the set
     */
    contains(item: string): boolean {
        // Guard against undefined/null values
        if (!item) {
            return false;
        }
        
        const hashes = this.getHashes(item);
        
        for (const hash of hashes) {
            const index = hash % this.size;
            if (this.counters[index] === 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Clear the filter
     */
    clear(): void {
        this.counters.fill(0);
        this.itemCount = 0;
    }

    /**
     * Get filter statistics
     */
    getStats(): {
        size: number;
        hashCount: number;
        itemCount: number;
        memoryUsageBytes: number;
    } {
        return {
            size: this.size,
            hashCount: this.hashCount,
            itemCount: this.itemCount,
            memoryUsageBytes: this.counters.length
        };
    }
    
    /**
     * Generate multiple hash values using double hashing
     */
    private getHashes(item: string): number[] {
        const hashes: number[] = [];
        const hash1 = this.fnv1aHash(item);
        const hash2 = this.djb2Hash(item);
        
        for (let i = 0; i < this.hashCount; i++) {
            // Double hashing: h(i) = h1 + i * h2
            hashes.push(Math.abs(hash1 + i * hash2));
        }
        
        return hashes;
    }

    /**
     * FNV-1a hash function
     */
    private fnv1aHash(str: string): number {
        let hash = 2166136261;
        
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash *= 16777619;
        }
        
        return hash >>> 0; // Convert to unsigned 32-bit
    }

    /**
     * DJB2 hash function
     */
    private djb2Hash(str: string): number {
        let hash = 5381;
        
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        
        return hash >>> 0; // Convert to unsigned 32-bit
    }
}