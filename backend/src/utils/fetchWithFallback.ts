import pRetry from 'p-retry';
import { circuitBreaker, ConsecutiveBreaker, handleAll, wrap } from 'cockatiel';

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
  serviceName?: string;
  fallbackData?: any;
  timeout?: number; // milliseconds
  maxRetries?: number; // override default retries
  retryDelay?: number; // initial retry delay in ms
}

/**
 * Fetch with retry and circuit breaker
 */
export async function fetchWithFallback<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    serviceName = new URL(url).hostname,
    fallbackData,
    timeout = 10000,
    maxRetries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  // Caching removed - fetch fresh data every time

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
            
            // Caching removed
            
            return data;
          } catch (error: any) {
            clearTimeout(timeoutId);
            
            // Handle specific errors
            if (error.name === 'AbortError') {
              throw new Error(`Request timeout after ${timeout}ms`);
            }
            
            if (error.code === 'ENOTFOUND') {
              // Caching removed
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
    
    // Caching removed - no stale data fallback
    
    // Use fallback data if provided
    if (fallbackData !== undefined) {
      console.log(`[Fetch] Using fallback data for ${serviceName}`);
      return fallbackData;
    }
    
    throw error;
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