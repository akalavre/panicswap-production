# Security and Alert Configuration Guide

## 1. Encryption Key Setup

The `ENCRYPTION_KEY` is critical for securing private keys in your database. Here's how to set it up properly:

### Generate a Secure Encryption Key

```bash
# Option 1: Using OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Configure the Encryption Key

1. **Backend (.env file in /backend directory):**
```env
# Add this to your backend/.env file
ENCRYPTION_KEY=your_generated_key_here
```

2. **Frontend (.env file in root directory):**
```env
# Add this to your root .env file (for PHP)
ENCRYPTION_KEY=your_generated_key_here
```

**IMPORTANT**: Both frontend and backend MUST use the SAME encryption key, or they won't be able to decrypt each other's data.

### Security Best Practices

1. **Never commit the encryption key to git**
   - Add `.env` to your `.gitignore`
   - Use environment variables in production

2. **Rotate keys periodically**
   - Create a key rotation script
   - Re-encrypt all data with new key
   - Keep old key temporarily for transition

3. **Use different keys for different environments**
   - Development: `ENCRYPTION_KEY_DEV`
   - Staging: `ENCRYPTION_KEY_STAGING`
   - Production: `ENCRYPTION_KEY_PROD`

## 2. Telegram Bot Setup

### Create a Telegram Bot

1. **Start a chat with @BotFather on Telegram**
2. **Send `/newbot` command**
3. **Choose a name for your bot** (e.g., "PanicSwap Alerts")
4. **Choose a username** (must end with 'bot', e.g., @panicswap_alerts_bot)
5. **Save the bot token** you receive

### Get Your Chat ID

1. **Start a chat with your new bot**
2. **Send any message to the bot**
3. **Open this URL in browser:**
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. **Look for "chat":{"id":XXXXXXXXX}** - this is your chat ID

### Configure Telegram Alerts

Add to your backend `.env` file:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### Setting Up Group Alerts (Optional)

To send alerts to a Telegram group:

1. **Create a new group** or use existing one
2. **Add your bot to the group**
3. **Make the bot an admin** (required for sending messages)
4. **Get the group chat ID:**
   - Send a message in the group
   - Check `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for negative chat ID (groups have negative IDs)

## 3. Environment Variables Summary

### Backend (.env in /backend)
```env
# Solana RPC
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key
HELIUS_API_KEY=your-helius-api-key

# Supabase
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Security
ENCRYPTION_KEY=your-32-byte-key-base64

# Telegram Alerts
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Optional: Different alert channels
TELEGRAM_CRITICAL_CHAT_ID=987654321  # For critical alerts only
TELEGRAM_INFO_CHAT_ID=456789123      # For info/low priority
```

### Frontend (.env in root)
```env
# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Supabase
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Security (MUST match backend)
ENCRYPTION_KEY=your-32-byte-key-base64
```

## 4. Testing Your Setup

### Test Encryption
```bash
# From backend directory
node -e "
const { keyManagementService } = require('./dist/services/KeyManagementService.js');
const testKey = 'test123';
const encrypted = keyManagementService.encrypt(testKey);
console.log('Encrypted:', encrypted);
const decrypted = keyManagementService.decrypt(encrypted);
console.log('Decrypted:', decrypted);
console.log('Success:', testKey === decrypted);
"
```

### Test Telegram Alerts
```bash
# From backend directory
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${TELEGRAM_CHAT_ID}\",
    \"text\": \"🚨 Test Alert: PanicSwap is configured correctly!\",
    \"parse_mode\": \"MarkdownV2\"
  }"
```

## 5. Health Monitoring

### Alert System Health Check Endpoint

Monitor the health of your alerting system:

```bash
# Check alert system health
curl http://localhost:3001/health/alerts

# Response format:
{
  "status": "healthy",  // healthy | degraded | unhealthy
  "lastAlertTimestamp": 1735000000000,
  "timeSinceLastAlert": 60000,
  "stats": {
    "total": 150,
    "successful": 145,
    "failed": 5,
    "rateLimited": 10
  },
  "rateLimit": {
    "window": 60000,      // 1 minute window
    "maxPerWindow": 10    // Max 10 alerts per wallet:type per minute
  }
}
```

Set up monitoring to probe this endpoint every 5 minutes and alert if:
- Status is "unhealthy" (more failures than successes)
- Status is "degraded" (no alerts in last hour when alerts exist)
- The endpoint doesn't respond

## 6. Production Deployment Checklist

- [ ] Generate strong, unique encryption key
- [ ] Store encryption key in secure environment variables
- [ ] Configure Telegram bot and chat IDs
- [ ] Test encryption/decryption between frontend and backend
- [ ] Test Telegram alerts are being received
- [ ] Enable HTTPS for all endpoints
- [ ] Set up key rotation schedule
- [ ] Configure alert rate limiting to prevent spam
- [ ] Set up monitoring for /health/alerts endpoint
- [ ] Document emergency procedures for key compromise

## 7. Alert Types and Severity

The system sends different alert levels:

- **🚨 CRITICAL**: Immediate action required (failed protection, missing keys)
- **🔴 HIGH**: Important issues (swap failures, confirmation timeouts)
- **⚠️ MEDIUM**: Notable events (delayed confirmations)
- **💙 LOW**: Informational (not sent to Telegram by default)

## 8. Troubleshooting

### Encryption Issues
- **"Failed to decrypt private key"**: Encryption keys don't match between frontend/backend
- **"Invalid private key format"**: Key might be corrupted or incorrectly encoded

### Telegram Issues
- **Bot not responding**: Check bot token is correct
- **No messages received**: Verify chat ID and bot permissions
- **"Bad Request: can't parse entities"**: Special characters need escaping in MarkdownV2

### Quick Debug Commands
```bash
# Check if encryption key is set
echo $ENCRYPTION_KEY

# Test Telegram connection
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Check recent alerts in database
psql $DATABASE_URL -c "SELECT * FROM operational_alerts ORDER BY created_at DESC LIMIT 10;"
```