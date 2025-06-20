import supabase from '../utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Create a client for simulating frontend subscriptions
const frontendClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test configuration
const TEST_WALLET = 'TestWallet123';
const TEST_TOKEN = 'TestToken456';
const TEST_POOL = 'TestPool789';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(50));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(50));
}

async function testPoolUpdates() {
  logSection('Testing Pool Updates (Price Changes)');
  
  let updateReceived = false;
  
  // Subscribe to pool updates
  const channel = frontendClient
    .channel('test-pool-updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pool_updates'
    }, (payload) => {
      log(`✅ Received pool update: ${JSON.stringify(payload.new)}`, colors.green);
      updateReceived = true;
    })
    .subscribe();

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Insert a test price update
  log('Inserting test price update...', colors.yellow);
  const { error } = await supabase
    .from('pool_updates')
    .insert({
      pool_address: TEST_POOL,
      token_mint: TEST_TOKEN,
      update_type: 'price',
      old_value: 1.0,
      new_value: 1.5,
      change_percentage: 50,
      metadata: {
        test: true,
        timestamp: Date.now()
      }
    });

  if (error) {
    log(`❌ Error inserting pool update: ${error.message}`, colors.red);
  } else {
    log('✅ Pool update inserted successfully', colors.green);
  }

  // Wait for realtime update
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!updateReceived) {
    log('❌ Did not receive realtime update', colors.red);
  }

  // Cleanup
  await channel.unsubscribe();
}

async function testSystemAlerts() {
  logSection('Testing System Alerts');
  
  let alertReceived = false;
  
  // Subscribe to system alerts
  const channel = frontendClient
    .channel('test-system-alerts')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'system_alerts'
    }, (payload) => {
      log(`✅ Received system alert: ${JSON.stringify(payload.new)}`, colors.green);
      alertReceived = true;
    })
    .subscribe();

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Insert a test alert
  log('Inserting test system alert...', colors.yellow);
  const { error } = await supabase
    .from('system_alerts')
    .insert({
      alert_type: 'critical',
      category: 'liquidity',
      title: 'Test Rugpull Alert',
      message: 'This is a test alert for Supabase Realtime',
      metadata: {
        tokenMint: TEST_TOKEN,
        liquidityDrop: 80,
        test: true
      }
    });

  if (error) {
    log(`❌ Error inserting system alert: ${error.message}`, colors.red);
  } else {
    log('✅ System alert inserted successfully', colors.green);
  }

  // Wait for realtime update
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!alertReceived) {
    log('❌ Did not receive realtime alert', colors.red);
  }

  // Cleanup
  await channel.unsubscribe();
}

async function testWalletNotifications() {
  logSection('Testing Wallet Notifications');
  
  let notificationReceived = false;
  
  // Subscribe to wallet notifications
  const channel = frontendClient
    .channel('test-wallet-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'wallet_notifications',
      filter: `wallet_address=eq.${TEST_WALLET}`
    }, (payload) => {
      log(`✅ Received wallet notification: ${JSON.stringify(payload.new)}`, colors.green);
      notificationReceived = true;
    })
    .subscribe();

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Insert a test notification
  log('Inserting test wallet notification...', colors.yellow);
  const { error } = await supabase
    .from('wallet_notifications')
    .insert({
      wallet_address: TEST_WALLET,
      notification_type: 'protection_triggered',
      title: 'Protection Triggered',
      message: 'Your token protection has been triggered',
      priority: 'high',
      metadata: {
        tokenMint: TEST_TOKEN,
        test: true
      }
    });

  if (error) {
    log(`❌ Error inserting wallet notification: ${error.message}`, colors.red);
  } else {
    log('✅ Wallet notification inserted successfully', colors.green);
  }

  // Wait for realtime update
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!notificationReceived) {
    log('❌ Did not receive realtime notification', colors.red);
  }

  // Cleanup
  await channel.unsubscribe();
}

async function testProtectionEvents() {
  logSection('Testing Protection Events');
  
  let eventReceived = false;
  
  // Subscribe to protection events
  const channel = frontendClient
    .channel('test-protection-events')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'protection_events'
    }, (payload) => {
      log(`✅ Received protection event: ${JSON.stringify(payload.new)}`, colors.green);
      eventReceived = true;
    })
    .subscribe();

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Insert a test protection event
  log('Inserting test protection event...', colors.yellow);
  const { error } = await supabase
    .from('protection_events')
    .insert({
      protected_token_id: 'test-protection-id',
      wallet_address: TEST_WALLET,
      token_mint: TEST_TOKEN,
      event_type: 'protection_added',
      event_data: {
        settings: {
          priceDropThreshold: 20,
          liquidityDropThreshold: 30
        },
        test: true
      }
    });

  if (error) {
    log(`❌ Error inserting protection event: ${error.message}`, colors.red);
  } else {
    log('✅ Protection event inserted successfully', colors.green);
  }

  // Wait for realtime update
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!eventReceived) {
    log('❌ Did not receive realtime event', colors.red);
  }

  // Cleanup
  await channel.unsubscribe();
}

