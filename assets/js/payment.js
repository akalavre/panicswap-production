// Payment System for PanicSwap
// Get configuration from global scope to avoid temporal dead zone issues
const SOLANA_RPC = window.PaymentConfig?.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const MERCHANT_WALLET = window.PaymentConfig?.MERCHANT_WALLET || "5kUXfkUbawYtMxvGJtfcZXDgf5FJ7YnxDqki9QMEiMtB";
const SOL_PRICE = window.PaymentConfig?.SOL_PRICE || 140;
const PLANS = window.PaymentConfig?.PLANS || {
    pro: {
        name: 'Pro',
        solPrice: 0.56,
        usdPrice: 79,
        weeklySOL: 0.141,
        weeklyUSD: 19.75,
        features: 'Up to 50 tokens, < 2s response'
    },
    degen: {
        name: 'Degen Mode',
        solPrice: 1.06,
        usdPrice: 149,
        weeklySOL: 0.266,
        weeklyUSD: 37.25,
        features: 'Up to 100 tokens, < 1s response, Pump.fun'
    },
    enterprise: {
        name: 'Enterprise',
        solPrice: 2.85,
        usdPrice: 399,
        weeklySOL: 0.713,
        weeklyUSD: 99.75,
        features: 'Unlimited tokens, all DEXs, dedicated support'
    }
};

let selectedPlan = null;
let selectedPaymentMethod = 'sol';
let provider = null;
let publicKey = null;

// Check if wallet adapter is available
function checkWalletAdapter() {
    return typeof window.walletAdapter !== 'undefined' && window.walletAdapter;
}

// Initialize payment modal
function initializePaymentModal() {
    const modal = document.getElementById('payment-modal');
    const backdrop = document.getElementById('payment-modal-backdrop');
    const closeBtn = document.getElementById('close-payment-modal');
    
    // Close modal handlers
    [backdrop, closeBtn].forEach(element => {
        if (element) {
            element.addEventListener('click', closePaymentModal);
        }
    });
    
    // Payment method selection
    const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
    paymentMethodInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            selectedPaymentMethod = e.target.value;
            updatePaymentSection();
        });
    });
    
    // Wallet connection
    const connectBtn = document.getElementById('connect-wallet-btn');
    const disconnectBtn = document.getElementById('disconnect-wallet-btn');
    const payWithSolBtn = document.getElementById('pay-with-sol-btn');
    const payWithStripeBtn = document.getElementById('pay-with-stripe-btn');
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectWallet);
    if (payWithSolBtn) payWithSolBtn.addEventListener('click', processSOLPayment);
    if (payWithStripeBtn) payWithStripeBtn.addEventListener('click', processStripePayment);
    
    // Transaction modal handlers
    const goToDashboardBtn = document.getElementById('go-to-dashboard-btn');
    const retryPaymentBtn = document.getElementById('retry-payment-btn');
    
    if (goToDashboardBtn) goToDashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard.php';
    });
    
    if (retryPaymentBtn) retryPaymentBtn.addEventListener('click', () => {
        hideTransactionModal();
        showPaymentModal();
    });
}

// Open payment modal with selected plan
function openPaymentModal(planId, solPrice, usdPrice) {
    // Ensure PLANS is defined
    if (typeof PLANS === 'undefined' || !PLANS[planId]) {
        console.error('Payment plans not loaded yet or invalid plan ID:', planId);
        return;
    }
    
    selectedPlan = PLANS[planId];
    
    // Check if modal elements exist
    const planNameEl = document.getElementById('selected-plan-name');
    const planFeaturesEl = document.getElementById('selected-plan-features');
    
    if (!planNameEl || !planFeaturesEl) {
        console.error('Payment modal elements not found');
        return;
    }
    
    // Update modal content
    planNameEl.textContent = selectedPlan.name;
    planFeaturesEl.textContent = selectedPlan.features;
    
    // Update SOL prices
    const solWeeklyEl = document.getElementById('sol-price-weekly');
    const solMonthlyEl = document.getElementById('sol-price-monthly');
    const solAmountEl = document.getElementById('sol-payment-amount');
    
    if (solWeeklyEl) solWeeklyEl.textContent = selectedPlan.weeklySOL.toFixed(3);
    if (solMonthlyEl) solMonthlyEl.textContent = selectedPlan.solPrice;
    if (solAmountEl) solAmountEl.textContent = selectedPlan.solPrice;
    
    // Update USD prices
    const usdWeeklyEl = document.getElementById('usd-price-weekly');
    const usdMonthlyEl = document.getElementById('usd-price-monthly');
    const usdAmountEl = document.getElementById('usd-payment-amount');
    
    if (usdWeeklyEl) usdWeeklyEl.textContent = selectedPlan.weeklyUSD.toFixed(2);
    if (usdMonthlyEl) usdMonthlyEl.textContent = selectedPlan.usdPrice.toFixed(2);
    if (usdAmountEl) usdAmountEl.textContent = selectedPlan.usdPrice.toFixed(2);
    
    showPaymentModal();
}

