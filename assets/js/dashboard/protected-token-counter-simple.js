// Simple Protected Token Counter
// Counts actual protected tokens displayed in the dashboard

(function() {
    'use strict';
    
    let hasInitialized = false;
    
    // Function to count protected tokens in the DOM
    function countProtectedTokens() {
        // Count all protection buttons that show as protected
        const protectedButtons = document.querySelectorAll('[data-protection-btn][data-protected="true"]');
        console.log('[Protected Counter] Found buttons with data-protected="true":', protectedButtons.length);
        
        // Debug: log first few buttons
        protectedButtons.forEach((btn, index) => {
            if (index < 3) {
                console.log(`[Protected Counter] Button ${index}:`, {
                    mint: btn.dataset.mint,
                    symbol: btn.dataset.symbol,
                    protected: btn.dataset.protected
                });
            }
        });
        
        return protectedButtons.length;
    }
    
    // Function to update the UI
    function updateProtectedTokenUI(count) {
        console.log('[Protected Counter] Updating UI with count:', count);
        
        // Update main counter
        const mainCounter = document.getElementById('protected-count');
        if (mainCounter) {
            mainCounter.textContent = count.toString();
        }
        
        // Update detailed counter
        const detailedCounter = document.getElementById('protected-count-detailed');
        if (detailedCounter) {
            detailedCounter.textContent = count.toString();
        }
        
        // Get limit from the DOM or default to 5
        const limitElement = document.getElementById('protected-limit');
        const limitMatch = limitElement?.textContent.match(/\d+/);
        const limit = limitMatch ? parseInt(limitMatch[0]) : 5;
        
        // Update progress bar
        const progressBar = document.getElementById('protected-progress-bar');
        if (progressBar) {
            const percentage = limit > 0 ? (count / limit) * 100 : 0;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Change color based on usage
            progressBar.classList.remove('bg-blue-400', 'bg-yellow-400', 'bg-red-400');
            if (percentage >= 80) {
                progressBar.classList.add('bg-red-400');
            } else if (percentage >= 60) {
                progressBar.classList.add('bg-yellow-400');
            } else {
                progressBar.classList.add('bg-blue-400');
            }
        }
    }
    
    // Function to refresh the count
    function refreshProtectedCount() {
        console.log('[Protected Counter] Refreshing count...');
        const count = countProtectedTokens();
        updateProtectedTokenUI(count);
    }
    
    // Set up observer to watch for changes in protection status
    function setupProtectionObserver() {
        // Watch for attribute changes on protection buttons
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'data-protected' &&
                    mutation.target.hasAttribute('data-protection-btn')) {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                // Debounce updates
                clearTimeout(window.protectionUpdateTimeout);
                window.protectionUpdateTimeout = setTimeout(refreshProtectedCount, 100);
            }
        });
        
        // Watch the token list container
        const tokenListContainer = document.getElementById('token-list-v3');
        if (tokenListContainer) {
            observer.observe(tokenListContainer, {
                attributes: true,
                attributeFilter: ['data-protected'],
                subtree: true
            });
        }
        
        return observer;
    }
    
    // Initialize when DOM is ready
    function initialize() {
        if (hasInitialized) {
            console.log('[Protected Counter] Already initialized, skipping...');
            return;
        }
        hasInitialized = true;
        
        console.log('[Protected Counter] Initializing...');
        
        // Check if token list exists AND has been populated
        const tokenList = document.getElementById('token-list-tbody-v3');
        const tokenListState = window.tokenListV3State;
        
        // Only do initial count if tokens are actually loaded
        if (tokenListState && tokenListState.tokens && tokenListState.tokens.length > 0) {
            console.log('[Protected Counter] Token state found with', tokenListState.tokens.length, 'tokens');
            // Do initial count
            setTimeout(refreshProtectedCount, 100); // Small delay to ensure DOM is ready
        } else if (tokenList && tokenList.children.length > 0 && !tokenList.querySelector('.animate-pulse')) {
            // Fallback: if state not available but DOM has tokens (not loading placeholders)
            console.log('[Protected Counter] Token list DOM found with', tokenList.children.length, 'rows');
            setTimeout(refreshProtectedCount, 100);
        } else {
            console.log('[Protected Counter] Token list not ready, waiting for tokensLoaded event...');
            // Don't count yet - wait for tokens to load
        }
        
        // Set up observer
        const observer = setupProtectionObserver();
        
        // Listen for custom events that might indicate protection changes
        document.addEventListener('protectionToggled', (e) => {
            console.log('[Protected Counter] protectionToggled event received');
            refreshProtectedCount();
        });
        
        document.addEventListener('tokensLoaded', (e) => {
            console.log('[Protected Counter] tokensLoaded event received');
            // Small delay to ensure DOM is updated
            setTimeout(refreshProtectedCount, 50);
        });
        
        document.addEventListener('tokenListUpdated', (e) => {
            console.log('[Protected Counter] tokenListUpdated event received');
            setTimeout(refreshProtectedCount, 50);
        });
        
        // Listen for token list v3 specific events
        if (window.addEventListener) {
            window.addEventListener('tokenListV3Ready', (e) => {
                console.log('[Protected Counter] tokenListV3Ready event received');
                setTimeout(refreshProtectedCount, 50);
            });
        }
        
        // Also listen for clicks on protection buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-protection-btn]')) {
                console.log('[Protected Counter] Protection button clicked');
                // Wait for the protection status to update
                setTimeout(refreshProtectedCount, 500);
            }
        });
        
        // Export function for manual refresh
        window.refreshProtectedTokenCount = refreshProtectedCount;
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (observer) {
                observer.disconnect();
            }
        });
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM is already ready
        // Use requestAnimationFrame to ensure we run after current rendering
        requestAnimationFrame(() => {
            initialize();
        });
    }
})();