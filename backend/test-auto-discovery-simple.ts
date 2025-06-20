import dotenv from 'dotenv';
import { heliusAutomaticTokenDiscoveryService } from './src/services/HeliusAutomaticTokenDiscoveryService';

dotenv.config();

async function test() {
  console.log('Testing Helius Automatic Token Discovery...\n');
  
  if (!process.env.HELIUS_RPC_URL) {
    console.error('HELIUS_RPC_URL not found in .env');
    process.exit(1);
  }
  
  console.log('✅ Config loaded');
  console.log('Starting discovery...\n');
  
  try {
    await heliusAutomaticTokenDiscoveryService.startDiscovery(5000);
    console.log('✅ Discovery started - polling every 5 seconds');
    console.log('Watching for new tokens on pump.fun and Raydium...\n');
    console.log('Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('Failed to start:', error);
  }
}

process.on('SIGINT', () => {
  console.log('\nStopping...');
  heliusAutomaticTokenDiscoveryService.stopDiscovery();
  process.exit(0);
});

test();