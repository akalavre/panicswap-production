<!-- Wallet Settings Modal -->
<div id="wallet-settings-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="wallet-settings-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <i class="fas fa-cog text-primary-500"></i>
                    Wallet Settings
                </h3>
                <button onclick="closeWalletSettingsModal()" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div id="auto-sell-notifications"></div>
                
                <!-- Auto-Sell Toggle Section -->
                <div class="bg-gray-800/50 rounded-xl p-6 mb-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                Auto-Sell Protection
                                <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Beta</span>
                            </h4>
                            <p class="text-sm text-gray-400">Enable automatic emergency swaps when rug pulls are detected</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="auto-sell-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>
                    
                    <!-- Auto-Sell Status -->
                    <div id="auto-sell-status" class="hidden"></div>
                    
                    <!-- Mode Selection -->
                    <div id="auto-sell-mode-selection" class="hidden">
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                            <p class="text-sm text-blue-400 flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5"></i>
                                Choose how PanicSwap should execute emergency swaps:
                            </p>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-4">
                            <!-- Hot Wallet Option -->
                            <label class="relative">
                                <input type="radio" name="auto-sell-mode" id="hot-wallet-mode" value="hot-wallet" class="sr-only peer">
                                <div class="border-2 border-gray-700 peer-checked:border-primary-500 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-all">
                                    <h5 class="font-semibold text-white mb-2">Hot Wallet</h5>
                                    <p class="text-sm text-gray-400 mb-3">
                                        Provide your trading wallet's private key for instant emergency swaps.
                                    </p>
                                    <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                                        <p class="text-xs text-yellow-400 flex items-center gap-1">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            Only use a dedicated trading wallet with limited funds
                                        </p>
                                    </div>
                                    <ul class="text-xs text-gray-500 space-y-1">
                                        <li>• Works with axiom.trade & neo bullx</li>
                                        <li>• Instant execution</li>
                                        <li>• No approval needed</li>
                                    </ul>
                                </div>
                            </label>
                            
                            <!-- Delegate Option -->
                            <label class="relative">
                                <input type="radio" name="auto-sell-mode" id="delegate-mode" value="delegate" class="sr-only peer">
                                <div class="border-2 border-gray-700 peer-checked:border-primary-500 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-all">
                                    <h5 class="font-semibold text-white mb-2">Delegate Authority</h5>
                                    <p class="text-sm text-gray-400 mb-3">
                                        Grant PanicSwap limited permission to swap tokens on your behalf.
                                    </p>
                                    <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
                                        <p class="text-xs text-green-400 flex items-center gap-1">
                                            <i class="fas fa-shield-alt"></i>
                                            Your private key stays in your wallet
                                        </p>
                                    </div>
                                    <ul class="text-xs text-gray-500 space-y-1">
                                        <li>• More secure</li>
                                        <li>• Revocable anytime</li>
                                        <li>• One-time approval</li>
                                    </ul>
                                </div>
                            </label>
                        </div>
                        
                        <!-- Hot Wallet Setup -->
                        <div id="hot-wallet-setup" class="mt-4 hidden">
                            <div class="text-center">
                                <button id="setup-hot-wallet-btn" class="bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto">
                                    <i class="fas fa-key"></i>
                                    Setup Hot Wallet
                                </button>
                            </div>
                        </div>
                        
                        <!-- Delegate Setup -->
                        <div id="delegate-setup" class="mt-4 hidden">
                            <div class="text-center">
                                <button id="setup-delegate-btn" class="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto">
                                    <i class="fas fa-check-circle"></i>
                                    Approve Delegate
                                </button>
                                <p class="text-xs text-gray-500 mt-2">
                                    Your wallet will ask you to approve a one-time transaction
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Protection Mode Section -->
                <div class="bg-gray-800/50 rounded-xl p-6 mb-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                Protection Mode
                                <span id="current-mode-badge" class="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">Loading...</span>
                            </h4>
                            <p class="text-sm text-gray-400">Manage your wallet protection level</p>
                        </div>
                    </div>
                    
                    <!-- Watch Mode Status -->
                    <div id="watch-mode-status" class="hidden">
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <span class="font-medium text-blue-400">Watch Mode Active</span>
                            </div>
                            <p class="text-sm text-blue-300">Your wallet is in watch-only mode. Upgrade to full protection for automatic emergency swaps.</p>
                        </div>
                    </div>
                    
                    <!-- Full Protection Status -->
                    <div id="full-protection-status" class="hidden">
                        <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                                <span class="font-medium text-green-400">Full Protection Active</span>
                            </div>
                            <p class="text-sm text-green-300">Your wallet has full protection with automatic emergency swaps enabled.</p>
                        </div>
                        
                        <!-- Downgrade Option -->
                        <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h5 class="font-medium text-orange-400 mb-1">Downgrade to Watch Mode</h5>
                                    <p class="text-sm text-orange-300 mb-3">
                                        Remove private key storage and disable automatic swaps. You can upgrade back to full protection anytime.
                                    </p>
                                    <div class="text-xs text-orange-400 mb-3">
                                        <strong>Note:</strong> This will disable automatic emergency swaps. You'll need to manually approve any protection actions.
                                    </div>
                                </div>
                            </div>
                            <button id="downgrade-to-watch-btn" 
                                    class="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                Downgrade to Watch Mode
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Settings -->
                <div class="bg-gray-800/50 rounded-xl p-6">
                    <h4 class="text-lg font-semibold text-white mb-4">Protection Settings</h4>
                    
                    <div class="space-y-4">
                        <div>
                            <label for="min-token-value" class="block text-sm font-medium text-gray-300 mb-2">
                                Minimum Token Value (USD)
                            </label>
                            <input type="number" 
                                   id="min-token-value" 
                                   class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                                   value="100" 
                                   min="10" 
                                   step="10">
                            <p class="mt-1 text-xs text-gray-500">Only protect tokens worth more than this amount</p>
                        </div>
                        
                        <div>
                            <label for="price-drop-threshold" class="block text-sm font-medium text-gray-300 mb-2">
                                Price Drop Threshold (%)
                            </label>
                            <input type="number" 
                                   id="price-drop-threshold" 
                                   class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                                   value="50" 
                                   min="10" 
                                   max="90" 
                                   step="5">
                            <p class="mt-1 text-xs text-gray-500">Trigger protection when price drops by this percentage</p>
                        </div>
                    </div>
                </div>
                
                <!-- Hidden Tokens Section -->
                <div class="bg-gray-800/50 rounded-xl p-6 mt-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                Hidden Tokens
                                <span id="hidden-tokens-count" class="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">0</span>
                            </h4>
                            <p class="text-sm text-gray-400">Manage tokens you've hidden from your dashboard</p>
                        </div>
                    </div>
                    
                    <!-- Hidden Tokens List -->
                    <div id="hidden-tokens-list" class="space-y-2 max-h-60 overflow-y-auto">
                        <!-- Will be populated dynamically -->
                    </div>
                    
                    <!-- Empty State -->
                    <div id="hidden-tokens-empty" class="text-center py-8 text-gray-500">
                        <i class="fas fa-eye text-3xl mb-3"></i>
                        <p class="text-sm">No hidden tokens</p>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                <button onclick="closeWalletSettingsModal()" class="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors">
                    Close
                </button>
                <button id="save-settings-btn" class="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">
                    Save Settings
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Hot Wallet Warning Modal -->
<div id="hot-wallet-warning-modal" class="fixed inset-0 z-[60] hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="hot-wallet-warning-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-lg w-full animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800 bg-yellow-500/10">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                    Security Warning
                </h3>
                <button onclick="closeHotWalletWarningModal()" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p class="text-sm text-red-400 font-semibold mb-2">Important Security Notice:</p>
                    <ul class="text-sm text-red-400 space-y-1 ml-4">
                        <li class="list-disc">Only use a dedicated trading wallet</li>
                        <li class="list-disc">Never use your main wallet's private key</li>
                        <li class="list-disc">Keep limited funds in this wallet</li>
                        <li class="list-disc">Your key will be encrypted and stored securely</li>
                    </ul>
                </div>
                
                <div class="mb-6">
                    <label for="hot-wallet-key" class="block text-sm font-medium text-gray-300 mb-2">
                        Private Key (Base58)
                    </label>
                    <textarea id="hot-wallet-key" 
                              rows="3" 
                              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                              placeholder="Enter your trading wallet's private key..." 
                              required></textarea>
                    <p class="mt-2 text-xs text-gray-500">This key will be sent securely to our servers and encrypted</p>
                </div>
                
                <label class="flex items-start gap-3 mb-6 cursor-pointer">
                    <input type="checkbox" 
                           id="hot-wallet-confirm" 
                           class="mt-1 w-4 h-4 text-primary-500 bg-gray-900 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                           required>
                    <span class="text-sm text-gray-300">
                        I understand the risks and am using a dedicated trading wallet
                    </span>
                </label>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                <button onclick="closeHotWalletWarningModal()" class="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors">
                    Cancel
                </button>
                <button id="submit-hot-wallet-btn" class="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors flex items-center gap-2">
                    <i class="fas fa-lock"></i>
                    Enable Auto-Sell
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Modal functions - make them global
window.openWalletSettingsModal = function() {
    const modal = document.getElementById('wallet-settings-modal');
    if (!modal) {
        console.error('Wallet settings modal not found');
        return;
    }
    modal.classList.remove('hidden');
    setTimeout(() => {
        const scaleElement = modal.querySelector('.animate-scale-in');
        if (scaleElement) {
            scaleElement.classList.add('scale-100');
        }
    }, 10);
    
    // Load hidden tokens when modal opens
    loadHiddenTokens();
}