// Show/hide payment modal
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Check if wallet is already connected
    const walletAddress = localStorage.getItem('walletAddress') || publicKey || window.walletAdapter?.publicKey;
    const walletType = localStorage.getItem('walletType');
    
    if (walletAddress) {
        // Wallet is connected, update the UI
        document.getElementById('wallet-not-connected').classList.add('hidden');
        document.getElementById('wallet-connected').classList.remove('hidden');
        document.getElementById('connected-wallet-address').textContent = 
            walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);
        
        // Update publicKey if not set
        if (!publicKey) {
            publicKey = walletAddress;
        }
        
        // Update wallet balance display for hot wallets
        if (walletType === 'hot') {
            const balanceEl = document.getElementById('wallet-balance');
            if (balanceEl) {
                balanceEl.textContent = 'Hot wallet connected';
            }
        } else {
            // Check balance for browser wallets
            checkWalletBalance();
        }
    } else {
        // Wallet not connected
        document.getElementById('wallet-not-connected').classList.remove('hidden');
        document.getElementById('wallet-connected').classList.add('hidden');
    }
    
    updatePaymentSection();
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Update payment section based on selected method
function updatePaymentSection() {
    const solSection = document.getElementById('sol-payment-section');
    const usdSection = document.getElementById('usd-payment-section');
    const walletType = localStorage.getItem('walletType');
    
    if (selectedPaymentMethod === 'sol') {
        solSection.classList.remove('hidden');
        usdSection.classList.add('hidden');
        
        // Update payment button text for hot wallets
        if (walletType === 'hot') {
            const payBtn = document.getElementById('pay-with-sol-btn');
            if (payBtn && selectedPlan) {
                payBtn.innerHTML = `Process Payment with Hot Wallet - ${selectedPlan.solPrice} SOL`;
            }
        } else {
            // Reset button text for browser wallets
            const payBtn = document.getElementById('pay-with-sol-btn');
            if (payBtn && selectedPlan) {
                payBtn.innerHTML = `Pay <span id="sol-payment-amount">${selectedPlan.solPrice}</span> SOL`;
            }
        }
    } else {
        solSection.classList.add('hidden');
        usdSection.classList.remove('hidden');
    }
}

// Wallet Connection Functions
async function connectWallet() {
    try {
        // Check if wallet adapter is available
        if (!checkWalletAdapter()) {
            showNotification('Wallet adapter not loaded yet. Please try again.', 'error');
            return;
        }
        
        // Show wallet selection modal
        const walletModal = await showWalletSelectionModal();
        if (!walletModal) return;
        
        // Connect to selected wallet
        publicKey = await window.walletAdapter.connect(walletModal);
        provider = window.walletAdapter.provider;
        
        // Update UI
        const walletNotConnected = document.getElementById('wallet-not-connected');
        const walletConnected = document.getElementById('wallet-connected');
        const addressElement = document.getElementById('connected-wallet-address');
        const autoRenewalConsent = document.getElementById('auto-renewal-consent');
        
        if (walletNotConnected) walletNotConnected.classList.add('hidden');
        if (walletConnected) walletConnected.classList.remove('hidden');
        if (addressElement) {
            addressElement.textContent = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        }
        
        // Show auto-renewal consent for hot wallets
        const walletType = localStorage.getItem('walletType');
        if (autoRenewalConsent && walletType === 'hot') {
            autoRenewalConsent.classList.remove('hidden');
            // Default to checked for hot wallets
            const checkbox = document.getElementById('auto-renew-checkbox');
            if (checkbox) checkbox.checked = true;
        }
        
        // Store wallet preference
        localStorage.setItem('preferredWallet', walletModal);
        localStorage.setItem('connectedWallet', publicKey);
        localStorage.setItem('walletAddress', publicKey);
        
        // Check wallet balance
        await checkWalletBalance();
        
    } catch (err) {
        console.error('Wallet connection failed:', err);
        if (err.message.includes('No Solana wallet found')) {
            showWalletInstallPrompt();
        } else {
            showNotification('Failed to connect wallet: ' + err.message, 'error');
        }
    }
}

