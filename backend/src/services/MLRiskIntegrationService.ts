import { injectable } from 'inversify';
import supabase from '../utils/supabaseClient';
import { EventEmitter } from 'events';
import config from '../config';

interface MLPrediction {
    token_mint: string;
    probability: number;
    confidence: number;
    time_to_rug: number | null;
    risk_factors: string[];
    model_version: string;
    features: any;
    created_at: string;
}

interface MLRiskData {
    rugProbability: number;
    confidence: number;
    timeToRug: number | null;
    riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    topRiskFactors: string[];
    modelVersion: string;
    lastUpdated: string;
}

@injectable()
export class MLRiskIntegrationService extends EventEmitter {
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly UPDATE_FREQUENCY = 45000; // 45 seconds
    private mlPredictionCache = new Map<string, MLRiskData>();

    constructor() {
        super();
        console.log('[MLRiskIntegrationService] Initialized');
        this.initializeRealtimeSubscription();
    }

    /**
     * Initialize real-time subscription to ML predictions
     */
    private async initializeRealtimeSubscription(): Promise<void> {
        try {
            // Subscribe to ml_predictions table changes
            const subscription = supabase
                .channel('ml_predictions_changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'ml_predictions' 
                    },
                    (payload) => {
                        console.log('[MLRiskIntegrationService] ML prediction update:', payload);
                        if (payload.new && typeof payload.new === 'object') {
                            const prediction = payload.new as MLPrediction;
                            this.processMlUpdate(prediction);
                        }
                    }
                )
                .subscribe();

            console.log('[MLRiskIntegrationService] Subscribed to ML predictions real-time updates');
        } catch (error) {
            console.error('[MLRiskIntegrationService] Error setting up real-time subscription:', error);
        }
    }

    /**
     * Start the ML risk integration service
     */
    public start(): void {
        console.log('[MLRiskIntegrationService] Starting ML risk integration...');
        
        // Initial fetch of all ML predictions
        this.fetchAllMlPredictions();
        
        // Schedule regular updates
        this.updateInterval = setInterval(() => {
            this.fetchAllMlPredictions().catch(error => {
                console.error('[MLRiskIntegrationService] Update error:', error);
            });
        }, this.UPDATE_FREQUENCY);
    }

    /**
     * Stop the ML risk integration service
     */
    public stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('[MLRiskIntegrationService] Stopped');
    }

    /**
     * Fetch all recent ML predictions
     */
    private async fetchAllMlPredictions(): Promise<void> {
        try {
            // Get ML predictions from last 2 hours (to ensure we have data)
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            
            const { data: predictions, error } = await supabase
                .from('ml_predictions')
                .select('*')
                .gte('created_at', twoHoursAgo)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[MLRiskIntegrationService] Error fetching ML predictions:', error);
                return;
            }

            if (!predictions || predictions.length === 0) {
                console.log('[MLRiskIntegrationService] No ML predictions found');
                return;
            }

            console.log(`[MLRiskIntegrationService] Processing ${predictions.length} ML predictions`);

            // Group by token and keep only the latest prediction per token
            const latestPredictions = new Map<string, MLPrediction>();
            
            predictions.forEach(prediction => {
                const existing = latestPredictions.get(prediction.token_mint);
                if (!existing || new Date(prediction.created_at) > new Date(existing.created_at)) {
                    latestPredictions.set(prediction.token_mint, prediction);
                }
            });

            // Process each latest prediction
            for (const prediction of latestPredictions.values()) {
                await this.processMlUpdate(prediction);
            }
        } catch (error) {
            console.error('[MLRiskIntegrationService] Error in fetchAllMlPredictions:', error);
        }
    }

    /**
     * Process an ML prediction update
     */
    private async processMlUpdate(prediction: MLPrediction): Promise<void> {
        try {
            // Convert to API format
            const mlRiskData: MLRiskData = {
                rugProbability: Number(prediction.probability) || 0,
                confidence: Number(prediction.confidence) || 0,
                timeToRug: prediction.time_to_rug,
                riskLevel: this.calculateRiskLevel(Number(prediction.probability)),
                topRiskFactors: this.extractTopRiskFactors(prediction),
                modelVersion: prediction.model_version,
                lastUpdated: prediction.created_at
            };

            // Update local cache only
            this.mlPredictionCache.set(prediction.token_mint, mlRiskData);

            // Emit update event
            this.emit('ml-update', {
                tokenMint: prediction.token_mint,
                mlData: mlRiskData
            });

            // Log high-risk predictions
            if (mlRiskData.rugProbability >= 0.8) {
                console.error(`[MLRiskIntegrationService] HIGH RISK ML PREDICTION: ${prediction.token_mint}`, {
                    probability: mlRiskData.rugProbability,
                    confidence: mlRiskData.confidence,
                    timeToRug: mlRiskData.timeToRug
                });
            }

        } catch (error) {
            console.error(`[MLRiskIntegrationService] Error processing ML update for ${prediction.token_mint}:`, error);
        }
    }

    /**
     * Get ML risk data for a token
     */
    public async getMlRiskData(tokenMint: string): Promise<MLRiskData | null> {
        // Check local cache first
        const cached = this.mlPredictionCache.get(tokenMint);
        if (cached) {
            return cached;
        }

        // Fetch from database
        try {
            const { data, error } = await supabase
                .from('ml_predictions')
                .select('*')
                .eq('token_mint', tokenMint)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                return null;
            }

            const mlRiskData: MLRiskData = {
                rugProbability: Number(data.probability) || 0,
                confidence: Number(data.confidence) || 0,
                timeToRug: data.time_to_rug,
                riskLevel: this.calculateRiskLevel(Number(data.probability)),
                topRiskFactors: this.extractTopRiskFactors(data),
                modelVersion: data.model_version,
                lastUpdated: data.created_at
            };

            // Cache for next time
            this.mlPredictionCache.set(tokenMint, mlRiskData);

            return mlRiskData;
        } catch (error) {
            console.error(`[MLRiskIntegrationService] Error fetching ML data for ${tokenMint}:`, error);
            return null;
        }
    }

    /**
     * Calculate risk level from probability
     */
    private calculateRiskLevel(probability: number): MLRiskData['riskLevel'] {
        if (probability >= 0.8) return 'CRITICAL';
        if (probability >= 0.6) return 'HIGH';
        if (probability >= 0.4) return 'MODERATE';
        if (probability >= 0.2) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Extract top risk factors from prediction
     */
    private extractTopRiskFactors(prediction: MLPrediction): string[] {
        const factors: string[] = [];

        // Use risk_factors array if available
        if (prediction.risk_factors && Array.isArray(prediction.risk_factors)) {
            factors.push(...prediction.risk_factors.slice(0, 5));
        }

        // Extract from features if available
        if (prediction.features && typeof prediction.features === 'object') {
            // Add critical velocity features
            if (prediction.features.liquidity_velocity_5m < -10) {
                factors.push(`liquidity_velocity_5m: ${prediction.features.liquidity_velocity_5m.toFixed(1)}%`);
            }
            if (prediction.features.price_velocity_5m < -10) {
                factors.push(`price_velocity_5m: ${prediction.features.price_velocity_5m.toFixed(1)}%`);
            }
            
            // Add pattern detections
            if (prediction.features.flash_rug_detected) {
                factors.push('flash_rug_pattern: detected');
            }
            if (prediction.features.honeypot_risk > 0.5) {
                factors.push(`honeypot_risk: ${(prediction.features.honeypot_risk * 100).toFixed(0)}%`);
            }
            
            // Add holder concentration
            if (prediction.features.holder_concentration > 0.4) {
                factors.push(`holder_concentration: ${(prediction.features.holder_concentration * 100).toFixed(0)}%`);
            }
        }

        // Ensure we have at least some factors
        if (factors.length === 0) {
            factors.push(`ML probability: ${(Number(prediction.probability) * 100).toFixed(0)}%`);
            if (Number(prediction.confidence) < 0.8) {
                factors.push(`Low confidence: ${(Number(prediction.confidence) * 100).toFixed(0)}%`);
            }
        }

        return factors.slice(0, 5); // Return top 5 factors
    }

    /**
     * Calculate hybrid risk score combining ML and rule-based
     */
    public calculateHybridRisk(ruleBasedRisk: number, mlProbability: number): number {
        // Weight ML predictions more heavily (60/40 split)
        const hybridRisk = (0.4 * ruleBasedRisk) + (0.6 * mlProbability * 100);
        return Math.min(100, Math.max(0, hybridRisk));
    }

    /**
     * Queue a token for ML analysis
     */
    public async queueTokenForAnalysis(tokenMint: string): Promise<void> {
        try {
            await supabase
                .from('ml_generation_queue')
                .insert({
                    token_mint: tokenMint,
                    priority: 1,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            
            console.log(`[MLRiskIntegrationService] Queued ${tokenMint} for ML analysis`);
        } catch (error) {
            console.error(`[MLRiskIntegrationService] Error queueing token:`, error);
        }
    }
}

// Export singleton
export const mlRiskIntegrationService = new MLRiskIntegrationService();