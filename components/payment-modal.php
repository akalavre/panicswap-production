<!-- Payment Modal Component -->
<div id="payment-modal" class="fixed inset-0 z-50 hidden">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" id="payment-modal-backdrop"></div>
    
    <!-- Modal -->
    <div class="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div class="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in" id="payment-modal-content">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-gray-800">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Complete Your Subscription</h2>
                        <p class="text-sm text-gray-400 mt-1">Choose your payment method</p>
                    </div>
                    <button id="close-payment-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Content -->
            <div class="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <!-- Selected Plan Summary -->
                <div class="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold text-white">
                            <span id="selected-plan-name">Pro</span> Plan
                        </h3>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
                            Save 10% with SOL
                        </span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Billing cycle:</span>
                            <span class="text-white">Monthly (shown as weekly)</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Features:</span>
                            <span class="text-white" id="selected-plan-features">5 tokens, < 2s response</span>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Method Selection -->
                <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-white mb-4">Select Payment Method</h4>
                    
                    <!-- SOL Payment Option -->
                    <label class="relative cursor-pointer">
                        <input type="radio" name="payment-method" value="sol" class="peer sr-only" checked>
                        <div class="p-4 rounded-lg border-2 border-gray-700 peer-checked:border-orange-500 peer-checked:bg-orange-500/10 transition-all">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                        <span class="text-white font-bold text-lg">◎</span>
                                    </div>
                                    <div>
                                        <h5 class="font-semibold text-white">Pay with Solana</h5>
                                        <p class="text-sm text-gray-400">10% discount included</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-white">
                                        <span id="sol-price-weekly">0.141</span> SOL
                                    </div>
                                    <div class="text-xs text-gray-400">per week</div>
                                    <div class="text-sm text-green-400 mt-1">
                                        <span id="sol-price-monthly">0.56</span> SOL/month
                                    </div>
                                </div>
                            </div>
                        </div>
                    </label>
                    
                    <!-- USD Payment Option -->
                    <label class="relative cursor-pointer">
                        <input type="radio" name="payment-method" value="usd" class="peer sr-only">
                        <div class="p-4 rounded-lg border-2 border-gray-700 peer-checked:border-orange-500 peer-checked:bg-orange-500/10 transition-all">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                        <span class="text-white font-bold text-lg">$</span>
                                    </div>
                                    <div>
                                        <h5 class="font-semibold text-white">Pay with USD</h5>
                                        <p class="text-sm text-gray-400">Credit/Debit card via Stripe</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-white">
                                        $<span id="usd-price-weekly">19.75</span>
                                    </div>
                                    <div class="text-xs text-gray-400">per week</div>
                                    <div class="text-sm text-gray-400 mt-1">
                                        $<span id="usd-price-monthly">79</span>/month
                                    </div>
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
                
                <!-- SOL Wallet Connection (shown when SOL selected) -->
                <div id="sol-payment-section" class="mt-6">
                    <div class="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-4">
                        <p class="text-sm text-purple-300">
                            <strong>Note:</strong> You'll need a Solana wallet with enough SOL to cover the subscription plus network fees (~0.001 SOL).
                        </p>
                    </div>
                    
                    <div id="wallet-not-connected" class="text-center py-8">
                        <div class="mb-4">
                            <svg class="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <p class="text-gray-400 mb-4">Connect your wallet to continue</p>
                        <button id="connect-wallet-btn" class="btn btn-primary">
                            Connect Wallet
                        </button>
                    </div>
                    
                    <div id="wallet-connected" class="hidden">
                        <div class="p-4 rounded-lg bg-gray-800/50 border border-gray-700 mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600"></div>
                                    <div>
                                        <p class="text-sm text-gray-400">Connected wallet</p>
                                        <p class="font-mono text-sm text-white" id="connected-wallet-address">...</p>
                                        <p class="text-xs text-gray-400 mt-1">Balance: <span id="wallet-balance" class="text-white">Loading...</span></p>
                                    </div>
                                </div>
                                <button id="disconnect-wallet-btn" class="text-sm text-red-400 hover:text-red-300">
                                    Disconnect
                                </button>
                            </div>
                        </div>
                        
                        <!-- Auto-renewal consent for hot wallets -->
                        <div id="auto-renewal-consent" class="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 hidden">
                            <label class="flex items-start space-x-3 cursor-pointer">
                                <input type="checkbox" id="auto-renew-checkbox" class="mt-1 w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 bg-gray-800">
                                <div class="text-sm">
                                    <p class="text-white font-medium mb-1">Enable automatic renewal</p>
                                    <p class="text-gray-400">Your subscription will automatically renew every week. We'll charge <span class="text-white font-medium">0.141 SOL</span> from your hot wallet. You can cancel anytime.</p>
                                    <p class="text-xs text-yellow-400 mt-2">
                                        <svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                                        </svg>
                                        You'll receive a notification 24 hours before each charge
                                    </p>
                                </div>
                            </label>
                        </div>
                        
                        <button id="pay-with-sol-btn" class="w-full btn btn-primary text-lg py-4">
                            Pay <span id="sol-payment-amount">0.56</span> SOL
                        </button>
                    </div>
                </div>
                
                <!-- USD Payment Section (shown when USD selected) -->
                <div id="usd-payment-section" class="mt-6 hidden">
                    <div class="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-4">
                        <p class="text-sm text-blue-300">
                            <strong>Secure Payment:</strong> Your payment will be processed by Stripe. All card details are encrypted and secure.
                        </p>
                    </div>
                    
                    <button id="pay-with-stripe-btn" class="w-full btn btn-primary text-lg py-4">
                        Pay $<span id="usd-payment-amount">79</span> with Card
                    </button>
                    
                    <div class="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
                        <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-visa.svg" class="h-6 opacity-50" alt="Visa">
                        <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-mastercard.svg" class="h-6 opacity-50" alt="Mastercard">
                        <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/brands/cc-amex.svg" class="h-6 opacity-50" alt="Amex">
                        <span class="text-gray-400">Powered by Stripe</span>
                    </div>
                </div>
                
                <!-- Terms and Conditions -->
                <div class="mt-6 pt-6 border-t border-gray-800">
                    <p class="text-xs text-gray-500 text-center">
                        By subscribing, you agree to our <a href="terms.php" class="text-orange-400 hover:text-orange-300">Terms of Service</a> and <a href="privacy.php" class="text-orange-400 hover:text-orange-300">Privacy Policy</a>.
                        Subscriptions are billed monthly and can be cancelled anytime.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 text-sm">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                        <span class="text-gray-400">Secure payment</span>
                    </div>
                    <div class="text-sm text-gray-400">
                        Questions? <a href="contact.php" class="text-orange-400 hover:text-orange-300">Contact support</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Load Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>

<!-- Transaction Status Modal -->
<div id="transaction-modal" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
    <div class="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div class="bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-8 text-center">
            <!-- Processing State -->
            <div id="transaction-processing" class="animate-fade-in">
                <div class="mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                        <svg class="w-10 h-10 text-orange-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 20h2m-2-4h.01M12 8h.01M8 12h.01"></path>
                        </svg>
                    </div>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Processing Transaction</h3>
                <p class="text-gray-400 mb-4">Please approve the transaction in your wallet</p>
                <p class="text-sm text-gray-500">This may take a few seconds...</p>
            </div>
            
            <!-- Success State -->
            <div id="transaction-success" class="hidden animate-fade-in">
                <div class="mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
                <p class="text-gray-400 mb-6">Your subscription is now active</p>
                <button id="go-to-dashboard-btn" class="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
            
            <!-- Error State -->
            <div id="transaction-error" class="hidden animate-fade-in">
                <div class="mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Transaction Failed</h3>
                <p class="text-gray-400 mb-2" id="error-message">Something went wrong</p>
                <p class="text-sm text-gray-500 mb-6">Please try again or contact support</p>
                <button id="retry-payment-btn" class="btn btn-secondary">
                    Try Again
                </button>
            </div>
        </div>
    </div>
</div>