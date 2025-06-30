/**
 * TokenDataManager - Unified service for fetching and managing token data
 * Replaces SupabaseTokenFetcher and UnifiedTokenDataService
 * Uses live batch endpoint (batch-simple.php) for efficient token data retrieval
 */

// Prevent re-declaration if already loaded
if (typeof TokenDataManager === 'undefined') {

class TokenDataManager {
    constructor() {
        // Request deduplication
        this.activeRequests = new Map();
        
        // Debounce timers
        this.debounceTimers = new Map();
        
        // Request queue for batching
        this.batchQueue = [];
        this.batchTimer = null;
        this.batchDelay = 50; // 50ms to collect requests for batching
        
        // WebSocket connection for real-time updates
        this.websocket = null;
        this.websocketReconnectTimer = null;
        this.websocketReconnectDelay = 1000;
        
        // Event listeners
        this.listeners = new Map();
    }
    
    /**
     * Fetch data for a single token
     */
    async getTokenData(tokenMint, walletAddress) {
        if (!tokenMint || !walletAddress) {
            console.error('[TokenDataManager] Missing required parameters');
            return null;
        }
        
        // Check for active request
        const requestKey = `${tokenMint}-${walletAddress}`;
        if (this.activeRequests.has(requestKey)) {
            return this.activeRequests.get(requestKey);
        }
        
        // Create request promise
        const requestPromise = this._fetchSingleToken(tokenMint, walletAddress);
        this.activeRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.activeRequests.delete(requestKey);
        }
    }
    
    /**
     * Fetch data for multiple tokens (batched)
     */
    async getMultipleTokensData(tokenMints, walletAddress) {
        if (!tokenMints?.length || !walletAddress) {
            return [];
        }
        
        // For small batches, fetch individually
        if (tokenMints.length <= 3) {
            const promises = tokenMints.map(mint => this.getTokenData(mint, walletAddress));
            const results = await Promise.all(promises);
            return results.filter(data => data !== null);
        }
        
        // For larger batches, use batch endpoint
        return this._fetchBatchTokens(tokenMints, walletAddress);
    }
    
    /**
     * Fetch tokens for dashboard (from Supabase)
     */
    async fetchDashboardTokens(walletAddress) {
        if (!walletAddress) {
            console.log('[TokenDataManager] No wallet connected');
            return [];
        }
        
        try {
            // Get user's tokens from Supabase
            const { data: walletTokens, error } = await supabaseClient
                .from('wallet_tokens')
                .select('token_mint, balance, decimals, is_test_token, added_at')
                .eq('wallet_address', walletAddress);
                
            if (error) {
                console.error('[TokenDataManager] Error fetching wallet tokens:', error);
                return [];
            }
            
            if (!walletTokens?.length) {
                console.log('[TokenDataManager] No tokens found for wallet');
                return [];
            }
            
            // Get token mints
            const tokenMints = walletTokens.map(wt => wt.token_mint);
            
            // Fetch comprehensive data for all tokens
            const tokenDataArray = await this.getMultipleTokensData(tokenMints, walletAddress);
            
            // Create map for easy lookup using the correct field name
            const tokenDataMap = new Map(tokenDataArray.map(data => [data.token_mint, data]));
            
            // Since mapper already supplies consistent fields, rely on mapper and only merge essential Supabase data
            const mergedData = [];
            for (const walletToken of walletTokens) {
                const apiData = tokenDataMap.get(walletToken.token_mint);
                if (!apiData) {
                    // Skip tokens without API data - we only want real production data
                    console.log(`[TokenDataManager] Skipping token ${walletToken.token_mint} - no API data found`);
                    continue;
                }
                
                // Minimal merge - mapper provides most fields, only override essential Supabase data
                mergedData.push({
                    ...apiData,
                    balance: walletToken.balance, // Use latest balance from Supabase
                    isTestToken: walletToken.is_test_token // Use test token flag from Supabase
                });
            }
            
            // Sort by value descending
            mergedData.sort((a, b) => (b.value || 0) - (a.value || 0));
            
            return mergedData;
            
        } catch (error) {
            console.error('[TokenDataManager] Error in fetchDashboardTokens:', error);
            return [];
        }
    }
    
    /**
     * Subscribe to real-time updates for a token
     */
    subscribeToToken(tokenMint, callback) {
        if (!tokenMint || !callback) return () => {};
        
        const listeners = this.listeners.get(tokenMint) || new Set();
        listeners.add(callback);
        this.listeners.set(tokenMint, listeners);
        
        // Start WebSocket if not connected
        if (!this.websocket) {
            this._connectWebSocket();
        }
        
        // Send subscription message
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'subscribe',
                tokenMint: tokenMint
            }));
        }
        
        // Return unsubscribe function
        return () => {
            const tokenListeners = this.listeners.get(tokenMint);
            if (tokenListeners) {
                tokenListeners.delete(callback);
                if (tokenListeners.size === 0) {
                    this.listeners.delete(tokenMint);
                    // Unsubscribe from token
                    if (this.websocket?.readyState === WebSocket.OPEN) {
                        this.websocket.send(JSON.stringify({
                            type: 'unsubscribe',
                            tokenMint: tokenMint
                        }));
                    }
                }
            }
        };
    }
    
    /**
     * Private: Fetch single token data
     */
    async _fetchSingleToken(tokenMint, walletAddress) {
        try {
            const url = `api/v2/tokens/${tokenMint}?wallet=${walletAddress}`;
            console.log('[TokenDataManager] Fetching:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': walletAddress
                }
            });
            
            if (!response.ok) {
                console.error('[TokenDataManager] API error:', response.status);
                // Fallback to old API
                if (window.UnifiedTokenDataService) {
                    console.log('[TokenDataManager] Falling back to UnifiedTokenDataService');
                    return await window.UnifiedTokenDataService.getTokenData(tokenMint, { wallet: walletAddress });
                }
                return null;
            }
            
            const data = await response.json();
            // After const data = await response.json(); run return this._mapApiToken(data);
            return this._mapApiToken(data);
            
        } catch (error) {
            console.error('[TokenDataManager] Fetch error:', error);
            // Fallback to old API
            if (window.UnifiedTokenDataService) {
                console.log('[TokenDataManager] Falling back to UnifiedTokenDataService');
                try {
                    return await window.UnifiedTokenDataService.getTokenData(tokenMint, { wallet: walletAddress });
                } catch (fallbackError) {
                    console.error('[TokenDataManager] Fallback also failed:', fallbackError);
                }
            }
            return null;
        }
    }
    
    /**
     * Private: Fetch batch tokens data
     */
    async _fetchBatchTokens(tokenMints, walletAddress) {
        try {
            const url = 'api/v2/batch-simple.php';
            console.log('[TokenDataManager] Fetching batch tokens:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': walletAddress
                },
                body: JSON.stringify({
                    tokens: tokenMints,
                    wallet: walletAddress
                })
            });
            
            if (!response.ok) {
                console.error('[TokenDataManager] Batch API error:', response.status);
                // Fallback to individual token fetches
                if (window.UnifiedTokenDataService) {
                    console.log('[TokenDataManager] Falling back to individual token fetches');
                    const promises = tokenMints.map(mint => 
                        window.UnifiedTokenDataService.getTokenData(mint, { wallet: walletAddress })
                    );
                    const results = await Promise.all(promises);
                    return results.filter(data => data !== null);
                }
                return [];
            }
            
            const data = await response.json();
            
            // After parsing JSON, run data.tokens.map(this._mapApiToken)
            return data.tokens.map(token => this._mapApiToken(token)).filter(token => token !== null);
            
        } catch (error) {
            console.error('[TokenDataManager] Batch fetch error:', error);
            // Fallback to individual token fetches
            if (window.UnifiedTokenDataService) {
                console.log('[TokenDataManager] Falling back to individual token fetches');
                try {
                    const promises = tokenMints.map(mint => 
                        window.UnifiedTokenDataService.getTokenData(mint, { wallet: walletAddress })
                    );
                    const results = await Promise.all(promises);
                    return results.filter(data => data !== null);
                } catch (fallbackError) {
                    console.error('[TokenDataManager] Batch fallback also failed:', fallbackError);
                }
            }
            return [];
        }
    }
    
    /**
     * Private: Map raw API token data to frontend expected format
     * Handles field renaming and derived value computation
     */
    _mapApiToken(raw) {
        if (!raw) return null;
        
        // Base token information with field mapping
        const mapped = {
            // Core identifiers (renamed fields)
            token_mint: raw.mint || raw.tokenMint || raw.token_mint,
            wallet_address: raw.walletAddress || raw.wallet_address,
            
            // Token metadata
            symbol: raw.symbol || 'UNKNOWN',
            name: raw.name || 'Unknown Token',
            
            // Image/logo handling (multiple possible fields)
            image: raw.image || raw.logo_uri || raw.logo_url || raw.logoUrl || null,
            logo_uri: raw.logo_uri || raw.image || raw.logo_url || raw.logoUrl || null,
            logo_url: raw.logo_url || raw.logo_uri || raw.image || raw.logoUrl || null,
            
            // Price data (renamed fields)
            price: raw.price_usd || raw.price || 0,
            price_change_24h: raw.priceChange24h || raw.price_change_24h || 0,
            price_change_5m: raw.priceChange5m || raw.price_change_5m || 0,
            price_change_1m: raw.priceChange1m || raw.price_change_1m || 0,
            
            // Balance and value (with derived calculations)
            balance: raw.balance || 0,
            balance_ui: this._calculateBalanceUI(raw),
            decimals: raw.decimals || 9,
            
            // Value calculations
            value: this._calculateTokenValue(raw),
            userValue: this._calculateUserValue(raw),
            
            // Market data (renamed fields)
            liquidity: raw.liquidity || 0,
            liquidity_usd: raw.liquidity_usd || raw.liquidity || 0,
            volume_24h: raw.volume24h || raw.volume_24h || 0,
            market_cap: raw.marketCap || raw.market_cap || 0,
            holder_count: raw.holders || raw.holder_count || 0,
            
            // Monitoring and protection (nested to flat mapping)
            monitoring_active: raw.monitoring?.active || raw.monitoring_active || false,
            protected: raw.protection?.isActive || raw.protected || false,
            
            // Risk data (nested to flat mapping)
            risk_score: raw.risk?.score || raw.risk_score || 0,
            risk_level: raw.risk?.level || raw.risk_level || 'Unknown',
            
            // Developer activity
            dev_activity_pct: raw.developerActivity?.percentage || raw.dev_activity_pct || 0,
            creator_balance_pct: raw.developerActivity?.creatorBalance || raw.creator_balance_pct || 0,
            
            // Age calculation
            age: this._calculateTokenAge(raw),
            created_at: raw.createdAt || raw.created_at || raw.launchTime || null,
            
            // Badge and status
            badge_state: raw.badgeState || raw.badge_state || null,
            sell_signal: raw.sellSignal || raw.sell_signal || null,
            status: raw.status || 'active',
            
            // Test token flag
            is_test_token: raw.isTestToken || raw.is_test_token || false,
            is_newly_added: raw.isNewlyAdded || raw.is_newly_added || false,
            
            // Timestamps
            added_at: raw.addedAt || raw.added_at || null,
            last_update: raw.lastUpdate || new Date().toISOString()
        };
        
        return mapped;
    }
    
    /**
     * Private: Calculate balance UI value (balance / 10^decimals)
     */
    _calculateBalanceUI(raw) {
        const balance = raw.balance || raw.userBalance || 0;
        const decimals = raw.decimals || 9;
        
        if (balance === 0) return 0;
        
        // Convert from raw balance to UI balance
        return balance / Math.pow(10, decimals);
    }
    
    /**
     * Private: Calculate token value (balance_ui * price)
     */
    _calculateTokenValue(raw) {
        const balanceUI = this._calculateBalanceUI(raw);
        const price = raw.price_usd || raw.price || 0;
        
        return balanceUI * price;
    }
    
    /**
     * Private: Calculate user value (alias for token value)
     */
    _calculateUserValue(raw) {
        return raw.userValue || this._calculateTokenValue(raw);
    }
    
    /**
     * Private: Calculate token age from creation/launch time
     */
    _calculateTokenAge(raw) {
        const launchTime = raw.createdAt || raw.created_at || raw.launchTime || raw.launch_time;
        
        if (!launchTime) return null;
        
        const now = Date.now();
        const launch = new Date(launchTime).getTime();
        const diff = now - launch;
        
        const minutes = diff / (1000 * 60);
        const hours = minutes / 60;
        const days = hours / 24;
        
        if (days >= 30) {
            return { value: Math.floor(days / 30), unit: 'mo', raw_days: days };
        } else if (days >= 1) {
            return { value: Math.floor(days), unit: 'd', raw_days: days };
        } else if (hours >= 1) {
            return { value: Math.floor(hours), unit: 'h', raw_days: days };
        } else {
            return { value: Math.floor(minutes), unit: 'm', raw_days: days };
        }
    }
    
    /**
     * Private: Connect WebSocket for real-time updates
     */
    _connectWebSocket() {
        if (this.websocket?.readyState === WebSocket.OPEN) return;
        
        try {
            // Use the backend WebSocket if available
            const wsUrl = window.location.hostname === 'localhost' 
                ? 'ws://localhost:3001/ws' 
                : `wss://${window.location.host}/ws`;
                
            console.log('[TokenDataManager] Connecting WebSocket to:', wsUrl);
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('[TokenDataManager] WebSocket connected');
                this.websocketReconnectDelay = 1000; // Reset delay
                
                // Resubscribe to all tokens
                for (const tokenMint of this.listeners.keys()) {
                    this.websocket.send(JSON.stringify({
                        type: 'subscribe',
                        tokenMint: tokenMint
                    }));
                }
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'token-update' && data.tokenMint) {
                        // Notify all listeners for this token
                        const listeners = this.listeners.get(data.tokenMint);
                        if (listeners) {
                            for (const callback of listeners) {
                                callback(data.data);
                            }
                        }
                    }
                } catch (error) {
                    console.error('[TokenDataManager] WebSocket message error:', error);
                }
            };
            
            this.websocket.onclose = () => {
                console.log('[TokenDataManager] WebSocket disconnected');
                this.websocket = null;
                this._scheduleReconnect();
            };
            
            this.websocket.onerror = (error) => {
                console.error('[TokenDataManager] WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('[TokenDataManager] WebSocket connection error:', error);
            this._scheduleReconnect();
        }
    }
    
    /**
     * Private: Schedule WebSocket reconnection
     */
    _scheduleReconnect() {
        if (this.websocketReconnectTimer) return;
        
        console.log(`[TokenDataManager] Reconnecting in ${this.websocketReconnectDelay}ms`);
        this.websocketReconnectTimer = setTimeout(() => {
            this.websocketReconnectTimer = null;
            this._connectWebSocket();
            // Exponential backoff
            this.websocketReconnectDelay = Math.min(this.websocketReconnectDelay * 2, 30000);
        }, this.websocketReconnectDelay);
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        // Clear all timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        if (this.websocketReconnectTimer) {
            clearTimeout(this.websocketReconnectTimer);
        }
        
        // Close WebSocket
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        // Clear listeners
        this.listeners.clear();
        this.activeRequests.clear();
    }
}

// Create singleton instance
const tokenDataManager = new TokenDataManager();

// Export for global use
window.TokenDataManager = tokenDataManager;

// Helper functions for backward compatibility
window.getTokenData = async (tokenMint, walletAddress) => {
    return tokenDataManager.getTokenData(tokenMint, walletAddress);
};

window.getMultipleTokensData = async (tokenMints, walletAddress) => {
    return tokenDataManager.getMultipleTokensData(tokenMints, walletAddress);
};

} // End of if (typeof TokenDataManager === 'undefined')