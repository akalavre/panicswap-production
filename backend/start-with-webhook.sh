#!/bin/bash

echo "🚀 Starting PanicSwap Backend with Webhook Support"
echo ""
echo "📋 Instructions:"
echo "1. Make sure you have ngrok installed (https://ngrok.com/download)"
echo "2. This script will guide you through the process"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo ""
    echo "To install ngrok:"
    echo "1. Download from: https://ngrok.com/download"
    echo "2. Extract and move to PATH: sudo mv ngrok /usr/local/bin/"
    echo "3. Run this script again"
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Start backend
echo "Starting backend on port 3001..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start ngrok
echo ""
echo "Starting ngrok tunnel to port 3001..."
ngrok http 3001 > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    echo "Make sure ngrok started correctly"
    kill $BACKEND_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Backend is running at: http://localhost:3001"
echo "✅ Public URL (via ngrok): $NGROK_URL"
echo ""
echo "📝 Webhook endpoint: $NGROK_URL/api/webhook/helius"
echo ""
echo "Next steps:"
echo "1. Copy the webhook URL above"
echo "2. Register it with Helius:"
echo "   - Go to https://dashboard.helius.dev/webhooks"
echo "   - Create a new webhook with the URL"
echo "   - Select 'Enhanced Transactions' type"
echo "   - Add 'SWAP' transaction type"
echo "   - Add token addresses to monitor"
echo ""
echo "Or run: WEBHOOK_URL=$NGROK_URL/api/webhook/helius npx ts-node register-webhooks.ts"
echo ""
echo "Press Ctrl+C to stop both services"

# Keep running
wait $BACKEND_PID