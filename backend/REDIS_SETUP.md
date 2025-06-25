# Redis Setup Guide

## Overview
The PanicSwap backend uses Redis for caching but gracefully falls back to in-memory LRU cache when Redis is unavailable.

## Windows Setup (Using WAMP)

### Option 1: Redis for Windows (Recommended)
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis`
3. Run `redis-server.exe`
4. The default configuration should work (localhost:6379, no password)

### Option 2: Using WSL2
```bash
# In WSL2 terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Option 3: Using Docker
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

## Configuration

### Environment Variables
Set these in your `.env` file:

```env
# Option 1: Simple URL format (recommended)
REDIS_URL=redis://localhost:6379

# Option 2: Individual settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# For remote Redis with password:
REDIS_URL=redis://:yourpassword@your-redis-host:6379
```

## Testing Redis Connection

### Using Redis CLI
```bash
# Test connection
redis-cli ping
# Should return: PONG

# With custom host/port
redis-cli -h localhost -p 6379 ping
```

### Check Application Logs
When starting the backend, you should see:
```
[Redis] Attempting to connect to: redis://localhost:6379
[Redis] ✅ Connected
[Redis] ✅ Ready to accept commands
```

If Redis is not available, you'll see:
```
[Redis] Using fallback mechanism
```
This is normal - the application will continue working with in-memory cache.

## Troubleshooting

### Connection Timeout
If you see `[Redis] Failed to ensure connection: Error: Connection timeout`:
1. Ensure Redis is running: `redis-cli ping`
2. Check firewall isn't blocking port 6379
3. Verify environment variables are set correctly
4. Try connecting with redis-cli using the same credentials

### Common Issues
- **ECONNREFUSED**: Redis is not running or wrong host/port
- **NOAUTH**: Password required but not provided
- **WRONGPASS**: Incorrect password
- **ETIMEDOUT**: Network/firewall issue

## Performance Notes
- Redis improves performance for:
  - External API response caching
  - Transaction pre-computation
  - Rate limit state sharing
- Without Redis, each backend instance maintains its own cache
- The fallback LRU cache works well for single-instance deployments