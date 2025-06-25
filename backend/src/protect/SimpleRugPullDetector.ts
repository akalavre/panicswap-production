import { protectionService } from './ProtectionService';
import { createSwapService, SwapService } from './SwapService';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';
import { broadcastService, BroadcastAlert } from '../services/SupabaseBroadcastService';
import { poolMonitoringService } from '../services/PoolMonitoringService';
import { wsClient } from '../services/SolanaWebsocketClient';
import { transactionCache } from '../services/TransactionCache';
import { prioritySender } from '../services/PrioritySender';
import { createAlertingService } from '../services/AlertingService';

export interface RugPullAlert {
  tokenMint: string;
  type: 'LIQUIDITY_REMOVAL' | 'LARGE_DUMP' | 'MIGRATION_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
}

export class SimpleRugPullDetector {
  private swapService: SwapService;
  private alertingService: ReturnType<typeof createAlertingService>;
  private isInitialized = false;
  private isSubscribed = false;
  private realtimeSubscription: any;
  private eventQueue: Map<string, any> = new Map(); // Dedup events

  constructor(private connection: Connection) {
    this.swapService = createSwapService(connection);
    this.alertingService = createAlertingService(connection);
  }

  /**
   * Initialize the detector and connect to pool monitoring
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Simple RugPull Detector...');
    
    // Setup subscriptions only once
    if (!this.isSubscribed) {
      this.setupBroadcastSubscriptions();
      this.setupRealtimeMonitoring();
      this.isSubscribed = true;
    }
    
    // Load existing protected tokens and start monitoring their pools
    const protectedTokens = await protectionService.getActiveProtections();
    
    for (const token of protectedTokens) {
      if (token.wallet_address) {
        try {
          // Validate token mint is a valid Solana address
          new (await import('@solana/web3.js')).PublicKey(token.token_mint);
          
          await poolMonitoringService.protectToken(
            token.token_mint, 
            token.wallet_address
          );
        } catch (error) {
          console.error(`Skipping invalid token ${token.token_mint}:`, error);
        }
      }
    }

    this.isInitialized = true;
  }

  private setupBroadcastSubscriptions() {
    try {
      // Subscribe to rugpull alerts
      broadcastService.onRugpullAlert(async (alert: BroadcastAlert) => {
        console.error(`
🚨 RUGPULL DETECTED BROADCAST RECEIVED 🚨
Token: ${alert.data.tokenMint}
Pool: ${alert.data.poolAddress}
Type: ${alert.data.type}
Severity: ${alert.severity}
Liquidity Drop: ${alert.data.liquidityChange?.toFixed(2)}%
Time: ${alert.timestamp}
`);
        await this.handleRugpull({
          tokenMint: alert.data.tokenMint,
          poolAddress: alert.data.poolAddress,
          type: alert.data.type,
          severity: alert.severity,
          liquidityChange: alert.data.liquidityChange,
          timestamp: alert.timestamp
        });
      });

      // Subscribe to protection execution alerts
      broadcastService.onProtectionExecution(async (alert: BroadcastAlert) => {
        if (alert.data.action === 'emergency_sell') {
          console.log(`🚨 Emergency sell broadcast for ${alert.data.tokenMint}: ${alert.data.reason}`);
          await this.executeEmergencySell(alert.data.tokenMint, alert.data.reason);
        }
      });

      console.log('[SimpleRugPullDetector] ✅ Subscribed to Supabase broadcast channels');
    } catch (error) {
      console.error('[SimpleRugPullDetector] Error setting up broadcast subscriptions:', error);
    }
  }

  private setupRealtimeMonitoring() {
    try {
      // Clean up existing subscription if any
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }

      // Subscribe to rugpull_alerts table for instant notifications
      this.realtimeSubscription = supabase
        .channel('rugpull_detector')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'rugpull_alerts'
        }, async (payload) => {
          await this.handleRealtimeRugpullAlert(payload.new);
        })
        .subscribe();

      console.log('[SimpleRugPullDetector] ✅ Real-time monitoring active');
    } catch (error) {
      console.error('[SimpleRugPullDetector] Error setting up realtime monitoring:', error);
    }
  }

  /**
   * Clean up subscriptions
   */
  async cleanup() {
    if (this.realtimeSubscription) {
      await this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
    this.isInitialized = false;
    this.isSubscribed = false;
  }

  /**
   * Handle real-time rugpull alerts with instant execution
   */
  private async handleRealtimeRugpullAlert(alert: any) {
    const eventKey = `${alert.token_mint}:${alert.detected_at}`;
    
    // Dedup events
    if (this.eventQueue.has(eventKey)) {
      return;
    }
    
    this.eventQueue.set(eventKey, alert);
    
    // Clean up old events after 10 seconds
    setTimeout(() => this.eventQueue.delete(eventKey), 10000);

    console.error(`
🚨 REAL-TIME RUGPULL ALERT 🚨
Token: ${alert.token_mint}
Type: ${alert.alert_type}
Severity: ${alert.severity}
Liquidity Drop: ${alert.liquidity_change}%
Time: ${alert.detected_at}
`);

    // Send Telegram alerts to affected users
    await this.sendRugpullTelegramAlerts(alert);

    // Execute instant protection for critical alerts
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      await this.executeInstantProtection(alert.token_mint, alert.severity);
    }
  }

