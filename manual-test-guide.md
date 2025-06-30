# End-to-End Manual Test Guide
## Step 6: Dashboard Testing with ≥4 Tokens

### Overview
This guide walks you through testing the dashboard with a wallet containing 4 or more tokens to trigger batch processing pathways, verify UI functionality, and test error handling scenarios.

### Prerequisites
- Local development environment running (WAMP/XAMPP)
- Backend service running on localhost:3001 (if applicable)
- Browser with developer tools access
- Solana wallet with test tokens or ability to add demo tokens

---

## Test 1: Load Dashboard with ≥4 Tokens (Batch Pathway)

### Setup Steps
1. **Open Dashboard**
   ```
   Navigate to: http://localhost/PanicSwap-php/dashboard.php
   ```

2. **Connect Wallet**
   - Click the wallet connect button
   - Connect using your preferred wallet (Phantom, Solflare, etc.)
   - Ensure wallet has at least 4 different tokens, or proceed to add demo tokens

3. **Add Demo Tokens (if needed)**
   - Use the "Try PanicSwap Protection" section
   - Add tokens one by one using real Solana mint addresses:
     ```
     Example tokens to add:
     - EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC)
     - Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB (USDT) 
     - So11111111111111111111111111111111111111112 (Wrapped SOL)
     - DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 (Bonk)
     ```

