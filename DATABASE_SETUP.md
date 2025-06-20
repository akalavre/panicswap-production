# PanicSwap Database Setup & Architecture

## Overview
PanicSwap uses Supabase (PostgreSQL) as its primary database. The system tracks tokens, prices, user wallets, and protection settings across multiple tables.

## Core Tables

### 1. `token_metadata`
Stores basic information about all tokens.

**Columns:**
- `mint` (text, PRIMARY KEY) - Token mint address
- `symbol` (text) - Token symbol (e.g., "SOL", "USDC")
- `name` (text) - Full token name
- `decimals` (integer) - Token decimals (default: 9)
- `logo_uri` (text) - Token logo URL
- `logo_url` (text) - Alternative logo URL field
- `platform` (text) - Trading platform ("raydium", "pump.fun", etc.)
- `is_active` (boolean) - Whether token is actively traded
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Additional fields: `verified`, `website`, `twitter`, `telegram`, etc.

**Note:** No `pool_address` column exists (removed in recent update)

### 2. `wallet_tokens`
Tracks tokens in user wallets (both real and demo).

**Columns:**
- `wallet_address` (text) - User's wallet address
- `token_mint` (text) - Token mint address (FK to token_metadata.mint)
- `balance` (numeric) - Token balance
- `decimals` (integer, default: 9)
- `is_test_token` (boolean, default: false) - Marks demo tokens
- `added_at` (timestamp)
- `last_seen_at` (timestamp)

**Constraints:**
- PRIMARY KEY: (`wallet_address`, `token_mint`)
- FOREIGN KEY: `token_mint` references `token_metadata(mint)`

### 3. `token_prices`
Current token prices (updated every second by backend).

**Columns:**
- `token_mint` (text, PRIMARY KEY)
- `symbol` (text)
- `price` (numeric) - Price in USD
- `price_usd` (numeric) - Same as price
- `platform` (text)
- `market_cap` (numeric)
- `liquidity` (numeric)
- `volume_24h` (numeric)
- `price_change_24h` (numeric)
- `updated_at` (timestamp)

### 4. `token_price_history`
Historical price data logged by backend PricePollingService.

**Columns:**
- `token_mint` (text)
- `price` (numeric)
- `liquidity` (numeric)
- `volume_24h` (numeric)
- `market_cap` (numeric)
- `recorded_at` (timestamp)
- `source` (text) - Usually "price_polling"

**RLS Policies:**
- Public read access enabled
- Public insert access enabled
- Service role has full access

### 5. `protected_tokens`
User protection settings for tokens.

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `wallet_address` (text) - User's wallet
- `token_mint` (text) - Token to protect
- `token_symbol` (text)
- `token_name` (text)
- `is_active` (boolean)
- `monitoring_enabled` (boolean)
- `monitoring_active` (boolean)
- `price_threshold` (numeric) - Price drop % to trigger
- `liquidity_threshold` (numeric) - Liquidity drop % to trigger
- `max_slippage_bps` (integer, default: 500)
- `swap_to_sol` (boolean, default: true)
- `dev_wallet_monitoring` (boolean)
- `gas_boost` (numeric, default: 1.5)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Constraints:**
- UNIQUE: (`wallet_address`, `token_mint`)

### 6. `rugcheck_reports`
Risk analysis data for tokens.

**Columns:**
- `token_mint` (text, PRIMARY KEY)
- `risk_score` (numeric)
- `risk_level` (text)
- `holders` (integer) - Note: NOT `holder_count`
- `creator_balance_percent` (numeric)
- `lp_locked` (boolean)
- `honeypot_status` (text)
- `dev_activity_pct` (numeric)
- `liquidity_current` (numeric)
- `warnings` (jsonb)
- Many other risk-related fields...

### 7. `pump_fun_monitoring`
Specific monitoring for pump.fun tokens.

**Columns:**
- `token_mint` (text)
- `creator` (text)
- `sol_reserves` (numeric)
- `token_reserves` (numeric)
- `is_complete` (boolean)
- `total_holders` (integer)
- `risk_score` (numeric)
- Various other pump.fun specific fields...

## Backend Services

### PricePollingService
- Polls token prices every 1 second
- Updates both `token_prices` (current) and `token_price_history` (historical)
- **Only polls tokens displayed on user dashboards** (registered via API)
- This saves Helius API credits by only polling visible tokens
- Dashboard tokens are tracked with 5-minute timeout
- Logs market cap and liquidity data

**Dashboard-Based Polling Flow:**
1. Frontend loads tokens for user's dashboard
2. Frontend sends token list to `/api/dashboard/register-tokens`
3. Backend tracks these tokens in `dashboardTokens` Map
4. PricePollingService only fetches prices for registered dashboard tokens
5. Tokens are automatically removed after 5 minutes of inactivity
6. Updates flow to frontend via Supabase Realtime subscriptions

