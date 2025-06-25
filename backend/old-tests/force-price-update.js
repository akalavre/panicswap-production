// Force immediate price velocity update for testing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function forcePriceUpdate() {
  console.log('💰 Forcing price velocity update...\n');
  
  try {
    // Ensure token is marked as protected
    const { error: walletError } = await supabase
      .from('wallet_tokens')
      .update({ 
        is_protected: true,
        enable_monitoring: true,
        mempool_monitoring: true,
        protection_enabled_at: new Date().toISOString()
      })
      .eq('token_mint', TEST_TOKEN)
      .eq('wallet_address', TEST_WALLET);
    
    if (!walletError) {
      console.log('✅ Token marked as protected and monitored');
    }
    
    // Get current monitoring stats
    const { data: currentStats } = await supabase
      .from('monitoring_stats')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .eq('wallet_address', TEST_WALLET)
      .single();
    
    if (currentStats) {
      console.log('\n📊 Current monitoring stats:');
      console.log(`  Liquidity: $${currentStats.current_liquidity}`);
      console.log(`  Price changes:`)
      console.log(`    1m: ${currentStats.price_change_1m}%`);
      console.log(`    5m: ${currentStats.price_change_5m}%`);
      
      if (currentStats.price_change_1m === 0 && currentStats.price_change_5m === 0) {
        console.log('\n⏳ Price changes still zero. Backend needs to run update cycle.');
        console.log('The LiquidityVelocityTracker will calculate changes on next poll.');
        console.log('\n💡 To see immediate results:');
        console.log('1. Ensure backend is running');
        console.log('2. Wait 30 seconds for next update cycle');
        console.log('3. Check the API again');
      } else {
        console.log('\n✅ Price changes are being calculated!');
      }
    }
    
    // Show what price history we have
    const { data: priceHistory } = await supabase
      .from('token_price_history')
      .select('price, recorded_at')
      .eq('token_mint', TEST_TOKEN)
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (priceHistory && priceHistory.length > 0) {
      console.log('\n📈 Recent price history:');
      priceHistory.forEach((entry, i) => {
        const age = Math.round((Date.now() - new Date(entry.recorded_at).getTime()) / 60000);
        console.log(`  ${i + 1}. $${entry.price} (${age} minutes ago)`);
      });
    }
    
    console.log('\n✨ Setup complete! The backend will calculate price velocities using this history.');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

forcePriceUpdate();