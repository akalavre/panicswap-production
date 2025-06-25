<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Us - PanicSwap</title>
    <meta name="description" content="Learn about PanicSwap's mission to protect Solana traders from rug pulls and market manipulation">
    
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
                        <h1 class="text-5xl md:text-6xl font-bold mb-6">
                            <span class="text-gradient">About PanicSwap</span>
                        </h1>
                        <p class="text-xl text-gray-300 mb-8">
                            We're on a mission to make DeFi safer for everyone
                        </p>
                    </div>
                </div>
            </section>

            <!-- Mission Section -->
            <section class="py-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto">
                        <div class="glass-card p-8 md:p-12 mb-12">
                            <h2 class="text-3xl font-bold mb-6 text-gradient">Our Mission</h2>
                            <p class="text-gray-300 text-lg leading-relaxed mb-6">
                                The DeFi space has revolutionized finance, but it's also become a playground for bad actors. 
                                Every day, thousands of traders lose their investments to rug pulls, honeypots, and market manipulation.
                            </p>
                            <p class="text-gray-300 text-lg leading-relaxed mb-6">
                                PanicSwap was born from a simple belief: <span class="text-white font-semibold">traders deserve protection</span>. 
                                We've built the most advanced rug detection system on Solana, specifically designed to identify and protect against 
                                pump.fun scams before they happen.
                            </p>
                            <p class="text-gray-300 text-lg leading-relaxed">
                                Our AI-powered system monitors thousands of tokens in real-time, analyzing on-chain data, social signals, 
                                and market behavior to give you the split-second warning you need to exit safely.
                            </p>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                            <div class="glass-card p-8 text-center">
                                <div class="text-4xl font-bold text-gradient mb-2">$2.5M+</div>
                                <p class="text-gray-400">Saved from Rug Pulls</p>
                            </div>
                            <div class="glass-card p-8 text-center">
                                <div class="text-4xl font-bold text-gradient mb-2">10,000+</div>
                                <p class="text-gray-400">Protected Traders</p>
                            </div>
                            <div class="glass-card p-8 text-center">
                                <div class="text-4xl font-bold text-gradient mb-2">99.7%</div>
                                <p class="text-gray-400">Detection Accuracy</p>
                            </div>
                        </div>


                        <!-- Values Section -->
                        <div>
                            <h2 class="text-3xl font-bold mb-12 text-center text-gradient">Our Values</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="glass-card p-8">
                                    <div class="flex items-center mb-4">
                                        <div class="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mr-4">
                                            <i data-lucide="shield" class="w-6 h-6 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-semibold">Security First</h3>
                                    </div>
                                    <p class="text-gray-400">Your safety is our top priority. Every feature we build starts with security in mind.</p>
                                </div>

                                <div class="glass-card p-8">
                                    <div class="flex items-center mb-4">
                                        <div class="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mr-4">
                                            <i data-lucide="zap" class="w-6 h-6 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-semibold">Lightning Fast</h3>
                                    </div>
                                    <p class="text-gray-400">In crypto, milliseconds matter. Our system reacts faster than any human could.</p>
                                </div>

                                <div class="glass-card p-8">
                                    <div class="flex items-center mb-4">
                                        <div class="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mr-4">
                                            <i data-lucide="users" class="w-6 h-6 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-semibold">Community Driven</h3>
                                    </div>
                                    <p class="text-gray-400">We build based on trader feedback. Your voice shapes our product roadmap.</p>
                                </div>

                                <div class="glass-card p-8">
                                    <div class="flex items-center mb-4">
                                        <div class="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mr-4">
                                            <i data-lucide="eye" class="w-6 h-6 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-semibold">Full Transparency</h3>
                                    </div>
                                    <p class="text-gray-400">No hidden fees, no surprises. What you see is what you get, always.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="py-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto text-center">
                        <h2 class="text-3xl font-bold mb-6">Ready to Trade Safely?</h2>
                        <p class="text-xl text-gray-300 mb-8">
                            Join thousands of traders who've made PanicSwap their first line of defense
                        </p>
                        <a href="dashboard.php" class="btn-primary inline-flex items-center">
                            Get Started
                            <i data-lucide="arrow-right" class="w-5 h-5 ml-2"></i>
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