#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testMVPFlow() {
  console.log(`
╔══════════════════════════════════════╗
║       MVP FLOW TEST CHECKLIST        ║
╚══════════════════════════════════════╝
`);

  const tests = {
    walletSync: false,
    tokenActive: false,
    protectionEnabled: false,
    monitoringActive: false,
    alertsWorking: false,
    executionReady: false
  };

  try {
    // 1. Check if any wallets are synced
    console.log('\n1️⃣ Checking wallet sync...');
    const { data: wallets } = await supabase
      .from('wallet_sync_history')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(5);
    
    if (wallets && wallets.length > 0) {
      tests.walletSync = true;
      console.log(`✅ Found ${wallets.length} synced wallets`);
      console.log(`   Latest: ${wallets[0].wallet_address}`);
    } else {
      console.log('❌ No wallets synced yet');
    }

    // 2. Check active tokens
    console.log('\n2️⃣ Checking active tokens...');
    const { data: activeTokens } = await supabase
      .from('token_metadata')
      .select('*')
      .eq('is_active', true)
      .limit(10);
    
    if (activeTokens && activeTokens.length > 0) {
      tests.tokenActive = true;
      console.log(`✅ Found ${activeTokens.length} active tokens`);
      console.log(`   Example: ${activeTokens[0].symbol || activeTokens[0].mint}`);
    } else {
      console.log('❌ No active tokens (sync a wallet first)');
    }

    // 3. Check protected tokens
    console.log('\n3️⃣ Checking protected tokens...');
    const { data: protectedTokens } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    
    if (protectedTokens && protectedTokens.length > 0) {
      tests.protectionEnabled = true;
      console.log(`✅ Found ${protectedTokens.length} protected tokens`);
      console.log(`   Token: ${protectedTokens[0].token_mint}`);
      console.log(`   Thresholds: Price ${protectedTokens[0].price_threshold}%, Liquidity ${protectedTokens[0].liquidity_threshold}%`);
    } else {
      console.log('❌ No protected tokens yet');
    }

    // 4. Check liquidity monitoring
    console.log('\n4️⃣ Checking liquidity monitoring...');
    const { data: monitoring } = await supabase
      .from('liquidity_monitoring')
      .select('*')
      .eq('monitoring_active', true)
      .limit(5);
    
    if (monitoring && monitoring.length > 0) {
      tests.monitoringActive = true;
      console.log(`✅ Found ${monitoring.length} monitored pools`);
      console.log(`   Pool: ${monitoring[0].pool_address.slice(0, 10)}...`);
      console.log(`   Liquidity: $${monitoring[0].current_liquidity_usd || 0}`);
    } else {
      console.log('❌ No active pool monitoring');
    }

    // 5. Check recent alerts
    console.log('\n5️⃣ Checking alert system...');
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (alerts && alerts.length > 0) {
      tests.alertsWorking = true;
      console.log(`✅ Alert system working - ${alerts.length} recent alerts`);
      console.log(`   Latest: ${alerts[0].title}`);
    } else {
      console.log('⚠️  No recent alerts (system may be working fine)');
    }

    // 6. Check execution queue
    console.log('\n6️⃣ Checking execution readiness...');
    const { data: execQueue } = await supabase
      .from('execution_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (execQueue) {
      tests.executionReady = true;
      console.log('✅ Execution queue ready');
      if (execQueue.length > 0) {
        console.log(`   ${execQueue.length} executions in queue`);
      }
    } else {
      console.log('❌ Execution queue not accessible');
    }

    // Summary
    console.log(`
╔══════════════════════════════════════╗
║            TEST RESULTS              ║
╚══════════════════════════════════════╝`);
    
    const passed = Object.values(tests).filter(t => t).length;
    const total = Object.keys(tests).length;
    
    Object.entries(tests).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });
    
    console.log(`
Score: ${passed}/${total} ${passed === total ? '🎉' : ''}

${passed < total ? `
⚠️  Missing components for MVP:` : '🚀 All systems ready for MVP launch!'}`);

    if (!tests.walletSync) {
      console.log('\n1. Connect a wallet and sync tokens first');
    }
    if (!tests.protectionEnabled) {
      console.log('2. Enable protection for at least one token');
    }
    if (!tests.monitoringActive) {
      console.log('3. Ensure pool monitoring is active');
    }

    // Real-time test
    console.log('\n\n🔄 Testing real-time updates (10 seconds)...');
    
    const channel = supabase
      .channel('mvp-test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'token_prices' },
        (payload) => {
          console.log('📊 Price update:', payload.new.symbol, '$' + payload.new.price_usd);
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_alerts' },
        (payload) => {
          console.log('🚨 New alert:', payload.new.title);
        }
      )
      .subscribe();

    await new Promise(resolve => setTimeout(resolve, 10000));
    
    channel.unsubscribe();
    console.log('\n✅ Real-time test complete');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
console.log('Running MVP flow test...');
testMVPFlow()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });