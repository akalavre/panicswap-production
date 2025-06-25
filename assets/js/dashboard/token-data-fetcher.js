/**
 * Token Data Fetcher Module
 * Automatically fetches comprehensive data for newly added tokens
 */

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        FETCH_INTERVAL: 3000, // 3 seconds between fetches
        MAX_RETRIES: 5,
        RETRY_DELAY: 5000, // 5 seconds between retries
        BATCH_SIZE: 3 // Process up to 3 tokens at a time
    };
    
    // State
    const fetchQueue = new Map(); // tokenMint -> { retries, timeoutId }
    const activeFetches = new Set(); // Currently fetching tokens
    
    /**
     * Initialize the token data fetcher
     */
    function initialize() {
        // Listen for new tokens added
        document.addEventListener('tokenAdded', handleTokenAdded);
        
        // Check for tokens needing data on page load
        document.addEventListener('tokensLoaded', checkTokensNeedingData);
        
        // Also check when token list updates
        document.addEventListener('tokenListUpdated', checkTokensNeedingData);
        
        console.log('Token data fetcher initialized');
    }
    
    /**
     * Handle when a new token is added
     */
    function handleTokenAdded(event) {
        const token = event.detail?.token;
        if (!token) return;
        
        const tokenMint = token.mint || token.token_mint;
        const needsData = checkTokenNeedsData(token);
        
        if (needsData && tokenMint) {
            console.log(`New token added that needs data: ${token.symbol || tokenMint}`);
            queueTokenForFetch(tokenMint);
        }
    }
    
    /**
     * Check all loaded tokens for ones needing data
     */
    function checkTokensNeedingData() {
        if (!window.tokenListV3State?.tokens) return;
        
        const tokensNeedingData = window.tokenListV3State.tokens.filter(token => {
            const tokenMint = token.mint || token.token_mint;
            return checkTokenNeedsData(token) && tokenMint && !fetchQueue.has(tokenMint) && !activeFetches.has(tokenMint);
        });
        
        console.log(`Found ${tokensNeedingData.length} tokens needing data`);
        
        // Queue tokens for fetching
        tokensNeedingData.forEach(token => {
            const tokenMint = token.mint || token.token_mint;
            queueTokenForFetch(tokenMint);
        });
    }
    
    /**
     * Check if a token needs data fetching
     */
    function checkTokenNeedsData(token) {
        // Check for newly added flag
        if (token.is_newly_added) return true;
        
        // Check for missing or incomplete metadata
        const hasPoorMetadata = 
            !token.symbol || token.symbol === 'UNKNOWN' || token.symbol === 'TEST' ||
            !token.name || token.name === 'Unknown Token' || token.name === 'Test Token' ||
            token.metadata_status === 'pending';
            
        // Check for missing price data
        const hasNoPriceData = 
            !token.price && !token.current_price ||
            (token.price === 0 && token.current_price === 0);
            
        // Check for missing market data
        const hasNoMarketData = 
            !token.liquidity_usd && !token.current_liquidity &&
            !token.market_cap && !token.volume_24h;
            
        return hasPoorMetadata || hasNoPriceData || hasNoMarketData;
    }
    
    /**
     * Queue a token for data fetching
     */
    function queueTokenForFetch(tokenMint) {
        if (fetchQueue.has(tokenMint) || activeFetches.has(tokenMint)) {
            return; // Already queued or fetching
        }
        
        fetchQueue.set(tokenMint, { retries: 0, timeoutId: null });
        processQueue();
    }
    
    /**
     * Process the fetch queue
     */
    function processQueue() {
        if (fetchQueue.size === 0) return;
        
        // Check how many we can fetch
        const availableSlots = CONFIG.BATCH_SIZE - activeFetches.size;
        if (availableSlots <= 0) {
            // Try again later
            setTimeout(processQueue, CONFIG.FETCH_INTERVAL);
            return;
        }
        
        // Get tokens to fetch
        const tokensToFetch = [];
        for (const [tokenMint, state] of fetchQueue.entries()) {
            if (tokensToFetch.length >= availableSlots) break;
            if (!activeFetches.has(tokenMint)) {
                tokensToFetch.push(tokenMint);
            }
        }
        
        // Start fetching
        tokensToFetch.forEach(tokenMint => {
            activeFetches.add(tokenMint);
            fetchTokenData(tokenMint);
        });
    }
    
    /**
     * Fetch comprehensive data for a token
     */
    async function fetchTokenData(tokenMint) {
        const walletAddress = localStorage.getItem('walletAddress');
        
        try {
            console.log(`Fetching data for token: ${tokenMint}`);
            
            // Call our PHP endpoint
            const response = await fetch('api/fetch-token-data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tokenMint: tokenMint,
                    walletAddress: walletAddress
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.metadata) {
                // Update the token in the UI
                updateTokenInUI(tokenMint, data.metadata);
                
                // Remove from queue - success!
                fetchQueue.delete(tokenMint);
                
                // Show notification if significant update
                if (data.updated && data.metadata.symbol !== 'UNKNOWN') {
                    if (typeof showSuccess === 'function') {
                        showSuccess(`Updated data for ${data.metadata.symbol}`);
                    }
                }
                
                // Trigger ML prediction for this token
                if (data.metadata.metadata_status === 'complete') {
                    triggerMLPrediction(tokenMint);
                }
            } else {
                // Retry if failed
                handleFetchError(tokenMint, new Error(data.error || 'Failed to fetch data'));
            }
            
        } catch (error) {
            console.error(`Error fetching data for ${tokenMint}:`, error);
            handleFetchError(tokenMint, error);
        } finally {
            activeFetches.delete(tokenMint);
            // Process more from queue
            setTimeout(processQueue, CONFIG.FETCH_INTERVAL);
        }
    }
    
    /**
     * Handle fetch errors with retry logic
     */
    function handleFetchError(tokenMint, error) {
        const state = fetchQueue.get(tokenMint);
        if (!state) return;
        
        state.retries++;
        
        if (state.retries >= CONFIG.MAX_RETRIES) {
            console.error(`Max retries reached for ${tokenMint}`);
            fetchQueue.delete(tokenMint);
            return;
        }
        
        // Schedule retry
        console.log(`Retrying fetch for ${tokenMint} (attempt ${state.retries + 1}/${CONFIG.MAX_RETRIES})`);
        state.timeoutId = setTimeout(() => {
            activeFetches.delete(tokenMint); // Make sure it's not marked as active
            processQueue();
        }, CONFIG.RETRY_DELAY * state.retries); // Exponential backoff
    }
    
    /**
     * Update token in the UI with new data
     */
    function updateTokenInUI(tokenMint, metadata) {
        if (!window.tokenListV3State?.tokens) return;
        
        // Find the token
        const tokenIndex = window.tokenListV3State.tokens.findIndex(token => 
            token.mint === tokenMint || token.token_mint === tokenMint
        );
        
        if (tokenIndex === -1) return;
        
        // Update the token data
        const currentToken = window.tokenListV3State.tokens[tokenIndex];
        window.tokenListV3State.tokens[tokenIndex] = {
            ...currentToken,
            // Update with new metadata
            symbol: metadata.symbol || currentToken.symbol,
            name: metadata.name || currentToken.name,
            logo_uri: metadata.logo_uri || currentToken.logo_uri,
            image: metadata.logo_uri || currentToken.image,
            metadata_status: metadata.metadata_status || currentToken.metadata_status,
            // Update price data
            price: metadata.current_price || currentToken.price,
            current_price: metadata.current_price || currentToken.current_price,
            price_change_24h: metadata.price_24h_change ?? currentToken.price_change_24h,
            market_cap: metadata.market_cap || currentToken.market_cap,
            volume_24h: metadata.volume_24h || currentToken.volume_24h,
            liquidity_usd: metadata.current_liquidity || currentToken.liquidity_usd,
            holder_count: metadata.holder_count || currentToken.holder_count,
            // Update value
            value: (metadata.current_price || 0) * (currentToken.balance || 0),
            // Clear newly added flag if metadata is complete
            is_newly_added: metadata.metadata_status === 'complete' ? false : currentToken.is_newly_added
        };
        
        // Re-render just this row
        if (window.renderTokenRowV3) {
            const tbody = document.getElementById('token-list-tbody-v3');
            if (tbody && tbody.children[tokenIndex]) {
                tbody.children[tokenIndex].outerHTML = window.renderTokenRowV3(window.tokenListV3State.tokens[tokenIndex]);
            }
        }
        
        // If protection button was disabled due to newly_added, enable it now
        if (!currentToken.is_newly_added && metadata.metadata_status === 'complete') {
            const protectBtn = document.querySelector(`[data-protection-btn][data-mint="${tokenMint}"]`);
            if (protectBtn && protectBtn.classList.contains('cursor-not-allowed')) {
                // Re-render to update button state
                if (typeof renderTokensV3 === 'function') {
                    renderTokensV3();
                }
            }
        }
    }
    
    /**
     * Trigger ML prediction generation for a token
     */
    async function triggerMLPrediction(tokenMint) {
        // Check if we have ML integration
        if (!window.queueTokenForMLGeneration) return;
        
        console.log(`Triggering ML prediction for ${tokenMint}`);
        window.queueTokenForMLGeneration(tokenMint);
    }
    
    /**
     * Stop fetching for a specific token
     */
    function stopFetchingToken(tokenMint) {
        const state = fetchQueue.get(tokenMint);
        if (state && state.timeoutId) {
            clearTimeout(state.timeoutId);
        }
        fetchQueue.delete(tokenMint);
        activeFetches.delete(tokenMint);
    }
    
    /**
     * Get fetch status
     */
    function getFetchStatus() {
        return {
            queueSize: fetchQueue.size,
            activeFetches: activeFetches.size,
            queuedTokens: Array.from(fetchQueue.keys()),
            activeTokens: Array.from(activeFetches)
        };
    }
    
    // Export for global use
    window.tokenDataFetcher = {
        initialize,
        queueTokenForFetch,
        stopFetchingToken,
        getFetchStatus,
        checkTokenNeedsData
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();