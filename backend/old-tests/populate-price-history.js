// Populate historical price data for testing price velocity calculations
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';

async function populatePriceHistory() {
  console.log('📈 Populating price history for testing...\n');
  
  try {
    const now = new Date();
    const currentPrice = 0.00095; // Current price
    
    // Create price history showing a decline
    const priceHistory = [
      { minutes: 0, price: currentPrice },
      { minutes: 1, price: 0.00096 },  // 1 minute ago
      { minutes: 2, price: 0.00098 },  // 2 minutes ago
      { minutes: 3, price: 0.00099 },  // 3 minutes ago
      { minutes: 5, price: 0.001 },    // 5 minutes ago (5% higher)
      { minutes: 10, price: 0.00102 }, // 10 minutes ago
      { minutes: 15, price: 0.00105 }, // 15 minutes ago
      { minutes: 30, price: 0.0011 },  // 30 minutes ago
      { minutes: 60, price: 0.00115 }  // 1 hour ago
    ];
    
    // Insert historical price data
    for (const entry of priceHistory) {
      const timestamp = new Date(now.getTime() - entry.minutes * 60 * 1000);
      
      const { error } = await supabase
        .from('token_price_history')
        .insert({
          token_mint: TEST_TOKEN,
          price: entry.price,
          liquidity: 48000 - (entry.minutes * 100), // Simulate liquidity decline
          market_cap: entry.price * 1000000000,
          recorded_at: timestamp.toISOString(),
          source: 'price_history_seed'
        });
      
      if (!error) {
        console.log(`✅ Added price ${entry.price} from ${entry.minutes} minutes ago`);
      }
    }
    
    // Also update current price in token_prices
    const { error: priceError } = await supabase
      .from('token_prices')
      .upsert({
        token_mint: TEST_TOKEN,
        price: currentPrice,
        price_usd: currentPrice,
        liquidity: 48000,
        market_cap: currentPrice * 1000000000,
        volume_24h: 45000,
        platform: 'pump.fun',
        updated_at: now.toISOString()
      }, { onConflict: 'token_mint' });
      
    if (!priceError) {
      console.log('\n✅ Updated current price in token_prices');
    }
    
    console.log('\n📊 Price history populated!');
    console.log('\nExpected results:');
    console.log('- 1m price change: -1.04% (from 0.00096 to 0.00095)');
    console.log('- 5m price change: -5.00% (from 0.001 to 0.00095)');
    console.log('- 30m price change: -13.64% (from 0.0011 to 0.00095)');
    
    console.log('\n🔄 The backend will now calculate price velocities on the next update cycle');
    console.log('Wait 30 seconds then test the API to see price changes!');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

populatePriceHistory();