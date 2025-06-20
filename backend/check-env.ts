#!/usr/bin/env node
import * as dotenv from 'dotenv';

dotenv.config();

console.log(`
╔═══════════════════════════════════════╗
║   ENVIRONMENT CONFIGURATION CHECK     ║
╚═══════════════════════════════════════╝
`);

const required = {
  'HELIUS_RPC_URL': process.env.HELIUS_RPC_URL,
  'HELIUS_API_KEY': process.env.HELIUS_API_KEY,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
};

const optional = {
  'PORT': process.env.PORT || '3001',
  'NODE_ENV': process.env.NODE_ENV || 'development',
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
};

let allGood = true;

// Check required
console.log('🔍 Required Environment Variables:\n');
Object.entries(required).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`  ❌ ${key}: NOT SET`);
    allGood = false;
  }
});

// Check optional
console.log('\n📋 Optional Environment Variables:\n');
Object.entries(optional).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key}: ${value}`);
  } else {
    console.log(`  ⚠️  ${key}: NOT SET (using defaults)`);
  }
});

// Test connections
console.log('\n🧪 Testing Connections:\n');

// Test Helius
if (required.HELIUS_RPC_URL) {
  console.log('  🔄 Testing Helius RPC...');
  import('@solana/web3.js').then(({ Connection }) => {
    const conn = new Connection(required.HELIUS_RPC_URL!);
    conn.getSlot()
      .then(slot => console.log(`  ✅ Helius RPC: Connected (slot: ${slot})`))
      .catch(() => console.log('  ❌ Helius RPC: Failed to connect'));
  });
}

// Test Supabase
if (required.SUPABASE_URL && required.SUPABASE_SERVICE_KEY) {
  console.log('  🔄 Testing Supabase...');
  import('@supabase/supabase-js').then(({ createClient }) => {
    const supabase = createClient(required.SUPABASE_URL!, required.SUPABASE_SERVICE_KEY!);
    supabase.from('token_metadata').select('count').limit(1)
      .then(({ error }) => {
        if (!error) {
          console.log('  ✅ Supabase: Connected');
        } else {
          console.log('  ❌ Supabase: Connection failed');
        }
      });
  });
}

// Summary
setTimeout(() => {
  console.log(`
╔═══════════════════════════════════════╗
║              SUMMARY                  ║
╚═══════════════════════════════════════╝

${allGood ? '✅ All required variables are set!' : '❌ Missing required environment variables!'}

${!allGood ? `
Please set the missing variables in backend/.env:

HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=your_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
` : '🚀 Ready for production!'}
`);
  process.exit(allGood ? 0 : 1);
}, 3000);