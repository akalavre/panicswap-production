// Debug script to see exact database state
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function debugData() {
  console.log('🔍 Debugging monitoring data...\n');
  
  // 1. Check monitoring_stats
  console.log('1️⃣ monitoring_stats table:');
  const { data: stats, error: statsError } = await supabase
    .from('monitoring_stats')
    .select('*')
    .eq('token_mint', TEST_TOKEN)
    .eq('wallet_address', TEST_WALLET);
    
  if (stats && stats.length > 0) {
    console.log('Found', stats.length, 'record(s)');
    stats.forEach((stat, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('- current_liquidity:', stat.current_liquidity);
      console.log('- liquidity_change_5m:', stat.liquidity_change_5m);
      console.log('- price_change_5m:', stat.price_change_5m);
      console.log('- active_patterns:', stat.active_patterns);
      console.log('- updated_at:', stat.updated_at);
    });
  } else {
    console.log('❌ No records found');
  }
  
  // 2. Check if backend is overwriting data
  console.log('\n2️⃣ Recent updates (last 5 minutes):');
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentStats } = await supabase
    .from('monitoring_stats')
    .select('updated_at, current_liquidity, liquidity_change_5m')
    .eq('token_mint', TEST_TOKEN)
    .gte('updated_at', fiveMinutesAgo)
    .order('updated_at', { ascending: false });
    
  if (recentStats && recentStats.length > 0) {
    console.log('Found', recentStats.length, 'updates in last 5 minutes:');
    recentStats.forEach(stat => {
      console.log(`- ${stat.updated_at}: liquidity=${stat.current_liquidity}, change5m=${stat.liquidity_change_5m}`);
    });
  }
  
  // 3. Check if liquidity_velocity table exists
  console.log('\n3️⃣ Checking liquidity_velocity table:');
  const { data: velocityData, error: velocityError } = await supabase
    .from('liquidity_velocity')
    .select('*')
    .eq('token_mint', TEST_TOKEN)
    .limit(1);
    
  if (velocityError) {
    console.log('❌ Error or table not found:', velocityError.message);
  } else if (velocityData && velocityData.length > 0) {
    console.log('✅ Found velocity data');
  } else {
    console.log('❌ No velocity data found');
  }
  
  console.log('\n📝 Analysis:');
  if (stats && stats.length > 0 && stats[0].current_liquidity === 0) {
    console.log('- Data exists but values are zero');
    console.log('- This suggests the backend MonitoringStatsService is running');
    console.log('- But it\'s not finding data in pool_liquidity/token_prices tables');
    console.log('- Or the LiquidityVelocityTracker hasn\'t collected enough snapshots');
  }
}

debugData();