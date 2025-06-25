import { injectable } from 'inversify';
import supabase from '../utils/supabaseClient';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { rugPatternDetector } from './RugPatternDetector';
import { poolMonitoringService } from './PoolMonitoringService';
import { ruggedTokenDetector } from './RuggedTokenDetector';
import { mlRiskIntegrationService } from './MLRiskIntegrationService';
import config from '../config';
import { cacheKeys, CACHE_TTL, setCached, getCached } from '../utils/upstashClient';

interface MonitoringStats {
    token_mint: string;
    wallet_address: string;
    active_monitors: number;
    websocket_connected: boolean;
    last_check_at: Date;
    current_liquidity: number;
    liquidity_change_1m: number;
    liquidity_change_5m: number;
    liquidity_change_30m: number;
    price_change_1m: number;
    price_change_5m: number;
    volume_spike: boolean;
    flash_rug_alert: boolean;
    rapid_drain_alert: boolean;
    slow_bleed_alert: boolean;
    active_patterns: any[];
    highest_risk_pattern: string | null;
    pattern_confidence: number;
    estimated_time_to_rug: number | null;
    // ML fields
    ml_probability?: number;
    ml_confidence?: number;
    ml_risk_level?: string;
    ml_time_to_rug?: number | null;
    ml_top_factors?: string[];
    ml_model_version?: string;
    hybrid_risk_score?: number;
}

@injectable()
export class MonitoringStatsService {
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly UPDATE_FREQUENCY = config.monitoringStatsInterval || 30000; // 30 seconds

    constructor() {
        console.log('[MonitoringStatsService] Initialized');
    }

    /**
     * Start the monitoring stats service
     */
    public start(): void {
        console.log('[MonitoringStatsService] Starting monitoring stats updates...');
        
        // Initial update
        this.updateAllMonitoringStats();
        
        // Schedule regular updates
        this.updateInterval = setInterval(() => {
            this.updateAllMonitoringStats().catch(error => {
                console.error('[MonitoringStatsService] Update error:', error);
            });
        }, this.UPDATE_FREQUENCY);
    }

