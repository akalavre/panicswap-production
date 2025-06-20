import supabase from '../utils/supabaseClient';
import { broadcastService } from './SupabaseBroadcastService';

export class DemoProtectionService {
  /**
   * Simulate protection execution for demo tokens
   * Shows users what would happen in a real protection scenario
   */
  async simulateProtectionExecution(
    tokenMint: string,
    walletAddress: string,
    triggerType: 'price_drop' | 'liquidity_drop' | 'rugpull',
    currentPrice: number,
    currentLiquidity: number
  ) {
    try {
      console.log(`[Demo] Simulating protection execution for ${tokenMint}`);

      // 1. Get token and protection settings
      const { data: protection } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .single();

      if (!protection || !protection.is_demo_mode) {
        throw new Error('Not a demo token');
      }

      const { data: tokenData } = await supabase
        .from('wallet_tokens')
        .select('*')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .single();

      if (!tokenData) {
        throw new Error('Token data not found');
      }

      // 2. Calculate simulated swap values
      const tokenBalance = parseFloat(tokenData.ui_balance);
      const estimatedSolOutput = (tokenBalance * currentPrice) * 0.97; // 3% slippage
      const gasCost = 0.005; // 0.005 SOL gas estimate

      // 3. Create demo protection event
      const { data: eventData } = await supabase
        .from('protection_events')
        .insert({
          wallet_address: walletAddress,
          token_mint: tokenMint,
          token_symbol: protection.token_symbol || 'TEST',
          event_type: 'demo_triggered',
          trigger_type: triggerType,
          trigger_value: triggerType === 'price_drop' ? currentPrice : currentLiquidity,
          trigger_threshold: triggerType === 'price_drop' ? protection.price_threshold : protection.liquidity_threshold,
          token_amount: tokenBalance,
          estimated_sol: estimatedSolOutput,
          gas_cost: gasCost,
          status: 'simulated',
          is_demo: true,
          metadata: {
            demo_mode: true,
            simulated_values: {
              input_tokens: tokenBalance,
              output_sol: estimatedSolOutput,
              gas_cost: gasCost,
              slippage: 3,
              execution_time_ms: 1500 // Typical execution time
            }
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      // 4. Send demo notification
      await broadcastService.broadcastProtectionExecution({
        walletAddress,
        tokenMint,
        action: 'executed',
        reason: `🎮 DEMO: Protection would have been triggered! Would swap ${tokenBalance.toFixed(2)} tokens for ~${estimatedSolOutput.toFixed(4)} SOL`
      });

      // 5. Create wallet notification
      await supabase
        .from('wallet_notifications')
        .insert({
          wallet_address: walletAddress,
          notification_type: 'protection_triggered',
          title: '🎮 Demo Protection Triggered',
          message: `Your protection for ${protection.token_symbol || 'TEST'} was triggered! In a real scenario, we would have swapped ${tokenBalance.toFixed(2)} tokens for ~${estimatedSolOutput.toFixed(4)} SOL.`,
          metadata: {
            token_mint: tokenMint,
            trigger_type: triggerType,
            is_demo: true,
            event_id: eventData?.id
          },
          priority: 'high',
          action_url: `/protection-history?event=${eventData?.id}`,
          created_at: new Date().toISOString()
        });

      console.log(`[Demo] Protection simulation completed for ${tokenMint}`);
      return eventData;

    } catch (error) {
      console.error('[Demo] Error simulating protection:', error);
      throw error;
    }
  }

  /**
   * Monitor demo tokens with real market data
   * Triggers demo protection when thresholds are hit
   */
  async monitorDemoToken(tokenMint: string, walletAddress: string) {
    try {
      // Get protection settings
      const { data: protection } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress)
        .eq('is_demo_mode', true)
        .single();

      if (!protection || !protection.monitoring_active) {
        return;
      }

      // Get current price and liquidity
      const { data: priceData } = await supabase
        .from('token_prices')
        .select('*')
        .eq('token_mint', tokenMint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!priceData) {
        return;
      }

      // Check for price drop trigger
      if (protection.price_threshold && priceData.price_change_24h) {
        const priceDropPercentage = Math.abs(priceData.price_change_24h);
        
        if (priceDropPercentage >= protection.price_threshold) {
          await this.simulateProtectionExecution(
            tokenMint,
            walletAddress,
            'price_drop',
            priceData.price_usd,
            priceData.liquidity
          );
        }
      }

      // Check for liquidity drop trigger (if we have historical data)
      if (protection.liquidity_threshold && priceData.liquidity) {
        // This would need historical liquidity data to calculate drop
        // For demo purposes, we can simulate based on volatility
        const simulatedLiquidityDrop = Math.random() * 100; // Random for demo
        
        if (simulatedLiquidityDrop >= protection.liquidity_threshold) {
          await this.simulateProtectionExecution(
            tokenMint,
            walletAddress,
            'liquidity_drop',
            priceData.price_usd,
            priceData.liquidity
          );
        }
      }

    } catch (error) {
      console.error('[Demo] Error monitoring demo token:', error);
    }
  }

  /**
   * Get demo protection history for a wallet
   */
  async getDemoProtectionHistory(walletAddress: string) {
    const { data, error } = await supabase
      .from('protection_events')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_demo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const demoProtectionService = new DemoProtectionService();