import supabase from './src/utils/supabaseClient';

async function testPriceFetch() {
  console.log('Testing price fetch from Supabase...');
  
  // Test tokens that should have prices
  const testTokens = [
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'So11111111111111111111111111111111111111112',  // SOL
  ];
  
  try {
    // Fetch prices for test tokens
    const { data: prices, error } = await supabase
      .from('token_prices')
      .select('*')
      .in('token_mint', testTokens);
      
    if (error) {
      console.error('Error fetching prices:', error);
      return;
    }
    
    console.log('\nPrices found:');
    prices?.forEach(price => {
      console.log(`${price.symbol || price.token_mint}: $${price.price_usd}`);
    });
    
    // Check if any prices are 0
    const zeroPrices = prices?.filter(p => parseFloat(p.price_usd) === 0) || [];
    if (zeroPrices.length > 0) {
      console.log('\nTokens with $0 price:');
      zeroPrices.forEach(p => console.log(`- ${p.symbol || p.token_mint}`));
    }
    
    // Check last update times
    console.log('\nLast update times:');
    prices?.forEach(price => {
      const lastUpdate = new Date(price.updated_at);
      const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
      console.log(`${price.symbol || price.token_mint}: ${minutesAgo} minutes ago`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPriceFetch().catch(console.error);