# Webhook Deployment Guide

This guide explains how to deploy the PanicSwap backend with Helius webhooks to eliminate rate limiting issues.

## Quick Start

1. **Deploy Backend**
   ```bash
   # Deploy to your hosting provider (Vercel, Railway, etc.)
   # Your backend will be available at: https://your-backend.com
   ```

2. **Register Webhook**
   ```bash
   cd backend
   WEBHOOK_URL=https://your-backend.com npx ts-node register-webhooks.ts
   # Save the webhook ID that's returned
   ```

3. **Add Token Addresses**
   ```bash
   npx ts-node update-webhook-tokens.ts
   # This will add all tokens from your database to the webhook
   ```

4. **Test Integration**
   ```bash
   npx ts-node test-webhook-integration.ts
   ```

## How It Works

1. **No More Rate Limits**: Instead of polling APIs every second, Helius sends us transaction data
2. **Real-Time Updates**: Price updates arrive within milliseconds of on-chain swaps
3. **Efficient Caching**: 30-second cache prevents redundant API calls
4. **Fallback System**: If webhook misses a price, polling service uses cached data first

## Architecture

```
Swap on Solana → Helius Detects → POST /api/webhook/helius → Update Cache → WebSocket Broadcast
                                                              ↓
                                                        Update Database
```

## Rate Limit Protection

The backend now includes multiple layers of rate limit protection:

1. **Webhook Cache First**: Always check webhook cache before making API calls
2. **Increased Cache Duration**: 30 seconds (up from 5 seconds)
3. **Rate Limited Jupiter Calls**: Minimum 1 second between calls, increases on 429 errors
4. **Batch API Calls**: Single Jupiter call for multiple tokens instead of individual calls

## Monitoring

To monitor the system:

```bash
# Check API call frequency
npx ts-node monitor-api-calls.ts

# View backend logs
npm run dev

# Test webhook endpoint
curl -X POST http://localhost:3001/api/webhook/helius \
  -H "Content-Type: application/json" \
  -d '[{"type":"SWAP","tokenTransfers":[...],"nativeTransfers":[...]}]'
```

## Troubleshooting

**Still getting rate limits?**
- Check that webhook service is initialized in index.ts
- Verify PricePollingService has webhookService parameter
- Ensure cache duration is 30 seconds or more
- Monitor with `monitor-api-calls.ts` to find the source

**No webhook events?**
- Verify backend is publicly accessible
- Check webhook ID is correct
- Ensure token addresses are added to webhook
- Look for errors in Helius dashboard

**Prices not updating?**
- Check WebSocket connection
- Verify database updates are working
- Ensure SOL price is updating (every 5 minutes)
- Check webhook processing logs

## Environment Variables

```env
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
WEBHOOK_URL=https://your-backend.com  # For registration script
```

## Next Steps

1. Deploy backend to production
2. Register webhook with production URL
3. Add monitoring/alerts for webhook failures
4. Consider adding webhook signature verification for security
5. Scale horizontally if needed (webhooks can be load balanced)