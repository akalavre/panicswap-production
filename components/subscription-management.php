<!-- Subscription Management Component -->
<div id="subscription-management" class="mb-8">
    <div class="card-dark rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-white">Subscription Details</h2>
            <button class="text-sm text-gray-400 hover:text-white transition-colors" onclick="refreshSubscriptionStatus()">
                <i class="fas fa-sync-alt mr-2"></i>Refresh
            </button>
        </div>
        
        <!-- Subscription Info -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <!-- Current Plan -->
            <div class="bg-gray-900/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-400">Current Plan</span>
                    <span class="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400" id="subscription-status">Active</span>
                </div>
                <p class="text-2xl font-bold text-white" data-subscription-plan>Free</p>
                <p class="text-xs text-gray-500 mt-1">Member since <span id="member-since">-</span></p>
            </div>
            
            <!-- Payment Method -->
            <div class="bg-gray-900/50 rounded-lg p-4">
                <p class="text-sm text-gray-400 mb-2">Payment Method</p>
                <div class="flex items-center space-x-3">
                    <div id="payment-method-icon" class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span class="text-purple-400 text-lg">◎</span>
                    </div>
                    <div>
                        <p class="text-white font-medium" id="payment-method">Solana</p>
                        <p class="text-xs text-gray-500" id="payment-wallet">-</p>
                    </div>
                </div>
            </div>
            
            <!-- Next Payment -->
            <div class="bg-gray-900/50 rounded-lg p-4">
                <p class="text-sm text-gray-400 mb-2">Next Payment</p>
                <p class="text-lg font-semibold text-white" id="next-payment-date">-</p>
                <p class="text-sm text-gray-500" id="next-payment-amount">-</p>
            </div>
        </div>
        
        <!-- Auto-Renewal Settings (for hot wallet users) -->
        <div id="auto-renewal-settings" class="hidden mb-6">
            <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="font-semibold text-white mb-2">Automatic Renewal</h3>
                        <p class="text-sm text-gray-400 mb-3">Your subscription will automatically renew every week. We'll charge your hot wallet 24 hours before the renewal date.</p>
                        
                        <div class="flex items-center space-x-4">
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-renew-toggle" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                <span class="ml-3 text-sm font-medium text-gray-300">Auto-renew enabled</span>
                            </label>
                            
                            <button id="update-auto-renew" class="text-sm text-orange-400 hover:text-orange-300 hidden">
                                Save Changes
                            </button>
                        </div>
                        
                        <div id="auto-renew-warning" class="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hidden">
                            <p class="text-sm text-yellow-400">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Disabling auto-renewal means your subscription will expire on the next billing date. You can re-enable it anytime before expiration.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Subscription Features -->
        <div class="border-t border-gray-800 pt-6">
            <h3 class="font-semibold text-white mb-4">Plan Features</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4" data-subscription-features>
                <!-- Features will be populated by JavaScript -->
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="mt-6 flex flex-wrap gap-3">
            <button id="manage-subscription-btn" class="btn btn-secondary" onclick="window.location.href='/subscription'">
                <i class="fas fa-cog mr-2"></i>Manage Subscription
            </button>
            
            <button id="view-invoices-btn" class="btn btn-secondary" onclick="viewInvoices()">
                <i class="fas fa-file-invoice mr-2"></i>View Invoices
            </button>
            
            <button id="cancel-subscription-btn" class="text-red-400 hover:text-red-300 transition-colors hidden" onclick="showCancelModal()">
                Cancel Subscription
            </button>
        </div>
    </div>
</div>

<!-- Cancel Subscription Modal -->
<div id="cancel-subscription-modal" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onclick="hideCancelModal()"></div>
    <div class="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div class="danger-card max-w-md w-full p-6 animate-scale-in">
            <h3 class="text-xl font-bold text-white mb-4">Cancel Subscription?</h3>
            <p class="text-gray-400 mb-6">
                Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
            </p>
            
            <div class="bg-gray-800/50 rounded-lg p-4 mb-6">
                <p class="text-sm font-semibold text-white mb-2">You'll lose access to:</p>
                <ul class="space-y-1 text-sm text-gray-400">
                    <li>• Protection for more than 5 tokens</li>
                    <li>• Fast response times (< 2s)</li>
                    <li>• Multi-DEX coverage</li>
                    <li>• Priority support</li>
                </ul>
            </div>
            
            <div class="flex space-x-3">
                <button class="btn btn-secondary flex-1" onclick="hideCancelModal()">
                    Keep Subscription
                </button>
                <button class="btn btn-danger flex-1" onclick="confirmCancelSubscription()">
                    Yes, Cancel
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Auto-renewal toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const autoRenewToggle = document.getElementById('auto-renew-toggle');
    const updateBtn = document.getElementById('update-auto-renew');
    const warning = document.getElementById('auto-renew-warning');
    
    if (autoRenewToggle) {
        let originalState = autoRenewToggle.checked;
        
        autoRenewToggle.addEventListener('change', function() {
            updateBtn.classList.toggle('hidden', this.checked === originalState);
            warning.classList.toggle('hidden', this.checked);
        });
        
        updateBtn.addEventListener('click', async function() {
            const newState = autoRenewToggle.checked;
            
            try {
                const response = await fetch('api/update-auto-renewal.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet: localStorage.getItem('walletAddress'),
                        auto_renew: newState
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    originalState = newState;
                    updateBtn.classList.add('hidden');
                    
                    // Show success notification
                    showNotification('Auto-renewal settings updated', 'success');
                } else {
                    // Revert toggle
                    autoRenewToggle.checked = originalState;
                    showNotification('Failed to update settings', 'error');
                }
            } catch (err) {
                console.error('Failed to update auto-renewal:', err);
                autoRenewToggle.checked = originalState;
                showNotification('Failed to update settings', 'error');
            }
        });
    }
});

function showCancelModal() {
    const modal = document.getElementById('cancel-subscription-modal');
    const modalContent = modal.querySelector('.danger-card');
    
    // Remove pointer-events-none to allow interaction
    document.body.style.pointerEvents = 'auto';
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Trigger scale-in animation
    if (modalContent) {
        modalContent.classList.add('animate-scale-in');
    }
}

function hideCancelModal() {
    const modal = document.getElementById('cancel-subscription-modal');
    const modalContent = modal.querySelector('.danger-card');
    
    if (modalContent) {
        // Remove scale-in and add scale-out
        modalContent.classList.remove('animate-scale-in');
        modalContent.classList.add('animate-scale-out');
        
        // Wait for animation to complete
        setTimeout(() => {
            modal.classList.add('hidden');
            modalContent.classList.remove('animate-scale-out');
        }, 300);
    } else {
        modal.classList.add('hidden');
    }
}

async function confirmCancelSubscription() {
    try {
        const response = await fetch('api/cancel-subscription.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: localStorage.getItem('walletAddress')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            hideCancelModal();
            showNotification('Subscription cancelled. You have access until ' + data.expires_at, 'success');
            refreshSubscriptionStatus();
        } else {
            showNotification('Failed to cancel subscription', 'error');
        }
    } catch (err) {
        console.error('Failed to cancel subscription:', err);
        showNotification('Failed to cancel subscription', 'error');
    }
}

function viewInvoices() {
    // This would open an invoices modal or redirect to invoices page
    window.location.href = 'invoices.php';
}

function refreshSubscriptionStatus() {
    if (window.subscriptionManager) {
        window.subscriptionManager.checkSubscriptionStatus();
        window.subscriptionManager.updateUI();
    }
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg ${
        type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
        type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
        'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    } animate-fade-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('animate-fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
</script>