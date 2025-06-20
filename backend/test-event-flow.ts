import { poolMonitoringService } from './src/services/PoolMonitoringService';

console.log(`
======================================
🧪 TESTING EVENT FLOW
======================================
This will emit a test rugpull event to verify
the connection between services.
======================================
`);

// Test data
const testAlert = {
  tokenMint: 'TESTtokenMintAddress123',
  poolAddress: 'TESTpoolAddress456',
  type: 'INSTANT_RUG_PULL',
  severity: 'CRITICAL',
  liquidityChange: 95,
  timestamp: new Date()
};

console.log('\nEmitting test rugpull event...');
console.log('Alert details:', JSON.stringify(testAlert, null, 2));

// Emit the event
poolMonitoringService.emit('rugpull:detected', testAlert);

console.log('\n✅ Event emitted!');
console.log('\nCheck the backend logs to see if:');
console.log('1. SimpleRugPullDetector received the event');
console.log('2. It logged the alert details');
console.log('3. It attempted to fetch protected wallets');

// Keep process alive for a bit to see results
setTimeout(() => {
  console.log('\n🏁 Test complete');
  process.exit(0);
}, 5000);