async function disconnectWallet() {
    if (window.walletAdapter) {
        await window.walletAdapter.disconnect();
    }
    
    publicKey = null;
    provider = null;
    
    // Clear stored data
    localStorage.removeItem('connectedWallet');
    
    // Update UI
    document.getElementById('wallet-not-connected').classList.remove('hidden');
    document.getElementById('wallet-connected').classList.add('hidden');
}

async function checkWalletBalance() {
    try {
        // Use the public key from localStorage if walletAdapter not ready
        const walletPubkey = publicKey || localStorage.getItem('walletAddress');
        const walletType = localStorage.getItem('walletType');
        
        if (!walletPubkey) {
            console.error('No wallet address available');
            return false;
        }
        
        // For hot wallets, skip balance check (backend will handle it)
        if (walletType === 'hot') {
            const balanceDisplay = document.getElementById('wallet-balance');
            if (balanceDisplay) {
                balanceDisplay.textContent = 'Hot wallet';
            }
            return true; // Assume hot wallet has balance
        }
        
        // Create connection without custom headers (causes CORS issues)
        const connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');
        
        // Get balance directly if walletAdapter not ready
        let solBalance;
        if (window.walletAdapter && window.walletAdapter.getBalance) {
            solBalance = await window.walletAdapter.getBalance(connection);
        } else {
            // Fallback: get balance directly
            try {
                const pubkey = new solanaWeb3.PublicKey(walletPubkey);
                const lamports = await connection.getBalance(pubkey);
                solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
            } catch (rpcError) {
                console.warn('RPC error getting balance:', rpcError);
                // For hot wallets, assume they have balance
                if (walletType === 'hot') {
                    solBalance = 10; // Assume enough balance
                } else {
                    throw rpcError;
                }
            }
        }
        
        // Update balance display
        const balanceDisplay = document.getElementById('wallet-balance');
        if (balanceDisplay) {
            balanceDisplay.textContent = `${solBalance.toFixed(4)} SOL`;
        }
        
        // Check if user has enough SOL
        const requiredAmount = selectedPlan.solPrice + 0.002; // Add network fee buffer
        if (solBalance < requiredAmount) {
            const shortfall = requiredAmount - solBalance;
            showInsufficientBalanceModal(requiredAmount, solBalance, shortfall);
            return false;
        }
        
        return true;
        
    } catch (err) {
        console.error('Balance check failed:', err);
        return false;
    }
}

// Process SOL Payment
async function processSOLPayment() {
    // Check for wallet connection (either browser wallet or hot wallet)
    const walletAddress = publicKey || localStorage.getItem('walletAddress') || window.walletAdapter?.publicKey;
    const walletType = localStorage.getItem('walletType');
    
    if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    // For hot wallets, we need to handle the payment differently
    if (walletType === 'hot') {
        await processHotWalletPayment(walletAddress);
        return;
    }
    
    // Check if browser wallet is connected
    if (!publicKey || !provider) {
        showNotification('Please connect your browser wallet to continue', 'error');
        return;
    }
    
    // Check balance
    const hasBalance = await checkWalletBalance();
    if (!hasBalance) return;
    
    // Show transaction modal
    showTransactionModal('processing');
    closePaymentModal();
    
    try {
        const connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');
        const fromPubkey = new solanaWeb3.PublicKey(publicKey);
        const toPubkey = new solanaWeb3.PublicKey(MERCHANT_WALLET);
        
        // Create transaction
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: selectedPlan.solPrice * solanaWeb3.LAMPORTS_PER_SOL,
            })
        );
        
        // Set recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        // Send transaction
        const { signature } = await window.walletAdapter.signAndSendTransaction(transaction);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Save subscription to database
        await saveSubscription({
            wallet: publicKey,
            plan: selectedPlan.name,
            amount: selectedPlan.solPrice,
            currency: 'SOL',
            txSignature: signature,
            status: 'active'
        });
        
        // Show success
        showTransactionModal('success');
        
    } catch (err) {
        console.error('Payment failed:', err);
        showTransactionModal('error', err.message || 'Transaction failed');
    }
}

