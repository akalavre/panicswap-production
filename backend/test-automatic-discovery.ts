import dotenv from 'dotenv';
import { heliusAutomaticTokenDiscoveryService } from './src/services/HeliusAutomaticTokenDiscoveryService';

dotenv.config();

async function testAutomaticDiscovery() {
  console.log('===========================================');
  console.log('Testing Helius Automatic Token Discovery');
  console.log('===========================================\n');
  
  try {
    // Check if required config exists
    if (!process.env.HELIUS_RPC_URL) {
      console.error('❌ HELIUS_RPC_URL not found in .env file');
      console.log('Please ensure your .env file contains:');
      console.log('HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY');
      process.exit(1);
    }
    
    console.log('✅ Helius RPC URL found in environment');
    console.log('Starting automatic token discovery...\n');
    
    // Start discovery with a short interval for testing
    await heliusAutomaticTokenDiscoveryService.startDiscovery(5000); // Poll every 5 seconds for testing
    
    console.log('Token discovery started! The service will now:');
    console.log('1. Poll pump.fun and Raydium programs every 5 seconds');
    console.log('2. Check for new token creations');
    console.log('3. Automatically enrich token metadata');
    console.log('4. Save to database with full details\n');
    
    console.log('Monitoring for new tokens... (Press Ctrl+C to stop)\n');
    
    // Show stats every 10 seconds
    const statsInterval = setInterval(async () => {
      try {
        const stats = await heliusAutomaticTokenDiscoveryService.getStats();
        console.log('\n📊 Discovery Stats:');
        console.log(`   Running: ${stats.isRunning ? '✅' : '❌'}`);
        console.log(`   Discovered Today: ${stats.discoveredToday}`);
        console.log(`   Total in Memory: ${stats.totalDiscovered}`);
        console.log(`   Last Signature: ${stats.lastProcessedSignature ? stats.lastProcessedSignature.substring(0, 20) + '...' : 'None'}`);
      } catch (e) {
        console.log('\n📊 Discovery is running (stats not available)');
      }
    }, 10000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\nStopping token discovery...');
      clearInterval(statsInterval);
      heliusAutomaticTokenDiscoveryService.stopDiscovery();
      console.log('✅ Discovery stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting automatic token discovery test...\n');
testAutomaticDiscovery().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});