# Fix Monitoring Values Guide

This guide explains how to fix the monitoring system when all values are returning zeros.

## Quick Fix Steps

1. **Ensure backend is running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Run the fix script:**
   ```bash
   cd backend
   fix-monitoring.bat
   ```
   Or manually:
   ```bash
   node fix-monitoring-data.js
   ```

3. **Wait 30-60 seconds** for velocity calculations

4. **Test the API:**
   - Open http://localhost/PanicSwap-php/test-monitoring-api.html
   - Click "Test Monitoring Status API"

## What the Fix Does

1. **Updates protected_tokens settings** - Ensures `is_active` and `mempool_monitoring` are true
2. **Seeds pool_liquidity data** - Creates historical liquidity snapshots
3. **Updates token_prices** - Sets current price and liquidity data
4. **Updates token_volumes** - Sets volume metrics
5. **Updates rugcheck_reports** - Sets holder count and risk data
6. **Forces backend tracking** - Calls the force-update endpoint to start monitoring

## Troubleshooting

### Backend not running
If you see "Backend is not reachable", start the backend:
```bash
cd backend
npm run dev
```

### 404 on force-update endpoint
The backend needs to be restarted after code changes:
1. Stop the backend (Ctrl+C)
2. Start it again: `npm run dev`

### Values still showing zeros
1. Check the data exists:
   ```bash
   cd backend
   node check-monitoring-data.js
   ```

2. Wait longer (up to 2 minutes) for velocity calculations

3. Check backend logs for errors

## Testing Tools

- **test-monitoring-api.html** - Web interface to test the API
- **check-monitoring-data.js** - Script to verify database data
- **fix-monitoring-data.js** - Script to seed test data

## Key Database Tables

- `protected_tokens` - Token protection settings
- `monitoring_stats` - Real-time monitoring statistics  
- `pool_liquidity` - Liquidity snapshots over time
- `token_prices` - Current token prices
- `token_volumes` - Trading volume data
- `rugcheck_reports` - Risk analysis and holder data

## How Monitoring Works

1. **LiquidityVelocityTracker** takes snapshots every 30 seconds
2. **MonitoringStatsService** calculates velocity (rate of change)
3. **RugPatternDetector** analyzes patterns for alerts
4. Data is stored in `monitoring_stats` table
5. API reads from `monitoring_stats` with fallbacks to other tables