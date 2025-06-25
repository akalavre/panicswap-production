/**
 * Add Test Token Functionality
 * Handles adding test tokens to user's wallet for demo purposes
 */

// Solana address validation with proper anchors
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(address) {
    return SOLANA_ADDRESS_REGEX.test(address);
}

async function addTestToken(tokenMint, walletAddress) {
    if (!tokenMint || !walletAddress) {
        throw new Error('Token mint and wallet address are required');
    }

    // Validate Solana address
    if (!isValidSolanaAddress(tokenMint)) {
        if (typeof showError === 'function') {
            showError('Invalid Solana token address. Must be 32-44 characters.');
        }
        throw new Error('Invalid Solana token address format');
    }

    try {
        const response = await fetch('api/test/add-token-simple.php', {
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log('Add token response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Server returned invalid JSON response');
        }

        if (data.success) {
            // Check if token has metadata
            if (!data.token?.symbol) {
                if (typeof showWarning === 'function') {
                    showWarning('Token added, but it may not have complete metadata.');
                }
            } else {
                if (typeof showSuccess === 'function') {
                    showSuccess(`Successfully added ${data.token.symbol || 'token'} to monitoring!`);
                }
            }
            
            // Add token to the list immediately for instant UI update
            if (data.token && window.tokenListV3State && window.tokenListV3State.tokens) {
                // Prepare token data with PumpFun data if available
                const tokenData = {
                    ...data.token,
                    token_mint: data.token.mint,
                    symbol: data.token.symbol || 'UNKNOWN',
                    name: data.token.name || 'Unknown Token',
                    balance: data.token.balance || 1000000,
                    decimals: data.token.decimals || 6,
                    price: data.token.price || 0,
                    price_change_24h: data.token.price_change_24h || 0,
                    value: data.token.value || 0,
                    image: data.token.image || data.token.logo_uri || '/assets/images/token-placeholder.svg',
                    liquidity_usd: data.token.liquidity || 0,
                    volume_24h: data.token.volume_24h || 0,
                    market_cap: data.token.market_cap || 0,
                    holder_count: data.token.holder_count || 0,
                    bonding_curve_progress: data.token.bonding_curve_progress || null,
                    sniper_count: data.token.sniper_count || null,
                    dev_wallet: data.token.dev_wallet || null,
                    data_source: data.token.data_source || 'unknown',
                    creator_balance_pct: 0, // Will be calculated by backend
                    dev_sold_pct: 0, // Will be calculated by backend
                    honeypot_status: 'unknown', // Will be checked by backend
                    lp_locked_pct: 0, // Will be calculated by backend
                    protected: data.token.protected || false,
                    is_newly_added: true,
                    metadata_status: data.token.metadata_status || 'pending'
                };
                
                // Add the new token to the beginning of the list
                window.tokenListV3State.tokens.unshift(tokenData);
                
                // Re-render the token list
                if (typeof renderTokensV3 === 'function') {
                    renderTokensV3();
                }
                
                // Register for backend polling
                if (typeof registerDashboardTokens === 'function' && walletAddress) {
                    registerDashboardTokens(walletAddress, [tokenData]);
                }
                
                // Emit tokenAdded event for data fetcher
                document.dispatchEvent(new CustomEvent('tokenAdded', {
                    detail: { token: tokenData }
                }));
                
                // Show additional info if from PumpFun
                if (data.token.data_source === 'pumpfun' && data.token.bonding_curve_progress !== null) {
                    const progressPercent = (data.token.bonding_curve_progress * 100).toFixed(1);
                    if (typeof showInfo === 'function') {
                        showInfo(`PumpFun token loaded: ${progressPercent}% to Raydium graduation`);
                    }
                }
            }
            
            // Refresh token data
            if (typeof loadProtectedTokensData === 'function') {
                await loadProtectedTokensData();
            }
            
            // Also refresh the main token list (this will now use fresh data)
            if (typeof loadTokensV3 === 'function') {
                await loadTokensV3();
            } else if (typeof refreshTokenList === 'function') {
                await refreshTokenList();
            }
            
            return data;
        } else {
            const errorMsg = data.error || 'Unknown error occurred';
            if (typeof showError === 'function') {
                showError(errorMsg);
            }
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Error adding test token:', error);
        
        if (typeof showError === 'function') {
            showError('Failed to add token: ' + error.message);
        }
        
        throw error;
    }
}

// Handle add token form submission
async function handleAddTokenForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const tokenMint = formData.get('tokenMint')?.trim();
    
    if (!tokenMint) {
        if (typeof showError === 'function') {
            showError('Please enter a token mint address');
        }
        return;
    }
    
    // Check wallet connection
    if (!window.solana || !window.solana.isConnected) {
        if (typeof showError === 'function') {
            showError('Please connect your wallet first');
        }
        return;
    }

    const walletAddress = window.solana.publicKey?.toString();
    if (!walletAddress) {
        if (typeof showError === 'function') {
            showError('Unable to get wallet address. Please reconnect your wallet.');
        }
        return;
    }

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Adding...';
        submitButton.disabled = true;
        
        try {
            await addTestToken(tokenMint, walletAddress);
            
            // Clear form on success
            form.reset();
            
        } catch (error) {
            // Error already handled in addTestToken
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    } else {
        // No submit button found, just call the function
        await addTestToken(tokenMint, walletAddress);
    }
}

// Initialize add token functionality
function initializeAddToken() {
    // Find and attach to add token forms
    const addTokenForms = document.querySelectorAll('form[data-add-token]');
    addTokenForms.forEach(form => {
        form.addEventListener('submit', handleAddTokenForm);
    });
    
    // Legacy support - look for forms with specific IDs or classes
    const legacyForms = document.querySelectorAll('#add-token-form, .add-token-form');
    legacyForms.forEach(form => {
        form.addEventListener('submit', handleAddTokenForm);
    });
}

// Metadata refresh system for tokens with pending/incomplete metadata
const metadataRefreshQueue = new Map(); // tokenMint -> { attempts, intervalId }

/**
 * Refresh metadata for a specific token
 * @param {string} tokenMint - The token mint address
 * @returns {Promise<Object|null>} - Updated metadata or null if failed
 */
async function refreshTokenMetadata(tokenMint) {
    try {
        const response = await fetch('api/refresh-token-metadata.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tokenMint })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.metadata) {
            return data.metadata;
        }
        
        // Check for specific error messages
        if (data.error && data.error.includes('not found in database')) {
            console.error(`Token ${tokenMint} not found in database`);
            // Return special marker to indicate token doesn't exist
            return { notFound: true };
        }
        
        return null;
    } catch (error) {
        console.error('Error refreshing token metadata:', error);
        return null;
    }
}

/**
 * Update token in the UI state and re-render
 * @param {string} tokenMint - The token mint address
 * @param {Object} newMetadata - Updated metadata
 */
function updateTokenInList(tokenMint, newMetadata) {
    if (!window.tokenListV3State || !window.tokenListV3State.tokens) {
        return;
    }
    
    // Find the token in the list
    const tokenIndex = window.tokenListV3State.tokens.findIndex(token => 
        token.mint === tokenMint || token.token_mint === tokenMint
    );
    
    if (tokenIndex !== -1) {
        // Update the token data
        const currentToken = window.tokenListV3State.tokens[tokenIndex];
        window.tokenListV3State.tokens[tokenIndex] = {
            ...currentToken,
            symbol: newMetadata.symbol,
            name: newMetadata.name,
            image: newMetadata.image || newMetadata.logo_uri,
            logo_uri: newMetadata.logo_uri || newMetadata.image,
            metadata_status: newMetadata.metadata_status
        };
        
        // Re-render the token list
        if (typeof renderTokensV3 === 'function') {
            renderTokensV3();
        }
        
        console.log(`Updated metadata for token ${newMetadata.symbol}`);
    }
}

/**
 * Start metadata refresh for a token
 * @param {string} tokenMint - The token mint address
 * @param {number} maxAttempts - Maximum number of refresh attempts (default: 6)
 * @param {number} intervalMs - Interval between attempts in milliseconds (default: 5000)
 */
function startMetadataRefresh(tokenMint, maxAttempts = 6, intervalMs = 5000) {
    // Check if already refreshing this token
    if (metadataRefreshQueue.has(tokenMint)) {
        return;
    }
    
    console.log(`Starting metadata refresh for token ${tokenMint}`);
    
    let attempts = 0;
    
    // Initial attempt
    refreshTokenMetadata(tokenMint).then(metadata => {
        if (metadata && metadata.notFound) {
            console.log(`Token ${tokenMint} not found in database, not starting refresh`);
            return; // Token doesn't exist, don't start interval
        }
        
        if (metadata && metadata.symbol !== 'UNKNOWN') {
            updateTokenInList(tokenMint, metadata);
            return; // Success, no need to continue
        }
        
        // Start interval for subsequent attempts
        const intervalId = setInterval(async () => {
            attempts++;
            
            if (attempts >= maxAttempts) {
                console.log(`Max attempts reached for token ${tokenMint}`);
                clearInterval(intervalId);
                metadataRefreshQueue.delete(tokenMint);
                return;
            }
            
            const metadata = await refreshTokenMetadata(tokenMint);
            
            if (metadata && metadata.notFound) {
                // Token doesn't exist in database, stop trying
                console.log(`Token ${tokenMint} not found in database, stopping refresh`);
                clearInterval(intervalId);
                metadataRefreshQueue.delete(tokenMint);
                return;
            } else if (metadata && metadata.symbol !== 'UNKNOWN' && metadata.name !== 'Unknown Token') {
                // Success! Update UI and stop refreshing
                updateTokenInList(tokenMint, metadata);
                clearInterval(intervalId);
                metadataRefreshQueue.delete(tokenMint);
                
                if (typeof showSuccess === 'function') {
                    showSuccess(`Metadata loaded for ${metadata.symbol}`);
                }
            }
        }, intervalMs);
        
        // Store in queue
        metadataRefreshQueue.set(tokenMint, { attempts: 0, intervalId });
    });
}

/**
 * Check all tokens and start refresh for those with pending metadata
 */
function checkAndRefreshPendingTokens() {
    if (!window.tokenListV3State || !window.tokenListV3State.tokens) {
        return;
    }
    
    window.tokenListV3State.tokens.forEach(token => {
        const needsRefresh = 
            token.metadata_status === 'pending' ||
            token.symbol === 'UNKNOWN' ||
            token.symbol === 'TEST' ||
            token.name === 'Unknown Token' ||
            token.name === 'Test Token';
        
        // Handle both mint and token_mint properties
        const tokenMint = token.mint || token.token_mint;
        
        if (needsRefresh && tokenMint && !metadataRefreshQueue.has(tokenMint)) {
            startMetadataRefresh(tokenMint);
        }
    });
}

// Modify the addTestToken function to trigger metadata refresh
const originalAddTestToken = addTestToken;
window.addTestToken = async function(tokenMint, walletAddress) {
    const result = await originalAddTestToken(tokenMint, walletAddress);
    
    // If token was added but has incomplete metadata, start refresh
    if (result && result.success && result.token) {
        const needsRefresh = 
            result.token.metadata_status === 'pending' ||
            result.token.symbol === 'UNKNOWN' ||
            result.token.name === 'Unknown Token';
            
        if (needsRefresh) {
            // Start refresh after a short delay to ensure token is in the list
            setTimeout(() => {
                startMetadataRefresh(tokenMint);
            }, 1000);
        }
    }
    
    return result;
};

// Export for global use
window.addTestToken = addTestToken;
window.handleAddTokenForm = handleAddTokenForm;
window.initializeAddToken = initializeAddToken;
window.refreshTokenMetadata = refreshTokenMetadata;
window.startMetadataRefresh = startMetadataRefresh;
window.checkAndRefreshPendingTokens = checkAndRefreshPendingTokens;