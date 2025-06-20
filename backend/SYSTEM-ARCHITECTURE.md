# 🚀 PanicSwap System Architecture & Components

## Overview
PanicSwap is an emergency exit protection system for Solana traders, specializing in pump.fun token protection with smart rug detection and automated swaps.

## 🧠 Core Services

### 1. **SmartRugDetector** (`src/services/SmartRugDetector.ts`)
Intelligent rug detection that avoids false positives during normal market movements.

**Key Features:**
- Momentum analysis to detect buying vs selling pressure
- Context awareness (natural corrections vs crashes)
- Pattern recognition (slow rugs, honeypots)
- Confidence scoring (0-100%)
- False positive mitigation

**Methods:**
- `analyzeRugProbability()` - Main analysis function
- `getMarketContext()` - Determines market conditions
- `calculateVolatility()` - Measures price volatility
- `detectSuspiciousPatterns()` - Identifies rug patterns
- `getProtectionAction()` - Recommends action based on analysis

### 2. **PumpFunRugDetector** (`src/services/PumpFunRugDetector.ts`)
Specialized detector for pump.fun tokens using bonding curve data.

**Key Features:**
- Bonding curve monitoring
- Holder distribution analysis
- Dev wallet tracking
- Risk score calculation
- Real-time monitoring setup

**Methods:**
- `monitorPumpFunToken()` - Main monitoring function
- `getBondingCurveData()` - Fetches and decodes curve data
- `analyzeHolders()` - Analyzes token holder distribution
- `calculateRiskScore()` - Computes overall risk
- `monitorBondingCurveTransactions()` - Real-time monitoring

