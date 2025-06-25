// Force velocity calculation manually
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ACTIVE_TOKEN = 'BmyLzEuNq9rGHxuwxwJq9zo7wKfaFS9GPWetz9Jhpump';
const WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function forceVelocityCalc() {
  console.log('⚡ Forcing Velocity Calculation\n');
  
  try {
    // Get price history
    const { data: priceHistory } = await supabase
      .from('token_price_history')
      .select('price, recorded_at')
      .eq('token_mint', ACTIVE_TOKEN)
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (!priceHistory || priceHistory.length < 2) {
      console.log('❌ Not enough price history');
      return;
    }
    
    const now = Date.now();
    const currentPrice = priceHistory[0].price;
    
    // Calculate velocities
    let price1m = 0;
    let price5m = 0;
    
    // Find price from ~1 minute ago
    const price1mAgo = priceHistory.find(p => {
      const age = (now - new Date(p.recorded_at).getTime()) / 60000;
      return age >= 0.8 && age <= 1.5;
    });
    
    if (price1mAgo) {
      price1m = ((currentPrice - price1mAgo.price) / price1mAgo.price) * 100;
      console.log(`1m velocity: ${currentPrice} vs ${price1mAgo.price} = ${price1m.toFixed(2)}%`);
    }
    
    // Find price from ~5 minutes ago
    const price5mAgo = priceHistory.find(p => {
      const age = (now - new Date(p.recorded_at).getTime()) / 60000;
      return age >= 4.5 && age <= 5.5;
    });
    
    if (price5mAgo) {
      const totalChange = ((currentPrice - price5mAgo.price) / price5mAgo.price) * 100;
      price5m = totalChange / 5; // Per minute
      console.log(`5m velocity: ${currentPrice} vs ${price5mAgo.price} = ${totalChange.toFixed(2)}% total (${price5m.toFixed(2)}%/min)`);
    }
    
    // Update monitoring stats
    console.log('\n📝 Updating monitoring stats...');
    
    const { error } = await supabase
      .from('monitoring_stats')
      .update({
        price_change_1m: price1m,
        price_change_5m: price5m,
        last_check_at: new Date(),
        updated_at: new Date()
      })
      .eq('token_mint', ACTIVE_TOKEN)
      .eq('wallet_address', WALLET);
    
    if (!error) {
      console.log('✅ Monitoring stats updated!');
      console.log(`   Price 1m: ${price1m.toFixed(2)}%`);
      console.log(`   Price 5m: ${price5m.toFixed(2)}%`);
      
      // Also update liquidity_velocity table
      await supabase
        .from('liquidity_velocity')
        .upsert({
          token_mint: ACTIVE_TOKEN,
          price_velocity_1m: price1m,
          price_velocity_5m: price5m,
          timestamp: new Date()
        });
      
      console.log('\n🎉 Success! Test the API now:');
      console.log(`http://localhost/PanicSwap-php/api/monitoring-status.php?token_mint=${ACTIVE_TOKEN}&wallet_address=${WALLET}`);
    } else {
      console.error('Error updating stats:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

forceVelocityCalc();