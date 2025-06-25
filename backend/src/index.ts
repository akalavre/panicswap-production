// index.ts
// REMOVED: Using wallet-first token discovery instead of mass discovery
// import { TokenEnrichmentService } from './services/TokenEnrichmentService'; // REMOVED: No longer needed with Helius
import { ExpressApiService } from './services/ExpressApiService';
// import { WebSocketService } from './services/WebSocketService'; // REMOVED: Using Supabase Realtime
// import { PricePollingService } from './services/PricePollingService'; // REMOVED: No price polling
import { rugCheckPollingService } from './services/RugCheckPollingService';
import { rugCheckPollingServiceV2 } from './services/RugCheckPollingServiceV2';
import { HeliusWebhookService } from './services/HeliusWebhookService';
import { createWalletTokenService } from './services/WalletTokenService';
import { protectionService } from './protect/ProtectionService';
import { simpleAutoProtectionService } from './protect/SimpleAutoProtectionService';
import { createSimpleRugPullDetector } from './protect/SimpleRugPullDetector';
import { poolMonitoringService } from './services/PoolMonitoringService';
import { createBlockhashRefreshService } from './services/BlockhashRefreshService';
import { liquidityVelocityTracker } from './services/LiquidityVelocityTracker';
import { rugPatternDetector } from './services/RugPatternDetector';
import { monitoringStatsService } from './services/MonitoringStatsService';
// REMOVED: Social monitoring service - no longer needed for anti-rugpull detection
// Mempool monitoring service for real-time threat detection
import { mempoolMonitorService } from './services/MempoolMonitorService';
// Frontrunning services for emergency execution
import { createFrontrunnerService, FrontrunnerService } from './services/FrontrunnerService';
import { createEmergencyExecutor, EmergencyExecutor } from './services/EmergencyExecutor';
import { TransactionCache } from './services/TransactionCache';
import { PrioritySender } from './services/PrioritySender';
// REMOVED: Mass token discovery - now using wallet-first approach
import { Connection } from '@solana/web3.js';
import config from './config';
import supabase from './utils/supabaseClient';
import { EventEmitter } from 'events';
import { initializeProtectedTokens } from './services/initializeProtectedTokens';
import { continuousDataFetcher } from './services/ContinuousDataFetcher';

// Declare services at module level for shutdown handler
let frontrunnerService: FrontrunnerService;
let emergencyExecutor: EmergencyExecutor;

