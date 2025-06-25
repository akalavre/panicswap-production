import supabase from '../utils/supabaseClient';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { EventEmitter } from 'events';

interface RuggedCriteria {
  liquidityDrainPercent: number;    // e.g., 95% liquidity gone
  priceDropPercent: number;         // e.g., 90% price drop
  timeWindowHours: number;          // e.g., within 24 hours
  zeroLiquidityThreshold: number;   // e.g., less than $10 USD
}

export class RuggedTokenDetector extends EventEmitter {
  private readonly RUGGED_CRITERIA: RuggedCriteria = {
    liquidityDrainPercent: 95,      // 95% liquidity removed
    priceDropPercent: 85,           // 85% price drop
    timeWindowHours: 24,            // within 24 hours
    zeroLiquidityThreshold: 10      // less than $10 USD liquidity
  };

  constructor() {
    super();
    console.log('[RuggedTokenDetector] Initialized');
  }

  /**
   * Check if a token has been rugged
   */
  public async checkIfRugged(tokenMint: string): Promise<boolean> {
    try {
      // First check if token is newly added (skip new tokens)
      const { data: tokenInfo } = await supabase
        .from('wallet_tokens')
        .select('created_at, is_newly_added')
        .eq('token_mint', tokenMint)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tokenInfo) {
        // Skip tokens that are newly added
        if (tokenInfo.is_newly_added) {
          console.log(`[RuggedTokenDetector] Skipping newly added token ${tokenMint}`);
          return false;
        }

        // Skip tokens less than 1 hour old
        const tokenAge = Date.now() - new Date(tokenInfo.created_at).getTime();
        const oneHour = 60 * 60 * 1000;
        if (tokenAge < oneHour) {
          console.log(`[RuggedTokenDetector] Skipping young token ${tokenMint} (age: ${Math.round(tokenAge / 1000 / 60)} minutes)`);
          return false;
        }
      }

      // Get current token data
      const { data: tokenData } = await supabase
        .from('token_prices')
        .select('price, price_usd, liquidity, price_change_24h')
        .eq('token_mint', tokenMint)
        .single();

      if (!tokenData) return false;

      // Get velocity data
      const velocityData = await liquidityVelocityTracker.getVelocityData(tokenMint);

      // Check for rug conditions
      const isRugged = this.evaluateRugConditions(tokenData, velocityData);

      if (isRugged) {
        console.log(`🚨 [RuggedTokenDetector] Token ${tokenMint} identified as RUGGED`);
        await this.markTokenAsRugged(tokenMint);
        this.emit('token-rugged', { tokenMint });
      }

      return isRugged;
    } catch (error) {
      console.error(`[RuggedTokenDetector] Error checking token ${tokenMint}:`, error);
      return false;
    }
  }

  /**
   * Evaluate if token meets rug criteria
   */
  private evaluateRugConditions(tokenData: any, velocityData: any): boolean {
    const conditions = {
      zeroLiquidity: false,
      massivePriceDrop: false,
      rapidLiquidityDrain: false,
      sustainedDrain: false
    };

    // 1. Check for zero or near-zero liquidity
    if (tokenData.liquidity < this.RUGGED_CRITERIA.zeroLiquidityThreshold) {
      conditions.zeroLiquidity = true;
    }

    // 2. Check for massive price drop
    if (tokenData.price_change_24h <= -this.RUGGED_CRITERIA.priceDropPercent) {
      conditions.massivePriceDrop = true;
    }

    // 3. Check velocity data for rapid drain
    if (velocityData) {
      // Check if liquidity dropped more than threshold
      const totalLiquidityChange = velocityData.velocities.liquidity30m * 30; // Total % change over 30 mins
      if (totalLiquidityChange <= -this.RUGGED_CRITERIA.liquidityDrainPercent) {
        conditions.rapidLiquidityDrain = true;
      }

      // Check if we have sustained drain pattern
      if (velocityData.alerts.rapidDrain || velocityData.alerts.flashRug) {
        conditions.sustainedDrain = true;
      }
    }

    // Token is rugged ONLY if it has (zero liquidity AND price drop) OR (massive drain patterns)
    // Don't mark as rugged based on zero liquidity alone - needs additional evidence
    const isRugged = (conditions.zeroLiquidity && conditions.massivePriceDrop) || 
                    (conditions.massivePriceDrop && conditions.rapidLiquidityDrain) ||
                    (conditions.sustainedDrain && conditions.rapidLiquidityDrain);

    if (isRugged) {
      console.log(`[RuggedTokenDetector] Rug conditions met:`, conditions);
    }

    return isRugged;
  }

  /**
   * Mark token as rugged in database
   */
  private async markTokenAsRugged(tokenMint: string): Promise<void> {
    try {
      // Update protected_tokens to mark as rugged
      const { error: protectedError } = await supabase
        .from('protected_tokens')
        .update({
          monitoring_active: false,
          risk_level: 'RUGGED',
          updated_at: new Date()
        })
        .eq('token_mint', tokenMint);

      if (protectedError) {
        console.error('[RuggedTokenDetector] Error updating protected_tokens:', protectedError);
      }

      // Update monitoring_stats to stop monitoring
      const { error: statsError } = await supabase
        .from('monitoring_stats')
        .update({
          active_monitors: 0,
          websocket_connected: false,
          estimated_time_to_rug: 0, // Already rugged
          updated_at: new Date()
        })
        .eq('token_mint', tokenMint);

      if (statsError) {
        console.error('[RuggedTokenDetector] Error updating monitoring_stats:', statsError);
      }

      // Create a rug event record
      const { error: eventError } = await supabase
        .from('demo_protection_events')
        .insert({
          token_mint: tokenMint,
          event_type: 'TOKEN_RUGGED',
          risk_level: 'CRITICAL',
          action_taken: 'MONITORING_STOPPED',
          details: {
            reason: 'Token identified as rugged - liquidity drained',
            liquidity: 0, // Liquidity is drained for rugged tokens
            detection_time: new Date().toISOString()
          },
          created_at: new Date()
        });

      if (eventError) {
        console.error('[RuggedTokenDetector] Error creating rug event:', eventError);
      }

      // Stop tracking in velocity tracker
      liquidityVelocityTracker.stopTrackingToken(tokenMint);

      console.log(`✅ [RuggedTokenDetector] Token ${tokenMint} marked as RUGGED and monitoring stopped`);

    } catch (error) {
      console.error('[RuggedTokenDetector] Error marking token as rugged:', error);
    }
  }

  /**
   * Batch check multiple tokens for rug status
   */
  public async checkMultipleTokens(tokenMints: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < tokenMints.length; i += batchSize) {
      const batch = tokenMints.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(mint => this.checkIfRugged(mint))
      );
      
      batch.forEach((mint, index) => {
        results.set(mint, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Scan all protected tokens for rugs
   */
  public async scanForRuggedTokens(): Promise<void> {
    try {
      console.log('[RuggedTokenDetector] Scanning all protected tokens for rugs...');
      
      // Get all actively monitored tokens
      const { data: protectedTokens } = await supabase
        .from('protected_tokens')
        .select('token_mint')
        .eq('monitoring_active', true)
        .neq('risk_level', 'RUGGED');

      if (!protectedTokens || protectedTokens.length === 0) {
        console.log('[RuggedTokenDetector] No active tokens to scan');
        return;
      }

      const tokenMints = protectedTokens.map(t => t.token_mint);
      console.log(`[RuggedTokenDetector] Scanning ${tokenMints.length} tokens...`);

      const results = await this.checkMultipleTokens(tokenMints);
      
      const ruggedCount = Array.from(results.values()).filter(isRugged => isRugged).length;
      console.log(`[RuggedTokenDetector] Scan complete: ${ruggedCount} rugged tokens found`);

    } catch (error) {
      console.error('[RuggedTokenDetector] Error scanning for rugged tokens:', error);
    }
  }
}

// Export singleton instance
export const ruggedTokenDetector = new RuggedTokenDetector();