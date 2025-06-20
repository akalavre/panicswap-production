# Wallet-Based Token Price Architecture

## Overview

Instead of fetching prices for ALL tokens discovered (which causes rate limiting), we only fetch prices for tokens that users actually hold in their wallets. This dramatically reduces API calls and improves efficiency.

## How It Works

### 1. Wallet Connection Flow
```
User Connects Wallet → Backend Syncs SPL Tokens → Mark as Active → Poll Prices
```

### 2. Token States

- **Active Tokens**: Tokens found in user wallets (is_active = true)
  - Prices are fetched every 30 seconds
  - Webhook updates applied in real-time
  - Shown in frontend dashboard

- **Inactive Tokens**: Discovered tokens not in any wallet (is_active = false)
  - No price polling (saves API calls)
  - Still stored in database
  - Can be activated if found in a wallet

### 3. API Endpoints

#### Sync Wallet Tokens
```bash
POST /api/wallet/sync
Body: { "walletAddress": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" }

Response: {
  "success": true,
  "tokensFound": 15,
  "tokens": ["mint1...", "mint2...", ...]
}
```

#### Get Active Tokens
```bash
GET /api/wallet/tokens/:walletAddress

Response: {
  "success": true,
  "walletAddress": "...",
  "tokens": [
    {
      "mint": "...",
      "symbol": "USDC",
      "name": "USD Coin",
      "price": 1.0,
      "balance": 1000.50
    }
  ]
}
```

## Database Changes

✅ **Applied via Supabase MCP on January 2025**

```sql
-- Added to token_metadata table
is_active BOOLEAN DEFAULT false
last_active_at TIMESTAMP WITH TIME ZONE

-- New table for tracking sync history
wallet_sync_history (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  tokens_found INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  error_message TEXT
)
```

**Current Status:**
- Total tokens in database: 30,876
- Active tokens: 0 (will be populated when wallets sync)
- All tokens set to inactive by default

## Benefits

1. **Reduced API Calls**: From 1000+ to <50 per minute
2. **Relevant Data**: Only track tokens users care about
3. **Better Performance**: Less data to process
4. **Cost Savings**: Fewer API calls = lower costs

## Frontend Integration

```typescript
// When wallet connects
const syncWallet = async (walletAddress: string) => {
  try {
    const response = await fetch('/api/wallet/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    
    const data = await response.json();
    console.log(`Synced ${data.tokensFound} tokens`);
    
    // Now fetch and display active tokens
    fetchActiveTokens();
  } catch (error) {
    console.error('Wallet sync failed:', error);
  }
};
```

## Testing

```bash
# Test wallet sync
npx ts-node test-wallet-sync.ts

# Monitor API calls
npx ts-node monitor-api-calls.ts
```

## Configuration

- **Polling Interval**: 30 seconds (configurable)
- **Active Token Limit**: 50 tokens per poll
- **Cache Duration**: 30 seconds
- **Webhook Priority**: Real-time updates override polling

## Future Enhancements

1. **Multi-Wallet Support**: Track tokens across multiple wallets
2. **Token Watchlist**: Allow manual token tracking
3. **Historical Balances**: Track balance changes over time
4. **Smart Refresh**: Only sync when wallet activity detected
5. **Token Categories**: Group tokens by type/platform