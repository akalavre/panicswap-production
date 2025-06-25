// Protection Toggle Module
// Handles enable/disable protection for tokens

(function() {
    'use strict';
    
    // Check if window.protectionApi is available - required for operation
    if (!window.protectionApi) {
        console.error('protectionApi is not available on window object');
        return;
    }
    
    // State tracking to prevent double clicks
    const toggleInProgress = new Map();
    
    // Default mempool settings
    const DEFAULT_MEMPOOL_SETTINGS = {
        enable_mempool: true, // ON so the badge turns to "Monitoring"
        risk_threshold: 'high',
        priority_fee_multiplier: 1.5
    };
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Delegate clicks on protection buttons
        document.addEventListener('click', handleProtectionClick);
    });
    
    // Handle protection button clicks
    function handleProtectionClick(e) {
        // Check for settings button
        const settingsBtn = e.target.closest('[data-protection-settings]');
        if (settingsBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const tokenMint = settingsBtn.dataset.mint;
            const tokenSymbol = settingsBtn.dataset.symbol || 'Token';
            
            // Get current settings for this token
            getCurrentProtectionSettings(tokenMint).then(settings => {
                if (window.openProtectionSettings) {
                    window.openProtectionSettings(tokenMint, tokenSymbol, settings);
                }
            });
            return;
        }
        
        // Handle regular protection toggle
        const btn = e.target.closest('[data-protection-btn]');
        if (!btn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Check if token is rugged
        const isRugged = btn.dataset.rugged === 'true';
        if (isRugged) {
            showNotification('Cannot protect rugged tokens', 'error');
            return;
        }
        
        const tokenMint = btn.dataset.mint;
        const tokenSymbol = btn.dataset.symbol || 'Token';
        const tokenName = btn.dataset.name || tokenSymbol;
        const isProtected = btn.dataset.protected === 'true';
        
        // Check if toggle is already in progress
        if (toggleInProgress.has(tokenMint)) {
            // console.log('Toggle already in progress for', tokenSymbol);
            return;
        }
        
        // Start toggle
        toggleProtection(btn, tokenMint, tokenSymbol, tokenName, isProtected);
    }
    
    // Toggle protection state
    async function toggleProtection(btn, tokenMint, tokenSymbol, tokenName, currentlyProtected) {
        const walletAddress = localStorage.getItem('walletAddress');
        
        if (!walletAddress) {
            showNotification('Please connect your wallet first', 'error');
            return;
        }
        
        // Lock this toggle
        toggleInProgress.set(tokenMint, true);
        
        // Update UI to loading state
        setButtonLoadingState(btn, true, !currentlyProtected);
        
        // Optimistically update UI state first
        const newProtectedState = !currentlyProtected;
        updateButtonState(btn, newProtectedState);
        
        // Record the optimistic change in tokenListV3State.recentChanges
        if (window.tokenListV3State && window.tokenListV3State.recentChanges) {
            window.tokenListV3State.recentChanges.set(tokenMint, {
                state: newProtectedState,
                timestamp: Date.now()
            });
        }
        
        // Update local token state optimistically
        if (window.tokenListV3State && window.tokenListV3State.tokens) {
            const tokenIndex = window.tokenListV3State.tokens.findIndex(t => t.token_mint === tokenMint);
            if (tokenIndex !== -1) {
                window.tokenListV3State.tokens[tokenIndex].protected = newProtectedState;
                window.tokenListV3State.tokens[tokenIndex].monitoring_active = newProtectedState;
            }
        }
        
        try {
            let data;
            
            if (currentlyProtected) {
                // Use new unprotect API
                data = await window.protectionApi.unprotect(tokenMint, walletAddress);
            } else {
                // Use new protect API
                const mempoolSettings = getDefaultMempoolSettings();
                data = await window.protectionApi.protect(
                    tokenMint, 
                    walletAddress, 
                    tokenSymbol, 
                    tokenName, 
                    mempoolSettings
                );
            }
            
            if (data.success) {
                // Update button state
                const newProtectedState = !currentlyProtected;
                updateButtonState(btn, newProtectedState);
                
                // Show success notification
                if (newProtectedState) {
                    showNotification(`${tokenSymbol} is now protected! 🛡️`, 'success');
                } else {
                    showNotification(`${tokenSymbol} protection disabled`, 'success');
                }
                
                // Update any global counts
                updateProtectionCounts();
                
                // Trigger the simple counter refresh
                if (window.refreshProtectedTokenCount) {
                    window.refreshProtectedTokenCount();
                }
                
                // Trigger any callbacks
                if (window.onProtectionToggled) {
                    window.onProtectionToggled(tokenMint, newProtectedState);
                }
                
                // Update real-time risk display immediately
                if (window.realTimeRisk && window.realTimeRisk.fetchTokenMonitoringStatus) {
                    window.realTimeRisk.fetchTokenMonitoringStatus(tokenMint);
                }
                
                // If protection was just enabled, force update monitoring stats
                if (newProtectedState) {
                    fetch(`http://localhost:3001/api/monitoring/force-update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tokenMint: tokenMint,
                            walletAddress: walletAddress
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Force update triggered:', data);
                    })
                    .catch(error => {
                        console.error('Error triggering force update:', error);
                    });
                }
                
                // Update the local token state first
                if (window.tokenListV3State && window.tokenListV3State.tokens) {
                    const tokenIndex = window.tokenListV3State.tokens.findIndex(t => t.token_mint === tokenMint);
                    if (tokenIndex !== -1) {
                        window.tokenListV3State.tokens[tokenIndex].protected = newProtectedState;
                        window.tokenListV3State.tokens[tokenIndex].monitoring_active = newProtectedState;
                        // console.log(`Updated token ${tokenSymbol} protected state to:`, newProtectedState);
                        
                        // Track this change to prevent overwrites
                        if (window.tokenListV3State.recentChanges) {
                            window.tokenListV3State.recentChanges.set(tokenMint, {
                                state: newProtectedState,
                                timestamp: Date.now()
                            });
                            
                            // Clear after 5 seconds
                            setTimeout(() => {
                                window.tokenListV3State.recentChanges.delete(tokenMint);
                            }, 5000);
                        }
                        
                        // Re-render just this row instead of refreshing everything
                        if (window.renderTokenRowV3) {
                            const tbody = document.getElementById('token-list-tbody-v3');
                            if (tbody && tbody.children[tokenIndex]) {
                                tbody.children[tokenIndex].outerHTML = window.renderTokenRowV3(window.tokenListV3State.tokens[tokenIndex]);
                                // console.log('Re-rendered token row');
                            }
                        }
                    }
                }
                
                // Don't refresh the entire list immediately - let real-time updates handle it
                // or verify state after a longer delay
                setTimeout(() => {
                    // Verify the state matches what we expect
                    if (window.tokenListV3State && window.tokenListV3State.tokens) {
                        const token = window.tokenListV3State.tokens.find(t => t.token_mint === tokenMint);
                        if (token && token.protected !== newProtectedState) {
                            // console.log('State mismatch detected, refreshing token list');
                            if (window.refreshTokensV3) {
                                window.refreshTokensV3();
                            }
                        }
                    }
                }, 3000); // Check after 3 seconds
            } else {
                showNotification(data.message || `Failed to ${currentlyProtected ? 'disable' : 'enable'} protection`, 'error');
                // Don't update button state on failure
            }
            
        } catch (error) {
            console.error('Protection toggle error:', error);
            
            // Rollback UI state on failure
            updateButtonState(btn, currentlyProtected); // Revert to original state
            
            // Remove optimistic change from recentChanges
            if (window.tokenListV3State && window.tokenListV3State.recentChanges) {
                window.tokenListV3State.recentChanges.delete(tokenMint);
            }
            
            // Revert local token state
            if (window.tokenListV3State && window.tokenListV3State.tokens) {
                const tokenIndex = window.tokenListV3State.tokens.findIndex(t => t.token_mint === tokenMint);
                if (tokenIndex !== -1) {
                    window.tokenListV3State.tokens[tokenIndex].protected = currentlyProtected;
                    window.tokenListV3State.tokens[tokenIndex].monitoring_active = currentlyProtected;
                }
            }
            
            // Show error notification
            showNotification(
                `Failed to ${currentlyProtected ? 'disable' : 'enable'} protection: ${error.message}`, 
                'error'
            );
        } finally {
            // Always clear loading state and unlock
            setButtonLoadingState(btn, false);
            toggleInProgress.delete(tokenMint);
        }
    }
    
    // Set button loading state
    function setButtonLoadingState(btn, isLoading, targetState) {
        if (isLoading) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.setAttribute('title', targetState ? 'Enabling...' : 'Disabling...');
            
            // Add spinning animation to icon
            const icon = btn.querySelector('svg');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
        } else {
            btn.disabled = false;
            btn.style.opacity = '';
            
            // Remove spinning animation
            const icon = btn.querySelector('svg');
            if (icon) {
                icon.style.animation = '';
            }
        }
    }
    
    // Update button appearance based on protection state
    function updateButtonState(btn, isProtected) {
        // Update data attribute
        btn.dataset.protected = isProtected.toString();
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('protectionToggled', {
            detail: { 
                button: btn,
                isProtected: isProtected,
                tokenMint: btn.dataset.tokenMint
            }
        }));
        
        // Update classes
        if (isProtected) {
            // Protected state - red theme
            btn.className = btn.className
                .replace(/bg-gray-\d+\/\d+|border-gray-\d+\/\d+|hover:bg-gray-\d+\/\d+|hover:border-gray-\d+\/\d+|glass-card-enhanced/g, '')
                .trim() + ' bg-red-500/20 border-red-500/50 hover:bg-red-500/30 hover:border-red-500/70 shadow-lg shadow-red-500/20';
            
            // Update icon color
            const icon = btn.querySelector('svg');
            if (icon) {
                const currentClass = icon.getAttribute('class') || '';
                icon.setAttribute('class', currentClass.replace(/text-gray-\d+/g, 'text-red-400'));
            }
            
            // Add pulse indicator
            const indicator = btn.querySelector('.protection-indicator');
            if (!indicator) {
                const div = btn.querySelector('div.relative');
                if (div) {
                    div.insertAdjacentHTML('beforeend', 
                        '<div class="protection-indicator absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>'
                    );
                }
            }
        } else {
            // Unprotected state - gray theme
            btn.className = btn.className
                .replace(/bg-red-\d+\/\d+|border-red-\d+\/\d+|hover:bg-red-\d+\/\d+|hover:border-red-\d+\/\d+|shadow-lg|shadow-red-\d+\/\d+/g, '')
                .trim() + ' glass-card-enhanced bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600/50';
            
            // Update icon color
            const icon = btn.querySelector('svg');
            if (icon) {
                const currentClass = icon.getAttribute('class') || '';
                icon.setAttribute('class', currentClass.replace(/text-red-\d+/g, 'text-gray-400'));
            }
            
            // Remove pulse indicator
            const indicator = btn.querySelector('.protection-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
        
        // Update accessibility attributes
        btn.setAttribute('aria-label', isProtected ? 'Disable protection' : 'Enable protection');
        btn.setAttribute('title', isProtected ? 'Click to disable protection' : 'Click to enable protection');
        btn.setAttribute('aria-pressed', isProtected.toString());
    }
    
    // Update protection counts in UI (simplified - just triggers the counter refresh)
    function updateProtectionCounts() {
        // Trigger the simple counter refresh
        if (window.refreshProtectedTokenCount) {
            window.refreshProtectedTokenCount();
        }
    }
    
    // Show notification helper
    function showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        const colors = {
            success: 'bg-green-500/20 border-green-500/50 text-green-400',
            error: 'bg-red-500/20 border-red-500/50 text-red-400',
            info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full ${colors[type]} border`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.remove('translate-y-full');
            notification.classList.add('translate-y-0');
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('translate-y-0');
            notification.classList.add('translate-y-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Get default mempool settings
    function getDefaultMempoolSettings() {
        // Check localStorage for user preferences
        const saved = localStorage.getItem('defaultMempoolSettings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Invalid saved settings:', e);
            }
        }
        return DEFAULT_MEMPOOL_SETTINGS;
    }
    
    // Get current protection settings for a token
    async function getCurrentProtectionSettings(tokenMint) {
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress || !window.supabaseClient) {
            return {};
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('protected_tokens')
                .select('mempool_monitoring, risk_threshold, priority_fee_multiplier')
                .eq('token_mint', tokenMint)
                .eq('wallet_address', walletAddress)
                .eq('is_active', true)
                .single();
                
            if (error || !data) {
                return {};
            }
            
            return {
                mempool_monitoring: data.mempool_monitoring || false,
                risk_threshold: data.risk_threshold || 'high',
                priority_fee_multiplier: data.priority_fee_multiplier || 1.5
            };
        } catch (e) {
            console.error('Error fetching protection settings:', e);
            return {};
        }
    }
    
    // Export for external use
    window.protectionToggle = {
        updateButtonState,
        updateProtectionCounts,
        getCurrentProtectionSettings
    };
    
})();