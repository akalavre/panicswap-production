# TokenDataManager Smoke Tests

This directory contains automated smoke tests for the `TokenDataManager.getMultipleTokensData()` functionality.

## Test Files

### 1. Jest-based Test: `token-data-manager.test.js`

**Purpose**: Comprehensive Jest-based unit tests that mock fetch responses and validate field names, types, and functionality.

**Features**:
- ✅ Mocks `fetch` to return saved API responses from step 1
- ✅ Tests `TokenDataManager.getMultipleTokensData([...], 'WALLET')` with various scenarios
- ✅ Validates that the result resolves to an array with expected field names & types
- ✅ Tests field mapping from nested API response structures to flat frontend format
- ✅ Validates calculated fields (balance_ui, value, etc.)
- ✅ Tests error handling and edge cases
- ✅ Tests both individual and batch API call patterns

**Run Command**:
```bash
npx jest assets/js/tests/token-data-manager.test.js --verbose
```

### 2. Browser-based Test: `token-data-manager-browser.html`

**Purpose**: Interactive browser-based test that can be opened directly in a web browser.

**Features**:
- ✅ Self-contained HTML file with embedded test logic
- ✅ Visual test results with pass/fail indicators
- ✅ Same core validation as Jest tests but browser-runnable
- ✅ Useful for debugging in browser console

**Run Instructions**:
1. Open `token-data-manager-browser.html` in a web browser
2. Click "Run Tests" button
3. View test results directly in the page

## Test Coverage

The tests validate the following aspects of `TokenDataManager.getMultipleTokensData()`:

### Core Functionality
- [x] Returns array when called with valid token mints and wallet address
- [x] Handles empty token arrays gracefully
- [x] Handles missing/null wallet address gracefully
- [x] Filters out failed/null token responses

### API Behavior
- [x] Uses individual API calls for small batches (≤3 tokens)
- [x] Uses batch API endpoint for larger batches (>3 tokens)
- [x] Handles API errors gracefully
- [x] Handles network errors gracefully

### Field Names & Types Validation
- [x] **Core identifiers**: `token_mint` (string), `wallet_address` (string)
- [x] **Token metadata**: `symbol` (string), `name` (string), `image`/`logo_uri`/`logo_url`
- [x] **Price data**: `price` (number), `price_change_24h` (number), `price_change_5m` (number), `price_change_1m` (number)
- [x] **Balance & value**: `balance` (number), `balance_ui` (number), `decimals` (number), `value` (number), `userValue` (number)
- [x] **Market data**: `liquidity_usd` (number), `volume_24h` (number), `market_cap` (number), `holder_count` (number)
- [x] **Monitoring & protection**: `monitoring_active` (boolean), `protected` (boolean)
- [x] **Risk data**: `risk_score` (number), `risk_level` (string)
- [x] **Developer activity**: `dev_activity_pct` (number), `creator_balance_pct` (number)
- [x] **Timestamps & status**: `age`, `created_at`, `last_update` (string), `badge_state`, `sell_signal`, `status` (string)
- [x] **Flags**: `is_test_token` (boolean), `is_newly_added` (boolean), `added_at`

### Field Mapping & Calculations
- [x] Maps nested API response fields to flat frontend structure:
  - `monitoring.active` → `monitoring_active`
  - `protection.isActive` → `protected`
  - `risk.score` → `risk_score`
  - `risk.level` → `risk_level`
  - `developerActivity.percentage` → `dev_activity_pct`
  - `developerActivity.creatorBalance` → `creator_balance_pct`
- [x] Calculates derived fields correctly:
  - `balance_ui` = `balance` / 10^`decimals`
  - `value` = `balance_ui` * `price`
  - `age` calculation from `createdAt`/`created_at`

## Mock Data

The tests use realistic mock data based on actual API responses:

1. **Basic Response**: Simple tokens with minimal data (from `batch-api-response.json`)
2. **Enhanced Response**: Realistic USDC and SOL tokens with full market data
3. **Field Mapping Response**: Token with various field name formats to test mapping logic

## Test Results

**Status**: ✅ All tests passing (10/10)

The automated smoke tests successfully validate that:
- `TokenDataManager.getMultipleTokensData()` returns properly structured token data
- All expected field names and types are present in the response
- Field mapping from API response to frontend format works correctly
- Calculated fields (balance_ui, value) are computed accurately
- Error handling works as expected

## Usage in CI/CD

These tests can be integrated into automated workflows:

```bash
# Run as part of CI pipeline
npm test -- --testPathPattern=token-data-manager.test.js

# Or run all tests
npm test
```

## Next Steps

- These tests can be extended to cover additional edge cases
- Performance testing could be added for large token batches
- Integration tests could be added to test with real API endpoints
- WebSocket functionality testing could be added for real-time updates
