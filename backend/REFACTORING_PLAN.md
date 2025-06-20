# Backend Refactoring Plan

## Executive Summary
The backend has grown organically with overlapping responsibilities, tight coupling, and inconsistent patterns. This refactoring plan prioritizes high-impact changes that will improve reliability, testability, and maintainability.

## Phase 1: Domain Separation & Dependency Injection (Week 1)

### 1.1 Create Domain Modules
```
/backend/src/
├── domains/
│   ├── pricing/
│   │   ├── interfaces/
│   │   │   ├── IPriceProvider.ts
│   │   │   ├── IPriceRepository.ts
│   │   │   └── IPriceService.ts
│   │   ├── providers/
│   │   │   ├── HeliusPriceProvider.ts
│   │   │   ├── JupiterPriceProvider.ts
│   │   │   ├── DexScreenerPriceProvider.ts
│   │   │   └── CompositePriceProvider.ts
│   │   ├── services/
│   │   │   └── PriceService.ts
│   │   └── repositories/
│   │       └── SupabasePriceRepository.ts
│   ├── monitoring/
│   │   ├── interfaces/
│   │   ├── services/
│   │   └── repositories/
│   └── liquidity/
│       ├── interfaces/
│       ├── providers/
│       └── services/
```

### 1.2 Implement Dependency Injection Container
```typescript
// src/infrastructure/container.ts
import { Container } from 'inversify';
import { IPriceProvider } from '@domains/pricing/interfaces';
import { HeliusPriceProvider } from '@domains/pricing/providers';

const container = new Container();

// Bind interfaces to implementations
container.bind<IPriceProvider>('HeliusPrice').to(HeliusPriceProvider);
container.bind<IPriceProvider>('JupiterPrice').to(JupiterPriceProvider);
container.bind<IPriceProvider>('DexScreenerPrice').to(DexScreenerPriceProvider);

// Composite provider with fallback chain
container.bind<IPriceProvider>('PriceProvider').to(CompositePriceProvider);
```

## Phase 2: External API Abstraction (Week 1-2)

### 2.1 Create Provider Interfaces
```typescript
// domains/pricing/interfaces/IPriceProvider.ts
export interface IPriceProvider {
  getName(): string;
  getPrice(tokenMint: string): Promise<PriceResult>;
  getBatchPrices(tokenMints: string[]): Promise<Map<string, PriceResult>>;
  isHealthy(): Promise<boolean>;
}

export interface PriceResult {
  price: number;
  confidence: number;
  timestamp: number;
  source: string;
}
```

### 2.2 Implement Provider Adapters
```typescript
// domains/pricing/providers/HeliusPriceProvider.ts
export class HeliusPriceProvider implements IPriceProvider {
  constructor(
    private heliusClient: IHeliusClient,
    private rateLimiter: IRateLimiter,
    private cache: ICache<PriceResult>
  ) {}

  async getPrice(tokenMint: string): Promise<PriceResult> {
    const cached = await this.cache.get(tokenMint);
    if (cached && !this.isStale(cached)) return cached;

    return this.rateLimiter.execute(async () => {
      try {
        const result = await this.heliusClient.getAssetPrice(tokenMint);
        const priceResult = this.mapToPriceResult(result);
        await this.cache.set(tokenMint, priceResult);
        return priceResult;
      } catch (error) {
        throw new ProviderError('Helius', error);
      }
    });
  }
}
```

## Phase 3: Centralized Error Handling & Resilience (Week 2)

### 3.1 Create Error Hierarchy
```typescript
// infrastructure/errors/index.ts
export abstract class BaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProviderError extends BaseError {
  constructor(provider: string, cause: Error) {
    super(
      'PROVIDER_ERROR',
      `Provider ${provider} failed: ${cause.message}`,
      503,
      true
    );
  }
}

export class RateLimitError extends BaseError {
  constructor(public retryAfter: number) {
    super('RATE_LIMIT', 'Rate limit exceeded', 429, true);
  }
}
```

### 3.2 Implement Circuit Breaker Pattern
```typescript
// infrastructure/resilience/CircuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN' && !this.shouldAttemptReset()) {
      throw new CircuitOpenError();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Phase 4: Replace Singletons with Service Registry (Week 2-3)

### 4.1 Service Registry Pattern
```typescript
// infrastructure/ServiceRegistry.ts
export class ServiceRegistry {
  private services = new Map<string, any>();
  