**Benefits:**
- Minimal API usage - only polls visible tokens
- Automatic cleanup of inactive tokens
- Real-time updates for all dashboard tokens
- Scales with actual usage, not wallet contents

### Token Discovery Flow
1. User enters token mint address
2. Frontend checks `token_metadata`
3. If not found, calls backend `/api/tokens/enrich-test`
4. Backend fetches from blockchain using:
   - Helius getAsset API for comprehensive token data
   - Fallback to Solana RPC if Helius fails
5. Saves to `token_metadata` including:
   - Basic fields: symbol, name, decimals, logo_uri
   - Social links: website, twitter, telegram, discord
   - Full Helius data in `helius_data` JSONB column (if available)
6. Returns enriched data to frontend

## Demo Token System

### How Demo Tokens Work:
1. User must be connected with real wallet
2. Demo tokens are added to user's REAL wallet in `wallet_tokens`
3. Marked with `is_test_token: true`
4. Given large balances (1M tokens)
5. Automatically protected with default settings
6. Show up in main dashboard alongside real tokens

### Demo Token Addition Flow:
```javascript
// Frontend adds to user's real wallet
await supabaseClient.from('wallet_tokens').upsert({
    wallet_address: walletAddress,  // User's real wallet
    token_mint: tokenAddress,
    balance: '1000000000000000',
    decimals: 9,
    is_test_token: true
});
```

## Important Notes

### Foreign Key Constraints:
- `wallet_tokens.token_mint` MUST exist in `token_metadata.mint`
- Always insert/upsert to `token_metadata` before `wallet_tokens`

### Column Name Fixes:
- Use `holders` NOT `holder_count` in rugcheck_reports
- No `pool_address` in token_metadata
- Use `logo_uri` or `logo_url` for token images

### Real-time Updates:
- All table updates trigger Supabase Realtime broadcasts
- Frontend subscribes to changes via Supabase client
- No separate WebSocket needed for database updates

### API Endpoints:
- `/api/tokens/enrich-test` - Fetch token from blockchain
- `/api/tokens/:mint` - Get token metadata
- `/api/price/:mint` - Deprecated (use Supabase Realtime)

## Real-time Price Updates

### Backend Flow
When a token is added via `/api/tokens/enrich-test`:
1. Helius getAsset provides immediate USD price (price_per_token)
2. Price is stored in `token_prices` table
3. Price history is logged to `token_price_history`
4. Token is added to immediate polling queue
5. PricePollingService continues updating every second

### Frontend Real-time Updates
The dashboard subscribes to Supabase Realtime for live updates:
1. **Price Updates**: When `token_prices` changes, dashboard updates immediately
   - Price cells flash green/red based on direction
   - Portfolio value recalculates automatically
   - No page refresh needed
2. **Rugcheck Updates**: Risk scores and analysis update live
3. **Protection Updates**: Protection status changes reflect instantly

### Subscription Setup
```javascript
// Frontend subscribes to price changes
supabaseClient
  .channel('token-prices-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'token_prices'
  }, (payload) => {
    updateTokenPriceV3(payload.new);
  })
  .subscribe();
```

## Environment Variables
Backend requires:
```
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_SERVICE_KEY=<service_key>
HELIUS_RPC_URL=<helius_url>
HELIUS_API_KEY=<helius_key>
```

Frontend uses:
```javascript
const SUPABASE_URL = 'https://cfficjjdhgqwqprfhlrj.supabase.co';
const SUPABASE_ANON_KEY = '<anon_key>';
```

## Common Queries

### Get user's tokens with all data:
```sql
SELECT wt.*, tm.*, tp.*, rr.*
FROM wallet_tokens wt
JOIN token_metadata tm ON wt.token_mint = tm.mint
LEFT JOIN token_prices tp ON wt.token_mint = tp.token_mint
LEFT JOIN rugcheck_reports rr ON wt.token_mint = rr.token_mint
WHERE wt.wallet_address = '<wallet_address>'
```

### Get price history for charts:
```sql
SELECT * FROM token_price_history
WHERE token_mint = '<mint>'
ORDER BY recorded_at DESC
LIMIT 100
```

### Check if token is protected:
```sql
SELECT * FROM protected_tokens
WHERE wallet_address = '<wallet>' 
AND token_mint = '<mint>'
AND is_active = true
```

## Troubleshooting

### Common Errors:
1. **"violates foreign key constraint"** - Token must exist in token_metadata first
2. **"column does not exist"** - Check column names (holders vs holder_count)
3. **406 Not Acceptable** - Usually RLS policy or using .single() on empty result
4. **"Database connection not available"** - Supabase client not initialized

### Debug Steps:
1. Check Supabase client initialization in browser console
2. Verify backend is running (localhost:3001)
3. Check browser network tab for API calls
4. Look for RLS policy violations in Supabase logs
5. Ensure token exists in token_metadata before adding to wallet