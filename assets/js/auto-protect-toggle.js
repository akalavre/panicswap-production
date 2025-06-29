// Auto-Protect Toggle Module
// Handles the Auto-Protect checkbox functionality

(function() {
    'use strict';
    
    let isProcessing = false;
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeAutoProtect();
    });
    
    function initializeAutoProtect() {
        const checkbox = document.getElementById('auto-protect-v3');
        if (!checkbox) {
            console.warn('Auto-protect checkbox not found');
            return;
        }
        
        // Load saved state from localStorage
        const savedState = localStorage.getItem('autoProtectEnabled') === 'true';
        checkbox.checked = savedState;
        
        // Add change listener
        checkbox.addEventListener('change', handleAutoProtectToggle);
    }
    
    async function handleAutoProtectToggle(event) {
        const checkbox = event.target;
        const isEnabled = checkbox.checked;
        // Use WalletState for wallet information
        const walletState = window.walletState ? window.walletState.state : null;
        const walletAddress = walletState ? walletState.address : null;
        
        if (!walletAddress) {
            showNotification('Please connect your wallet first', 'error');
            checkbox.checked = false;
            return;
        }
        
        if (isProcessing) {
            return;
        }
        
        isProcessing = true;
        
        // Update UI to loading state
        setCheckboxLoadingState(checkbox, true);
        
        try {
            // Save state immediately for optimistic UI
            localStorage.setItem('autoProtectEnabled', isEnabled.toString());
            
            // Call the new bulk toggle API endpoint directly
            const response = await fetch(`./api/auto-protection/bulk-toggle.php?wallet=${encodeURIComponent(walletAddress)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enabled: isEnabled })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                console.error('Response status:', response.status);
                console.error('Response headers:', response.headers);
                throw new Error(`Invalid JSON response from server (status: ${response.status})`);
            }
            
            if (data.success) {
                // Show success notification
                if (isEnabled) {
                    showNotification('Auto-Protect enabled! All tokens will be automatically protected.', 'success');
                } else {
                    showNotification('Auto-Protect disabled. Tokens will no longer be automatically protected.', 'success');
                }
                
                // The backend updates the Supabase wallet_auto_protection table
                // Wait for the real-time subscription to update the UI accordingly
            } else {
                // Revert checkbox state on error
                checkbox.checked = !isEnabled;
                localStorage.setItem('autoProtectEnabled', (!isEnabled).toString());
                
                showNotification(data.message || 'Failed to toggle Auto-Protect', 'error');
            }
            
        } catch (error) {
            console.error('Auto-protect toggle error:', error);
            
            // Revert checkbox state on error
            checkbox.checked = !isEnabled;
            localStorage.setItem('autoProtectEnabled', (!isEnabled).toString());
            
            showNotification('Failed to toggle Auto-Protect: ' + error.message, 'error');
        } finally {
            setCheckboxLoadingState(checkbox, false);
            isProcessing = false;
        }
    }
    
    function setCheckboxLoadingState(checkbox, isLoading) {
        const label = checkbox.closest('label');
        
        if (isLoading) {
            checkbox.disabled = true;
            if (label) {
                label.style.opacity = '0.7';
                label.style.cursor = 'wait';
            }
            
            // Add loading indicator
            const wrapper = checkbox.closest('.flex');
            if (wrapper && !wrapper.querySelector('.auto-protect-spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'auto-protect-spinner ml-2';
                spinner.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                `;
                wrapper.appendChild(spinner);
            }
        } else {
            checkbox.disabled = false;
            if (label) {
                label.style.opacity = '';
                label.style.cursor = '';
            }
            
            // Remove loading indicator
            const spinner = document.querySelector('.auto-protect-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }
    
    // Show notification helper (fallback if global showNotification is not available)
    function showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message); // Simple fallback
    }
    
    // Export for external use
    window.autoProtectToggle = {
        initialize: initializeAutoProtect,
        isEnabled: () => localStorage.getItem('autoProtectEnabled') === 'true'
    };
    
})();