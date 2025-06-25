<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - PanicSwap</title>
    <meta name="description" content="PanicSwap Terms of Service - Please read carefully before using our services">
    
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
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
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
</head>
<body class="gradient-bg">
    <div class="relative min-h-screen">
        <!-- Gradient Mesh Background -->
        <div class="gradient-mesh"></div>
        
        <!-- Animated Orbs -->
        <div class="orb orb-primary w-96 h-96 top-10 -left-48"></div>
        
        <?php include 'components/header.php'; ?>
        
        <main class="relative z-10">
            <!-- Hero Section -->
            <section class="pt-32 pb-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto text-center">
                        <div class="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6">
                            <i data-lucide="file-text" class="w-12 h-12 text-white"></i>
                        </div>
                        <h1 class="text-5xl md:text-6xl font-bold mb-6">
                            <span class="text-gradient">Terms of Service</span>
                        </h1>
                        <p class="text-xl text-gray-300">
                            Please read these terms carefully before using PanicSwap
                        </p>
                    </div>
                </div>
            </section>

            <!-- Quick Navigation -->
            <section class="pb-10">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto">
                        <div class="glass-card p-6">
                            <h3 class="text-lg font-semibold mb-4 flex items-center">
                                <i data-lucide="compass" class="w-5 h-5 mr-2 text-primary-400"></i>
                                Quick Navigation
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <a href="#acceptance" class="text-gray-400 hover:text-primary-400 transition-colors">→ Acceptance</a>
                                <a href="#service" class="text-gray-400 hover:text-primary-400 transition-colors">→ Service Description</a>
                                <a href="#eligibility" class="text-gray-400 hover:text-primary-400 transition-colors">→ Eligibility</a>
                                <a href="#risks" class="text-gray-400 hover:text-primary-400 transition-colors">→ Risk Disclosure</a>
                                <a href="#fees" class="text-gray-400 hover:text-primary-400 transition-colors">→ Fees & Payments</a>
                                <a href="#prohibited" class="text-gray-400 hover:text-primary-400 transition-colors">→ Prohibited Uses</a>
                                <a href="#liability" class="text-gray-400 hover:text-primary-400 transition-colors">→ Liability</a>
                                <a href="#contact" class="text-gray-400 hover:text-primary-400 transition-colors">→ Contact</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Terms Content -->
            <section class="py-10 pb-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto space-y-8">
                        
                        <!-- Section 1 -->
                        <div id="acceptance" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">1</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Acceptance of Terms</h2>
                                    <p class="text-gray-300 leading-relaxed">
                                        By accessing or using PanicSwap ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                                        If you disagree with any part of these terms, then you may not access the Service.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Section 2 -->
                        <div id="service" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">2</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Description of Service</h2>
                                    <p class="text-gray-300 leading-relaxed mb-4">
                                        PanicSwap is a decentralized application (dApp) that provides automated token protection services on the 
                                        Solana blockchain. Our Service includes:
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <i data-lucide="shield-check" class="w-5 h-5 text-primary-400 mb-2"></i>
                                            <p class="text-sm">Real-time token monitoring and rug pull detection</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <i data-lucide="zap" class="w-5 h-5 text-primary-400 mb-2"></i>
                                            <p class="text-sm">Automated emergency swap functionality</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <i data-lucide="trending-up" class="w-5 h-5 text-primary-400 mb-2"></i>
                                            <p class="text-sm">Market analysis and risk assessment tools</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <i data-lucide="book-open" class="w-5 h-5 text-primary-400 mb-2"></i>
                                            <p class="text-sm">Educational resources and market insights</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 3 -->
                        <div id="eligibility" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">3</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Eligibility</h2>
                                    <p class="text-gray-300 leading-relaxed mb-4">
                                        You must be at least 18 years old to use our Service. By using PanicSwap, you represent and warrant that:
                                    </p>
                                    <ul class="space-y-3">
                                        <li class="flex items-center text-gray-300">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3 flex-shrink-0"></i>
                                            You have the legal capacity to enter into these Terms
                                        </li>
                                        <li class="flex items-center text-gray-300">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3 flex-shrink-0"></i>
                                            You are not located in a jurisdiction where use of our Service is prohibited
                                        </li>
                                        <li class="flex items-center text-gray-300">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3 flex-shrink-0"></i>
                                            You will comply with all applicable laws and regulations
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Section 4 -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">4</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Non-Custodial Service</h2>
                                    <p class="text-gray-300 leading-relaxed mb-4">
                                        PanicSwap is a non-custodial service. This means:
                                    </p>
                                    <div class="bg-gradient-to-r from-orange-500/10 to-red-600/10 rounded-lg p-6">
                                        <ul class="space-y-3">
                                            <li class="flex items-start text-gray-300">
                                                <i data-lucide="key" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                We do not hold, control, or have access to your private keys or funds
                                            </li>
                                            <li class="flex items-start text-gray-300">
                                                <i data-lucide="user-check" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                You are solely responsible for the security of your wallet and private keys
                                            </li>
                                            <li class="flex items-start text-gray-300">
                                                <i data-lucide="alert-circle" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                We cannot recover lost funds or reverse transactions
                                            </li>
                                            <li class="flex items-start text-gray-300">
                                                <i data-lucide="code" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                All transactions are executed directly through smart contracts on the blockchain
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 5 - Risk Disclosure -->
                        <div id="risks" class="glass-card p-8 border border-red-500/20 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg mr-4">
                                    <i data-lucide="alert-triangle" class="w-6 h-6 text-red-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4 text-red-400">Risk Disclosure</h2>
                                    <div class="bg-red-500/10 rounded-lg p-4 mb-4">
                                        <p class="text-white font-semibold">
                                            IMPORTANT: Trading cryptocurrencies involves substantial risk of loss and is not suitable for every investor.
                                        </p>
                                    </div>
                                    <p class="text-gray-300 mb-4">By using PanicSwap, you acknowledge and accept the following risks:</p>
                                    <div class="space-y-3">
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h4 class="font-semibold text-orange-400 mb-1">Market Risk</h4>
                                            <p class="text-sm text-gray-400">Cryptocurrency values can fluctuate wildly</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h4 class="font-semibold text-orange-400 mb-1">Technical Risk</h4>
                                            <p class="text-sm text-gray-400">Smart contracts may contain bugs or vulnerabilities</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h4 class="font-semibold text-orange-400 mb-1">Regulatory Risk</h4>
                                            <p class="text-sm text-gray-400">Laws and regulations may change</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h4 class="font-semibold text-orange-400 mb-1">Detection Accuracy</h4>
                                            <p class="text-sm text-gray-400">Our rug pull detection is not 100% accurate</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h4 class="font-semibold text-orange-400 mb-1">Slippage Risk</h4>
                                            <p class="text-sm text-gray-400">Emergency swaps may result in unfavorable rates</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 6 - Fees -->
                        <div id="fees" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">6</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Fees and Payments</h2>
                                    <p class="text-gray-300 leading-relaxed mb-4">
                                        Our fee structure is transparent and straightforward:
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="bg-white/5 rounded-lg p-6 text-center">
                                            <i data-lucide="credit-card" class="w-8 h-8 text-primary-400 mx-auto mb-3"></i>
                                            <h4 class="font-semibold mb-2">Subscription</h4>
                                            <p class="text-sm text-gray-400">Monthly premium features</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-6 text-center">
                                            <i data-lucide="percent" class="w-8 h-8 text-primary-400 mx-auto mb-3"></i>
                                            <h4 class="font-semibold mb-2">1% Commission</h4>
                                            <p class="text-sm text-gray-400">On successful emergency swaps</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-6 text-center">
                                            <i data-lucide="activity" class="w-8 h-8 text-primary-400 mx-auto mb-3"></i>
                                            <h4 class="font-semibold mb-2">Network Fees</h4>
                                            <p class="text-sm text-gray-400">Paid to Solana network</p>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-400 mt-4">
                                        All fees are clearly displayed before any transaction. Subscription fees are non-refundable.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Section 7 - Prohibited Uses -->
                        <div id="prohibited" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <span class="text-2xl font-bold text-primary-400">7</span>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-4">Prohibited Uses</h2>
                                    <p class="text-gray-300 leading-relaxed mb-4">
                                        You agree not to use the Service to:
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Violate any laws or regulations</span>
                                        </div>
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Engage in market manipulation</span>
                                        </div>
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Attempt to hack our systems</span>
                                        </div>
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Use unauthorized bots</span>
                                        </div>
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Impersonate others</span>
                                        </div>
                                        <div class="flex items-center text-gray-300">
                                            <i data-lucide="x-circle" class="w-5 h-5 text-red-400 mr-3"></i>
                                            <span class="text-sm">Provide false information</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Sections -->
                        <div class="space-y-8">
                            <!-- Intellectual Property -->
                            <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                                <h2 class="text-2xl font-bold mb-4 flex items-center">
                                    <i data-lucide="copyright" class="w-6 h-6 mr-3 text-primary-400"></i>
                                    Intellectual Property
                                </h2>
                                <p class="text-gray-300 leading-relaxed">
                                    The Service and its original content, features, and functionality are owned by PanicSwap and are protected by 
                                    international copyright, trademark, patent, trade secret, and other intellectual property laws.
                                </p>
                            </div>

                            <!-- Disclaimer -->
                            <div id="liability" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                                <h2 class="text-2xl font-bold mb-4 flex items-center">
                                    <i data-lucide="shield-off" class="w-6 h-6 mr-3 text-primary-400"></i>
                                    Disclaimer & Limitation of Liability
                                </h2>
                                <div class="bg-yellow-500/10 rounded-lg p-4 mb-4">
                                    <p class="text-yellow-200 font-semibold text-sm">
                                        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND
                                    </p>
                                </div>
                                <p class="text-gray-300 leading-relaxed">
                                    In no event shall PanicSwap be liable for any indirect, incidental, special, consequential, or punitive damages, 
                                    including loss of profits, data, use, goodwill, or other intangible losses.
                                </p>
                            </div>

                            <!-- Contact -->
                            <div id="contact" class="glass-card p-8 hover:scale-[1.02] transition-transform">
                                <h2 class="text-2xl font-bold mb-4 flex items-center">
                                    <i data-lucide="mail" class="w-6 h-6 mr-3 text-primary-400"></i>
                                    Contact Information
                                </h2>
                                <p class="text-gray-300 leading-relaxed mb-4">
                                    If you have any questions about these Terms, please contact us at:
                                </p>
                                <div class="bg-white/5 rounded-lg p-6">
                                    <div class="flex items-center mb-3">
                                        <i data-lucide="mail" class="w-5 h-5 text-primary-400 mr-3"></i>
                                        <a href="mailto:legal@panicswap.com" class="text-primary-400 hover:text-primary-300">
                                            legal@panicswap.com
                                        </a>
                                    </div>
                                    <div class="flex items-center">
                                        <i data-lucide="globe" class="w-5 h-5 text-primary-400 mr-3"></i>
                                        <a href="https://panicswap.com/contact" class="text-primary-400 hover:text-primary-300">
                                            panicswap.com/contact
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Agreement Box -->
                        <div class="glass-card p-8 bg-gradient-to-r from-orange-500/10 to-red-600/10">
                            <div class="text-center">
                                <i data-lucide="check-square" class="w-12 h-12 text-primary-400 mx-auto mb-4"></i>
                                <p class="text-lg text-gray-300">
                                    By using PanicSwap, you acknowledge that you have read, understood, 
                                    and agree to be bound by these Terms of Service.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        
        <?php include 'components/footer.php'; ?>
    </div>
    
    <!-- JavaScript -->
    <script src="assets/js/main.js"></script>
    
    <!-- Initialize Lucide Icons -->
    <script>
        lucide.createIcons();

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    </script>
</body>
</html>