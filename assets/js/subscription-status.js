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
        // Check localStorage for saved wallet
        const savedWallet = localStorage.getItem('connectedWallet');
        if (savedWallet) return savedWallet;
        
        // Check if Phantom is connected
        if (window.solana && window.solana.isConnected) {
            try {
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                const wallet = resp.publicKey.toString();
                localStorage.setItem('connectedWallet', wallet);
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
            const response = await fetch(`/api/get-subscription-status.php?wallet=${this.walletAddress}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentSubscription = data.subscription;
            } else {
                this.currentSubscription = null;
            }
        } catch (err) {
            console.error('Failed to check subscription:', err);
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
            upgradeBtn: document.querySelector('[data-upgrade-btn]')
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
}

// Initialize subscription manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const subscriptionManager = new SubscriptionManager();
    subscriptionManager.init();
    
    // Make it globally available
    window.subscriptionManager = subscriptionManager;
});