  /**
   * Execute instant protection using pre-computed transactions
   */
  private async executeInstantProtection(tokenMint: string, severity: string) {
    console.log(`[SimpleRugPullDetector] Executing INSTANT protection for ${severity} alert`);
    
    // Get all automatic protections for this token
    const { data: protections } = await supabase
      .from('protected_tokens')
      .select('wallet_address, protection_level')
      .eq('token_mint', tokenMint)
      .eq('is_active', true)
      .in('protection_level', ['automatic', null]); // null defaults to automatic
    
    if (!protections || protections.length === 0) {
      console.log(`[SimpleRugPullDetector] No automatic protections for ${tokenMint}`);
      return;
    }
    
    console.log(`[SimpleRugPullDetector] Executing instant protection for ${protections.length} wallets`);
    
    // Execute in parallel for all wallets
    const results = await Promise.allSettled(
      protections.map(async (protection) => {
        try {
          // Get pre-computed transaction
          const cached = await transactionCache.getTransaction(
            tokenMint,
            protection.wallet_address,
            true // emergency
          );
          
          if (!cached) {
            console.warn(`[SimpleRugPullDetector] No cached tx for ${protection.wallet_address}`);
            // Fall back to standard execution
            return this.executeProtection(tokenMint, protection.wallet_address, `Instant ${severity} alert`);
          }
          
          // For demo mode, check first
          const { data: tokenData } = await supabase
            .from('protected_tokens')
            .select('is_demo_mode')
            .eq('token_mint', tokenMint)
            .eq('wallet_address', protection.wallet_address)
            .single();
          
          if (tokenData?.is_demo_mode) {
            console.log(`[SimpleRugPullDetector] Demo mode - simulating instant protection`);
            const { demoProtectionService } = await import('../services/DemoProtectionService');
            return demoProtectionService.simulateProtectionExecution(
              tokenMint,
              protection.wallet_address,
              'rugpull',
              0,
              0
            );
          }
          
          // Send pre-computed transaction
          console.log(`[SimpleRugPullDetector] Sending cached tx for ${protection.wallet_address}`);
          
          // The cached.transaction is already a VersionedTransaction object
          const txBuffer = cached.transaction.serialize();
          
          // Send using connection directly for pre-signed transactions
          const signature = await this.connection.sendRawTransaction(txBuffer, {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'processed'
          });
          
          // Wait for confirmation
          const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
          
          const result = {
            success: !confirmation.value.err,
            signature,
            error: confirmation.value.err ? 'Transaction failed' : undefined
          };
          
          if (result.success) {
            console.log(`✅ Instant protection executed for ${protection.wallet_address}: ${result.signature}`);
            
            // Update protection status
            await supabase
              .from('protected_tokens')
              .update({
                is_active: false,
                monitoring_active: false,
                status: 'executed',
                execution_signature: result.signature,
                executed_at: new Date().toISOString()
              })
              .eq('token_mint', tokenMint)
              .eq('wallet_address', protection.wallet_address);
          }
          
          return result;
        } catch (error) {
          console.error(`Failed instant protection for ${protection.wallet_address}:`, error);
          throw error;
        }
      })
    );
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[SimpleRugPullDetector] Instant protection results: ${successful} successful, ${failed} failed`);
  }

  /**
   * Handle rugpull from broadcast
   */
  async handleRugpull(alert: any) {
    console.log(`[SimpleRugPullDetector] Starting handleRugpull for ${alert.tokenMint}`);
    try {
      // Log to database
      console.log(`[SimpleRugPullDetector] Writing alert to database...`);
      await supabase
        .from('rugpull_alerts')
        .insert({
          token_mint: alert.tokenMint,
          alert_type: alert.type,
          severity: alert.severity,
          liquidity_change: alert.liquidityChange,
          detected_at: alert.timestamp
        });

      // Get all wallets holding this token
      console.log(`[SimpleRugPullDetector] Fetching protected wallets for token ${alert.tokenMint}...`);
      const { data: protections } = await supabase
        .from('protected_tokens')
        .select('wallet_address, protection_level')
        .eq('token_mint', alert.tokenMint)
        .eq('is_active', true);

      if (!protections || protections.length === 0) {
        console.log(`[SimpleRugPullDetector] ⚠️ No active protections found for token ${alert.tokenMint}`);
        return;
      }

      console.log(`[SimpleRugPullDetector] Found ${protections.length} protected wallets`);

      // Execute protection for each wallet
      for (const protection of protections) {
        console.log(`[SimpleRugPullDetector] Processing wallet ${protection.wallet_address} (${protection.protection_level})`);
        
        if (protection.protection_level === 'automatic' || !protection.protection_level) {
          // Default to automatic if not specified
          console.log(`[SimpleRugPullDetector] Triggering automatic protection for wallet ${protection.wallet_address}`);
          await this.executeProtection(
            alert.tokenMint,
            protection.wallet_address,
            alert.type
          );
        } else {
          // Send alert for manual protection
          console.log(`[SimpleRugPullDetector] Sending alert for manual protection: ${protection.wallet_address}`);
        }
      }
    } catch (error) {
      console.error('Error handling rugpull:', error);
    }
  }

  /**
   * Execute protection (emergency sell)
   */
  private async executeProtection(
    tokenMint: string,
    walletAddress: string,
    reason: string
  ) {
    try {
      // Check if this is a demo token
      const { data: protection } = await supabase
        .from('protected_tokens')
        .select('is_demo_mode')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .single();

      const isDemo = protection?.is_demo_mode || false;

      if (isDemo) {
        console.log(`[Demo] Simulating protection for ${tokenMint} in wallet ${walletAddress}`);
        
        // Import demo service dynamically to avoid circular dependencies
        const { demoProtectionService } = await import('../services/DemoProtectionService');
        
        await demoProtectionService.simulateProtectionExecution(
          tokenMint,
          walletAddress,
          'rugpull',
          0, // Price will be fetched in demo service
          0  // Liquidity will be fetched in demo service
        );
        
        return;
      }

      console.log(`Executing real protection for ${tokenMint} in wallet ${walletAddress}`);

      // Use swap service to execute the sell
      const result = await this.swapService.executeEmergencySell(
        tokenMint,
        walletAddress
      );

      if (result.success) {
        console.log(`✅ Emergency sell executed: ${result.signature}`);
        
        // Update protection status
        await supabase
          .from('protected_tokens')
          .update({
            is_active: false,
            status: 'executed',
            execution_signature: result.signature,
            executed_at: new Date().toISOString()
          })
          .eq('token_mint', tokenMint)
          .eq('wallet_address', walletAddress);
      } else {
        console.error(`❌ Emergency sell failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error executing protection:', error);
    }
  }

  /**
   * Execute emergency sell for a token
   */
  private async executeEmergencySell(tokenMint: string, reason: string) {
    // Get all wallets with automatic protection for this token
    const { data: protections } = await supabase
      .from('protected_tokens')
      .select('wallet_address')
      .eq('token_mint', tokenMint)
      .eq('is_active', true)
      .eq('protection_level', 'automatic');

    if (!protections || protections.length === 0) {
      console.log('No automatic protections to execute');
      return;
    }

    // Execute sell for each wallet
    for (const protection of protections) {
      await this.executeProtection(
        tokenMint,
        protection.wallet_address,
        reason
      );
    }
  }

  /**
   * Send Telegram alerts for rugpull detection
   */
  private async sendRugpullTelegramAlerts(alert: any) {
    try {
      // Get token metadata for better alert context
      const { data: tokenMetadata } = await supabase
        .from('token_metadata')
        .select('symbol, name, decimals')
        .eq('mint', alert.token_mint)
        .single();

      // Get all affected wallets with this token
      const { data: affectedWallets } = await supabase
        .from('protected_tokens')
        .select('wallet_address')
        .eq('token_mint', alert.token_mint)
        .eq('is_active', true);

      if (!affectedWallets || affectedWallets.length === 0) {
        return;
      }

      // Send alerts for each affected wallet
      for (const wallet of affectedWallets) {
        const alertMessage = this.formatRugpullAlertMessage(alert, tokenMetadata);
        
        await this.alertingService.sendAlert({
          type: 'rugpull_detected',
          severity: alert.severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
          wallet_address: wallet.wallet_address,
          token_mint: alert.token_mint,
          message: alertMessage,
          metadata: {
            alert_type: alert.alert_type,
            liquidity_change: alert.liquidity_change,
            pool_address: alert.pool_address,
            token_symbol: tokenMetadata?.symbol || 'Unknown',
            token_name: tokenMetadata?.name || 'Unknown Token'
          }
        });
      }
    } catch (error) {
      console.error('[SimpleRugPullDetector] Error sending Telegram alerts:', error);
    }
  }

  /**
   * Format rugpull alert message with rich context
   */
  private formatRugpullAlertMessage(alert: any, tokenMetadata: any): string {
    const symbol = tokenMetadata?.symbol || 'Unknown';
    const name = tokenMetadata?.name || 'Unknown Token';
    
    let message = `🚨 RUGPULL DETECTED: ${symbol} (${name})\n\n`;
    
    switch (alert.alert_type) {
      case 'LIQUIDITY_REMOVAL':
        message += `⚠️ Liquidity removed: ${Math.abs(alert.liquidity_change)}% drop detected\n`;
        message += `💧 Pool is being drained - immediate action required!`;
        break;
      case 'LARGE_DUMP':
        message += `📉 Massive sell-off detected: ${Math.abs(alert.liquidity_change)}% drop\n`;
        message += `🐋 Large holder dumping tokens!`;
        break;
      case 'MIGRATION_RISK':
        message += `🔄 Migration risk detected\n`;
        message += `⚡ Developer may be moving to new contract`;
        break;
      default:
        message += `❗ Suspicious activity: ${Math.abs(alert.liquidity_change)}% liquidity change`;
    }
    
    if (alert.pool_address) {
      message += `\n\n📍 Pool: ${alert.pool_address.substring(0, 8)}...`;
    }
    
    message += `\n\n🛡️ Protection is activating...`;
    
    return message;
  }

  /**
   * Log alert to database
   */
  private async logAlert(alert: any) {
    try {
      await supabase
        .from('protection_alerts')
        .insert({
          token_mint: alert.tokenMint,
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }
}

// --------------------- NEW SINGLETON FACTORY ---------------------
// Keep a single detector instance across the entire backend to
// ensure each Supabase channel is subscribed only once.
let detectorInstance: SimpleRugPullDetector | null = null;

export function createSimpleRugPullDetector(
  connection: Connection
): SimpleRugPullDetector {
  if (!detectorInstance) {
    detectorInstance = new SimpleRugPullDetector(connection);
  }
  return detectorInstance;
}
// -----------------------------------------------------------------