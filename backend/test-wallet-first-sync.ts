import { walletTokenService } from './src/services/WalletTokenService';
import dotenv from 'dotenv';

dotenv.config();

async function testWalletFirstSync() {
  console.log('🚀 Testing wallet-first token discovery...\n');
  
  // Test wallet address (you can replace with your own)
  const testWallet = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG'; // User's wallet
  
  try {
    console.log(`📥 Syncing wallet: ${testWallet}`);
    console.log('This will:');
    console.log('1. Fetch all SPL tokens from the wallet');
    console.log('2. Enrich with metadata from Helius');
    console.log('3. Find liquidity pools on Raydium/Pump.fun');
    console.log('4. Save to database for monitoring\n');
    
    const startTime = Date.now();
    const tokens = await walletTokenService.syncWallet(testWallet);
    const syncTime = Date.now() - startTime;
    
    console.log(`\n✅ Sync completed in ${syncTime}ms`);
    console.log(`📊 Found ${tokens.length} tokens:\n`);
    
    // Display token summary
    tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   Mint: ${token.mint}`);
      console.log(`   Balance: ${token.uiBalance.toFixed(6)}`);
      console.log(`   Value: ${token.value ? `$${token.value.toFixed(2)}` : 'Unknown'}`);
      console.log(`   Platform: ${token.platform}`);
      if (token.poolAddress) {
        console.log(`   Pool: ${token.poolAddress}`);
        console.log(`   Liquidity: $${token.liquidity?.usd || 0}`);
      }
      console.log('');
    });
    
    // Summary stats
    const totalValue = tokens.reduce((sum, t) => sum + (t.value || 0), 0);
    const tokensWithPools = tokens.filter(t => t.poolAddress).length;
    const tokensWithPrice = tokens.filter(t => t.price).length;
    
    console.log('📈 Summary:');
    console.log(`   Total tokens: ${tokens.length}`);
    console.log(`   Total value: $${totalValue.toFixed(2)}`);
    console.log(`   Tokens with prices: ${tokensWithPrice}`);
    console.log(`   Tokens with pools: ${tokensWithPools}`);
    
    // Test getting tokens from database
    console.log('\n🔍 Verifying database save...');
    const dbTokens = await walletTokenService.getUserTokens(testWallet);
    console.log(`✅ Found ${dbTokens.length} tokens in database`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nMake sure:');
    console.error('1. Backend services are configured (.env file)');
    console.error('2. Supabase connection is working');
    console.error('3. Helius API key is valid');
  }
}

// Run the test
testWalletFirstSync().then(() => {
  console.log('\n✨ Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});