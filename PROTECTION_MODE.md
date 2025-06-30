# Protection Mode Implementation

This document outlines the implementation of protection modes in PanicSwap, which distinguishes between users who can execute automatic swaps versus those who only receive alerts.

## Overview

PanicSwap now supports two protection modes:

1. **Full Protection Mode** (`protection_mode === "full"`)
   - Enables automatic swap execution when rug pulls are detected
   - Includes all monitoring, alerts, and scans
   - Requires premium subscription or explicit opt-in

2. **Watch-Only Mode** (`protection_mode === "watch-only"`) 
   - Provides monitoring, alerts, and scans
   - Does NOT execute automatic swaps
   - Default mode for free users and watch-only subscribers

## Implementation Details

### Database Changes

#### Subscriptions Table
- Added `protection_mode` column to `subscriptions` table
- Default value: `'watch-only'`
- Constraint: `CHECK (protection_mode IN ('full', 'watch-only'))`
- Migration script: `003_add_protection_mode.sql`

### Backend Changes

#### New Utility Module
- **File**: `backend/src/utils/subscriptionUtils.ts`
- **Functions**:
  - `getUserSubscription(walletAddress)` - Get user subscription details
  - `hasFullProtectionMode(walletAddress)` - Check if user has full protection
  - `canExecuteSwaps(walletAddress)` - Check if swaps can be executed
  - `canReceiveAlerts(walletAddress)` - Check if alerts can be received (always true)
  - `getProtectionCapabilities(walletAddress)` - Get complete protection status

#### Protection Service Updates
- **File**: `backend/src/protect/SimpleRugPullDetector.ts`
- Added protection mode checks before executing swaps
- Watch-only users still receive alerts via `rugpull_alerts` table

#### Swap Service Updates  
- **File**: `backend/src/protect/SwapService.ts`
- Added protection mode validation in `executeEmergencySell()`
- Watch-only users receive alert instead of swap execution

#### Pool Monitoring Updates
- **File**: `backend/src/services/PoolMonitoringService.ts`  
- Added per-user protection mode checks before triggering swaps
- Broadcasts different actions based on user's protection mode

### API Endpoint Changes

#### Auto-Sell Endpoints
- **Files**: 
  - `api/auto-sell/delegate.php`
  - `api/auto-sell/hot-wallet.php`
- Added protection mode validation
- Returns 403 error for watch-only users attempting swap setup

#### Protection Routes
- **File**: `backend/src/protect/protectionRoutes.ts`
- Added protection mode check for manual swap execution
- Watch-only users receive appropriate error message

### Frontend Changes

#### Protection Toggle
- **File**: `assets/js/protection-toggle.js`
- Added `checkUserProtectionMode()` function
- Shows warning message for watch-only users
- Still allows enabling monitoring/alerts for watch-only users

#### Dashboard Integration
- Protection mode status displayed in UI
- Watch-only badge shown instead of toggle for restricted users
- Graceful degradation for users without full access

## User Experience

### Full Protection Users
- Can enable/disable auto-protection toggles
- Receive instant swap execution on rug detection
- Get all monitoring, alerts, and scans
- Can set up hot wallets and delegate permissions

### Watch-Only Users  
- Receive all monitoring and alerts
- See "Watch Only" badges instead of toggle controls
- Get warning messages when attempting swap setup
- Can still protect tokens for monitoring purposes

## Backward Compatibility

### Existing Users
- Premium plan users (`pro`, `enterprise`, `degen-mode`) automatically get `protection_mode = 'full'`
- Free users default to `protection_mode = 'watch-only'`
- Migration preserves existing functionality

### Legacy Support
- If `protection_mode` field is missing, falls back to plan-based detection
- API endpoints gracefully handle missing subscription data
- Default to watch-only mode on errors for safety

## Configuration

### Plan Mapping
```javascript
const premiumPlans = ['pro', 'enterprise', 'degen-mode'];
const hasFullAccess = premiumPlans.includes(subscription.plan.toLowerCase());
```

### Default Settings
- New subscriptions: `protection_mode = 'watch-only'`
- Premium upgrades: Automatically set to `'full'`
- Downgrades: Remain at current mode unless explicitly changed

## Security Considerations

- Always default to watch-only mode on errors
- Validate protection mode on every critical operation
- Prevent swap execution for unauthorized users
- Maintain audit trail of protection mode changes

## Testing

### Key Test Cases
1. **Full Protection Users**
   - Can execute automatic swaps
   - Can set up hot wallets
   - Receive all alerts and monitoring

2. **Watch-Only Users**
   - Cannot execute swaps (receive alerts instead)
   - Cannot set up auto-execution features
   - Still receive monitoring and alerts

3. **Edge Cases**
   - Missing subscription data
   - Invalid protection modes
   - Network errors during validation

## Future Enhancements

- User-controlled protection mode toggle in dashboard
- Granular permissions (e.g., manual swaps only)
- Time-limited full protection trials
- Protection mode analytics and usage tracking

## API Reference

### Check Protection Capabilities
```javascript
import { getProtectionCapabilities } from '../utils/subscriptionUtils';

const capabilities = await getProtectionCapabilities(walletAddress);
// Returns: { canExecuteSwaps: boolean, canReceiveAlerts: boolean, protectionMode: 'full'|'watch-only', plan: string }
```

### Validate Swap Permission
```javascript
import { canExecuteSwaps } from '../utils/subscriptionUtils';

const canExecute = await canExecuteSwaps(walletAddress);
if (!canExecute) {
  // Show watch-only message, don't execute swap
}
```
