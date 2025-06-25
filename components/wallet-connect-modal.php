<!-- Wallet Connection Modal -->
<div id="wallet-connect-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="wallet-connect-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <i class="fas fa-wallet text-primary-500"></i>
                    Connect Wallet
                </h3>
                <button onclick="closeWalletConnectModal()" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div id="wallet-connect-notifications"></div>
                
                <!-- Connection Options -->
                <div id="wallet-options" class="space-y-4">
                    <p class="text-center text-gray-400 mb-6">Choose how you want to connect your wallet</p>
                    
                    <div class="grid md:grid-cols-2 gap-4">
                        <!-- Hot Wallet Option (Primary) -->
                        <div class="border-2 border-primary-500/50 rounded-xl p-6 hover:border-primary-500 transition-all cursor-pointer group" onclick="showHotWalletForm()">
                            <div class="text-center">
                                <div class="mb-4 inline-flex p-4 rounded-full bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
                                    <i class="fas fa-key text-3xl text-primary-500"></i>
                                </div>
                                <h4 class="text-lg font-semibold text-white mb-2">Import Hot Wallet</h4>
                                <p class="text-sm text-gray-400 mb-4">
                                    Import your trading wallet from axiom.trade or neo.bullx for automatic protection
                                </p>
                                <div class="inline-flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                                    <i class="fas fa-check-circle"></i>
                                    Recommended for traders
                                </div>
                            </div>
                        </div>
                        
                        <!-- Browser Wallet Option -->
                        <div class="border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all cursor-pointer group" onclick="showBrowserWalletOptions()">
                            <div class="text-center">
                                <div class="mb-4 inline-flex p-4 rounded-full bg-gray-800 group-hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-plug text-3xl text-gray-400"></i>
                                </div>
                                <h4 class="text-lg font-semibold text-white mb-2">Browser Wallet</h4>
                                <p class="text-sm text-gray-400 mb-4">
                                    Connect Phantom, Solflare, or other browser extensions
                                </p>
                                <div class="inline-flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Manual approval required
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Hot Wallet Import Form (Hidden by default) -->
                <div id="hot-wallet-import-form" class="hidden">
                    <button onclick="backToWalletOptions()" class="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                        <i class="fas fa-arrow-left"></i>
                        Back
                    </button>
                    
                    <div class="bg-gray-800/50 rounded-xl p-6">
                        <h4 class="text-lg font-semibold text-white mb-4">Import Your Trading Wallet</h4>
                        
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                            <p class="text-sm text-blue-400 flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5"></i>
                                Import the wallet you use on axiom.trade or neo.bullx to enable automatic emergency swaps
                            </p>
                        </div>
                        
                        <form id="import-wallet-form" onsubmit="handleWalletImport(event)">
                            <div class="mb-6">
                                <label for="wallet-private-key" class="block text-sm font-medium text-gray-300 mb-2">
                                    Private Key
                                </label>
                                <div class="relative">
                                    <input type="password" 
                                           id="wallet-private-key" 
                                           class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                                           placeholder="Enter your wallet's private key" 
                                           required>
                                    <button type="button" 
                                            onclick="toggleKeyVisibility()" 
                                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                        <i id="key-visibility-icon" class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <p class="mt-2 text-xs text-gray-500">Base58 format (88 characters)</p>
                            </div>
                            
                            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                <p class="text-sm text-yellow-400 font-semibold mb-2">Security Notice:</p>
                                <ul class="text-sm text-yellow-400/80 space-y-1 ml-4">
                                    <li class="list-disc">Only import wallets with funds you're actively trading</li>
                                    <li class="list-disc">Your key will be encrypted and stored securely</li>
                                    <li class="list-disc">You can revoke access anytime</li>
                                </ul>
                            </div>
                            
                            <label class="flex items-start gap-3 mb-6 cursor-pointer">
                                <input type="checkbox" 
                                       id="wallet-import-confirm" 
                                       class="mt-1 w-4 h-4 text-primary-500 bg-gray-900 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                                       required>
                                <span class="text-sm text-gray-300">
                                    I understand the risks and trust PanicSwap with emergency protection
                                </span>
                            </label>
                            
                            <div class="flex gap-3">
                                <button type="submit" 
                                        class="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <i class="fas fa-shield-alt"></i>
                                    Import & Protect
                                </button>
                                <button type="button" 
                                        onclick="backToWalletOptions()" 
                                        class="px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Browser Wallet Selection (Hidden by default) -->
                <div id="browser-wallet-selection" class="hidden">
                    <button onclick="backToWalletOptions()" class="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                        <i class="fas fa-arrow-left"></i>
                        Back
                    </button>
                    
                    <div class="bg-gray-800/50 rounded-xl p-6">
                        <h4 class="text-lg font-semibold text-white mb-4">Select Your Browser Wallet</h4>
                        <div class="space-y-3">
                            <button onclick="connectBrowserWallet('phantom')" 
                                    class="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 transition-all flex items-center gap-3">
                                <img src="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg" 
                                     width="24" height="24" alt="Phantom">
                                <span class="text-white font-medium">Phantom</span>
                            </button>
                            <button onclick="connectBrowserWallet('solflare')" 
                                    class="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 transition-all flex items-center gap-3">
                                <img src="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg" 
                                     width="24" height="24" alt="Solflare">
                                <span class="text-white font-medium">Solflare</span>
                            </button>
                            <button onclick="connectBrowserWallet('backpack')" 
                                    class="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 transition-all flex items-center gap-3">
                                <img src="https://raw.githubusercontent.com/coral-xyz/backpack/master/assets/backpack.svg" 
                                     width="24" height="24" alt="Backpack">
                                <span class="text-white font-medium">Backpack</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Modal functions
