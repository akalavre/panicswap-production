import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_WALLET = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
const TEST_TOKEN_MINT = 'TEST_TOKEN_MINT_123'; // This would be replaced with an actual test token

async function testDemoProtectionFlow() {
  console.log('🧪 Testing Demo Protection Flow...\n');

  try {
    // Step 1: Check wallet tokens (including test tokens)
    console.log('1️⃣ Fetching wallet tokens...');
    const tokensResponse = await axios.get(`${API_URL}/wallet/tokens/${TEST_WALLET}`);
    console.log(`Found ${tokensResponse.data.tokens.length} tokens`);
    
    const testTokens = tokensResponse.data.tokens.filter((t: any) => t.is_test_token);
    console.log(`Test tokens: ${testTokens.length}`);
    
    if (testTokens.length > 0) {
      const testToken = testTokens[0];
      console.log(`\n📌 Using test token: ${testToken.symbol} (${testToken.mint})`);
      
      // Step 2: Enable protection for test token
      console.log('\n2️⃣ Enabling protection for test token...');
      const enableResponse = await axios.post(`${API_URL}/protection/enable`, {
        mint: testToken.mint,
        walletAddress: TEST_WALLET,
        settings: {
          priceThreshold: 15,
          liquidityThreshold: 30,
          devWalletEnabled: true,
          gasBoost: 1,
          isDemo: true // Demo mode for test token
        }
      });
      
      console.log('Protection enabled:', enableResponse.data);
      
      // Step 3: Check protection status
      console.log('\n3️⃣ Checking protection status...');
      const statusResponse = await axios.get(`${API_URL}/protection/status/${testToken.mint}`);
      console.log('Protection status:', statusResponse.data);
      
      // Step 4: Get protection settings
      console.log('\n4️⃣ Getting protection settings...');
      const settingsResponse = await axios.get(`${API_URL}/protected-tokens/settings/${testToken.mint}`);
      console.log('Protection settings:', settingsResponse.data);
      
      // Step 5: Test trigger simulation (demo mode only)
      console.log('\n5️⃣ Testing trigger simulation...');
      const triggerResponse = await axios.post(`${API_URL}/protection/simulate-trigger`, {
        mint: testToken.mint,
        walletAddress: TEST_WALLET,
        triggerType: 'price_drop',
        severity: 20 // 20% drop
      });
      console.log('Trigger simulation:', triggerResponse.data);
      
      console.log('\n✅ Demo protection flow test completed successfully!');
    } else {
      console.log('\n⚠️ No test tokens found. Add a test token first.');
    }
    
  } catch (error: any) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testDemoProtectionFlow();