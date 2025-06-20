// index.ts
// REMOVED: Using wallet-first token discovery instead of mass discovery
// import { TokenEnrichmentService } from './services/TokenEnrichmentService'; // REMOVED: No longer needed with Helius
import { ExpressApiService } from './services/ExpressApiService';
// import { WebSocketService } from './services/WebSocketService'; // REMOVED: Using Supabase Realtime
// import { PricePollingService } from './services/PricePollingService'; // REMOVED: No price polling
import { rugCheckPollingService } from './services/RugCheckPollingService';
import { rugCheckPollingServiceV2 } from './services/RugCheckPollingServiceV2';
import { HeliusWebhookService } from './services/HeliusWebhookService';
import { walletTokenService } from './services/WalletTokenService';
import { protectionService } from './protect/ProtectionService';
import { simpleAutoProtectionService } from './protect/SimpleAutoProtectionService';
import { createSimpleRugPullDetector } from './protect/SimpleRugPullDetector';
import { poolMonitoringService } from './services/PoolMonitoringService';
// REMOVED: Mass token discovery - now using wallet-first approach
import { Connection } from '@solana/web3.js';
import config from './config';

async function main() {
  console.log('Starting PanicSwap Backend Services...');

  // Basic check for essential config
  if (!config.heliusRpcUrl || !config.supabaseUrl || !config.supabaseServiceKey) {
    console.error('Essential configuration (Helius RPC, Supabase URL/Service Key) is missing. Exiting.');
    process.exit(1);
  }

  // Initialize services
  const apiService = new ExpressApiService(3001);
  const useBatchProcessing = process.env.RUGCHECK_USE_BATCH === 'true';
  
  // Note: Token discovery now happens via Helius webhooks
  // No need for TokenEnrichmentService - Helius provides enriched data directly

  try {
    // Start API server
    await apiService.start();
    console.log('API Service started on port 3001.');

    // REMOVED: WebSocket service - now using Supabase Realtime
    // All real-time updates now go through Supabase tables
    console.log('Using Supabase Realtime for all real-time updates.');

    // Initialize webhook service without WebSocket dependency
    const webhookService = new HeliusWebhookService();
    apiService.setWebhookService(webhookService);
    console.log('Helius Webhook Service initialized.');

    // Initialize wallet token service
    apiService.setWalletTokenService(walletTokenService);
    console.log('Wallet Token Service initialized.');

    // REMOVED: Price polling service - prices now updated on-demand

    // Start RugCheck polling service
    // Use V2 if batch processing is enabled
    if (useBatchProcessing) {
      await rugCheckPollingServiceV2.startPolling();
      console.log('RugCheck Polling Service V2 started (batch processing enabled).');
    } else {
      await rugCheckPollingService.startPolling();
      console.log('RugCheck Polling Service started (updates every 1 second, same as prices).');
    }

    // Services no longer need WebSocket - they write directly to Supabase
    console.log('Protection services configured to use Supabase for real-time events.');
    
    // Initialize and start the pool monitoring system
    console.log('[INIT] Creating Solana connection to Helius RPC...');
    const connection = new Connection(config.heliusRpcUrl);
    
    console.log('[INIT] Creating SimpleRugPullDetector...');
    const simpleRugPullDetector = createSimpleRugPullDetector(connection);
    
    console.log('[INIT] Initializing SimpleRugPullDetector (sets up event listeners)...');
    await simpleRugPullDetector.initialize();
    
    console.log('[INIT] Initializing SimpleAutoProtectionService...');
    await simpleAutoProtectionService.initialize();
    
    console.log('[INIT] ✅ Pool Monitoring System fully initialized and listening for events');

    // DISABLED FOR MVP - Focus on wallet tokens only
    // Uncomment after launch to enable mass token discovery
    /*
    console.log('Starting automatic token discovery using Helius RPC...');
    await heliusAutomaticTokenDiscoveryService.startDiscovery(10000); // Poll every 10 seconds
    console.log('Automatic token discovery started - polling for new tokens on pump.fun and Raydium.');
    
    // Log discovery stats periodically
    setInterval(async () => {
      const stats = await heliusAutomaticTokenDiscoveryService.getStats();
      console.log(`Token Discovery Stats - Running: ${stats.isRunning}, Today: ${stats.discoveredToday}, Total: ${stats.totalDiscovered}`);
    }, 60000); // Every minute
    */
    
    console.log('🎯 MVP Mode: Focusing on wallet tokens only - mass discovery disabled');
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }

  // Keep the service running (e.g., if it's all event-driven or has timers)
  // For a simple script, it might exit after startDiscovery if that method completes.
  // For a long-running service, you'd have listeners or intervals keeping it alive.
  console.log('Backend services initialized. Monitoring for new tokens...');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down services...');
    // Mass token discovery removed - using wallet-first approach
    if (useBatchProcessing) {
      rugCheckPollingServiceV2.stopPolling();
    } else {
      rugCheckPollingService.stopPolling();
    }
    // Price polling service removed - prices now updated on-demand
    apiService.stop();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Unhandled error in main application:', error);
  process.exit(1);
});