function openWalletConnectModal() {
    const modal = document.getElementById('wallet-connect-modal');
    modal.classList.remove('hidden');
    // Add animation
    setTimeout(() => {
        modal.querySelector('.animate-scale-in').classList.add('scale-100');
    }, 10);
}

function closeWalletConnectModal() {
    // Check if we're on dashboard and wallet is not connected
    if (window.location.pathname.includes('dashboard.php')) {
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) {
            // Don't allow closing on dashboard without wallet
            return;
        }
    }
    
    const modal = document.getElementById('wallet-connect-modal');
    modal.querySelector('.animate-scale-in').classList.remove('scale-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Reset to options view
        backToWalletOptions();
    }, 300);
}

function showHotWalletForm() {
    document.getElementById('wallet-options').classList.add('hidden');
    document.getElementById('hot-wallet-import-form').classList.remove('hidden');
    document.getElementById('browser-wallet-selection').classList.add('hidden');
}

function showBrowserWalletOptions() {
    document.getElementById('wallet-options').classList.add('hidden');
    document.getElementById('hot-wallet-import-form').classList.add('hidden');
    document.getElementById('browser-wallet-selection').classList.remove('hidden');
}

function backToWalletOptions() {
    document.getElementById('wallet-options').classList.remove('hidden');
    document.getElementById('hot-wallet-import-form').classList.add('hidden');
    document.getElementById('browser-wallet-selection').classList.add('hidden');
}

function toggleKeyVisibility() {
    const input = document.getElementById('wallet-private-key');
    const icon = document.getElementById('key-visibility-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function handleWalletImport(event) {
    event.preventDefault();
    
    const privateKey = document.getElementById('wallet-private-key').value.trim();
    const confirmed = document.getElementById('wallet-import-confirm').checked;
    
    if (!confirmed) {
        showNotification('Please confirm that you understand the risks', 'error');
        return;
    }
    
    // Import the wallet
    if (window.walletAdapter) {
        try {
            await window.walletAdapter.importHotWallet(privateKey);
            
            // Clear the form
            document.getElementById('import-wallet-form').reset();
            
            // Close modal
            closeWalletConnectModal();
            
            // Show success
            showNotification('Wallet imported successfully! Auto-protection enabled.', 'success');
        } catch (error) {
            showNotification('Failed to import wallet: ' + error.message, 'error');
        }
    }
}

async function connectBrowserWallet(walletType) {
    if (window.walletAdapter) {
        try {
            await window.walletAdapter.connect(walletType);
            
            // Close modal
            closeWalletConnectModal();
        } catch (error) {
            showNotification('Failed to connect wallet: ' + error.message, 'error');
        }
    }
}

function showNotification(message, type) {
    const container = document.getElementById('wallet-connect-notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                   type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 
                   'bg-blue-500/10 border-blue-500/30 text-blue-400';
    
    notification.className = `border rounded-lg p-4 mb-4 ${bgColor} animate-fade-in`;
    notification.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <p class="text-sm">${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="text-current opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

// Close on backdrop click
document.getElementById('wallet-connect-backdrop')?.addEventListener('click', (e) => {
    // Check if we're on dashboard and wallet is not connected
    if (window.location.pathname.includes('dashboard.php')) {
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) {
            // Don't allow closing on dashboard without wallet
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    }
    closeWalletConnectModal();
});

// Close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('wallet-connect-modal').classList.contains('hidden')) {
        // Check if we're on dashboard and wallet is not connected
        if (window.location.pathname.includes('dashboard.php')) {
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) {
                // Don't allow closing on dashboard without wallet
                e.preventDefault();
                return;
            }
        }
        closeWalletConnectModal();
    }
});
</script>