import pRetry from 'p-retry';
import { circuitBreaker, ConsecutiveBreaker, handleAll, wrap } from 'cockatiel';
import { getCached as getUpstashCached, setCached as setUpstashCached, cacheKeys } from './upstashClient';

// Circuit breakers for different services
const circuitBreakers = new Map<string, any>();

// Get or create circuit breaker for a service
function getCircuitBreaker(serviceName: string): any {
  if (!circuitBreakers.has(serviceName)) {
    const breaker = circuitBreaker(handleAll, {
      halfOpenAfter: 60 * 1000, // Try again after 1 minute
      breaker: new ConsecutiveBreaker(5), // Open after 5 consecutive failures
    });
    
    const wrappedBreaker = {
      execute: async (fn: () => Promise<any>) => {
        return breaker.execute(() => fn());
      },
      state: 'closed' // Default state
    };
    
    circuitBreakers.set(serviceName, wrappedBreaker);
  }
  
  return circuitBreakers.get(serviceName)!;
}

export interface FetchOptions extends RequestInit {
  cacheKey?: string;
  cacheTTL?: number; // seconds
  serviceName?: string;
  fallbackData?: any;
  timeout?: number; // milliseconds
  maxRetries?: number; // override default retries
  retryDelay?: number; // initial retry delay in ms
}

/**
 * Fetch with retry, circuit breaker, and caching
 */
export async function fetchWithFallback<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTTL = 60, // 1 minute default
    serviceName = new URL(url).hostname,
    fallbackData,
    timeout = 10000,
    maxRetries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  // Try cache first if key provided
  if (cacheKey) {
    const cached = await getCachedData<T>(cacheKey);
    if (cached !== null) {
      console.log(`[Fetch] Cache hit for ${cacheKey}`);
      return cached;
    }
  }

  const circuitBreaker = getCircuitBreaker(serviceName);
  
  try {
    // Circuit breaker will handle state internally

    // Execute request through circuit breaker
    const result = await circuitBreaker.execute(async () => {
      return pRetry(
        async () => {
          // Add timeout using AbortController
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          try {
            const response = await fetch(url, {
              ...fetchOptions,
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              // Don't retry on client errors (4xx)
              if (response.status >= 400 && response.status < 500) {
                throw new pRetry.AbortError(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful response
            if (cacheKey) {
              await setCachedData(cacheKey, data, cacheTTL);
            }
            
            return data;
          } catch (error: any) {
            clearTimeout(timeoutId);
            
            // Handle specific errors
            if (error.name === 'AbortError') {
              throw new Error(`Request timeout after ${timeout}ms`);
            }
            
            if (error.code === 'ENOTFOUND') {
              // Cache negative result to prevent hammering
              if (cacheKey) {
                await setCachedData(cacheKey, { error: 'ENOTFOUND', message: error.message }, 300); // 5 min cache
              }
              throw new pRetry.AbortError(`DNS lookup failed for ${serviceName}`);
            }
            
            throw error;
          }
        },
        {
          retries: maxRetries,
          minTimeout: retryDelay,
          maxTimeout: retryDelay * 8, // max 8x initial delay
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `[Fetch] Attempt ${error.attemptNumber} failed for ${serviceName}:`,
              error.message
            );
          },
        }
      );
    });
    
    return result as T;
  } catch (error: any) {
    console.error(`[Fetch] Failed to fetch from ${serviceName}:`, error.message);
    
    // Try stale cache as last resort
    if (cacheKey) {
      const staleData = await getCachedData<T>(cacheKey, true);
      if (staleData !== null) {
        console.log(`[Fetch] Using stale cache for ${cacheKey}`);
        return staleData;
      }
    }
    
    // Use fallback data if provided
    if (fallbackData !== undefined) {
      console.log(`[Fetch] Using fallback data for ${serviceName}`);
      return fallbackData;
    }
    
    throw error;
  }
}

/**
 * Get cached data from Redis
 */
async function getCachedData<T>(key: string, allowStale: boolean = false): Promise<T | null> {
  const fullKey = `fetch:${key}`;
  
  try {
    const cached = await getUpstashCached<{ data: T; expiresAt: number }>(fullKey);
    if (!cached) return null;
    
    // Check if expired (unless allowing stale)
    if (!allowStale && cached.expiresAt && Date.now() > cached.expiresAt) {
      // Note: Upstash automatically expires keys, but we check for safety
      return null;
    }
    
    return cached.data;
  } catch (error) {
    console.error('[FetchWithFallback] Error getting cached data:', error);
    return null;
  }
}

/**
 * Set cached data in Redis
 */
async function setCachedData<T>(key: string, data: T, ttl: number): Promise<void> {
  const fullKey = `fetch:${key}`;
  
  try {
    const cacheData = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000),
    };
    
    await setUpstashCached(fullKey, cacheData, ttl);
    
    // Also set a longer TTL for stale-while-revalidate
    const staleKey = `${fullKey}:stale`;
    await setUpstashCached(staleKey, cacheData, ttl * 10);
  } catch (error) {
    console.error('[FetchWithFallback] Error setting cached data:', error);
  }
}

/**
 * Get circuit breaker states for monitoring
 */
export function getCircuitBreakerStates(): Record<string, string> {
  const states: Record<string, string> = {};
  
  circuitBreakers.forEach((breaker, service) => {
    states[service] = breaker.state || 'unknown';
  });
  
  return states;
}