import Redis from 'ioredis';
import pRetry from 'p-retry';
import { circuitBreaker, ConsecutiveBreaker, ExponentialBackoff, handleAll, retry, wrap } from 'cockatiel';

// Redis configuration from environment
const redisConfig = {
  REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false', // Default to true for backward compatibility
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
};

// Singleton Redis instance
let redisInstance: Redis | any = null;
let breakerInstance: any = null;

// Metrics for monitoring
export const redisMetrics = {
  enabled: redisConfig.REDIS_ENABLED,
  connected: false,
  connectionAttempts: 0,
  connectionFailures: 0,
  fallbackCount: 0,
  lastError: null as Error | null,
  lastErrorTime: null as Date | null,
};

// Log Redis status once on startup
if (!redisConfig.REDIS_ENABLED) {
  console.log('[Redis] ℹ️  Redis is disabled via REDIS_ENABLED=false. Using in-memory cache only.');
}

/**
 * Create stub Redis client for when Redis is disabled
 */
function createStubRedisClient(): any {
  const stub = {
    status: 'ready',
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    sadd: async () => 0,
    expire: async () => 0,
    ping: async () => 'PONG',
    info: async () => '',
    pipeline: () => ({
      setex: () => stub.pipeline(),
      exec: async () => [],
    }),
    connect: async () => {},
    quit: async () => {},
    on: () => {},
    once: () => {},
  };
  return stub;
}

/**
 * Create Redis client with proper configuration
 */
function createRedisClient(): Redis {
  const redisUrl = redisConfig.REDIS_URL || 
    `redis://${redisConfig.REDIS_HOST || 'localhost'}:${redisConfig.REDIS_PORT || '6379'}`;
  
  console.log('[Redis] Attempting to connect to:', redisUrl.replace(/:[^:@]*@/, ':****@')); // Hide password
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // We'll handle retries manually
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      // Reconnect on connection errors or READONLY errors
      return /READONLY|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/.test(err.message);
    },
    retryStrategy: (times) => {
      redisMetrics.connectionAttempts = times;
      
      // Never give up - let the circuit breaker handle failures
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, then cap at 5000ms
      const delay = Math.min(100 * Math.pow(2, times - 1), 5000);
      
      // Log every 5th attempt to reduce noise
      if (times % 5 === 1) {
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      }
      
      return delay;
    },
    lazyConnect: false, // Connect immediately to fail fast
    connectTimeout: 30000, // 30 seconds to allow for slow starts
    commandTimeout: 5000,  // 5 seconds
    password: redisConfig.REDIS_PASSWORD,
  });

  // Set up event handlers
  client.on('connect', () => {
    console.log('[Redis] ✅ Connected');
    redisMetrics.connected = true;
    redisMetrics.connectionFailures = 0;
  });

  client.on('ready', () => {
    console.log('[Redis] ✅ Ready to accept commands');
  });

  client.on('error', (error) => {
    redisMetrics.lastError = error;
    redisMetrics.lastErrorTime = new Date();
    
    // Only log meaningful errors, not routine connection issues during startup
    if (redisMetrics.connected || redisMetrics.connectionAttempts > 1) {
      console.error('[Redis] Error:', error.message);
    }
  });

  client.on('close', () => {
    console.log('[Redis] Connection closed');
    redisMetrics.connected = false;
  });

  client.on('reconnecting', (delay: number) => {
    console.log(`[Redis] Reconnecting in ${delay}ms`);
  });

  return client;
}

/**
 * Initialize circuit breaker for Redis operations
 */
function initializeCircuitBreaker() {
  const breaker = circuitBreaker(handleAll, {
    halfOpenAfter: 30 * 1000, // Try again after 30 seconds
    breaker: new ConsecutiveBreaker(5), // Open after 5 consecutive failures
  });
  
  return {
    execute: async (fn: () => Promise<any>) => {
      return breaker.execute(() => fn());
    }
  };
}

