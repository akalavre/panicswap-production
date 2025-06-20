#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSupabaseFlow() {
  console.log(`
╔═══════════════════════════════════════╗
║    SUPABASE BROADCAST FLOW TEST       ║
╚═══════════════════════════════════════╝
`);

  // 1. Create broadcast channel
  console.log('1️⃣ Creating broadcast channel...');
  const channel = supabase.channel('protection-alerts');
  
  // 2. Subscribe to events
  console.log('2️⃣ Subscribing to broadcast events...');
  let receivedAlert = false;
  
  channel
    .on('broadcast', { event: 'rugpull:detected' }, (payload) => {
      console.log('\n🚨 RUGPULL ALERT RECEIVED:');
      console.log(JSON.stringify(payload, null, 2));
      receivedAlert = true;
    })
    .on('broadcast', { event: 'protection:executed' }, (payload) => {
      console.log('\n💊 PROTECTION EXECUTION RECEIVED:');
      console.log(JSON.stringify(payload, null, 2));
    })
    .subscribe((status) => {
      console.log(`✅ Channel subscription status: ${status}`);
    });

  // Wait for subscription
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Test database trigger
  console.log('\n3️⃣ Testing database trigger by inserting rugpull alert...');
  
  const testAlert = {
    token_mint: 'TEST_' + Date.now(),
    pool_address: 'POOL_TEST_123',
    severity: 'HIGH',
    liquidity_drop: 85,
    alert_type: 'LIQUIDITY_REMOVAL',
    detected_at: new Date().toISOString()
  };

  const { data: alertData, error: alertError } = await supabase
    .from('rugpull_alerts')
    .insert(testAlert)
    .select()
    .single();

  if (alertError) {
    console.error('❌ Failed to insert alert:', alertError);
  } else {
    console.log('✅ Alert inserted:', alertData);
  }

  // 4. Check if execution was queued (by trigger)
  console.log('\n4️⃣ Checking if execution was queued by trigger...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { data: executions } = await supabase
    .from('execution_queue')
    .select('*')
    .eq('token_mint', testAlert.token_mint)
    .order('created_at', { ascending: false })
    .limit(1);

  if (executions && executions.length > 0) {
    console.log('✅ Execution queued by trigger!');
    console.log(`   - Action: ${executions[0].action_type}`);
    console.log(`   - Priority: ${executions[0].priority}`);
  } else {
    console.log('⚠️  No execution queued (might need protected tokens)');
  }

  // 5. Send test broadcast
  console.log('\n5️⃣ Sending test broadcast...');
  await channel.send({
    type: 'broadcast',
    event: 'rugpull:detected',
    payload: {
      type: 'rugpull',
      severity: 'CRITICAL',
      data: {
        tokenMint: 'BROADCAST_TEST_123',
        poolAddress: 'POOL_456',
        liquidityChange: 95,
        type: 'INSTANT_RUG_PULL'
      },
      timestamp: new Date()
    }
  });

  // Wait for broadcast
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. Check results
  console.log('\n6️⃣ Test Results:');
  console.log(`   - Database trigger: ${executions && executions.length > 0 ? '✅' : '❌'}`);
  console.log(`   - Broadcast received: ${receivedAlert ? '✅' : '❌'}`);

  // 7. Test presence
  console.log('\n7️⃣ Testing presence tracking...');
  const presenceChannel = supabase.channel('monitoring-presence');
  
  await presenceChannel
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          tokenMint: 'PRESENCE_TEST',
          poolAddress: 'POOL_PRESENCE',
          monitoring_since: new Date().toISOString()
        });
      }
    });

  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const presenceState = await presenceChannel.presenceState();
  console.log('Presence state:', Object.keys(presenceState).length > 0 ? '✅ Tracking active' : '❌ No presence');

  // Cleanup
  await channel.unsubscribe();
  await presenceChannel.unsubscribe();

  console.log('\n✨ Supabase flow test complete!');
}

// Run test
testSupabaseFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });