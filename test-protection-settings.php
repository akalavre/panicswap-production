<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Protection Settings Modal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #111; color: #fff; }
    </style>
</head>
<body class="p-8">
    <h1 class="text-2xl mb-4">Protection Settings Modal Test</h1>
    
    <div class="mb-4">
        <p>Test the protection settings modal by clicking the button below:</p>
    </div>
    
    <!-- Test button that mimics the settings button -->
    <button 
        class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-300"
        data-protection-settings
        data-mint="test-token-mint"
        data-symbol="TEST"
        data-name="Test Token"
        data-icon="">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    </button>
    
    <div class="mt-8 p-4 bg-gray-800 rounded">
        <h2 class="text-lg mb-2">Debug Info:</h2>
        <div id="debug-info"></div>
    </div>
    
    <!-- Include the modal -->
    <?php include 'components/protection-settings-modal.php'; ?>
    
    <!-- Include required scripts -->
    <script src="assets/js/supabase-client.js"></script>
    
    <script>
        // Mock localStorage for testing
        localStorage.setItem('walletAddress', 'test-wallet-address');
        
        // Mock protectionApi
        window.protectionApi = {
            protect: async () => ({ success: true }),
            unprotect: async () => ({ success: true })
        };
        
        // Mock supabaseClient
        window.supabaseClient = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: async () => ({ data: null, error: 'Not found' })
                            })
                        })
                    })
                })
            })
        };
        
        // Debug logging
        function updateDebug(message) {
            const debugDiv = document.getElementById('debug-info');
            const entry = document.createElement('div');
            entry.className = 'text-sm text-gray-400 mb-1';
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            debugDiv.appendChild(entry);
        }
        
        // Check if openProtectionSettings is available
        updateDebug('Checking for openProtectionSettings function...');
        if (window.openProtectionSettings) {
            updateDebug('✅ openProtectionSettings is available');
        } else {
            updateDebug('❌ openProtectionSettings is NOT available');
        }
        
        // Simple click handler for testing
        document.addEventListener('click', function(e) {
            const settingsBtn = e.target.closest('[data-protection-settings]');
            if (settingsBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                updateDebug('Settings button clicked');
                
                const tokenMint = settingsBtn.dataset.mint;
                const tokenSymbol = settingsBtn.dataset.symbol || 'Token';
                const tokenName = settingsBtn.dataset.name || '';
                const tokenIcon = settingsBtn.dataset.icon || '';
                
                updateDebug(`Token info: ${tokenSymbol} (${tokenMint})`);
                
                if (window.openProtectionSettings) {
                    updateDebug('Calling openProtectionSettings...');
                    window.openProtectionSettings(tokenMint, tokenSymbol, {}, tokenName, tokenIcon);
                } else {
                    updateDebug('ERROR: openProtectionSettings function not found!');
                }
            }
        });
        
        // Check again after DOM loaded
        document.addEventListener('DOMContentLoaded', function() {
            updateDebug('DOM loaded, checking again...');
            if (window.openProtectionSettings) {
                updateDebug('✅ openProtectionSettings is now available');
            } else {
                updateDebug('❌ openProtectionSettings is still NOT available');
            }
        });
    </script>
</body>
</html>