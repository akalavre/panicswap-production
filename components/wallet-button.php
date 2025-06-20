<!-- Wallet Connection Button Component -->
<div id="wallet-button-container" class="relative">
    <!-- Not Connected State -->
    <button id="header-connect-wallet" class="btn btn-primary btn-sm flex items-center space-x-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span>Connect Wallet</span>
    </button>
    
    <!-- Connected State -->
    <div id="header-wallet-connected" class="hidden" style="display: none;">
        <button class="flex items-center space-x-3 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600"></div>
            <div class="text-left">
                <p class="text-xs text-gray-400">Connected</p>
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
        const adapter = new WalletAdapter();
        
        // Check for existing connection
        const savedWallet = localStorage.getItem('connectedWallet');
        if (savedWallet) {
            updateConnectedState(savedWallet);
            updateBalance();
        }
        
        // Also check if wallet is already connected via adapter
        adapter.on('connect', ({ publicKey }) => {
            currentWallet = publicKey;
            updateConnectedState(publicKey);
            updateBalance();
        });
        
        adapter.on('disconnect', () => {
            currentWallet = null;
            updateDisconnectedState();
        });
        
        // Connect button click handler
        const handleConnect = async () => {
            try {
                const wallet = await adapter.connect();
                if (wallet) {
                    currentWallet = wallet;
                    updateConnectedState(wallet);
                    updateBalance();
                }
            } catch (err) {
                console.error('Connection failed:', err);
            }
        };
        
        // Connect both desktop and mobile buttons
        if (connectBtn) {
            connectBtn.addEventListener('click', handleConnect);
        }
        if (mobileConnectBtn) {
            mobileConnectBtn.addEventListener('click', handleConnect);
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
    
    function updateConnectedState(address) {
        if (connectBtn) connectBtn.style.display = 'none';
        if (connectedDiv) connectedDiv.style.display = 'block';
        if (addressEl) addressEl.textContent = address.slice(0, 4) + '...' + address.slice(-4);
        if (mobileConnectBtn) {
            mobileConnectBtn.textContent = address.slice(0, 4) + '...' + address.slice(-4);
            mobileConnectBtn.classList.remove('btn-primary');
            mobileConnectBtn.classList.add('btn-secondary');
            mobileConnectBtn.disabled = true;
        }
        currentWallet = address;
        localStorage.setItem('connectedWallet', address);
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
        localStorage.removeItem('connectedWallet');
    }
    
    async function updateBalance() {
        if (!currentWallet || typeof solanaWeb3 === 'undefined') return;
        
        try {
            const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
            const pubKey = new solanaWeb3.PublicKey(currentWallet);
            const balance = await connection.getBalance(pubKey);
            const sol = balance / solanaWeb3.LAMPORTS_PER_SOL;
            balanceEl.textContent = sol.toFixed(4) + ' SOL';
        } catch (err) {
            console.error('Failed to get balance:', err);
        }
    }
    
    // Start initialization
    waitForWalletAdapter();
})();
</script>