// Load and display hidden tokens
function loadHiddenTokens() {
    const walletAddress = localStorage.getItem('walletAddress');
    const hiddenTokens = JSON.parse(localStorage.getItem('hiddenTokens') || '[]');
    const walletHiddenTokens = hiddenTokens.filter(t => t.wallet === walletAddress);
    
    const listContainer = document.getElementById('hidden-tokens-list');
    const emptyState = document.getElementById('hidden-tokens-empty');
    const countBadge = document.getElementById('hidden-tokens-count');
    
    // Update count
    countBadge.textContent = walletHiddenTokens.length;
    
    if (walletHiddenTokens.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    listContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Render hidden tokens
    listContainer.innerHTML = walletHiddenTokens.map(token => `
        <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                    <i class="fas fa-coins text-gray-400 text-xs"></i>
                </div>
                <div>
                    <div class="font-medium text-white">${token.symbol || 'Unknown'}</div>
                    <div class="text-xs text-gray-500">Hidden ${new Date(token.hiddenAt).toLocaleDateString()}</div>
                </div>
            </div>
            <button onclick="unhideToken('${token.mint}', '${(token.symbol || '').replace(/'/g, "\\'")}')" 
                    class="px-3 py-1 text-xs bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg transition-colors">
                Unhide
            </button>
        </div>
    `).join('');
}

// Unhide a token
function unhideToken(tokenMint, tokenSymbol) {
    const walletAddress = localStorage.getItem('walletAddress');
    let hiddenTokens = JSON.parse(localStorage.getItem('hiddenTokens') || '[]');
    
    // Remove from hidden list
    hiddenTokens = hiddenTokens.filter(t => !(t.mint === tokenMint && t.wallet === walletAddress));
    localStorage.setItem('hiddenTokens', JSON.stringify(hiddenTokens));
    
    // Reload hidden tokens display
    loadHiddenTokens();
    
    // Show notification
    showNotification(`${tokenSymbol} has been unhidden. Refresh the page to see it.`, 'success');
    
    // If we're on the dashboard, we could trigger a token refresh
    if (typeof refreshTokensV3 === 'function') {
        setTimeout(() => {
            refreshTokensV3();
        }, 500);
    }
}

window.closeWalletSettingsModal = function() {
    const modal = document.getElementById('wallet-settings-modal');
    if (!modal) {
        console.error('Wallet settings modal not found');
        return;
    }
    const scaleElement = modal.querySelector('.animate-scale-in');
    if (scaleElement) {
        scaleElement.classList.remove('scale-100');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

window.openHotWalletWarningModal = function() {
    const modal = document.getElementById('hot-wallet-warning-modal');
    if (!modal) {
        console.error('Hot wallet warning modal not found');
        return;
    }
    modal.classList.remove('hidden');
    setTimeout(() => {
        const scaleElement = modal.querySelector('.animate-scale-in');
        if (scaleElement) {
            scaleElement.classList.add('scale-100');
        }
    }, 10);
}

function closeHotWalletWarningModal() {
    const modal = document.getElementById('hot-wallet-warning-modal');
    modal.querySelector('.animate-scale-in').classList.remove('scale-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Update protection mode display
function updateProtectionModeDisplay() {
    const currentState = window.walletState ? window.walletState.getState() : null;
    const watchStatus = document.getElementById('watch-mode-status');
    const fullStatus = document.getElementById('full-protection-status');
    const modeBadge = document.getElementById('current-mode-badge');
    
    if (!currentState || currentState.status !== 'connected') {
        // Not connected
        watchStatus.classList.add('hidden');
        fullStatus.classList.add('hidden');
        modeBadge.textContent = 'Not Connected';
        modeBadge.className = 'text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full';
        return;
    }
    
    if (currentState.mode === 'watch') {
        watchStatus.classList.remove('hidden');
        fullStatus.classList.add('hidden');
        modeBadge.textContent = 'Watch Mode';
        modeBadge.className = 'text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full';
    } else if (currentState.mode === 'full') {
        watchStatus.classList.add('hidden');
        fullStatus.classList.remove('hidden');
        modeBadge.textContent = 'Full Protection';
        modeBadge.className = 'text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full';
    }
}

// Handle downgrade to watch mode
async function handleDowngradeToWatch() {
    const btn = document.getElementById('downgrade-to-watch-btn');
    const originalContent = btn.innerHTML;
    
    // Confirm action
    if (!confirm('Are you sure you want to downgrade to watch mode? This will disable automatic emergency swaps and remove your stored private key.')) {
        return;
    }
    
    try {
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Switching...</span>
        `;
        
        // Check if walletState is available
        if (!window.walletState) {
            throw new Error('Wallet state manager not available');
        }
        
        // Use the new switchToWatch method
        await window.walletState.switchToWatch();
        
        // Update the display
        updateProtectionModeDisplay();
        
        // Show success notification
        showAutoSellNotification('Successfully downgraded to watch mode. Automatic emergency swaps are now disabled.', 'success');
        
        // Update localStorage for backwards compatibility
        localStorage.setItem('protectionMode', 'watch');
        localStorage.removeItem('fullProtectionEnabled');
        
        // Trigger banner refresh if available
        if (window.bannerController) {
            setTimeout(() => {
                window.bannerController.refresh();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Failed to downgrade to watch mode:', error);
        showAutoSellNotification('Failed to downgrade to watch mode: ' + error.message, 'error');
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// Initialize auto-sell module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.autoSell) {
        window.autoSell.init();
    }
    
    // Set up protection mode display update
    updateProtectionModeDisplay();
    
    // Listen for wallet state changes
    if (window.walletState) {
        window.walletState.on('change', updateProtectionModeDisplay);
        window.walletState.on('modeSwitched', updateProtectionModeDisplay);
    }
    
    // Add event listener for downgrade button
    const downgradeBtn = document.getElementById('downgrade-to-watch-btn');
    if (downgradeBtn) {
        downgradeBtn.addEventListener('click', handleDowngradeToWatch);
    }
});

// Close modals with proper backdrop click handling
const walletSettingsBackdrop = document.getElementById('wallet-settings-backdrop');
const walletSettingsContent = document.querySelector('#wallet-settings-modal .animate-scale-in');
const hotWalletBackdrop = document.getElementById('hot-wallet-warning-backdrop');
const hotWalletContent = document.querySelector('#hot-wallet-warning-modal .animate-scale-in');

// Wallet Settings Modal - backdrop click to cancel (only if clicked directly on backdrop)
if (walletSettingsBackdrop) {
    walletSettingsBackdrop.addEventListener('click', (e) => {
        if (e.target === walletSettingsBackdrop) {
            closeWalletSettingsModal();
        }
    });
}

// Stop propagation on wallet settings modal content to avoid accidental cancel
if (walletSettingsContent) {
    walletSettingsContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Hot Wallet Warning Modal - backdrop click to cancel (only if clicked directly on backdrop)
if (hotWalletBackdrop) {
    hotWalletBackdrop.addEventListener('click', (e) => {
        if (e.target === hotWalletBackdrop) {
            closeHotWalletWarningModal();
        }
    });
}

// Stop propagation on hot wallet modal content to avoid accidental cancel
if (hotWalletContent) {
    hotWalletContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!document.getElementById('wallet-settings-modal').classList.contains('hidden')) {
            closeWalletSettingsModal();
        } else if (!document.getElementById('hot-wallet-warning-modal').classList.contains('hidden')) {
            closeHotWalletWarningModal();
        }
    }
});
</script>