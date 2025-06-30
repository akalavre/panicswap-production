/**
 * Atomic Badge Renderer - Unified Badge Service Bridge
 * 
 * This module bridges the atomic badge rendering system with UnifiedBadgeService.
 * It provides backward compatibility while delegating to the unified service.
 */

(function() {
    'use strict';
    
    // Debounce timers per token
    const debounceTimers = new Map();
    
    // Configuration
    const DEBOUNCE_DELAY = 50; // 50ms debounce delay
    
    /**
     * Load UnifiedBadgeService if not available
     */
    function ensureUnifiedBadgeService(callback) {
        if (window.UnifiedBadgeService) {
            callback();
            return;
        }
        
        console.log('[AtomicBadgeRenderer] Loading UnifiedBadgeService...');
        const script = document.createElement('script');
        const basePath = window.location.pathname.includes('/PanicSwap-php') ? '/PanicSwap-php' : '';
        script.src = `${basePath}/assets/js/unified-badge-service.js`;
        script.onload = () => {
            console.log('[AtomicBadgeRenderer] UnifiedBadgeService loaded');
            callback();
        };
        script.onerror = () => {
            console.error('[AtomicBadgeRenderer] Failed to load UnifiedBadgeService');
        };
        document.head.appendChild(script);
    }
    
    /**
     * Bridge RiskStore data to UnifiedBadgeService format
     */
    function bridgeRiskDataToUnified(tokenMint, riskData) {
        if (!riskData) return null;
        
        // Build unified data format
        const unifiedData = {
            // Badge state from API or calculated
            badgeState: riskData.badgeState,
            
            // Sell signals
            sellSignal: riskData.sellSignal,
            
            // Liquidity data
            liquidity: {
                current: riskData.metadata?.liquidity?.current || riskData.liquidity || 0
            },
            
            // Status
            status: riskData.rugged ? 'RUGGED' : riskData.status,
            
            // Velocities
            velocities: {
                price5m: riskData.metadata?.velocities?.price5m || 
                        riskData.metadata?.price?.velocity5m || 0,
                price1m: riskData.metadata?.velocities?.price1m || 
                        riskData.metadata?.price?.velocity1m || 0
            },
            
            // Price data
            price: {
                change5m: riskData.metadata?.velocities?.price5m || 
                         riskData.metadata?.price?.velocity5m || 0,
                change1m: riskData.metadata?.velocities?.price1m || 
                         riskData.metadata?.price?.velocity1m || 0
            },
            
            // New token detection
            isNewlyAdded: riskData.metadata?.isNewlyAdded,
            dataAge: riskData.metadata?.dataAge,
            addedAt: riskData.metadata?.addedAt || riskData.lastUpdated,
            
            // Monitoring state
            monitoring: {
                active: riskData.monitoring || 
                       riskData.metadata?.monitoring?.active || 
                       riskData.metadata?.monitoring?.monitoring?.active,
                lastCheck: riskData.metadata?.monitoring?.lastCheck
            },
            protectionEnabled: riskData.monitoring,
            
            // Original metadata
            metadata: riskData.metadata
        };
        
        return unifiedData;
    }
    
    /**
     * Atomic badge renderer with idempotent updates
     * @param {string} tokenMint - Token mint address
     */
    function renderBadge(tokenMint) {
        // Clear any existing debounce timer for this token
        if (debounceTimers.has(tokenMint)) {
            clearTimeout(debounceTimers.get(tokenMint));
        }
        
        // Set up debounced execution
        const timerId = setTimeout(() => {
            renderBadgeImmediate(tokenMint);
            debounceTimers.delete(tokenMint);
        }, DEBOUNCE_DELAY);
        
        debounceTimers.set(tokenMint, timerId);
    }
    
    /**
     * Immediate badge rendering (called after debounce)
     * @param {string} tokenMint - Token mint address
     */
    function renderBadgeImmediate(tokenMint) {
        ensureUnifiedBadgeService(() => {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                try {
                    // Read final state from RiskStore
                    const riskData = window.RiskStore?.getToken(tokenMint) || null;
                    
                    // Bridge data to unified format
                    const unifiedData = bridgeRiskDataToUnified(tokenMint, riskData);
                    
                    // Update UnifiedBadgeService with the data
                    if (unifiedData) {
                        window.UnifiedBadgeService.updateToken(tokenMint, unifiedData);
                    }
                    
                    // Let UnifiedBadgeService handle the rendering
                    // It will internally debounce and update the DOM
                    
                } catch (error) {
                    console.error(`[AtomicBadgeRenderer] Error bridging to UnifiedBadgeService for ${tokenMint}:`, error);
                }
            });
        });
    }
    
    /**
     * Force immediate render without debouncing (for initial loads)
     * @param {string} tokenMint - Token mint address
     */
    function renderBadgeSync(tokenMint) {
        renderBadgeImmediate(tokenMint);
    }
    
    /**
     * Render badges for all tokens
     */
    function renderAllBadges() {
        ensureUnifiedBadgeService(() => {
            // Get all tokens from RiskStore
            const badgeElements = document.querySelectorAll('[data-risk-badge]');
            badgeElements.forEach(element => {
                const tokenMint = element.getAttribute('data-risk-badge');
                if (tokenMint) {
                    renderBadge(tokenMint);
                }
            });
            
            // Also trigger UnifiedBadgeService to render all
            window.UnifiedBadgeService.renderAllBadges();
        });
    }
    
    /**
     * Clear all cached data and timers
     */
    function cleanup() {
        // Clear all debounce timers
        debounceTimers.forEach(timerId => clearTimeout(timerId));
        debounceTimers.clear();
        
        // Clear UnifiedBadgeService data
        if (window.UnifiedBadgeService) {
            window.UnifiedBadgeService.clearAll();
        }
        
        console.log('[AtomicBadgeRenderer] Cleanup completed');
    }
    
    /**
     * Initialize the atomic badge renderer if feature flag is enabled
     */
    function initialize() {
        // Check feature flag first
        checkFeatureFlag().then(enabled => {
            if (!enabled) {
                console.log('[AtomicBadgeRenderer] Feature disabled, using legacy renderer');
                return;
            }
            
            console.log('[AtomicBadgeRenderer] Initializing as bridge to UnifiedBadgeService');
            
            ensureUnifiedBadgeService(() => {
                // Listen for riskchange events from RiskStore
                if (window.RiskStore) {
                    window.RiskStore.addEventListener('riskchange', (event) => {
                        const { tokenMint } = event.detail;
                        renderBadge(tokenMint);
                    });
                    
                    console.log('[AtomicBadgeRenderer] Registered riskchange event listener');
                } else {
                    // Fallback: listen on document for riskchange events
                    document.addEventListener('riskchange', (event) => {
                        const { tokenMint } = event.detail;
                        renderBadge(tokenMint);
                    });
                    
                    console.log('[AtomicBadgeRenderer] Registered fallback riskchange event listener on document');
                }
                
                // Initial render of all badges
                renderAllBadges();
                
                // Set up periodic refresh to catch any missed updates
                setInterval(() => {
                    // Sync all RiskStore data to UnifiedBadgeService
                    if (window.RiskStore && window.RiskStore.getAllTokens) {
                        const allTokens = window.RiskStore.getAllTokens();
                        Object.entries(allTokens).forEach(([tokenMint, riskData]) => {
                            const unifiedData = bridgeRiskDataToUnified(tokenMint, riskData);
                            if (unifiedData) {
                                window.UnifiedBadgeService.updateToken(tokenMint, unifiedData);
                            }
                        });
                    }
                    renderAllBadges();
                }, 10000); // Every 10 seconds
            });
        });
    }
    
    /**
     * Check if atomic badge renderer feature is enabled
     */
    async function checkFeatureFlag() {
        try {
            // Get the base path from the current location
            const basePath = window.location.pathname.includes('/PanicSwap-php') ? '/PanicSwap-php' : '';
            const response = await fetch(`${basePath}/api/feature-flags.php?feature=atomic_badge_renderer`);
            const data = await response.json();
            return data.enabled !== false; // Check if explicitly disabled
        } catch (error) {
            console.warn('[AtomicBadgeRenderer] Could not check feature flag, defaulting to enabled:', error);
            return true; // Default to enabled if we can't check
        }
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    
    // Expose API
    window.atomicBadgeRenderer = {
        renderBadge,
        renderBadgeSync,
        renderAllBadges,
        cleanup,
        
        // Bridge function for direct access
        bridgeRiskDataToUnified,
        
        // Read-only access to internal state for debugging
        getDebounceTimers: () => new Map(debounceTimers),
        getUnifiedBadgeService: () => window.UnifiedBadgeService,
        
        // Configuration
        DEBOUNCE_DELAY
    };
    
    console.log('[AtomicBadgeRenderer] Initialized as UnifiedBadgeService bridge with debounce delay:', DEBOUNCE_DELAY + 'ms');
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
