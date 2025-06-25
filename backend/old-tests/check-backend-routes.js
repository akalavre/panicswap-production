// Check what routes are available on the backend
const axios = require('axios');

async function checkRoutes() {
  console.log('🔍 Checking backend routes...\n');
  
  const routes = [
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/monitoring/status/test' },
    { method: 'POST', path: '/api/monitoring/force-update' },
    { method: 'POST', path: '/api/monitoring/force-update/test' },
    { method: 'POST', path: '/api/monitoring/start' },
    { method: 'GET', path: '/api/enhanced/health' },
    { method: 'GET', path: '/api/tokens' },
    { method: 'GET', path: '/health' },
  ];
  
  for (const route of routes) {
    try {
      const config = {
        method: route.method,
        url: `http://localhost:3001${route.path}`,
        validateStatus: () => true // Don't throw on any status
      };
      
      if (route.method === 'POST') {
        config.data = { test: true };
      }
      
      const response = await axios(config);
      
      if (response.status === 404) {
        console.log(`❌ ${route.method} ${route.path} - Not Found (404)`);
      } else if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${route.method} ${route.path} - OK (${response.status})`);
      } else if (response.status === 400) {
        console.log(`⚠️  ${route.method} ${route.path} - Bad Request (400) - Route exists!`);
      } else {
        console.log(`⚠️  ${route.method} ${route.path} - Status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Backend is not running! Start it with: cd backend && npm run dev');
        process.exit(1);
      } else {
        console.log(`❌ ${route.method} ${route.path} - Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n📝 If monitoring routes show 404:');
  console.log('   1. The backend needs to be restarted to load new routes');
  console.log('   2. Stop backend (Ctrl+C) and start again: npm run dev');
  console.log('   3. Or use restart-and-fix.bat');
}

checkRoutes();