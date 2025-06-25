/**
 * ConnectionPool - Manages multiple RPC connections for load balancing
 * Provides failover, health checking, and request distribution
 */

import { Connection, ConnectionConfig } from '@solana/web3.js';
import { EventEmitter } from 'events';

interface ConnectionHealth {
  endpoint: string;
  healthy: boolean;
  latency: number;
  errorCount: number;
  requestCount: number;
  lastError?: string;
  lastCheck: number;
}

interface PoolConfig {
  endpoints: string[];
  maxRequestsPerConnection?: number;
  healthCheckInterval?: number;
  maxRetries?: number;
  requestTimeout?: number;
  enableLoadBalancing?: boolean;
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private health: Map<string, ConnectionHealth> = new Map();
  private currentIndex: number = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  
  private readonly config: Required<PoolConfig> = {
    endpoints: [],
    maxRequestsPerConnection: 100,
    healthCheckInterval: 30000, // 30 seconds
    maxRetries: 3,
    requestTimeout: 5000,
    enableLoadBalancing: true
  };
  
  constructor(config: PoolConfig) {
    super();
    
    // Merge config
    Object.assign(this.config, config);
    
    if (this.config.endpoints.length === 0) {
      throw new Error('At least one endpoint is required');
    }
    
    // Initialize connections
    this.initializeConnections();
    
    // Start health checks
    this.startHealthChecks();
    
    console.log(`[ConnectionPool] Initialized with ${this.config.endpoints.length} endpoints`);
  }
  
  /**
   * Initialize all connections
   */
  private initializeConnections(): void {
    const connectionConfig: ConnectionConfig = {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: this.config.requestTimeout
    };
    
    for (const endpoint of this.config.endpoints) {
      const connection = new Connection(endpoint, connectionConfig);
      this.connections.set(endpoint, connection);
      
      // Initialize health tracking
      this.health.set(endpoint, {
        endpoint,
        healthy: true,
        latency: 0,
        errorCount: 0,
        requestCount: 0,
        lastCheck: Date.now()
      });
    }
  }
  
  /**
   * Get the next healthy connection
   */
  getConnection(): Connection | null {
    const healthyEndpoints = this.getHealthyEndpoints();
    
    if (healthyEndpoints.length === 0) {
      console.error('[ConnectionPool] No healthy connections available');
      return null;
    }
    
    let endpoint: string;
    
    if (this.config.enableLoadBalancing) {
      // Round-robin with health awareness
      endpoint = this.getNextHealthyEndpoint(healthyEndpoints);
    } else {
      // Always use first healthy endpoint
      endpoint = healthyEndpoints[0];
    }
    
    const health = this.health.get(endpoint)!;
    health.requestCount++;
    
    return this.connections.get(endpoint)!;
  }
  
  /**
   * Get next healthy endpoint using round-robin
   */
  private getNextHealthyEndpoint(healthyEndpoints: string[]): string {
    // Find next healthy endpoint starting from current index
    for (let i = 0; i < healthyEndpoints.length; i++) {
      const index = (this.currentIndex + i) % this.config.endpoints.length;
      const endpoint = this.config.endpoints[index];
      
      if (healthyEndpoints.includes(endpoint)) {
        this.currentIndex = (index + 1) % this.config.endpoints.length;
        return endpoint;
      }
    }
    
    // Fallback to first healthy endpoint
    return healthyEndpoints[0];
  }
  
