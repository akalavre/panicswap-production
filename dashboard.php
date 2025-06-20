<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - PanicSwap</title>
    <meta name="description" content="Monitor and manage your protected tokens">
    
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

        .card-stat {
            background: linear-gradient(135deg, #1a1a1a 0%, #141414 100%);
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
        }

        .card-stat::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        }

        .stat-glow {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
            opacity: 0.1;
            pointer-events: none;
        }
        
        .gradient-border {
            background: linear-gradient(90deg, #FF4B36 0%, #9333EA 100%);
            padding: 1px;
            border-radius: 0.5rem;
        }
        
        .pool-monitoring-bar {
            background: #141414;
            border: 1px solid rgba(34, 197, 94, 0.2);
            position: relative;
        }

        .pool-monitoring-bar::before {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: 0.5rem;
            padding: 1px;
            background: linear-gradient(90deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
        }
        
        .token-row:hover {
            background: rgba(255, 255, 255, 0.02);
        }
        
        .risk-low { color: #10b981; }
        .risk-medium { color: #f59e0b; }
        .risk-high { color: #ef4444; }
        
        .platform-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
        }
        
        .badge-pump { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .badge-raydium { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
        .badge-orca { background: rgba(251, 146, 60, 0.2); color: #fb923c; }

        .feature-card {
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.06);
            transition: all 0.3s ease;
        }

        .feature-card:hover {
            border-color: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }

        .alert-banner {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
            border: 1px solid rgba(168, 85, 247, 0.2);
            backdrop-filter: blur(10px);
        }
    </style>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/config.js"></script>
    <script src="assets/js/backend-config.js"></script>
    <script src="assets/js/supabase-client.js"></script>
    <script src="assets/js/token-price-helper.js"></script>
    <script src="assets/js/supabase-token-fetcher.js"></script>
</head>
<body class="bg-black text-gray-100 font-sans antialiased">
    <?php include 'components/network-status.php'; ?>
    <?php include 'components/header.php'; ?>
    
    <main class="container mx-auto px-4 py-6 mt-16 max-w-[1600px]">
        <!-- Top Alert Banner -->
        <div class="mb-6 p-4 rounded-xl alert-banner">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <div class="absolute inset-0 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                    <div>
                        <span class="font-semibold text-white">Trading on Axiom or New Bulls?</span>
                        <p class="text-sm text-gray-400 mt-1">
                            You are missing many opportunities to trade on your favorite platform. Export your private key and import it into a compatible wallet.
                        </p>
                        <button id="open-guide-modal" class="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors">
                            View Step-by-Step Guide →
                        </button>
                    </div>
                </div>
                <button class="text-gray-500 hover:text-gray-300 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <!-- Total Portfolio Value -->
            <div class="card-stat rounded-xl p-6">
                <div class="stat-glow" style="--glow-color: #10b981;"></div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Portfolio Value</span>
                    <div class="p-2 rounded-lg bg-green-400/10">
                        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                    </div>
                </div>
                <div id="portfolio-value" class="text-3xl font-bold text-white mb-1">$0.00</div>
                <div class="flex items-center text-xs">
                    <span id="portfolio-change" class="text-green-400">+0.00%</span>
                    <span class="text-gray-600 ml-1">24h</span>
                </div>
            </div>
            
            <!-- Protected Tokens -->
            <div class="card-stat rounded-xl p-6">
                <div class="stat-glow" style="--glow-color: #3b82f6;"></div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Protected</span>
                    <div class="p-2 rounded-lg bg-blue-400/10">
                        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                    </div>
                </div>
                <div id="protected-count" class="text-3xl font-bold text-white mb-1">0</div>
                <div class="text-xs text-gray-500">of 15 maximum</div>
            </div>
            
            <!-- Total Tokens -->
            <div class="card-stat rounded-xl p-6">
                <div class="stat-glow" style="--glow-color: #a855f7;"></div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Total Tokens</span>
                    <div class="p-2 rounded-lg bg-purple-400/10">
                        <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                </div>
                <div id="total-tokens" class="text-3xl font-bold text-white mb-1">0</div>
                <div class="text-xs text-gray-500">across all wallets</div>
            </div>
            
            <!-- Active Alerts -->
            <div class="card-stat rounded-xl p-6">
                <div class="stat-glow" style="--glow-color: #f97316;"></div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Active Alerts</span>
                    <div class="p-2 rounded-lg bg-orange-400/10">
                        <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                    </div>
                </div>
                <div class="text-3xl font-bold text-white mb-1">0</div>
                <div class="text-xs text-gray-500">monitoring active</div>
            </div>
        </div>
        
        <!-- Pool Monitoring Active Bar -->
        <div class="pool-monitoring-bar rounded-xl p-4 mb-6 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="relative">
                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div class="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <div>
                    <span class="text-sm font-medium text-white">Pool Monitoring Active</span>
                    <span class="text-xs text-gray-500 ml-2">Monitoring liquidity for 3 tokens on Pump.fun</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button class="text-xs text-green-400 hover:text-green-300 transition-colors">Configure</button>
                <button class="text-xs text-gray-500 hover:text-gray-300 transition-colors">View Activity</button>
            </div>
        </div>
        
        <!-- DEX Coverage Bar -->
        <div class="mb-6">
            <div class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-900/10 to-pink-900/10 border border-purple-900/20">
                <div class="flex items-center space-x-3">
                    <div class="p-2 rounded-lg bg-purple-400/10">
                        <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <div>
                        <span class="text-sm font-medium text-white">DEX Coverage: 6 of 11 Available</span>
                        <span class="text-xs text-gray-500 ml-2">Upgrade to Degen Mode for full coverage</span>
                    </div>
                </div>
                <button class="text-xs text-purple-400 hover:text-purple-300 transition-colors">View Details →</button>
            </div>
        </div>
        
        <!-- Token List Component -->
        <?php include 'components/token-list-v3.php'; ?>
        
        <!-- Subscription Features -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card-charcoal rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="font-semibold text-white text-sm">Pro Plan</h3>
                        <p class="text-xs text-gray-500 mt-0.5">Current subscription</p>
                    </div>
                    <button class="text-primary-400 text-xs hover:text-primary-300 transition-colors">Manage →</button>
                </div>
                <div class="space-y-2 mt-4">
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-400">15 Protected Tokens</span>
                    </div>
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-400">Priority Execution</span>
                    </div>
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-400">Custom Triggers</span>
                    </div>
                </div>
            </div>
            
            <div class="card-charcoal rounded-xl p-6">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</h4>
                    <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <div class="text-3xl font-bold text-white mb-1">~3s</div>
                <div class="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                    <div class="bg-green-400 h-1.5 rounded-full" style="width: 85%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">Avg protection speed</div>
            </div>
            
            <div class="card-charcoal rounded-xl p-6">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Protected</h4>
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <div class="flex items-baseline">
                    <div class="text-3xl font-bold text-white">3</div>
                    <div class="text-lg text-gray-500 ml-1">/ 15</div>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                    <div class="bg-blue-400 h-1.5 rounded-full" style="width: 20%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">Token slots used</div>
            </div>
            
            <div class="card-charcoal rounded-xl p-6">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wider">DEX Coverage</h4>
                    <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <div class="flex items-baseline">
                    <div class="text-3xl font-bold text-white">6</div>
                    <div class="text-lg text-gray-500 ml-1">DEXs</div>
                </div>
                <div class="flex flex-wrap gap-1 mt-3">
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">Raydium</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">Orca</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">+4</span>
                </div>
            </div>
        </div>
        
        <!-- Additional Features Cards -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="feature-card rounded-xl p-5 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 rounded-lg bg-green-400/10">
                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-white text-sm">Custom Triggers</h4>
                        <p class="text-xs text-gray-500 mt-0.5">Advanced protection rules</p>
                    </div>
                </div>
                <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span class="text-xs text-green-400">Active</span>
                </div>
            </div>
            
            <div class="feature-card rounded-xl p-5 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 rounded-lg bg-blue-400/10">
                        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-white text-sm">Priority Execution</h4>
                        <p class="text-xs text-gray-500 mt-0.5">Faster trades during high traffic</p>
                    </div>
                </div>
                <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span class="text-xs text-green-400">Active</span>
                </div>
            </div>
            
            <div class="feature-card rounded-xl p-5 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 rounded-lg bg-purple-400/10">
                        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-white text-sm">MEV Protection</h4>
                        <p class="text-xs text-gray-500 mt-0.5">Advanced slippage & sandwich protection</p>
                    </div>
                </div>
                <button class="text-xs text-gray-400 border border-gray-700 px-3 py-1 rounded hover:border-gray-600 transition-colors">Standard</button>
            </div>
            
            <div class="feature-card rounded-xl p-5 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 rounded-lg bg-orange-400/10">
                        <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-white text-sm">Transaction History</h4>
                        <p class="text-xs text-gray-500 mt-0.5">Export transaction history</p>
                    </div>
                </div>
                <span class="text-xs text-orange-400 font-medium">30 days</span>
            </div>
        </div>
    </main>
    
    <?php include 'components/footer.php'; ?>
    
    <!-- Step by Step Guide Modal -->
    <div id="guide-modal" class="fixed inset-0 z-50 hidden">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" id="guide-modal-backdrop"></div>
        
        <!-- Modal -->
        <div class="relative z-10 flex items-center justify-center min-h-screen p-4">
            <div class="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
                <!-- Header -->
                <div class="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-white">Export Private Key Guide</h2>
                        <p class="text-sm text-gray-400 mt-1">Follow these steps to export your private key and use it on other platforms</p>
                    </div>
                    <button id="close-guide-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Content -->
                <div class="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <!-- Warning Banner -->
                    <div class="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div class="flex items-start space-x-3">
                            <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-red-400">Security Warning</p>
                                <p class="text-sm text-gray-300 mt-1">
                                    Never share your private key with anyone. Anyone with your private key has full control over your wallet and can steal all your funds.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Steps -->
                    <div class="space-y-6">
                        <!-- Step 1 -->
                        <div class="relative">
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <span class="text-sm font-bold text-purple-400">1</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Open Your Wallet Settings</h3>
                                    <p class="text-gray-400 mb-3">
                                        Navigate to your wallet's settings or security section. The location varies by wallet:
                                    </p>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Phantom:</strong> Settings → Security & Privacy</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Solflare:</strong> Settings → Export Private Key</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Backpack:</strong> Settings → Show Secret Key</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 2 -->
                        <div class="relative">
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <span class="text-sm font-bold text-purple-400">2</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Verify Your Identity</h3>
                                    <p class="text-gray-400 mb-3">
                                        You'll be asked to enter your wallet password or use biometric authentication to prove you're the wallet owner.
                                    </p>
                                    <div class="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                                        <p class="text-sm text-gray-300">
                                            <strong>Tip:</strong> Make sure you're in a private location and no one can see your screen.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 3 -->
                        <div class="relative">
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <span class="text-sm font-bold text-purple-400">3</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Copy Your Private Key</h3>
                                    <p class="text-gray-400 mb-3">
                                        Your private key will be displayed. It's usually a long string of characters (base58 format for Solana).
                                    </p>
                                    <div class="p-4 rounded-lg bg-black/50 border border-gray-700 font-mono text-xs text-gray-400">
                                        Example: 5KJvsn....[hidden]....gV9A3
                                    </div>
                                    <p class="text-sm text-orange-400 mt-3">
                                        ⚠️ Copy it carefully and store it somewhere safe. Do not save it in plain text files or share it online.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 4 -->
                        <div class="relative">
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <span class="text-sm font-bold text-purple-400">4</span>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Import to Compatible Wallet</h3>
                                    <p class="text-gray-400 mb-3">
                                        Open your trading platform's compatible wallet and look for the "Import Wallet" option:
                                    </p>
                                    <div class="space-y-3">
                                        <div class="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                                            <h4 class="text-sm font-semibold text-white mb-2">For Axiom Trading:</h4>
                                            <p class="text-sm text-gray-400">Use Phantom, Solflare, or any Solana wallet that supports WalletConnect</p>
                                        </div>
                                        <div class="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                                            <h4 class="text-sm font-semibold text-white mb-2">For New Bulls:</h4>
                                            <p class="text-sm text-gray-400">Import directly into their web wallet or use MetaMask with Solana snap</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 5 -->
                        <div class="relative">
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Start Trading</h3>
                                    <p class="text-gray-400 mb-3">
                                        Once imported, you can use the same wallet across multiple platforms while PanicSwap continues to protect your tokens.
                                    </p>
                                    <div class="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                        <p class="text-sm text-green-400">
                                            <strong>Pro tip:</strong> PanicSwap protection works across all platforms where you use your wallet!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Additional Tips -->
                    <div class="mt-8 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                        <h4 class="text-sm font-semibold text-white mb-3">Security Best Practices:</h4>
                        <ul class="space-y-2 text-sm text-gray-400">
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Never enter your private key on suspicious websites</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Use a hardware wallet for large amounts</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Consider using different wallets for trading and long-term storage</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Always verify the URL of the platform you're using</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-gray-500">
                            Remember: Your private key is like your bank password. Keep it secret, keep it safe.
                        </p>
                        <button id="close-guide-modal-footer" class="btn btn-primary">
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Payment Modal -->
    <?php include 'components/payment-modal.php'; ?>
    
    <!-- Dashboard Scripts -->
    <script src="assets/js/main.js"></script>
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/payment.js"></script>
    <script src="assets/js/subscription-status.js"></script>
    <script src="fix-price-display.js"></script>
    <script>
        // Guide Modal functionality
        const guideModal = document.getElementById('guide-modal');
        const openGuideBtn = document.getElementById('open-guide-modal');
        const closeGuideBtns = [
            document.getElementById('close-guide-modal'),
            document.getElementById('close-guide-modal-footer'),
            document.getElementById('guide-modal-backdrop')
        ];
        
        // Open modal
        if (openGuideBtn) {
            openGuideBtn.addEventListener('click', function() {
                guideModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            });
        }
        
        // Close modal
        closeGuideBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function() {
                    guideModal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                });
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !guideModal.classList.contains('hidden')) {
                guideModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    </script>
</body>
</html>