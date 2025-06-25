<?php
// Load main configuration (includes env-config and Sentry)
require_once 'config.php';
// Initialize protected token count
require_once 'config/supabase.php';

$protectedCount = 0;
$maxProtected = 5; // Default for Basic plan

// Check if user is logged in via Supabase auth
// Note: This is a placeholder - you'll need to implement proper session handling
// based on how you're managing authentication in your app
// For now, we'll use JavaScript to fetch this data

?>
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
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/custom-styles.css">
    
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
        
        /* Real-time notifications */
        .notification {
            @apply p-4 rounded-lg shadow-lg mb-2 flex items-center gap-3;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification-error {
            @apply bg-red-900/90 border border-red-700 text-red-100;
        }
        
        .notification-warning {
            @apply bg-yellow-900/90 border border-yellow-700 text-yellow-100;
        }
        
        .notification-info {
            @apply bg-blue-900/90 border border-blue-700 text-blue-100;
        }
        
        .notification-success {
            @apply bg-green-900/90 border border-green-700 text-green-100;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .animate-slide-in {
            animation: slideIn 0.3s ease-out;
        }
        
        .animate-slide-out {
            animation: slideOut 0.3s ease-in;
        }
        
        /* Risk tooltip */
        #risk-tooltip {
            pointer-events: none;
            z-index: 9999;
        }
    </style>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/config.js"></script>
    <script src="assets/js/backend-config.js"></script>
    <script src="assets/js/supabase-client.js"></script>
    <script src="assets/js/token-price-helper.js"></script>
    <script src="assets/js/supabase-token-fetcher.js"></script>
    
    <!-- Dashboard Modules -->
    <script src="assets/js/dashboard/notifications.js"></script>
    <script src="assets/js/dashboard/add-test-token.js"></script>
    <script src="assets/js/dashboard/demo-mode.js"></script>
    <script src="assets/js/dashboard/token-management.js"></script>
    <script src="assets/js/dashboard/dashboard-main.js"></script>
    
    <!-- Protection API and Toggle -->
    <script src="assets/js/protectionApi.js"></script>
    <script src="assets/js/protection-toggle.js"></script>
    <script src="assets/js/realtimeProtectionListener.js"></script>
    <script src="assets/js/monitoring-tooltip.js"></script>
    <script src="assets/js/dashboard/monitoring-integration.js"></script>
</head>
<body class="bg-black text-gray-100 font-sans antialiased">
    <?php include 'components/network-status.php'; ?>
    <?php include 'components/header.php'; ?>
    
    <main class="container mx-auto px-4 py-6 mt-8 max-w-[1600px]">
        <!-- Top Alert Banner -->
        <div class="mb-6 p-4 rounded-xl alert-banner">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <div class="absolute inset-0 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                    <div>
                        <span class="font-semibold text-white">Trading on Axiom or Neo Bullx?</span>
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
                <div id="protected-count" class="text-3xl font-bold text-white mb-1">...</div>
                <div id="protected-limit" class="text-xs text-gray-500">of <?= htmlspecialchars($maxProtected) ?> maximum</div>
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
            
            <!-- Telegram Alerts -->
            <?php include 'components/telegram-connect.php'; ?>
        </div>
        
        <!-- Token List Component -->
        <?php include 'components/token-list-v3.php'; ?>
        
        <!-- Subscription Features -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card-charcoal rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="font-semibold text-white text-sm">Basic Plan</h3>
                        <p class="text-xs text-gray-500 mt-0.5">Current subscription</p>
                    </div>
                    <a href="subscription.php" class="text-primary-400 text-xs hover:text-primary-300 transition-colors">Upgrade →</a>
                </div>
                <div class="space-y-2 mt-4">
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-400"><?= htmlspecialchars($maxProtected) ?> Protected Tokens</span>
                    </div>
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-gray-400">Real-time Monitoring</span>
                    </div>
                    <div class="flex items-center text-xs">
                        <svg class="w-3 h-3 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        <span class="text-gray-400">Priority Execution</span>
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
                <div class="text-3xl font-bold text-white mb-1">~5s</div>
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
                    <div id="protected-count-detailed" class="text-3xl font-bold text-white">...</div>
                    <div id="protected-limit-detailed" class="text-lg text-gray-500 ml-1">/ <?= htmlspecialchars($maxProtected) ?></div>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                    <div id="protected-progress-bar" class="bg-blue-400 h-1.5 rounded-full transition-all duration-500" style="width: 0%"></div>
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
                    <div class="text-3xl font-bold text-white">1</div>
                    <div class="text-lg text-gray-500 ml-1">DEX</div>
                </div>
                <div class="flex flex-wrap gap-1 mt-3">
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">Raydium</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-600">Upgrade for more</span>
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
    
    <!-- Wallet Settings Modal -->
    <?php include 'components/wallet-settings-modal.php'; ?>
    
    <!-- Wallet Connect Modal -->
    <?php include 'components/wallet-connect-modal.php'; ?>
    
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
                                    Never share your private key with anyone. Anyone with your private key has full control over your wallet and can steal all your funds. <strong>No legitimate support team will ever ask for your private key.</strong>
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
                                            <span class="text-gray-300"><strong>Phantom (Browser):</strong> Click avatar → Show Private Key → Select Solana</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Phantom (Mobile):</strong> Account name → Pencil icon → Show Private Key</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Solflare:</strong> Three dots → Export Private Key</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-500">•</span>
                                            <span class="text-gray-300"><strong>Backpack:</strong> Account icon → Three dots → Show Private Key</span>
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
                                        Your private key will be displayed. For Solana wallets, it's typically shown in one of these formats:
                                    </p>
                                    <div class="space-y-2 mb-3">
                                        <div class="p-3 rounded-lg bg-black/50 border border-gray-700 font-mono text-xs text-gray-400">
                                            <span class="text-gray-500">Base58:</span> 5KJvsn....[hidden]....gV9A3
                                        </div>
                                        <div class="p-3 rounded-lg bg-black/50 border border-gray-700 font-mono text-xs text-gray-400">
                                            <span class="text-gray-500">Array:</span> [237,158,92,107...hidden...]
                                        </div>
                                    </div>
                                    <div class="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                        <p class="text-sm text-orange-400">
                                            ⚠️ <strong>Important:</strong> Each wallet shows only the Solana private key. If you need keys for other chains (ETH, etc.), select those networks separately.
                                        </p>
                                    </div>
                                    <p class="text-sm text-red-400 mt-3">
                                        🔒 Copy it carefully and store it somewhere safe. Never save it in plain text files or share it online.
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
                                            <h4 class="text-sm font-semibold text-white mb-2">For Neo Bullx:</h4>
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
                                <span>Never enter your private key on suspicious websites or in web forms</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Store your private key offline (paper or encrypted password manager)</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Use a hardware wallet (Ledger, Trezor) for large amounts</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Consider using different wallets for trading and long-term storage</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Always verify the URL of the platform you're using</span>
                            </li>
                            <li class="flex items-start">
                                <span class="text-gray-500 mr-2">•</span>
                                <span>Your private key is stored locally on your device - keep your device secure</span>
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
    
    <!-- Protection Settings Modal -->
    <?php include 'components/protection-settings-modal.php'; ?>
    
    <!-- Solana Web3.js -->
    <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
    
    <!-- BS58 for base58 encoding/decoding -->
    <script src="https://cdn.jsdelivr.net/npm/bs58@5.0.0/dist/bs58.min.js"></script>
    
    <!-- Dashboard Scripts -->
    <script src="assets/js/supabase-config.js"></script>
    <script src="assets/js/main.js" type="module"></script>
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/auto-sell.js"></script>
    <script src="assets/js/payment.js"></script>
    <script src="assets/js/subscription-status.js"></script>
    <script src="assets/js/auto-protect-toggle.js"></script>
    <script>
        // TODO: LEGACY CODE BELOW - Functions moved to modular files
        // This script block can be removed once all functionality is verified
        // All functions below are now available in assets/js/dashboard/ modules
        async function loadQuickTryTokens() {
            const container = document.getElementById('quick-try-tokens');
            if (!container) return;
            
            try {
                // Show loading state
                container.innerHTML = `
                    <div class="flex gap-2 flex-wrap">
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                        <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                            <div class="h-4 w-12 bg-gray-700 rounded"></div>
                        </div>
                    </div>
                `;
                
                // Fetch latest tokens from Supabase (exclude test tokens)
                const { data: latestTokens, error } = await supabaseClient
                    .from('token_metadata')
                    .select('mint, symbol, name')
                    .not('symbol', 'eq', 'TEST')
                    .not('name', 'ilike', '%test%')
                    .not('symbol', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(6);
                
                if (error) {
                    console.error('Error fetching latest tokens:', error);
                    container.innerHTML = '<span class="text-xs text-gray-500">Failed to load tokens</span>';
                    return;
                }
                
                if (!latestTokens || latestTokens.length === 0) {
                    container.innerHTML = '<span class="text-xs text-gray-500">No tokens available</span>';
                    return;
                }
                
                // Clear loading state
                container.innerHTML = '';
                
                // Add token buttons
                latestTokens.forEach(token => {
                    const button = document.createElement('button');
                    button.className = 'px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium';
                    button.textContent = token.symbol || 'Unknown';
                    button.title = token.name || token.mint; // Show full name on hover
                    button.onclick = () => {
                        document.getElementById('demo-token-input').value = token.mint;
                    };
                    container.appendChild(button);
                });
            } catch (error) {
                console.error('Error loading quick try tokens:', error);
                container.innerHTML = '<span class="text-xs text-gray-500">Error loading tokens</span>';
            }
        }
        
        // Start demo function with full validation
        async function startDemo(event) {
            if (event) event.preventDefault();
            
            const input = document.getElementById('demo-token-input');
            const button = event.target.closest('button');
            const tokenMint = input.value.trim();
            
            // Clear any existing error styles
            input.classList.remove('border-red-500');
            
            // Validation 1: Check if empty
            if (!tokenMint) {
                showError('Please enter a token mint address', input);
                return;
            }
            
            // Validation 2: Check mint address format
            // Solana addresses are base58 encoded and typically 32-44 characters
            const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
            if (!base58Regex.test(tokenMint)) {
                showError('Invalid Solana address format. Must be a valid base58 string.', input);
                return;
            }
            
            // Validation 3: Check exact length and try to decode
            try {
                // Try to create a PublicKey to validate the address
                if (window.solanaWeb3) {
                    new window.solanaWeb3.PublicKey(tokenMint);
                }
            } catch (e) {
                showError('Invalid Solana mint address. Please check and try again.', input);
                return;
            }
            
            // Disable button and show loading state
            button.disabled = true;
            const originalContent = button.innerHTML;
            button.innerHTML = `
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Validating...</span>
            `;
            
            try {
                // Validation 4: Check if user is connected
                const walletAddress = localStorage.getItem('walletAddress');
                
                // Validation 5: Check if token already exists in user's wallet
                if (walletAddress && window.supabaseClient) {
                    const { data: existingTokens, error } = await supabaseClient
                        .from('wallet_tokens')
                        .select('*')
                        .eq('wallet_address', walletAddress)
                        .eq('token_mint', tokenMint);
                    
                    if (existingTokens && existingTokens.length > 0 && !error) {
                        showError('You already have this token in your wallet!', input);
                        button.disabled = false;
                        button.innerHTML = originalContent;
                        return;
                    }
                }
                
                // Validation 6: Check if it's a known scam token (optional)
                const scamTokens = [
                    // Add known scam token addresses here
                ];
                
                if (scamTokens.includes(tokenMint)) {
                    showError('Warning: This token has been flagged as potentially harmful.', input);
                    button.disabled = false;
                    button.innerHTML = originalContent;
                    return;
                }
                
                // Validation 7: Check token metadata exists
                button.innerHTML = `
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding token...</span>
                `;
                
                // Add token to test tokens
                const currentWalletAddress = localStorage.getItem('walletAddress');
                if (!currentWalletAddress) {
                    showError('Please connect your wallet first to try demo protection.', input);
                    button.disabled = false;
                    button.innerHTML = originalContent;
                    return;
                }
                
                // Use PHP endpoint for adding test tokens
                let response;
                let usedNodeBackend = false;
                
                try {
                    // Use simple endpoint with full metadata fetching
                    response = await fetch('api/test/add-token-simple.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tokenMint: tokenMint,
                            walletAddress: currentWalletAddress
                        })
                    });
                    
                    // Check if response is ok before proceeding
                    if (!response.ok && response.status === 404) {
                        // Only fallback to Node.js if PHP endpoint doesn't exist
                        console.log('PHP endpoint not found, trying Node.js backend...');
                        usedNodeBackend = true;
                        response = await fetch(`${window.BACKEND_URL || 'http://localhost:3001'}/api/test/add-token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                tokenMint: tokenMint,
                                walletAddress: currentWalletAddress,
                                action: 'monitor'
                            })
                        });
                    }
                } catch (networkError) {
                    // Only catch actual network errors, not HTTP errors
                    console.error('Network error:', networkError);
                    throw new Error('Network error: Unable to connect to server');
                }
                
                let data;
                const responseText = await response.text();
                console.log('Response from', usedNodeBackend ? 'Node.js backend' : 'PHP endpoint', ':', responseText);
                
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    console.error('Response text was:', responseText);
                    throw new Error('Server returned invalid JSON response');
                }
                
                if (data.success) {
                    // Check if token has metadata
                    if (!data.token?.symbol) {
                        showWarning('Token added, but it may not have complete metadata.', input);
                    } else {
                        showSuccess(`Successfully added ${data.token.symbol || 'token'} to monitoring!`);
                    }
                    
                    // Clear input
                    input.value = '';
                    
                    // Refresh token list after a small delay to ensure database consistency
                    setTimeout(() => {
                        if (typeof refreshTokensV3 === 'function') {
                            console.log('Refreshing token list after successful add...');
                            refreshTokensV3();
                        }
                        
                        // Also reload from Supabase directly
                        if (typeof loadFromSupabaseV3 === 'function') {
                            loadFromSupabaseV3();
                        }
                        
                        // Refresh protected tokens data
                        if (typeof window.refreshProtectedTokensData === 'function') {
                            window.refreshProtectedTokensData();
                        }
                    }, 1000); // 1 second delay to ensure database is updated
                } else {
                    // Handle specific error cases
                    if (data.error?.includes('already exists')) {
                        showError('This token is already being monitored.', input);
                    } else if (data.error?.includes('not found')) {
                        showError('Token not found on Solana. Please check the address.', input);
                    } else {
                        showError('Failed to add token: ' + (data.error || 'Unknown error'), input);
                    }
                }
            } catch (error) {
                console.error('Error adding token:', error);
                showError('Failed to connect to backend. Please ensure it\'s running.', input);
            } finally {
                // Re-enable button
                button.disabled = false;
                button.innerHTML = originalContent;
            }
        }
        
        // Helper function to show error messages
        function showError(message, inputElement) {
            if (inputElement && inputElement.classList) {
                inputElement.classList.add('border-red-500');
            }
            showNotification(message, 'error');
        }
        
        // Helper function to show success messages
        function showSuccess(message) {
            showNotification(message, 'success');
        }
        
        // Helper function to show warning messages
        function showWarning(message) {
            showNotification(message, 'warning');
        }
        
        // Helper function to show notifications
        function showNotification(message, type = 'info') {
            const colors = {
                success: 'bg-green-500/20 border-green-500/50 text-green-400',
                error: 'bg-red-500/20 border-red-500/50 text-red-400',
                warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
                info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
            };
            
            const icons = {
                success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
                error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
                warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
                info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
            };
            
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 ${colors[type]} border px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
            notification.innerHTML = `
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${icons[type]}
                    </svg>
                    <span class="text-sm">${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 10);
            
            // Remove after 5 seconds
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 5000);
        }
        
        // Check wallet connection on page load
        function checkWalletConnection() {
            const walletAddress = localStorage.getItem('walletAddress');
            const walletType = localStorage.getItem('walletType');
            
            if (!walletAddress || !walletType) {
                // Show wallet connection modal
                const modal = document.getElementById('wallet-connect-modal');
                if (modal) {
                    // Make modal non-dismissible
                    const backdrop = document.getElementById('wallet-connect-backdrop');
                    if (backdrop) {
                        backdrop.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Add shake animation to modal
                            const modalContent = modal.querySelector('.animate-scale-in');
                            if (modalContent) {
                                modalContent.classList.add('animate-shake');
                                setTimeout(() => {
                                    modalContent.classList.remove('animate-shake');
                                }, 500);
                            }
                        };
                    }
                    
                    // Hide close button
                    const closeBtn = modal.querySelector('button[onclick="closeWalletConnectModal()"]');
                    if (closeBtn) {
                        closeBtn.style.display = 'none';
                    }
                    
                    // Show modal
                    modal.classList.remove('hidden');
                    setTimeout(() => {
                        modal.querySelector('.animate-scale-in').classList.add('scale-100');
                    }, 10);
                    
                    // Add message about requiring wallet connection
                    const notifications = document.getElementById('wallet-connect-notifications');
                    if (notifications) {
                        notifications.innerHTML = `
                            <div class="border rounded-lg p-4 mb-4 bg-blue-500/10 border-blue-500/30 text-blue-400 animate-fade-in">
                                <div class="flex items-start gap-3">
                                    <i class="fas fa-info-circle mt-0.5"></i>
                                    <div>
                                        <p class="text-sm font-semibold">Wallet Connection Required</p>
                                        <p class="text-sm mt-1">You must connect your wallet to access the dashboard and manage your protected tokens.</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Listen for wallet connection
                    const checkConnection = setInterval(() => {
                        const connected = localStorage.getItem('walletAddress');
                        if (connected) {
                            clearInterval(checkConnection);
                            // Reload page to show dashboard with connected wallet
                            window.location.reload();
                        }
                    }, 500);
                }
                
                return false;
            }
            
            return true;
        }

        // Load protected tokens data
        async function loadProtectedTokensData() {
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) {
                updateProtectedTokensDisplay(0, 5); // Default to Basic plan limit
                return;
            }
            
            try {
                // Get current subscription/plan to determine limit
                const planLimit = await getCurrentPlanTokenLimit();
                
                // Fetch protected tokens count from Supabase
                const { count, error } = await supabaseClient
                    .from('protected_tokens')
                    .select('*', { count: 'exact', head: true })
                    .eq('wallet_address', walletAddress)
                    .eq('monitoring_enabled', true)
                    .eq('is_active', true);
                
                if (error) {
                    console.error('Error fetching protected tokens:', error);
                    updateProtectedTokensDisplay(0, planLimit);
                    return;
                }
                
                const protectedCount = count || 0;
                updateProtectedTokensDisplay(protectedCount, planLimit);
                
            } catch (error) {
                console.error('Error loading protected tokens data:', error);
                updateProtectedTokensDisplay(0, 5); // Default to Basic plan
            }
        }
        
        // Get current plan token limit
        async function getCurrentPlanTokenLimit() {
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) return 5; // Default Basic plan
            
            try {
                // Try to get subscription from Supabase
                const { data: users, error } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress);
                
                if (error || !users || users.length === 0) {
                    return 5; // Default Basic plan if no user found
                }
                
                const user = users[0];
                
                if (user && user.id) {
                    console.log('Querying subscriptions for user ID:', user.id);
                    const { data: subscriptions, error: subError } = await supabaseClient
                        .from('subscriptions')
                        .select('plan')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1);
                    
                    if (subError) {
                        console.error('Subscription query error:', subError);
                        return 5; // Default to Basic plan on error
                    }
                    
                    if (!subError && subscriptions && subscriptions.length > 0) {
                        const subscription = subscriptions[0];
                        // Extract token limit from plan
                        const planName = subscription.plan?.toLowerCase();
                        if (planName?.includes('pro')) return 50;
                        if (planName?.includes('premium')) return 100;
                        if (planName?.includes('enterprise')) return -1; // Unlimited
                    }
                }
                
                return 5; // Default to Basic plan
            } catch (error) {
                console.error('Error fetching plan limit:', error);
                return 5; // Default to Basic plan
            }
        }
        
        // Update protected tokens display
        function updateProtectedTokensDisplay(protectedCount, planLimit) {
            // Update main stats card
            const protectedCountEl = document.getElementById('protected-count');
            const protectedLimitEl = document.getElementById('protected-limit');
            
            if (protectedCountEl) {
                protectedCountEl.textContent = protectedCount.toString();
            }
            
            if (protectedLimitEl) {
                const limitText = planLimit === -1 ? 'unlimited' : planLimit.toString();
                protectedLimitEl.textContent = `of ${limitText} maximum`;
            }
            
            // Update detailed card
            const protectedCountDetailedEl = document.getElementById('protected-count-detailed');
            const protectedLimitDetailedEl = document.getElementById('protected-limit-detailed');
            const progressBarEl = document.getElementById('protected-progress-bar');
            
            if (protectedCountDetailedEl) {
                protectedCountDetailedEl.textContent = protectedCount.toString();
            }
            
            if (protectedLimitDetailedEl) {
                const limitText = planLimit === -1 ? '∞' : planLimit.toString();
                protectedLimitDetailedEl.textContent = `/ ${limitText}`;
            }
            
            if (progressBarEl) {
                let percentage = 0;
                if (planLimit === -1) {
                    // For unlimited plans, show a small percentage based on usage
                    percentage = Math.min((protectedCount / 10) * 100, 100);
                } else if (planLimit > 0) {
                    percentage = (protectedCount / planLimit) * 100;
                }
                progressBarEl.style.width = `${Math.min(percentage, 100)}%`;
                
                // Update color based on usage
                progressBarEl.className = progressBarEl.className.replace(/bg-\w+-\d+/, '');
                if (percentage >= 90) {
                    progressBarEl.classList.add('bg-red-400');
                } else if (percentage >= 70) {
                    progressBarEl.classList.add('bg-yellow-400');
                } else {
                    progressBarEl.classList.add('bg-blue-400');
                }
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Check wallet connection first
            const isConnected = checkWalletConnection();
            
            if (isConnected) {
                // Wait for Supabase to be ready
                const checkSupabase = setInterval(() => {
                    if (window.supabaseClient) {
                        clearInterval(checkSupabase);
                        loadQuickTryTokens();
                        // Commented out - using new simple counter instead
                        // loadProtectedTokensData();
                    }
                }, 100);
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkSupabase);
                    const container = document.getElementById('quick-try-tokens');
                    if (container && container.innerHTML.includes('animate-pulse')) {
                        container.innerHTML = '<span class="text-xs text-gray-500">Unable to load tokens</span>';
                    }
                }, 5000);
            }
        });
        
        // Real-time setup is handled by token-management.js module
        
        // Refresh protected tokens data (can be called externally)
        // Disabled - using simple counter instead
        // window.refreshProtectedTokensData = loadProtectedTokensData;
        
        // Real-time initialization is handled by dashboard-main.js
        
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
        
        // END OF LEGACY CODE - All functions above are now in modular files
        // Dashboard will initialize automatically via dashboard-main.js
    </script>
    
    <!-- Protected Token Counter -->
    <script src="assets/js/dashboard/protected-token-counter-simple.js"></script>
    
    <!-- Real-Time Risk Display -->
    <script src="assets/js/dashboard/real-time-risk.js"></script>
    
    <!-- Token Data Fetcher - Automatically fetches data for newly added tokens -->
    <script src="assets/js/dashboard/token-data-fetcher.js"></script>
</body>
</html>