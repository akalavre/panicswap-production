# PanicSwap Dashboard Architecture Documentation

## Overview
PanicSwap is a Solana token protection platform with a PHP frontend and Node.js backend. The dashboard allows users to monitor their tokens for potential rug pulls and enable automatic protection.

## Frontend Structure (dashboard.php)

### Main Dashboard File (`dashboard.php`)
- Entry point for authenticated users
- Includes header, navigation, and main content areas
- Loads various JavaScript modules for functionality
- Integrates wallet connection via Solana Wallet Adapter

### Token List Component (`components/token-list-v3.php`)
- Displays user's tokens in a grid/list format
- Shows real-time data: price, liquidity, risk level
- Includes protection toggle and settings per token
- Uses placeholder loading states while fetching data

### Key JavaScript Modules

#### 1. **SupabaseTokenFetcher** (`assets/js/supabase-token-fetcher.js`)
- Fetches user's tokens from Supabase database
- Queries `wallet_tokens` table with user's wallet address
- Enriches data using UnifiedTokenDataService
- Handles pagination and filtering

#### 2. **UnifiedTokenDataService** (`assets/js/unified-token-data-service.js`)
- Central service for fetching real-time token data
- Calls monitoring API endpoint for each token
- **CRITICAL**: API URL must be `api/monitoring-status/${tokenMint}` (not `.php`)
- Provides fallback data when API is unavailable

#### 3. **Dashboard Main** (`assets/js/dashboard/dashboard-main.js`)
- Orchestrates all dashboard functionality
- Initializes wallet connection listeners
- Manages token fetching and updates
- Handles WebSocket connections for real-time updates

## Backend Structure

### PHP API Endpoints

#### 1. **monitoring-status.php** (`api/monitoring-status.php`)
Main endpoint for token monitoring data:
- Fetches from multiple Supabase tables
- Queries external APIs (DexScreener, Jupiter) for real-time prices
- Returns comprehensive token data including:
  - Basic metadata (name, symbol, image)
  - Price and liquidity information
  - Risk assessment data
  - Protection status

#### 2. **Database Schema**
Key Supabase tables:
- `wallet_tokens`: User's token holdings
- `token_metadata`: Basic token information
- `token_prices`: Historical price data
- `monitoring_stats`: Risk monitoring statistics
- `user_protections`: Protection settings per user/token
- `ml_risk_predictions`: Machine learning risk scores

### Node.js Backend Services

Located in `backend/src/`:
- **ExpressApiService**: Main API server (port 3001)
- **PoolMonitoringService**: Monitors liquidity pools
- **MLRiskIntegrationService**: Calculates risk scores
- **HeliusAutomaticTokenDiscoveryService**: Discovers new tokens
- **AlertingService**: Sends alerts for high-risk events

## Data Flow

1. **User connects wallet** → Wallet adapter stores address
2. **Dashboard loads** → SupabaseTokenFetcher queries user's tokens
3. **For each token** → UnifiedTokenDataService fetches monitoring data
4. **Monitoring API** → Aggregates data from multiple sources
5. **UI updates** → Token cards display real-time information
6. **WebSocket** → Provides real-time updates (if backend running)

## Current Issues and Solutions

### Issue: Token Data Not Loading
**Root Cause**: Incorrect API URL format in UnifiedTokenDataService
**Solution**: Changed from `api/monitoring-status.php/${tokenMint}` to `api/monitoring-status/${tokenMint}`

### Common Problems:
1. **No wallet connected**: Dashboard requires wallet connection
2. **Backend not running**: System falls back to PHP endpoints
3. **API rate limits**: External API calls may be rate-limited
4. **Missing environment variables**: Check `.env` configuration

## Development Tips

### Testing Token Loading:
1. Use `debug-token-loading.html` for comprehensive debugging
2. Use `test-token-display.php` for isolated token display testing
3. Check browser console for API errors
4. Verify Supabase connection in network tab

### Required Environment Setup:
- PHP 7.4+ with cURL extension
- Node.js 16+ (for backend services)
- Supabase project with proper schema
- `.env` file with all required keys

### Key Configuration Files:
- `.env`: API keys and database URLs
- `.htaccess`: URL rewriting rules
- `backend/.env`: Backend-specific configuration

## Architecture Decisions

1. **Hybrid PHP/Node.js**: PHP for rapid development, Node.js for real-time features
2. **Supabase as primary database**: Real-time capabilities and easy scaling
3. **Multiple data sources**: Redundancy for critical price/liquidity data
4. **Progressive enhancement**: Works without WebSocket, enhanced with it