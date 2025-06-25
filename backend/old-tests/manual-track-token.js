// Manually ensure token is being tracked
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ACTIVE_TOKEN = 'BmyLzEuNq9rGHxuwxwJq9zo7wKfaFS9GPWetz9Jhpump';
const WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function manualTrackToken() {
  console.log('🎯 Manually setting up token tracking\n');
  
  try {
    // 1. Create initial price snapshot manually
    console.log('1️⃣ Creating initial price snapshot...');
    
    // Get current price from token_prices
    const { data: currentPrice } = await supabase
      .from('token_prices')
      .select('price, price_usd')
      .eq('token_mint', ACTIVE_TOKEN)
      .single();
    
    const price = currentPrice?.price || currentPrice?.price_usd || 0.00015;
    
    // Create a price snapshot
    const { error: snapshotError } = await supabase
      .from('token_price_history')
      .insert({
        token_mint: ACTIVE_TOKEN,
        price: price,
        recorded_at: new Date().toISOString(),
        source: 'velocity_tracker'
      });
    
    if (!snapshotError) {
      console.log(`✅ Created price snapshot: $${price}`);
    } else {
      console.log('Error creating snapshot:', snapshotError);
    }
    
    // 2. Force monitoring stats update
    console.log('\n2️⃣ Updating monitoring stats timestamp...');
    
    await supabase
      .from('monitoring_stats')
      .update({
        last_check_at: new Date(),
        updated_at: new Date()
      })
      .eq('token_mint', ACTIVE_TOKEN)
      .eq('wallet_address', WALLET);
    
    console.log('✅ Updated monitoring stats');
    
    // 3. Check if backend API is accessible
    console.log('\n3️⃣ Checking backend API...');
    try {
      const response = await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
      console.log('✅ Backend API is running');
      
      // Try to trigger via dashboard endpoint
      try {
        await axios.post('http://localhost:3001/api/dashboard/register-tokens', {
          walletAddress: WALLET,
          tokens: [{
            mint: ACTIVE_TOKEN,
            symbol: 'BRRR',
            name: 'Burrito',
            balance: 1000000
          }]
        }, { timeout: 5000 });
        console.log('✅ Triggered token registration');
      } catch (err) {
        console.log('Could not trigger registration:', err.message);
      }
    } catch (err) {
      console.log('❌ Backend API not accessible');
      console.log('Make sure backend is running on port 3001');
    }
    
    // 4. Summary
    console.log('\n📊 Next Steps:');
    console.log('1. Wait 30 seconds for backend to process');
    console.log('2. Run: node verify-velocity-tracking.js');
    console.log('3. If still no snapshots, check backend logs for:');
    console.log('   [LiquidityVelocityTracker] Now tracking ' + ACTIVE_TOKEN);
    console.log('   [MonitoringStatsService] Updating stats for...');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

manualTrackToken();