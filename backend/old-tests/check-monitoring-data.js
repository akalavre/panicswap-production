// Script to check what data exists for test token
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function checkMonitoringData() {
  console.log('🔍 Checking monitoring data for test token...\n');
  
  try {
    // 1. Check protected_tokens
    console.log('1️⃣ Protected tokens:');
    const { data: protectedToken } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .eq('wallet_address', TEST_WALLET)
      .single();
    console.log(protectedToken ? '✅ Found:' : '❌ Not found');
    if (protectedToken) {
      console.log('   - is_active:', protectedToken.is_active);
      console.log('   - mempool_monitoring:', protectedToken.mempool_monitoring);
      console.log('   - monitoring_active:', protectedToken.monitoring_active);
      console.log('   - pool_address:', protectedToken.pool_address);
    }
    
    // 2. Check monitoring_stats
    console.log('\n2️⃣ Monitoring stats:');
    const { data: monitoringStats } = await supabase
      .from('monitoring_stats')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .single();
    console.log(monitoringStats ? '✅ Found:' : '❌ Not found');
    if (monitoringStats) {
      console.log('   - current_liquidity:', monitoringStats.current_liquidity);
      console.log('   - liquidity_change_5m:', monitoringStats.liquidity_change_5m);
      console.log('   - last_check_at:', monitoringStats.last_check_at);
    }
    
    // 3. Check pool_liquidity
    console.log('\n3️⃣ Pool liquidity (latest):');
    const { data: poolLiquidity } = await supabase
      .from('pool_liquidity')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    console.log(poolLiquidity ? '✅ Found:' : '❌ Not found');
    if (poolLiquidity) {
      console.log('   - liquidity_usd:', poolLiquidity.liquidity_usd);
      console.log('   - timestamp:', poolLiquidity.timestamp);
    }
    
    // 4. Check token_prices
    console.log('\n4️⃣ Token prices:');
    const { data: tokenPrice } = await supabase
      .from('token_prices')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .single();
    console.log(tokenPrice ? '✅ Found:' : '❌ Not found');
    if (tokenPrice) {
      console.log('   - price_usd:', tokenPrice.price_usd);
      console.log('   - liquidity:', tokenPrice.liquidity);
      console.log('   - updated_at:', tokenPrice.updated_at);
    }
    
    // 5. Check token_volumes
    console.log('\n5️⃣ Token volumes:');
    const { data: tokenVolume } = await supabase
      .from('token_volumes')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .single();
    console.log(tokenVolume ? '✅ Found:' : '❌ Not found');
    if (tokenVolume) {
      console.log('   - volume_24h_usd:', tokenVolume.volume_24h_usd);
      console.log('   - updated_at:', tokenVolume.updated_at);
    }
    
    // 6. Check rugcheck_reports
    console.log('\n6️⃣ Rugcheck report:');
    const { data: rugcheckReport } = await supabase
      .from('rugcheck_reports')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .single();
    console.log(rugcheckReport ? '✅ Found:' : '❌ Not found');
    if (rugcheckReport) {
      console.log('   - holders:', rugcheckReport.holders);
      console.log('   - risk_level:', rugcheckReport.risk_level);
      console.log('   - liquidity_current:', rugcheckReport.liquidity_current);
    }
    
    console.log('\n✨ Check complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the check
checkMonitoringData();