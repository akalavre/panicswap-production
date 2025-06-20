import dotenv from 'dotenv';
dotenv.config();

async function testWalletSync() {
  const backendUrl = 'http://localhost:3001';
  const testWallet = 'GH1TpdwvPJNgvZ1jfwvxzTKecNVQkJPLfNfCsYvcvnVu'; // Example wallet with tokens
  
  console.log('Testing wallet sync to activate tokens for price polling...\n');
  
  try {
    // 1. Sync wallet
    console.log(`1. Syncing wallet ${testWallet}...`);
    const syncResponse = await fetch(`${backendUrl}/api/wallet/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: testWallet })
    });
    
    if (!syncResponse.ok) {
      console.error('Sync failed:', await syncResponse.text());
      return;
    }
    
    const syncResult = await syncResponse.json();
    console.log(`Synced ${syncResult.tokens?.length || 0} tokens`);
    
    // 2. Get wallet tokens
    console.log('\n2. Fetching wallet tokens...');
    const tokensResponse = await fetch(`${backendUrl}/api/wallet/tokens/${testWallet}`);
    
    if (!tokensResponse.ok) {
      console.error('Failed to fetch tokens:', await tokensResponse.text());
      return;
    }
    
    const tokensResult = await tokensResponse.json();
    console.log(`Found ${tokensResult.tokens?.length || 0} tokens for wallet`);
    
    // Show token details with prices
    if (tokensResult.tokens && tokensResult.tokens.length > 0) {
      console.log('\nTokens with prices:');
      tokensResult.tokens.forEach((token: any) => {
        const price = token.token_prices?.price || token.price || 0;
        const hasPrice = price > 0;
        console.log(`- ${token.symbol}: ${token.mint.substring(0, 8)}... Price: $${price} ${hasPrice ? '✓' : '✗'}`);
      });
    }
    
    // 3. Wait and check if prices are being updated
    console.log('\n3. Waiting 10 seconds for price polling to update...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Fetch again to see if prices updated
    console.log('\n4. Checking for price updates...');
    const updatedResponse = await fetch(`${backendUrl}/api/wallet/tokens/${testWallet}`);
    
    if (updatedResponse.ok) {
      const updatedResult = await updatedResponse.json();
      let priceUpdates = 0;
      
      if (updatedResult.tokens) {
        updatedResult.tokens.forEach((token: any, index: number) => {
          const oldPrice = tokensResult.tokens[index]?.token_prices?.price || 0;
          const newPrice = token.token_prices?.price || 0;
          if (oldPrice !== newPrice && newPrice > 0) {
            priceUpdates++;
            console.log(`Price updated for ${token.symbol}: $${oldPrice} → $${newPrice}`);
          }
        });
      }
      
      if (priceUpdates === 0) {
        console.log('No price updates detected. Price polling might not be working.');
      } else {
        console.log(`${priceUpdates} tokens had price updates!`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testWalletSync().then(() => {
  console.log('\nTest completed');
  process.exit(0);
});