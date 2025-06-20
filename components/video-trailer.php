<section id="demo" class="py-32 relative overflow-hidden">
    <!-- Background gradient -->
    <div class="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black"></div>
    
    <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-5xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-16 space-y-6">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card backdrop-blur-sm">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span class="text-sm font-medium text-gray-300">Watch Protection in Action</span>
                </div>
                
                <h2 class="text-4xl md:text-5xl font-bold">
                    See It Save Tokens in <span class="text-gradient">Real-Time</span>
                </h2>
                
                <p class="text-xl text-gray-400 max-w-3xl mx-auto">
                    Watch how PanicSwap instantly detects and exits from rug pulls, 
                    saving your entire investment in under a second
                </p>
            </div>
            
            <!-- Video Container -->
            <div class="relative group">
                <!-- Glow effect -->
                <div class="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-20 blur-lg group-hover:opacity-30 transition-opacity"></div>
                
                <!-- Video wrapper -->
                <div class="relative glass-card rounded-2xl overflow-hidden">
                    <!-- Top bar -->
                    <div class="bg-black/50 backdrop-blur-xl p-4 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="flex gap-1.5">
                                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span class="text-sm text-gray-400">PanicSwap Demo</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs text-gray-500">
                                <i data-lucide="play-circle" class="w-4 h-4"></i>
                                <span>2:34</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Wistia Video -->
                    <div class="relative aspect-video bg-black">
                        <script src="https://fast.wistia.com/player.js" async></script>
                        <script src="https://fast.wistia.com/embed/8xdr3ftm6t.js" async type="module"></script>
                        <style>
                            wistia-player[media-id='8xdr3ftm6t']:not(:defined) { 
                                background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/8xdr3ftm6t/swatch'); 
                                display: block; 
                                filter: blur(5px); 
                                padding-top:56.25%; 
                            }
                            .wistia_embed {
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                            }
                        </style>
                        <wistia-player media-id="8xdr3ftm6t" aspect="1.7777777777777777"></wistia-player>
                    </div>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-3xl mx-auto">
                <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-gradient mb-2">0.8s</div>
                    <p class="text-gray-400">Average exit time</p>
                </div>
                <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-gradient mb-2">100%</div>
                    <p class="text-gray-400">Funds saved</p>
                </div>
                <div class="glass-card p-6 text-center hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-gradient mb-2">$2.4M+</div>
                    <p class="text-gray-400">Protected to date</p>
                </div>
            </div>
            
            <!-- CTA -->
            <div class="text-center mt-12">
                <button class="btn btn-primary group">
                    <i data-lucide="shield" class="w-5 h-5 mr-2"></i>
                    Start Protecting Your Tokens
                    <i data-lucide="arrow-right" class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"></i>
                </button>
            </div>
        </div>
    </div>
</section>