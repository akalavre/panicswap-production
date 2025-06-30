<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Management - PanicSwap</title>
    <meta name="description" content="Manage your PanicSwap subscription and billing settings">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Tailwind Configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#fff1f0',
                            100: '#ffe0db',
                            200: '#ffc5bd',
                            300: '#ff9d8c',
                            400: '#ff6854',
                            500: '#FF4B36',
                            600: '#ed2408',
                            700: '#c71c05',
                            800: '#a41b0a',
                            900: '#871c0f',
                            950: '#490a03',
                        },
                        secondary: {
                            50: '#f0fdfa',
                            100: '#ccfbf1',
                            200: '#99f6e4',
                            300: '#5eead4',
                            400: '#2dd4bf',
                            500: '#14b8a6',
                            600: '#0d9488',
                            700: '#0f766e',
                            800: '#115e59',
                            900: '#134e4a',
                            950: '#042f2e',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
    
    <!-- Additional Styles -->
    <style>
        body {
            background: #0a0a0a;
            background-image: 
                radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120, 119, 198, 0.15), transparent),
                radial-gradient(ellipse 80% 80% at 80% 80%, rgba(255, 75, 54, 0.08), transparent),
                radial-gradient(ellipse 80% 80% at 20% 30%, rgba(255, 75, 54, 0.05), transparent);
        }
        
        .card-dark {
            background: #141414;
            border: 1px solid rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
        }

        .card-charcoal {
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .plan-card {
            background: linear-gradient(135deg, #1a1a1a 0%, #141414 100%);
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
        }

        .plan-card.active {
            border-color: rgba(255, 75, 54, 0.3);
        }

        .plan-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        }

        .feature-item {
            border-left: 2px solid rgba(255, 255, 255, 0.1);
            padding-left: 1rem;
            margin-left: 0.5rem;
        }

        .feature-item.active {
            border-left-color: #10b981;
        }

        .usage-bar {
            background: rgba(255, 255, 255, 0.05);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
        }

        .usage-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #14b8a6);
            transition: width 0.3s ease;
        }

        .billing-history-item:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .status-badge {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 500;
        }

        .status-active {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }

        .status-pending {
            background: rgba(251, 191, 36, 0.2);
            color: #fbbf24;
        }

        .status-cancelled {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .animate-scale-in {
            animation: scaleIn 0.3s ease-out;
        }

        @keyframes scaleIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
    </style>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/config.js"></script>
    <script src="assets/js/backend-config.js"></script>
    <script src="assets/js/supabase-client.js"></script>
</head>
<body class="bg-black text-gray-100 font-sans antialiased">
    <?php include 'components/network-status.php'; ?>
    <?php include 'components/header.php'; ?>
    
    <main class="container mx-auto px-4 py-6 mt-8 max-w-6xl">
        <!-- Page Header -->
        <div class="mb-8">
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <a href="/dashboard" class="hover:text-gray-300 transition-colors">Dashboard</a>
                <span>/</span>
                <span class="text-gray-300">Subscription Management</span>
            </div>
            <h1 class="text-3xl font-bold text-white">Subscription Management</h1>
            <p class="text-gray-400 mt-2">Manage your plan, billing, and subscription settings</p>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
            <div class="inline-flex items-center gap-3">
                <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-gray-400">Loading subscription details...</span>
            </div>
        </div>

        <!-- Main Content (hidden initially) -->
        <div id="main-content" style="display: none;">
            <!-- Current Plan Section -->
            <div class="card-dark rounded-xl p-8 mb-8">
                <h2 class="text-xl font-semibold text-white mb-6">Current Plan</h2>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Plan Details -->
                    <div class="lg:col-span-2">
                        <div class="flex items-start justify-between mb-6">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 id="current-plan-name" class="text-2xl font-bold text-white">Pro Plan</h3>
                                    <span id="plan-status" class="status-badge status-active">Active</span>
                                </div>
                                <p class="text-gray-400 text-sm">Streaming subscription • Billed weekly</p>
                            </div>
                            <div class="text-right">
                                <div id="current-plan-price" class="text-2xl font-bold text-white">$40.26</div>
                                <div class="text-sm text-gray-400">per week</div>
                            </div>
                        </div>

                        <!-- Usage Stats -->
                        <div class="space-y-4 mb-6">
                            <div>
                                <div class="flex justify-between text-sm mb-2">
                                    <span class="text-gray-400">Protected Tokens</span>
                                    <span id="tokens-usage" class="text-white">3 / 50</span>
                                </div>
                                <div class="usage-bar">
                                    <div id="tokens-usage-bar" class="usage-bar-fill" style="width: 6%"></div>
                                </div>
                            </div>
                            
                            <div>
                                <div class="flex justify-between text-sm mb-2">
                                    <span class="text-gray-400">Connected Wallets</span>
                                    <span id="wallets-usage" class="text-white">1 / 3</span>
                                </div>
                                <div class="usage-bar">
                                    <div id="wallets-usage-bar" class="usage-bar-fill" style="width: 33%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Next Payment -->
                        <div class="bg-gray-900/30 rounded-lg p-4 mb-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-400">Next payment</p>
                                    <p id="next-payment-date" class="text-white font-medium">January 27, 2025</p>
                                </div>
                                <div class="text-right">
                                    <p id="next-payment-amount" class="text-white font-medium">$40.26</p>
                                    <p class="text-xs text-gray-500">0.248 SOL</p>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <button id="change-plan-btn" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                                Change Plan
                            </button>
                            <button id="cancel-subscription-btn" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                                Cancel Subscription
                            </button>
                        </div>
                    </div>

                    <!-- Plan Features -->
                    <div class="bg-gray-900/30 rounded-lg p-6">
                        <h4 class="font-medium text-white mb-4">Plan Features</h4>
                        <div class="space-y-3">
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">Graduated tokens (DEX)</p>
                            </div>
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">Up to 50 tokens</p>
                            </div>
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">< 2 seconds response</p>
                            </div>
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">Major DEXs coverage</p>
                            </div>
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">Email + Telegram alerts</p>
                            </div>
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">24/7 Background monitoring</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Available Plans Section (hidden by default) -->
            <div id="plans-section" class="card-dark rounded-xl p-8 mb-8" style="display: none;">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-semibold text-white">Available Plans</h2>
                    <button id="close-plans-btn" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <!-- Basic Plan -->
                    <div class="plan-card rounded-lg p-6 cursor-pointer hover:border-gray-600 transition-all" data-plan="basic">
                        <h3 class="text-lg font-bold text-white mb-2">Basic</h3>
                        <p class="text-sm text-gray-400 mb-4">Essential protection</p>
                        <div class="text-2xl font-bold text-white mb-1">Free</div>
                        <p class="text-xs text-gray-500 mb-4">Forever</p>
                        <ul class="space-y-2 text-sm text-gray-400">
                            <li>• Up to 1 token</li>
                            <li>• Manual selection</li>
                            <li>• Raydium only</li>
                        </ul>
                        <button class="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm" onclick="downgradePlan('basic')">
                            Downgrade to Basic
                        </button>
                    </div>

                    <!-- Pro Plan -->
                    <div class="plan-card rounded-lg p-6 cursor-pointer hover:border-gray-600 transition-all" data-plan="pro">
                        <h3 class="text-lg font-bold text-white mb-2">Pro</h3>
                        <p class="text-sm text-gray-400 mb-4">For serious traders</p>
                        <div class="text-2xl font-bold text-white mb-1">$40.26</div>
                        <p class="text-xs text-gray-500 mb-4">per week</p>
                        <ul class="space-y-2 text-sm text-gray-400">
                            <li>• Up to 5 tokens</li>
                            <li>• Major DEXs</li>
                            <li>• 24/7 monitoring</li>
                        </ul>
                        <button class="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm" onclick="upgradePlan('pro')">
                            Upgrade to Pro
                        </button>
                    </div>

                    <!-- Degen Mode -->
                    <div class="plan-card rounded-lg p-6 cursor-pointer hover:border-gray-600 transition-all" data-plan="degen">
                        <h3 class="text-lg font-bold text-white mb-2">Degen Mode</h3>
                        <p class="text-sm text-gray-400 mb-4">Memecoin protection</p>
                        <div class="text-2xl font-bold text-white mb-1">$80.91</div>
                        <p class="text-xs text-gray-500 mb-4">per week</p>
                        <ul class="space-y-2 text-sm text-gray-400">
                            <li>• Up to 10 tokens</li>
                            <li>• Pre-DEX tokens</li>
                            <li>• Pump.fun support</li>
                        </ul>
                        <button class="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm" onclick="upgradePlan('degen')">
                            Upgrade to Degen
                        </button>
                    </div>

                    <!-- Enterprise Plan -->
                    <div class="plan-card rounded-lg p-6 cursor-pointer hover:border-gray-600 transition-all" data-plan="enterprise">
                        <h3 class="text-lg font-bold text-white mb-2">Enterprise</h3>
                        <p class="text-sm text-gray-400 mb-4">All platforms</p>
                        <div class="text-2xl font-bold text-white mb-1">$121.53</div>
                        <p class="text-xs text-gray-500 mb-4">per week</p>
                        <ul class="space-y-2 text-sm text-gray-400">
                            <li>• Up to 25 tokens</li>
                            <li>• All DEXs + Private</li>
                            <li>• Dedicated support</li>
                        </ul>
                        <button class="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm" onclick="upgradePlan('enterprise')">
                            Upgrade to Enterprise
                        </button>
                    </div>
                </div>
            </div>

            <!-- Billing History -->
            <div class="card-dark rounded-xl p-8 mb-8">
                <h2 class="text-xl font-semibold text-white mb-6">Billing History</h2>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left text-sm text-gray-400 border-b border-gray-800">
                                <th class="pb-3">Date</th>
                                <th class="pb-3">Description</th>
                                <th class="pb-3">Amount</th>
                                <th class="pb-3">Status</th>
                                <th class="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody id="billing-history" class="text-sm">
                            <!-- Billing history will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="card-dark rounded-xl p-8">
                <h2 class="text-xl font-semibold text-white mb-6">Payment Method</h2>
                
                <div class="bg-gray-900/30 rounded-lg p-6 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 class="font-medium text-white">Solana Streaming Payments</h4>
                                <p class="text-sm text-gray-400">Powered by Sphere Protocol</p>
                            </div>
                        </div>
                        <span class="status-badge status-active">Active</span>
                    </div>
                    
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Payment Wallet</span>
                            <span id="payment-wallet" class="text-white font-mono">5KJvs...gV9A3</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Stream ID</span>
                            <span id="stream-id" class="text-white font-mono">#12345</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Next charge</span>
                            <span id="next-charge" class="text-white">January 27, 2025</span>
                        </div>
                    </div>
                </div>

                <div class="text-sm text-gray-400">
                    <p class="mb-2">💡 Your subscription is paid via streaming payments on Solana.</p>
                    <p>You can cancel anytime and get back any unused SOL from your stream.</p>
                </div>
            </div>
        </div>

        <!-- Cancel Subscription Modal -->
        <div id="cancel-modal" class="fixed inset-0 z-50 hidden">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeCancelModal()"></div>
            <div class="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div class="bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6">
                    <h3 class="text-xl font-bold text-white mb-4">Cancel Subscription?</h3>
                    <p class="text-gray-400 mb-6">
                        Are you sure you want to cancel your Pro subscription? You'll lose access to:
                    </p>
                    <ul class="space-y-2 mb-6 text-sm text-gray-300">
                        <li>• Protection for up to 25 tokens</li>
                        <li>• 24/7 background monitoring</li>
                        <li>• Major DEX coverage</li>
                        <li>• Priority execution speeds</li>
                    </ul>
                    <div class="bg-gray-800/50 rounded-lg p-4 mb-6">
                        <p class="text-sm text-gray-300">
                            <strong>Refund:</strong> You'll receive <span class="text-white font-medium">0.186 SOL</span> back for the unused portion of your subscription.
                        </p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="confirmCancel()" class="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            Yes, Cancel
                        </button>
                        <button onclick="closeCancelModal()" class="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                            Keep Subscription
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <?php include 'components/footer.php'; ?>
    <?php include 'components/payment-modal.php'; ?>
    
    <!-- Scripts -->
    <script src="assets/js/wallet-state.js"></script>
    <script src="assets/js/main.js"></script>
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/wallet-button-ui.js"></script>
    <script src="assets/js/protection-events.js"></script>
    <script src="assets/js/auto-sell.js"></script>
    <script src="assets/js/payment-config.js"></script>
    <script src="assets/js/payment.js"></script>
    <script src="assets/js/subscription-status.js"></script>
    
    <script>
        // Plan configuration - use existing PLANS if already defined (from payment.js)
        // Use the global PLANS object that is defined in payment.js.
        // If it hasn't been defined for some reason (e.g. someone removed payment.js),
        // create it here and also attach it to window so other scripts can reuse it.
        if (!window.PLANS) {
            window.PLANS = {
                basic: {
                    name: 'Basic',
                    displayName: 'Basic Plan',
                    price: 0,
                    priceInSol: 0,
                    weeklyPrice: 0,
                    monthlyPrice: 0,
                    tokensLimit: 1,
                    walletsLimit: 1,
                    features: ['Manual selection', 'Up to 1 token', 'Raydium only']
                },
                pro: {
                    name: 'Pro',
                    displayName: 'Pro Plan',
                    price: 40.26,
                    priceInSol: 0.248,
                    weeklyPrice: 40.26,
                    monthlyPrice: 161.04,
                    tokensLimit: 5,
                    walletsLimit: 3,
                    features: ['Graduated tokens (DEX)', 'Up to 5 tokens', '< 2 seconds response', 'Major DEXs coverage', 'Email + Telegram alerts', '24/7 Background monitoring']
                },
                degen: {
                    name: 'Degen Mode',
                    displayName: 'Degen Mode Plan',
                    price: 80.91,
                    priceInSol: 0.498,
                    weeklyPrice: 80.91,
                    monthlyPrice: 323.63,
                    tokensLimit: 20,
                    walletsLimit: 5,
                    features: ['New launches (pre-DEX)', 'Up to 10 tokens', '< 1 second response', 'Memecoin launchpads', 'Pump.fun support', '24/7 Background monitoring']
                },
                enterprise: {
                    name: 'Enterprise',
                    displayName: 'Enterprise Plan',
                    price: 121.53,
                    priceInSol: 0.748,
                    weeklyPrice: 121.53,
                    monthlyPrice: 486.12,
                    tokensLimit: 50,
                    walletsLimit: -1, // Unlimited
                    features: ['All tokens', 'Up to 25 tokens', '< 1 second response', 'All DEXs + Private pools', 'Dedicated manager', '24/7 Background monitoring']
                }
            };
        }
        // From here on we use the PLANS object directly from window.PLANS.

        // Initialize page
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('Subscription page loading...');
            
            // Check if user is connected
            const walletAddress = localStorage.getItem('walletAddress');
            console.log('Wallet address:', walletAddress);
            
            if (!walletAddress) {
                console.warn('No wallet connected, redirecting...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                return;
            }

            // Wait for Supabase to be ready
            console.log('Waiting for Supabase client...');
            let supabaseClient = window.supabaseClient;
            
            if (!supabaseClient) {
                // Try to create it directly if the library is loaded
                if (window.supabase) {
                    console.log('Creating Supabase client directly');
                    const SUPABASE_URL = window.PanicSwapConfig?.SUPABASE_URL || 'https://cfficjjdhgqwqprfhlrj.supabase.co';
                    const SUPABASE_ANON_KEY = window.PanicSwapConfig?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA';
                    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    window.supabaseClient = supabaseClient;
                } else {
                    // Wait for the ready event
                    console.log('Waiting for supabaseReady event...');
                    await new Promise(resolve => {
                        window.addEventListener('supabaseReady', () => {
                            supabaseClient = window.supabaseClient;
                            resolve();
                        }, { once: true });
                        
                        // Timeout after 5 seconds
                        setTimeout(() => resolve(), 5000);
                    });
                }
            }
            
            console.log('Supabase client ready:', !!supabaseClient);
            
            if (!supabaseClient) {
                console.error('Failed to initialize Supabase client');
                // Show content anyway with default data
                displayDefaultSubscriptionData();
                document.getElementById('loading-state').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                return;
            }

            try {
                // First, get the user by wallet address
                const { data: user, error: userError } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress)
                    .maybeSingle();

                if (userError) {
                    console.error('Error fetching user:', userError);
                }

                // Then fetch subscription data from Supabase
                let subscription = null;
                let error = null;
                
                if (user) {
                    const result = await supabaseClient
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    
                    subscription = result.data;
                    error = result.error;
                }

                if (error) {
                    console.error('Error fetching subscription:', error);
                    // Don't throw, continue with default plan
                }

                // If no subscription found, check test mode or default to basic plan
                let currentPlan = subscription?.plan;
                
                // In test mode, use the configured test plan
                if (!currentPlan && window.PanicSwapConfig?.TEST_MODE) {
                    currentPlan = window.PanicSwapConfig.TEST_SUBSCRIPTION_PLAN || 'basic';
                }
                
                // Default to basic if still no plan
                currentPlan = currentPlan || 'basic';
                const planDetails = window.PLANS[currentPlan] || window.PLANS.basic;

                // Fetch protected tokens count
                const { data: protectedTokens, error: tokensError } = await supabaseClient
                    .from('wallet_tokens')
                    .select('*', { count: 'exact' })
                    .eq('wallet_address', walletAddress)
                    .eq('is_protected', true);

                const tokensUsed = protectedTokens?.length || 0;

                // Fetch connected wallets count (for now just 1)
                const walletsUsed = 1;

                // Fetch billing history from subscriptions table
                let billingHistory = [];
                let historyError = null;
                
                if (user) {
                    const historyResult = await supabaseClient
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(10);
                    
                    billingHistory = historyResult.data || [];
                    historyError = historyResult.error;
                }

                // Format subscription data
                const subscriptionData = {
                    plan: currentPlan,
                    planName: planDetails.displayName,
                    status: subscription?.status || 'active',
                    price: planDetails.price,
                    priceInSol: planDetails.priceInSol,
                    billingCycle: 'weekly',
                    nextPaymentDate: subscription?.next_payment_date ? 
                        new Date(subscription.next_payment_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }) : 
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }),
                    tokensUsed: tokensUsed,
                    tokensLimit: planDetails.tokensLimit,
                    walletsUsed: walletsUsed,
                    walletsLimit: planDetails.walletsLimit,
                    paymentWallet: subscription?.payment_wallet ? 
                        subscription.payment_wallet.slice(0, 6) + '...' + subscription.payment_wallet.slice(-5) : 
                        (walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-5) : 'Not connected'),
                    streamId: subscription?.stream_id || '#' + Math.floor(Math.random() * 100000),
                    billingHistory: formatBillingHistory(billingHistory || []),
                    planFeatures: planDetails.features
                };
                
                // Display the data
                displaySubscriptionData(subscriptionData);
                
                // Hide loading, show content
                document.getElementById('loading-state').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
            } catch (error) {
                console.error('Error loading subscription data:', error);
                showNotification('Failed to load subscription data', 'error');
                
                // Show content anyway with default data
                const defaultData = {
                    plan: 'basic',
                    planName: 'Basic Plan',
                    status: 'active',
                    price: 0,
                    priceInSol: 0,
                    billingCycle: 'free',
                    nextPaymentDate: 'Never',
                    tokensUsed: 0,
                    tokensLimit: 1,
                    walletsUsed: 1,
                    walletsLimit: 1,
                    paymentWallet: walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-5) : 'Not connected',
                    streamId: 'N/A',
                    billingHistory: [],
                    planFeatures: window.PLANS.basic.features
                };
                
                displaySubscriptionData(defaultData);
                document.getElementById('loading-state').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
            }
        });

        // Format billing history from Supabase data
        function formatBillingHistory(history) {
            return history.map(item => ({
                date: new Date(item.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                description: `${window.PLANS[item.plan]?.displayName || item.plan} - ${item.billing_cycle || 'Monthly'}`,
                amount: `$${item.amount || 0}`,
                amountSol: `${item.amount_sol || 0} SOL`,
                status: item.status || 'paid'
            }));
        }

        function displaySubscriptionData(data) {
            // Update current plan details
            document.getElementById('current-plan-name').textContent = data.planName;
            document.getElementById('current-plan-price').textContent = data.price > 0 ? `$${data.price}` : 'Free';
            document.getElementById('plan-status').textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
            
            // Update usage stats
            const tokensLimitText = data.tokensLimit === -1 ? 'Unlimited' : data.tokensLimit;
            document.getElementById('tokens-usage').textContent = `${data.tokensUsed} / ${tokensLimitText}`;
            const tokensPercentage = data.tokensLimit === -1 ? 0 : (data.tokensUsed / data.tokensLimit) * 100;
            document.getElementById('tokens-usage-bar').style.width = `${tokensPercentage}%`;
            
            const walletsLimitText = data.walletsLimit === -1 ? 'Unlimited' : data.walletsLimit;
            document.getElementById('wallets-usage').textContent = `${data.walletsUsed} / ${walletsLimitText}`;
            const walletsPercentage = data.walletsLimit === -1 ? 0 : (data.walletsUsed / data.walletsLimit) * 100;
            document.getElementById('wallets-usage-bar').style.width = `${walletsPercentage}%`;
            
            // Update payment details
            document.getElementById('next-payment-date').textContent = data.nextPaymentDate;
            document.getElementById('next-payment-amount').textContent = data.price > 0 ? `$${data.price}` : 'Free';
            document.getElementById('payment-wallet').textContent = data.paymentWallet;
            document.getElementById('stream-id').textContent = data.streamId;
            document.getElementById('next-charge').textContent = data.nextPaymentDate;
            
            // Update plan features
            if (data.planFeatures) {
                const activeCard = document.querySelector('.plan-card.active');
                if (activeCard && activeCard.parentElement && activeCard.parentElement.parentElement) {
                    const featuresContainer = activeCard.parentElement.parentElement.querySelector('.bg-gray-900\\/30 .space-y-3');
                    if (featuresContainer) {
                        featuresContainer.innerHTML = data.planFeatures.map(feature => `
                            <div class="feature-item active">
                                <p class="text-sm text-gray-300">${feature}</p>
                            </div>
                        `).join('');
                    }
                }
            }
            
            // Update plan cards to show current plan
            document.querySelectorAll('.plan-card').forEach(card => {
                card.classList.remove('active');
                const currentBadge = card.querySelector('.absolute.top-2.right-2');
                if (currentBadge) currentBadge.remove();
            });
            
            const currentPlanCard = document.querySelector(`[data-plan="${data.plan}"]`);
            if (currentPlanCard) {
                currentPlanCard.classList.add('active');
                const badge = document.createElement('div');
                badge.className = 'absolute top-2 right-2';
                badge.innerHTML = '<span class="text-xs bg-primary-600 text-white px-2 py-1 rounded">Current</span>';
                currentPlanCard.appendChild(badge);
                
                // Update button state
                const button = currentPlanCard.querySelector('button');
                if (button) {
                    button.textContent = 'Current Plan';
                    button.classList.add('cursor-default');
                    button.disabled = true;
                }
            }
            
            // Populate billing history
            const billingHistoryEl = document.getElementById('billing-history');
            if (data.billingHistory.length > 0) {
                billingHistoryEl.innerHTML = data.billingHistory.map(item => `
                    <tr class="border-b border-gray-800 billing-history-item cursor-pointer">
                        <td class="py-3 text-gray-300">${item.date}</td>
                        <td class="py-3 text-white">${item.description}</td>
                        <td class="py-3">
                            <div class="text-white">${item.amount}</div>
                            <div class="text-xs text-gray-500">${item.amountSol}</div>
                        </td>
                        <td class="py-3">
                            <span class="status-badge status-${(item.status === 'paid' || item.status === 'active') ? 'active' : (item.status === 'cancelled' ? 'cancelled' : 'pending')}">${item.status}</span>
                        </td>
                        <td class="py-3 text-right">
                            <button class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </td>
                    </tr>
                `).join('');
            } else {
                billingHistoryEl.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-8 text-center text-gray-500">
                            No billing history available
                        </td>
                    </tr>
                `;
            }
        }

        // Change plan functionality
        const changePlanBtn = document.getElementById('change-plan-btn');
        if (changePlanBtn) {
            changePlanBtn.addEventListener('click', function() {
                const plansSection = document.getElementById('plans-section');
                if (plansSection) {
                    plansSection.style.display = 'block';
                    plansSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        const closePlansBtn = document.getElementById('close-plans-btn');
        if (closePlansBtn) {
            closePlansBtn.addEventListener('click', function() {
                const plansSection = document.getElementById('plans-section');
                if (plansSection) {
                    plansSection.style.display = 'none';
                }
            });
        }

        // Cancel subscription functionality
        const cancelSubBtn = document.getElementById('cancel-subscription-btn');
        if (cancelSubBtn) {
            cancelSubBtn.addEventListener('click', function() {
                const cancelModal = document.getElementById('cancel-modal');
                if (cancelModal) {
                    cancelModal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        function closeCancelModal() {
            const cancelModal = document.getElementById('cancel-modal');
            if (cancelModal) {
                cancelModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        }

        async function confirmCancel() {
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) return;
            
            showNotification('Processing cancellation...', 'info');
            
            try {
                // First get user
                const { data: user } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress)
                    .maybeSingle();
                
                // Get current subscription
                const { data: subscription, error: fetchError } = user ? await supabaseClient
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single() : { data: null, error: new Error('User not found') };

                if (fetchError || !subscription) {
                    throw new Error('No active subscription found');
                }

                // Call cancel API
                const response = await fetch('api/cancel-subscription.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        wallet: walletAddress,
                        subscriptionId: subscription.id
                    })
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to cancel subscription');
                }

                closeCancelModal();
                
                const nextPaymentDate = subscription.current_period_end ? 
                    new Date(subscription.current_period_end).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }) : 'the end of your billing period';
                
                showNotification(`Your subscription has been cancelled. You will continue to have access until ${nextPaymentDate}`, 'success');
                
                // Update UI to reflect cancelled status
                document.getElementById('plan-status').textContent = 'Cancelled';
                document.getElementById('plan-status').classList.remove('status-active');
                document.getElementById('plan-status').classList.add('status-cancelled');
                    
            } catch (error) {
                console.error('Error cancelling subscription:', error);
                showNotification('Failed to cancel subscription. Please try again.', 'error');
            }
        }

        async function upgradePlan(plan) {
            const planPrices = {
                degen: { weekly: 80.91, monthly: 323.63, sol: 1.99 },
                enterprise: { weekly: 121.53, monthly: 486.12, sol: 2.99 }
            };
            
            if (planPrices[plan]) {
                // For new subscriptions or upgrades, use the payment modal
                openPaymentModal(plan, planPrices[plan].sol, planPrices[plan].monthly);
            }
        }

        function downgradePlan(plan) {
            if (plan === 'basic') {
                // Show confirmation modal for downgrade
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
                    <div class="relative bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6 animate-scale-in">
                        <h3 class="text-xl font-bold text-white mb-4">Downgrade to Basic?</h3>
                        <p class="text-gray-400 mb-6">
                            Are you sure you want to downgrade to the Basic plan? You'll lose access to:
                        </p>
                        <ul class="space-y-2 mb-6 text-sm text-gray-300">
                            <li>• Protection for up to 5 tokens (limited to 1)</li>
                            <li>• 24/7 background monitoring</li>
                            <li>• Major DEX coverage (Raydium only)</li>
                            <li>• Priority execution speeds</li>
                            <li>• Email & Telegram alerts</li>
                        </ul>
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                            <p class="text-sm text-blue-400">
                                <strong>Note:</strong> You'll still have access to Pro features until the end of your current billing cycle.
                            </p>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="confirmDowngrade()" class="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                                Yes, Downgrade
                            </button>
                            <button onclick="this.closest('.fixed').remove()" class="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                                Keep Pro Plan
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
        }

        async function confirmDowngrade() {
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) return;
            
            // Close the modal first
            document.querySelector('.fixed').remove();
            
            // Show processing notification
            showNotification('Processing downgrade...', 'info');
            
            try {
                // First get user
                const { data: user } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress)
                    .maybeSingle();
                
                // Get current subscription
                const { data: currentSub, error: fetchError } = user ? await supabaseClient
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single() : { data: null, error: new Error('User not found') };

                if (fetchError || !currentSub) {
                    throw new Error('No active subscription found');
                }

                // Call downgrade API
                const response = await fetch('api/downgrade-subscription.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subscriptionId: currentSub.id,
                        newPlan: 'basic'
                    })
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to schedule downgrade');
                }

                const downgradeDate = result.scheduled_date ? 
                    new Date(result.scheduled_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }) : 'the end of your current billing cycle';
                
                showNotification(`Your plan will be downgraded to Basic on ${downgradeDate}.`, 'success');
                
                // Update UI to reflect pending downgrade
                const statusEl = document.getElementById('plan-status');
                if (statusEl) {
                    statusEl.innerHTML = 'Active <span class="text-xs text-yellow-400">(Downgrading)</span>';
                }
            } catch (error) {
                console.error('Error scheduling downgrade:', error);
                showNotification('Failed to schedule downgrade. Please try again.', 'error');
            }
        }

        function displayDefaultSubscriptionData() {
            const walletAddress = localStorage.getItem('walletAddress');
            const defaultData = {
                plan: 'basic',
                planName: 'Basic Plan',
                status: 'active',
                price: 0,
                priceInSol: 0,
                billingCycle: 'free',
                nextPaymentDate: 'Never',
                tokensUsed: 0,
                tokensLimit: 1,
                walletsUsed: 1,
                walletsLimit: 1,
                paymentWallet: walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-5) : 'Not connected',
                streamId: 'N/A',
                billingHistory: [],
                planFeatures: window.PLANS.basic.features
            };
            displaySubscriptionData(defaultData);
        }
        
        function showNotification(message, type = 'info') {
            const colors = {
                success: 'bg-green-500/20 border-green-500/50 text-green-400',
                error: 'bg-red-500/20 border-red-500/50 text-red-400',
                warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
                info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
            };
            
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 ${colors[type]} border px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
            notification.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-sm">${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 10);
            
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 5000);
        }
    </script>
</body>
</html>