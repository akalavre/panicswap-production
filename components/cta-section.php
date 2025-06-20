<section class="py-32 relative overflow-hidden">
    <!-- Background Effects -->
    <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-3xl"></div>
    </div>
    
    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-4xl mx-auto text-center">
            <!-- Main CTA -->
            <h2 class="text-5xl md:text-6xl font-black mb-6">
                Ready to <span class="text-gradient">Stop Losing?</span>
            </h2>
            <p class="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Join thousands of traders who are already protecting their investments. 
                Start now and save your first token within minutes.
            </p>
            
            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-3xl mx-auto">
                <div class="glass-card p-6 text-center">
                    <div class="text-4xl font-bold text-gradient mb-2">2,847</div>
                    <div class="text-sm text-gray-400">SOL Saved This Month</div>
                </div>
                <div class="glass-card p-6 text-center">
                    <div class="text-4xl font-bold text-gradient mb-2">10,245</div>
                    <div class="text-sm text-gray-400">Protected Wallets</div>
                </div>
                <div class="glass-card p-6 text-center">
                    <div class="text-4xl font-bold text-gradient mb-2">1,892</div>
                    <div class="text-sm text-gray-400">Rugs Detected</div>
                </div>
            </div>
            
            <!-- CTA Buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <button id="cta-start-btn" class="btn btn-primary text-xl px-10 py-5 group animate-pulse-glow">
                    <svg class="h-6 w-6 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    Start Free Trial
                    <svg class="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                    </svg>
                </button>
                
                <a href="#pricing" class="btn btn-secondary text-lg px-8 py-4">
                    View Pricing
                </a>
            </div>
            
            <!-- Trust Indicators -->
            <div class="flex flex-wrap justify-center items-center gap-8 text-sm">
                <div class="flex items-center text-gray-400">
                    <svg class="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    30-day money back
                </div>
                <div class="flex items-center text-gray-400">
                    <svg class="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    No credit card required
                </div>
                <div class="flex items-center text-gray-400">
                    <svg class="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Cancel anytime
                </div>
            </div>
        </div>
    </div>
</section>

<script>
document.getElementById('cta-start-btn').addEventListener('click', function() {
    if (typeof walletState !== 'undefined' && walletState.connected) {
        window.location.href = 'protect.php';
    } else if (typeof connectWallet === 'function') {
        connectWallet().then(() => {
            if (walletState.connected) {
                window.location.href = 'protect.php';
            }
        });
    } else {
        window.location.href = 'protect.php';
    }
});
</script>