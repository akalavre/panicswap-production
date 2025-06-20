# Setting Up Helius Webhook with Ngrok

## Quick Start

### 1. Install ngrok

Download from https://ngrok.com/download

### 2. Start the Backend
```bash
npm run dev
# Backend runs on http://localhost:3001
```

### 3. Start ngrok Tunnel (in a new terminal)
```bash
ngrok http 3001
```

Copy the HTTPS URL from ngrok output.

### 4. Register Webhook
```bash
WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/api/webhook/helius npx ts-node register-webhooks.ts
```

The webhook will receive real-time swap data for price updates\!
