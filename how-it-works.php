<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How It Works - PanicSwap</title>
    <meta name="description" content="Learn how PanicSwap protects your tokens from rug pulls">
    
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
</head>
<body class="bg-gray-950 text-gray-100 font-sans antialiased">
    <div class="noise-overlay">
        <?php include 'components/network-status.php'; ?>
        <?php include 'components/header.php'; ?>
        
        <main>
            <!-- Hero Section -->
            <section class="py-16 px-4">
                <div class="container mx-auto max-w-4xl text-center">
                    <h1 class="text-4xl md:text-5xl font-bold mb-6">How PanicSwap Works</h1>
                    <p class="text-xl text-gray-300 mb-8">
                        Advanced rug detection and automated protection for Solana traders
                    </p>
                </div>
            </section>
            
            <!-- Process Steps -->
            <section class="py-16 px-4 bg-gray-900/50">
                <div class="container mx-auto max-w-6xl">
                    <h2 class="text-3xl font-bold text-center mb-12">Simple 3-Step Protection</h2>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Step 1 -->
                        <div class="text-center">
                            <div class="w-20 h-20 mx-auto mb-6 bg-primary-600 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold">1</span>
                            </div>
                            <h3 class="text-xl font-semibold mb-3">Connect & Select</h3>
                            <p class="text-gray-400">
                                Connect your wallet and choose which tokens you want to protect. Works with any SPL token on Solana.
                            </p>
                        </div>
                        
                        <!-- Step 2 -->
                        <div class="text-center">
                            <div class="w-20 h-20 mx-auto mb-6 bg-primary-600 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold">2</span>
                            </div>
                            <h3 class="text-xl font-semibold mb-3">24/7 Monitoring</h3>
                            <p class="text-gray-400">
                                Our system continuously monitors your tokens for suspicious activity, even while you sleep or trade other tokens.
                            </p>
                        </div>
                        
                        <!-- Step 3 -->
                        <div class="text-center">
                            <div class="w-20 h-20 mx-auto mb-6 bg-primary-600 rounded-full flex items-center justify-center">
                                <span class="text-3xl font-bold">3</span>
                            </div>
                            <h3 class="text-xl font-semibold mb-3">Instant Auto-Exit</h3>
                            <p class="text-gray-400">
                                When danger is detected, we automatically swap your tokens to SOL or USDC in a single block - faster than any rugger.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- Detection Methods -->
            <section class="py-16 px-4">
                <div class="container mx-auto max-w-6xl">
                    <h2 class="text-3xl font-bold text-center mb-12">What We Monitor</h2>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="glassmorphism p-6 rounded-lg">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-red-900/50 rounded-lg flex items-center justify-center mr-4">
                                    <svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold">Liquidity Monitoring</h3>
                            </div>
                            <p class="text-gray-400">
                                Track liquidity pools in real-time. Detect sudden drains, removals, or suspicious movements before they impact price.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-orange-900/50 rounded-lg flex items-center justify-center mr-4">
                                    <svg class="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold">Dev Wallet Activity</h3>
                            </div>
                            <p class="text-gray-400">
                                Monitor developer wallets for large transfers, dumps, or suspicious patterns that indicate an exit scam.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-yellow-900/50 rounded-lg flex items-center justify-center mr-4">
                                    <svg class="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold">Volume Analysis</h3>
                            </div>
                            <p class="text-gray-400">
                                Analyze trading volume patterns to detect wash trading, fake volume, and coordinated dump signals.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-green-900/50 rounded-lg flex items-center justify-center mr-4">
                                    <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-xl font-semibold">Contract Security</h3>
                            </div>
                            <p class="text-gray-400">
                                Check for malicious contract functions, honeypot mechanisms, and hidden mint authorities.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- Technical Details -->
            <section class="py-16 px-4 bg-gray-900/50">
                <div class="container mx-auto max-w-4xl">
                    <h2 class="text-3xl font-bold text-center mb-12">Technical Implementation</h2>
                    
                    <div class="space-y-8">
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-xl font-semibold mb-3">Non-Custodial Design</h3>
                            <p class="text-gray-400 mb-4">
                                PanicSwap never holds your private keys or tokens. We use Solana's delegate authority feature to execute emergency swaps only when triggered by our detection system.
                            </p>
                            <div class="bg-gray-800 rounded p-4 font-mono text-sm">
                                <span class="text-green-400">// Approval limited to emergency swaps only</span><br>
                                <span class="text-blue-400">await</span> token.<span class="text-yellow-400">approve</span>(panicSwapProgram, amount, {<br>
                                &nbsp;&nbsp;<span class="text-gray-400">conditions:</span> [<span class="text-orange-400">'rugDetected'</span>, <span class="text-orange-400">'liquidityDrain'</span>]<br>
                                });
                            </div>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-xl font-semibold mb-3">Sub-Second Response Time</h3>
                            <p class="text-gray-400 mb-4">
                                Our infrastructure monitors the Solana blockchain in real-time using RPC websockets and processes thousands of transactions per second to detect threats instantly.
                            </p>
                            <div class="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div class="text-2xl font-bold text-primary-500">15ms</div>
                                    <div class="text-sm text-gray-500">Detection Time</div>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-primary-500">400ms</div>
                                    <div class="text-sm text-gray-500">Total Response</div>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-primary-500">1 Block</div>
                                    <div class="text-sm text-gray-500">Exit Speed</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-xl font-semibold mb-3">Multi-Signature Security</h3>
                            <p class="text-gray-400">
                                All PanicSwap smart contracts are secured with multi-signature wallets and have been audited by CertiK. Emergency functions require multiple validator signatures to prevent abuse.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- FAQ Section -->
            <section class="py-16 px-4">
                <div class="container mx-auto max-w-4xl">
                    <h2 class="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    
                    <div class="space-y-6">
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-lg font-semibold mb-2">Can PanicSwap access my wallet?</h3>
                            <p class="text-gray-400">
                                No. PanicSwap uses limited approval that only allows emergency swaps when specific conditions are met. We cannot transfer tokens without a detected threat.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-lg font-semibold mb-2">What happens when a rug is detected?</h3>
                            <p class="text-gray-400">
                                Your tokens are immediately swapped to your chosen safe asset (SOL or USDC) using the best available DEX route. You receive a notification with full transaction details.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-lg font-semibold mb-2">Can I customize protection settings?</h3>
                            <p class="text-gray-400">
                                Yes! You can adjust sensitivity levels, choose exit strategies, set partial exit amounts, and configure which signals to monitor for each token.
                            </p>
                        </div>
                        
                        <div class="glassmorphism p-6 rounded-lg">
                            <h3 class="text-lg font-semibold mb-2">What if there's a false positive?</h3>
                            <p class="text-gray-400">
                                Our system is calibrated to minimize false positives. However, you can always buy back into a token after an exit. We believe it's better to exit early than lose everything.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- CTA Section -->
            <section class="py-16 px-4 bg-gradient-to-r from-primary-900/20 to-secondary-900/20">
                <div class="container mx-auto max-w-4xl text-center">
                    <h2 class="text-3xl font-bold mb-6">Ready to Protect Your Tokens?</h2>
                    <p class="text-xl text-gray-300 mb-8">
                        Join thousands of traders who sleep better knowing their tokens are protected
                    </p>
                    <a href="protect.php" class="btn btn-primary text-lg px-8 py-4 inline-flex items-center">
                        Start Protection Now
                        <svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </a>
                </div>
            </section>
        </main>
        
        <?php include 'components/footer.php'; ?>
    </div>
    
    <script src="assets/js/main.js"></script>
</body>
</html>