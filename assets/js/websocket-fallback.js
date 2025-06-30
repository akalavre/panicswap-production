/**
 * WebSocket Fallback Handler
 * Provides REST API fallback when Supabase WebSocket connections fail
 */

class WebSocketFallback {
    constructor() {
        this.pollInterval = 10000; // 10 seconds for more responsive updates
        this.isPolling = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.lastPollTime = 0;
        this.useMonitoringEndpoint = true; // Use monitoring-status.php as primary source
        
        console.log('[WebSocketFallback] Initialized with 10s polling');
    }
    
    /**
     * Map badge states to traditional risk levels
     */
    mapBadgeStateToRiskLevel(badgeState) {
        if (!badgeState) return 'Low';
        
        const mapping = {
            'RUGGED': 'Rugged',
            'SELL_NOW': 'Critical',
            'SELL': 'Critical',
            'VOLATILE': 'High',
            'PUMPING': 'Moderate',
            'WATCHING': 'Low',
            'NEW': 'Low'
        };
        
        return mapping[badgeState] || 'Low';
    }

    // Start polling for risk data when WebSocket fails
    startPolling() {
        if (this.isPolling) {
            console.log('[WebSocketFallback] Already polling');
            return;
        }

        console.log('[WebSocketFallback] Starting REST API polling fallback');
        this.isPolling = true;
        this.pollRiskData();
    }

