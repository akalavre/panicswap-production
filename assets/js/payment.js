// Payment System for PanicSwap
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const MERCHANT_WALLET = "5kUXfkUbawYtMxvGJtfcZXDgf5FJ7YnxDqki9QMEiMtB"; // PanicSwap merchant wallet
const SOL_PRICE = 147.70; // Current SOL price in USD

// Initialize wallet adapter
const walletAdapter = new WalletAdapter();

// Pricing configuration
const PLANS = {
    pro: {
        name: 'Pro',
        solPrice: 0.99,
        usdPrice: 161.04,
        weeklySOL: 0.248,
        weeklyUSD: 40.26,
        features: 'Up to 50 tokens, < 2s response'
    },
    degen: {
        name: 'Degen Mode',
        solPrice: 1.99,
        usdPrice: 323.63,
        weeklySOL: 0.498,
        weeklyUSD: 80.91,
        features: 'Up to 100 tokens, < 1s response, Pump.fun'
    },
    enterprise: {
        name: 'Enterprise',
        solPrice: 2.99,
        usdPrice: 486.12,
        weeklySOL: 0.748,
        weeklyUSD: 121.53,
        features: 'Unlimited tokens, all DEXs, dedicated support'
    }
};

let selectedPlan = null;
let selectedPaymentMethod = 'sol';
let provider = null;
let publicKey = null;

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
    selectedPlan = PLANS[planId];
    
    // Update modal content
    document.getElementById('selected-plan-name').textContent = selectedPlan.name;
    document.getElementById('selected-plan-features').textContent = selectedPlan.features;
    
    // Update SOL prices
    document.getElementById('sol-price-weekly').textContent = selectedPlan.weeklySOL.toFixed(3);
    document.getElementById('sol-price-monthly').textContent = selectedPlan.solPrice;
    document.getElementById('sol-payment-amount').textContent = selectedPlan.solPrice;
    
    // Update USD prices
    document.getElementById('usd-price-weekly').textContent = selectedPlan.weeklyUSD.toFixed(2);
    document.getElementById('usd-price-monthly').textContent = selectedPlan.usdPrice.toFixed(2);
    document.getElementById('usd-payment-amount').textContent = selectedPlan.usdPrice.toFixed(2);
    
    showPaymentModal();
}

// Show/hide payment modal
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
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
    
    if (selectedPaymentMethod === 'sol') {
        solSection.classList.remove('hidden');
        usdSection.classList.add('hidden');
    } else {
        solSection.classList.add('hidden');
        usdSection.classList.remove('hidden');
    }
}

// Wallet Connection Functions
async function connectWallet() {
    try {
        // Show wallet selection modal
        const walletModal = await showWalletSelectionModal();
        if (!walletModal) return;
        
        // Connect to selected wallet
        publicKey = await walletAdapter.connect(walletModal);
        provider = walletAdapter.provider;
        
        // Update UI
        document.getElementById('wallet-not-connected').classList.add('hidden');
        document.getElementById('wallet-connected').classList.remove('hidden');
        document.getElementById('connected-wallet-address').textContent = 
            publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        
        // Store wallet preference
        localStorage.setItem('preferredWallet', walletModal);
        localStorage.setItem('connectedWallet', publicKey);
        
        // Check wallet balance
        await checkWalletBalance();
        
    } catch (err) {
        console.error('Wallet connection failed:', err);
        if (err.message.includes('No Solana wallet found')) {
            showWalletInstallPrompt();
        } else {
            alert('Failed to connect wallet: ' + err.message);
        }
    }
}

async function disconnectWallet() {
    await walletAdapter.disconnect();
    
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
        const connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');
        const solBalance = await walletAdapter.getBalance(connection);
        
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
    if (!publicKey || !provider) {
        alert('Please connect your wallet first');
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
        const { signature } = await walletAdapter.signAndSendTransaction(transaction);
        
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
        const response = await fetch('/api/create-checkout-session.php', {
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
        
        if (data.success && data.url) {
            // Save session ID for tracking
            localStorage.setItem('stripe_session_id', data.sessionId);
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Failed to create checkout session');
        }
        
    } catch (err) {
        console.error('Stripe payment failed:', err);
        showTransactionModal('error', err.message || 'Failed to process payment. Please try again.');
    }
}

// Save subscription to database
async function saveSubscription(subscriptionData) {
    try {
        const response = await fetch('/api/save-subscription.php', {
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
        const wallets = walletAdapter.getSupportedWallets();
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
    
    // Auto-connect if wallet was previously connected
    const savedWallet = localStorage.getItem('preferredWallet');
    if (savedWallet && walletAdapter.getSupportedWallets()[savedWallet]?.adapter) {
        walletAdapter.connect(savedWallet).catch(console.error);
    }
});

// Load Solana Web3.js
const script = document.createElement('script');
script.src = 'https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js';
script.onload = () => {
    console.log('Solana Web3.js loaded');
};
document.head.appendChild(script);