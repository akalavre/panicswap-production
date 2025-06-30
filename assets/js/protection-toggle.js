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
        
        // Apply correct theme to all protection buttons on initial load
        setTimeout(initializeProtectionButtons, 100);
    });
    
    // Initialize protection button states on page load
    function initializeProtectionButtons() {
        const buttons = document.querySelectorAll('[data-protection-btn]');
        buttons.forEach(btn => {
            const isProtected = btn.dataset.protected === 'true';
            // Apply the theme without triggering events
            applyProtectedTheme(btn, isProtected);
            // Set proper accessibility attributes
            btn.setAttribute('aria-label', isProtected ? 'Disable protection' : 'Enable protection');
            btn.setAttribute('title', isProtected ? 'Click to disable protection' : 'Click to enable protection');
            btn.setAttribute('aria-pressed', isProtected.toString());
        });
    }
    
    // Handle protection button clicks
    function handleProtectionClick(e) {
        console.log('Protection click handler triggered', e.target);
        
        // Check for settings button
        const settingsBtn = e.target.closest('.protection-settings-btn');
        if (settingsBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Settings button clicked!');
            
            const tokenMint = settingsBtn.dataset.mint;
            const tokenSymbol = settingsBtn.dataset.symbol || 'Token';
            const tokenName = settingsBtn.dataset.name || '';
            const tokenIcon = settingsBtn.dataset.icon || '';
            
            console.log('Token data:', { tokenMint, tokenSymbol, tokenName, tokenIcon });
            
            // Get current settings for this token
            getCurrentProtectionSettings(tokenMint).then(settings => {
                console.log('Retrieved settings:', settings);
                if (window.openProtectionSettings) {
                    window.openProtectionSettings(tokenMint, tokenSymbol, settings, tokenName, tokenIcon);
                } else {
                    // If openProtectionSettings is not available yet, try again after a delay
                    console.warn('openProtectionSettings not available, waiting for modal to load...');
                    setTimeout(() => {
                        if (window.openProtectionSettings) {
                            window.openProtectionSettings(tokenMint, tokenSymbol, settings, tokenName, tokenIcon);
                        } else {
                            console.error('Protection settings modal not loaded. Please refresh the page.');
                            showNotification('Protection settings not available. Please refresh the page.', 'error');
                        }
                    }, 500);
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
        
        // Check protection mode for enabling protection (but allow disabling)
        if (!currentlyProtected) {
            const protectionMode = await checkUserProtectionMode(walletAddress);
            if (protectionMode === 'watch-only') {
                showNotification('Full protection mode required for auto-execution. You can still receive alerts in watch-only mode.', 'warning');
                // Allow monitoring/alerts but show warning about limitations
            }
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
                
                // Clear Supabase cache entry for this token to ensure realtime listeners receive the change
                if (window.supabaseClient && typeof window.supabaseClient.invalidateCache === 'function') {
                    try {
                        window.supabaseClient.invalidateCache('protected_tokens', {
                            token_mint: tokenMint,
                            wallet_address: walletAddress
                        });
                        console.log(`Cleared Supabase cache for token ${tokenMint}`);
                    } catch (error) {
                        console.warn('Failed to clear Supabase cache:', error);
                    }
                }
                
                // Force a Supabase realtime broadcast by manually triggering a notification
                if (window.supabaseClient && typeof window.supabaseClient.channel === 'function') {
                    try {
                        const channel = window.supabaseClient.channel('protection_sync');
                        channel.send({
                            type: 'broadcast',
                            event: 'protection_updated',
                            payload: {
                                token_mint: tokenMint,
                                wallet_address: walletAddress,
                                protected: newProtectedState,
                                monitoring_active: newProtectedState,
                                timestamp: Date.now()
                            }
                        });
                        console.log(`Broadcasted protection change for token ${tokenMint}`);
                    } catch (error) {
                        console.warn('Failed to broadcast protection change:', error);
                    }
                }
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
                        // Update real-time risk display after backend update completes
                        if (window.realTimeRisk && window.realTimeRisk.refreshMonitoringStatus) {
                            // Add a small delay to ensure backend has updated the database
                            setTimeout(() => {
                                window.realTimeRisk.refreshMonitoringStatus(tokenMint);
                            }, 1500);
                        }
                    })
                    .catch(error => {
                        console.error('Error triggering force update:', error);
                        // Still try to update display even if force update fails
                        if (window.realTimeRisk && window.realTimeRisk.refreshMonitoringStatus) {
                            setTimeout(() => {
                                window.realTimeRisk.refreshMonitoringStatus(tokenMint);
                            }, 1500);
                        }
                    });
                } else {
                    // Update real-time risk display immediately when disabling
                    if (window.realTimeRisk && window.realTimeRisk.fetchTokenMonitoringStatus) {
                        window.realTimeRisk.fetchTokenMonitoringStatus(tokenMint);
                    }
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
    
    // Helper function to apply protected theme (red or gray)
    function applyProtectedTheme(btn, isProtected) {
        const classList = btn.classList;
        
        if (isProtected) {
            // Remove all gray theme classes explicitly
            classList.remove(
                'glass-card-enhanced',
                'bg-gray-800/40', 'border-gray-700/50', 
                'hover:bg-gray-800/60', 'hover:border-gray-600/50'
            );
            // Remove any other gray variants that might exist
            btn.className = btn.className.replace(/bg-gray-\d+\/\d+|border-gray-\d+\/\d+|hover:bg-gray-\d+\/\d+/g, '');
            
            // Add red theme classes
            classList.add(
                'bg-red-500/20', 'border-red-500/50',
                'hover:bg-red-500/30', 'hover:border-red-500/70',
                'shadow-lg', 'shadow-red-500/20'
            );
            
            // Update icon color
            const icon = btn.querySelector('svg');
            if (icon) {
                const currentClass = icon.getAttribute('class') || '';
                icon.setAttribute('class', currentClass.replace(/text-gray-\d+/g, 'text-red-400'));
            }
            
            // Guarantee pulse indicator is added only once
            let indicator = btn.querySelector('.protection-indicator');
            if (!indicator) {
                const div = btn.querySelector('div.relative');
                if (div) {
                    const pulseElement = document.createElement('div');
                    pulseElement.className = 'protection-indicator absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse';
                    div.appendChild(pulseElement);
                }
            }
        } else {
            // Remove all red theme classes explicitly
            classList.remove(
                'bg-red-500/20', 'border-red-500/50',
                'hover:bg-red-500/30', 'hover:border-red-500/70',
                'shadow-lg', 'shadow-red-500/20'
            );
            // Remove any other red variants that might exist
            btn.className = btn.className.replace(/bg-red-\d+\/\d+|border-red-\d+\/\d+|hover:bg-red-\d+\/\d+|shadow-red-\d+\/\d+/g, '');
            
            // Add gray theme classes
            classList.add(
                'glass-card-enhanced',
                'bg-gray-800/40', 'border-gray-700/50',
                'hover:bg-gray-800/60', 'hover:border-gray-600/50'
            );
            
            // Update icon color
            const icon = btn.querySelector('svg');
            if (icon) {
                const currentClass = icon.getAttribute('class') || '';
                icon.setAttribute('class', currentClass.replace(/text-red-\d+/g, 'text-gray-400'));
            }
            
            // Guarantee pulse indicator is removed only once
            const indicator = btn.querySelector('.protection-indicator');
            if (indicator) {
                indicator.remove();
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
                tokenMint: btn.dataset.mint
            }
        }));
        
        // Apply theme using the helper function
        applyProtectedTheme(btn, isProtected);
        
        // Update accessibility attributes
        btn.setAttribute('aria-label', isProtected ? 'Disable protection' : 'Enable protection');
        btn.setAttribute('title', isProtected ? 'Click to disable protection' : 'Click to enable protection');
        btn.setAttribute('aria-pressed', isProtected.toString());
        
        // Also update the protection badge in the same row if it exists
        const row = btn.closest('tr');
        if (row) {
            const protectionBadgeCell = row.querySelector('td:nth-last-child(2)'); // Protection column is second from last
            if (protectionBadgeCell) {
                if (isProtected) {
                    protectionBadgeCell.innerHTML = `
                        <div class="inline-flex items-center px-2 py-1 rounded-full bg-primary-900/60 text-primary-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-3 w-3 mr-1"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
                            <span class="text-xs font-medium">Protected</span>
                        </div>`;
                } else {
                    protectionBadgeCell.innerHTML = `
                        <div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-3 w-3 mr-1 opacity-50"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
                            <span class="text-xs">Not Protected</span>
                        </div>`;
                }
            }
        }
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
    
    // Check user's protection mode
    async function checkUserProtectionMode(walletAddress) {
        try {
            const response = await fetch(`/api/get-subscription-status.php?wallet=${walletAddress}`);
            const data = await response.json();
            
            if (data.subscription) {
                // Check explicit protection_mode or determine from plan
                if (data.subscription.protection_mode) {
                    return data.subscription.protection_mode;
                }
                
                // Fallback: determine from plan type
                const fullAccessPlans = ['pro', 'enterprise', 'degen-mode'];
                return fullAccessPlans.includes(data.subscription.plan.toLowerCase()) ? 'full' : 'watch-only';
            }
            
            return 'watch-only'; // Default to watch-only for free users
        } catch (error) {
            console.error('Error checking protection mode:', error);
            return 'watch-only'; // Default to safe mode on error
        }
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
        getCurrentProtectionSettings,
        initializeProtectionButtons
    };
    
})();