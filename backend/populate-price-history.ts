import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function populatePriceHistory() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get active tokens with current prices
  const { data: tokens, error: tokensError } = await supabase
    .from('token_metadata')
    .select(`
      mint,
      symbol,
      token_prices!inner(
        price,
        liquidity,
        market_cap
      )
    `)
    .eq('is_active', true)
    .not('token_prices.price', 'is', null);
    
  if (tokensError) {
    console.error('Error fetching tokens:', tokensError);
    return;
  }
  
  if (!tokens || tokens.length === 0) {
    console.log('No active tokens with prices found');
    return;
  }
  
  console.log(`Found ${tokens.length} active tokens with prices`);
  
  // For each token, create historical price entries
  for (const token of tokens) {
    const priceData = Array.isArray(token.token_prices) ? token.token_prices[0] : token.token_prices;
    const currentPrice = priceData.price;
    const currentLiquidity = priceData.liquidity || 0;
    const marketCap = priceData.market_cap || 0;
    
    console.log(`\nPopulating history for ${token.symbol}:`);
    console.log(`  Current price: $${currentPrice}`);
    console.log(`  Current liquidity: $${currentLiquidity}`);
    
    // Create entries for the past 2 hours (every 5 minutes)
    const entries = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) { // 24 entries * 5 minutes = 2 hours
      const minutesAgo = i * 5;
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      // Add some variation to simulate price movement
      // Prices vary by up to ±5% over 2 hours
      const priceVariation = 1 + (Math.sin(i / 4) * 0.05);
      const liquidityVariation = 1 + (Math.sin(i / 3) * 0.03); // Liquidity varies less
      
      entries.push({
        token_mint: token.mint,
        price: currentPrice * priceVariation,
        liquidity: currentLiquidity * liquidityVariation,
        volume_24h: null,
        market_cap: marketCap * priceVariation,
        recorded_at: timestamp.toISOString(),
        source: 'price_polling'
      });
    }
    
    // Insert in batches
    const { error: insertError } = await supabase
      .from('token_price_history')
      .insert(entries);
      
    if (insertError) {
      console.error(`Error inserting history for ${token.symbol}:`, insertError);
    } else {
      console.log(`  Created ${entries.length} historical entries`);
    }
  }
  
  // Test the SQL functions
  console.log('\nTesting SQL functions...');
  
  const testMint = tokens[0].mint;
  const { data: changes, error: changesError } = await supabase
    .rpc('calculate_token_changes', { p_token_mint: testMint });
    
  if (changesError) {
    console.error('Error testing SQL function:', changesError);
  } else {
    console.log('Sample calculation result:', changes);
  }
  
  console.log('\nDone! Historical price data has been populated.');
}

populatePriceHistory().catch(console.error);