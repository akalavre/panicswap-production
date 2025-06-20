#!/usr/bin/env ts-node

import fetch from 'node-fetch';

async function testAddTokenEndpoint() {
  const API_URL = 'http://localhost:3001/api/test/add-token';
  
  // Test data - you can also pass these as command line arguments
  const testTokenMint = process.argv[2] || 'TestTokenMint' + Date.now(); // Unique mint address
  const testWalletAddress = process.argv[3] || 'TestWallet123456789';
  
  console.log('='.repeat(60));
  console.log('Testing POST /api/test/add-token endpoint');
  console.log('='.repeat(60));
  console.log('Token Mint:', testTokenMint);
  console.log('Wallet Address:', testWalletAddress);
  console.log('API URL:', API_URL);
  console.log('='.repeat(60));
  
  try {
    console.log('\n📤 Sending request...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenMint: testTokenMint,
        walletAddress: testWalletAddress
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Test token added\n');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.data) {
        console.log('\n📊 Token Details:');
        console.log('- Symbol:', data.data.symbol);
        console.log('- Name:', data.data.name);
        console.log('- Balance:', data.data.balance);
        console.log('- Protection Enabled:', data.data.protectionSettings?.auto_protection_enabled);
        console.log('- Price Threshold:', data.data.protectionSettings?.price_threshold + '%');
        console.log('- Liquidity Threshold:', data.data.protectionSettings?.liquidity_threshold + '%');
      }
    } else {
      console.error('❌ Error Response:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    console.log('\n💡 Make sure the backend server is running on port 3001');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the test
testAddTokenEndpoint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });