// Subscription Status Manager for Dashboard
class SubscriptionManager {
    constructor() {
        this.currentSubscription = null;
        this.walletAddress = null;
    }
    
    async init() {
        // Check if wallet is connected
        this.walletAddress = await this.getConnectedWallet();
        
        if (this.walletAddress) {
            await this.checkSubscriptionStatus();
            this.updateUI();
        }
        
        // Set up periodic checks
        setInterval(() => this.checkSubscriptionStatus(), 60000); // Check every minute
    }
    
    async getConnectedWallet() {
        // Check localStorage for saved wallet - use consistent key
        const savedWallet = localStorage.getItem('walletAddress');
        if (savedWallet) return savedWallet;
        
        // Check if Phantom is connected
        if (window.solana && window.solana.isConnected) {
            try {
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                const wallet = resp.publicKey.toString();
                localStorage.setItem('walletAddress', wallet);
                return wallet;
            } catch (err) {
                console.log('No trusted wallet connection');
            }
        }
        
        return null;
    }
    
    async checkSubscriptionStatus() {
        if (!this.walletAddress) return;
        
        try {
            // Use relative path to work regardless of deployment location
            const response = await fetch(`api/get-subscription-status.php?wallet=${this.walletAddress}`);
            
            // Check if response is ok
            if (!response.ok) {
                console.error('Subscription API returned error:', response.status);
                this.currentSubscription = null;
                return;
            }
            
            const data = await response.json();
            
            // Handle the response data
            if (data.wallet) {
                this.currentSubscription = data.subscription || {
                    status: 'active',
                    plan: 'free',
                    features: {
                        maxTokens: 5,
                        maxProtections: 3,
                        realtimeAlerts: true,
                        autoProtection: false,
                        priorityExecution: false
                    }
                };
            } else {
                this.currentSubscription = null;
            }
        } catch (err) {
            console.error('Failed to check subscription:', err);
            // Set default free subscription on error
            this.currentSubscription = {
                status: 'active',
                plan: 'free',
                features: {
                    maxTokens: 5,
                    maxProtections: 3,
                    realtimeAlerts: true,
                    autoProtection: false,
                    priorityExecution: false
                }
            };
        }
    }
    
    updateUI() {
        const elements = {
            planName: document.querySelector('[data-subscription-plan]'),
            protectedTokens: document.querySelector('[data-protected-tokens]'),
            maxTokens: document.querySelector('[data-max-tokens]'),
            responseTime: document.querySelector('[data-response-time]'),
            dexCoverage: document.querySelector('[data-dex-coverage]'),
            features: document.querySelector('[data-subscription-features]'),
            upgradeBtn: document.querySelector('[data-upgrade-btn]'),
            // New elements for subscription management
            subscriptionStatus: document.getElementById('subscription-status'),
            memberSince: document.getElementById('member-since'),
            paymentMethod: document.getElementById('payment-method'),
            paymentWallet: document.getElementById('payment-wallet'),
            nextPaymentDate: document.getElementById('next-payment-date'),
            nextPaymentAmount: document.getElementById('next-payment-amount'),
            autoRenewalSettings: document.getElementById('auto-renewal-settings'),
            autoRenewToggle: document.getElementById('auto-renew-toggle'),
            cancelBtn: document.getElementById('cancel-subscription-btn')
        };
        
        if (!this.currentSubscription || this.currentSubscription.plan === 'Basic') {
            // Free/Basic tier
            if (elements.planName) elements.planName.textContent = 'Basic (Free)';
            if (elements.maxTokens) elements.maxTokens.textContent = '5';
            if (elements.responseTime) elements.responseTime.textContent = '< 5s';
            if (elements.dexCoverage) elements.dexCoverage.textContent = 'Raydium only';
            
            // Show upgrade prompts
            this.showUpgradePrompts();
        } else {
            // Paid tier
            const plan = this.currentSubscription.plan;
            const features = this.currentSubscription.features;
            
            if (elements.planName) {
                elements.planName.textContent = plan;
                elements.planName.classList.add('text-gradient');
            }
            
            if (elements.maxTokens) elements.maxTokens.textContent = features.max_tokens || 'Unlimited';
            if (elements.responseTime) elements.responseTime.textContent = features.response_time || '< 1s';
            if (elements.dexCoverage) elements.dexCoverage.textContent = features.dex_coverage || 'All DEXs';
            
            // Update features list
            if (elements.features) {
                const featuresList = this.getFeaturesList(plan);
                elements.features.innerHTML = featuresList.map(f => 
                    `<div class="flex items-center space-x-2 text-sm">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-300">${f}</span>
                    </div>`
                ).join('');
            }
            
            // Show days remaining
            if (this.currentSubscription.expires_at) {
                this.showExpirationInfo();
            }
            
            // Update subscription management UI
            this.updateSubscriptionManagement(elements);
        }
    }
    
    getFeaturesList(plan) {
        const features = {
            'Pro': [
                'Up to 50 protected tokens',
                '< 2 second response time',
                'Major DEX coverage',
                'Email & Telegram alerts',
                'Basic MEV protection'
            ],
            'Degen Mode': [
                'Up to 100 protected tokens',
                '< 1 second response time',
                'Memecoin launchpad coverage',
                'Pump.fun integration',
                'Jito bundle protection'
            ],
            'Enterprise': [
                'Unlimited protected tokens',
                '< 1 second response time',
                'All DEXs + Private pools',
                'Dedicated account manager',
                'Custom MEV protection'
            ]
        };
        
        return features[plan] || features['Pro'];
    }
    
    showUpgradePrompts() {
        // Add upgrade prompts to relevant sections
        const tokenList = document.querySelector('.token-list');
        if (tokenList && document.querySelectorAll('.token-row').length >= 5) {
            const banner = document.createElement('div');
            banner.className = 'mt-4 p-4 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-600/20 border border-orange-500/30';
            banner.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-semibold text-white">Token Limit Reached</h4>
                        <p class="text-sm text-gray-300 mt-1">Upgrade to Pro to protect up to 50 tokens</p>
                    </div>
                    <button onclick="openPaymentModal('pro', 0.99, 161.04)" class="btn btn-primary btn-sm">
                        Upgrade Now
                    </button>
                </div>
            `;
            tokenList.appendChild(banner);
        }
    }
    
    showExpirationInfo() {
        const expiresAt = new Date(this.currentSubscription.expires_at);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 7) {
            // Show renewal reminder
            const header = document.querySelector('main > div:first-child');
            if (header && !document.querySelector('.renewal-reminder')) {
                const reminder = document.createElement('div');
                reminder.className = 'renewal-reminder mb-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30';
                reminder.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div>
                                <span class="font-semibold text-white">Subscription Expiring Soon</span>
                                <p class="text-sm text-gray-300">
                                    Your ${this.currentSubscription.plan} plan expires in ${daysRemaining} days
                                </p>
                            </div>
                        </div>
                        <button onclick="openPaymentModal('${this.currentSubscription.plan.toLowerCase().replace(' ', '-')}', ${this.getSOLPrice(this.currentSubscription.plan)}, ${this.getUSDPrice(this.currentSubscription.plan)})" class="btn btn-primary btn-sm">
                            Renew Now
                        </button>
                    </div>
                `;
                header.parentNode.insertBefore(reminder, header);
            }
        }
    }
    
    getSOLPrice(plan) {
        const prices = {
            'Pro': 0.99,
            'Degen Mode': 1.99,
            'Enterprise': 2.99
        };
        return prices[plan] || 0.99;
    }
    
    getUSDPrice(plan) {
        const prices = {
            'Pro': 161.04,
            'Degen Mode': 323.63,
            'Enterprise': 486.12
        };
        return prices[plan] || 161.04;
    }
    
    updateSubscriptionManagement(elements) {
        if (!this.currentSubscription) return;
        
        const sub = this.currentSubscription;
        
        // Update status
        if (elements.subscriptionStatus) {
            elements.subscriptionStatus.textContent = sub.status || 'Active';
            elements.subscriptionStatus.className = `text-xs px-2 py-1 rounded-full ${
                sub.status === 'active' ? 'bg-green-500/20 text-green-400' :
                sub.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
            }`;
        }
        
        // Update member since
        if (elements.memberSince && sub.created_at) {
            const date = new Date(sub.created_at);
            elements.memberSince.textContent = date.toLocaleDateString();
        }
        
        // Update payment method
        if (elements.paymentMethod) {
            elements.paymentMethod.textContent = sub.payment_method === 'stripe' ? 'Credit Card' : 'Solana';
            
            // Update icon
            const icon = document.getElementById('payment-method-icon');
            if (icon) {
                if (sub.payment_method === 'stripe') {
                    icon.innerHTML = '<i class="fas fa-credit-card text-blue-400"></i>';
                    icon.className = 'w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center';
                } else {
                    icon.innerHTML = '<span class="text-purple-400 text-lg">◎</span>';
                    icon.className = 'w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center';
                }
            }
        }
        
        // Update payment wallet
        if (elements.paymentWallet && sub.payment_wallet) {
            const wallet = sub.payment_wallet;
            elements.paymentWallet.textContent = wallet.slice(0, 4) + '...' + wallet.slice(-4);
        }
        
        // Update next payment
        if (elements.nextPaymentDate) {
            if (sub.next_payment_date) {
                const date = new Date(sub.next_payment_date);
                elements.nextPaymentDate.textContent = date.toLocaleDateString();
                
                // Calculate days until next payment
                const now = new Date();
                const daysUntil = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 1) {
                    elements.nextPaymentDate.innerHTML += ' <span class="text-xs text-yellow-400">(Tomorrow)</span>';
                } else if (daysUntil <= 7) {
                    elements.nextPaymentDate.innerHTML += ` <span class="text-xs text-gray-400">(in ${daysUntil} days)</span>`;
                }
            } else {
                elements.nextPaymentDate.textContent = 'N/A';
            }
        }
        
        // Update next payment amount
        if (elements.nextPaymentAmount) {
            if (sub.payment_method === 'sol' && sub.amount_sol) {
                elements.nextPaymentAmount.textContent = `${sub.amount_sol} SOL`;
            } else if (sub.amount) {
                elements.nextPaymentAmount.textContent = `$${sub.amount}`;
            }
        }
        
        // Show/hide auto-renewal settings for hot wallet users
        if (elements.autoRenewalSettings && sub.is_hot_wallet && sub.payment_method === 'sol') {
            elements.autoRenewalSettings.classList.remove('hidden');
            
            if (elements.autoRenewToggle) {
                elements.autoRenewToggle.checked = sub.auto_renew !== false;
            }
        }
        
        // Show/hide cancel button for active subscriptions
        if (elements.cancelBtn && sub.plan !== 'free' && sub.status === 'active') {
            elements.cancelBtn.classList.remove('hidden');
        }
    }
}

// Initialize subscription manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const subscriptionManager = new SubscriptionManager();
    subscriptionManager.init();
    
    // Make it globally available
    window.subscriptionManager = subscriptionManager;
});