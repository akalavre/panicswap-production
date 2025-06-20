// Script to register Helius webhooks for real-time price updates
import { helius } from './src/utils/heliusClient';
import config from './src/config';

async function registerWebhooks() {
  console.log('Registering Helius webhooks...');
  
  try {
    // Your backend URL - can be ngrok URL for testing
    const webhookUrl = process.env.WEBHOOK_URL || 'https://your-backend.com/api/webhook/helius';
    
    if (!webhookUrl || webhookUrl.includes('your-backend')) {
      console.error('Please set WEBHOOK_URL environment variable to your backend URL');
      console.error('');
      console.error('For local testing with ngrok:');
      console.error('1. Start ngrok: ngrok http 3001');
      console.error('2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)');
      console.error('3. Run: WEBHOOK_URL=https://abc123.ngrok.io/api/webhook/helius npm run register-webhook');
      process.exit(1);
    }
    
    console.log(`Webhook URL: ${webhookUrl}`);
    
    // Create webhook for enhanced transactions
    const webhook = await helius.webhooks.create({
      webhookUrl,
      accountAddresses: [], // We'll add specific addresses later
      transactionTypes: ['SWAP'],
      webhookType: 'enhanced',
      encoding: 'jsonParsed'
    });
    
    console.log('Webhook created successfully:', webhook);
    console.log('Webhook ID:', webhook.webhookID);
    console.log('');
    console.log('Save this webhook ID to manage it later.');
    console.log('');
    console.log('To add token addresses to monitor:');
    console.log(`await helius.webhooks.edit(webhook.webhookID, { accountAddresses: ['token1', 'token2'] })`);
    
  } catch (error) {
    console.error('Error registering webhooks:', error);
    process.exit(1);
  }
}

// Allow running directly
if (require.main === module) {
  registerWebhooks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { registerWebhooks };