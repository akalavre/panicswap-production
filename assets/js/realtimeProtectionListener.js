// Realtime Protection Listener
// Listens for changes in protected_tokens table and handles UI updates

(function() {
    'use strict';
    
    let realtimeChannel = null;
    
    // Initialize realtime listener
    function initializeRealtimeProtectionListener() {
        if (!window.supabaseClient) {
            console.warn('Supabase client not available for realtime protection listener');
            return;
        }
        
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) {
            console.warn('No wallet address for realtime protection listener');
            return;
        }
        
        // Clean up existing channel
        if (realtimeChannel) {
            window.supabaseClient.removeChannel(realtimeChannel);
        }
        
        console.log('Setting up realtime protection listener for wallet:', walletAddress);
        
        // Create new realtime channel for protected_tokens changes
        realtimeChannel = window.supabaseClient
            .channel('protected_tokens_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'protected_tokens',
                filter: `wallet_address=eq.${walletAddress}`
            }, handleProtectionChange)
            .subscribe((status) => {
                console.log('Realtime protection listener status:', status);
            });
    }
    
    // Handle protection state changes from Supabase
    function handleProtectionChange(payload) {
        console.log('Protection state change detected:', payload);
        
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Extract token information
        const tokenMint = newRecord?.token_mint || oldRecord?.token_mint;
        const walletAddress = newRecord?.wallet_address || oldRecord?.wallet_address;
        
        if (!tokenMint) {
            console.warn('No token mint in protection change payload');
            return;
        }
        
        // Determine the new protection state based on event type
        let newState;
        switch (eventType) {
            case 'INSERT':
                newState = {
                    protected: newRecord?.is_active === true,
                    monitoring_active: newRecord?.monitoring_enabled === true,
                    ...newRecord
                };
                break;
            case 'UPDATE':
                newState = {
                    protected: newRecord?.is_active === true,
                    monitoring_active: newRecord?.monitoring_enabled === true,
                    ...newRecord
                };
                break;
            case 'DELETE':
                newState = {
                    protected: false,
                    monitoring_active: false
                };
                break;
            default:
                console.warn('Unknown event type:', eventType);
                return;
        }
        
        // Step 3 Implementation: Call updateLocalToken and renderTokensV3
        updateLocalToken(tokenMint, newState);
        renderTokensV3();
        
        // Check if this change matches a recent optimistic update
        if (window.tokenListV3State && window.tokenListV3State.recentChanges) {
            const recentChange = window.tokenListV3State.recentChanges.get(tokenMint);
            
            if (recentChange && (Date.now() - recentChange.timestamp) < 10000) {
                // This is likely confirmation of our optimistic update
                console.log(`Confirming optimistic protection change for ${tokenMint}`);
                
                const isProtected = newRecord?.is_active === true;
                
                if (recentChange.state === isProtected) {
                    // Success - our optimistic update was correct
                    console.log(`Protection change confirmed for ${tokenMint}: ${isProtected}`);
                    
                    // Clear the recent change since it's now confirmed
                    window.tokenListV3State.recentChanges.delete(tokenMint);
                    
                    // Update UI button if visible
                    updateProtectionButtonsForToken(tokenMint, isProtected);
                    
                    // Update token list state
                    updateTokenListState(tokenMint, isProtected);
                    
                } else {
                    // Mismatch - rollback optimistic update
                    console.warn(`Protection state mismatch for ${tokenMint}. Expected: ${recentChange.state}, Got: ${isProtected}`);
                    rollbackOptimisticUpdate(tokenMint, isProtected);
                }
                
                return;
            }
        }
        
        // This is an external change (not from our optimistic update)
        const isProtected = newRecord?.is_active === true;
        console.log(`External protection change for ${tokenMint}: ${isProtected}`);
        
        // Update UI to reflect external change
        updateProtectionButtonsForToken(tokenMint, isProtected);
        updateTokenListState(tokenMint, isProtected);
    }
    
    // Update protection buttons for a specific token
    function updateProtectionButtonsForToken(tokenMint, isProtected) {
        const buttons = document.querySelectorAll(`[data-protection-btn][data-mint="${tokenMint}"]`);
        buttons.forEach(btn => {
            if (window.protectionToggle && window.protectionToggle.updateButtonState) {
                window.protectionToggle.updateButtonState(btn, isProtected);
            }
        });
    }
    
    // Update token list state
    function updateTokenListState(tokenMint, isProtected) {
        if (window.tokenListV3State && window.tokenListV3State.tokens) {
            const tokenIndex = window.tokenListV3State.tokens.findIndex(t => t.token_mint === tokenMint);
            if (tokenIndex !== -1) {
                window.tokenListV3State.tokens[tokenIndex].protected = isProtected;
                window.tokenListV3State.tokens[tokenIndex].monitoring_active = isProtected;
                
                // Re-render the token row if render function is available
                if (window.renderTokenRowV3) {
                    const tbody = document.getElementById('token-list-tbody-v3');
                    if (tbody && tbody.children[tokenIndex]) {
                        tbody.children[tokenIndex].outerHTML = window.renderTokenRowV3(window.tokenListV3State.tokens[tokenIndex]);
                    }
                }
            }
        }
    }
    
    // Rollback optimistic update
    function rollbackOptimisticUpdate(tokenMint, actualState) {
        console.log(`Rolling back optimistic update for ${tokenMint}`);
        
        // Clear the recent change
        if (window.tokenListV3State && window.tokenListV3State.recentChanges) {
            window.tokenListV3State.recentChanges.delete(tokenMint);
        }
        
        // Update UI to actual state
        updateProtectionButtonsForToken(tokenMint, actualState);
        updateTokenListState(tokenMint, actualState);
        
        // Show notification about the rollback
        if (window.showNotification) {
            window.showNotification(
                'Protection state was corrected based on server response',
                'info'
            );
        }
    }
    
    // Clean up realtime listener
    function cleanupRealtimeListener() {
        if (realtimeChannel && window.supabaseClient) {
            console.log('Cleaning up realtime protection listener');
            window.supabaseClient.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }
    
    // Initialize when DOM is ready and Supabase is available
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for Supabase to be ready
        const waitForSupabase = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(waitForSupabase);
                initializeRealtimeProtectionListener();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(waitForSupabase);
        }, 5000);
    });
    
    // Re-initialize when wallet changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'walletAddress') {
            setTimeout(() => {
                initializeRealtimeProtectionListener();
            }, 100);
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', cleanupRealtimeListener);
    
    // Export for external use
    window.realtimeProtectionListener = {
        initialize: initializeRealtimeProtectionListener,
        cleanup: cleanupRealtimeListener
    };
    
})();
