import supabase from '../utils/supabaseClient';
import { poolMonitoringService } from '../services/PoolMonitoringService';
import { createSimpleRugPullDetector } from './SimpleRugPullDetector';
import { Connection } from '@solana/web3.js';
import config from '../config';
import { monitoringStatsService } from '../services/MonitoringStatsService';

export interface AutoProtectionSettings {
  enabled: boolean;
  priceDropThreshold: number;      // Default: 20%
  liquidityDropThreshold: number;  // Default: 20%
  autoSell: boolean;               // Default: true
  minLiquidity: number;            // Default: $1000
}

export class SimpleAutoProtectionService {
  private static instance: SimpleAutoProtectionService;
  private rugPullDetector: any;
  private connection: Connection;
  // private webSocketService: any; // REMOVED: Using Supabase Realtime

  private constructor() {
    this.connection = new Connection(config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com');
    this.rugPullDetector = createSimpleRugPullDetector(this.connection);
  }

  // REMOVED: setWebSocketService - no longer needed with Supabase Realtime

  static getInstance(): SimpleAutoProtectionService {
    if (!SimpleAutoProtectionService.instance) {
      SimpleAutoProtectionService.instance = new SimpleAutoProtectionService();
    }
    return SimpleAutoProtectionService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('Initializing Simple Auto-Protection Service...');
    await this.rugPullDetector.initialize();
  }

  /**
   * Enable auto-protection for a wallet
   */
  async enableAutoProtection(
    walletAddress: string,
    settings?: Partial<AutoProtectionSettings>
  ): Promise<boolean> {
    try {
      const defaultSettings: AutoProtectionSettings = {
        enabled: true,
        priceDropThreshold: 20,
        liquidityDropThreshold: 20,
        autoSell: true,
        minLiquidity: 1000
      };

      const finalSettings = { ...defaultSettings, ...settings };

      // Save settings
      const { error } = await supabase
        .from('wallet_auto_protection')
        .upsert({
          wallet_address: walletAddress,
          enabled: true,
          settings: finalSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('Error enabling auto-protection:', error);
        return false;
      }

      // Protect all wallet tokens
      await this.protectWalletTokens(walletAddress);

      console.log(`✅ Auto-protection enabled for ${walletAddress}`);
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Auto-protection events are automatically broadcast via Supabase tables

      // DUAL-WRITE: Write auto-protection event to Supabase
      try {
        await supabase
          .from('auto_protection_events')
          .insert({
            wallet_address: walletAddress,
            event_type: 'enabled',
            token_count: 0, // Will be updated as tokens are protected
            event_data: {
              settings: finalSettings,
              source: 'auto_protection_service',
              timestamp: Date.now()
            }
          });

        // Also write wallet notification
        await supabase
          .from('wallet_notifications')
          .insert({
            wallet_address: walletAddress,
            notification_type: 'auto_protection_enabled',
            title: 'Auto-Protection Enabled',
            message: 'Automatic protection has been enabled for your wallet',
            priority: 'normal',
            metadata: {
              settings: finalSettings
            }
          });
      } catch (error) {
        console.error('Error writing auto-protection event to Supabase:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error enabling auto-protection:', error);
      return false;
    }
  }

  /**
   * Disable auto-protection
   */
  async disableAutoProtection(walletAddress: string): Promise<boolean> {
    try {
      // Update database
      const { error } = await supabase
        .from('wallet_auto_protection')
        .update({ 
          enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error disabling auto-protection:', error);
        return false;
      }

      // Remove protection from all tokens
      await this.unprotectWalletTokens(walletAddress);

      console.log(`❌ Auto-protection disabled for ${walletAddress}`);
      
      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Auto-protection disabled events are automatically broadcast via Supabase tables

      // DUAL-WRITE: Write auto-protection disabled event to Supabase
      try {
        await supabase
          .from('auto_protection_events')
          .insert({
            wallet_address: walletAddress,
            event_type: 'disabled',
            token_count: 0,
            event_data: {
              source: 'auto_protection_service',
              timestamp: Date.now()
            }
          });

        // Also write wallet notification
        await supabase
          .from('wallet_notifications')
          .insert({
            wallet_address: walletAddress,
            notification_type: 'auto_protection_disabled',
            title: 'Auto-Protection Disabled',
            message: 'Automatic protection has been disabled for your wallet',
            priority: 'normal'
          });
      } catch (error) {
        console.error('Error writing auto-protection disabled event to Supabase:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error disabling auto-protection:', error);
      return false;
    }
  }

  /**
   * Protect all tokens in a wallet
   */
  private async protectWalletTokens(walletAddress: string) {
    try {
      // Get wallet tokens worth protecting (>$50 value)
      const { data: walletTokens } = await supabase
        .from('wallet_tokens')
        .select(`
          token_mint,
          balance,
          token_metadata!inner(
            symbol,
            decimals
          ),
          token_prices!inner(
            price
          )
        `)
        .eq('wallet_address', walletAddress)
        .gt('balance', 0);

      if (!walletTokens || walletTokens.length === 0) {
        console.log('No tokens to protect');
        return;
      }

      // When auto-protect is enabled, protect ALL tokens (no value filter)
      // This ensures all tokens show as protected in the UI
      const tokensToProtect = walletTokens;

      console.log(`Protecting ${tokensToProtect.length} tokens for ${walletAddress}`);

      // Enable protection for each token
      for (const token of tokensToProtect) {
        await this.rugPullDetector.enableProtection(
          token.token_mint,
          walletAddress
        );
      }
    } catch (error) {
      console.error('Error protecting wallet tokens:', error);
    }
  }

  /**
   * Remove protection from all wallet tokens
   */
  private async unprotectWalletTokens(walletAddress: string) {
    try {
      // Get protected tokens for this wallet
      const { data: protectedTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true);

      if (!protectedTokens || protectedTokens.length === 0) {
        return;
      }

      // Disable protection for each token
      for (const token of protectedTokens) {
        await this.rugPullDetector.disableProtection(
          token.token_mint,
          walletAddress
        );
      }
    } catch (error) {
      console.error('Error unprotecting wallet tokens:', error);
    }
  }

  /**
   * Get auto-protection status
   */
  async getStatus(walletAddress: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('wallet_auto_protection')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (!data) {
        return {
          enabled: false,
          settings: null
        };
      }

      // Get protected tokens count
      const { count } = await supabase
        .from('protected_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress)
        .eq('is_active', true);

      return {
        enabled: data.enabled,
        settings: data.settings,
        protectedTokensCount: count || 0,
        lastUpdated: data.updated_at
      };
    } catch (error) {
      console.error('Error getting auto-protection status:', error);
      return {
        enabled: false,
        settings: null
      };
    }
  }

  /**
   * Manually protect a specific token
   */
  async protectToken(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      return await this.rugPullDetector.enableProtection(tokenMint, walletAddress);
    } catch (error) {
      console.error('Error protecting token:', error);
      return false;
    }
  }

  /**
   * Manually unprotect a specific token
   */
  async unprotectToken(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      return await this.rugPullDetector.disableProtection(tokenMint, walletAddress);
    } catch (error) {
      console.error('Error unprotecting token:', error);
      return false;
    }
  }
}

// Export singleton
export const simpleAutoProtectionService = SimpleAutoProtectionService.getInstance();