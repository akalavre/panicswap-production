/**
 * ML Risk Display Service
 * Provides ML-based risk analysis for tokens via Supabase real-time subscriptions
 * Subscribes to ml_predictions_changes channel and updates RiskStore
 */

(function() {
    'use strict';
    
    /**
     * Calculate risk level from probability - identical to backend calculateRiskLevel
     * @param {number} probability - Risk probability (0-1)
     * @returns {string} Risk level
     */
    function calcLevel(probability) {
        if (probability >= 0.8) return 'CRITICAL';
        if (probability >= 0.6) return 'HIGH';
        if (probability >= 0.4) return 'MODERATE';
        if (probability >= 0.2) return 'LOW';
        return 'MINIMAL';
    }
    
    /**
     * ML Risk Display Service
     */
    const MLRiskDisplayService = {
        channel: null,
        isSubscribed: false,
        
        /**
         * Initialize the ML Risk Display service
         */
        init: function() {
            // Wait for Supabase client to be ready
            this.waitForSupabase();
        },
        
        /**
         * Wait for Supabase client to be available
         */
        waitForSupabase: function() {
            const checkSupabase = () => {
                if (window.supabaseClient) {
                    console.log('[MLRiskDisplay] Supabase client found, initializing subscription');
                    this.initializeSubscription();
                } else {
                    console.log('[MLRiskDisplay] Waiting for Supabase client...');
                    setTimeout(checkSupabase, 1000);
                }
            };
            checkSupabase();
        },
        
        /**
         * Initialize real-time subscription to ML predictions
         */
        initializeSubscription: function() {
            try {
                console.log('[MLRiskDisplay] Setting up ML predictions subscription');
                
                // Create channel for ML predictions changes
                this.channel = window.supabaseClient
                    .channel('ml_predictions_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'ml_predictions'
                    }, (payload) => {
                        this.handleMLUpdate(payload);
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            this.isSubscribed = true;
                            console.log('[MLRiskDisplay] Successfully subscribed to ML predictions changes');
                        } else if (status === 'CHANNEL_ERROR') {
                            console.error('[MLRiskDisplay] Channel subscription error');
                        } else if (status === 'TIMED_OUT') {
                            console.error('[MLRiskDisplay] Channel subscription timed out');
                        }
                    });
                    
            } catch (error) {
                console.error('[MLRiskDisplay] Error setting up subscription:', error);
            }
        },
        
        /**
         * Handle ML prediction update from Supabase
         * @param {Object} payload - Supabase change payload
         */
        handleMLUpdate: function(payload) {
            try {
                console.log('[MLRiskDisplay] ML prediction update received:', payload);
                
                const prediction = payload.new || payload.record;
                if (!prediction || !prediction.token_mint || typeof prediction.probability !== 'number') {
                    console.warn('[MLRiskDisplay] Invalid prediction data:', prediction);
                    return;
                }
                
                const tokenMint = prediction.token_mint;
                const probability = Number(prediction.probability) || 0;
                
                // Calculate risk level using same logic as backend
                const riskLevel = calcLevel(probability);
                const riskScore = probability * 100;
                
                // Prepare ML data for RiskStore
                const mlData = {
                    risk_level: riskLevel,
                    risk_score: riskScore,
                    mlData: {
                        probability: probability,
                        confidence: Number(prediction.confidence) || 0,
                        timeToRug: prediction.time_to_rug,
                        riskFactors: prediction.risk_factors || [],
                        modelVersion: prediction.model_version,
                        features: prediction.features,
                        timestamp: prediction.created_at || new Date().toISOString(),
                        source: 'ml_realtime'
                    }
                };
                
                // Update UnifiedBadgeService
                if (window.UnifiedBadgeService) {
                    // Determine badge state based on ML risk level
                    let badgeState = null;
                    if (riskLevel === 'CRITICAL' && probability >= 0.85) badgeState = 'SELL_NOW';
                    else if (riskLevel === 'CRITICAL') badgeState = 'SELL';
                    else if (riskLevel === 'HIGH') badgeState = 'VOLATILE';
                    
                    window.UnifiedBadgeService.updateToken(tokenMint, {
                        badgeState: badgeState,
                        metadata: {
                            mlAnalysis: {
                                rugProbability: probability,
                                riskLevel: riskLevel,
                                confidence: mlData.mlData.confidence,
                                timeToRug: mlData.mlData.timeToRug,
                                topRiskFactors: mlData.mlData.riskFactors,
                                modelVersion: mlData.mlData.modelVersion,
                                lastUpdated: mlData.mlData.timestamp
                            }
                        }
                    });
                    
                    console.log(`[MLRiskDisplay] Updated UnifiedBadgeService for ${tokenMint}:`, {
                        riskLevel: riskLevel,
                        riskScore: riskScore,
                        probability: probability,
                        badgeState: badgeState
                    });
                } else {
                    console.error('[MLRiskDisplay] UnifiedBadgeService not available');
                }
                
            } catch (error) {
                console.error('[MLRiskDisplay] Error handling ML update:', error);
            }
        },
        
        /**
         * Load ML Risk data for visible tokens
         * This is called from token-list-v3.php line 1151
         */
        loadMLRiskForVisibleTokens: function() {
            console.log('[MLRiskDisplay] loadMLRiskForVisibleTokens called - using real-time subscription');
            
            // If not subscribed yet, try to initialize
            if (!this.isSubscribed) {
                this.init();
            }
            
            return Promise.resolve();
        },
        
        /**
         * Get ML risk for a specific token
         * @param {string} tokenMint - Token mint address
         * @returns {Object} ML risk data
         */
        getTokenMLRisk: function(tokenMint) {
            console.log('[MLRiskDisplay] getTokenMLRisk called for:', tokenMint);
            
            // Check if we have data in UnifiedBadgeService
            if (window.UnifiedBadgeService) {
                const tokenData = window.UnifiedBadgeService.getToken(tokenMint);
                if (tokenData && tokenData.metadata && tokenData.metadata.mlAnalysis) {
                    const mlData = tokenData.metadata.mlAnalysis;
                    return {
                        riskLevel: mlData.riskLevel,
                        riskScore: (mlData.rugProbability || 0) * 100,
                        confidence: mlData.confidence || 0,
                        factors: mlData.topRiskFactors || []
                    };
                }
            }
            
            // Return default if no data available
            return {
                riskLevel: 'UNKNOWN',
                riskScore: 0,
                confidence: 0,
                factors: []
            };
        },
        
        /**
         * Update ML risk for specific token (legacy method)
         * @param {string} tokenMint - Token mint address
         * @param {Object} riskData - Risk data
         */
        updateTokenMLRisk: function(tokenMint, riskData) {
            console.log('[MLRiskDisplay] updateTokenMLRisk called:', { tokenMint, riskData });
            
            // Update UnifiedBadgeService
            if (window.UnifiedBadgeService && riskData) {
                // Determine badge state based on risk level
                let badgeState = null;
                const riskLevel = riskData.riskLevel?.toUpperCase();
                const riskScore = riskData.riskScore || 0;
                
                if (riskLevel === 'CRITICAL' && riskScore >= 85) badgeState = 'SELL_NOW';
                else if (riskLevel === 'CRITICAL') badgeState = 'SELL';
                else if (riskLevel === 'HIGH') badgeState = 'VOLATILE';
                
                window.UnifiedBadgeService.updateToken(tokenMint, {
                    badgeState: badgeState,
                    metadata: {
                        mlAnalysis: {
                            rugProbability: (riskScore || 0) / 100,
                            riskLevel: riskLevel,
                            confidence: riskData.confidence || 0,
                            topRiskFactors: riskData.factors || [],
                            modelVersion: riskData.model || 'unknown',
                            lastUpdated: new Date().toISOString()
                        }
                    }
                });
            }
        },
        
        /**
         * Cleanup subscription
         */
        cleanup: function() {
            if (this.channel) {
                console.log('[MLRiskDisplay] Cleaning up subscription');
                this.channel.unsubscribe();
                this.channel = null;
                this.isSubscribed = false;
            }
        }
    };
    
    // Expose the service globally
    window.mlRiskDisplay = MLRiskDisplayService;
    
    // Initialize the service
    MLRiskDisplayService.init();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        MLRiskDisplayService.cleanup();
    });
    
    console.log('[MLRiskDisplay] Service initialized with real-time ML predictions subscription');
    
})();