    // Stop polling
    stopPolling() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        this.isPolling = false;
        console.log('[WebSocketFallback] Stopped polling');
    }

    // Poll risk data via REST API
    async pollRiskData() {
        if (!this.isPolling) return;

        try {
            console.log('[WebSocketFallback] Polling risk data...');
            
            // Get current tokens from the page
            const tokenElements = document.querySelectorAll('[data-token-mint]');
            const tokenMints = Array.from(tokenElements).map(el => el.dataset.tokenMint).filter(Boolean);
            
            if (tokenMints.length === 0) {
                console.log('[WebSocketFallback] No tokens found, retrying in', this.pollInterval, 'ms');
                this.scheduleNextPoll();
                return;
            }

            // Fetch risk data for all tokens
            const riskData = await this.fetchRiskData(tokenMints);
            
            if (riskData && riskData.length > 0) {
                console.log('[WebSocketFallback] Got risk data for', riskData.length, 'tokens');
                this.updateRiskStore(riskData);
                this.retryAttempts = 0; // Reset retry counter on success
            }

            this.lastPollTime = Date.now();
            this.scheduleNextPoll();

        } catch (error) {
            console.error('[WebSocketFallback] Error polling risk data:', error);
            this.retryAttempts++;
            
            if (this.retryAttempts >= this.maxRetries) {
                console.warn('[WebSocketFallback] Max retries reached, stopping polling');
                this.stopPolling();
                return;
            }
            
            // Exponential backoff
            const backoffTime = Math.min(this.pollInterval * Math.pow(2, this.retryAttempts), 120000);
            console.log('[WebSocketFallback] Retrying in', backoffTime, 'ms');
            
            this.pollTimer = setTimeout(() => this.pollRiskData(), backoffTime);
        }
    }

    // Schedule next poll
    scheduleNextPoll() {
        if (!this.isPolling) return;
        
        this.pollTimer = setTimeout(() => this.pollRiskData(), this.pollInterval);
    }

    // Fetch risk data from REST API
    async fetchRiskData(tokenMints) {
        // Try monitoring-status endpoint first for better real-time data
        if (this.useMonitoringEndpoint) {
            try {
                const walletAddress = localStorage.getItem('walletAddress');
                if (!walletAddress) {
                    throw new Error('No wallet address');
                }
                
                // Fetch monitoring data for each token in parallel
                const fetchPromises = tokenMints.map(async (tokenMint) => {
                    try {
                        const response = await fetch(`api/monitoring-status.php/${tokenMint}?wallet=${walletAddress}`);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        
                        const data = await response.json();
                        return {
                            token_mint: tokenMint,
                            ml_risk: data.mlAnalysis ? {
                                risk_level: data.mlAnalysis.riskLevel,
                                risk_score: data.mlAnalysis.rugProbability * 100,
                                confidence: data.mlAnalysis.confidence,
                                model_version: data.mlAnalysis.modelVersion,
                                updated_at: data.mlAnalysis.lastUpdated
                            } : null,
                            monitoring_risk: {
                                risk_level: this.mapBadgeStateToRiskLevel(data.badgeState),
                                monitoring_active: data.monitoring.active,
                                liquidity_change_5m: data.liquidity.change5m,
                                price_change_5m: data.price.change5m
                            },
                            token_data: {
                                monitoring_active: data.monitoring.active,
                                badge_state: data.badgeState
                            }
                        };
                    } catch (error) {
                        console.warn(`[WebSocketFallback] Failed to fetch monitoring data for ${tokenMint}:`, error);
                        return null;
                    }
                });
                
                const results = await Promise.all(fetchPromises);
                return results.filter(r => r !== null);
                
            } catch (error) {
                console.warn('[WebSocketFallback] Monitoring endpoint failed, falling back to batch API:', error);
                this.useMonitoringEndpoint = false;
            }
        }
        
        // Fallback to batch risk assessment API
        const response = await fetch('api/risk-assessment/batch.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokens: tokenMints,
                include_ml: true,
                include_monitoring: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    // Update RiskStore with fetched data
    updateRiskStore(riskData) {
        // Update UnifiedBadgeService first (primary system)
        if (window.UnifiedBadgeService) {
            riskData.forEach(tokenRisk => {
                if (!tokenRisk.token_mint) return;
                
                // For monitoring-status.php response format
                if (tokenRisk.badgeState || tokenRisk.monitoring || tokenRisk.liquidity) {
                    const unifiedData = {
                        badgeState: tokenRisk.badgeState,
                        sellSignal: tokenRisk.sellSignal,
                        liquidity: tokenRisk.liquidity,
                        status: tokenRisk.badgeState === 'RUGGED' ? 'RUGGED' : tokenRisk.status,
                        velocities: {
                            price5m: tokenRisk.price?.change5m || 0,
                            price1m: tokenRisk.price?.change1m || 0
                        },
                        price: tokenRisk.price,
                        monitoring: tokenRisk.monitoring,
                        protectionEnabled: tokenRisk.monitoring?.active || false,
                        metadata: {
                            alerts: tokenRisk.alerts,
                            patterns: tokenRisk.patterns,
                            marketData: tokenRisk.marketData,
                            mlAnalysis: tokenRisk.mlAnalysis
                        }
                    };
                    
                    window.UnifiedBadgeService.updateToken(tokenRisk.tokenMint || tokenRisk.token_mint, unifiedData);
                }
                // For batch risk assessment API format
                else if (tokenRisk.ml_risk || tokenRisk.monitoring_risk || tokenRisk.token_data) {
                    const unifiedData = {
                        // Try to determine badge state from risk data
                        badgeState: this.determineBadgeStateFromRisk(tokenRisk),
                        
                        // Extract available data
                        liquidity: {
                            current: tokenRisk.token_data?.liquidity_usd || 0
                        },
                        
                        monitoring: {
                            active: tokenRisk.token_data?.monitoring_active || 
                                   (tokenRisk.monitoring_risk ? true : false)
                        },
                        
                        metadata: {
                            mlRisk: tokenRisk.ml_risk,
                            monitoringRisk: tokenRisk.monitoring_risk,
                            tokenData: tokenRisk.token_data
                        }
                    };
                    
                    window.UnifiedBadgeService.updateToken(tokenRisk.token_mint, unifiedData);
                }
            });
        }

        // Update RiskStore for backward compatibility
        if (!window.RiskStore) {
            console.warn('[WebSocketFallback] RiskStore not available');
            return;
        }

        riskData.forEach(tokenRisk => {
            if (!tokenRisk.token_mint && !tokenRisk.tokenMint) return;
            const tokenMint = tokenRisk.token_mint || tokenRisk.tokenMint;

            // For monitoring-status.php response format
            if (tokenRisk.badgeState) {
                const riskLevel = this.mapBadgeStateToRiskLevel(tokenRisk.badgeState);
                const riskScore = this.mapBadgeStateToRiskScore(tokenRisk.badgeState);
                
                window.RiskStore.setSource(tokenMint, 'monitoring', {
                    riskLevel: riskLevel,
                    riskScore: riskScore,
                    rugged: tokenRisk.badgeState === 'RUGGED',
                    monitoring: tokenRisk.monitoring?.active || false,
                    metadata: {
                        badgeState: tokenRisk.badgeState,
                        source: 'REST_FALLBACK'
                    }
                });
            }
            // For batch API format
            else {
                // Update ML risk if available
                if (tokenRisk.ml_risk) {
                    window.RiskStore.setSource(tokenMint, 'ml', {
                        riskLevel: tokenRisk.ml_risk.risk_level,
                        riskScore: tokenRisk.ml_risk.risk_score,
                        rugged: false,
                        monitoring: tokenRisk.token_data?.monitoring_active || false,
                        metadata: {
                            confidence: tokenRisk.ml_risk.confidence,
                            model_version: tokenRisk.ml_risk.model_version,
                            timestamp: tokenRisk.ml_risk.updated_at,
                            source: 'REST_FALLBACK'
                        }
                    });
                }

                // Update monitoring risk if available
                if (tokenRisk.monitoring_risk) {
                    window.RiskStore.setSource(tokenMint, 'monitoring', {
                        riskLevel: tokenRisk.monitoring_risk.risk_level,
                        riskScore: tokenRisk.monitoring_risk.risk_score,
                        rugged: false,
                        monitoring: tokenRisk.token_data?.monitoring_active || true,
                        metadata: {
                            alerts: tokenRisk.monitoring_risk.active_alerts,
                            last_check: tokenRisk.monitoring_risk.last_check,
                            timestamp: tokenRisk.monitoring_risk.updated_at,
                            source: 'REST_FALLBACK'
                        }
                    });
                }

                // Update token data if available
                if (tokenRisk.token_data) {
                    window.RiskStore.setSource(tokenMint, 'token', {
                        riskLevel: tokenRisk.token_data.risk_level || null,
                        riskScore: tokenRisk.token_data.risk_score || null,
                        rugged: tokenRisk.token_data.status === 'RUGGED',
                        monitoring: tokenRisk.token_data.monitoring_active || false,
                        metadata: {
                            honeypot_status: tokenRisk.token_data.honeypot_status,
                            lp_locked_pct: tokenRisk.token_data.lp_locked_pct,
                            holder_count: tokenRisk.token_data.holder_count,
                            timestamp: tokenRisk.token_data.updated_at,
                            source: 'REST_FALLBACK'
                        }
                });
                }
            }
        });

        console.log('[WebSocketFallback] Updated RiskStore for', riskData.length, 'tokens');
    }

    // Check if polling is needed
    shouldStartPolling() {
        // Start polling if we detect WebSocket errors
        const hasWebSocketErrors = this.detectWebSocketErrors();
        const hasStaleData = this.hasStaleRiskData();
        
        return hasWebSocketErrors || hasStaleData;
    }

    // Detect WebSocket connection errors in console
    detectWebSocketErrors() {
        // Check if we've seen WebSocket errors recently
        // This is a simple heuristic - in practice you might want to listen for specific events
        return document.querySelector('.ml-risk-badge') && !this.lastSuccessfulWebSocketTime;
    }

    // Check if risk data is stale
    hasStaleRiskData() {
        const staleCutoff = Date.now() - (5 * 60 * 1000); // 5 minutes
        return this.lastPollTime < staleCutoff;
    }

    /**
     * Determine badge state from risk data (batch API format)
     */
    determineBadgeStateFromRisk(tokenRisk) {
        // Check if token is rugged
        if (tokenRisk.token_data?.status === 'RUGGED') {
            return 'RUGGED';
        }
        
        // Check liquidity
        const liquidity = tokenRisk.token_data?.liquidity_usd || 0;
        if (liquidity < 100) {
            return 'RUGGED';
        }
        
        // Check ML risk score
        if (tokenRisk.ml_risk?.risk_score) {
            const score = tokenRisk.ml_risk.risk_score;
            if (score >= 80) return 'SELL_NOW';
            if (score >= 60) return 'SELL';
            if (score >= 40) return 'VOLATILE';
        }
        
        // Check monitoring risk
        if (tokenRisk.monitoring_risk?.risk_level) {
            const level = tokenRisk.monitoring_risk.risk_level.toUpperCase();
            if (level === 'CRITICAL') return 'SELL';
            if (level === 'HIGH') return 'VOLATILE';
            if (level === 'MODERATE') return 'PUMPING';
        }
        
        // Check if monitoring is active
        if (tokenRisk.token_data?.monitoring_active || tokenRisk.monitoring_risk) {
            return 'WATCHING';
        }
        
        // Default to NEW for tokens without much data
        return 'NEW';
    }

    /**
     * Map badge state to risk score (0-100)
     */
    mapBadgeStateToRiskScore(badgeState) {
        if (!badgeState) return 0;
        
        const scoreMap = {
            'RUGGED': 100,
            'SELL_NOW': 90,
            'SELL': 80,
            'VOLATILE': 60,
            'PUMPING': 40,
            'WATCHING': 20,
            'NEW': 10
        };
        
        return scoreMap[badgeState] || 0;
    }
}

// Global instance
window.webSocketFallback = new WebSocketFallback();

// Auto-start polling when WebSocket fails
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for WebSocket to try connecting
    setTimeout(() => {
        if (window.webSocketFallback.shouldStartPolling()) {
            console.log('[WebSocketFallback] WebSocket issues detected, starting fallback polling');
            window.webSocketFallback.startPolling();
        }
    }, 5000);
});

// Listen for Supabase connection errors
if (window.supabase && window.supabase.realtime) {
    const realtime = window.supabase.realtime;
    
    // Check if the realtime client has event handlers
    if (realtime.onOpen && typeof realtime.onOpen === 'function') {
        realtime.onOpen(() => {
            console.log('[WebSocketFallback] Supabase WebSocket connected, stopping fallback polling');
            window.webSocketFallback.stopPolling();
        });
    }

    if (realtime.onClose && typeof realtime.onClose === 'function') {
        realtime.onClose(() => {
            console.log('[WebSocketFallback] Supabase WebSocket disconnected, starting fallback polling');
            window.webSocketFallback.startPolling();
        });
    }

    if (realtime.onError && typeof realtime.onError === 'function') {
        realtime.onError((error) => {
            console.error('[WebSocketFallback] Supabase WebSocket error:', error);
            window.webSocketFallback.startPolling();
        });
    }
}

console.log('[WebSocketFallback] Module loaded');
