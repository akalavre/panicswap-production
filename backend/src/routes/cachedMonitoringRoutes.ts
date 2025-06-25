// Cached monitoring routes using Upstash Redis
import { Router } from 'express';
import supabase from '../utils/supabaseClient';
import { cacheKeys, getCached, setCached, CACHE_TTL } from '../utils/upstashClient';

const router = Router();

// Get monitoring status with Redis caching
router.get('/monitoring-status/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const walletAddress = req.query.wallet || req.headers['x-wallet-address'];
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }
        
        // Check Redis cache first
        const cacheKey = cacheKeys.monitoringStats(tokenMint, walletAddress as string);
        const cached = await getCached(cacheKey);
        
        if (cached) {
            console.log(`[Cache HIT] Monitoring stats for ${tokenMint}`);
            return res.json({
                status: 'success',
                data: cached,
                cached: true
            });
        }
        
        console.log(`[Cache MISS] Fetching monitoring stats for ${tokenMint}`);
        
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
            
            // Cache the rugged status
            await setCached(cacheKey, ruggedStats, CACHE_TTL.MONITORING_STATS);
            
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
        
        if (stats) {
            // Cache for next time
            await setCached(cacheKey, stats, CACHE_TTL.MONITORING_STATS);
        }
        
        // Also check velocity data
        let velocityData = null;
        const velocityCacheKey = cacheKeys.velocity(tokenMint);
        velocityData = await getCached(velocityCacheKey);
        
        if (!velocityData) {
            // Fetch from database
            const { data: dbVelocity } = await supabase
                .from('liquidity_velocity')
                .select('*')
                .eq('token_mint', tokenMint)
                .order('timestamp', { ascending: false })
                .limit(1);
            
            if (dbVelocity && dbVelocity.length > 0) {
                velocityData = dbVelocity[0];
                await setCached(velocityCacheKey, velocityData, CACHE_TTL.VELOCITY_DATA);
            }
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
        
        // Merge data
        const finalStats = {
            token_mint: tokenMint,
            wallet_address: walletAddress,
            monitoring_active: stats?.monitoring_active || protectedToken?.monitoring_active || false,
            current_liquidity: priceData?.liquidity || stats?.current_liquidity || 0,
            price: priceData?.price || 0,
            price_change_1m: stats?.price_change_1m || velocityData?.price_velocity_1m || 0,
            price_change_5m: stats?.price_change_5m || velocityData?.price_velocity_5m || 0,
            liquidity_change_1m: stats?.liquidity_change_1m || velocityData?.liquidity_velocity_1m || 0,
            liquidity_change_5m: stats?.liquidity_change_5m || velocityData?.liquidity_velocity_5m || 0,
            flash_rug_alert: stats?.flash_rug_alert || velocityData?.flash_rug_alert || false,
            rapid_drain_alert: stats?.rapid_drain_alert || velocityData?.rapid_drain_alert || false,
            slow_bleed_alert: stats?.slow_bleed_alert || false,
            is_newly_added: tokenInfo?.is_newly_added || false,
            last_check_at: stats?.last_check_at || new Date().toISOString()
        };
        
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

// Get hot tokens from Redis
router.get('/hot-tokens', async (req, res) => {
    try {
        const hotTokens = await getCached(cacheKeys.hotTokens());
        res.json({
            status: 'success',
            data: hotTokens || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch hot tokens' });
    }
});

// Get recent critical alerts from Redis
router.get('/critical-alerts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const alerts = await getCached(cacheKeys.criticalAlerts());
        res.json({
            status: 'success',
            data: alerts || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch critical alerts' });
    }
});

export default router;