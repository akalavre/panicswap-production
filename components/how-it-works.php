<section id="how-it-works" class="py-24 relative overflow-hidden bg-black">
    <!-- Simple gradient background -->
    <div class="absolute inset-0 bg-gradient-to-b from-gray-900/20 to-black"></div>
    
    <div class="container mx-auto px-4 relative z-10">
        <!-- Section Header -->
        <div class="text-center mb-20 max-w-3xl mx-auto">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
                <span class="text-orange-400 text-sm font-medium">How It Works</span>
            </div>
            
            <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span class="text-white">Three Simple Steps to</span>
                <br />
                <span class="text-gradient bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
                    Total Protection
                </span>
            </h2>
            
            <p class="text-xl text-gray-400 leading-relaxed">
                Get protected in seconds. No complex setup, no constant monitoring.
            </p>
        </div>
        
        <!-- Steps Container -->
        <div class="max-w-6xl mx-auto">
            <!-- Step 1 -->
            <div class="step-item mb-32" data-step="1">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <!-- Content -->
                    <div class="step-content">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="step-number w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                1
                            </div>
                            <h3 class="text-2xl md:text-3xl font-bold text-white">
                                Select Tokens to Protect
                            </h3>
                        </div>
                        
                        <p class="text-lg text-gray-400 mb-8 leading-relaxed">
                            Choose which pump.fun tokens you want to protect. Enable auto-sell with custom stop-loss thresholds that trigger instantly when danger is detected.
                        </p>
                        
                        <ul class="space-y-4">
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">Toggle protection per token</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">Set custom stop-loss thresholds</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">Instant activation, no delays</span>
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Visual -->
                    <div class="step-visual">
                        <div class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
                            <div class="bg-black/50 rounded-xl p-6 font-mono text-sm">
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span class="text-gray-500 text-xs ml-auto">protection.config</span>
                                </div>
                                <code class="text-gray-300">
                                    <span class="text-purple-400">const</span> <span class="text-blue-400">protection</span> = {<br/>
                                    &nbsp;&nbsp;<span class="text-gray-400">token:</span> <span class="text-green-400">"PUMP_TOKEN"</span>,<br/>
                                    &nbsp;&nbsp;<span class="text-gray-400">stopLoss:</span> <span class="text-orange-400">30</span>, <span class="text-gray-600">// -30% trigger</span><br/>
                                    &nbsp;&nbsp;<span class="text-gray-400">autoSell:</span> <span class="text-blue-400">true</span><br/>
                                    };
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 2 -->
            <div class="step-item mb-32" data-step="2">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <!-- Visual -->
                    <div class="step-visual md:order-1">
                        <div class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
                            <div class="space-y-4">
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-purple-400 text-sm font-semibold">LIVE MONITORING</span>
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span class="text-xs text-gray-500">Active</span>
                                    </div>
                                </div>
                                
                                <!-- Monitoring Items -->
                                <div class="bg-black/50 rounded-lg p-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                            </svg>
                                        </div>
                                        <span class="text-gray-300">Liquidity Pool</span>
                                    </div>
                                    <span class="text-green-400 text-sm">98% Safe</span>
                                </div>
                                
                                <div class="bg-black/50 rounded-lg p-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                        </div>
                                        <span class="text-gray-300">Holder Distribution</span>
                                    </div>
                                    <span class="text-blue-400 text-sm">Healthy</span>
                                </div>
                                
                                <div class="bg-black/50 rounded-lg p-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                            <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                                            </svg>
                                        </div>
                                        <span class="text-gray-300">Contract Security</span>
                                    </div>
                                    <span class="text-green-400 text-sm">Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Content -->
                    <div class="step-content md:order-2">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="step-number w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                2
                            </div>
                            <h3 class="text-2xl md:text-3xl font-bold text-white">
                                AI Detects Rug Pulls
                            </h3>
                        </div>
                        
                        <p class="text-lg text-gray-400 mb-8 leading-relaxed">
                            Our AI monitors pump.fun tokens 24/7, analyzing over 50 risk factors to detect liquidity removal, dev dumps, and honeypot patterns in real-time.
                        </p>
                        
                        <ul class="space-y-4">
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">AI analyzes 50+ risk signals</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">24/7 real-time monitoring</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">200ms detection speed</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Step 3 -->
            <div class="step-item" data-step="3">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <!-- Content -->
                    <div class="step-content">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="step-number w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                3
                            </div>
                            <h3 class="text-2xl md:text-3xl font-bold text-white">
                                Auto-Sell Executes
                            </h3>
                        </div>
                        
                        <p class="text-lg text-gray-400 mb-8 leading-relaxed">
                            When danger is detected, we instantly execute your exit strategy, swapping tokens to SOL at lightning speed to save your investment.
                        </p>
                        
                        <ul class="space-y-4">
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">0.4 second execution time</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">100% success rate</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-gray-300">Direct swap to SOL</span>
                            </li>
                        </ul>
                    </div>
                    
                    <!-- Visual -->
                    <div class="step-visual">
                        <div class="bg-red-900/20 backdrop-blur-sm rounded-2xl p-8 border border-red-900/50">
                            <div class="space-y-4">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-red-400 font-semibold">RUG PULL DETECTED</p>
                                        <p class="text-xs text-gray-500">Token: PUMP • Time: 14:32:08</p>
                                    </div>
                                </div>
                                
                                <div class="space-y-2 text-sm">
                                    <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span class="text-gray-400">Liquidity removed: 98%</span>
                                        <span class="text-gray-600 ml-auto">+0.2s</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span class="text-gray-400">Auto-sell triggered</span>
                                        <span class="text-gray-600 ml-auto">+0.3s</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span class="text-green-400 font-semibold">Swapped to SOL: 15.8 SOL</span>
                                        <span class="text-gray-600 ml-auto">+0.4s</span>
                                    </div>
                                </div>
                                
                                <div class="pt-4 mt-4 border-t border-gray-800">
                                    <div class="flex items-center justify-between">
                                        <span class="text-gray-500 text-sm">Total exit time</span>
                                        <span class="text-green-400 font-bold">0.4 seconds</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Stats Section -->
        <div class="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div class="text-center">
                <div class="text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                    200ms
                </div>
                <p class="text-gray-400 text-sm">Rug Detection</p>
            </div>
            <div class="text-center">
                <div class="text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                    0.4s
                </div>
                <p class="text-gray-400 text-sm">Auto-Sell Speed</p>
            </div>
            <div class="text-center">
                <div class="text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent mb-2">
                    100%
                </div>
                <p class="text-gray-400 text-sm">Save Rate</p>
            </div>
            <div class="text-center">
                <div class="text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent mb-2">
                    24/7
                </div>
                <p class="text-gray-400 text-sm">Always Active</p>
            </div>
        </div>
        
        <!-- CTA Section -->
        <div class="text-center mt-20">
            <p class="text-2xl text-gray-300 mb-2">Ready to protect your investments?</p>
            <p class="text-lg text-gray-500 mb-8">
                Join <span class="text-white font-semibold">10,245+ traders</span> who never worry about rug pulls again
            </p>
            
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="dashboard.php" class="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full transition-all transform hover:scale-105">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1v7z"></path>
                    </svg>
                    Start Protection Now
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                </a>
                
                <a href="#pricing" class="inline-flex items-center gap-2 px-6 py-3 text-gray-300 hover:text-white font-medium transition-colors">
                    View Pricing
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </a>
            </div>
        </div>
    </div>
</section>

<style>
/* Clean animations */
.step-item {
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-item.visible {
    opacity: 1;
    transform: translateY(0);
}

.step-content > * {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-item.visible .step-content > * {
    opacity: 1;
    transform: translateY(0);
}

.step-item.visible .step-content > *:nth-child(1) { transition-delay: 0.1s; }
.step-item.visible .step-content > *:nth-child(2) { transition-delay: 0.2s; }
.step-item.visible .step-content > *:nth-child(3) { transition-delay: 0.3s; }
.step-item.visible .step-content > *:nth-child(4) { transition-delay: 0.4s; }

.step-visual {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-item.visible .step-visual {
    opacity: 1;
    transform: scale(1) translateY(0);
    transition-delay: 0.3s;
}

/* Hover effects */
.step-visual > div {
    transition: all 0.3s ease;
}

.step-visual > div:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .step-item {
        margin-bottom: 4rem;
    }
    
    .step-visual {
        margin-top: 2rem;
    }
}
</style>

<script>
// Simple scroll animations
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all step items
    document.querySelectorAll('.step-item').forEach(el => {
        observer.observe(el);
    });
});
</script>