import Bottleneck from 'bottleneck';
import axios from 'axios';
import pRetry from 'p-retry';
import { circuitBreaker, ConsecutiveBreaker, handleAll, wrap } from 'cockatiel';

// Enhanced rate limiter with per-minute quota management
const limiter = new Bottleneck({
  reservoir: 120, // Helius allows ~120 requests per minute
  reservoirRefreshAmount: 120, // Refill to full capacity
  reservoirRefreshInterval: 60000, // Every minute
  maxConcurrent: 5, // Max 5 parallel requests
  minTime: 50, // Min 50ms between requests (20 per second max)
});

// Circuit breaker for handling rate limit errors
const breaker = circuitBreaker(handleAll, {
  halfOpenAfter: 30 * 1000, // Try again after 30 seconds
  breaker: new ConsecutiveBreaker(3), // Open after 3 consecutive failures
});

const circuitBreakerWrapper = {
  execute: async <T>(fn: () => Promise<T>): Promise<T> => {
    return breaker.execute(() => fn()) as Promise<T>;
  }
};

// Track rate limit state
const rateLimitState = {
  isRateLimited: false,
  retryAfter: null as Date | null,
  consecutiveErrors: 0,
};

// Helper to make rate-limited RPC calls with circuit breaker
export async function rpcCall<T = any>(
  method: string,
  params: any[] = [],
  rpcUrl?: string
): Promise<T> {
  // Check if we should wait before making requests
  if (rateLimitState.retryAfter && new Date() < rateLimitState.retryAfter) {
    const waitTime = rateLimitState.retryAfter.getTime() - Date.now();
    console.log(`[RPC] Rate limited, waiting ${waitTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  return limiter.schedule(async () => {
    return circuitBreakerWrapper.execute<T>(async () => {
      return pRetry(
        async () => {
          try {
            const url = rpcUrl || process.env.HELIUS_RPC_URL || 
              `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
            
            const response = await axios.post(url, {
              jsonrpc: '2.0',
              id: Math.random().toString(36).substring(7),
              method,
              params,
            }, {
              timeout: 30000,
            });
            
            if (response.data.error) {
              throw new Error(`RPC Error: ${response.data.error.message}`);
            }
            
            // Reset rate limit state on success
            rateLimitState.consecutiveErrors = 0;
            rateLimitState.isRateLimited = false;
            
            return response.data.result;
          } catch (error: any) {
            // Handle rate limit errors
            if (error.response?.status === 429) {
              rateLimitState.consecutiveErrors++;
              rateLimitState.isRateLimited = true;
              
              // Parse Retry-After header if available
              const retryAfter = error.response.headers['retry-after'];
              if (retryAfter) {
                const retrySeconds = parseInt(retryAfter, 10);
                rateLimitState.retryAfter = new Date(Date.now() + retrySeconds * 1000);
                console.log(`[RPC] Rate limited, retry after ${retrySeconds} seconds`);
              } else {
                // Default backoff
                const backoffSeconds = Math.min(Math.pow(2, rateLimitState.consecutiveErrors), 60);
                rateLimitState.retryAfter = new Date(Date.now() + backoffSeconds * 1000);
              }
              
              throw new Error('Rate limited');
            }
            
            throw error;
          }
        },
        {
          retries: 3,
          minTimeout: 500,
          maxTimeout: 5000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(`[RPC] Attempt ${error.attemptNumber} failed for ${method}:`, error.message);
          },
        }
      );
    });
  });
}

// Batch multiple RPC calls into a single request with enhanced error handling
export async function rpcBatch<T = any>(
  requests: Array<{ method: string; params: any[] }>,
  rpcUrl?: string
): Promise<T[]> {
  if (requests.length === 0) return [];
  
  // Split large batches to avoid overwhelming the server
  const BATCH_SIZE = 10;
  if (requests.length > BATCH_SIZE) {
    const batches = [];
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      batches.push(requests.slice(i, i + BATCH_SIZE));
    }
    
    // Process batches sequentially to avoid rate limits
    const results = [];
    for (const batch of batches) {
      const batchResults = await rpcBatch<T>(batch, rpcUrl);
      results.push(...batchResults);
    }
    return results;
  }
  
  return limiter.schedule(async () => {
    return circuitBreakerWrapper.execute<T[]>(async () => {
      return pRetry(
        async () => {
          try {
            const url = rpcUrl || process.env.HELIUS_RPC_URL || 
              `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
            
            const batchRequests = requests.map((req, index) => ({
              jsonrpc: '2.0',
              id: index,
              method: req.method,
              params: req.params,
            }));
            
            const response = await axios.post(url, batchRequests, {
              timeout: 30000,
            });
            
            // Handle rate limit for batch requests
            if (response.status === 429) {
              throw new Error('Rate limited');
            }
            
            // Sort responses by ID to match request order
            const sortedResponses = response.data.sort((a: any, b: any) => a.id - b.id);
            
            // Extract results, throwing for any errors
            return sortedResponses.map((res: any, index: number) => {
              if (res.error) {
                throw new Error(`Batch RPC Error at index ${index}: ${res.error.message}`);
              }
              return res.result;
            });
          } catch (error: any) {
            if (error.response?.status === 429) {
              // Same rate limit handling as single requests
              const retryAfter = error.response.headers['retry-after'];
              if (retryAfter) {
                const retrySeconds = parseInt(retryAfter, 10);
                await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
              }
              throw new Error('Rate limited');
            }
            throw error;
          }
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 10000,
          factor: 2,
        }
      );
    });
  });
}

// Export the limiter for monitoring/stats if needed
export { limiter };