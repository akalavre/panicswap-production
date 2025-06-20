import { poolMonitoringService } from './PoolMonitoringService';
import { demoProtectionService } from './DemoProtectionService';
import supabase from '../utils/supabaseClient';

/**
 * Facade service that routes protection calls to either real or demo service
 * based on token type and environment settings
 */
export class ProtectionServiceFacade {
  private isDemoMode: boolean;

  constructor() {
    this.isDemoMode = process.env.IS_DEMO_MODE === 'true';
  }

  /**
   * Check if a token is a demo/test token
   */
  private async isTestToken(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      // Check wallet_tokens table for is_test_token flag
      const { data } = await supabase
        .from('wallet_tokens')
        .select('is_test_token')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .single();

      return data?.is_test_token || false;
    } catch (error) {
      console.error('Error checking test token status:', error);
      return false;
    }
  }

  /**
   * Enable protection for a token
   */
  async protectToken(tokenMint: string, walletAddress: string, poolAddress?: string): Promise<boolean> {
    try {
      const isTest = await this.isTestToken(tokenMint, walletAddress);

      if (isTest || this.isDemoMode) {
        console.log(`[ProtectionFacade] Enabling demo protection for ${tokenMint}`);
        
        // Mark token as demo protected in database
        await supabase
          .from('protected_tokens')
          .upsert({
            token_mint: tokenMint,
            wallet_address: walletAddress,
            is_active: true,
            monitoring_active: true,
            is_demo_mode: true,
            metadata: { demo: true },
            updated_at: new Date().toISOString()
          }, { onConflict: 'token_mint,wallet_address' });

        // Start demo monitoring
        await demoProtectionService.monitorDemoToken(tokenMint, walletAddress);
        
        return true;
      } else {
        console.log(`[ProtectionFacade] Enabling real protection for ${tokenMint}`);
        
        // Use real pool monitoring service
        if (poolAddress) {
          return await poolMonitoringService.protectTokenWithPool(tokenMint, walletAddress, poolAddress);
        } else {
          return await poolMonitoringService.protectToken(tokenMint, walletAddress);
        }
      }
    } catch (error) {
      console.error('[ProtectionFacade] Error protecting token:', error);
      return false;
    }
  }

  /**
   * Disable protection for a token
   */
  async unprotectToken(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      const isTest = await this.isTestToken(tokenMint, walletAddress);

      if (isTest || this.isDemoMode) {
        console.log(`[ProtectionFacade] Disabling demo protection for ${tokenMint}`);
        
        // Mark as inactive in database
        await supabase
          .from('protected_tokens')
          .update({
            is_active: false,
            monitoring_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('token_mint', tokenMint)
          .eq('wallet_address', walletAddress);
        
        return true;
      } else {
        console.log(`[ProtectionFacade] Disabling real protection for ${tokenMint}`);
        
        // Use real pool monitoring service
        return await poolMonitoringService.unprotectToken(tokenMint, walletAddress);
      }
    } catch (error) {
      console.error('[ProtectionFacade] Error unprotecting token:', error);
      return false;
    }
  }

  /**
   * Get protection status for a token
   */
  async getProtectionStatus(tokenMint: string, walletAddress: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();

      return data;
    } catch (error) {
      console.error('[ProtectionFacade] Error getting protection status:', error);
      return null;
    }
  }

  /**
   * Get all protected tokens for a wallet
   */
  async getProtectedTokens(walletAddress: string): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true);

      return data || [];
    } catch (error) {
      console.error('[ProtectionFacade] Error getting protected tokens:', error);
      return [];
    }
  }

  /**
   * Batch check protection status for multiple tokens
   */
  async batchCheckProtectionStatus(tokens: { mint: string; wallet: string }[]): Promise<Map<string, boolean>> {
    try {
      const statusMap = new Map<string, boolean>();

      // Build query for all token-wallet pairs
      const orConditions = tokens.map(t => 
        `(token_mint.eq.${t.mint},wallet_address.eq.${t.wallet})`
      ).join(',');

      const { data } = await supabase
        .from('protected_tokens')
        .select('token_mint, wallet_address, is_active')
        .or(orConditions);

      // Build status map
      tokens.forEach(t => {
        const protection = data?.find(p => 
          p.token_mint === t.mint && 
          p.wallet_address === t.wallet
        );
        statusMap.set(t.mint, protection?.is_active || false);
      });

      return statusMap;
    } catch (error) {
      console.error('[ProtectionFacade] Error batch checking protection status:', error);
      return new Map();
    }
  }
}

// Export singleton instance
export const protectionServiceFacade = new ProtectionServiceFacade();