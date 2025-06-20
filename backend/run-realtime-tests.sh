#!/bin/bash

echo "======================================"
echo "Running Supabase Realtime Tests"
echo "======================================"
echo ""

# First verify WebSocket removal
echo "1. Verifying WebSocket removal..."
npx ts-node src/tests/verify-websocket-removal.ts
echo ""

# Run comprehensive realtime tests
echo "2. Running Supabase Realtime tests..."
echo "Note: Make sure your backend is running before running these tests!"
echo ""

# Check if SUPABASE_ANON_KEY is set
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: SUPABASE_ANON_KEY environment variable is not set"
  echo "Please set it in your .env file or export it"
  exit 1
fi

npx ts-node src/tests/test-supabase-realtime-complete.ts

echo ""
echo "======================================"
echo "Tests Complete!"
echo "======================================">