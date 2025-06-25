// Complete fix for backend data - populates all tables the backend expects
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function fixBackendData() {
  console.log('🔧 Complete backend data fix...\n');
  
  try {
    const now = new Date();
    const basePrice = 0.001;
    const currentLiquidity = 48000; // Slightly lower to show decrease
    
    // 1. Add multiple historical pool_liquidity points
    console.log('1️⃣ Creating pool liquidity history...');
    const liquidityHistory = [];
    
    // Create 20 data points over the last hour
    for (let i = 0; i < 20; i++) {
      const minutesAgo = i * 3; // Every 3 minutes
      const timestamp = new Date(now.getTime() - (minutesAgo * 60 * 1000));
      
      // Simulate gradual liquidity decrease (slow bleed pattern)
      const liquidity = currentLiquidity + (i * 150); // Was higher in the past
      
      liquidityHistory.push({
        token_mint: TEST_TOKEN,
        pool_address: 'DummyPoolAddress123',
        dex: 'pump.fun',
        liquidity_usd: liquidity,
        liquidity_sol: liquidity / 150,
        liquidity_token: 1000000,
        timestamp: timestamp.toISOString()
      });
    }
    
    // Delete old data first to avoid duplicates
    await supabase
      .from('pool_liquidity')
      .delete()
      .eq('token_mint', TEST_TOKEN);
    
    // Insert new history
    const { error: liqError } = await supabase
      .from('pool_liquidity')
      .insert(liquidityHistory);
      
    if (liqError) {
      console.error('Error inserting liquidity:', liqError);
    } else {
      console.log(`✅ Created ${liquidityHistory.length} liquidity data points`);
    }
    
    // 2. Update token_prices with current data
    console.log('\n2️⃣ Updating token prices...');
    const { error: priceError } = await supabase
      .from('token_prices')
      .upsert({
        token_mint: TEST_TOKEN,
        price: basePrice * 0.95, // 5% lower than base
        price_usd: basePrice * 0.95,
        liquidity: currentLiquidity,
        market_cap: (basePrice * 0.95) * 1000000000,
        volume_24h: 22000,
        platform: 'pump.fun',
        updated_at: now.toISOString()
      }, { onConflict: 'token_mint' });
      
    if (!priceError) {
      console.log('✅ Token prices updated');
    }
    
    // 3. Create price history in token_prices
    console.log('\n3️⃣ Creating price history...');
    // Since token_prices uses token_mint as primary key, we can't store history there
    // The backend expects current price only
    
    // 4. Update token_volumes
    console.log('\n4️⃣ Updating token volumes...');
    const { error: volError } = await supabase
      .from('token_volumes')
      .upsert({
        token_mint: TEST_TOKEN,
        volume_24h_usd: 22000,
        volume_1h_usd: 1800,
        volume_5m_usd: 150,
        trade_count_24h: 450,
        trade_count_1h: 18,
        timestamp: now.toISOString(),
        updated_at: now.toISOString()
      }, { onConflict: 'token_mint,timestamp' });
      
    if (!volError) {
      console.log('✅ Token volumes updated');
    }
    
    // 5. Create liquidity_velocity data
    console.log('\n5️⃣ Creating liquidity velocity data...');
    const velocityData = {
      token_mint: TEST_TOKEN,
      timestamp: now.toISOString(),
      liquidity_usd: currentLiquidity,
      liquidity_velocity_1m: -0.8,
      liquidity_velocity_5m: -4.2,
      liquidity_velocity_30m: -12.5,
      price_velocity_1m: -0.5,
      price_velocity_5m: -2.8,
      price_velocity_30m: -8.2,
      volume_velocity_1m: 15,
      volume_velocity_5m: 8,
      volume_velocity_30m: -5,
      flash_rug_alert: false,
      rapid_drain_alert: false,
      slow_bleed_alert: true,
      volume_spike_alert: false
    };
    
    const { error: velError } = await supabase
      .from('liquidity_velocity')
      .upsert(velocityData, { onConflict: 'token_mint,timestamp' });
      
    if (velError) {
      console.error('Velocity error:', velError);
      // Table might not exist, that's OK
    } else {
      console.log('✅ Velocity data created');
    }
    
    // 6. Wait a moment for backend to process
    console.log('\n⏳ Waiting 3 seconds for backend to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 7. Check if monitoring stats updated
    console.log('\n7️⃣ Checking monitoring stats...');
    const { data: finalStats } = await supabase
      .from('monitoring_stats')
      .select('current_liquidity, liquidity_change_5m, price_change_5m')
      .eq('token_mint', TEST_TOKEN)
      .single();
      
    if (finalStats) {
      console.log('Current stats:');
      console.log('- Liquidity:', finalStats.current_liquidity);
      console.log('- Liquidity change 5m:', finalStats.liquidity_change_5m);
      console.log('- Price change 5m:', finalStats.price_change_5m);
    }
    
    console.log('\n✨ Complete! The backend should now calculate real velocities.');
    console.log('\n📊 Next steps:');
    console.log('1. Wait 30 seconds for next backend update cycle');
    console.log('2. Test the API again');
    console.log('3. You should see negative liquidity/price changes (slow bleed pattern)');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

fixBackendData();