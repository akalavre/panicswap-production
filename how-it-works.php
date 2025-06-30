<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How It Works - PanicSwap</title>
    <meta name="description" content="Discover how PanicSwap's cutting-edge technology protects your Solana tokens from rug pulls and market crashes">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    
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
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'slide-up': 'slideUp 0.5s ease-out',
                        'slide-down': 'slideDown 0.5s ease-out',
                        'fade-in': 'fadeIn 0.5s ease-out',
                        'scale-in': 'scaleIn 0.5s ease-out',
                        'bounce-slow': 'bounce 3s infinite',
                        'gradient': 'gradient 8s ease infinite',
                        'glow': 'glow 2s ease-in-out infinite',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-20px)' },
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(20px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' },
                        },
                        slideDown: {
                            '0%': { transform: 'translateY(-20px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' },
                        },
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                        scaleIn: {
                            '0%': { transform: 'scale(0.9)', opacity: '0' },
                            '100%': { transform: 'scale(1)', opacity: '1' },
                        },
                        gradient: {
                            '0%, 100%': {
                                'background-size': '200% 200%',
                                'background-position': 'left center'
                            },
                            '50%': {
                                'background-size': '200% 200%',
                                'background-position': 'right center'
                            }
                        },
                        glow: {
                            '0%, 100%': {
                                'box-shadow': '0 0 20px rgba(255, 75, 54, 0.5), 0 0 40px rgba(255, 75, 54, 0.3)'
                            },
                            '50%': {
                                'box-shadow': '0 0 30px rgba(255, 75, 54, 0.8), 0 0 60px rgba(255, 75, 54, 0.4)'
                            }
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
    
    <style>
        body {
            background: #0a0a0a;
            background-image: 
                radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120, 119, 198, 0.15), transparent),
                radial-gradient(ellipse 80% 80% at 80% 80%, rgba(255, 75, 54, 0.08), transparent),
                radial-gradient(ellipse 80% 80% at 20% 30%, rgba(255, 75, 54, 0.05), transparent);
        }
        
        .hero-gradient {
            background: linear-gradient(135deg, rgba(255, 75, 54, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
        }
        
        .card-glow {
            background: rgba(20, 20, 20, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .card-glow:hover {
            border-color: rgba(255, 75, 54, 0.5);
            box-shadow: 0 0 30px rgba(255, 75, 54, 0.2);
            transform: translateY(-5px);
        }
        
        .step-card {
            background: linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%);
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
        }
        
        .step-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 75, 54, 0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .step-card:hover::before {
            opacity: 1;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        .detection-card {
            background: rgba(15, 15, 15, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .detection-card:hover {
            transform: translateY(-5px) scale(1.02);
            border-color: rgba(255, 75, 54, 0.3);
        }
        
        .timeline-line {
            background: linear-gradient(to bottom, transparent, rgba(255, 75, 54, 0.5), transparent);
            width: 2px;
            height: 100%;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .stat-number {
            background: linear-gradient(135deg, #FF4B36 0%, #9333EA 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .scroll-indicator {
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-10px);
            }
            60% {
                transform: translateY(-5px);
            }
        }
        
        .fade-in-section {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        
        .fade-in-section.visible {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <!-- Wallet Scripts -->
    <script src="assets/js/supabase-config.js"></script>
    <script src="assets/js/wallet-state.js"></script>
    <script src="assets/js/global-wallet-restore.js"></script>
    <script src="assets/js/components/wallet-status-component.js"></script>
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/wallet-button-ui.js"></script>
    <script src="assets/js/main.js"></script>
</head>
<body class="bg-black text-gray-100 font-sans antialiased">
    <?php include 'components/network-status.php'; ?>
    <?php include 'components/header.php'; ?>
    
    <main>
        <!-- Hero Section -->
        <section class="relative py-24 px-4 overflow-hidden">
            <!-- Animated Background Elements -->
            <div class="absolute inset-0 -z-10">
                <div class="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div class="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
            </div>
            
            <!-- Hero Content -->
            <div class="container mx-auto max-w-5xl">
                <div class="text-center">
                    <div class="mb-6">
                        <span class="inline-block px-4 py-2 text-sm font-semibold text-primary-400 bg-primary-500/10 rounded-full border border-primary-500/20">
                            🛡️ Advanced Protection Technology
                        </span>
                    </div>
                    
                    <h1 class="text-4xl md:text-6xl font-bold mb-6">
                        How <span class="text-primary-400">PanicSwap</span> Works
                    </h1>
                    
                    <p class="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        Automated token monitoring and protection for Solana traders.
                        <span class="text-primary-400">24/7 monitoring, even when you're offline.</span>
                    </p>
                    
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="dashboard.php" class="btn btn-primary inline-flex items-center justify-center">
                            Start Protection Now
                            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </a>
                        <button class="btn btn-outline inline-flex items-center justify-center">
                            Watch Demo
                            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Simple Process Steps -->
        <section class="py-20 px-4 bg-gray-900/30">
            <div class="container mx-auto max-w-6xl">
                <div class="text-center mb-16">
                    <h2 class="text-3xl md:text-4xl font-bold mb-4">
                        Protection in <span class="text-primary-400">3 Simple Steps</span>
                    </h2>
                    <p class="text-xl text-gray-400">
                        Set it up once, protected forever
                    </p>
                </div>
                
                <!-- Steps Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Step 1 -->
                    <div class="text-center">
                        <div class="mb-6">
                            <div class="w-20 h-20 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold text-primary-400">1</span>
                            </div>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">Connect & Select</h3>
                        <p class="text-gray-400">
                            Connect your wallet and select tokens to monitor. Set your protection preferences and exit strategies.
                        </p>
                        <div class="mt-6 space-y-2">
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Quick Setup
                            </div>
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Up to 20 tokens
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 2 -->
                    <div class="text-center">
                        <div class="mb-6">
                            <div class="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold text-purple-400">2</span>
                            </div>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">24/7 Monitoring</h3>
                        <p class="text-gray-400">
                            Monitor token prices, liquidity, and trading activity. Get alerts for significant changes or suspicious patterns.
                        </p>
                        <div class="mt-6 space-y-2">
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Price tracking
                            </div>
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                DEX monitoring
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 3 -->
                    <div class="text-center">
                        <div class="mb-6">
                            <div class="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold text-green-400">3</span>
                            </div>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">Smart Alerts</h3>
                        <p class="text-gray-400">
                            Receive instant notifications when your triggers are met. Take action quickly with one-click access to your positions.
                        </p>
                        <div class="mt-6 space-y-2">
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Email alerts
                            </div>
                            <div class="inline-flex items-center text-sm text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Custom triggers
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Protection Modes Section -->
        <section id="protection-modes" class="py-20 px-4 bg-black/50 fade-in-section">
            <div class="container mx-auto max-w-6xl">
                <div class="text-center mb-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-4">
                        Choose Your <span class="stat-number">Protection Level</span>
                    </h2>
                    <p class="text-xl text-gray-400 max-w-3xl mx-auto">
                        PanicSwap offers two distinct protection modes to suit different security preferences and risk tolerances.
                    </p>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <!-- Full Protection Mode -->
                    <div class="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden">
                        <div class="absolute top-0 right-0 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-bl-lg text-sm font-semibold">
                            Premium
                        </div>
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">🛡️ Full Protection Mode</h3>
                                <p class="text-amber-300">Maximum security with automatic emergency swaps</p>
                            </div>
                        </div>
                        
                        <div class="space-y-4 mb-6">
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Instant Emergency Swaps</span>
                                    <p class="text-gray-300 text-sm">Automatic sell execution when threats are detected</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Real-time Monitoring</span>
                                    <p class="text-gray-300 text-sm">Continuous threat detection and analysis</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Instant Alerts</span>
                                    <p class="text-gray-300 text-sm">Immediate notifications via dashboard and Telegram</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <div>
                                    <span class="text-amber-200 font-semibold">Requires Wallet Connection</span>
                                    <p class="text-gray-300 text-sm">For transaction signing and automatic execution</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <p class="text-amber-200 text-sm">
                                <strong>Best for:</strong> Active traders who want maximum protection and don't mind connecting their wallet for automatic execution.
                            </p>
                        </div>
                    </div>
                    
                    <!-- Watch-Only Mode -->
                    <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-8 relative overflow-hidden">
                        <div class="absolute top-0 right-0 bg-green-500/20 text-green-300 px-3 py-1 rounded-bl-lg text-sm font-semibold">
                            Free Tier
                        </div>
                        <div class="flex items-center gap-4 mb-6">
                            <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">👁️ Watch-Only Mode</h3>
                                <p class="text-blue-300">Monitoring and alerts without wallet connection</p>
                            </div>
                        </div>
                        
                        <div class="space-y-4 mb-6">
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Real-time Monitoring</span>
                                    <p class="text-gray-300 text-sm">Track any wallet address for potential threats</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Instant Alerts</span>
                                    <p class="text-gray-300 text-sm">Get notified immediately when threats are detected</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <span class="text-white font-semibold">Manual Address Entry</span>
                                    <p class="text-gray-300 text-sm">Simply enter any Solana wallet address to monitor</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <svg class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                                <div>
                                    <span class="text-blue-300 font-semibold">No Private Keys Required</span>
                                    <p class="text-gray-300 text-sm">Complete security with zero wallet connection</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <p class="text-blue-200 text-sm">
                                <strong>Best for:</strong> Security-conscious users who prefer manual control and don't want to connect their wallet, or users monitoring multiple addresses.
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Comparison Note -->
                <div class="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
                    <h4 class="text-2xl font-semibold text-white mb-4">🔄 Switch Anytime</h4>
                    <p class="text-gray-300 text-lg max-w-2xl mx-auto">
                        You can easily switch between protection modes at any time. Start with Watch-Only Mode to explore safely, then upgrade to Full Protection when you're ready for automatic execution.
                    </p>
                    <div class="mt-6">
                        <a href="dashboard.php" class="btn btn-primary inline-flex items-center">
                            Try Both Modes
                            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Detection Methods Grid -->
        <section class="py-20 px-4 bg-gray-900/30 fade-in-section">
            <div class="container mx-auto max-w-6xl">
                <div class="text-center mb-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-4">
                        What We <span class="stat-number">Monitor</span>
                    </h2>
                    <p class="text-xl text-gray-400">
                        Comprehensive monitoring across Solana DEXs and trading platforms
                    </p>
                </div>
                
                <div class="feature-grid">
                    <!-- Liquidity Monitoring -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">Price Monitoring</h3>
                        <p class="text-gray-400 mb-4">
                            Real-time price tracking across multiple DEXs with customizable alerts for price movements.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Real-time prices
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Price alerts
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                24h change tracking
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Developer Activity -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">DEX Coverage</h3>
                        <p class="text-gray-400 mb-4">
                            Monitor tokens across major Solana DEXs and trading platforms for comprehensive coverage.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Raydium pools
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Pump.fun launches
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Jupiter aggregator
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Token Metrics -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">Token Metrics</h3>
                        <p class="text-gray-400 mb-4">
                            Monitor key token metrics including market cap, holder distribution, and supply changes.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Market cap tracking
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Holder analysis
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Supply monitoring
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Trading Patterns -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">Portfolio Tracking</h3>
                        <p class="text-gray-400 mb-4">
                            Track your token holdings across multiple wallets with comprehensive portfolio analytics.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Total value tracking
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                P&L calculations
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Multi-wallet support
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Smart Contract -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">Risk Assessment</h3>
                        <p class="text-gray-400 mb-4">
                            Evaluate token risk levels based on multiple factors to help make informed decisions.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Risk scoring
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Liquidity analysis
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Trading patterns
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Volume Analysis -->
                    <div class="detection-card rounded-2xl p-8 group">
                        <div class="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold mb-3">Volume Analysis</h3>
                        <p class="text-gray-400 mb-4">
                            Track trading volume patterns and liquidity changes to identify potential market movements.
                        </p>
                        <ul class="space-y-2 text-sm">
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                24h volume tracking
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Liquidity changes
                            </li>
                            <li class="flex items-center text-gray-500">
                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Buy/sell pressure
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Live Statistics -->
        <section class="py-20 px-4 fade-in-section">
            <div class="container mx-auto max-w-6xl">
                <div class="text-center mb-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-4">
                        Protection <span class="stat-number">Statistics</span>
                    </h2>
                    <p class="text-xl text-gray-400">
                        Real performance data from our protection system
                    </p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div class="card-glow rounded-2xl p-8 text-center">
                        <div class="text-5xl font-bold stat-number mb-2" data-count="127">0</div>
                        <div class="text-gray-400">Active Monitors</div>
                        <div class="text-sm text-green-400 mt-2">+18 this week</div>
                    </div>
                    
                    <div class="card-glow rounded-2xl p-8 text-center">
                        <div class="text-5xl font-bold stat-number mb-2">$<span data-count="384">0</span>K</div>
                        <div class="text-gray-400">Total Volume</div>
                        <div class="text-sm text-green-400 mt-2">+$42K today</div>
                    </div>
                    
                    <div class="card-glow rounded-2xl p-8 text-center">
                        <div class="text-5xl font-bold stat-number mb-2" data-count="5">0</div>
                        <div class="text-gray-400">DEXs Supported</div>
                        <div class="text-sm text-gray-500 mt-2">Across Solana</div>
                    </div>
                    
                    <div class="card-glow rounded-2xl p-8 text-center">
                        <div class="text-5xl font-bold stat-number mb-2"><span data-count="24">0</span>/7</div>
                        <div class="text-gray-400">Monitoring</div>
                        <div class="text-sm text-blue-400 mt-2">Always online</div>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- FAQ Section -->
        <section class="py-20 px-4 bg-gray-900/30 fade-in-section">
            <div class="container mx-auto max-w-4xl">
                <div class="text-center mb-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-4">
                        Frequently Asked <span class="stat-number">Questions</span>
                    </h2>
                    <p class="text-xl text-gray-400">
                        Everything you need to know about PanicSwap
                    </p>
                </div>
                
                <div class="space-y-4">
                    <!-- FAQ 1 -->
                    <div class="faq-item card-glow rounded-xl overflow-hidden">
                        <button class="w-full p-6 text-left flex items-center justify-between" onclick="toggleFAQ(this)">
                            <h3 class="text-lg font-semibold">How fast can PanicSwap exit my position?</h3>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="faq-content hidden px-6 pb-6">
                            <p class="text-gray-400">
                                PanicSwap typically executes exits within 3-5 seconds of detecting a threat. Our system uses priority transactions and MEV protection to ensure your swap goes through even during high network congestion.
                            </p>
                        </div>
                    </div>
                    
                    <!-- FAQ 2 -->
                    <div class="faq-item card-glow rounded-xl overflow-hidden">
                        <button class="w-full p-6 text-left flex items-center justify-between" onclick="toggleFAQ(this)">
                            <h3 class="text-lg font-semibold">Do I need to keep my wallet connected?</h3>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="faq-content hidden px-6 pb-6">
                            <p class="text-gray-400">
                                No! Once you've set up protection, you can disconnect your wallet. PanicSwap uses secure delegation to execute trades on your behalf only when danger is detected. Your private keys remain safe and in your control.
                            </p>
                        </div>
                    </div>
                    
                    <!-- FAQ 3 -->
                    <div class="faq-item card-glow rounded-xl overflow-hidden">
                        <button class="w-full p-6 text-left flex items-center justify-between" onclick="toggleFAQ(this)">
                            <h3 class="text-lg font-semibold">What happens to my tokens after an exit?</h3>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="faq-content hidden px-6 pb-6">
                            <p class="text-gray-400">
                                Your tokens are automatically swapped to SOL and remain in your wallet. You receive an instant notification with full transaction details. You can re-enter positions anytime you feel safe.
                            </p>
                        </div>
                    </div>
                    
                    <!-- FAQ 4 -->
                    <div class="faq-item card-glow rounded-xl overflow-hidden">
                        <button class="w-full p-6 text-left flex items-center justify-between" onclick="toggleFAQ(this)">
                            <h3 class="text-lg font-semibold">Can I customize my protection settings?</h3>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="faq-content hidden px-6 pb-6">
                            <p class="text-gray-400">
                                Yes! Pro users can set custom triggers, choose exit strategies, set price thresholds, and even create token-specific rules. You can also whitelist certain actions to prevent false positives.
                            </p>
                        </div>
                    </div>
                    
                    <!-- FAQ 5 -->
                    <div class="faq-item card-glow rounded-xl overflow-hidden">
                        <button class="w-full p-6 text-left flex items-center justify-between" onclick="toggleFAQ(this)">
                            <h3 class="text-lg font-semibold">Which DEXs does PanicSwap support?</h3>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="faq-content hidden px-6 pb-6">
                            <p class="text-gray-400">
                                We support all major Solana DEXs including Raydium, Orca, Pump.fun, Jupiter aggregator, and more. Our system automatically finds the best exit route across all available liquidity sources.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- CTA Section -->
        <section class="py-20 px-4 fade-in-section">
            <div class="container mx-auto max-w-4xl text-center">
                <div class="hero-gradient rounded-3xl p-12 md:p-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-6">
                        Ready to Protect Your Portfolio?
                    </h2>
                    <p class="text-xl text-gray-300 mb-8">
                        Join thousands of traders who never worry about rug pulls again
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="dashboard.php" class="btn btn-primary btn-lg group">
                            Start Protection Now
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </a>
                        <a href="#pricing" class="btn btn-outline btn-lg">
                            View Pricing
                            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </a>
                    </div>
                    
                    <div class="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-400">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                            Non-custodial
                        </div>
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            No gas fees
                        </div>
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            24/7 monitoring
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
    
    <?php include 'components/footer.php'; ?>
    
    <!-- Wallet Connect Modal -->
    <?php include 'components/wallet-connect-modal.php'; ?>
    
    <script>
        // FAQ Toggle
        function toggleFAQ(button) {
            const content = button.nextElementSibling;
            const icon = button.querySelector('svg');
            
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        }
        
        // Fade in sections on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.fade-in-section').forEach(section => {
            observer.observe(section);
        });
        
        // Animate numbers
        const animateValue = (element, start, end, duration, isDecimal = false) => {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const current = progress * (end - start) + start;
                element.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        };
        
        // Trigger number animations when visible
        const numberObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    const target = parseFloat(entry.target.getAttribute('data-count'));
                    const isDecimal = target % 1 !== 0;
                    animateValue(entry.target, 0, target, 2000, isDecimal);
                }
            });
        }, { threshold: 0.5 });
        
        document.querySelectorAll('[data-count]').forEach(el => {
            numberObserver.observe(el);
        });
    </script>
</body>
</html>