async function main() {
  console.log('Starting PanicSwap Backend Services...');

  // Basic check for essential config
  if (!config.heliusRpcUrl || !config.supabaseUrl || !config.supabaseServiceKey) {
    console.error('Essential configuration (Helius RPC, Supabase URL/Service Key) is missing. Exiting.');
    process.exit(1);
  }

  // Initialize event bus for inter-service communication
  const eventBus = new EventEmitter();

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

    // Initialize wallet token service with event bus
    const walletTokenService = createWalletTokenService(eventBus);
    apiService.setWalletTokenService(walletTokenService);
    console.log('Wallet Token Service initialized with event bus.');

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
    
    // Start blockhash refresh service for pre-signed transactions
    console.log('[INIT] Starting blockhash refresh service...');
    const blockhashRefreshService = createBlockhashRefreshService(connection);
    blockhashRefreshService.start();
    console.log('[INIT] ✅ Blockhash refresh service started (60s interval)');

    // Start liquidity velocity tracker for real-time monitoring
    console.log('[INIT] Starting liquidity velocity tracker...');
    liquidityVelocityTracker.start();
    
    // Subscribe to velocity alerts and feed them to rug detection
    liquidityVelocityTracker.on('flash-rug', async (data) => {
      console.error(`🚨 Flash rug detected: ${data.tokenMint}`);
      // Trigger immediate risk recalculation
      await rugCheckPollingServiceV2.checkSingleToken(data.tokenMint, {
        liquidityUSD: data.velocityData.current.liquidityUSD,
        liquidityVelocity: data.velocityData.velocities.liquidity5m,
        forceUpdate: true,
        source: 'flash_rug_detection'
      });
    });
    
    liquidityVelocityTracker.on('rapid-drain', async (data) => {
      console.warn(`⚠️ Rapid drain detected: ${data.tokenMint}`);
      // Trigger risk recalculation
      await rugCheckPollingServiceV2.checkSingleToken(data.tokenMint, {
        liquidityUSD: data.velocityData.current.liquidityUSD,
        liquidityVelocity: data.velocityData.velocities.liquidity30m,
        forceUpdate: true,
        source: 'rapid_drain_detection'
      });
    });
    
    console.log('[INIT] ✅ Liquidity velocity tracker started (30s interval)');

    // Start pattern detector for advanced rug detection
    console.log('[INIT] Starting rug pattern detector...');
    rugPatternDetector.start();
    
    // Subscribe to high-risk pattern events
    rugPatternDetector.on('high-risk-pattern', async (analysis) => {
      console.error(`🚨 High-risk pattern detected for ${analysis.tokenMint}:`);
      console.error(`- Overall risk: ${analysis.overallRisk}%`);
      console.error(`- Recommendation: ${analysis.recommendation}`);
      console.error(`- Patterns:`, analysis.patterns.map((p: any) => `${p.type} (${p.confidence * 100}% confidence)`));
      
      // Broadcast alert through Supabase
      await supabase
        .from('pattern_alerts')
        .insert({
          token_mint: analysis.tokenMint,
          risk_score: analysis.overallRisk,
          recommendation: analysis.recommendation,
          patterns: analysis.patterns,
          alert_type: 'high_risk_pattern',
          timestamp: new Date()
        });
    });
    
    console.log('[INIT] ✅ Rug pattern detector started');

    // Start ML risk integration service
    console.log('[INIT] Starting ML risk integration service...');
    const { mlRiskIntegrationService } = await import('./services/MLRiskIntegrationService');
    mlRiskIntegrationService.start();
    console.log('[INIT] ✅ ML risk integration service started (45s interval)');

    // Start monitoring stats service for live dashboard data
    console.log('[INIT] Starting monitoring stats service...');
    monitoringStatsService.start();
    console.log('[INIT] ✅ Monitoring stats service started (30s interval)');

    // Initialize tracking for existing protected tokens
    console.log('[INIT] Loading existing protected tokens...');
    await initializeProtectedTokens();
    console.log('[INIT] ✅ Existing protected tokens loaded');

    // Start continuous data fetcher for active tokens
    console.log('[INIT] Starting continuous data fetcher...');
    await continuousDataFetcher.start();
    console.log('[INIT] ✅ Continuous data fetcher started (30s interval)');

    // REMOVED: Social Signal Service - no longer needed for anti-rugpull detection
    // The system now relies on on-chain data and pattern detection instead of social signals

    // Initialize Mempool Monitoring Service
    console.log('[INIT] Starting mempool monitoring service...');
    await mempoolMonitorService.start();
    
    // Subscribe to mempool threat events
    mempoolMonitorService.on('threat-detected', async (threat) => {
      console.error(`🚨 MEMPOOL THREAT: ${threat.tokenMint} - ${threat.analysis.type}`);
      console.error(`- Risk: ${threat.analysis.riskLevel}`);
      console.error(`- Signature: ${threat.signature}`);
      
      // Trigger immediate protection for affected wallets
      for (const wallet of threat.protectedWallets) {
        console.log(`[MEMPOOL] Triggering protection for wallet ${wallet.walletAddress}`);
        
        // Emit event for auto-protection service
        eventBus.emit('mempool-threat', {
          tokenMint: threat.tokenMint,
          walletAddress: wallet.walletAddress,
          analysis: threat.analysis,
          priorityFeeMultiplier: wallet.priorityFeeMultiplier
        });
      }
    });
    
    console.log('[INIT] ✅ Mempool Monitoring Service started');

    // Initialize Frontrunning Services
    console.log('[INIT] Starting frontrunning services...');
    
    // Create core services
    const transactionCache = new TransactionCache();
    const prioritySender = new PrioritySender();
    
    // Create frontrunner service
    frontrunnerService = createFrontrunnerService(
      connection,
      transactionCache,
      prioritySender,
      blockhashRefreshService
    );
    frontrunnerService.start();
    
    // Create emergency executor
    emergencyExecutor = createEmergencyExecutor(
      connection,
      prioritySender,
      transactionCache
    );
    
    // Connect mempool threats to frontrunner
    eventBus.on('mempool-threat', async (threat) => {
      console.log('[INIT] Forwarding mempool threat to frontrunner service');
      await frontrunnerService.queueProtection(threat);
    });
    
    // Listen to frontrunner events
    frontrunnerService.on('protection-executed', (event) => {
      console.log(`[INIT] ✅ Protection executed: ${event.result.signature}`);
      
      // Broadcast success via Supabase
      (async () => {
        try {
          await supabase
            .from('protection_executions')
            .insert({
              wallet_address: event.threat.walletAddress,
              token_mint: event.threat.tokenMint,
              signature: event.result.signature,
              success: true,
              execution_time_ms: event.duration,
              priority_fee: event.result.finalPriorityFee,
              source: 'mempool_frontrunner'
            });
          console.log('[INIT] Execution logged to database');
        } catch (err) {
          console.error('[INIT] Failed to log execution:', err);
        }
      })();
    });
    
    frontrunnerService.on('protection-failed', (event) => {
      console.error(`[INIT] ❌ Protection failed: ${event.error}`);
    });
    
    frontrunnerService.on('circuit-breaker-open', (event) => {
      console.error('[INIT] ⚠️ Circuit breaker opened - too many failures');
      // Could send alert to admin here
    });
    
    console.log('[INIT] ✅ Frontrunning services started');

    // Start periodic rug detection scanning
    console.log('[INIT] Starting rugged token detector...');
    const { ruggedTokenDetector } = await import('./services/RuggedTokenDetector');
    
    // Scan for rugged tokens every 5 minutes
    setInterval(async () => {
        await ruggedTokenDetector.scanForRuggedTokens();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Initial scan
    await ruggedTokenDetector.scanForRuggedTokens();
    console.log('[INIT] ✅ Rugged token detector started');

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
  process.on('SIGINT', async () => {
    console.log('\nShutting down services...');
    // Mass token discovery removed - using wallet-first approach
    if (useBatchProcessing) {
      rugCheckPollingServiceV2.stopPolling();
    } else {
      rugCheckPollingService.stopPolling();
    }
    // Stop blockhash refresh service
    const blockhashRefreshService = createBlockhashRefreshService(new Connection(config.heliusRpcUrl));
    blockhashRefreshService.stop();
    // Social monitoring service removed - no longer needed
    liquidityVelocityTracker.stop();
    rugPatternDetector.stop();
    mlRiskIntegrationService.stop();
    monitoringStatsService.stop();
    continuousDataFetcher.stop();
    // Stop mempool monitoring service
    await mempoolMonitorService.stop();
    // Stop frontrunning services
    frontrunnerService.stop();
    // Price polling service removed - prices now updated on-demand
    apiService.stop();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Unhandled error in main application:', error);
  process.exit(1);
});
