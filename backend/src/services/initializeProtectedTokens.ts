import supabase from '../utils/supabaseClient';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { poolMonitoringService } from './PoolMonitoringService';
import { monitoringStatsService } from './MonitoringStatsService';

/**
 * Initialize tracking for all existing protected tokens on startup
 */
export async function initializeProtectedTokens(): Promise<void> {
    try {
        console.log('[InitProtectedTokens] Loading existing protected tokens...');
        
        // Get all active protected tokens (excluding rugged)
        const { data: protectedTokens, error } = await supabase
            .from('protected_tokens')
            .select('token_mint, wallet_address, pool_address, status')
            .eq('is_active', true)
            .eq('mempool_monitoring', true)
            .neq('status', 'RUGGED');
            
        if (error) {
            console.error('[InitProtectedTokens] Error loading protected tokens:', error);
            return;
        }
        
        if (!protectedTokens || protectedTokens.length === 0) {
            console.log('[InitProtectedTokens] No protected tokens found');
            return;
        }
        
        console.log(`[InitProtectedTokens] Found ${protectedTokens.length} protected tokens to initialize`);
        
        // Process each token
        for (const token of protectedTokens) {
            try {
                // Skip if somehow a rugged token made it through
                if (token.status === 'RUGGED') {
                    console.log(`[InitProtectedTokens] Skipping rugged token: ${token.token_mint}`);
                    continue;
                }
                
                console.log(`[InitProtectedTokens] Initializing tracking for ${token.token_mint}`);
                
                // Start velocity tracking
                await liquidityVelocityTracker.trackToken(token.token_mint);
                
                // Start pool monitoring if pool address exists
                if (token.pool_address) {
                    await poolMonitoringService.protectTokenWithPool(
                        token.token_mint,
                        token.wallet_address,
                        token.pool_address
                    );
                } else {
                    // Try to discover pool
                    await poolMonitoringService.protectToken(
                        token.token_mint,
                        token.wallet_address
                    );
                }
                
                // Force initial stats update
                await monitoringStatsService.forceUpdate(
                    token.token_mint,
                    token.wallet_address
                );
                
            } catch (error) {
                console.error(`[InitProtectedTokens] Error initializing ${token.token_mint}:`, error);
            }
        }
        
        console.log('[InitProtectedTokens] ✅ Initialization complete');
        
    } catch (error) {
        console.error('[InitProtectedTokens] Fatal error:', error);
    }
}