import { Connection, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function testWalletTokens() {
  console.log('🚀 Testing simple wallet token fetch...\n');
  
  const heliusApiKey = process.env.HELIUS_API_KEY || '';
  
  if (!heliusApiKey) {
    console.error('❌ HELIUS_API_KEY not found in .env');
    return;
  }
  
  // Test with your wallet
  const testWallet = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
  
  try {
    console.log(`📥 Fetching tokens for wallet: ${testWallet}`);
    
    // Initialize Helius and Connection
    const helius = new Helius(heliusApiKey);
    const connection = new Connection(process.env.HELIUS_RPC_URL || '');
    
    // First check SOL balance
    const solBalance = await connection.getBalance(new PublicKey(testWallet));
    console.log(`\n💰 SOL Balance: ${solBalance / 1e9} SOL`);
    
    // Try different approaches to get tokens
    console.log('\n📊 Fetching assets with getAssetsByOwner...');
    
    // Method 1: Get all assets
    const assetsResponse = await helius.rpc.getAssetsByOwner({
      ownerAddress: testWallet,
      page: 1,
      limit: 1000
    });
    
    console.log(`Found ${assetsResponse.total} total assets`);
    
    if (assetsResponse.items.length > 0) {
      console.log('\nAsset types found:');
      const assetTypes = new Set(assetsResponse.items.map(a => a.interface));
      assetTypes.forEach(type => {
        const count = assetsResponse.items.filter(a => a.interface === type).length;
        console.log(`  - ${type}: ${count}`);
      });
      
      // Show first few assets
      console.log('\nFirst 5 assets:');
      assetsResponse.items.slice(0, 5).forEach((asset, i) => {
        console.log(`${i + 1}. ${asset.content?.metadata?.symbol || asset.id}`);
        console.log(`   Type: ${asset.interface}`);
        console.log(`   Mint: ${asset.id}`);
        if (asset.token_info) {
          console.log(`   Token info:`, asset.token_info);
        }
      });
    }
    
    // Method 2: Try getting token accounts directly
    console.log('\n📊 Trying alternative method - getProgramAccounts...');
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(testWallet),
        { programId: TOKEN_PROGRAM_ID }
      );
      
      console.log(`Found ${tokenAccounts.value.length} token accounts`);
      
      if (tokenAccounts.value.length > 0) {
        console.log('\nToken accounts:');
        tokenAccounts.value.forEach((account, i) => {
          const accountData = account.account.data.parsed.info;
          const balance = accountData.tokenAmount.uiAmount;
          if (balance > 0) {
            console.log(`${i + 1}. Mint: ${accountData.mint}`);
            console.log(`   Balance: ${balance}`);
            console.log(`   Decimals: ${accountData.tokenAmount.decimals}`);
          }
        });
      }
    } catch (error) {
      console.error('Error with getParsedTokenAccountsByOwner:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testWalletTokens().then(() => {
  console.log('\n✨ Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});