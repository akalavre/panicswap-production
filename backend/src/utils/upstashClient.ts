// Upstash Redis client for caching
import { Redis } from '@upstash/redis';
import config from '../config';

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://polite-oarfish-32536.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'AX8YAAIjcDE1ZjliMjhhZTM0YmY0ZWJiOTFmZDVlYzc3NTI0OGE3YXAxMA',
});

// Cache TTL constants
export const CACHE_TTL = {
  VELOCITY_DATA: 60,        // 1 minute for price/liquidity velocities
  MONITORING_STATS: 30,     // 30 seconds for monitoring stats
  PATTERN_DETECTION: 300,   // 5 minutes for ML patterns
  ML_PREDICTIONS: 300,      // 5 minutes for ML predictions
  TOKEN_PRICES: 10,         // 10 seconds for real-time prices
  POOL_LIQUIDITY: 30,       // 30 seconds for pool data
  RUG_ALERTS: 3600,        // 1 hour for processed alerts
  HOT_TOKENS: 300,         // 5 minutes for trending tokens
} as const;

// Cache key generators
export const cacheKeys = {
  // Velocity data
  velocity: (tokenMint: string) => `velocity:${tokenMint}`,
  
  // Monitoring stats
  monitoringStats: (tokenMint: string, wallet: string) => `stats:${tokenMint}:${wallet}`,
  
  // Pattern detection
  patterns: (tokenMint: string) => `patterns:${tokenMint}`,
  mlPrediction: (tokenMint: string) => `ml:${tokenMint}`,
  
  // Price data
  tokenPrice: (tokenMint: string) => `price:${tokenMint}`,
  priceHistory: (tokenMint: string) => `price_history:${tokenMint}`,
  
  // Liquidity data
  poolLiquidity: (tokenMint: string) => `liquidity:${tokenMint}`,
  liquidityHistory: (tokenMint: string) => `liquidity_history:${tokenMint}`,
  
  // Alerts and notifications
  alerts: (tokenMint: string) => `alerts:${tokenMint}`,
  criticalAlerts: () => 'alerts:critical',
  
  // Hot tokens tracking
  hotTokens: () => 'tokens:hot',
  riskTokens: () => 'tokens:high_risk',
  
  // Rate limiting
  rateLimit: (key: string) => `rate:${key}`,
};

// Helper functions
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data as T;
  } catch (error) {
    console.error(`[Redis] Error getting ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string, 
  value: T, 
  ttl: number = CACHE_TTL.MONITORING_STATS
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`[Redis] Error setting ${key}:`, error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Upstash doesn't support pattern deletion, so we track keys
    // In production, you might want to maintain a set of keys
    console.log(`[Redis] Would invalidate pattern: ${pattern}`);
  } catch (error) {
    console.error('[Redis] Error invalidating cache:', error);
  }
}

// Priority queue for alerts
export async function addCriticalAlert(alert: {
  tokenMint: string;
  type: string;
  severity: string;
  timestamp: number;
}): Promise<void> {
  try {
    await redis.zadd(cacheKeys.criticalAlerts(), {
      score: alert.timestamp,
      member: JSON.stringify(alert)
    });
    
    // Keep only last 100 alerts
    await redis.zremrangebyrank(cacheKeys.criticalAlerts(), 0, -101);
  } catch (error) {
    console.error('[Redis] Error adding critical alert:', error);
  }
}

// Get recent critical alerts
export async function getRecentCriticalAlerts(limit: number = 10): Promise<any[]> {
  try {
    const alerts = await redis.zrange(cacheKeys.criticalAlerts(), -limit, -1, {
      rev: true
    });
    
    return alerts.map(a => JSON.parse(a as string));
  } catch (error) {
    console.error('[Redis] Error getting critical alerts:', error);
    return [];
  }
}

// Track hot tokens
export async function trackHotToken(tokenMint: string, score: number): Promise<void> {
  try {
    await redis.zadd(cacheKeys.hotTokens(), {
      score,
      member: tokenMint
    });
    
    // Keep only top 50 hot tokens
    await redis.zremrangebyrank(cacheKeys.hotTokens(), 0, -51);
  } catch (error) {
    console.error('[Redis] Error tracking hot token:', error);
  }
}

// Get hot tokens
export async function getHotTokens(limit: number = 10): Promise<string[]> {
  try {
    const tokens = await redis.zrange(cacheKeys.hotTokens(), -limit, -1, {
      rev: true
    });
    
    return tokens as string[];
  } catch (error) {
    console.error('[Redis] Error getting hot tokens:', error);
    return [];
  }
}

// Health check functionality (for backward compatibility)
export async function getRedisHealth(): Promise<{
  enabled: boolean;
  connected: boolean;
  status: string;
  error?: string;
  uptime?: number;
  memory?: number;
  metrics: {
    fallbackCount: number;
  };
}> {
  try {
    // Upstash is always "connected" as it's HTTP-based
    await redis.ping();
    
    return {
      enabled: true,
      connected: true,
      status: 'ready',
      uptime: Date.now() / 1000, // Simulated uptime
      memory: 0, // Upstash doesn't expose memory usage
      metrics: {
        fallbackCount: 0
      }
    };
  } catch (error: any) {
    console.error('[Upstash] Health check failed:', error);
    return {
      enabled: true,
      connected: false,
      status: 'error',
      error: error.message,
      metrics: {
        fallbackCount: 0
      }
    };
  }
}

// Execute command wrapper (for backward compatibility with old Redis code)
export async function executeRedisCommand<T>(
  command: (redis: any) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  try {
    // Pass the Upstash client to the command
    return await command(redis);
  } catch (error) {
    console.error('[Upstash] Command failed, using fallback:', error);
    return await Promise.resolve(fallback());
  }
}

export default redis;