  /**
   * Execute request with automatic failover
   */
  async execute<T>(
    operation: (connection: Connection) => Promise<T>,
    options?: { retries?: number; priority?: boolean }
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.maxRetries;
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connection = this.getConnection();
      
      if (!connection) {
        throw new Error('No healthy connections available');
      }
      
      const endpoint = this.getEndpointForConnection(connection);
      
      try {
        const startTime = Date.now();
        const result = await operation(connection);
        
        // Update latency on success
        if (endpoint) {
          const health = this.health.get(endpoint)!;
          health.latency = Date.now() - startTime;
          health.errorCount = Math.max(0, health.errorCount - 1); // Decay error count
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Update health on error
        if (endpoint) {
          const health = this.health.get(endpoint)!;
          health.errorCount++;
          health.lastError = error.message;
          
          // Mark unhealthy if too many errors
          if (health.errorCount >= 5) {
            health.healthy = false;
            console.error(`[ConnectionPool] Marking ${endpoint} as unhealthy: ${error.message}`);
            this.emit('connectionUnhealthy', endpoint);
          }
        }
        
        // Check if we should retry
        if (attempt < maxRetries - 1) {
          console.warn(`[ConnectionPool] Request failed, retrying (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('All connection attempts failed');
  }
  
  /**
   * Batch execute multiple operations
   */
  async batchExecute<T>(
    operations: Array<(connection: Connection) => Promise<T>>,
    options?: { 
      batchSize?: number;
      concurrency?: number;
      failFast?: boolean;
    }
  ): Promise<T[]> {
    const batchSize = options?.batchSize ?? 50;
    const concurrency = options?.concurrency ?? 10;
    const failFast = options?.failFast ?? false;
    
    const results: T[] = [];
    const errors: Error[] = [];
    
    // Process in batches
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      // Process batch with concurrency limit
      const batchPromises = batch.map((operation, index) => 
        this.execute(operation)
          .then(result => {
            results[i + index] = result;
          })
          .catch(error => {
            errors.push(error);
            if (failFast) {
              throw error;
            }
          })
      );
      
      // Wait for batch with concurrency control
      const chunks = [];
      for (let j = 0; j < batchPromises.length; j += concurrency) {
        chunks.push(Promise.all(batchPromises.slice(j, j + concurrency)));
      }
      
      await Promise.all(chunks);
    }
    
    if (errors.length > 0 && !failFast) {
      console.warn(`[ConnectionPool] Batch execution completed with ${errors.length} errors`);
    }
    
    return results;
  }
  
  /**
   * Get endpoint for a connection
   */
  private getEndpointForConnection(connection: Connection): string | undefined {
    for (const [endpoint, conn] of this.connections) {
      if (conn === connection) {
        return endpoint;
      }
    }
    return undefined;
  }
  
  /**
   * Get healthy endpoints
   */
  private getHealthyEndpoints(): string[] {
    return Array.from(this.health.entries())
      .filter(([_, health]) => health.healthy)
      .map(([endpoint, _]) => endpoint);
  }
  
  /**
   * Start health check loop
   */
  private startHealthChecks(): void {
    // Initial health check
    this.performHealthChecks();
    
    // Schedule periodic checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );
  }
  
  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.connections.entries()).map(async ([endpoint, connection]) => {
      try {
        const startTime = Date.now();
        const slot = await connection.getSlot();
        const latency = Date.now() - startTime;
        
        const health = this.health.get(endpoint)!;
        health.healthy = true;
        health.latency = latency;
        health.lastCheck = Date.now();
        
        // Decay error count on successful check
        health.errorCount = Math.max(0, health.errorCount - 1);
        
      } catch (error: any) {
        const health = this.health.get(endpoint)!;
        health.healthy = false;
        health.lastError = error.message;
        health.lastCheck = Date.now();
        
        console.error(`[ConnectionPool] Health check failed for ${endpoint}:`, error.message);
      }
    });
    
    await Promise.all(checks);
    
    // Emit health status
    const healthyCount = this.getHealthyEndpoints().length;
    this.emit('healthUpdate', {
      healthy: healthyCount,
      total: this.connections.size,
      endpoints: Array.from(this.health.values())
    });
  }
  
  /**
   * Get connection pool statistics
   */
  getStats(): {
    endpoints: ConnectionHealth[];
    healthyCount: number;
    totalRequests: number;
    averageLatency: number;
    errorRate: number;
  } {
    const endpoints = Array.from(this.health.values());
    const healthyEndpoints = endpoints.filter(h => h.healthy);
    
    const totalRequests = endpoints.reduce((sum, h) => sum + h.requestCount, 0);
    const totalErrors = endpoints.reduce((sum, h) => sum + h.errorCount, 0);
    
    const avgLatency = healthyEndpoints.length > 0
      ? healthyEndpoints.reduce((sum, h) => sum + h.latency, 0) / healthyEndpoints.length
      : 0;
    
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    return {
      endpoints,
      healthyCount: healthyEndpoints.length,
      totalRequests,
      averageLatency: avgLatency,
      errorRate
    };
  }
  
  /**
   * Add new endpoint to pool
   */
  addEndpoint(endpoint: string): void {
    if (this.connections.has(endpoint)) {
      return;
    }
    
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false
    });
    
    this.connections.set(endpoint, connection);
    this.health.set(endpoint, {
      endpoint,
      healthy: true,
      latency: 0,
      errorCount: 0,
      requestCount: 0,
      lastCheck: Date.now()
    });
    
    this.config.endpoints.push(endpoint);
    console.log(`[ConnectionPool] Added endpoint: ${endpoint}`);
  }
  
  /**
   * Remove endpoint from pool
   */
  removeEndpoint(endpoint: string): void {
    this.connections.delete(endpoint);
    this.health.delete(endpoint);
    this.config.endpoints = this.config.endpoints.filter(e => e !== endpoint);
    
    console.log(`[ConnectionPool] Removed endpoint: ${endpoint}`);
  }
  
  /**
   * Shutdown connection pool
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.connections.clear();
    this.health.clear();
    this.removeAllListeners();
    
    console.log('[ConnectionPool] Shutdown complete');
  }
}

// Export singleton instance with default configuration
export const connectionPool = new ConnectionPool({
  endpoints: [
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'https://api.mainnet-beta.solana.com',
    process.env.ALCHEMY_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/6hT8LbsNwH7DLW3boPLkL'
  ],
  enableLoadBalancing: true,
  healthCheckInterval: 30000,
  maxRetries: 3
});