import fetch from 'node-fetch';

async function testAPIStructure() {
  try {
    const walletAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
    const response = await fetch(`http://localhost:3001/api/wallet/tokens/${walletAddress}`);
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    if (data.tokens && data.tokens.length > 0) {
      console.log('API Response Structure:');
      console.log('====================');
      
      // Show the structure of the first token
      const firstToken = data.tokens[0];
      console.log('\nFirst token structure:');
      console.log(JSON.stringify(firstToken, null, 2));
      
      // Check if token_prices exists and has the change fields
      if (firstToken.token_prices) {
        console.log('\ntoken_prices fields:');
        console.log('  price_change_24h:', firstToken.token_prices.price_change_24h);
        console.log('  liquidity_change_1h:', firstToken.token_prices.liquidity_change_1h);
        console.log('  liquidity_change_24h:', firstToken.token_prices.liquidity_change_24h);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPIStructure();