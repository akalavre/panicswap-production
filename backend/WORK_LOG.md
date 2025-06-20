# PanicSwap Dashboard Price Updates - Work Log

## Date: June 19, 2025

### Overview
This document details the work done to implement real-time price updates for the PanicSwap dashboard token list. The goal was to have token prices update automatically without page refresh, using only the tokens displayed on the user's dashboard to save API credits.

### Initial Requirements
1. Get latest token prices immediately when tokens are added using Helius RPC
2. Have prices update whenever there's a price change (real-time updates)
3. Backend should only fetch prices for tokens displayed on the dashboard (not all wallet tokens)
4. Frontend should register its displayed tokens with backend, backend polls only those tokens
5. Price updates should flow through Supabase Realtime subscriptions

### Current Status
- ✅ Backend price polling service implemented and working
- ✅ Dashboard token registration endpoint created
- ✅ Supabase real-time subscriptions implemented in frontend
- ✅ Backend successfully polls registered tokens
- ✅ Prices are stored in database
- ❌ Frontend not successfully registering tokens with backend (main issue)
- ❌ External API issues (Jupiter DNS errors, Helius rate limiting)

### Architecture Implemented

#### 1. Backend Components

**PricePollingService** (`/backend/src/services/PricePollingService.ts`)
- Singleton service that polls prices every 1 second
- Maintains a Map of "dashboard tokens" that should be polled
- Dashboard tokens expire after 5 minutes if not refreshed
- Fetches prices from multiple sources (Helius, Jupiter, Raydium)
- Writes prices to `token_prices` and `token_price_history` tables

**Dashboard Token Routes** (`/backend/src/routes/dashboardTokensRoutes.ts`)
- POST `/api/dashboard/register-tokens` - Register tokens for polling
- GET `/api/dashboard/active-tokens` - Check which tokens are being polled
- GET `/api/dashboard/check-prices` - Debug endpoint to check database prices

**Price Discovery Service** (`/backend/src/services/PriceDiscoveryService.ts`)
- Fetches prices from multiple sources with fallbacks
- Handles API rate limiting and network errors
- Caches prices to reduce API calls
- Falls back to database cached prices when APIs unavailable

#### 2. Frontend Components

**Token List V3** (`/components/token-list-v3.php`)
- Displays user's tokens with real-time price updates
- Calls `registerDashboardTokens()` when tokens are loaded
- Re-registers tokens every 30 seconds to keep them active
- Subscribes to Supabase real-time updates for price changes
- Visual feedback (green/red flash) when prices update

**Backend Configuration** (`/assets/js/backend-config.js`)
- Centralizes backend URL configuration
- Sets `window.BACKEND_URL = 'http://localhost:3001'`

### Key Issues Encountered and Solutions

#### 1. PricePollingService Singleton Issue
**Problem**: The service was instantiated twice - once as singleton, once in index.ts
**Solution**: Modified index.ts to use the singleton instance:
```typescript
const { pricePollingService } = require('./services/PricePollingService');
priceService = pricePollingService;
```

#### 2. Dashboard Tokens Not Persisting
**Problem**: Tokens were registered but immediately showed as 0 in next poll
**Solution**: Fixed the cleanup logic to properly maintain dashboard tokens between polls

#### 3. Token Metadata Required for Polling
**Problem**: Price polling only worked for tokens with metadata in database
**Solution**: Dashboard registration now creates minimal metadata for unknown tokens:
```typescript
await supabase
  .from('token_metadata')
  .upsert(
    newMints.map(mint => ({
      mint,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      is_active: true,
      last_active_at: new Date().toISOString()
    })),
    { onConflict: 'mint' }
  );
```

#### 4. Frontend Not Registering Tokens
**Problem**: Frontend code exists but registration calls not being made
**Potential Causes**:
- JavaScript errors preventing execution
- Timing issue - tokens not loaded when registration attempted
- CORS issues (fixed with flexible CORS config)
- Backend URL not properly configured

**Debug Tools Created**:
- `/test-backend-connection.html` - Tests backend connectivity
- `/debug-dashboard.html` - Simplified registration test
- Extensive console logging added throughout

### External API Issues

1. **Jupiter API DNS Errors**
   - `getaddrinfo ENOTFOUND price.jup.ag`
   - API endpoint appears to be blocked or down
   - Implemented fallback to cached database prices

2. **Helius Rate Limiting (429 errors)**
   - Too many requests to Helius RPC
   - Implemented rate limiting and request batching
   - Dashboard-based polling reduces API calls

### Database Schema Used

**token_prices**
- token_mint (primary key)
- symbol
- price
- price_usd
- market_cap
- liquidity
- platform
- updated_at

**token_price_history**
- token_mint
- price
- liquidity
- volume_24h
- market_cap
- recorded_at
- source

**token_metadata**
- mint (primary key)
- symbol
- name
- is_active
- last_active_at

### Testing Commands

```bash
# Test backend connectivity
curl http://localhost:3001/api/dashboard/test

# Register tokens manually
curl -X POST http://localhost:3001/api/dashboard/register-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "test-wallet",
    "tokenMints": [
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "KmiSiaF8nAe5N5pCCdvNHa9Sj8uCNujsnvUpgcag99W"
    ]
  }'

# Check active tokens being polled
curl http://localhost:3001/api/dashboard/active-tokens

# Check prices in database
curl http://localhost:3001/api/dashboard/check-prices
```

### Next Steps to Complete

1. **Debug Frontend Registration**
   - Check browser console for JavaScript errors
   - Verify tokens are loaded before registration
   - Ensure backend URL is accessible from frontend
   - Check if Supabase client is properly initialized

2. **Fix API Connectivity**
   - Investigate Jupiter API DNS issues
   - Consider alternative price APIs
   - Implement more robust fallbacks

3. **Optimize Performance**
   - Reduce polling frequency if needed
   - Implement smarter caching strategies
   - Batch API requests more efficiently

4. **Add Error Recovery**
   - Auto-retry failed registrations
   - Handle network disconnections gracefully
   - Provide user feedback when prices unavailable

### Code Locations

**Backend**
- Main service: `/backend/src/services/PricePollingService.ts`
- Routes: `/backend/src/routes/dashboardTokensRoutes.ts`
- Price fetching: `/backend/src/services/PriceDiscoveryService.ts`
- Configuration: `/backend/src/index.ts` (line 54-59)

**Frontend**
- Token list: `/components/token-list-v3.php`
- Registration function: Line 487-528
- Initialization: Line 388-410
- Backend config: `/assets/js/backend-config.js`

**Debug Pages**
- `/test-backend-connection.html`
- `/debug-dashboard.html`

### Server Logs Analysis

The server logs show:
1. Backend is running correctly
2. "No dashboard tokens to poll" - frontend not registering
3. Jupiter API DNS errors are persistent
4. Helius rate limiting (429) is occurring
5. Some prices exist in database from earlier successful fetches

### How to Continue

1. First, verify frontend is calling registration:
   - Open browser console
   - Look for `[Dashboard]` prefixed messages
   - Check Network tab for `/api/dashboard/register-tokens` calls

2. If no registration calls:
   - Check for JavaScript errors
   - Verify token data is loaded
   - Test with debug pages

3. Once registration works:
   - Monitor server logs for "Polling prices for X tokens"
   - Check database for price updates
   - Verify Supabase real-time updates in frontend

The core functionality is implemented and working. The main issue is the frontend-backend connection for token registration.