  register<T>(name: string, factory: () => T): void {
    if (!this.services.has(name)) {
      this.services.set(name, factory());
    }
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}
```

### 4.2 Initialize Services in Bootstrap
```typescript
// bootstrap/services.ts
export async function initializeServices(config: Config): Promise<ServiceRegistry> {
  const registry = new ServiceRegistry();
  
  // Infrastructure
  registry.register('cache', () => new RedisCache(config.redis));
  registry.register('rateLimiter', () => new RateLimiter(config.rateLimit));
  
  // Providers
  registry.register('heliusProvider', () => 
    new HeliusPriceProvider(
      new HeliusClient(config.helius),
      registry.get('rateLimiter'),
      registry.get('cache')
    )
  );
  
  // Services
  registry.register('priceService', () =>
    new PriceService(
      registry.get('priceProvider'),
      registry.get('priceRepository')
    )
  );
  
  return registry;
}
```

## Phase 5: Separate Concerns & Single Responsibility (Week 3)

### 5.1 Split PricePollingService
```typescript
// Before: One class doing everything
class PricePollingService {
  pollPrices() { /* scheduling + fetching + storing + dashboard */ }
}

// After: Separated concerns
class PriceScheduler {
  constructor(private priceService: IPriceService) {}
  schedulePolling(tokens: string[], interval: number) { /* only scheduling */ }
}

class DashboardTokenManager {
  constructor(private cache: ICache) {}
  addToken(mint: string) { /* only token management */ }
  getActiveTokens(): string[] { /* only token management */ }
}

class PriceAggregator {
  constructor(private providers: IPriceProvider[]) {}
  async getBestPrice(mint: string): Promise<PriceResult> { /* only aggregation */ }
}
```

## Phase 6: Testing Infrastructure (Week 3-4)

### 6.1 Unit Test Structure
```typescript
// domains/pricing/providers/__tests__/HeliusPriceProvider.test.ts
describe('HeliusPriceProvider', () => {
  let provider: HeliusPriceProvider;
  let mockClient: MockHeliusClient;
  let mockRateLimiter: MockRateLimiter;
  
  beforeEach(() => {
    mockClient = createMockHeliusClient();
    mockRateLimiter = createMockRateLimiter();
    provider = new HeliusPriceProvider(mockClient, mockRateLimiter);
  });
  
  it('should return cached price when available', async () => {
    // Arrange
    const cachedPrice = { price: 100, timestamp: Date.now() };
    mockCache.get.mockResolvedValue(cachedPrice);
    
    // Act
    const result = await provider.getPrice('token123');
    
    // Assert
    expect(result).toEqual(cachedPrice);
    expect(mockClient.getAssetPrice).not.toHaveBeenCalled();
  });
});
```

## Phase 7: Configuration & Environment Management (Week 4)

### 7.1 Typed Configuration
```typescript
// config/schema.ts
export interface Config {
  server: {
    port: number;
    env: 'development' | 'production' | 'test';
  };
  providers: {
    helius: {
      apiKey: string;
      rateLimit: { requests: number; window: number };
    };
    jupiter: {
      endpoint: string;
      timeout: number;
    };
  };
  cache: {
    ttl: number;
    redis?: { host: string; port: number };
  };
}

// config/index.ts
export const config = validateConfig({
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV as any || 'development'
  },
  providers: {
    helius: {
      apiKey: required(process.env.HELIUS_API_KEY),
      rateLimit: { requests: 10, window: 1000 }
    }
  }
});
```

## Phase 8: Observability & Monitoring (Ongoing)

### 8.1 Structured Logging
```typescript
// infrastructure/logging/Logger.ts
export class Logger {
  constructor(private context: string) {}
  
  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: this.context,
      message,
      ...meta
    }));
  }
  
  error(message: string, error: Error, meta?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      context: this.context,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...meta
    }));
  }
}
```

### 8.2 Metrics Collection
```typescript
// infrastructure/metrics/Metrics.ts
export class Metrics {
  private prometheus = new PrometheusClient();
  
  recordApiCall(provider: string, success: boolean, duration: number) {
    this.prometheus.histogram('api_call_duration', duration, {
      provider,
      success: success.toString()
    });
  }
  
  recordCacheHit(key: string, hit: boolean) {
    this.prometheus.counter('cache_hits', 1, {
      key,
      hit: hit.toString()
    });
  }
}
```

## Migration Strategy

### Week 1-2: Foundation
1. Set up new folder structure alongside existing code
2. Implement core interfaces and DI container
3. Create first provider adapter (Helius)
4. Write tests for new components

### Week 3-4: Incremental Migration
1. Replace singleton usage one service at a time
2. Migrate price fetching to new providers
3. Keep existing APIs working with adapter layer
4. Run old and new code in parallel for validation

### Week 5: Cutover
1. Switch all API routes to use new services
2. Remove old singleton services
3. Clean up dead code
4. Update documentation

## Success Metrics
- 90%+ unit test coverage on new code
- 50% reduction in error rates
- 30% faster API response times (via better caching)
- Zero downtime during migration
- Easier onboarding (clear domain boundaries)

## Risks & Mitigations
- **Risk**: Breaking existing functionality
  - **Mitigation**: Feature flags, parallel running, comprehensive tests
- **Risk**: Performance regression
  - **Mitigation**: Load testing, gradual rollout, monitoring
- **Risk**: Team resistance
  - **Mitigation**: Incremental changes, clear benefits demonstration