### Expected Results ✅
- **Token Count**: Dashboard shows 4+ tokens
- **Batch Processing**: Check console for batch API calls (F12 → Console)
- **Loading State**: Tokens show skeleton loaders initially
- **Data Display**: All tokens appear with:
  - ✅ Correct symbol (e.g., USDC, USDT, SOL, BONK)
  - ✅ Current price (not $0 unless it's actually $0)
  - ✅ Token balance (your holdings)
  - ✅ Protection status (Protected/Not Protected badges)
  - ✅ Risk assessment badges
  - ✅ Token age information
  - ✅ Market data (holders, market cap, etc.)

### Verification Steps
1. **Console Inspection** (F12 → Console)
   ```javascript
   // Look for batch processing logs:
   // "Loading batch data for X tokens"
   // "Batch processing enabled for 4+ tokens"
   ```

2. **Network Tab Inspection** (F12 → Network)
   - Look for batch API calls to `/api/v2/batch.php` or similar
   - Verify efficient data fetching (fewer individual requests)

3. **UI Elements Check**
   - Portfolio value calculation is correct
   - Protected token count updates properly
   - Total tokens count shows 4+

---

## Test 2: Auto-Protect Toggle Verification

### Test Steps
1. **Locate Auto-Protect Toggle**
   - Find the toggle in the top-right of the token list
   - Should show "Auto-Protect" with an OFF toggle initially

2. **Enable Auto-Protect**
   - Click the toggle to enable
   - Watch for loading state and confirmation

3. **Verify State Changes**
   - Toggle should change from gray to green
   - Loading spinner should appear briefly
   - Success notification should display

### Expected Results ✅
- **Visual Feedback**: Toggle animates to "ON" position (green)
- **Notification**: Success message appears
- **Token States**: All unprotected tokens should become protected
- **Button States**: Individual protection buttons should become disabled/grayed out
- **Console**: No error messages in console

### Verification Commands (Console)
```javascript
// Check auto-protect state
console.log('Auto-protect enabled:', window.tokenListV3State?.autoProtectEnabled);

// Check token protection states
window.tokenListV3State?.tokens.forEach(token => {
    console.log(`${token.symbol}: ${token.protected ? 'Protected' : 'Not Protected'}`);
});
```

4. **Disable Auto-Protect**
   - Click toggle again to disable
   - Verify all tokens become unprotected
   - Individual protection buttons should become enabled again

---

## Test 3: Console Error Verification

### During Normal Operation
1. **Open Developer Console** (F12 → Console)
2. **Perform All Actions** while monitoring console:
   - Load dashboard
   - Toggle auto-protect ON/OFF
   - Click individual protection buttons
   - Refresh token data

### Expected Results ✅
- **No JavaScript Errors**: Console should be clean of red error messages
- **Normal Logs Only**: Only informational logs should appear
- **Network Requests**: All API calls should return successful responses (200-299 status codes)

### Common Issues to Watch For ❌
```javascript
// These should NOT appear:
"Uncaught TypeError: Cannot read property"
"Failed to fetch"
"Supabase client not available" 
"Network request failed"
"Auto-protect toggle error"
```

---

## Test 4: Error Handling & Graceful Degradation

### Scenario A: Disconnect Internet
1. **Disconnect Network**
   - Disconnect Wi-Fi or unplug ethernet
   - Or use browser dev tools → Network → Offline

2. **Attempt Operations**
   - Try toggling auto-protect
   - Try refreshing token data
   - Try protecting individual tokens

3. **Expected Behavior** ✅
   - Error notifications appear explaining network issues
   - UI doesn't break or become unresponsive
   - Previous data remains visible
   - Buttons return to normal state after failed operations

### Scenario B: Force Backend 500 Errors
1. **Simulate Server Errors** (if possible)
   - Stop backend service temporarily
   - Or modify API endpoints to return 500 errors

2. **Test Operations**
   - Auto-protect toggle
   - Token protection actions
   - Data refresh

3. **Expected Behavior** ✅
   - User-friendly error messages (not raw error codes)
   - Graceful fallback to cached data
   - UI remains functional
   - Clear indication of what failed and why

### Network Tab Verification
```
F12 → Network Tab → Look for:
✅ Proper error handling for 4xx/5xx responses
✅ Retry mechanisms for failed requests
✅ Fallback API endpoints being used
❌ Infinite retry loops
❌ Unhandled promise rejections
```

---

## Test 5: Performance & Responsiveness

### With 4+ Tokens Loaded
1. **Page Load Performance**
   - Dashboard should load within 3-5 seconds
   - Token data should populate progressively
   - No UI freezing during batch operations

2. **Interaction Responsiveness**
   - Auto-protect toggle responds immediately
   - Individual protection buttons work smoothly
   - Scrolling and navigation remain smooth

3. **Memory Usage** (F12 → Performance)
   - No significant memory leaks
   - Reasonable CPU usage during operations

---

## Success Criteria Summary

### ✅ Dashboard Functionality
- [ ] Dashboard loads with 4+ tokens successfully
- [ ] Batch processing pathway is triggered and working
- [ ] All token information displays correctly (symbol, price, balance, protection status)
- [ ] Portfolio calculations are accurate

### ✅ Auto-Protect Feature
- [ ] Toggle changes state smoothly (ON/OFF)
- [ ] Visual feedback is clear and immediate
- [ ] Token protection states update correctly
- [ ] No console errors during toggle operations

### ✅ Error Handling
- [ ] Network disconnection handled gracefully
- [ ] Backend errors display user-friendly messages
- [ ] UI remains functional during error states
- [ ] Operations fail gracefully without breaking the interface

### ✅ Performance
- [ ] Page loads within acceptable time (< 5 seconds)
- [ ] Batch operations don't freeze the UI
- [ ] Smooth user interactions throughout testing

---

## Troubleshooting Common Issues

### Issue: Tokens Not Loading
```javascript
// Debug steps:
1. Check console for errors
2. Verify wallet connection: console.log(window.walletState?.getState())
3. Check Supabase connection: console.log(window.supabaseClient)
4. Manually trigger load: loadTokensV3()
```

### Issue: Auto-Protect Not Working
```javascript
// Debug steps:
1. Check toggle state: console.log(document.getElementById('auto-protect-v3').checked)
2. Verify API endpoint: Check Network tab for /api/auto-protection/bulk-toggle.php
3. Check for wallet address: console.log(localStorage.getItem('walletAddress'))
```

### Issue: Batch Processing Not Triggered
```javascript
// Debug steps:
1. Confirm token count: console.log(window.tokenListV3State?.tokens?.length)
2. Check for batch API calls in Network tab
3. Look for "batch" mentions in console logs
```

---

## Completion Checklist

- [ ] Dashboard loaded with ≥4 tokens
- [ ] Verified correct display of all token information
- [ ] Auto-protect toggle tested (ON and OFF)
- [ ] Console verified clean of errors during normal operation
- [ ] Network disconnection error handling tested
- [ ] Backend error simulation completed
- [ ] Performance observed as acceptable
- [ ] All functionality remains responsive

**Test Result: ✅ PASS / ❌ FAIL**

*Notes: Record any issues found and their severity level*