/**
 * Get Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    if (!redisConfig.REDIS_ENABLED) {
      redisInstance = createStubRedisClient() as any;
    } else {
      redisInstance = createRedisClient();
    }
  }
  return redisInstance;
}

/**
 * Ensure Redis is connected
 */
export async function ensureConnected(): Promise<boolean> {
  if (!redisConfig.REDIS_ENABLED) {
    return true; // Stub is always "connected"
  }
  
  const client = getRedisClient();
  
  if (client.status === 'ready') {
    return true;
  }

  try {
    redisMetrics.connectionAttempts++;
    
    // Check all possible connection states
    const connectingStates = ['wait', 'connecting', 'connect', 'reconnecting'] as const;
    const disconnectedStates = ['end', 'close'] as const;
    
    if (connectingStates.includes(client.status as any)) {
      // Already connecting, wait for it
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000); // Increased to 30 seconds for slow starts
        
        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        client.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      return true;
    }
    
    // Only try to connect if we're in a disconnected state
    if (disconnectedStates.includes(client.status as any)) {
      await client.connect();
    }
    
    // Verify connection with ping
    await client.ping();
    
    return true;
  } catch (error) {
    redisMetrics.connectionFailures++;
    redisMetrics.lastError = error as Error;
    redisMetrics.lastErrorTime = new Date();
    console.error('[Redis] Failed to ensure connection:', error);
    return false;
  }
}

/**
 * Execute Redis command with retry and circuit breaker
 */
export async function executeRedisCommand<T>(
  operation: (client: Redis) => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  // If Redis is disabled, go straight to fallback
  if (!redisConfig.REDIS_ENABLED) {
    if (fallback) {
      redisMetrics.fallbackCount++;
      return await fallback();
    }
    // If no fallback and Redis is disabled, execute with stub
    const client = getRedisClient();
    return await operation(client);
  }
  
  if (!breakerInstance) {
    breakerInstance = initializeCircuitBreaker();
  }

  try {
    // Try to execute through circuit breaker
    const result = await breakerInstance.execute(async () => {
      // Ensure we're connected
      const connected = await ensureConnected();
      if (!connected) {
        throw new Error('Redis connection unavailable');
      }

      // Execute with retry
      return await pRetry(
        async () => {
          const client = getRedisClient();
          return await operation(client);
        },
        {
          retries: 3,
          minTimeout: 100,
          maxTimeout: 1000,
          onFailedAttempt: (error) => {
            console.warn(`[Redis] Operation failed (attempt ${error.attemptNumber}):`, error.message);
          },
        }
      );
    });

    return result;
  } catch (error) {
    console.error('[Redis] Operation failed after all retries:', error);
    
    // If we have a fallback, use it
    if (fallback) {
      redisMetrics.fallbackCount++;
      console.log('[Redis] Using fallback mechanism');
      return await fallback();
    }
    
    throw error;
  }
}

/**
 * Get Redis health status
 */
export async function getRedisHealth(): Promise<{
  enabled: boolean;
  connected: boolean;
  status: string;
  metrics: typeof redisMetrics;
  circuitBreakerState: string;
}> {
  const client = getRedisClient();
  let connected = false;
  
  if (!redisConfig.REDIS_ENABLED) {
    return {
      enabled: false,
      connected: true, // Stub is always "connected"
      status: 'disabled',
      metrics: { ...redisMetrics },
      circuitBreakerState: 'not-needed',
    };
  }
  
  try {
    if (client.status === 'ready') {
      await client.ping();
      connected = true;
    }
  } catch (error) {
    // Connection test failed
  }

  return {
    enabled: true,
    connected,
    status: client.status,
    metrics: { ...redisMetrics },
    circuitBreakerState: breakerInstance ? 'initialized' : 'not-initialized',
  };
}

/**
 * Gracefully shutdown Redis connection
 */
export async function shutdownRedis(): Promise<void> {
  if (redisInstance && redisConfig.REDIS_ENABLED) {
    console.log('[Redis] Shutting down connection...');
    await redisInstance.quit();
    redisInstance = null;
    breakerInstance = null;
    redisMetrics.connected = false;
  }
}

// Export types
export type { Redis };