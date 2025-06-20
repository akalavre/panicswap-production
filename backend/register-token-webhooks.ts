import dotenv from 'dotenv';
import { heliusTokenDiscoveryService } from './src/services/HeliusTokenDiscoveryService';

dotenv.config();

async function registerTokenWebhooks() {
  console.log('===========================================');
  console.log('Helius Token Discovery Webhook Registration');
  console.log('===========================================\n');
  
  try {
    // Get webhook URL from environment or command line
    const webhookUrl = process.env.WEBHOOK_URL || process.argv[2];
    
    if (!webhookUrl || webhookUrl.includes('your-backend')) {
      console.error('❌ Please provide a valid webhook URL');
      console.error('\nUsage:');
      console.error('  WEBHOOK_URL=https://your-domain.com npm run register-token-webhooks');
      console.error('  OR');
      console.error('  npm run register-token-webhooks https://your-domain.com\n');
      console.error('For local testing with ngrok:');
      console.error('  1. Start your backend: npm run dev:backend');
      console.error('  2. In another terminal: ngrok http 3001');
      console.error('  3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)');
      console.error('  4. Run: WEBHOOK_URL=https://abc123.ngrok.io npm run register-token-webhooks\n');
      process.exit(1);
    }
    
    console.log(`📍 Webhook URL: ${webhookUrl}`);
    console.log('\nRegistering webhooks for:');
    console.log('  - Token mint events (all platforms)');
    console.log('  - Pump.fun specific events');
    console.log('  - Raydium pool creation events\n');
    
    // Register the webhooks
    await heliusTokenDiscoveryService.registerWebhooks(webhookUrl);
    
    console.log('\n✅ Webhooks registered successfully!\n');
    console.log('Your backend will now receive:');
    console.log('  - POST /api/webhook/token-mint - For new token mints');
    console.log('  - POST /api/webhook/pump-token - For pump.fun tokens\n');
    console.log('Token metadata will be automatically extracted and saved.');
    console.log('No separate enrichment step needed! 🎉\n');
    
    // Also register regular swap webhooks if not already done
    console.log('Note: You may also want to register swap webhooks for price updates:');
    console.log('  npm run register-webhooks\n');
    
  } catch (error) {
    console.error('\n❌ Error registering webhooks:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  registerTokenWebhooks()
    .then(() => {
      console.log('✨ Token discovery webhooks setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { registerTokenWebhooks };