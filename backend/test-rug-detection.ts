import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function simulateRugPull(poolAddress: string, tokenMint: string) {
  console.log(`
======================================
🧪 SIMULATING RUG PULL TEST
======================================
Pool: ${poolAddress}
Token: ${tokenMint}
Time: ${new Date().toISOString()}
======================================
`);

  try {
    // Step 1: Check if monitoring is active
    console.log('\n1️⃣ Checking if pool monitoring is active...');
    const { data: monitoring } = await supabase
      .from('liquidity_monitoring')
      .select('*')
      .eq('pool_address', poolAddress)
      .eq('monitoring_active', true)
      .single();

    if (!monitoring) {
      console.error('❌ Pool is not being monitored. Please enable protection first.');
      return;
    }

    console.log('✅ Pool monitoring is active');
    console.log(`   - Current liquidity: $${monitoring.current_liquidity_usd}`);
    console.log(`   - Baseline liquidity: $${monitoring.baseline_liquidity_usd}`);

    // Step 2: Simulate liquidity drop
    const currentLiquidity = monitoring.current_liquidity_usd || monitoring.baseline_liquidity_usd;
    const newLiquidity = currentLiquidity * 0.1; // 90% drop
    
    console.log(`\n2️⃣ Simulating 90% liquidity drop...`);
    console.log(`   - Old liquidity: $${currentLiquidity}`);
    console.log(`   - New liquidity: $${newLiquidity}`);
    
    const { error: updateError } = await supabase
      .from('liquidity_monitoring')
      .update({ 
        current_liquidity_usd: newLiquidity,
        current_liquidity_sol: newLiquidity / 50, // Assuming $50 SOL
        last_update: new Date().toISOString()
      })
      .eq('pool_address', poolAddress);

    if (updateError) {
      console.error('❌ Failed to update liquidity:', updateError);
      return;
    }

    console.log('✅ Liquidity updated in database');

    // Step 3: Monitor for alerts
    console.log('\n3️⃣ Monitoring for rugpull alerts (30 seconds)...');
    
    // Subscribe to rugpull alerts
    const alertChannel = supabase
      .channel('test-rugpull-alerts')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rugpull_alerts',
          filter: `token_mint=eq.${tokenMint}`
        },
        (payload) => {
          console.log('\n🚨 RUGPULL ALERT DETECTED:');
          console.log(JSON.stringify(payload.new, null, 2));
        }
      )
      .subscribe();

    // Subscribe to system alerts
    const systemChannel = supabase
      .channel('test-system-alerts')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'system_alerts',
          filter: `category=eq.liquidity`
        },
        (payload) => {
          console.log('\n📢 SYSTEM ALERT:');
          console.log(JSON.stringify(payload.new, null, 2));
        }
      )
      .subscribe();

    // Wait 30 seconds for backend to detect and respond
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 4: Check results
    console.log('\n4️⃣ Checking detection results...');
    
    const { data: alerts } = await supabase
      .from('rugpull_alerts')
      .select('*')
      .eq('token_mint', tokenMint)
      .order('created_at', { ascending: false })
      .limit(1);

    if (alerts && alerts.length > 0) {
      console.log('✅ Rugpull was detected!');
      console.log(`   - Severity: ${alerts[0].severity}`);
      console.log(`   - Liquidity drop: ${alerts[0].liquidity_drop}%`);
    } else {
      console.log('❌ No rugpull alert found');
    }

    // Check execution queue
    const { data: executions } = await supabase
      .from('execution_queue')
      .select('*')
      .eq('token_mint', tokenMint)
      .order('created_at', { ascending: false })
      .limit(1);

    if (executions && executions.length > 0) {
      console.log('✅ Protection execution queued!');
      console.log(`   - Status: ${executions[0].status}`);
    } else {
      console.log('❌ No execution found in queue');
    }

    // Cleanup
    alertChannel.unsubscribe();
    systemChannel.unsubscribe();

    // Reset liquidity for next test
    console.log('\n5️⃣ Resetting liquidity for next test...');
    await supabase
      .from('liquidity_monitoring')
      .update({ 
        current_liquidity_usd: monitoring.baseline_liquidity_usd,
        current_liquidity_sol: monitoring.baseline_liquidity_sol
      })
      .eq('pool_address', poolAddress);

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Check command line arguments
if (process.argv.length < 4) {
  console.log(`
Usage: node test-rug-detection.ts <pool_address> <token_mint>

Example:
  node test-rug-detection.ts 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr pump7EYaHyb9fRodTJfk73TVvnnmcCb4CzBzvZR5YDXw

Note: Make sure the pool is already being monitored before running this test.
`);
  process.exit(1);
}

const poolAddress = process.argv[2];
const tokenMint = process.argv[3];

// Run the test
simulateRugPull(poolAddress, tokenMint)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });