<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security - PanicSwap</title>
    <meta name="description" content="Learn about PanicSwap's security measures and how we protect your assets">
    
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
                            <i data-lucide="shield-check" class="w-12 h-12 text-white"></i>
                        </div>
                        <h1 class="text-5xl md:text-6xl font-bold mb-6">
                            <span class="text-gradient">Security First, Always</span>
                        </h1>
                        <p class="text-xl text-gray-300 mb-8">
                            Your safety is our top priority. Here's how we protect you.
                        </p>
                    </div>
                </div>
            </section>

            <!-- Security Features Section -->
            <section class="py-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto">
                        <!-- Non-Custodial -->
                        <div class="glass-card p-8 md:p-12 mb-12">
                            <div class="flex items-start">
                                <div class="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mr-6 flex-shrink-0">
                                    <i data-lucide="key" class="w-8 h-8 text-white"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold mb-4">100% Non-Custodial</h2>
                                    <p class="text-gray-300 text-lg leading-relaxed mb-4">
                                        PanicSwap <strong class="text-white">never</strong> holds your private keys or has access to your funds. 
                                        All transactions are executed directly from your wallet through secure smart contracts.
                                    </p>
                                    <ul class="space-y-3 text-gray-400">
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            Your keys, your crypto - always
                                        </li>
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            No seed phrase required
                                        </li>
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            Direct wallet-to-wallet transactions
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Smart Contract Security -->
                        <div class="glass-card p-8 md:p-12 mb-12">
                            <div class="flex items-start">
                                <div class="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-6 flex-shrink-0">
                                    <i data-lucide="file-code" class="w-8 h-8 text-white"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold mb-4">Audited Smart Contracts</h2>
                                    <p class="text-gray-300 text-lg leading-relaxed mb-4">
                                        Our smart contracts have been thoroughly audited by leading security firms to ensure 
                                        your transactions are safe and secure.
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h3 class="font-semibold mb-2">CertiK Audit</h3>
                                            <p class="text-sm text-gray-400">Completed: March 2025</p>
                                            <a href="#" class="text-primary-400 text-sm hover:text-primary-300 mt-2 inline-block">
                                                View Report →
                                            </a>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <h3 class="font-semibold mb-2">Halborn Security</h3>
                                            <p class="text-sm text-gray-400">Completed: April 2025</p>
                                            <a href="#" class="text-primary-400 text-sm hover:text-primary-300 mt-2 inline-block">
                                                View Report →
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Infrastructure Security -->
                        <div class="glass-card p-8 md:p-12 mb-12">
                            <div class="flex items-start">
                                <div class="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mr-6 flex-shrink-0">
                                    <i data-lucide="server" class="w-8 h-8 text-white"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold mb-4">Enterprise-Grade Infrastructure</h2>
                                    <p class="text-gray-300 text-lg leading-relaxed mb-4">
                                        Built on industry-leading infrastructure with multiple layers of protection.
                                    </p>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="text-center">
                                            <div class="text-3xl font-bold text-gradient mb-2">99.99%</div>
                                            <p class="text-sm text-gray-400">Uptime SLA</p>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-3xl font-bold text-gradient mb-2">256-bit</div>
                                            <p class="text-sm text-gray-400">SSL Encryption</p>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-3xl font-bold text-gradient mb-2">24/7</div>
                                            <p class="text-sm text-gray-400">Monitoring</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Data Protection -->
                        <div class="glass-card p-8 md:p-12 mb-12">
                            <div class="flex items-start">
                                <div class="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mr-6 flex-shrink-0">
                                    <i data-lucide="lock" class="w-8 h-8 text-white"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold mb-4">Your Data, Protected</h2>
                                    <p class="text-gray-300 text-lg leading-relaxed mb-4">
                                        We take data privacy seriously and follow industry best practices.
                                    </p>
                                    <ul class="space-y-3 text-gray-400">
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            End-to-end encryption for all sensitive data
                                        </li>
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            No tracking or selling of user data
                                        </li>
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            GDPR and CCPA compliant
                                        </li>
                                        <li class="flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-500 mr-3"></i>
                                            Regular security audits and penetration testing
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Security Best Practices -->
                        <div class="glass-card p-8 md:p-12">
                            <h2 class="text-2xl font-bold mb-6">Security Best Practices</h2>
                            <p class="text-gray-300 text-lg mb-6">
                                While we do everything to protect you, here are some tips to maximize your security:
                            </p>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex items-start">
                                    <i data-lucide="shield-alert" class="w-6 h-6 text-primary-400 mr-3 mt-1"></i>
                                    <div>
                                        <h3 class="font-semibold mb-2">Use a Hardware Wallet</h3>
                                        <p class="text-gray-400 text-sm">
                                            For maximum security, connect using a Ledger or similar hardware wallet.
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i data-lucide="link" class="w-6 h-6 text-primary-400 mr-3 mt-1"></i>
                                    <div>
                                        <h3 class="font-semibold mb-2">Verify URLs</h3>
                                        <p class="text-gray-400 text-sm">
                                            Always ensure you're on panicswap.com - bookmark it for safety.
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i data-lucide="eye-off" class="w-6 h-6 text-primary-400 mr-3 mt-1"></i>
                                    <div>
                                        <h3 class="font-semibold mb-2">Never Share Seeds</h3>
                                        <p class="text-gray-400 text-sm">
                                            We'll never ask for your seed phrase. No legitimate service will.
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i data-lucide="refresh-cw" class="w-6 h-6 text-primary-400 mr-3 mt-1"></i>
                                    <div>
                                        <h3 class="font-semibold mb-2">Keep Software Updated</h3>
                                        <p class="text-gray-400 text-sm">
                                            Always use the latest version of your wallet software.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Questions CTA -->
            <section class="py-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto text-center">
                        <h2 class="text-3xl font-bold mb-6">Have Security Questions?</h2>
                        <p class="text-xl text-gray-300 mb-8">
                            Our security team is here to help address any concerns
                        </p>
                        <a href="contact.php" class="btn-primary inline-flex items-center">
                            Contact Security Team
                            <i data-lucide="mail" class="w-5 h-5 ml-2"></i>
                        </a>
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
    </script>
</body>
</html>