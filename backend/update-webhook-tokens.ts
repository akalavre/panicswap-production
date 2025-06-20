import { Helius } from 'helius-sdk';
import config from './src/config';
import supabase from './src/utils/supabaseClient';
import * as fs from 'fs';

async function updateWebhookTokens() {
  // Extract API key from Helius RPC URL
  let apiKey = '';
  if (config.heliusRpcUrl) {
    try {
      const url = new URL(config.heliusRpcUrl);
      apiKey = url.searchParams.get('api-key') || '';
    } catch (e) {
      console.error('Invalid Helius RPC URL format:', e);
      process.exit(1);
    }
  }

  if (!apiKey) {
    console.error('Error: Could not extract API key from HELIUS_RPC_URL');
    process.exit(1);
  }

  // Read webhook ID from file or environment
  let webhookId = process.env.WEBHOOK_ID;
  
  if (!webhookId && fs.existsSync('.webhook-id')) {
    webhookId = fs.readFileSync('.webhook-id', 'utf-8').trim();
  }
  
  if (!webhookId) {
    console.error('Error: WEBHOOK_ID not found. Run register-webhooks.ts first or set WEBHOOK_ID env var');
    process.exit(1);
  }

  const helius = new Helius(apiKey);

  try {
    console.log('Fetching token addresses from database...');
    
    // Get all token addresses from database
    const { data: tokens, error } = await supabase
      .from('token_metadata')
      .select('mint')
      .order('created_at', { ascending: false })
      .limit(100); // Helius has limits on how many addresses you can monitor

    if (error || !tokens) {
      console.error('Error fetching tokens:', error);
      process.exit(1);
    }

    const tokenAddresses = tokens.map(t => t.mint);
    console.log(`Found ${tokenAddresses.length} tokens to monitor`);

    // Update webhook with token addresses
    console.log('Updating webhook with token addresses...');
    
    const updatedWebhook = await helius.webhooks.edit(webhookId, {
      accountAddresses: tokenAddresses
    });

    console.log('✅ Webhook updated successfully!');
    console.log(`Now monitoring ${tokenAddresses.length} token addresses for swaps`);
    console.log('');
    console.log('Sample tokens being monitored:');
    tokenAddresses.slice(0, 5).forEach(addr => {
      console.log(`  - ${addr}`);
    });
    if (tokenAddresses.length > 5) {
      console.log(`  ... and ${tokenAddresses.length - 5} more`);
    }

  } catch (error: any) {
    console.error('Error updating webhook:', error.message || error);
    process.exit(1);
  }
}

// Run the update
updateWebhookTokens();