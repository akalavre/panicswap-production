import supabase from './src/utils/supabaseClient';

async function checkTokenPrices() {
  try {
    console.log('Fetching token prices from database...\n');
    
    // First, let's see what columns are available
    const { data: sampleRow, error: sampleError } = await supabase
      .from('token_prices')
      .select('*')
      .limit(1);
    
    if (sampleRow && sampleRow.length > 0) {
      console.log('Available columns in token_prices table:');
      console.log(Object.keys(sampleRow[0]));
      console.log('\n');
    }
    
    // Query token_prices table
    const { data: prices, error } = await supabase
      .from('token_prices')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching token prices:', error);
      return;
    }
    
    if (!prices || prices.length === 0) {
      console.log('No token prices found in database');
      return;
    }
    
    console.log(`Found ${prices.length} token price records:\n`);
    
    // Display the raw price values
    prices.forEach((price, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Token Address: ${price.token_address || price.token_mint || price.mint || 'N/A'}`);
      console.log(`  Raw Price Value: ${price.price_usd}`);
      console.log(`  Scientific Notation: ${price.price_usd}`);
      console.log(`  Full Precision: ${price.price_usd.toFixed(20)}`);
      console.log(`  Market Cap: ${price.market_cap}`);
      console.log(`  Price Change 24h: ${price.price_change_24h}`);
      console.log(`  Updated At: ${price.updated_at}`);
      console.log('---');
    });
    
    // Check if any prices are very small
    const verySmallPrices = prices.filter(p => p.price_usd < 0.0001 && p.price_usd > 0);
    if (verySmallPrices.length > 0) {
      console.log(`\nFound ${verySmallPrices.length} tokens with very small prices (< $0.0001):`);
      verySmallPrices.forEach(price => {
        console.log(`  ${price.token_mint}: $${price.price_usd} (${price.price_usd.toExponential()})`);
      });
    }
    
    // Check for zero prices
    const zeroPrices = prices.filter(p => p.price_usd === 0);
    if (zeroPrices.length > 0) {
      console.log(`\nFound ${zeroPrices.length} tokens with zero prices:`);
      zeroPrices.forEach(price => {
        console.log(`  ${price.token_mint}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokenPrices();