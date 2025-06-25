# PanicSwap Backend

TypeScript backend service for PanicSwap, providing real-time monitoring and protection services for Solana tokens.

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- (Optional) Docker for Redis
- Helius API key for Solana RPC access
- Supabase project for database

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env` and update with your values:
   ```bash
   cp .env.example .env
   ```

### Redis Configuration (Optional)

Redis is used for caching but is **completely optional**. The backend will automatically fall back to in-memory caching when Redis is unavailable.

#### Option 1: Disable Redis (Default for Development)
Set in your `.env` file:
```env
REDIS_ENABLED=false
```

#### Option 2: Use Docker Redis
Start Redis using the included docker-compose:
```bash
docker compose up redis
```

Then in your `.env`:
```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

#### Option 3: Use Existing Redis
If you have Redis installed locally or remotely:
```env
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
# Or use individual settings:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password
```

### Running the Backend

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

**Additional services**:
```bash
# Run rug check polling service
npm run rugcheck

# Register webhooks (run once after setup)
npm run register-webhooks
npm run register-token-webhooks
```

## Health Check

The backend exposes health endpoints that include Redis status:

```bash
# Basic health check
curl http://localhost:3001/api/health

# Enhanced health check with Redis info
curl http://localhost:3001/api/enhanced/health
```

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "panicswap-enhanced",
  "protectionActive": true,
  "monitoringActive": true,
  "redis": {
    "enabled": false,
    "connected": true,
    "status": "disabled",
    "fallbackCount": 0
  }
}
```

## Testing Tools

Interactive testing utilities are available:
```bash
# Monitor graduating tokens
node graduation-dashboard.js

# Test rug detection
node test-smart-detection.js

# Live monitoring demo
node demo-live-monitor.js

# Test token discovery
node test-token-discovery.js
```

## Architecture

- **Smart Rug Detection**: Multi-stage detection with false positive mitigation
- **Mempool Monitoring**: Real-time threat detection (requires Helius premium)
- **Frontrunning Protection**: Automated emergency sells with priority fee escalation
- **Wallet-First Discovery**: Focus on tokens in user wallets via Helius webhooks
- **Graceful Degradation**: Redis optional with automatic fallback to memory cache
- **Real-time Updates**: Supabase broadcasts for live monitoring

## Environment Variables

### Core Configuration
- `HELIUS_RPC_URL`: Your Helius RPC endpoint with API key
- `HELIUS_API_KEY`: Your Helius API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key

### Mempool & Frontrunning (New)
- `MEMPOOL_ENABLED`: Enable mempool monitoring (default: false, requires Helius premium)
- `BASE_FEE_MICRO_LAMPORTS`: Base priority fee in microlamports (default: 5000 = 0.005 SOL)
- `MAX_PRIORITY_FEE_MICRO_LAMPORTS`: Maximum priority fee cap (default: 1000000 = 1 SOL)
- `JITO_ENABLED`: Enable Jito bundle submission (default: false, stub implementation)
- `JITO_BUNDLE_SIZE`: Transactions per Jito bundle (default: 5)
- `FRONTRUN_MAX_RETRIES`: Max retry attempts for protection execution (default: 3)
- `FRONTRUN_RETRY_DELAY_MS`: Delay between retries in ms (default: 100)

### Emergency Execution
- `EMERGENCY_MAX_SLIPPAGE_BPS`: Maximum allowed slippage in basis points (default: 500 = 5%)
- `EMERGENCY_PARTIAL_FILL_THRESHOLD`: Minimum fill percentage to accept (default: 0.8 = 80%)
- `EMERGENCY_DEADLINE_SECONDS`: Maximum time for execution attempts (default: 30)
- `EMERGENCY_BACKUP_RPCS`: Comma-separated backup RPC URLs for reliability

### Monitoring Intervals
- `VELOCITY_POLL_INTERVAL`: Liquidity velocity check interval (default: 30000ms)
- `PATTERN_CHECK_INTERVAL`: Pattern analysis interval (default: 60000ms)
- `SOCIAL_MONITORING_INTERVAL`: Social signal check interval (default: 60000ms)

**Note**: Lower intervals provide faster detection but increase RPC usage. See `.env.example` for detailed timing guidelines.

## Troubleshooting

### Redis Connection Errors
If you see Redis connection errors but want to run without Redis:
1. Set `REDIS_ENABLED=false` in your `.env`
2. Restart the backend

The system will use in-memory caching and work normally.

### Missing Environment Variables
Ensure all required variables from `.env.example` are set in your `.env` file.

### Port Already in Use
If port 3001 is taken, change it in your `.env`:
```env
PORT=3002
```