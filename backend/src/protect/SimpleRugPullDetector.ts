import { protectionService } from './ProtectionService';
import { createSwapService, SwapService } from './SwapService';
import { Connection } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';
import { broadcastService, BroadcastAlert } from '../services/SupabaseBroadcastService';
import { poolMonitoringService } from '../services/PoolMonitoringService';

export interface RugPullAlert {
  tokenMint: string;
  type: 'LIQUIDITY_REMOVAL' | 'LARGE_DUMP' | 'MIGRATION_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
}

export class SimpleRugPullDetector {
  private swapService: SwapService;
  private isInitialized = false;

  constructor(private connection: Connection) {
    this.swapService = createSwapService(connection);
    this.setupBroadcastSubscriptions();
  }

  /**
   * Initialize the detector and connect to pool monitoring
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Simple RugPull Detector...');
    
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
    console.log(`Started monitoring ${protectedTokens.length} protected tokens`);
  }

  /**
   * Setup broadcast subscriptions for Supabase channels
   */
  private setupBroadcastSubscriptions() {
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
  }

  /**
   * Handle detected rugpull
   */
  private async handleRugpull(alert: any) {
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
            protection_triggered_at: new Date().toISOString(),
            protection_reason: reason
          })
          .match({ token_mint: tokenMint, wallet_address: walletAddress });

        // Log successful protection
        await supabase
          .from('protection_events')
          .insert({
            token_mint: tokenMint,
            wallet_address: walletAddress,
            event_type: 'emergency_sell',
            reason: reason,
            transaction_signature: result.signature,
            created_at: new Date().toISOString()
          });
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

  /**
   * Enable protection for a token (called from API)
   */
  async enableProtection(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      // Use pool monitoring service
      const success = await poolMonitoringService.protectToken(tokenMint, walletAddress);
      
      if (success) {
        console.log(`✅ Protection enabled for ${tokenMint}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error enabling protection:', error);
      return false;
    }
  }

  /**
   * Disable protection for a token
   */
  async disableProtection(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      const success = await poolMonitoringService.unprotectToken(tokenMint, walletAddress);
      
      if (success) {
        console.log(`❌ Protection disabled for ${tokenMint}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error disabling protection:', error);
      return false;
    }
  }

  /**
   * Get protection status
   */
  isTokenProtected(tokenMint: string): boolean {
    return poolMonitoringService.isTokenProtected(tokenMint);
  }

  /**
   * Get all protected tokens
   */
  getProtectedTokens(): string[] {
    return poolMonitoringService.getProtectedTokens();
  }
}

// Export factory function
export function createSimpleRugPullDetector(connection: Connection): SimpleRugPullDetector {
  return new SimpleRugPullDetector(connection);
}