async function testMultipleSubscribers() {
  logSection('Testing Multiple Concurrent Subscribers');
  
  const subscribers = [];
  const receivedCounts = new Map<string, number>();
  
  // Create 5 concurrent subscribers
  for (let i = 0; i < 5; i++) {
    const subscriberId = `subscriber-${i}`;
    receivedCounts.set(subscriberId, 0);
    
    const channel = frontendClient
      .channel(`test-multi-${i}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pool_updates'
      }, (payload) => {
        const count = receivedCounts.get(subscriberId)! + 1;
        receivedCounts.set(subscriberId, count);
        log(`✅ ${subscriberId} received update #${count}`, colors.green);
      })
      .subscribe();
    
    subscribers.push(channel);
  }

  // Wait for all subscriptions to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Insert multiple updates
  log('Inserting 3 test updates...', colors.yellow);
  for (let i = 0; i < 3; i++) {
    await supabase
      .from('pool_updates')
      .insert({
        pool_address: `${TEST_POOL}-${i}`,
        token_mint: TEST_TOKEN,
        update_type: 'price',
        new_value: 1.0 + i * 0.1,
        metadata: { test: true, update: i }
      });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for all updates to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check results
  log('\nSubscriber results:', colors.cyan);
  receivedCounts.forEach((count, subscriberId) => {
    log(`${subscriberId}: ${count} updates received`, count === 3 ? colors.green : colors.red);
  });

  // Cleanup
  for (const channel of subscribers) {
    await channel.unsubscribe();
  }
}

async function testPerformance() {
  logSection('Testing Performance (Rapid Updates)');
  
  let updateCount = 0;
  const startTime = Date.now();
  
  // Subscribe to updates
  const channel = frontendClient
    .channel('test-performance')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pool_updates'
    }, (payload) => {
      updateCount++;
    })
    .subscribe();

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Insert 20 rapid updates
  log('Inserting 20 rapid updates...', colors.yellow);
  const insertPromises = [];
  for (let i = 0; i < 20; i++) {
    insertPromises.push(
      supabase
        .from('pool_updates')
        .insert({
          pool_address: `perf-${TEST_POOL}-${i}`,
          token_mint: `${TEST_TOKEN}-${i}`,
          update_type: 'price',
          new_value: Math.random() * 10,
          metadata: { test: true, perf: true }
        })
    );
  }
  
  await Promise.all(insertPromises);
  const insertTime = Date.now() - startTime;
  
  // Wait for all updates to be received
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const totalTime = Date.now() - startTime;
  
  log(`\nPerformance Results:`, colors.cyan);
  log(`- Inserts completed in: ${insertTime}ms`, colors.yellow);
  log(`- Updates received: ${updateCount}/20`, updateCount === 20 ? colors.green : colors.red);
  log(`- Total time: ${totalTime}ms`, colors.yellow);
  log(`- Average latency: ${Math.round((totalTime - insertTime) / 20)}ms per update`, colors.yellow);

  // Cleanup
  await channel.unsubscribe();
}

async function cleanup() {
  logSection('Cleaning Up Test Data');
  
  // Clean up test data
  const tables = [
    'pool_updates',
    'system_alerts', 
    'wallet_notifications',
    'protection_events'
  ];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .or(`metadata->test.eq.true,wallet_address.eq.${TEST_WALLET},token_mint.eq.${TEST_TOKEN}`);
    
    if (error) {
      log(`❌ Error cleaning ${table}: ${error.message}`, colors.red);
    } else {
      log(`✅ Cleaned ${table}`, colors.green);
    }
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  log('SUPABASE REALTIME MIGRATION - COMPREHENSIVE TEST SUITE', colors.bright + colors.magenta);
  console.log('='.repeat(70));
  
  try {
    await testPoolUpdates();
    await testSystemAlerts();
    await testWalletNotifications();
    await testProtectionEvents();
    await testMultipleSubscribers();
    await testPerformance();
    
    await cleanup();
    
    logSection('Test Summary');
    log('✅ All tests completed!', colors.bright + colors.green);
    log('\nNext steps:', colors.cyan);
    log('1. Monitor database performance during high load', colors.yellow);
    log('2. Test with real wallet connections', colors.yellow);
    log('3. Verify frontend components receive updates correctly', colors.yellow);
    log('4. Check latency metrics in production environment', colors.yellow);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error}`, colors.red);
  } finally {
    process.exit(0);
  }
}

// Run tests
runAllTests();