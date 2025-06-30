// protectionApi.js
// Browser-safe UMD/IIFE wrapper for protection API endpoints

(function() {
    'use strict';
    
    // Defensive check to ensure we're in a browser environment
    if (typeof window === 'undefined') {
        console.error('protectionApi: This script requires a browser environment');
        return;
    }
    
    /**
     * Validate required parameters
     * @param {Object} params - Parameters to validate
     * @param {string[]} required - Required parameter names
     * @throws {Error} If required parameters are missing
     */
    function validateParams(params, required) {
        for (const param of required) {
            if (!params[param] || typeof params[param] !== 'string' || params[param].trim() === '') {
                throw new Error(`Missing or invalid required parameter: ${param}`);
            }
        }
    }
    
    /**
     * Protect a token with the given settings
     * @param {string} tokenMint - Token mint address
     * @param {string} walletAddress - Wallet address
     * @param {string} tokenSymbol - Token symbol
     * @param {string} tokenName - Token name
     * @param {Object} mempoolSettings - Mempool settings object
     * @returns {Promise} API response promise
     */
    async function protect(tokenMint, walletAddress, tokenSymbol, tokenName, mempoolSettings) {
        try {
            // Defensive parameter validation
            validateParams({
                tokenMint,
                walletAddress,
                tokenSymbol,
                tokenName
            }, ['tokenMint', 'walletAddress', 'tokenSymbol', 'tokenName']);
            
            // Validate mempoolSettings object
            if (!mempoolSettings || typeof mempoolSettings !== 'object') {
                throw new Error('mempoolSettings must be a valid object');
            }
            
            const response = await fetch('./api/protect-token.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token_mint: tokenMint.trim(),
                    wallet_address: walletAddress.trim(),
                    token_symbol: tokenSymbol.trim(),
                    token_name: tokenName.trim(),
                    enable_mempool: mempoolSettings.enable_mempool,
                    risk_threshold: mempoolSettings.risk_threshold,
                    priority_fee_multiplier: mempoolSettings.priority_fee_multiplier
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Protection API error:', error);
            throw error;
        }
    }
    
    /**
     * Unprotect a token
     * @param {string} tokenMint - Token mint address
     * @param {string} walletAddress - Wallet address
     * @returns {Promise} API response promise
     */
    async function unprotect(tokenMint, walletAddress) {
        try {
            // Defensive parameter validation
            validateParams({
                tokenMint,
                walletAddress
            }, ['tokenMint', 'walletAddress']);
            
            const response = await fetch('./api/unprotect-token.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token_mint: tokenMint.trim(),
                    wallet_address: walletAddress.trim()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Unprotection API error:', error);
            throw error;
        }
    }
    
    /**
     * Get protection status for a token
     * @param {string} walletAddress - Wallet address
     * @param {string} tokenMint - Token mint address
     * @returns {Promise} API response promise
     */
    async function status(walletAddress, tokenMint) {
        try {
            // Defensive parameter validation
            validateParams({
                walletAddress,
                tokenMint
            }, ['walletAddress', 'tokenMint']);
            
            // URL encode parameters to prevent injection
            const encodedWallet = encodeURIComponent(walletAddress.trim());
            const encodedMint = encodeURIComponent(tokenMint.trim());
            
            const response = await fetch(`./api/protection/status/${encodedWallet}/${encodedMint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Status API error:', error);
            throw error;
        }
    }
    
    // Expose the API on the global window object
    window.protectionApi = {
        protect: protect,
        unprotect: unprotect,
        status: status
    };
    
    // Optional: Freeze the API object to prevent modification
    if (typeof Object.freeze === 'function') {
        Object.freeze(window.protectionApi);
    }
    
})();
