import supabase from '../utils/supabaseClient';
// import { WebSocketService } from '../services/WebSocketService'; // REMOVED: Using Supabase Realtime

export interface ProtectionSettings {
  priceDropThreshold: number; // Percentage drop to trigger (e.g., 10 for 10%)
  liquidityDropThreshold: number; // Percentage liquidity drop to trigger
  gasBoost: number; // Gas multiplier for emergency exit (e.g., 1.5 for 50% boost)
  slippageTolerance: number; // Max slippage for exit (e.g., 50 for 50%)
  autoSell: boolean; // Whether to auto-execute sell on trigger
}

export interface ProtectedToken {
  id: string;
  wallet_address: string;
  token_mint: string;
  token_symbol?: string;
  token_name?: string;
  protection_settings: ProtectionSettings;
  status: 'active' | 'triggered' | 'paused';
  initial_price?: number;
  initial_liquidity?: number;
  created_at: string;
  last_checked_at: string;
  trigger_count: number;
}

export class ProtectionService {
  private static instance: ProtectionService;
  // private wsService: WebSocketService | null = null; // REMOVED: Using Supabase Realtime

  private constructor() {}

  static getInstance(): ProtectionService {
    if (!ProtectionService.instance) {
      ProtectionService.instance = new ProtectionService();
    }
    return ProtectionService.instance;
  }

  // REMOVED: setWebSocketService - no longer needed with Supabase Realtime

  // Add a new protected token
  async addProtection(
    walletAddress: string,
    tokenMint: string,
    settings: ProtectionSettings,
    tokenInfo?: { symbol?: string; name?: string; currentPrice?: number; currentLiquidity?: number }
  ): Promise<ProtectedToken | null> {
    try {
      // Check if protection already exists
      const { data: existing } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (existing) {
        console.log(`Protection already exists for ${tokenMint} in wallet ${walletAddress}`);
        return existing;
      }

      // Create new protection
      const { data, error } = await supabase
        .from('protected_tokens')
        .insert({
          wallet_address: walletAddress,
          token_mint: tokenMint,
          token_symbol: tokenInfo?.symbol,
          token_name: tokenInfo?.name,
          protection_settings: settings,
          initial_price: tokenInfo?.currentPrice,
          initial_liquidity: tokenInfo?.currentLiquidity,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding protection:', error);
        return null;
      }

      // Log protection event
      await this.logProtectionEvent(data.id, walletAddress, tokenMint, 'created', {
        settings,
        initial_price: tokenInfo?.currentPrice,
        initial_liquidity: tokenInfo?.currentLiquidity
      });

      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection events are automatically broadcast via Supabase Realtime
      // when we write to protection_events table

      // DUAL-WRITE: Write protection event to Supabase
      try {
        await supabase
          .from('protection_events')
          .insert({
            protected_token_id: data.id,
            wallet_address: walletAddress,
            token_mint: tokenMint,
            event_type: 'protection_added',
            event_data: {
              settings,
              symbol: tokenInfo?.symbol,
              initialLiquidity: tokenInfo?.currentLiquidity,
              source: 'protection_service',
              timestamp: Date.now()
            }
          });
      } catch (error) {
        console.error('Error writing protection event to Supabase:', error);
      }

      return data;
    } catch (error) {
      console.error('Error in addProtection:', error);
      return null;
    }
  }

  // Update protection settings
  async updateProtection(
    walletAddress: string,
    tokenMint: string,
    settings: Partial<ProtectionSettings>
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (!existing) {
        console.error(`No protection found for ${tokenMint} in wallet ${walletAddress}`);
        return false;
      }

      const updatedSettings = { ...existing.protection_settings, ...settings };

      const { error } = await supabase
        .from('protected_tokens')
        .update({
          protection_settings: updatedSettings,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating protection:', error);
        return false;
      }

      // Log update event
      await this.logProtectionEvent(existing.id, walletAddress, tokenMint, 'updated', {
        old_settings: existing.protection_settings,
        new_settings: updatedSettings
      });

      return true;
    } catch (error) {
      console.error('Error in updateProtection:', error);
      return false;
    }
  }

  // Remove protection
  async removeProtection(walletAddress: string, tokenMint: string): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (!existing) {
        console.error(`No protection found for ${tokenMint} in wallet ${walletAddress}`);
        return false;
      }

      // Log removal event first
      await this.logProtectionEvent(existing.id, walletAddress, tokenMint, 'removed', {});

      const { error } = await supabase
        .from('protected_tokens')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Error removing protection:', error);
        return false;
      }

      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Protection removal events are automatically broadcast via Supabase Realtime

