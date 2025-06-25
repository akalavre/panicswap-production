// Force tracking for the test token
const axios = require('axios');

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function forceTracking() {
  console.log('🚀 Forcing backend to track test token...\n');
  
  // Try different possible endpoints
  const endpoints = [
    'http://localhost:3001/api/monitoring/force-update',
    'http://127.0.0.1:3001/api/monitoring/force-update',
    'http://localhost:3001/api/health'
  ];
  
  // First check health
  try {
    console.log('Checking backend health...');
    const healthResponse = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    });
    console.log('✅ Backend is running:', healthResponse.data);
  } catch (error) {
    console.error('❌ Cannot reach backend at localhost:3001');
    console.log('\nPossible issues:');
    console.log('1. Backend may still be starting up - wait a few seconds');
    console.log('2. Backend may be running on a different port');
    console.log('3. Firewall or antivirus may be blocking the connection');
    console.log('\nCheck the backend terminal for any error messages.');
    return;
  }
  
  // Now try force update
  try {
    console.log('\nCalling force-update endpoint...');
    const response = await axios.post('http://localhost:3001/api/monitoring/force-update', {
      tokenMint: TEST_TOKEN,
      walletAddress: TEST_WALLET
    }, {
      timeout: 10000
    });
    
    console.log('✅ Success! Backend response:', response.data);
    console.log('\n📊 Next steps:');
    console.log('1. Wait 30-60 seconds for velocity calculations');
    console.log('2. Open: http://localhost/PanicSwap-php/test-monitoring-api.html');
    console.log('3. Click "Test Monitoring Status API"');
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('❌ Monitoring routes not found (404)');
      console.log('\nThis means the backend is running but doesn\'t have the monitoring routes.');
      console.log('You need to restart the backend to load the new code:');
      console.log('1. Stop the backend (Ctrl+C)');
      console.log('2. Start it again: npm run dev');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - backend not accessible');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

// Add delay before running
console.log('Waiting 2 seconds for backend to be ready...');
setTimeout(forceTracking, 2000);