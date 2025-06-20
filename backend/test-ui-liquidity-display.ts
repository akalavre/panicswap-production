import 'dotenv/config';
import fetch from 'node-fetch';

async function testUILiquidityDisplay() {
  const walletAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
  const apiUrl = `http://localhost:3001/api/wallet/tokens/${walletAddress}`;
  
  console.log('Testing UI liquidity display...\n');
  console.log('Fetching tokens from API...');
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error response:', data);
      return;
    }
    
    console.log(`Found ${data.tokens?.length || 0} tokens\n`);
    
    // Check tokens with price data
    const tokensWithPrices = data.tokens?.filter((token: any) => token.token_prices) || [];
    console.log(`Tokens with price data: ${tokensWithPrices.length}\n`);
    
    // Display detailed info for first 3 tokens
    tokensWithPrices.slice(0, 3).forEach((token: any) => {
      console.log(`Token: ${token.symbol} (${token.name})`);
      console.log(`  Mint: ${token.mint}`);
      console.log(`  Price Data:`);
      console.log(`    - Current Price: $${token.token_prices.price || 0}`);
      console.log(`    - Current Liquidity: $${token.token_prices.liquidity || 0}`);
      console.log(`    - 24h Price Change: ${token.token_prices.price_change_24h || 0}%`);
      console.log(`    - 1h Liquidity Change: ${token.token_prices.liquidity_change_1h || 0}%`);
      console.log(`    - 24h Liquidity Change: ${token.token_prices.liquidity_change_24h || 0}%`);
      console.log('');
    });
    
    // Check if any tokens have non-zero liquidity changes
    const tokensWithLiqChange = tokensWithPrices.filter((token: any) => 
      token.token_prices.liquidity_change_1h !== 0 || 
      token.token_prices.liquidity_change_24h !== 0
    );
    
    console.log(`\nTokens with non-zero liquidity changes: ${tokensWithLiqChange.length}`);
    
    if (tokensWithLiqChange.length === 0) {
      console.log('\nNo tokens have liquidity changes yet.');
      console.log('This is expected if:');
      console.log('1. Price polling service hasn\'t been running long enough (needs 1+ hours)');
      console.log('2. No liquidity changes have occurred');
      console.log('3. Token price history table is empty');
      console.log('\nRun the price polling service for a while to accumulate data.');
    } else {
      console.log('\nLiquidity changes detected! The UI should display:');
      console.log('- LiquidityChangeIndicator badges in the liquidity column');
      console.log('- 24h price change % in the 24h % column');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testUILiquidityDisplay();