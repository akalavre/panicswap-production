<!-- Full Protection Setup Modal -->
<div id="full-protection-modal" class="fixed inset-0 z-[60] hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="full-protection-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-lg w-full animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <div class="p-2 rounded-lg bg-amber-500/20">
                        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                    </div>
                    Enable Full Protection
                </h3>
                <button onclick="closeFullProtectionModal()" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <div id="full-protection-notifications"></div>
                
                <!-- Benefits Summary -->
                <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                    <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        Full Protection Benefits
                    </h4>
                    <div class="grid gap-3">
                        <div class="flex items-center gap-3 text-sm text-green-200">
                            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>Instant emergency swaps when rug pulls are detected</span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-green-200">
                            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>Automatic protection with no approvals needed</span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-green-200">
                            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>MEV protection and sandwich attack prevention</span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-green-200">
                            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>Works with Axiom.trade and Neo Bullx platforms</span>
                        </div>
                    </div>
                </div>
                
                <!-- Security Warning -->
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p class="text-sm text-red-400 font-semibold mb-2">🔒 Important Security Notice:</p>
                    <ul class="text-sm text-red-400 space-y-1 ml-4">
                        <li class="list-disc">Only use a dedicated trading wallet</li>
                        <li class="list-disc">Never use your main wallet's private key</li>
                        <li class="list-disc">Keep limited funds in this wallet</li>
                        <li class="list-disc">Your key will be encrypted and stored securely</li>
                    </ul>
                </div>
                
                <!-- Private Key Input -->
                <div class="mb-6">
                    <label for="full-protection-key" class="block text-sm font-medium text-gray-300 mb-2">
                        Private Key (Base58)
                    </label>
                    <textarea id="full-protection-key" 
                              rows="3" 
                              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                              placeholder="Enter your trading wallet's private key..." 
                              required></textarea>
                    <p class="mt-2 text-xs text-gray-500">This key will be sent securely to our servers and encrypted</p>
                </div>
                
                <!-- Confirmation Checkbox -->
                <label class="flex items-start gap-3 mb-6 cursor-pointer">
                    <input type="checkbox" 
                           id="full-protection-confirm" 
                           class="mt-1 w-4 h-4 text-primary-500 bg-gray-900 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                           required>
                    <span class="text-sm text-gray-300">
                        I understand the risks and am using a dedicated trading wallet with limited funds
                    </span>
                </label>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                <button onclick="closeFullProtectionModal()" class="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors">
                    Cancel
                </button>
                <button id="submit-full-protection-btn" class="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-lg transition-all duration-200 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    Enable Full Protection
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Modal functions
function openFullProtectionModal() {
    const modal = document.getElementById('full-protection-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.animate-scale-in').classList.add('scale-100');
    }, 10);
}

function closeFullProtectionModal() {
    const modal = document.getElementById('full-protection-modal');
    modal.querySelector('.animate-scale-in').classList.remove('scale-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Clear form
        document.getElementById('full-protection-key').value = '';
        document.getElementById('full-protection-confirm').checked = false;
        document.getElementById('full-protection-notifications').innerHTML = '';
    }, 300);
}

// Handle form submission
document.getElementById('submit-full-protection-btn').addEventListener('click', async function() {
    const privateKey = document.getElementById('full-protection-key').value.trim();
    const confirmed = document.getElementById('full-protection-confirm').checked;
    const submitBtn = this;
    const originalContent = submitBtn.innerHTML;
    
    // Clear previous notifications
    document.getElementById('full-protection-notifications').innerHTML = '';
    
    // Validation
    if (!privateKey) {
        showFullProtectionNotification('Please enter your private key', 'error');
        return;
    }
    
    if (!confirmed) {
        showFullProtectionNotification('Please confirm that you understand the risks', 'error');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Enabling Protection...</span>
    `;
    
    try {
        // Check if walletState is available
        if (!window.walletState) {
            throw new Error('Wallet state manager not available');
        }
        
        // Check current wallet state
        const currentState = window.walletState.getState();
        if (currentState.status !== 'connected' || currentState.mode !== 'watch') {
            throw new Error('Wallet must be connected in watch mode to upgrade to full protection');
        }
        
        // Use the new switchToFull method
        const result = await window.walletState.switchToFull(privateKey);
        
        // Show success notification
        showFullProtectionNotification('Successfully upgraded to full protection!', 'success');
        
        // Update localStorage for backwards compatibility
        localStorage.setItem('fullProtectionEnabled', 'true');
        localStorage.setItem('protectionMode', 'full');
        
        // Close modal after short delay
        setTimeout(() => {
            closeFullProtectionModal();
            
            // Trigger page refresh to update UI components
            if (window.bannerController) {
                window.bannerController.refresh();
            }
        }, 1500);
        
    } catch (error) {
        console.error('Full protection setup failed:', error);
        showFullProtectionNotification('Failed to enable full protection: ' + error.message, 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
    }
});

// Show notification within modal
function showFullProtectionNotification(message, type = 'info') {
    const container = document.getElementById('full-protection-notifications');
    const colors = {
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    };
    
    const icons = {
        success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
        warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
        info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    };
    
    container.innerHTML = `
        <div class="border rounded-lg p-4 mb-4 ${colors[type]} animate-fade-in">
            <div class="flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${icons[type]}
                </svg>
                <div>
                    <p class="text-sm">${message}</p>
                </div>
            </div>
        </div>
    `;
}

// Update protection status in UI - now uses BannerController
function updateProtectionStatus(isProtected) {
    // Banner visibility is now handled by BannerController based on WalletState changes
    // The BannerController will automatically update banners when WalletState changes
    
    // Just update localStorage for backwards compatibility
    localStorage.setItem('fullProtectionEnabled', isProtected.toString());
    
    // Trigger a BannerController refresh if available
    if (window.bannerController) {
        window.bannerController.refresh();
    }
}

// Check protection status on page load
function checkProtectionStatus() {
    const protectionMode = localStorage.getItem('protectionMode');
    const isFullProtection = protectionMode === 'full';
    updateProtectionStatus(isFullProtection);
}

// Backdrop click to cancel - only close if clicked directly on backdrop
const fullProtectionBackdrop = document.getElementById('full-protection-backdrop');
const fullProtectionContent = document.querySelector('#full-protection-modal .animate-scale-in');

if (fullProtectionBackdrop) {
    fullProtectionBackdrop.addEventListener('click', (e) => {
        if (e.target === fullProtectionBackdrop) {
            closeFullProtectionModal();
        }
    });
}

// Stop propagation on modal content to avoid accidental cancel
if (fullProtectionContent) {
    fullProtectionContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('full-protection-modal').classList.contains('hidden')) {
        closeFullProtectionModal();
    }
});

// Initialize protection status check
document.addEventListener('DOMContentLoaded', checkProtectionStatus);

// Listen for wallet adapter events
if (window.walletAdapter) {
    window.walletAdapter.on('upgrade_full', () => {
        updateProtectionStatus(true);
    });
    
    window.walletAdapter.on('disconnect', () => {
        updateProtectionStatus(false);
    });
}
</script>