    /**
     * Stop the monitoring stats service
     */
    public stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('[MonitoringStatsService] Stopped');
    }

    /**
     * Update monitoring stats for all protected tokens
     */
    private async updateAllMonitoringStats(): Promise<void> {
        try {
            // Get all active protections
            const { data: protectedTokens } = await supabase
                .from('protected_tokens')
                .select('token_mint, wallet_address')
                .eq('is_active', true)
                .eq('mempool_monitoring', true)
                .neq('status', 'RUGGED');

            if (!protectedTokens || protectedTokens.length === 0) {
                return;
            }

            console.log(`[MonitoringStatsService] Updating stats for ${protectedTokens.length} protected tokens`);

            // Process in batches
            const batchSize = 10;
            for (let i = 0; i < protectedTokens.length; i += batchSize) {
                const batch = protectedTokens.slice(i, i + batchSize);
                await Promise.all(batch.map(token => 
                    this.updateTokenMonitoringStats(token.token_mint, token.wallet_address)
                ));
            }
        } catch (error) {
            console.error('[MonitoringStatsService] Error updating all stats:', error);
        }
    }

    /**
     * Update monitoring stats for a specific token
     */
    public async updateTokenMonitoringStats(tokenMint: string, walletAddress: string): Promise<void> {
        try {
            // First check if token is rugged
            const isRugged = await ruggedTokenDetector.checkIfRugged(tokenMint);
            if (isRugged) {
                console.log(`[MonitoringStatsService] Skipping rugged token: ${tokenMint}`);
                return; // Don't update stats for rugged tokens
            }

            // Get velocity data (now async with Redis caching)
            const velocityData = await liquidityVelocityTracker.getVelocityData(tokenMint);
            
            // Get pattern analysis
            const patternAnalysis = rugPatternDetector.getAnalysis(tokenMint);
            
            // Get active monitor count (simplified - in production would check actual WebSocket connections)
            const activeMonitors = poolMonitoringService.getActiveMonitorCount(tokenMint);
            
            // Get ML risk data
            const mlData = await mlRiskIntegrationService.getMlRiskData(tokenMint);
            
            // Calculate rule-based risk from patterns
            const ruleBasedRisk = patternAnalysis?.overallRisk || 0;
            
            // Build monitoring stats
            const stats: MonitoringStats = {
                token_mint: tokenMint,
                wallet_address: walletAddress,
                active_monitors: activeMonitors || 1,
                websocket_connected: activeMonitors > 0,
                last_check_at: new Date(),
                current_liquidity: velocityData?.current?.liquidityUSD || 0,
                liquidity_change_1m: velocityData?.velocities?.liquidity1m || 0,
                liquidity_change_5m: velocityData?.velocities?.liquidity5m || 0,
                liquidity_change_30m: velocityData?.velocities?.liquidity30m || 0,
                price_change_1m: velocityData?.velocities?.price1m || 0,
                price_change_5m: velocityData?.velocities?.price5m || 0,
                volume_spike: velocityData?.alerts?.volumeSpike || false,
                flash_rug_alert: velocityData?.alerts?.flashRug || false,
                rapid_drain_alert: velocityData?.alerts?.rapidDrain || false,
                slow_bleed_alert: velocityData?.alerts?.slowBleed || false,
                active_patterns: patternAnalysis?.patterns || [],
                highest_risk_pattern: this.getHighestRiskPattern(patternAnalysis),
                pattern_confidence: this.getHighestConfidence(patternAnalysis),
                estimated_time_to_rug: this.getShortestTimeToRug(patternAnalysis),
                // ML fields
                ml_probability: mlData?.rugProbability,
                ml_confidence: mlData?.confidence,
                ml_risk_level: mlData?.riskLevel,
                ml_time_to_rug: mlData?.timeToRug,
                ml_top_factors: mlData?.topRiskFactors,
                ml_model_version: mlData?.modelVersion,
                hybrid_risk_score: mlData ? mlRiskIntegrationService.calculateHybridRisk(ruleBasedRisk, mlData.rugProbability) : ruleBasedRisk
            };

            // Upsert to database
            await supabase
                .from('monitoring_stats')
                .upsert({
                    ...stats,
                    updated_at: new Date()
                }, {
                    onConflict: 'token_mint,wallet_address'
                });
            
            // Cache in Redis for fast access
            await setCached(
                cacheKeys.monitoringStats(tokenMint, walletAddress), 
                stats, 
                CACHE_TTL.MONITORING_STATS
            );

            // Log critical alerts
            if (stats.flash_rug_alert || stats.rapid_drain_alert) {
                console.error(`[MonitoringStatsService] CRITICAL ALERT for ${tokenMint}:`, {
                    flashRug: stats.flash_rug_alert,
                    rapidDrain: stats.rapid_drain_alert,
                    liquidity: stats.current_liquidity,
                    change5m: stats.liquidity_change_5m
                });
            }

        } catch (error) {
            console.error(`[MonitoringStatsService] Error updating stats for ${tokenMint}:`, error);
        }
    }

    /**
     * Get the highest risk pattern type
     */
    private getHighestRiskPattern(analysis: any): string | null {
        if (!analysis?.patterns || analysis.patterns.length === 0) return null;
        
        // Sort by severity and confidence
        const sorted = [...analysis.patterns].sort((a: any, b: any) => {
            const severityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
            const aScore = (severityScore[a.severity] || 0) * a.confidence;
            const bScore = (severityScore[b.severity] || 0) * b.confidence;
            return bScore - aScore;
        });
        
        return sorted[0].type;
    }

    /**
     * Get highest confidence from patterns
     */
    private getHighestConfidence(analysis: any): number {
        if (!analysis?.patterns || analysis.patterns.length === 0) return 0;
        return Math.max(...analysis.patterns.map((p: any) => p.confidence));
    }

    /**
     * Get shortest estimated time to rug
     */
    private getShortestTimeToRug(analysis: any): number | null {
        if (!analysis?.patterns || analysis.patterns.length === 0) return null;
        
        const times = analysis.patterns
            .map((p: any) => p.estimatedTimeToRug)
            .filter((t: any) => t !== null && t !== undefined);
            
        return times.length > 0 ? Math.min(...times) : null;
    }

    /**
     * Force update for a specific token (called when protection is enabled)
     */
    public async forceUpdate(tokenMint: string, walletAddress: string): Promise<void> {
        console.log(`[MonitoringStatsService] Force updating stats for ${tokenMint}`);
        
        // Ensure token is being tracked
        await liquidityVelocityTracker.trackToken(tokenMint);
        
        // Wait a moment for initial data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update stats
        await this.updateTokenMonitoringStats(tokenMint, walletAddress);
    }
}

// Export singleton
export const monitoringStatsService = new MonitoringStatsService();