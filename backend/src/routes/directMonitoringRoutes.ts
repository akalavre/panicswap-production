// Direct monitoring routes (Redis caching removed for real-time data)
import { Router } from 'express';
import supabase from '../utils/supabaseClient';
// Redis imports removed - we fetch fresh data on each request

const router = Router();

// Get monitoring status - always returns fresh data
router.get('/monitoring-status/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const walletAddress = req.query.wallet || req.headers['x-wallet-address'];
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }
        
        console.log(`[MonitoringStatus] Fetching fresh data for ${tokenMint}`);
        
        // First check if token is rugged
        const { data: protectedToken } = await supabase
            .from('protected_tokens')
            .select('status, monitoring_active')
            .eq('token_mint', tokenMint)
            .eq('wallet_address', walletAddress)
            .single();
        
        // If token is rugged, return rugged status immediately
        if (protectedToken?.status === 'RUGGED') {
            const ruggedStats = {
                token_mint: tokenMint,
                wallet_address: walletAddress,
                monitoring_active: false,
                status: 'RUGGED',
                current_liquidity: 0,
                price_change_1m: 0,
                price_change_5m: 0,
                liquidity_change_1m: 0,
                liquidity_change_5m: 0,
                flash_rug_alert: false,
                rapid_drain_alert: false,
                slow_bleed_alert: false,
                last_check_at: new Date().toISOString()
            };
            
            return res.json({
                status: 'success',
                data: ruggedStats,
                cached: false,
                rugged: true
            });
        }
        
        // Fetch from database if not cached
        const { data: stats } = await supabase
            .from('monitoring_stats')
            .select('*')
            .eq('token_mint', tokenMint)
            .eq('wallet_address', walletAddress)
            .single();
        
        // Fetch velocity data from database
        let velocityData = null;
        const { data: dbVelocity } = await supabase
            .from('liquidity_velocity')
            .select('*')
            .eq('token_mint', tokenMint)
            .order('timestamp', { ascending: false })
            .limit(1);
        
        if (dbVelocity && dbVelocity.length > 0) {
            velocityData = dbVelocity[0];
        }
        
        // Check if this is a newly added token
        const { data: tokenInfo } = await supabase
            .from('wallet_tokens')
            .select('is_newly_added, created_at')
            .eq('token_mint', tokenMint)
            .eq('wallet_address', walletAddress)
            .single();
        
        // Get current price/liquidity data
        const { data: priceData } = await supabase
            .from('token_prices')
            .select('price, liquidity')
            .eq('token_mint', tokenMint)
            .single();
        
        // Debug logging for retrieved values
        console.log(`[MonitoringStatus] Debug data for ${tokenMint}:`);
        console.log(`  Stats from DB:`, {
            price_change_1m: stats?.price_change_1m,
            liquidity_change_1m: stats?.liquidity_change_1m,
            monitoring_active: stats?.monitoring_active
        });
        console.log(`  VelocityData from Redis/Cache:`, {
            price_velocity_1m: velocityData?.price_velocity_1m,
            liquidity_velocity_1m: velocityData?.liquidity_velocity_1m,
            price1m: velocityData?.velocities?.price1m,
            liquidity1m: velocityData?.velocities?.liquidity1m,
            flash_rug_alert: velocityData?.flash_rug_alert
        });
        console.log(`  PriceData:`, {
            price: priceData?.price,
            liquidity: priceData?.liquidity
        });
        
        // Merge data with correct field names from LiquidityVelocityTracker
let finalStats = {
            token_mint: tokenMint,
            wallet_address: walletAddress,
            monitoring_active: stats?.monitoring_active || protectedToken?.monitoring_active || false,
            current_liquidity: priceData?.liquidity || stats?.current_liquidity || 0,
            price: priceData?.price || 0,
            // Use correct velocity field names: velocities.price1m vs price_velocity_1m
            price_change_1m: stats?.price_change_1m || velocityData?.velocities?.price1m || velocityData?.price_velocity_1m || 0,
            price_change_5m: stats?.price_change_5m || velocityData?.velocities?.price5m || velocityData?.price_velocity_5m || 0,
            price_change_30m: stats?.price_change_30m || velocityData?.velocities?.price30m || velocityData?.price_velocity_30m || 0,
            // Fixed: Use correct velocity field names: velocities.liquidity1m vs liquidity_velocity_1m
            change1m: parseFloat((stats?.liquidity_change_1m || velocityData?.velocities?.liquidity1m || velocityData?.liquidity_velocity_1m || 0).toString()),
            change5m: parseFloat((stats?.liquidity_change_5m || velocityData?.velocities?.liquidity5m || velocityData?.liquidity_velocity_5m || 0).toString()),
            change30m: parseFloat((stats?.liquidity_change_30m || velocityData?.velocities?.liquidity30m || velocityData?.liquidity_velocity_30m || 0).toString()),
            liquidity_change_1m: stats?.liquidity_change_1m || velocityData?.velocities?.liquidity1m || velocityData?.liquidity_velocity_1m || 0,
            liquidity_change_5m: stats?.liquidity_change_5m || velocityData?.velocities?.liquidity5m || velocityData?.liquidity_velocity_5m || 0,
            liquidity_change_30m: stats?.liquidity_change_30m || velocityData?.velocities?.liquidity30m || velocityData?.liquidity_velocity_30m || 0,
            flash_rug_alert: stats?.flash_rug_alert || velocityData?.alerts?.flashRug || velocityData?.flash_rug_alert || false,
            rapid_drain_alert: stats?.rapid_drain_alert || velocityData?.alerts?.rapidDrain || velocityData?.rapid_drain_alert || false,
            slow_bleed_alert: stats?.slow_bleed_alert || velocityData?.alerts?.slowBleed || false,
            is_newly_added: tokenInfo?.is_newly_added || false,
            last_check_at: stats?.last_check_at || new Date().toISOString()
        };

        // Log if all velocity changes are zero (might need fresh data)
        if (finalStats.change1m === 0 && finalStats.change5m === 0 && finalStats.change30m === 0) {
            console.log(`[MonitoringStatus] All velocity changes are 0 for ${tokenMint}, might need fresh velocity calculation`);
        }

        console.log(`[MonitoringStatus] Final stats for ${tokenMint}:`, {
            change1m: finalStats.change1m,
            change5m: finalStats.change5m,
            change30m: finalStats.change30m,
            liquidity_change_1m: finalStats.liquidity_change_1m,
            price_change_1m: finalStats.price_change_1m,
            monitoring_active: finalStats.monitoring_active
        });
        
        res.json({
            status: 'success',
            data: finalStats,
            cached: false
        });
        
    } catch (error) {
        console.error('[CachedMonitoring] Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch monitoring status',
            message: (error as Error).message 
        });
    }
});

// Get hot tokens from database
router.get('/hot-tokens', async (req, res) => {
    try {
        // Fetch hot tokens based on recent activity or high risk
        const { data: hotTokens } = await supabase
            .from('hot_tokens')
            .select('token_mint, reason, priority_score')
            .order('priority_score', { ascending: false })
            .limit(10);
            
        res.json({
            status: 'success',
            data: hotTokens || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch hot tokens' });
    }
});

// Get recent critical alerts from database
router.get('/critical-alerts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Fetch recent critical alerts from pattern_alerts table
        const { data: alerts } = await supabase
            .from('pattern_alerts')
            .select('*')
            .eq('alert_type', 'CRITICAL')
            .order('created_at', { ascending: false })
            .limit(limit);
            
        res.json({
            status: 'success',
            data: alerts || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch critical alerts' });
    }
});

export default router;