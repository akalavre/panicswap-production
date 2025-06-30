// Protection Settings Initialization
// This file ensures the protection settings modal is properly initialized

(function() {
    'use strict';
    
    // Check if the modal function is available
    function checkModalAvailable() {
        if (window.openProtectionSettings) {
            console.log('✅ Protection settings modal is ready');
            return true;
        }
        return false;
    }
    
    // Initialize when DOM is ready
    function initialize() {
        if (!checkModalAvailable()) {
            console.warn('⏳ Waiting for protection settings modal to load...');
            
            // Try again in a moment
            let retries = 0;
            const maxRetries = 10;
            
            const checkInterval = setInterval(() => {
                retries++;
                
                if (checkModalAvailable()) {
                    clearInterval(checkInterval);
                    console.log('✅ Protection settings modal loaded after ' + retries + ' attempts');
                } else if (retries >= maxRetries) {
                    clearInterval(checkInterval);
                    console.error('❌ Protection settings modal failed to load after ' + maxRetries + ' attempts');
                    
                    // Create a fallback function
                    window.openProtectionSettings = function() {
                        alert('Protection settings are not available. Please refresh the page.');
                    };
                }
            }, 200); // Check every 200ms
        }
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM is already ready
        initialize();
    }
})();