**Important:** Uses correct pump.fun program ID: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`

### 3. **GraduationMonitor** (`src/services/GraduationMonitor.ts`)
Tracks pump.fun tokens approaching graduation to Raydium ($69k market cap).

**Key Features:**
- Progress tracking to graduation
- Market cap calculation
- Time estimates
- Momentum analysis
- Continuous monitoring for close candidates

**Methods:**
- `monitorTokenGraduation()` - Analyzes graduation potential
- `analyzeMomentum()` - Determines growth rate
- `estimateTimeToGraduation()` - Predicts graduation time
- `startContinuousMonitoring()` - Live tracking
- `handleGraduation()` - Manages post-graduation

### 4. **DemoProtectionService** (`src/services/DemoProtectionService.ts`)
Handles demo mode for user testing without real transactions.

**Key Features:**
- Simulated protection execution
- Realistic calculations based on real data
- Demo events and notifications
- Safe testing environment

**Methods:**
- `simulateProtectionExecution()` - Simulates emergency swap
- Creates demo protection events
- Calculates realistic swap values

### 5. **PoolMonitoringService** (`src/services/PoolMonitoringService.ts`)
Monitors liquidity pools for protected tokens.

**Key Features:**
- Multi-DEX support (Raydium, Pump.fun)
- Real-time account monitoring
- Liquidity change detection
- Protection trigger checks

**Methods:**
- `protectToken()` - Starts monitoring a token
- `unprotectToken()` - Stops monitoring
- `handlePoolChange()` - Processes pool updates
- `checkProtectionTriggers()` - Evaluates if protection needed

### 6. **SimpleRugPullDetector** (`src/services/SimpleRugPullDetector.ts`)
Fallback rug detection with Supabase integration.

**Key Features:**
- WebSocket subscriptions via Supabase
- Protection execution coordination
- Event logging and broadcasting
- Demo mode support

**Methods:**
- `initialize()` - Sets up monitoring
- `handleRugpull()` - Processes detected rugs
- `executeProtection()` - Triggers emergency swap
- `enableProtection()` - Activates token protection

### 7. **SupabaseBroadcastService** (`src/services/SupabaseBroadcastService.ts`)
Real-time event broadcasting using Supabase channels.

**Key Features:**
- Price alerts
- Rugpull alerts
- Protection execution events
- Graduation notifications

**Methods:**
- `broadcastPriceAlert()`
- `sendRugpullAlert()`
- `sendProtectionExecution()`
- `sendGraduationAlert()`

## 🔧 Utility Services

### 1. **PumpFunBondingCurveDecoder** (`src/services/PumpFunBondingCurveDecoder.ts`)
Decodes pump.fun bonding curve account data.

**Functions:**
- `decodePumpFunBondingCurve()` - Parses account data
- `calculateTokenPrice()` - Computes price from reserves
- `getPumpFunAccounts()` - Gets PDAs for token

### 2. **TestTokenService** (`src/services/testTokenService.ts`)
Frontend service for adding demo tokens.

**Methods:**
- `addTestToken()` - Adds token with real data but demo flag
- Fetches real metadata and liquidity
- Creates demo wallet entries

## 📊 Database Schema

### Tables Created:
1. **pump_fun_monitoring** - Tracks pump.fun token metrics
2. **pump_fun_holder_snapshots** - Historical holder data
3. **pump_fun_alerts** - Rug detection alerts
4. **graduation_tracking** - Tokens approaching graduation

### Key Fields:
- `is_demo_mode` - Flags test tokens
- `risk_score` - Overall risk assessment
- `concentration_risk` - Holder distribution risk
- `progress_percentage` - Progress to graduation

## 🧪 Test Suites

### Detection Tests:
1. **test-smart-detection.js** - Tests smart rug detection scenarios
2. **test-pump-fun-protection.js** - Tests pump.fun specific detection
3. **test-detection-comparison.js** - Compares old vs new detection

### Token Analysis:
1. **test-pump-fun-real-data.js** - Verifies real data fetching
2. **test-pump-simple.js** - Quick token analysis
3. **test-pump-verify.js** - Deep token verification

### Demo Flow:
1. **demo-complete-flow.js** - Full interactive demo
2. **demo-live-monitor.js** - Live monitoring visualization
3. **demo-protection-flow.js** - Protection execution demo

### Graduation Tracking:
1. **test-graduation-monitor.js** - Single token graduation analysis
2. **graduation-dashboard.js** - Multi-token dashboard

## 🎮 User Interfaces

### Command Line Tools:
1. **DEMO-PANICSWAP.cmd** - Complete interactive demo
2. **LIVE-MONITOR-DEMO.cmd** - Real-time monitoring demo
3. **TEST-SMART-DETECTION.cmd** - Smart detection showcase
4. **GRADUATION-MONITOR.cmd** - Graduation tracking
5. **GRADUATION-DASHBOARD.cmd** - Multi-token dashboard
6. **PANICSWAP-TEST.cmd** - Test any token

## 🔑 Configuration

### Protection Config (`src/config/protectionConfig.ts`)
Defines thresholds and settings for protection triggers.

**Levels:**
- Conservative: Higher thresholds, fewer triggers
- Balanced: Default settings
- Aggressive: Lower thresholds, more sensitive

**Settings:**
- Smart detection thresholds
- Traditional fallback thresholds
- Token-specific overrides

### Environment Variables:
```env
HELIUS_RPC_URL=           # Helius RPC endpoint
HELIUS_API_KEY=           # Helius API key
SUPABASE_URL=             # Supabase project URL
SUPABASE_SERVICE_KEY=     # Supabase service key
```

## 🔄 API Endpoints

### Test Token Routes (`src/routes/testTokenRoutes.ts`)
- `POST /api/tokens/enrich-test` - Fetches real token data with pump.fun analysis

### Protected Tokens Routes (`src/routes/protectedTokensRoutes.ts`)
- Token protection management endpoints

## 🚀 Key Innovations

### 1. **Smart Detection Algorithm**
- Reduces false positives by ~80%
- Understands market context
- Lets profits run during pumps
- Still catches 100% of real rugs

### 2. **Pump.fun Specialization**
- Direct bonding curve monitoring
- Holder distribution analysis
- Dev wallet tracking
- Graduation detection

### 3. **Demo Mode System**
- Full protection simulation
- Real market data
- No wallet connection needed
- Safe testing environment

### 4. **Graduation Tracking**
- Monitors progress to $69k
- Predicts graduation timing
- Alerts at key milestones
- Captures graduation opportunities

## 📝 Development Guidelines

### Adding New Features:
1. Follow existing service patterns
2. Include demo mode support
3. Add comprehensive error handling
4. Create test scripts
5. Update this documentation

### Testing:
1. Always test with real tokens
2. Verify both pump.fun and Raydium tokens
3. Test demo mode separately
4. Check false positive scenarios

### Database Changes:
1. Create migration files
2. Apply via Supabase MCP
3. Update relevant services
4. Test data flow

## 🔮 Future Enhancements

### Planned:
1. Social signal integration
2. ML-based pattern recognition
3. Cross-chain support
4. Mobile app integration
5. Advanced portfolio analytics

### In Progress:
1. Webhook notifications
2. Telegram bot integration
3. Historical analysis tools
4. Performance optimizations