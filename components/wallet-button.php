<!-- Wallet Connection Button Component -->
<div id="wallet-button-container" class="relative">
    <!-- Not Connected State -->
    <button id="header-connect-wallet" class="btn btn-primary btn-sm flex items-center space-x-2" onclick="openWalletConnectModal()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span>Connect Wallet</span>
    </button>
    
    <!-- Connected State -->
    <div id="header-wallet-connected" class="hidden" style="display: none;">
        <button class="flex items-center space-x-3 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 position-relative">
                <span id="wallet-type-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success" style="font-size: 10px; display: none;">
                    HOT
                </span>
            </div>
            <div class="text-left">
                <p class="text-xs text-gray-400" id="wallet-connection-type">Connected</p>
                <p class="text-sm font-mono text-white" id="header-wallet-address">...</p>
            </div>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        </button>
        
        <!-- Dropdown Menu -->
        <div id="wallet-dropdown" class="hidden absolute right-0 mt-2 w-64 rounded-lg bg-gray-900 border border-gray-800 shadow-xl">
            <div class="p-4 border-b border-gray-800">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-400">Balance</span>
                    <span class="text-sm font-medium text-white" id="header-wallet-balance">0.0000 SOL</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-400">Network</span>
                    <span class="text-sm font-medium text-green-400">Mainnet</span>
                </div>
            </div>
            <div class="p-2">
                <button id="header-copy-address" class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span class="text-sm">Copy Address</span>
                </button>
                <button id="header-view-explorer" class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    <span class="text-sm">View on Explorer</span>
                </button>
                <a href="subscription.php" class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    <span class="text-sm">Subscription</span>
                </a>
                <button id="header-wallet-settings" class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors flex items-center space-x-2" onclick="openWalletSettingsModal()">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span class="text-sm">Wallet Settings</span>
                </button>
                <div class="border-t border-gray-800 mt-2 pt-2">
                    <button id="header-disconnect-wallet" class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors flex items-center space-x-2 text-red-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span class="text-sm">Disconnect</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Wallet button functionality
(function() {
    const connectBtn = document.getElementById('header-connect-wallet');
    const connectedDiv = document.getElementById('header-wallet-connected');
    const dropdown = document.getElementById('wallet-dropdown');
    const addressEl = document.getElementById('header-wallet-address');
    const balanceEl = document.getElementById('header-wallet-balance');
    const disconnectBtn = document.getElementById('header-disconnect-wallet');
    const copyBtn = document.getElementById('header-copy-address');
    const explorerBtn = document.getElementById('header-view-explorer');
    const mobileConnectBtn = document.getElementById('mobile-connect-wallet');
    
    let currentWallet = null;
    
    // Check if wallet adapter is loaded
    function waitForWalletAdapter() {
        if (typeof WalletAdapter !== 'undefined') {
            initializeWalletButton();
        } else {
            setTimeout(waitForWalletAdapter, 100);
        }
    }
    
    function initializeWalletButton() {
        const adapter = window.walletAdapter || new WalletAdapter();
        
        // Try to restore connection
        adapter.restoreConnection().then(address => {
            if (address) {
                currentWallet = address;
                updateConnectedState(address, adapter.walletType);
                updateBalance();
            }
        });
        
        // Listen for connection events
        adapter.on('connect', ({ publicKey, walletType }) => {
            currentWallet = publicKey;
            updateConnectedState(publicKey, walletType);
            updateBalance();
        });
        
        adapter.on('disconnect', () => {
            currentWallet = null;
            updateDisconnectedState();
        });
        
        // Mobile connect button opens modal
        if (mobileConnectBtn) {
            mobileConnectBtn.onclick = openWalletConnectModal;
        }
        
        // Disconnect button
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', async () => {
                await adapter.disconnect();
                dropdown.classList.add('hidden');
            });
        }
        
        // Copy address
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (currentWallet) {
                    navigator.clipboard.writeText(currentWallet);
                    copyBtn.querySelector('span').textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.querySelector('span').textContent = 'Copy Address';
                    }, 2000);
                }
            });
        }
        
        // View on explorer
        if (explorerBtn) {
            explorerBtn.addEventListener('click', () => {
                if (currentWallet) {
                    window.open(`https://solscan.io/account/${currentWallet}`, '_blank');
                }
            });
        }
        
        // Toggle dropdown
        connectedDiv?.addEventListener('click', (e) => {
            if (!e.target.closest('#wallet-dropdown')) {
                dropdown.classList.toggle('hidden');
            }
        });
        
        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!connectedDiv?.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Listen for storage events to sync across tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'connectedWallet') {
                if (e.newValue) {
                    updateConnectedState(e.newValue);
                    updateBalance();
                } else {
                    updateDisconnectedState();
                }
            }
        });
    }
    
    function updateConnectedState(address, walletType = 'browser') {
        if (connectBtn) connectBtn.style.display = 'none';
        if (connectedDiv) connectedDiv.style.display = 'block';
        if (addressEl) addressEl.textContent = address.slice(0, 4) + '...' + address.slice(-4);
        
        // Update wallet type indicator
        const typeText = document.getElementById('wallet-connection-type');
        const typeBadge = document.getElementById('wallet-type-badge');
        
        if (walletType === 'hot') {
            if (typeText) typeText.textContent = 'Hot Wallet';
            if (typeBadge) {
                typeBadge.style.display = 'inline-block';
                typeBadge.textContent = 'HOT';
            }
        } else {
            if (typeText) typeText.textContent = 'Connected';
            if (typeBadge) typeBadge.style.display = 'none';
        }
        
        if (mobileConnectBtn) {
            mobileConnectBtn.textContent = address.slice(0, 4) + '...' + address.slice(-4);
            mobileConnectBtn.classList.remove('btn-primary');
            mobileConnectBtn.classList.add('btn-secondary');
            mobileConnectBtn.disabled = true;
        }
        currentWallet = address;
    }
    
    function updateDisconnectedState() {
        if (connectBtn) connectBtn.style.display = 'flex';
        if (connectedDiv) connectedDiv.style.display = 'none';
        if (mobileConnectBtn) {
            mobileConnectBtn.textContent = 'Connect Wallet';
            mobileConnectBtn.classList.add('btn-primary');
            mobileConnectBtn.classList.remove('btn-secondary');
            mobileConnectBtn.disabled = false;
        }
        currentWallet = null;
        
        // Clear all wallet-related localStorage
        localStorage.removeItem('connectedWallet');
        localStorage.removeItem('walletType');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('hotWalletData');
    }
    
    async function updateBalance() {
        if (!currentWallet) return;
        
        try {
            // Use backend proxy to avoid CORS issues
            const response = await fetch(`api/get-balance.php?wallet=${encodeURIComponent(currentWallet)}`);
            const data = await response.json();
            
            if (data.success && balanceEl) {
                balanceEl.textContent = data.balanceFormatted;
            } else {
                // Fallback display
                if (balanceEl) {
                    balanceEl.textContent = '~ SOL';
                }
                console.log('Balance fetch failed:', data.error || 'Unknown error');
            }
        } catch (err) {
            console.log('Balance fetching failed:', err.message);
            // Set a fallback display
            if (balanceEl) {
                balanceEl.textContent = '~ SOL';
            }
        }
    }
    
    // Start initialization
    waitForWalletAdapter();
})();
</script>