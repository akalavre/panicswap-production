<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - PanicSwap</title>
    <meta name="description" content="PanicSwap Privacy Policy - Learn how we protect and handle your data">
    
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
                        <div class="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6">
                            <i data-lucide="shield-check" class="w-12 h-12 text-white"></i>
                        </div>
                        <h1 class="text-5xl md:text-6xl font-bold mb-6">
                            <span class="text-gradient">Privacy Policy</span>
                        </h1>
                        <p class="text-xl text-gray-300">
                            Your privacy is our priority. We're committed to protecting your data.
                        </p>
                    </div>
                </div>
            </section>

            <!-- Privacy Highlights -->
            <section class="pb-10">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                                <i data-lucide="lock" class="w-10 h-10 text-green-400 mx-auto mb-3"></i>
                                <h3 class="font-semibold mb-2">Privacy First</h3>
                                <p class="text-sm text-gray-400">We never sell your personal data</p>
                            </div>
                            <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                                <i data-lucide="key" class="w-10 h-10 text-blue-400 mx-auto mb-3"></i>
                                <h3 class="font-semibold mb-2">Non-Custodial</h3>
                                <p class="text-sm text-gray-400">We never access your private keys</p>
                            </div>
                            <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                                <i data-lucide="shield" class="w-10 h-10 text-purple-400 mx-auto mb-3"></i>
                                <h3 class="font-semibold mb-2">Secure by Design</h3>
                                <p class="text-sm text-gray-400">End-to-end encryption for all data</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Privacy Content -->
            <section class="py-10 pb-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto space-y-8">
                        
                        <!-- Section 1 - Information We Collect -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg mr-4">
                                    <i data-lucide="database" class="w-6 h-6 text-blue-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Information We Collect</h2>
                                    
                                    <!-- What We Collect -->
                                    <div class="mb-8">
                                        <h3 class="text-lg font-semibold mb-4 text-blue-400">What We Collect</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div class="bg-white/5 rounded-lg p-4">
                                                <div class="flex items-start">
                                                    <i data-lucide="wallet" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                    <div>
                                                        <h4 class="font-semibold mb-1">Wallet Address</h4>
                                                        <p class="text-sm text-gray-400">Your public address when connected</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="bg-white/5 rounded-lg p-4">
                                                <div class="flex items-start">
                                                    <i data-lucide="mail" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                    <div>
                                                        <h4 class="font-semibold mb-1">Email (Optional)</h4>
                                                        <p class="text-sm text-gray-400">Only for premium subscribers</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="bg-white/5 rounded-lg p-4">
                                                <div class="flex items-start">
                                                    <i data-lucide="credit-card" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                    <div>
                                                        <h4 class="font-semibold mb-1">Payment Info</h4>
                                                        <p class="text-sm text-gray-400">Processed securely via Stripe</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="bg-white/5 rounded-lg p-4">
                                                <div class="flex items-start">
                                                    <i data-lucide="monitor" class="w-5 h-5 text-primary-400 mr-3 mt-0.5"></i>
                                                    <div>
                                                        <h4 class="font-semibold mb-1">Usage Analytics</h4>
                                                        <p class="text-sm text-gray-400">Anonymized platform usage</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- What We DON'T Collect -->
                                    <div>
                                        <h3 class="text-lg font-semibold mb-4 text-red-400">What We DON'T Collect</h3>
                                        <div class="bg-red-500/10 rounded-lg p-6">
                                            <div class="space-y-3">
                                                <div class="flex items-center">
                                                    <i data-lucide="x" class="w-5 h-5 text-red-400 mr-3"></i>
                                                    <span>Private keys or seed phrases</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <i data-lucide="x" class="w-5 h-5 text-red-400 mr-3"></i>
                                                    <span>Personal identification documents</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <i data-lucide="x" class="w-5 h-5 text-red-400 mr-3"></i>
                                                    <span>Unnecessary personal information</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <i data-lucide="x" class="w-5 h-5 text-red-400 mr-3"></i>
                                                    <span>Browsing history from other sites</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 2 - How We Use Your Information -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg mr-4">
                                    <i data-lucide="settings" class="w-6 h-6 text-green-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">How We Use Your Information</h2>
                                    <p class="text-gray-300 mb-6">We use collected information only for these purposes:</p>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="flex items-start">
                                            <i data-lucide="zap" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Service Delivery</h4>
                                                <p class="text-sm text-gray-400">To provide and maintain our platform</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="bell" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Security Alerts</h4>
                                                <p class="text-sm text-gray-400">To notify you of important updates</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="receipt" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Payment Processing</h4>
                                                <p class="text-sm text-gray-400">To handle subscription payments</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="headphones" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Customer Support</h4>
                                                <p class="text-sm text-gray-400">To assist with your inquiries</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="shield-alert" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Fraud Prevention</h4>
                                                <p class="text-sm text-gray-400">To detect and prevent abuse</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="trending-up" class="w-5 h-5 text-green-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Service Improvement</h4>
                                                <p class="text-sm text-gray-400">To enhance our features</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 3 - Data Security -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg mr-4">
                                    <i data-lucide="lock" class="w-6 h-6 text-purple-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Data Storage & Security</h2>
                                    <p class="text-gray-300 mb-6">Industry-standard security measures protect your data:</p>
                                    
                                    <div class="space-y-4">
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="shield-check" class="w-5 h-5 text-purple-400 mr-3"></i>
                                                <h4 class="font-semibold">Encryption</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">All data encrypted in transit (SSL/TLS) and at rest</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="scan" class="w-5 h-5 text-purple-400 mr-3"></i>
                                                <h4 class="font-semibold">Security Audits</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Regular audits and penetration testing</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="user-check" class="w-5 h-5 text-purple-400 mr-3"></i>
                                                <h4 class="font-semibold">Access Control</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Strict access controls and monitoring</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="server" class="w-5 h-5 text-purple-400 mr-3"></i>
                                                <h4 class="font-semibold">Compliant Infrastructure</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">SOC 2 and ISO 27001 compliant data centers</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 4 - Data Sharing -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg mr-4">
                                    <i data-lucide="users" class="w-6 h-6 text-orange-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Data Sharing & Disclosure</h2>
                                    
                                    <div class="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-6 mb-6">
                                        <p class="text-white font-semibold flex items-center">
                                            <i data-lucide="check-circle" class="w-5 h-5 text-green-400 mr-2"></i>
                                            We NEVER sell your personal data
                                        </p>
                                    </div>

                                    <p class="text-gray-300 mb-4">We only share data in these limited cases:</p>
                                    
                                    <div class="space-y-4">
                                        <div class="flex items-start">
                                            <i data-lucide="briefcase" class="w-5 h-5 text-orange-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Service Providers</h4>
                                                <p class="text-sm text-gray-400">Trusted partners like Stripe for payments (they follow strict privacy rules)</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="scale" class="w-5 h-5 text-orange-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Legal Requirements</h4>
                                                <p class="text-sm text-gray-400">When required by law or to protect our rights and users</p>
                                            </div>
                                        </div>
                                        <div class="flex items-start">
                                            <i data-lucide="check-square" class="w-5 h-5 text-orange-400 mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-semibold mb-1">Your Consent</h4>
                                                <p class="text-sm text-gray-400">Only with your explicit permission for specific purposes</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 5 - Your Rights -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-lg mr-4">
                                    <i data-lucide="user-cog" class="w-6 h-6 text-indigo-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Your Rights & Choices</h2>
                                    <p class="text-gray-300 mb-6">You have full control over your data:</p>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="eye" class="w-5 h-5 text-indigo-400 mr-3"></i>
                                                <h4 class="font-semibold">Access</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Request a copy of your data</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="edit" class="w-5 h-5 text-indigo-400 mr-3"></i>
                                                <h4 class="font-semibold">Correction</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Update incorrect information</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="trash-2" class="w-5 h-5 text-indigo-400 mr-3"></i>
                                                <h4 class="font-semibold">Deletion</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Request deletion of your data</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                                            <div class="flex items-center mb-2">
                                                <i data-lucide="download" class="w-5 h-5 text-indigo-400 mr-3"></i>
                                                <h4 class="font-semibold">Portability</h4>
                                            </div>
                                            <p class="text-sm text-gray-400">Get your data in portable format</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 6 - Cookies -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg mr-4">
                                    <i data-lucide="cookie" class="w-6 h-6 text-yellow-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Cookies & Tracking</h2>
                                    <p class="text-gray-300 mb-6">We only use essential cookies:</p>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="bg-white/5 rounded-lg p-4 text-center">
                                            <i data-lucide="key-round" class="w-8 h-8 text-yellow-400 mx-auto mb-2"></i>
                                            <h4 class="font-semibold mb-1">Session</h4>
                                            <p class="text-xs text-gray-400">For authentication</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4 text-center">
                                            <i data-lucide="shield" class="w-8 h-8 text-yellow-400 mx-auto mb-2"></i>
                                            <h4 class="font-semibold mb-1">Security</h4>
                                            <p class="text-xs text-gray-400">To prevent attacks</p>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-4 text-center">
                                            <i data-lucide="settings-2" class="w-8 h-8 text-yellow-400 mx-auto mb-2"></i>
                                            <h4 class="font-semibold mb-1">Preferences</h4>
                                            <p class="text-xs text-gray-400">Remember settings</p>
                                        </div>
                                    </div>
                                    
                                    <div class="mt-4 p-4 bg-yellow-500/10 rounded-lg">
                                        <p class="text-sm text-yellow-200 flex items-center">
                                            <i data-lucide="info" class="w-4 h-4 mr-2"></i>
                                            No tracking or advertising cookies are used
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 7 - Data Retention -->
                        <div class="glass-card p-8 hover:scale-[1.02] transition-transform">
                            <div class="flex items-start">
                                <div class="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-lg mr-4">
                                    <i data-lucide="clock" class="w-6 h-6 text-cyan-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-2xl font-bold mb-6">Data Retention</h2>
                                    <p class="text-gray-300 mb-6">We keep data only as long as necessary:</p>
                                    
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                            <div class="flex items-center">
                                                <i data-lucide="user" class="w-5 h-5 text-cyan-400 mr-3"></i>
                                                <span>Account Data</span>
                                            </div>
                                            <span class="text-sm text-cyan-400">Until deletion requested</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                            <div class="flex items-center">
                                                <i data-lucide="file-text" class="w-5 h-5 text-cyan-400 mr-3"></i>
                                                <span>Transaction Records</span>
                                            </div>
                                            <span class="text-sm text-cyan-400">7 years (legal requirement)</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                            <div class="flex items-center">
                                                <i data-lucide="message-circle" class="w-5 h-5 text-cyan-400 mr-3"></i>
                                                <span>Support Tickets</span>
                                            </div>
                                            <span class="text-sm text-cyan-400">2 years</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                            <div class="flex items-center">
                                                <i data-lucide="bar-chart" class="w-5 h-5 text-cyan-400 mr-3"></i>
                                                <span>Analytics Data</span>
                                            </div>
                                            <span class="text-sm text-cyan-400">90 days (anonymized)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Contact Section -->
                        <div class="glass-card p-8 bg-gradient-to-r from-orange-500/10 to-red-600/10">
                            <div class="text-center">
                                <i data-lucide="mail" class="w-12 h-12 text-primary-400 mx-auto mb-4"></i>
                                <h2 class="text-2xl font-bold mb-4">Questions About Privacy?</h2>
                                <p class="text-gray-300 mb-6">
                                    We're here to help. Contact our privacy team for any concerns or to exercise your rights.
                                </p>
                                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                                    <a href="mailto:privacy@panicswap.com" class="btn-primary inline-flex items-center justify-center">
                                        <i data-lucide="mail" class="w-4 h-4 mr-2"></i>
                                        privacy@panicswap.com
                                    </a>
                                    <a href="mailto:dpo@panicswap.com" class="btn-secondary inline-flex items-center justify-center">
                                        <i data-lucide="shield" class="w-4 h-4 mr-2"></i>
                                        Data Protection Officer
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Privacy Commitment -->
                        <div class="glass-card p-8">
                            <div class="flex items-center justify-center mb-4">
                                <i data-lucide="heart" class="w-8 h-8 text-red-400 mr-3"></i>
                                <h3 class="text-xl font-bold">Our Privacy Commitment</h3>
                            </div>
                            <p class="text-center text-gray-300">
                                We believe in transparency and user control. You own your data, and we're just temporary custodians. 
                                We will always notify you of significant changes and give you control over your information.
                            </p>
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
    </script>
</body>
</html>