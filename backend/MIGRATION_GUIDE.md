# Migration Guide: From Singleton Services to Domain-Driven Architecture

## Overview
This guide explains how to migrate from the current singleton-based architecture to the new domain-driven, dependency-injected architecture.

## What's Changed

### Before (Singleton Pattern)
```typescript
// Old way - tight coupling, hard to test
import { pricePollingService } from './services/PricePollingService';
import { helius } from './utils/heliusClient';

pricePollingService.addDashboardToken('token123');
const price = await helius.rpc.getAsset({ id: 'token123' });
```

### After (Dependency Injection)
```typescript
// New way - loose coupling, testable
import { container } from '@infrastructure/container';
import { TYPES } from '@infrastructure/container/types';
import { IPriceProvider } from '@domains/pricing/interfaces';

const priceProvider = container.get<IPriceProvider>(TYPES.CompositePriceProvider);
const result = await priceProvider.getPrice('token123');
```

## Migration Steps

### Phase 1: Parallel Running (Week 1)

1. **Keep existing code running** - Don't remove any existing services yet
2. **Add new architecture alongside** - The new code is in `/src/domains` and `/src/infrastructure`
3. **Create adapter layer** - Bridge between old and new systems

```typescript
// adapters/LegacyPriceAdapter.ts
import { container } from '@infrastructure/container';
import { IPriceProvider } from '@domains/pricing/interfaces';
import { TYPES } from '@infrastructure/container/types';

export class LegacyPriceAdapter {
  private newProvider: IPriceProvider;
  
  constructor() {
    this.newProvider = container.get<IPriceProvider>(TYPES.CompositePriceProvider);
  }
  
  // Mimics old PriceDiscoveryService interface
  async getTokenPrice(mint: string): Promise<number> {
    try {
      const result = await this.newProvider.getPrice(mint);
      return result.price;
    } catch (error) {
      console.error('New provider failed, falling back to old', error);
      // Fall back to old service
      return 0;
    }
  }
}
```

### Phase 2: Gradual Service Migration (Week 2)

#### Migrate PricePollingService

Old:
```typescript
class PricePollingService {
  private dashboardTokens = new Map();
  private async pollPrices() {
    // Mixed concerns: scheduling, fetching, storing
  }
}
```

New (separated concerns):
```typescript
// PriceScheduler - only handles scheduling
@injectable()
class PriceScheduler {
  constructor(
    @inject(TYPES.PriceService) private priceService: IPriceService,
    @inject(TYPES.DashboardTokenManager) private tokenManager: IDashboardTokenManager
  ) {}
  
  async schedulePriceUpdates(intervalMs: number): Promise<void> {
    setInterval(async () => {
      const tokens = await this.tokenManager.getActiveTokens();
      await this.priceService.updatePrices(tokens);
    }, intervalMs);
  }
}

// DashboardTokenManager - only manages tokens
@injectable()
class DashboardTokenManager {
  private tokens = new Map<string, TokenRegistration>();
  
  addToken(mint: string): void {
    this.tokens.set(mint, {
      mint,
      addedAt: Date.now(),
      lastSeen: Date.now()
    });
  }
  
  getActiveTokens(): string[] {
    return Array.from(this.tokens.keys());
  }
}
```

### Phase 3: Update API Routes (Week 3)

Replace direct service usage in routes:

Old:
```typescript
// routes/dashboardTokensRoutes.ts
import { pricePollingService } from '../services/PricePollingService';

router.post('/api/dashboard/register-tokens', async (req, res) => {
  pricePollingService.addDashboardToken(mint);
});
```

New:
```typescript
// routes/dashboardTokensRoutes.ts
import { container } from '@infrastructure/container';
import { TYPES } from '@infrastructure/container/types';

router.post('/api/dashboard/register-tokens', async (req, res) => {
  const tokenManager = container.get<IDashboardTokenManager>(TYPES.DashboardTokenManager);
  tokenManager.addToken(mint);
});
```

### Phase 4: Remove Old Code (Week 4)

1. **Verify all routes use new services**
2. **Run comprehensive tests**
3. **Monitor for errors in production**
4. **Remove old singleton services**
5. **Clean up unused imports**

## Testing Strategy

### Unit Tests
```typescript
describe('HeliusPriceProvider', () => {
  let provider: HeliusPriceProvider;
  let mockClient: Mock<Helius>;
  let mockCache: Mock<ICache>;
  
  beforeEach(() => {
    mockClient = createMock<Helius>();
    mockCache = createMock<ICache>();
    
    provider = new HeliusPriceProvider(
      mockClient,
      new TokenBucketRateLimiter(10, 1000),
      mockCache,
      testConfig
    );
  });
  
  it('should return cached price when fresh', async () => {
    // Given
    mockCache.get.mockResolvedValue({
      price: 100,
      timestamp: Date.now(),
      confidence: 0.9,
      source: 'Helius'
    });
    
    // When
    const result = await provider.getPrice('token123');
    
    // Then
    expect(result.price).toBe(100);
    expect(mockClient.rpc.getAsset).not.toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('Price System Integration', () => {
  let container: Container;
  
  beforeEach(() => {
    container = new Container();
    // Configure test container with mocks
    configureTestContainer(container);
  });
  
  it('should get price through composite provider', async () => {
    const provider = container.get<IPriceProvider>(TYPES.CompositePriceProvider);
    const result = await provider.getPrice('So11111111111111111111111111111111111111112');
    
    expect(result).toBeDefined();
    expect(result.price).toBeGreaterThan(0);
  });
});
```

## Common Patterns

### 1. Getting a Service
```typescript
const priceService = container.get<IPriceService>(TYPES.PriceService);
```

### 2. Mocking for Tests
```typescript
container.rebind<IPriceProvider>(TYPES.HeliusPriceProvider)
  .toConstantValue(mockProvider);
```

### 3. Adding New Provider
```typescript
// 1. Create provider class
@injectable()
export class NewPriceProvider implements IPriceProvider {
  // Implementation
}

// 2. Add to container bindings
bind<IPriceProvider>(TYPES.PriceProvider)
  .to(NewPriceProvider)
  .whenTargetNamed('new');
```

### 4. Configuration Access
```typescript
@injectable()
class MyService {
  constructor(@inject(TYPES.Config) private config: Config) {
    // Use config.providers.helius.apiKey etc
  }
}
```

## Troubleshooting

### "Cannot inject dependency" Error
- Ensure class has `@injectable()` decorator
- Check that dependency is bound in container
- Verify `reflect-metadata` is imported

### "Circular dependency" Error
- Use `@lazyInject` or interfaces to break cycles
- Consider if the design needs refactoring

### Performance Issues
- Check if services should be singleton vs transient
- Monitor cache hit rates
- Profile provider response times

## Benefits After Migration

1. **Testability** - Mock any dependency easily
2. **Flexibility** - Swap implementations without changing code
3. **Monitoring** - Built-in metrics and health checks
4. **Reliability** - Circuit breakers and fallbacks
5. **Maintainability** - Clear separation of concerns