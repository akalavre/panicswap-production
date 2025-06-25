// Watch for price velocity updates in real-time
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function watchPriceVelocities() {
  console.log('👀 Watching for price velocity updates...\n');
  console.log('The backend updates every 30 seconds. Monitoring for changes...\n');
  
  let lastUpdate = null;
  let attempts = 0;
  const maxAttempts = 20; // Watch for 100 seconds (20 * 5s)
  
  const checkInterval = setInterval(async () => {
    attempts++;
    
    try {
      const { data: stats } = await supabase
        .from('monitoring_stats')
        .select('*')
        .eq('token_mint', TEST_TOKEN)
        .eq('wallet_address', TEST_WALLET)
        .single();
      
      if (stats) {
        const hasChanged = lastUpdate && (
          stats.price_change_1m !== lastUpdate.price_change_1m ||
          stats.price_change_5m !== lastUpdate.price_change_5m
        );
        
        console.log(`[${new Date().toLocaleTimeString()}] Checking...`);
        console.log(`  💰 Current price changes:`);
        console.log(`     - 1m: ${stats.price_change_1m}%`);
        console.log(`     - 5m: ${stats.price_change_5m}%`);
        console.log(`  📊 Liquidity changes:`);
        console.log(`     - 1m: ${stats.liquidity_change_1m}%`);
        console.log(`     - 5m: ${stats.liquidity_change_5m}%`);
        console.log(`     - 30m: ${stats.liquidity_change_30m}%`);
        console.log(`  🚨 Alerts: ${stats.volume_spike ? 'Volume Spike' : 'None'}`);
        console.log(`  🎯 Active patterns: ${stats.active_patterns?.length || 0}`);
        
        if (hasChanged && (stats.price_change_1m !== 0 || stats.price_change_5m !== 0)) {
          console.log('\n✅ SUCCESS! Price velocities are now being calculated!');
          console.log('\n🎉 Final results:');
          console.log(`- 1-minute price change: ${stats.price_change_1m}%`);
          console.log(`- 5-minute price change: ${stats.price_change_5m}%`);
          console.log('\n📊 The anti-rugpull system now has complete data including:');
          console.log('- Real-time liquidity monitoring with velocities');
          console.log('- Price change tracking at 1m, 5m intervals');
          console.log('- Volume spike detection');
          console.log('- Pattern recognition (flash rug, panic selling, etc.)');
          console.log('- Risk scoring and alerts');
          
          console.log('\n✨ Test the monitoring API now to see all data populated!');
          clearInterval(checkInterval);
          return;
        }
        
        lastUpdate = stats;
        console.log(''); // Empty line for readability
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏱️ Monitoring timeout reached.');
        console.log('\nPossible reasons price changes are still zero:');
        console.log('1. Backend service not running or not processing this token');
        console.log('2. Historical price data needs more time to accumulate');
        console.log('3. LiquidityVelocityTracker may need restart to pick up changes');
        console.log('\nTry running: node populate-price-history.js');
        console.log('Then restart the backend to ensure it loads the new velocity calculation code');
        clearInterval(checkInterval);
      }
    } catch (error) {
      console.error('Error checking stats:', error);
    }
  }, 5000); // Check every 5 seconds
}

watchPriceVelocities();