// Process Stripe Payment
async function processStripePayment() {
    // Check if wallet is connected for USD payment
    const walletAddress = publicKey || localStorage.getItem('connectedWallet');
    
    if (!walletAddress) {
        // Show wallet connection prompt
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
            <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6 animate-scale-in">
                <h3 class="text-xl font-bold text-white mb-4">Wallet Required</h3>
                <p class="text-gray-400 mb-6">Please connect your wallet to continue with the subscription. Your wallet address will be linked to your payment.</p>
                <button onclick="this.closest('.fixed').remove(); document.getElementById('connect-wallet-btn').click()" class="w-full btn btn-primary">
                    Connect Wallet
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        return;
    }
    
    // Show processing state
    showTransactionModal('processing');
    closePaymentModal();
    
    try {
        // Create Stripe checkout session
        const response = await fetch('api/create-checkout-session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: selectedPlan.name.toLowerCase().replace(' ', '-'),
                walletAddress: walletAddress
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.url) {
                // Save session ID for tracking
                localStorage.setItem('stripe_session_id', data.sessionId);
                // Redirect to Stripe checkout
                window.location.href = data.url;
            }
        } else {
            // Handle different error types
            if (data.setupRequired) {
                showTransactionModal('error', 'Stripe is not installed. Please contact support to enable credit card payments.');
            } else if (data.configRequired) {
                showTransactionModal('error', 'Stripe is not configured. Please contact support to enable credit card payments.');
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        }
        
    } catch (err) {
        console.error('Stripe payment failed:', err);
        showTransactionModal('error', err.message || 'Failed to process payment. Please try again.');
    }
}

// Save subscription to database
async function saveSubscription(subscriptionData) {
    try {
        const response = await fetch('api/save-subscription.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to save subscription');
        }
        
        return data;
        
    } catch (err) {
        console.error('Failed to save subscription:', err);
        // Continue anyway - payment was successful
    }
}

// Transaction Modal Functions
function showTransactionModal(state, errorMessage = '') {
    const modal = document.getElementById('transaction-modal');
    const processingDiv = document.getElementById('transaction-processing');
    const successDiv = document.getElementById('transaction-success');
    const errorDiv = document.getElementById('transaction-error');
    
    // Hide all states
    [processingDiv, successDiv, errorDiv].forEach(div => div.classList.add('hidden'));
    
    // Show requested state
    switch(state) {
        case 'processing':
            processingDiv.classList.remove('hidden');
            break;
        case 'success':
            successDiv.classList.remove('hidden');
            break;
        case 'error':
            errorDiv.classList.remove('hidden');
            if (errorMessage) {
                document.getElementById('error-message').textContent = errorMessage;
            }
            break;
    }
    
    modal.classList.remove('hidden');
}

function hideTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.add('hidden');
}

// Wallet Selection Modal
async function showWalletSelectionModal() {
    return new Promise((resolve) => {
        if (!window.walletAdapter) {
            resolve(null);
            return;
        }
        
        const wallets = window.walletAdapter.getSupportedWallets();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
            <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6 animate-scale-in">
                <h3 class="text-xl font-bold text-white mb-4">Select Wallet</h3>
                <div class="space-y-3">
                    ${Object.entries(wallets).map(([key, wallet]) => `
                        <button onclick="selectWallet('${key}')" class="w-full p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-orange-500 transition-all flex items-center space-x-4">
                            <img src="${wallet.icon}" alt="${wallet.name}" class="w-10 h-10">
                            <div class="text-left">
                                <div class="font-semibold text-white">${wallet.name}</div>
                                <div class="text-xs text-gray-400">${wallet.adapter ? 'Detected' : 'Not installed'}</div>
                            </div>
                            ${wallet.adapter ? '<svg class="w-5 h-5 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
                        </button>
                    `).join('')}
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.selectWallet = (walletKey) => {
            modal.remove();
            resolve(walletKey);
        };
    });
}

