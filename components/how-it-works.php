<section class="py-32 relative overflow-hidden">
    <!-- Advanced Background Effects -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-b from-black via-gray-900/30 to-black"></div>
        
        <!-- Animated Grid -->
        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23grid)"/%3E%3C/svg%3E')] opacity-50"></div>
        
        <!-- Floating Orbs -->
        <div class="absolute top-1/3 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div class="absolute bottom-1/3 right-10 w-80 h-80 bg-orange-600/20 rounded-full blur-3xl animate-float" style="animation-delay: 3s;"></div>
        <div class="absolute top-2/3 left-1/2 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl animate-float" style="animation-delay: 6s;"></div>
    </div>
    
    <div class="container mx-auto px-4 relative z-10">
        <!-- Enhanced Header -->
        <div class="text-center mb-24 space-y-6">
            <div class="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 backdrop-blur-xl">
                <div class="relative">
                    <div class="absolute inset-0 bg-orange-500 rounded-full blur animate-pulse"></div>
                    <i data-lucide="zap" class="relative w-5 h-5 text-orange-400"></i>
                </div>
                <span class="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400">
                    3 Simple Steps • 60 Second Setup
                </span>
            </div>
            
            <h2 class="text-5xl md:text-6xl lg:text-7xl font-black">
                <span class="block text-white mb-2">Protection Made</span>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 animate-gradient">
                    Ridiculously Simple
                </span>
            </h2>
            
            <p class="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                No complex setup. No constant monitoring. Just <span class="text-white font-semibold">connect</span>, 
                <span class="text-white font-semibold">select</span>, and let our AI handle the rest.
            </p>
        </div>
        
        <div class="max-w-7xl mx-auto">
            <!-- Enhanced Steps Timeline -->
            <div class="relative">
                <!-- Animated Connection Line -->
                <div class="hidden lg:block absolute top-32 left-0 right-0">
                    <div class="relative h-2">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-orange-600/20 to-transparent rounded-full"></div>
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full animate-shimmer"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
                    <!-- Step 1 - Connect -->
                    <div class="relative group">
                        <div class="relative">
                            <!-- Floating Step Number -->
                            <div class="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                <div class="relative animate-float">
                                    <div class="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                    <div class="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                                        <span class="text-3xl font-black">1</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Enhanced Card -->
                            <div class="relative pt-16">
                                <div class="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="relative glass-card p-10 rounded-3xl border border-orange-500/10 group-hover:border-orange-500/30 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
                                    <!-- Icon Box -->
                                    <div class="mb-6">
                                        <div class="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <i data-lucide="wallet" class="w-8 h-8 text-orange-400"></i>
                                        </div>
                                        <h3 class="text-2xl font-bold mb-4">Connect Your Wallet</h3>
                                        <p class="text-gray-400 mb-8 leading-relaxed">
                                            Link your Solana wallet in one click. We support all major wallets including Phantom, Solflare, and more.
                                        </p>
                                    </div>
                                    
                                    <!-- Interactive Code Example -->
                                    <div class="relative overflow-hidden rounded-xl">
                                        <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                                        <div class="relative bg-black/60 backdrop-blur-xl p-6 border border-white/5">
                                            <div class="flex items-center justify-between mb-4">
                                                <div class="flex gap-1.5">
                                                    <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
                                                    <div class="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                                    <div class="w-3 h-3 rounded-full bg-green-500/50"></div>
                                                </div>
                                                <span class="text-xs text-gray-500 font-mono">connect.js</span>
                                            </div>
                                            <code class="text-sm font-mono">
                                                <span class="text-purple-400">const</span> <span class="text-blue-400">wallet</span> = <span class="text-purple-400">await</span> <span class="text-orange-400">panicSwap</span>.<span class="text-yellow-400">connect</span>();
                                                <br />
                                                <span class="text-gray-600">// Instant connection with your wallet</span>
                                            </code>
                                        </div>
                                    </div>
                                    
                                    <!-- Status Indicator -->
                                    <div class="mt-6 flex items-center gap-2 text-sm text-gray-500">
                                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>Average time: 2 seconds</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 2 - Monitor -->
                    <div class="relative group">
                        <div class="relative">
                            <!-- Floating Step Number -->
                            <div class="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                <div class="relative animate-float" style="animation-delay: 0.5s;">
                                    <div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                    <div class="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                                        <span class="text-3xl font-black">2</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Enhanced Card -->
                            <div class="relative pt-16">
                                <div class="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="relative glass-card p-10 rounded-3xl border border-purple-500/10 group-hover:border-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-500/10">
                                    <!-- Icon Box -->
                                    <div class="mb-6">
                                        <div class="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <i data-lucide="shield-check" class="w-8 h-8 text-purple-400"></i>
                                        </div>
                                        <h3 class="text-2xl font-bold mb-4">AI Monitors Everything</h3>
                                        <p class="text-gray-400 mb-8 leading-relaxed">
                                            Our advanced AI analyzes 50+ risk factors in real-time, including liquidity, ownership, and trading patterns.
                                        </p>
                                    </div>
                                    
                                    <!-- Live Monitoring Dashboard -->
                                    <div class="relative overflow-hidden rounded-xl">
                                        <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                                        <div class="relative bg-black/60 backdrop-blur-xl p-6 border border-white/5 space-y-4">
                                            <!-- Header -->
                                            <div class="flex items-center justify-between mb-4">
                                                <span class="text-xs font-semibold text-purple-400 uppercase tracking-wider">Live Monitoring</span>
                                                <div class="flex items-center gap-2">
                                                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <span class="text-xs text-gray-500">Active</span>
                                                </div>
                                            </div>
                                            
                                            <!-- Indicators -->
                                            <div class="space-y-3">
                                                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                            <i data-lucide="activity" class="w-4 h-4 text-green-400"></i>
                                                        </div>
                                                        <span class="text-sm font-medium">Liquidity Pool</span>
                                                    </div>
                                                    <div class="flex items-center gap-2">
                                                        <div class="h-2 w-24 bg-gray-800 rounded-full overflow-hidden">
                                                            <div class="h-full w-4/5 bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse"></div>
                                                        </div>
                                                        <span class="text-xs text-green-400 font-mono">98%</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                            <i data-lucide="users" class="w-4 h-4 text-blue-400"></i>
                                                        </div>
                                                        <span class="text-sm font-medium">Holder Distribution</span>
                                                    </div>
                                                    <div class="flex items-center gap-2">
                                                        <div class="h-2 w-24 bg-gray-800 rounded-full overflow-hidden">
                                                            <div class="h-full w-3/4 bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse"></div>
                                                        </div>
                                                        <span class="text-xs text-blue-400 font-mono">Safe</span>
                                                    </div>
                                                </div>
                                                
                                                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                                            <i data-lucide="code" class="w-4 h-4 text-yellow-400"></i>
                                                        </div>
                                                        <span class="text-sm font-medium">Contract Security</span>
                                                    </div>
                                                    <div class="flex items-center gap-2">
                                                        <i data-lucide="shield-check" class="w-4 h-4 text-green-400"></i>
                                                        <span class="text-xs text-green-400 font-mono">Verified</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Status Indicator -->
                                    <div class="mt-6 flex items-center gap-2 text-sm text-gray-500">
                                        <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                        <span>Monitoring 24/7/365</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 3 - Exit -->
                    <div class="relative group">
                        <div class="relative">
                            <!-- Floating Step Number -->
                            <div class="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                <div class="relative animate-float" style="animation-delay: 1s;">
                                    <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                    <div class="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                                        <span class="text-3xl font-black">3</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Enhanced Card -->
                            <div class="relative pt-16">
                                <div class="absolute inset-0 bg-gradient-to-br from-green-600/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="relative glass-card p-10 rounded-3xl border border-green-500/10 group-hover:border-green-500/30 transition-all hover:shadow-2xl hover:shadow-green-500/10">
                                    <!-- Icon Box -->
                                    <div class="mb-6">
                                        <div class="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <i data-lucide="zap" class="w-8 h-8 text-green-400"></i>
                                        </div>
                                        <h3 class="text-2xl font-bold mb-4">Lightning Fast Exit</h3>
                                        <p class="text-gray-400 mb-8 leading-relaxed">
                                            When danger strikes, we execute your exit strategy in milliseconds, saving 100% of your investment.
                                        </p>
                                    </div>
                                    
                                    <!-- Alert Simulation -->
                                    <div class="relative overflow-hidden rounded-xl">
                                        <div class="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent animate-pulse"></div>
                                        <div class="relative bg-red-950/40 backdrop-blur-xl p-6 border border-red-500/30 space-y-4">
                                            <!-- Alert Header -->
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center gap-3">
                                                    <div class="relative">
                                                        <div class="absolute inset-0 bg-red-500 rounded-full blur animate-pulse"></div>
                                                        <div class="relative w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                                            <i data-lucide="alert-triangle" class="w-4 h-4 text-white"></i>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-bold text-red-400">RUG PULL DETECTED</p>
                                                        <p class="text-xs text-gray-500">Token: SCAM • Time: 14:32:08</p>
                                                    </div>
                                                </div>
                                                <span class="text-xs text-red-400 font-mono animate-pulse">LIVE</span>
                                            </div>
                                            
                                            <!-- Action Timeline -->
                                            <div class="space-y-2 pl-11">
                                                <div class="flex items-center gap-2 text-xs">
                                                    <i data-lucide="check-circle" class="w-3 h-3 text-yellow-400"></i>
                                                    <span class="text-gray-400">Liquidity removed: 98%</span>
                                                    <span class="text-gray-600 ml-auto">+0.4s</span>
                                                </div>
                                                <div class="flex items-center gap-2 text-xs">
                                                    <i data-lucide="check-circle" class="w-3 h-3 text-orange-400"></i>
                                                    <span class="text-gray-400">Exit initiated</span>
                                                    <span class="text-gray-600 ml-auto">+0.6s</span>
                                                </div>
                                                <div class="flex items-center gap-2 text-xs">
                                                    <i data-lucide="check-circle" class="w-3 h-3 text-green-400"></i>
                                                    <span class="text-green-400 font-semibold">Funds saved: $47,892</span>
                                                    <span class="text-gray-600 ml-auto">+0.8s</span>
                                                </div>
                                            </div>
                                            
                                            <!-- Result -->
                                            <div class="pt-2 border-t border-white/10">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs text-gray-500">Total exit time</span>
                                                    <span class="text-sm font-bold text-green-400">0.8 seconds</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Status Indicator -->
                                    <div class="mt-6 flex items-center gap-2 text-sm text-gray-500">
                                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>100% success rate</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Enhanced Stats Bar -->
            <div class="mt-24">
                <div class="relative">
                    <div class="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-purple-600/20 to-orange-600/20 rounded-3xl blur-xl"></div>
                    <div class="relative glass-card rounded-3xl p-12 border border-white/10">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div class="text-center group">
                                <div class="relative inline-block mb-4">
                                    <div class="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                    <div class="relative text-5xl font-black text-gradient">400ms</div>
                                </div>
                                <p class="text-sm text-gray-400 font-medium">Detection Speed</p>
                            </div>
                            <div class="text-center group">
                                <div class="relative inline-block mb-4">
                                    <div class="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                    <div class="relative text-5xl font-black text-gradient">0.8s</div>
                                </div>
                                <p class="text-sm text-gray-400 font-medium">Exit Execution</p>
                            </div>
                            <div class="text-center group">
                                <div class="relative inline-block mb-4">
                                    <div class="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                    <div class="relative text-5xl font-black text-gradient">99.9%</div>
                                </div>
                                <p class="text-sm text-gray-400 font-medium">Success Rate</p>
                            </div>
                            <div class="text-center group">
                                <div class="relative inline-block mb-4">
                                    <div class="absolute inset-0 bg-pink-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                    <div class="relative text-5xl font-black text-gradient">24/7</div>
                                </div>
                                <p class="text-sm text-gray-400 font-medium">Always Active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Enhanced CTA -->
            <div class="text-center mt-20 space-y-8">
                <div class="space-y-4">
                    <p class="text-2xl text-gray-300">
                        Ready to protect your investments?
                    </p>
                    <p class="text-lg text-gray-500">
                        Join <span class="text-white font-semibold">10,245+ traders</span> who never worry about rug pulls again
                    </p>
                </div>
                
                <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button class="btn btn-primary text-lg px-10 py-5 group shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
                        <i data-lucide="shield" class="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform"></i>
                        Start Protection Now
                        <i data-lucide="arrow-right" class="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform"></i>
                    </button>
                    <a href="how-it-works.php" class="btn btn-secondary text-lg px-8 py-4 group">
                        <i data-lucide="book-open" class="w-5 h-5 mr-2"></i>
                        View Technical Docs
                        <i data-lucide="external-link" class="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity"></i>
                    </a>
                </div>
                
                <div class="flex items-center justify-center gap-8 text-sm text-gray-500">
                    <div class="flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
                        <span>No credit card required</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
                        <span>30-day money back</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
                        <span>Cancel anytime</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>