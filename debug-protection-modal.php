<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Protection Modal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #111; color: #fff; }
        .log-entry { font-family: monospace; font-size: 12px; padding: 4px 0; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .info { color: #3b82f6; }
    </style>
</head>
<body class="p-8">
    <h1 class="text-2xl mb-4">Protection Modal Debug Console</h1>
    
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h2 class="text-lg mb-2">Test Controls</h2>
            <div class="space-y-2">
                <button onclick="checkFunction()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                    Check if openProtectionSettings exists
                </button>
                <button onclick="testModal()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
                    Test Open Modal
                </button>
                <button onclick="simulateClick()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded">
                    Simulate Settings Button Click
                </button>
            </div>
            
            <div class="mt-4">
                <h3 class="text-md mb-2">Mock Settings Button:</h3>
                <button 
                    id="mock-settings-btn"
                    class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700"
                    data-protection-settings
                    data-mint="test-mint-address"
                    data-symbol="TEST"
                    data-name="Test Token"
                    data-icon="">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                </button>
            </div>
        </div>
        
        <div>
            <h2 class="text-lg mb-2">Debug Log</h2>
            <div id="debug-log" class="bg-gray-900 rounded p-4 h-96 overflow-y-auto"></div>
        </div>
    </div>
    
    <script>
        const log = (message, type = 'info') => {
            const logDiv = document.getElementById('debug-log');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            const timestamp = new Date().toLocaleTimeString();
            entry.textContent = `[${timestamp}] ${message}`;
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        };
        
        // Initial checks
        log('Page loaded, running initial checks...', 'info');
        
        // Check for required globals
        const checkGlobals = () => {
            log('Checking global objects...', 'info');
            
            if (window.openProtectionSettings) {
                log('✅ window.openProtectionSettings is defined', 'success');
            } else {
                log('❌ window.openProtectionSettings is NOT defined', 'error');
            }
            
            if (window.protectionApi) {
                log('✅ window.protectionApi is defined', 'success');
            } else {
                log('⚠️ window.protectionApi is NOT defined', 'warning');
            }
            
            if (window.supabaseClient) {
                log('✅ window.supabaseClient is defined', 'success');
            } else {
                log('⚠️ window.supabaseClient is NOT defined', 'warning');
            }
        };
        
        const checkFunction = () => {
            log('Checking openProtectionSettings function...', 'info');
            if (window.openProtectionSettings) {
                log('✅ Function exists', 'success');
                log('Function type: ' + typeof window.openProtectionSettings, 'info');
                log('Function toString: ' + window.openProtectionSettings.toString().substring(0, 100) + '...', 'info');
            } else {
                log('❌ Function does not exist', 'error');
            }
        };
        
        const testModal = () => {
            log('Testing modal open...', 'info');
            if (window.openProtectionSettings) {
                try {
                    window.openProtectionSettings('test-mint', 'TEST', {}, 'Test Token', '');
                    log('✅ Modal function called successfully', 'success');
                } catch (error) {
                    log('❌ Error calling modal: ' + error.message, 'error');
                }
            } else {
                log('❌ Cannot test - function not available', 'error');
            }
        };
        
        const simulateClick = () => {
            log('Simulating settings button click...', 'info');
            const btn = document.getElementById('mock-settings-btn');
            if (btn) {
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                btn.dispatchEvent(event);
                log('✅ Click event dispatched', 'success');
            } else {
                log('❌ Mock button not found', 'error');
            }
        };
        
        // Set up event listeners
        document.addEventListener('DOMContentLoaded', () => {
            log('DOM content loaded', 'info');
            checkGlobals();
            
            // Listen for clicks on settings buttons
            document.addEventListener('click', (e) => {
                const settingsBtn = e.target.closest('[data-protection-settings]');
                if (settingsBtn) {
                    log('Settings button clicked!', 'success');
                    log('Token mint: ' + settingsBtn.dataset.mint, 'info');
                    log('Token symbol: ' + settingsBtn.dataset.symbol, 'info');
                }
            });
        });
        
        // Check periodically for the function
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (window.openProtectionSettings) {
                log(`✅ openProtectionSettings became available after ${checkCount} checks`, 'success');
                clearInterval(checkInterval);
            } else if (checkCount > 20) {
                log(`❌ openProtectionSettings still not available after ${checkCount} checks`, 'error');
                clearInterval(checkInterval);
            }
        }, 250);
        
        // Mock required objects for testing
        window.protectionApi = {
            protect: async () => ({ success: true }),
            unprotect: async () => ({ success: true })
        };
        
        localStorage.setItem('walletAddress', 'test-wallet-address');
    </script>
    
    <!-- Include the modal to see if it loads -->
    <?php include 'components/protection-settings-modal.php'; ?>
</body>
</html>