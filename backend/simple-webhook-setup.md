# Simple Webhook Setup Steps

## 1. Start Backend (Terminal 1)
```
npm run dev
```

## 2. Start Ngrok (Terminal 2)
```
ngrok http 3001
```

## 3. Register Webhook (Terminal 3)
Copy the HTTPS URL from ngrok (like https://abc123.ngrok-free.app) and run:
```
WEBHOOK_URL=https://abc123.ngrok-free.app/api/webhook/helius npx ts-node register-webhooks.ts
```

That's it\! Your webhook is now set up.
EOF < /dev/null
