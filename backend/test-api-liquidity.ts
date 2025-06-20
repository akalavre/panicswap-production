import fetch from 'node-fetch';

async function testAPILiquidity() {
  try {
    // Test wallet address with tokens
    const walletAddress = 'ByJgv5Hn4U5Y7qD9vMJNQo8VhYCRAjdC2xvCMcHg2uXy';
    
    const response = await fetch(`http://localhost:3001/api/wallet/tokens/${walletAddress}`);
    const data = await response.json();
    
    if (!data.tokens || data.tokens.length === 0) {
      console.log('No tokens found for wallet');
      return;
    }
    
    console.log(`Found ${data.tokens.length} tokens\n`);
    
    // Check if liquidity changes are present
    data.tokens.slice(0, 5).forEach((token: any) => {
      console.log(`Token: ${token.symbol}`);
      console.log(`  Liquidity: $${token.liquidity?.toFixed(2) || 'N/A'}`);
      console.log(`  1h Liquidity Change: ${token.liquidityChange1h?.toFixed(2) || '0.00'}%`);
      console.log(`  24h Liquidity Change: ${token.liquidityChange24h?.toFixed(2) || '0.00'}%`);
      console.log(`  24h Price Change: ${token.change24h?.toFixed(2) || '0.00'}%`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPILiquidity();