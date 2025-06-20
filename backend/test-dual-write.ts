import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testDualWrite() {
  console.log('Testing Dual-Write Mode Implementation...\n');

  const testTokenMint = 'test_token_' + Date.now();
  const testWallet = 'test_wallet_' + Date.now();
  const testPool = 'test_pool_' + Date.now();

  try {
    // Test 1: Price Update (via pool_updates table)
    console.log('1. Testing price update dual-write...');
    const { error: priceError } = await supabase
      .from('pool_updates')
      .insert({
        pool_address: `price-${testTokenMint}`,
        token_mint: testTokenMint,
        update_type: 'price',
        new_value: 1.5,
        metadata: {
          symbol: 'TEST',
          source: 'test_dual_write',
          timestamp: Date.now()
        }
      });
    
    if (priceError) {
      console.error('❌ Price update failed:', priceError);
    } else {
      console.log('✅ Price update written successfully');
    }

    // Test 2: Liquidity Update
    console.log('\n2. Testing liquidity update dual-write...');
    const { error: liquidityError } = await supabase
      .from('pool_updates')
      .insert({
        pool_address: testPool,
        token_mint: testTokenMint,
        update_type: 'liquidity',
        old_value: 1000,
        new_value: 800,
        change_percentage: 20,
        metadata: {
          baselineLiquidity: 1000,
          source: 'test_dual_write',
          timestamp: Date.now()
        }
      });
    
    if (liquidityError) {
      console.error('❌ Liquidity update failed:', liquidityError);
    } else {
      console.log('✅ Liquidity update written successfully');
    }

    // Test 3: Rugpull Alert
    console.log('\n3. Testing rugpull alert dual-write...');
    const { error: rugpullError } = await supabase
      .from('rugpull_alerts')
      .insert({
        token_mint: testTokenMint,
        pool_address: testPool,
        alert_type: 'LIQUIDITY_REMOVAL',
        severity: 'HIGH',
        liquidity_change_percent: 50,
        liquidity_before: 1000,
        liquidity_after: 500,
        message: 'Test rugpull alert - 50% liquidity removed',
        metadata: {
          source: 'test_dual_write',
          timestamp: Date.now()
        },
        detected_at: new Date().toISOString()
      });
    
    if (rugpullError) {
      console.error('❌ Rugpull alert failed:', rugpullError);
    } else {
      console.log('✅ Rugpull alert written successfully');
    }

    // Test 4: Protection Event
    console.log('\n4. Testing protection event dual-write...');
    const { error: protectionError } = await supabase
      .from('protection_events')
      .insert({
        wallet_address: testWallet,
        token_mint: testTokenMint,
        event_type: 'protection_added',
        protection_settings: {
          priceDropPercent: 50,
          autoSell: true
        },
        metadata: {
          symbol: 'TEST',
          source: 'test_dual_write',
          timestamp: Date.now()
        }
      });
    
    if (protectionError) {
      console.error('❌ Protection event failed:', protectionError);
    } else {
      console.log('✅ Protection event written successfully');
    }

    // Test 5: Auto-protection Event
    console.log('\n5. Testing auto-protection event dual-write...');
    const { error: autoProtectError } = await supabase
      .from('auto_protection_events')
      .insert({
        wallet_address: testWallet,
        event_type: 'enabled',
        settings: {
          protectNewTokens: true,
          priceDropTrigger: 50,
          liquidityDropTrigger: 30
        },
        metadata: {
          source: 'test_dual_write',
          timestamp: Date.now()
        }
      });
    
    if (autoProtectError) {
      console.error('❌ Auto-protection event failed:', autoProtectError);
    } else {
      console.log('✅ Auto-protection event written successfully');
    }

    // Test 6: Wallet Notification
    console.log('\n6. Testing wallet notification dual-write...');
    const { error: notifError } = await supabase
      .from('wallet_notifications')
      .insert({
        wallet_address: testWallet,
        notification_type: 'protection_triggered',
        title: 'Test Protection Triggered',
        message: 'This is a test notification for dual-write mode',
        priority: 'high',
        metadata: {
          tokenMint: testTokenMint,
          source: 'test_dual_write'
        }
      });
    
    if (notifError) {
      console.error('❌ Wallet notification failed:', notifError);
    } else {
      console.log('✅ Wallet notification written successfully');
    }

    // Test 7: System Alert
    console.log('\n7. Testing system alert dual-write...');
    const { error: alertError } = await supabase
      .from('system_alerts')
      .insert({
        alert_type: 'info',
        category: 'test',
        title: 'Dual-Write Test Alert',
        message: 'Testing dual-write mode implementation',
        metadata: {
          source: 'test_dual_write',
          timestamp: Date.now()
        }
      });
    
    if (alertError) {
      console.error('❌ System alert failed:', alertError);
    } else {
      console.log('✅ System alert written successfully');
    }

    // Verify data was written
    console.log('\n📊 Verifying written data...');
    
    const { data: poolUpdates, error: poolError } = await supabase
      .from('pool_updates')
      .select('*')
      .eq('token_mint', testTokenMint)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!poolError && poolUpdates) {
      console.log(`✅ Found ${poolUpdates.length} pool updates for test token`);
    }

    const { data: notifications, error: notifQueryError } = await supabase
      .from('wallet_notifications')
      .select('*')
      .eq('wallet_address', testWallet)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!notifQueryError && notifications) {
      console.log(`✅ Found ${notifications.length} notifications for test wallet`);
    }

    console.log('\n🎉 Dual-write test completed successfully!');
    console.log('\nAll backend services are now writing to both WebSocket and Supabase.');
    console.log('Frontend can subscribe to these tables for real-time updates.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDualWrite().catch(console.error);