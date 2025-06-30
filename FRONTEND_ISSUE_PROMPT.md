# Frontend Dashboard Token Display Issue

## Current Status
The dashboard token list (token-list-v3) is mostly working but has some issues that need investigation and fixing.

## Issues Fixed
1. ✅ Token value column now displays correctly (was showing $0.0000 for small values)
   - Fixed number formatting to show scientific notation for very small values
   - Fixed market cap data flow from API response

2. ✅ Token balances now display correctly as 1M tokens
   - Updated test tokens in database from raw balance 1,000,000 to 1,000,000,000,000
   - This ensures tokens with 6 decimals show as 1M tokens (1,000,000,000,000 / 10^6 = 1,000,000)

## Remaining Issue
There's a 500 error occurring when the system tries to protect tokens:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
dashboard:4530 Response from Node.js backend : {"error":"Failed to add protected token"}
```

## Investigation Needed
1. Find where "Response from Node.js backend" error message is being logged in the frontend
2. Trace the API call that's failing with 500 error
3. Check if the backend `/api/protect` endpoint is being called correctly
4. Verify the request payload matches what the backend expects

## Technical Context
- Frontend uses `SupabaseTokenFetcher` to load token data
- Token protection is managed through `protected_tokens` table in Supabase
- Backend has a ProtectionService that expects specific field formats
- The error suggests a mismatch between frontend API calls and backend expectations

## Files to Check
- `/assets/js/protection*.js` - Protection-related frontend code
- `/backend/src/protect/protectionRoutes.ts` - Backend protection endpoints
- `/backend/src/services/ExpressApiService.ts` - Main API service
- Browser DevTools Network tab to see exact API request/response

## Next Steps
1. Identify the exact API endpoint being called when the 500 error occurs
2. Compare the request payload with what the backend expects
3. Fix any mismatches in data format or required fields
4. Test the protection functionality end-to-end