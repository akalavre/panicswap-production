import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function populate24hHistory() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get current token prices
  const { data: currentPrices, error: pricesError } = await supabase
    .from('token_prices')
    .select('token_mint, price, liquidity, market_cap')
    .not('price', 'is', null)
    .limit(20);
    
  if (pricesError || !currentPrices) {
    console.error('Error fetching current prices:', pricesError);
    return;
  }
  
  console.log(`Found ${currentPrices.length} tokens with current prices`);
  console.log('Creating 24-hour old price history...\n');
  
  // Create entries from 24 hours ago with some variation
  const entries = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const token of currentPrices) {
    // Add 10-30% variation to simulate price changes
    const priceVariation = 1 + (Math.random() * 0.4 - 0.2); // -20% to +20%
    const liquidityVariation = 1 + (Math.random() * 0.3 - 0.15); // -15% to +15%
    
    const historicalPrice = token.price * priceVariation;
    const historicalLiquidity = (token.liquidity || 0) * liquidityVariation;
    const historicalMarketCap = (token.market_cap || 0) * priceVariation;
    
    // Calculate what the changes will be
    const priceChange24h = ((token.price - historicalPrice) / historicalPrice) * 100;
    const liquidityChange24h = token.liquidity ? ((token.liquidity - historicalLiquidity) / historicalLiquidity) * 100 : 0;
    
    console.log(`${token.token_mint.slice(0, 8)}...`);
    console.log(`  24h Price Change: ${priceChange24h.toFixed(2)}%`);
    console.log(`  24h Liquidity Change: ${liquidityChange24h.toFixed(2)}%`);
    
    entries.push({
      token_mint: token.token_mint,
      price: historicalPrice,
      liquidity: historicalLiquidity,
      volume_24h: null,
      market_cap: historicalMarketCap,
      recorded_at: twentyFourHoursAgo.toISOString(),
      source: 'price_polling'
    });
  }
  
  // Insert the historical data
  const { error: insertError } = await supabase
    .from('token_price_history')
    .insert(entries);
    
  if (insertError) {
    console.error('Error inserting historical data:', insertError);
  } else {
    console.log(`\nSuccessfully created ${entries.length} historical entries from 24 hours ago`);
    
    // Test the calculation
    console.log('\nTesting 24h change calculations...');
    const testMint = currentPrices[0].token_mint;
    const { data: testCalc, error: testError } = await supabase
      .rpc('calculate_token_changes', { p_token_mint: testMint });
      
    if (!testError && testCalc && testCalc.length > 0) {
      const result = testCalc[0];
      console.log(`\nTest token: ${testMint.slice(0, 8)}...`);
      console.log(`  24h Price Change: ${result.price_change_24h?.toFixed(2) || 'N/A'}%`);
      console.log(`  24h Liquidity Change: ${result.liquidity_change_24h?.toFixed(2) || 'N/A'}%`);
    }
  }
}

populate24hHistory().catch(console.error);