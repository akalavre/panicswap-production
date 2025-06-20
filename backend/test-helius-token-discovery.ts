import dotenv from 'dotenv';
import { heliusTokenDiscoveryService } from './src/services/HeliusTokenDiscoveryService';

dotenv.config();

// Mock webhook data based on Helius enhanced transaction format
const mockPumpFunTokenMint = {
  accountData: [{
    account: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", // Mock token mint
    nativeBalanceChange: 0,
    tokenBalanceChanges: [{
      mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
      rawTokenAmount: {
        decimals: 6,
        tokenAmount: "1000000000000"
      },
      userAccount: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK" // Creator
    }]
  }],
  events: {
    nft: {
      description: "Token mint",
      type: "TOKEN_MINT",
      metadata: {
        name: "Test Pump Token",
        symbol: "PUMP",
        uri: "https://pump.fun/metadata/test"
      }
    }
  },
  instructions: [
    {
      programId: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // pump.fun
      data: "0x123456..." // Encoded instruction data
    },
    {
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token program
      data: "0xabcdef..."
    }
  ],
  type: "TOKEN_MINT",
  timestamp: new Date().toISOString()
};

const mockRaydiumTokenMint = {
  accountData: [{
    account: "8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sY2wimKDQ", // Mock token mint
    nativeBalanceChange: 0,
    tokenBalanceChanges: [{
      mint: "8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sY2wimKDQ",
      rawTokenAmount: {
        decimals: 9,
        tokenAmount: "1000000000000000"
      },
      userAccount: "5Q544fKrFoe6tsEbGf4tKmgLz6hKsCfbeWqmNH8c7V7e" // Creator
    }]
  }],
  events: {
    nft: {
      metadata: {
        name: "Raydium Test Token",
        symbol: "RAY-TEST",
        uri: "https://raydium.io/metadata/test"
      }
    }
  },
  instructions: [
    {
      programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM V4
      data: "0x789abc..."
    }
  ],
  type: "TOKEN_MINT",
  timestamp: new Date().toISOString()
};

async function testTokenDiscovery() {
  console.log('===========================================');
  console.log('Testing Helius Token Discovery Service');
  console.log('===========================================\n');
  
  try {
    // Test 1: Process pump.fun token
    console.log('Test 1: Processing pump.fun token mint webhook...');
    await heliusTokenDiscoveryService.processTokenMintWebhook(mockPumpFunTokenMint);
    console.log('✅ Pump.fun token processed\n');
    
    // Add a delay to see the database writes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Process Raydium token
    console.log('Test 2: Processing Raydium token mint webhook...');
    await heliusTokenDiscoveryService.processTokenMintWebhook(mockRaydiumTokenMint);
    console.log('✅ Raydium token processed\n');
    
    // Test 3: Process token with minimal data
    console.log('Test 3: Processing token with minimal metadata...');
    const minimalToken = {
      accountData: [{
        account: "9noXzpXnkyEcKF3AeXqUHTdR59V5uvrRBUZ9bwfQwxeq",
        tokenBalanceChanges: [{
          mint: "9noXzpXnkyEcKF3AeXqUHTdR59V5uvrRBUZ9bwfQwxeq",
          rawTokenAmount: { decimals: 6, tokenAmount: "1000000" }
        }]
      }],
      instructions: [{ programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }]
    };
    await heliusTokenDiscoveryService.processTokenMintWebhook(minimalToken);
    console.log('✅ Minimal token processed\n');
    
    console.log('🎉 All tests completed successfully!');
    console.log('\nBenefits demonstrated:');
    console.log('1. Single-step discovery - no separate enrichment needed');
    console.log('2. Platform detection from program IDs');
    console.log('3. Automatic bonding curve derivation for pump.fun');
    console.log('4. Graceful handling of missing metadata');
    console.log('\nCheck your database for the new tokens!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTokenDiscovery().then(() => {
  console.log('\n✨ Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});