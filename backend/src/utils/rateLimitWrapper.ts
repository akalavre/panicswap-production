import pRetry from 'p-retry';

interface RateLimitConfig {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  onFailedAttempt?: (error: any) => void;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  retries: 5,
  minTimeout: 1000,  // Start with 1 second
  maxTimeout: 30000, // Max 30 seconds
  factor: 2,         // Double the timeout each retry
};

/**
 * Wraps a function with rate limit retry logic
 * Specifically handles Helius rate limiting (429 status or -32005 error code)
 */
export function withRateLimitRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: RateLimitConfig = {}
): T {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return pRetry(
      async () => {
        try {
          return await fn(...args);
        } catch (error: any) {
          // Check for rate limit errors
          const isRateLimited = 
            error.response?.status === 429 ||
            error.response?.data?.error?.code === -32005 ||
            error.message?.includes('rate limited') ||
            error.message?.includes('429');

          if (isRateLimited) {
            console.log(`[RateLimit] Hit rate limit, will retry with backoff`);
            throw error; // Let p-retry handle it
          }

          // For non-rate-limit errors, don't retry
          throw new (pRetry as any).AbortError(error);
        }
      },
      {
        retries: mergedConfig.retries!,
        minTimeout: mergedConfig.minTimeout!,
        maxTimeout: mergedConfig.maxTimeout!,
        factor: mergedConfig.factor!,
        onFailedAttempt: (error) => {
          console.log(
            `[RateLimit] Attempt ${error.attemptNumber} failed. Retrying in ${error.retriesLeft > 0 ? Math.min(mergedConfig.minTimeout! * Math.pow(mergedConfig.factor!, error.attemptNumber - 1), mergedConfig.maxTimeout!) : 0}ms...`
          );
          mergedConfig.onFailedAttempt?.(error);
        },
      }
    );
  }) as T;
}

/**
 * Batch processor with rate limiting
 * Processes items in batches with delays between batches
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private batchDelay: number;
  private processor: (batch: T[]) => Promise<R[]>;

  constructor(config: {
    batchSize: number;
    batchDelayMs: number;
    processor: (batch: T[]) => Promise<R[]>;
  }) {
    this.batchSize = config.batchSize;
    this.batchDelay = config.batchDelayMs;
    this.processor = withRateLimitRetry(config.processor);
  }

  add(items: T[]): void {
    this.queue.push(...items);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        await this.processor(batch);
      } catch (error) {
        console.error('[BatchProcessor] Failed to process batch:', error);
        // Re-add failed items to queue for retry
        this.queue.unshift(...batch);
        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, this.batchDelay * 2));
      }

      // Wait before processing next batch
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

/**
 * Simple in-memory cache with TTL
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private ttl: number;

  constructor(ttlSeconds: number) {
    this.ttl = ttlSeconds * 1000; // Convert to milliseconds
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}