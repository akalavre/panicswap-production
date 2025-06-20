import 'dotenv/config';
import fetch from 'node-fetch';

async function testTokenAge() {
  const walletAddress = process.env.TEST_WALLET_ADDRESS || 'YOUR_WALLET_ADDRESS_HERE';
  const apiUrl = `http://localhost:3001/api/wallet/tokens/${walletAddress}`;
  
  console.log('Testing token age endpoint...');
  console.log(`Fetching tokens for wallet: ${walletAddress}`);
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error response:', data);
      return;
    }
    
    console.log(`\nFound ${data.tokens?.length || 0} tokens`);
    
    // Check if any tokens have launch_time
    const tokensWithAge = data.tokens?.filter((token: any) => token.launch_time) || [];
    console.log(`\nTokens with launch_time: ${tokensWithAge.length}`);
    
    // Display token ages
    tokensWithAge.slice(0, 5).forEach((token: any) => {
      const launchTime = new Date(token.launch_time);
      const ageMs = Date.now() - launchTime.getTime();
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);
      
      console.log(`\nToken: ${token.symbol} (${token.name})`);
      console.log(`  Mint: ${token.mint}`);
      console.log(`  Launch Time: ${token.launch_time}`);
      console.log(`  Age: ${ageDays}d ${ageHours % 24}h`);
    });
    
    // Check tokens without launch_time
    const tokensWithoutAge = data.tokens?.filter((token: any) => !token.launch_time) || [];
    if (tokensWithoutAge.length > 0) {
      console.log(`\n⚠️  ${tokensWithoutAge.length} tokens without launch_time:`);
      tokensWithoutAge.slice(0, 3).forEach((token: any) => {
        console.log(`  - ${token.symbol}: ${token.mint}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testTokenAge();