      // DUAL-WRITE: Write protection removed event to Supabase
      try {
        await supabase
          .from('protection_events')
          .insert({
            protected_token_id: existing.id,
            wallet_address: walletAddress,
            token_mint: tokenMint,
            event_type: 'protection_removed',
            event_data: {
              symbol: existing.token_symbol,
              source: 'protection_service',
              timestamp: Date.now()
            }
          });
      } catch (error) {
        console.error('Error writing protection removed event to Supabase:', error);
      }

      return true;
    } catch (error) {
      console.error('Error in removeProtection:', error);
      return false;
    }
  }

  // Get all protections for a wallet
  async getWalletProtections(walletAddress: string): Promise<ProtectedToken[]> {
    try {
      const { data, error } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching wallet protections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getWalletProtections:', error);
      return [];
    }
  }

  // Get all active protections (for monitoring)
  async getActiveProtections(): Promise<ProtectedToken[]> {
    try {
      const { data, error } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('status', 'active')
        .eq('monitoring_enabled', true);

      if (error) {
        console.error('Error fetching active protections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveProtections:', error);
      return [];
    }
  }

  // Check if a token is protected for a wallet
  async isTokenProtected(walletAddress: string, tokenMint: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('protected_tokens')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // Create an alert
  async createAlert(
    protectedToken: ProtectedToken,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    alertData?: any
  ): Promise<void> {
    try {
      await supabase
        .from('protection_alerts')
        .insert({
          wallet_address: protectedToken.wallet_address,
          token_mint: protectedToken.token_mint,
          alert_type: alertType,
          severity,
          message,
          alert_data: alertData
        });

      // Update last alert timestamp
      await supabase
        .from('protected_tokens')
        .update({
          last_alert_at: new Date().toISOString(),
          alerts_count: protectedToken.trigger_count + 1
        })
        .eq('id', protectedToken.id);

      // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
      // Alerts are automatically broadcast via protection_alerts table changes
      
      // DUAL-WRITE: Also write to system_alerts for broader visibility
      try {
        await supabase
          .from('system_alerts')
          .insert({
            alert_type: severity,
            category: 'protection',
            title: `Protection Alert: ${protectedToken.token_symbol || protectedToken.token_mint}`,
            message,
            metadata: {
              tokenMint: protectedToken.token_mint,
              walletAddress: protectedToken.wallet_address,
              alertType,
              alertData,
              source: 'protection_service'
            }
          });
      } catch (err) {
        console.error('Error writing to system_alerts:', err);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  // Log protection event
  private async logProtectionEvent(
    protectedTokenId: string,
    walletAddress: string,
    tokenMint: string,
    eventType: string,
    eventData?: any
  ): Promise<void> {
    try {
      await supabase
        .from('protection_events')
        .insert({
          protected_token_id: protectedTokenId,
          wallet_address: walletAddress,
          token_mint: tokenMint,
          event_type: eventType,
          event_data: eventData
        });
    } catch (error) {
      console.error('Error logging protection event:', error);
    }
  }

  // Update protection status
  async updateProtectionStatus(
    protectedTokenId: string,
    status: 'active' | 'triggered' | 'paused',
    triggerData?: any
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        last_checked_at: new Date().toISOString()
      };

      if (status === 'triggered') {
        const { data: current } = await supabase
          .from('protected_tokens')
          .select('trigger_count')
          .eq('id', protectedTokenId)
          .single();

        updates.trigger_count = (current?.trigger_count || 0) + 1;
      }

      await supabase
        .from('protected_tokens')
        .update(updates)
        .eq('id', protectedTokenId);

      if (triggerData) {
        const { data: token } = await supabase
          .from('protected_tokens')
          .select('*')
          .eq('id', protectedTokenId)
          .single();

        if (token) {
          await this.logProtectionEvent(
            protectedTokenId,
            token.wallet_address,
            token.token_mint,
            'triggered',
            triggerData
          );
        }
      }
    } catch (error) {
      console.error('Error updating protection status:', error);
    }
  }
}

export const protectionService = ProtectionService.getInstance();