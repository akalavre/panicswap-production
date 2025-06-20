#!/usr/bin/env node

// Setup script for Helius webhook with ngrok
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { helius } from './src/utils/heliusClient';

const execAsync = promisify(exec);

async function getNgrokUrl(): Promise<string> {
  try {
    // Get ngrok tunnels
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    // Find the https tunnel
    const httpsTunnel = tunnels.find((t: any) => t.proto === 'https');
    if (httpsTunnel) {
      return httpsTunnel.public_url;
    }
    
    throw new Error('No HTTPS tunnel found');
  } catch (error) {
    throw new Error('Ngrok not running or API not accessible. Make sure ngrok is running on port 3001');
  }
}

async function registerWebhook() {
  console.log('Setting up Helius webhook with ngrok...\n');
  
  try {
    // Get ngrok URL
    console.log('Getting ngrok URL...');
    const ngrokUrl = await getNgrokUrl();
    const webhookUrl = `${ngrokUrl}/api/webhook/helius`;
    
    console.log(`✅ Ngrok URL: ${ngrokUrl}`);
    console.log(`✅ Webhook URL: ${webhookUrl}\n`);
    
    // Register webhook with Helius
    console.log('Registering webhook with Helius...');
    
    const webhook = await helius.createWebhook({
      webhookURL: webhookUrl,
      transactionTypes: ['SWAP'],
      accountAddresses: [], // We'll add addresses dynamically
      webhookType: 'enhanced',
      authHeader: 'Bearer your-secret-key' // Optional auth
    });
    
    console.log('\n✅ Webhook registered successfully!');
    console.log('Webhook ID:', webhook.webhookID);
    console.log('Webhook URL:', webhook.webhookURL);
    
    // Save webhook ID for later management
    console.log('\n📝 Save this webhook ID to manage it later:');
    console.log(`export HELIUS_WEBHOOK_ID="${webhook.webhookID}"`);
    
    console.log('\n🎯 To monitor specific tokens, update the webhook:');
    console.log(`helius.editWebhook("${webhook.webhookID}", {`);
    console.log('  accountAddresses: ["token_mint_1", "token_mint_2"]');
    console.log('});');
    
    console.log('\n🚀 Your webhook is ready to receive real-time swap data!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    
    if (error.message?.includes('Ngrok not running')) {
      console.log('\n📋 To start ngrok:');
      console.log('1. Install ngrok: https://ngrok.com/download');
      console.log('2. Run: ngrok http 3001');
      console.log('3. Run this script again');
    }
  }
}

// Instructions if called without ngrok running
async function showInstructions() {
  console.log('📋 Helius Webhook Setup with Ngrok\n');
  console.log('Prerequisites:');
  console.log('1. Install ngrok from https://ngrok.com/download');
  console.log('2. Start your backend on port 3001');
  console.log('3. In a new terminal, run: ngrok http 3001');
  console.log('4. Run this script: npx ts-node setup-webhook-ngrok.ts\n');
  
  console.log('This will:');
  console.log('- Get your ngrok public URL');
  console.log('- Register a webhook with Helius');
  console.log('- Configure it to receive swap transactions');
  console.log('- Give you the webhook ID for management\n');
}

// Main execution
if (require.main === module) {
  registerWebhook().catch(async (error) => {
    await showInstructions();
    process.exit(1);
  });
}

export { registerWebhook };