// Unified Token Data Service
// Single source of truth for all token data fetching
// No caching - always fetches fresh data

// Prevent re-declaration if already loaded
if (typeof UnifiedTokenDataService === 'undefined') {

class UnifiedTokenDataService {
    constructor() {
        // No cache - we want fresh data always
        this.activeRequests = new Map(); // Prevent duplicate concurrent requests
    }

    /**
     * Get comprehensive token data from monitoring API
     * This is the ONLY method that should be used for fetching token data
     */
    async getTokenData(tokenMint, walletAddress = null) {
        if (!tokenMint) return null;

        // Check if we already have an active request for this token
        const requestKey = `${tokenMint}-${walletAddress || 'no-wallet'}`;
        if (this.activeRequests.has(requestKey)) {
            return this.activeRequests.get(requestKey);
        }

        // Create the request promise
        const requestPromise = this._fetchTokenData(tokenMint, walletAddress);
        
        // Store the promise to prevent duplicate requests
        this.activeRequests.set(requestKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove from active requests when done
            this.activeRequests.delete(requestKey);
        }
    }

    async _fetchTokenData(tokenMint, walletAddress) {
        try {
            // Build the URL with optional wallet parameter
            // Use the PHP endpoint directly for now (will be replaced with v2 endpoint)
            let url = `api/monitoring-status.php/${tokenMint}`;
            if (walletAddress) {
                url += `?wallet=${walletAddress}`;
            }

            console.log('[UnifiedTokenDataService] Fetching:', url);
            const response = await fetch(url);
            if (!response.ok) {
                console.error('[UnifiedTokenDataService] Failed to fetch token data:', response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            console.log('[UnifiedTokenDataService] API response:', data);
            
            // Normalize the data structure
            const normalized = this._normalizeTokenData(data, tokenMint);
            console.log('[UnifiedTokenDataService] Normalized data:', normalized);
            return normalized;
        } catch (error) {
            console.error('[UnifiedTokenDataService] Error fetching token data:', error);
            return null;
        }
    }

    _normalizeTokenData(apiData, tokenMint) {
        // Extract all relevant data from the API response
        const normalized = {
            tokenMint: tokenMint,
            
            // Basic token info
            symbol: apiData.tokenInfo?.symbol || 'UNKNOWN',
            name: apiData.tokenInfo?.name || 'Unknown Token',
            logoUrl: apiData.tokenInfo?.logoUrl || null,
            
            // Price data
            price: apiData.price?.current || 0,
            priceChange24h: apiData.price?.change24h || 0,
            priceChange5m: apiData.price?.change5m || 0,
            priceChange1m: apiData.price?.change1m || 0,
            
            // Liquidity data - Don't default to 0, preserve null
            liquidity: apiData.liquidity?.current ?? null,
            liquidityChange24h: apiData.liquidity?.change24h || 0,
            liquidityChange5m: apiData.liquidity?.change5m || 0,
            liquidityChange1m: apiData.liquidity?.change1m || 0,
            
            // Market data
            marketCap: apiData.marketData?.marketCap || apiData.marketCap?.current || 0,
            volume24h: apiData.marketData?.volume24h || apiData.volume?.volume24h || 0,
            holders: apiData.marketData?.holders || apiData.holders?.total || 0,
            
            // Risk data
            riskLevel: apiData.risk?.level || 'Unknown',
            riskScore: apiData.risk?.score || 0,
            rugProbability: apiData.risk?.rugProbability || 0,
            
            // ML Analysis
            mlAnalysis: apiData.mlAnalysis || null,
            
            // Monitoring status
            monitoringActive: apiData.monitoring?.active || false,
            protected: apiData.protection?.isActive || false,
            activeMonitors: apiData.monitoring?.activeMonitors || 0,
            
            // Velocity data
            velocity: {
                liquidity: apiData.velocity?.liquidity || {},
                price: apiData.velocity?.price || {}
            },
            
            // Patterns
            patterns: apiData.patterns || [],
            
            // Developer activity
            developerActivity: apiData.developerActivity || null,
            
            // Pool info
            poolInfo: apiData.poolInfo || null,
            
            // Age and launch time data
            launchTime: apiData.tokenInfo?.launchTime || apiData.tokenInfo?.createdAt || null,
            createdAt: apiData.tokenInfo?.createdAt || apiData.tokenInfo?.launchTime || null,
            age: this._calculateAge(apiData.tokenInfo?.launchTime || apiData.tokenInfo?.createdAt),
            
            // Last update timestamp
            lastUpdate: new Date().toISOString(),
            
            // Badge-related fields
            badgeState: apiData.badgeState || null,
            hasCompleteData: apiData.hasCompleteData || false,
            dataAge: apiData.dataAge || null,
            isNewlyAdded: apiData.isNewlyAdded || false,
            addedAt: apiData.addedAt || null,
            
            // Sell signal data
            sellSignal: apiData.sellSignal || null,
            
            // Pass through velocities for badge calculation
            velocities: {
                price5m: apiData.price?.change5m || apiData.velocity?.price?.['5m'] || 0,
                price1m: apiData.price?.change1m || apiData.velocity?.price?.['1m'] || 0,
                liquidity5m: apiData.liquidity?.change5m || apiData.velocity?.liquidity?.['5m'] || 0,
                liquidity1m: apiData.liquidity?.change1m || apiData.velocity?.liquidity?.['1m'] || 0
            }
        };

        return normalized;
    }

    /**
     * Calculate token age from launch time
     */
    _calculateAge(launchTime) {
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
     * Get multiple tokens data in a single batch
     */
    async getMultipleTokensData(tokenMints, walletAddress = null) {
        if (!tokenMints || tokenMints.length === 0) return [];

        // Fetch all tokens in parallel
        const promises = tokenMints.map(mint => this.getTokenData(mint, walletAddress));
        const results = await Promise.all(promises);
        
        // Filter out null results
        return results.filter(data => data !== null);
    }

    /**
     * Update specific field for a token (used by real-time updates)
     * This doesn't cache anything, just returns the updated data
     */
    updateTokenField(tokenMint, field, value) {
        // This is used for optimistic UI updates
        // The actual data will be fetched fresh on next request
        return {
            tokenMint,
            [field]: value,
            lastUpdate: new Date().toISOString()
        };
    }
}

// Create singleton instance
const unifiedTokenDataService = new UnifiedTokenDataService();

// Export for global access
window.UnifiedTokenDataService = unifiedTokenDataService;

// Helper function for easy access
window.getTokenData = async (tokenMint, walletAddress) => {
    return unifiedTokenDataService.getTokenData(tokenMint, walletAddress);
};

// Helper function for batch fetching
window.getMultipleTokensData = async (tokenMints, walletAddress) => {
    return unifiedTokenDataService.getMultipleTokensData(tokenMints, walletAddress);
};

} // End of if (typeof UnifiedTokenDataService === 'undefined')