// Show wallet install prompt
function showWalletInstallPrompt() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6 animate-scale-in">
            <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Wallet Required</h3>
                <p class="text-gray-400 mb-6">To pay with Solana, you need to install a wallet extension.</p>
                <div class="space-y-3">
                    <a href="https://phantom.app/" target="_blank" class="block w-full p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all">
                        Install Phantom Wallet
                    </a>
                    <a href="https://solflare.com/" target="_blank" class="block w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all">
                        Install Solflare Wallet
                    </a>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 text-sm text-gray-400 hover:text-white">
                    I'll pay with card instead
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show insufficient balance modal
function showInsufficientBalanceModal(required, current, shortfall) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6 animate-scale-in">
            <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Insufficient Balance</h3>
                <p class="text-gray-400 mb-4">You don't have enough SOL to complete this transaction.</p>
                <div class="space-y-2 text-sm mb-6">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Current balance:</span>
                        <span class="text-white">${current.toFixed(4)} SOL</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Required:</span>
                        <span class="text-white">${required.toFixed(4)} SOL</span>
                    </div>
                    <div class="flex justify-between text-red-400">
                        <span>Shortfall:</span>
                        <span>${shortfall.toFixed(4)} SOL</span>
                    </div>
                </div>
                <div class="space-y-3">
                    <a href="https://jup.ag/" target="_blank" class="block w-full p-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all">
                        Buy SOL on Jupiter
                    </a>
                    <button onclick="this.closest('.fixed').remove(); document.querySelector('input[value=usd]').click()" class="block w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all">
                        Pay with Card Instead
                    </button>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 text-sm text-gray-400 hover:text-white">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializePaymentModal();
    
    // Restore wallet connection state
    const walletAddress = localStorage.getItem('walletAddress');
    const walletType = localStorage.getItem('walletType');
    
    if (walletAddress) {
        // Restore publicKey for hot wallets
        if (!publicKey && walletType === 'hot') {
            publicKey = walletAddress;
            console.log('Restored hot wallet address:', walletAddress);
        }
    }
    
    // Auto-connect if wallet was previously connected
    const checkAndConnect = () => {
        if (window.walletAdapter && walletType === 'browser') {
            const savedWallet = localStorage.getItem('preferredWallet');
            if (savedWallet && window.walletAdapter.getSupportedWallets()[savedWallet]?.adapter) {
                window.walletAdapter.connect(savedWallet).catch(console.error);
            }
        }
    };
    
    // Try after a short delay
    setTimeout(checkAndConnect, 500);
});

// Process hot wallet payment
async function processHotWalletPayment(walletAddress) {
    // Show transaction modal
    showTransactionModal('processing');
    closePaymentModal();
    
    try {
        // Call backend to process the payment with hot wallet
        const response = await fetch('api/process-hot-wallet-payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: walletAddress,
                plan: selectedPlan.name,
                amount: selectedPlan.solPrice,
                currency: 'SOL'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Get auto-renewal preference
            const autoRenewCheckbox = document.getElementById('auto-renew-checkbox');
            const autoRenew = autoRenewCheckbox ? autoRenewCheckbox.checked : true;
            
            // Save subscription to database
            await saveSubscription({
                wallet: walletAddress,
                plan: selectedPlan.name,
                amount: selectedPlan.solPrice,
                currency: 'SOL',
                txSignature: data.signature,
                status: 'active',
                auto_renew: autoRenew,
                is_hot_wallet: true
            });
            
            // Show success
            showTransactionModal('success');
        } else {
            // Handle insufficient balance
            if (data.error === 'Insufficient balance') {
                const required = data.required || selectedPlan.solPrice;
                const current = data.balance || 0;
                const shortfall = required - current;
                hideTransactionModal();
                showInsufficientBalanceModal(required + 0.002, current, shortfall + 0.002);
            } else {
                throw new Error(data.error || 'Payment failed');
            }
        }
        
    } catch (err) {
        console.error('Hot wallet payment failed:', err);
        showTransactionModal('error', err.message || 'Transaction failed');
    }
}

// Load Solana Web3.js
const script = document.createElement('script');
script.src = 'https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js';
script.onload = () => {
    console.log('Solana Web3.js loaded');
};
document.head.appendChild(script);

// Expose functions to global scope
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.processSOLPayment = processSOLPayment;
window.processStripePayment = processStripePayment;
window.processHotWalletPayment = processHotWalletPayment;
window.showWalletSelectionModal = showWalletSelectionModal;
window.showWalletInstallPrompt = showWalletInstallPrompt;
window.hideTransactionModal = hideTransactionModal;