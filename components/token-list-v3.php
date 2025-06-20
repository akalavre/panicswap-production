<!-- Token List V3 - Exact Tailwind Match -->
<style>
/* Flash animations for price updates */
@keyframes flash-green {
    0% { background-color: rgba(34, 197, 94, 0.3); }
    100% { background-color: transparent; }
}

@keyframes flash-red {
    0% { background-color: rgba(239, 68, 68, 0.3); }
    100% { background-color: transparent; }
}

.flash-green {
    animation: flash-green 0.5s ease-out;
}

.flash-red {
    animation: flash-red 0.5s ease-out;
}

/* Ensure table cells have transition */
#token-list-tbody-v3 td {
    transition: background-color 0.3s ease;
}
</style>

<div class="card-glass">
    <!-- DEX Coverage Alert -->
    <div class="mb-4">
        <div class="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle h-5 w-5 text-warning-400">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" x2="12" y1="8" y2="12"></line>
                            <line x1="12" x2="12.01" y1="16" y2="16"></line>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-sm">DEX Coverage: 2 of 11 Available</h4>
                        <p class="text-xs text-gray-400 mt-0.5">Your Pro plan shows tokens from Raydium & Orca only</p>
                    </div>
                </div>
                <button class="text-primary-400 hover:text-primary-300 text-sm underline">View Details</button>
            </div>
        </div>
    </div>

    <!-- Demo Mode Banner -->
    <div id="demo-mode-banner-v3" class="mb-4 hidden">
        <div class="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flask h-5 w-5 text-purple-400">
                            <path d="M10 2v8L8 12l-2 2 5 8h2l5-8-2-2-2-2V2"></path>
                            <path d="M8.5 2h7"></path>
                            <path d="M7 16h10"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-medium text-sm text-purple-300">Demo Mode Active</h4>
                        <p class="text-xs text-gray-400 mt-0.5">Testing with sample tokens. Connect wallet to see your real tokens.</p>
                    </div>
                </div>
                <button onclick="document.getElementById('connect-wallet-btn')?.click()" class="text-purple-400 hover:text-purple-300 text-sm underline">Connect Wallet</button>
            </div>
        </div>
    </div>

    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
        <div>
            <h3 class="text-xl font-bold">Your Tokens</h3>
            <div class="flex items-center gap-4">
                <p class="text-sm text-gray-400">Total Value: $<span id="total-value-v3">0.00</span></p>
                <span class="text-sm text-gray-400">•</span>
                <div class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-4 w-4 text-primary-500">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                    </svg>
                    <span class="text-sm text-gray-400"><span id="protected-count-v3">0</span> Protected</span>
                </div>
            </div>
        </div>
        
        <!-- Controls -->
        <div class="flex gap-2 items-center">
            <!-- Auto-Protect Toggle -->
            <div class="relative">
                <div class="flex items-center gap-2">
                    <label class="flex items-center cursor-pointer group">
                        <span class="text-sm mr-2 transition-colors text-gray-400 group-hover:text-gray-300">Auto-Protect</span>
                        <div class="relative">
                            <input class="sr-only" type="checkbox" id="auto-protect-v3">
                            <div class="w-10 h-5 rounded-full transition-all duration-300 bg-gray-700 hover:bg-gray-600">
                                <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 bg-white translate-x-0"></div>
                            </div>
                        </div>
                    </label>
                    <button class="p-1 rounded-lg hover:bg-gray-800/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings h-3.5 w-3.5 text-gray-500">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="p-1 rounded-lg hover:bg-gray-800/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info h-3.5 w-3.5 text-gray-500">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Buttons -->
            <div class="relative">
                <button class="btn-outline py-1 px-2 text-xs flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-filter h-3 w-3 mr-1">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span id="filter-text-v3">All Tokens</span>
                </button>
            </div>
            
            <button class="btn-outline py-1 px-2 text-xs flex items-center" onclick="refreshTokensV3()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw h-3 w-3 mr-1 ">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M8 16H3v5"></path>
                </svg>
                Refresh
            </button>
            
            <button class="btn-outline py-1 px-2 text-xs flex items-center" onclick="toggleBalancesV3()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off h-3 w-3 mr-1">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                    <line x1="2" x2="22" y1="2" y2="22"></line>
                </svg>
                <span id="balance-text-v3">Hide Balances</span>
            </button>
            
            <button class="btn-outline py-1 px-2 text-xs flex items-center" title="Show compact view">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-columns2 h-3 w-3 mr-1">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M12 3v18"></path>
                </svg>
                Compact
            </button>
        </div>
    </div>

    <!-- Demo Banner -->
    <div class="bg-gradient-to-r from-primary-900/20 to-purple-900/20 border border-primary-600/50 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-4 w-4 text-primary-400 mt-0.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <div class="flex-1">
                <h4 class="text-sm font-semibold text-primary-300">🎮 Try PanicSwap Demo - Test with ANY Real Token!</h4>
                <p class="text-xs text-gray-300 mt-1">Enter any token mint address from pump.fun, Raydium, or your favorite DEX. We'll fetch real blockchain data and show you how our protection works.</p>
                <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div class="text-green-400">✓ Real-time price monitoring ✓ Liquidity tracking ✓ Rugpull detection alerts</div>
                    <div class="text-green-400">✓ Protection triggers (simulated) ✓ Emergency notifications ✓ Full dashboard features</div>
                </div>
                <p class="text-xs text-yellow-400 mt-2 font-medium">💡 Demo mode: Protection alerts are real, but swaps are simulated</p>
            </div>
        </div>
        <div class="flex gap-2">
            <input placeholder="Paste any Solana token mint address (e.g., from pump.fun or Raydium)" 
                   class="flex-1 bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" 
                   type="text" 
                   id="demo-token-input">
            <button class="btn-primary px-4 py-2 text-sm flex items-center gap-2" onclick="startDemo(event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-4 w-4">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Start Demo
            </button>
        </div>
        <div class="mt-3 space-y-2">
            <div class="text-xs text-gray-400">
                <p class="font-medium text-gray-300 mb-1">Popular tokens to demo:</p>
                <div class="grid grid-cols-3 gap-2">
                    <button class="text-left p-2 bg-gray-800/50 rounded hover:bg-gray-800/70 transition-colors" onclick="setDemoToken('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm')">
                        <span class="text-primary-400 font-medium">WIF</span>
                        <span class="text-gray-500 block text-xs truncate">EKpQG...zcjm</span>
                    </button>
                    <button class="text-left p-2 bg-gray-800/50 rounded hover:bg-gray-800/70 transition-colors" onclick="setDemoToken('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')">
                        <span class="text-primary-400 font-medium">BONK</span>
                        <span class="text-gray-500 block text-xs truncate">DezXA...B263</span>
                    </button>
                    <button class="text-left p-2 bg-gray-800/50 rounded hover:bg-gray-800/70 transition-colors" onclick="setDemoToken('HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC')">
                        <span class="text-primary-400 font-medium">PENG</span>
                        <span class="text-gray-500 block text-xs truncate">HeLp6...8jwC</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-800">
            <thead>
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Token</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            Risk
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Overall risk score (0-100)</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            Age
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Time since token launch</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-end whitespace-nowrap">
                            Price
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Current price with 24h change</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-end whitespace-nowrap">
                            Liquidity
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Current liquidity with 1h change</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-end whitespace-nowrap">
                            Value
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Your holdings value (hover for balance)</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            Dev
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Developer wallet activity</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Holders</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Creator %</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            Sell
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Can you sell? (Honeypot check)</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            LP
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Liquidity pool locked percentage</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-center whitespace-nowrap">
                            Protection
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Protection status and settings</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sticky right-0 bg-gray-900 min-w-[160px]">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-800" id="token-list-tbody-v3">
                <!-- Token rows will be inserted here -->
            </tbody>
        </table>
    </div>

    <!-- Loading State -->
    <div id="loading-state-v3" class="py-12 text-center">
        <svg class="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500 mt-2">Loading tokens...</p>
    </div>

    <!-- Empty State -->
    <div id="empty-state-v3" class="py-12 text-center hidden">
        <p class="text-gray-500">No tokens found</p>
        <p class="text-sm text-gray-600 mt-2">Connect your wallet to see your tokens, or try refreshing the page</p>
        <button onclick="refreshTokensV3()" class="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
            Retry Loading
        </button>
    </div>

    <!-- Footer -->
    <div class="mt-6 p-4 bg-gradient-to-r from-primary-900/10 to-purple-900/10 border border-primary-800/30 rounded-lg">
        <div class="flex items-start space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info h-5 w-5 text-primary-400 mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
            </svg>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-300">Not seeing all your tokens?</p>
                <p class="text-xs text-gray-400 mt-1">Your Pro plan shows tokens from Raydium and Orca. Upgrade to Degen Mode to see tokens from all DEXs and memecoin launchpads.</p>
                <button class="inline-flex items-center text-xs text-primary-400 hover:text-primary-300 mt-2 font-medium">View upgrade options →</button>
            </div>
        </div>
    </div>
</div>

<script>
// Token List V3 State
let tokenListV3State = {
    tokens: [],
    loading: true,
    filter: 'all',
    showBalances: true,
    hiddenTokens: new Set()
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard] Token list v3 initializing...');
    console.log('[Dashboard] Backend URL:', window.BACKEND_URL || 'http://localhost:3001');
    
    // Wait for Supabase to load
    const waitForSupabase = setInterval(() => {
        if (window.supabase && window.supabaseClient) {
            clearInterval(waitForSupabase);
            console.log('Supabase client ready, loading tokens...');
            console.log('[Dashboard] Starting initial token load...');
            loadTokensV3();
            
            // Set up periodic token registration refresh (every 30 seconds)
            setInterval(() => {
                const walletAddress = localStorage.getItem('walletAddress');
                if (tokenListV3State.tokens.length > 0) {
                    console.log('[Dashboard] Re-registering tokens with backend...');
                    registerDashboardTokens(walletAddress, tokenListV3State.tokens);
                }
            }, 30000); // 30 seconds
            
            // Subscribe to price updates immediately
            subscribeToTokenUpdatesV3();
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(waitForSupabase);
        console.log('Supabase timeout, loading with mock data...');
        loadTokensV3();
    }, 5000);
    
    // Auto-protect toggle
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (autoProtectToggle) {
        autoProtectToggle.addEventListener('change', function(e) {
            console.log('Auto-protect:', e.target.checked);
        });
    }
});

// Load tokens
async function loadTokensV3() {
    tokenListV3State.loading = true;
    
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await loadFromSupabaseV3();
        } else {
            // Mock data
            loadMockDataV3();
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
        showEmptyStateV3();
    }
}

// Load from Supabase using comprehensive fetcher
async function loadFromSupabaseV3() {
    const walletAddress = localStorage.getItem('walletAddress');
    // Demo tokens are now added to user's real wallet
    
    try {
        // Use the comprehensive token fetcher
        if (window.SupabaseTokenFetcher) {
            let tokens;
            
            if (walletAddress) {
                console.log('Fetching tokens for wallet:', walletAddress);
                tokens = await window.SupabaseTokenFetcher.fetchDashboardTokens(walletAddress);
            } else {
                console.log('No wallet connected, fetching demo tokens...');
                tokens = await window.SupabaseTokenFetcher.fetchDemoTokens();
            }
            
            if (tokens && tokens.length > 0) {
                console.log('Loaded token data:', tokens);
                console.log('[Dashboard] Sample token data:', {
                    token: tokens[0]?.symbol,
                    mint: tokens[0]?.token_mint,
                    price: tokens[0]?.price,
                    value: tokens[0]?.value,
                    balance: tokens[0]?.balance
                });
                console.log('[Dashboard] About to register tokens with backend');
                tokenListV3State.tokens = tokens;
                renderTokensV3();
                hideLoadingStateV3();
                
                // Register these tokens with backend for price polling
                console.log('[Dashboard] Calling registerDashboardTokens...');
                registerDashboardTokens(walletAddress, tokens);
                return;
            } else {
                console.log('No tokens found, loading mock data');
                loadMockDataV3();
            }
        } else {
            // Fallback to mock data if fetcher not available
            console.log('Token fetcher not available, loading mock data...');
            loadMockDataV3();
        }
        
    } catch (error) {
        console.error('Error in loadFromSupabaseV3:', error);
        loadMockDataV3();
    }
}

// Register dashboard tokens with backend for price polling
async function registerDashboardTokens(walletAddress, tokens) {
    try {
        if (!tokens || tokens.length === 0) {
            console.log('[Dashboard] No tokens to register');
            return;
        }
        
        // Extract token mints
        const tokenMints = tokens.map(t => t.token_mint).filter(Boolean);
        
        if (tokenMints.length === 0) {
            console.log('[Dashboard] No token mints found');
            return;
        }
        
        console.log(`[Dashboard] Registering ${tokenMints.length} tokens for polling:`, tokenMints);
        console.log('[Dashboard] Using backend URL:', window.BACKEND_URL || 'http://localhost:3001');
        
        // Send to backend
        // Use relative URL if on same domain, or configure the backend URL
        const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/dashboard/register-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                walletAddress: walletAddress || 'demo',
                tokenMints: tokenMints
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`[Dashboard] Successfully registered tokens:`, data);
        } else {
            console.error('[Dashboard] Failed to register tokens:', response.status, await response.text());
        }
    } catch (error) {
        console.error('[Dashboard] Error registering tokens:', error);
        // Try to get more details about the error
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('[Dashboard] Network error - backend may not be reachable at', window.BACKEND_URL || 'http://localhost:3001');
            console.error('[Dashboard] Make sure the backend is running and CORS is configured');
        }
    }
}

// Process tokens with metadata
async function processTokensV3(tokens, isMockBalance = false) {
    return await Promise.all(tokens.map(async (token) => {
        // Get price data if not already present
        let priceData = {};
        if (!token.price_usd && !token.price) {
            const { data: price } = await supabaseClient
                .from('token_prices')
                .select('*')
                .eq('token_mint', token.token_mint)
                .single();
            priceData = price || {};
        } else {
            // Use existing price data from token
            priceData = token;
        }
        
        // Get metadata
        const { data: metadata } = await supabaseClient
            .from('token_metadata')
            .select('logo_uri, logo_url, decimals, risk_score, name, symbol')
            .eq('mint', token.token_mint)
            .single();
        
        // Get latest price from history
        const { data: priceHistory } = await supabaseClient
            .from('token_price_history')
            .select('price, liquidity, volume_24h, market_cap')
            .eq('token_mint', token.token_mint)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single();
        
        // Determine decimals
        const decimals = token.decimals || metadata?.decimals || 9;
        
        // Calculate balance (raw balance is in smallest unit, need to divide by decimals)
        const balance = isMockBalance ? 
            Math.random() * 10000 : 
            (token.balance ? token.balance / Math.pow(10, decimals) : 0);
        
        // Get price (prefer latest_price > history > price_usd > price)
        const price = token.latest_price || priceHistory?.price || priceData.price_usd || priceData.price || token.price_usd || token.price || 0;
        
        // Log for debugging
        console.log(`Token ${symbol}:`, {
            balance: balance,
            price: price,
            priceHistory: priceHistory?.price,
            priceData: priceData.price_usd || priceData.price,
            tokenPrice: token.price_usd || token.price
        });
        
        // Calculate value
        const value = balance * price;
        
        // Get image URL
        const imageUrl = metadata?.logo_uri || metadata?.logo_url || token.logo_uri || token.logo_url || '';
        
        // Get symbol and name (prefer metadata > priceData > token)
        const symbol = metadata?.symbol || priceData.symbol || token.symbol || token.metadata_symbol || 'Unknown';
        const name = metadata?.name || priceData.name || token.name || token.metadata_name || symbol;
        
        return {
            token_mint: token.token_mint,
            symbol: symbol,
            name: name,
            balance: balance,
            price: price,
            price_change_24h: priceData.change_24h || token.change_24h || 0,
            liquidity_usd: token.latest_liquidity || priceHistory?.liquidity || priceData.liquidity || token.liquidity || 0,
            volume_24h: token.latest_volume || priceHistory?.volume_24h || priceData.volume_24h || token.volume_24h || 0,
            market_cap: token.latest_market_cap || priceHistory?.market_cap || priceData.market_cap || token.market_cap || 0,
            value: value,
            image: imageUrl,
            risk_score: metadata?.risk_score || Math.floor(Math.random() * 100),
            platform: priceData.platform || token.platform || 'unknown',
            created_at: priceData.created_at || token.created_at || priceData.updated_at || new Date().toISOString(),
            holder_count: Math.floor(Math.random() * 10000),
            creator_balance_pct: Math.random() * 10,
            dev_sold_pct: Math.random() * 50,
            honeypot_status: Math.random() > 0.8 ? 'warning' : 'safe',
            lp_locked_pct: Math.random() * 100,
            protected: Math.random() > 0.7
        };
    }));
}

// Load mock data
function loadMockDataV3() {
    const mockTokens = [
        {
            token_mint: 'VATER123',
            symbol: 'VATER',
            name: 'VATER',
            balance: 1000000,
            price: 0.000048,
            price_change_24h: 12.5,
            liquidity_usd: 500000,
            value: 48,
            image: 'https://ipfs.io/ipfs/bafkreiagbstiybo5grin3nneyfj5yolmjcgiq2dqv4hwcrb6uf2cmroizy',
            risk_score: 50,
            honeypot_status: 'unknown',
            lp_locked_pct: 0,
            protected: false
        },
        {
            token_mint: 'DONK123',
            symbol: 'DONK',
            name: 'Original Pepe Cult',
            balance: 1000000,
            price: 0.0000436,
            price_change_24h: -5.3,
            liquidity_usd: 500000,
            value: 43.6,
            image: 'https://ipfs.io/ipfs/QmZBTrUYvoBbrCssxWNQKVD6RtU4n9K17B6yrt3KsdXwKK',
            risk_score: 20,
            honeypot_status: 'safe',
            lp_locked_pct: 100,
            protected: false
        },
        {
            token_mint: 'xFractal123',
            symbol: 'xFractal',
            name: 'FractalDotFun',
            balance: 1000000,
            price: 0.0000436,
            price_change_24h: -5.3,
            liquidity_usd: 500000,
            value: 43.6,
            image: 'https://ipfs.io/ipfs/bafkreigneoksbfp7x6e56di3wqwakf67dseoz3636prupxrxmsnhn25wl4',
            risk_score: 20,
            honeypot_status: 'safe',
            lp_locked_pct: 100,
            protected: false,
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            token_mint: 'omw123',
            symbol: 'omw',
            name: 'on my way',
            balance: 1000000,
            price: 0.00004809,
            price_change_24h: 8.9,
            liquidity_usd: 150000000,
            value: 48.09,
            image: 'https://ipfs.io/ipfs/bafkreiavaxa75dynaztiyqfdvpmhy3v25hdvhodcw42ejkcq7oae5yaq4y',
            risk_score: 20,
            honeypot_status: 'safe',
            lp_locked_pct: 100,
            protected: true,
            created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
            token_mint: 'WIF123',
            symbol: 'WIF',
            name: 'dogwifhat',
            balance: 100,
            price: 2.45,
            price_change_24h: 15.7,
            liquidity_usd: 50000000,
            value: 245,
            image: 'https://bafybeiczy3p5hqugpaugr5gkgqbsfsn5ovfcyi7dbiuz3bcc7uhn2zeyey.ipfs.cf-ipfs.com',
            risk_score: 10,
            honeypot_status: 'safe',
            lp_locked_pct: 100,
            protected: true
        },
        {
            token_mint: 'BONK123',
            symbol: 'BONK',
            name: 'Bonk',
            balance: 50000000,
            price: 0.00002134,
            price_change_24h: -3.2,
            liquidity_usd: 25000000,
            value: 1067,
            image: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
            risk_score: 15,
            honeypot_status: 'safe',
            lp_locked_pct: 100,
            protected: true
        }
    ];
    
    // Add test token flags and additional fields
    mockTokens.forEach(token => {
        token.is_test_token = true;
        token.is_demo_mode = true;
        token.platform = token.platform || 'raydium';
        token.volume_24h = token.volume_24h || Math.random() * 1000000;
        token.market_cap = token.market_cap || token.liquidity_usd * 2;
        token.holder_count = token.holder_count || Math.floor(Math.random() * 10000);
        token.creator_balance_pct = token.creator_balance_pct || 5;
        token.dev_activity_pct = token.dev_activity_pct || Math.random() * 30;
        token.liquidity_change_1h = token.liquidity_change_1h || (Math.random() * 10 - 5);
        token.liquidity_change_24h = token.liquidity_change_24h || (Math.random() * 20 - 10);
        token.age = token.age || { value: 30, unit: 'd', raw_days: 30 };
        token.risk_level = token.risk_level || (token.risk_score >= 60 ? 'HIGH' : token.risk_score >= 40 ? 'MODERATE' : 'LOW');
        token.monitoring_active = true;
        token.protected = true; // Show all demo tokens as protected
    });
    
    tokenListV3State.tokens = mockTokens;
    renderTokensV3();
    hideLoadingStateV3();
}

// Render tokens
function renderTokensV3() {
    const tbody = document.getElementById('token-list-tbody-v3');
    const tokens = tokenListV3State.tokens;
    
    if (tokens.length === 0) {
        showEmptyStateV3();
        return;
    }
    
    hideLoadingStateV3();
    
    // Show demo banner if no wallet connected or using demo wallet
    const walletAddress = localStorage.getItem('walletAddress');
    // Demo tokens are now added to user's real wallet
    const demoBanner = document.getElementById('demo-mode-banner-v3');
    
    if (!walletAddress && demoBanner) {
        demoBanner.classList.remove('hidden');
    } else if (demoBanner) {
        demoBanner.classList.add('hidden');
    }
    
    let totalValue = 0;
    let protectedCount = 0;
    
    tbody.innerHTML = tokens.map(token => {
        totalValue += token.value || 0;
        if (token.protected) protectedCount++;
        return renderTokenRowV3(token);
    }).join('');
    
    // Update stats
    document.getElementById('total-value-v3').textContent = formatNumberV3(totalValue);
    document.getElementById('protected-count-v3').textContent = protectedCount;
    
    // Update dashboard stats if they exist
    const portfolioValueEl = document.getElementById('portfolio-value');
    if (portfolioValueEl) {
        portfolioValueEl.textContent = '$' + formatNumberV3(totalValue);
    }
    
    const protectedCountEl = document.getElementById('protected-count');
    if (protectedCountEl) {
        protectedCountEl.textContent = protectedCount;
    }
    
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = tokenListV3State.tokens.length;
    }
}

// Render single token row
function renderTokenRowV3(token) {
    // Debug log token data
    console.log(`Rendering token ${token.symbol}:`, {
        price: token.price,
        price_change_24h: token.price_change_24h,
        value: token.value
    });
    
    const riskBadge = getRiskBadgeV3(token.risk_score);
    const ageBadge = getAgeBadgeV3(token.age || token.launch_time);
    const priceBadge = getPriceBadgeV3(token.price, token.price_change_24h);
    const liquidityBadge = getLiquidityBadgeV3(token.liquidity_usd, token.liquidity_change_1h);
    const devBadge = getDevBadgeV3(token.dev_activity_pct);
    const honeypotBadge = getHoneypotBadgeV3(token.honeypot_status);
    const lpBadge = getLPBadgeV3(token.lp_locked_pct);
    const protectionBadge = getProtectionBadgeV3(token.protected, token.monitoring_active);
    const actionButtons = getActionButtonsV3(token);
    
    return `
        <tr class="hover:bg-gray-800/50 transition-colors">
            <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    <img alt="${token.symbol}" 
                         class="h-8 w-8 rounded-full mr-3" 
                         src="${token.image || '/assets/images/token-placeholder.svg'}"
                         onerror="this.src='/assets/images/token-placeholder.svg'">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">${token.symbol}</span>
                        </div>
                        <div class="text-sm text-gray-400">${token.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 text-center">${riskBadge}</td>
            <td class="px-4 py-3 text-center">${ageBadge}</td>
            <td class="px-4 py-3 text-right">${priceBadge}</td>
            <td class="px-4 py-3 text-right">${liquidityBadge}</td>
            <td class="px-4 py-3 text-right">
                <div title="Balance: ${formatNumberV3(token.balance)} ${token.symbol}">
                    ${tokenListV3State.showBalances ? 
                        `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${formatNumberV3(token.value)}</span>` :
                        `<span class="formatted-price font-semibold text-gray-100 tabular-nums">****</span>`
                    }
                </div>
            </td>
            <td class="px-4 py-3 text-center">${devBadge}</td>
            <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-gray-100">${formatNumberV3(token.holder_count || 0)}</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium ${token.creator_balance_pct > 10 ? 'text-red-400' : 'text-green-400'}">${(token.creator_balance_pct || 0).toFixed(1)}%</span>
            </td>
            <td class="px-4 py-3 text-center">${honeypotBadge}</td>
            <td class="px-4 py-3 text-center">${lpBadge}</td>
            <td class="px-4 py-3 text-center">${protectionBadge}</td>
            <td class="px-4 py-3 text-center sticky right-0 bg-gray-900">${actionButtons}</td>
        </tr>
    `;
}

// Badge generators
function getRiskBadgeV3(riskScore) {
    let color = 'blue';
    let icon = 'shield';
    let text = 'Low';
    
    if (riskScore >= 70) {
        color = 'red';
        icon = 'alert-triangle';
        text = 'High';
    } else if (riskScore >= 50) {
        color = 'yellow';
        icon = 'alert-circle';
        text = 'Medium';
    }
    
    return `
        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-${color}-500/10 border-${color}-500/20 border cursor-pointer transition-all hover:opacity-80">
            ${getIconV3(icon, `w-3.5 h-3.5 text-${color}-400`)}
            <span class="text-xs font-medium text-${color}-400">${text}</span>
        </div>
    `;
}

function getAgeBadgeV3(age) {
    if (!age) return '<span class="text-xs text-gray-500">-</span>';
    
    // Handle age object format
    if (age.value && age.unit) {
        const ageColor = age.raw_days < 7 ? 'text-red-400' : age.raw_days < 30 ? 'text-yellow-400' : 'text-blue-400';
        return `
            <div class="inline-flex items-center gap-1 ${ageColor}">
                ${getIconV3('clock', 'w-3.5 h-3.5')}
                <span class="text-xs font-medium">${age.value}${age.unit}</span>
            </div>
        `;
    }
    
    // Handle timestamp format
    if (typeof age === 'string' || age instanceof Date) {
        const ageMs = Date.now() - new Date(age).getTime();
        const days = ageMs / (1000 * 60 * 60 * 24);
        const ageColor = days < 7 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-blue-400';
        
        return `
            <div class="inline-flex items-center gap-1 ${ageColor}" title="Launched ${new Date(age).toLocaleDateString()}">
                ${getIconV3('clock', 'w-3.5 h-3.5')}
                <span class="text-xs font-medium">${Math.floor(days)}d</span>
            </div>
        `;
    }
    
    return '<span class="text-xs text-gray-500">-</span>';
}

function getPriceBadgeV3(price, change24h) {
    // Convert price to number if it's a string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const numChange = typeof change24h === 'string' ? parseFloat(change24h) : (change24h || 0);
    
    // Check if price is valid
    if (!numPrice || numPrice === 0 || isNaN(numPrice)) {
        return `
            <div class="flex flex-col items-end gap-1">
                <div class="text-lg">
                    <span class="text-xs text-gray-500">$0.00</span>
                </div>
                <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/10 border-gray-500/20 border">
                    <span class="text-xs font-medium text-gray-400">0.0% 24h</span>
                </div>
            </div>
        `;
    }
    
    const changeColor = numChange >= 0 ? 'green' : 'red';
    const changeIcon = numChange >= 0 ? '+' : '';
    
    return `
        <div class="flex flex-col items-end gap-1">
            <div class="text-lg">
                ${formatPriceV3(numPrice)}
            </div>
            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/10 border-gray-500/20 border">
                <span class="text-xs font-medium text-gray-400">${changeIcon}${numChange.toFixed(1)}% 24h</span>
            </div>
        </div>
    `;
}

function getLiquidityBadgeV3(liquidity, change1h) {
    const changeColor = !change1h ? 'gray' : change1h >= 0 ? 'green' : 'red';
    const changeIcon = change1h >= 0 ? '+' : '';
    const changeText = change1h ? `${changeIcon}${change1h.toFixed(1)}% 1h` : 'N/A';
    
    return `
        <div class="flex flex-col gap-1">
            <span class="price-significant tracking-tight text-sm font-semibold text-gray-100">$${formatNumberV3(liquidity)}</span>
            <div class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-${changeColor}-500/10 border-${changeColor}-500/20 border self-end whitespace-nowrap">
                <span class="text-xs font-medium text-${changeColor}-400">${changeText}</span>
            </div>
        </div>
    `;
}

function getDevBadgeV3(devActivityPct) {
    if (!devActivityPct && devActivityPct !== 0) {
        return '<span class="text-xs text-gray-500">-</span>';
    }
    
    let color = 'green';
    let text = 'Low';
    
    if (devActivityPct > 50) {
        color = 'red';
        text = 'High';
    } else if (devActivityPct > 20) {
        color = 'yellow';
        text = 'Med';
    }
    
    return `
        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-${color}-500/10 border-${color}-500/20 border">
            <span class="text-xs font-medium text-${color}-400">${text}</span>
        </div>
    `;
}

function getHoneypotBadgeV3(status) {
    if (status === 'safe') {
        return `
            <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border-green-500/20 border" title="Token can be sold normally">
                ${getIconV3('check-circle', 'w-4 h-4 text-green-400')}
            </div>
        `;
    } else if (status === 'warning') {
        return `
            <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border-red-500/20 border" title="Honeypot detected">
                ${getIconV3('x-circle', 'w-4 h-4 text-red-400')}
            </div>
        `;
    }
    return `
        <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-500/10 border-gray-500/20 border" title="Sellability status unknown">
            ${getIconV3('help-circle', 'w-4 h-4 text-gray-400')}
        </div>
    `;
}

function getLPBadgeV3(lpLocked) {
    if (lpLocked > 90) {
        return `
            <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20">
                ${getIconV3('lock', 'w-4 h-4 text-green-400')}
            </div>
        `;
    }
    return `
        <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20">
            ${getIconV3('unlock', 'w-4 h-4 text-red-400')}
        </div>
    `;
}

function getProtectionBadgeV3(isProtected, monitoringActive) {
    if (isProtected) {
        return `
            <div class="flex flex-col items-center gap-1">
                <div class="inline-flex items-center px-2 py-1 rounded-full bg-primary-900/60 text-primary-400">
                    ${getIconV3('shield', 'h-3 w-3 mr-1')}
                    <span class="text-xs font-medium">Protected</span>
                </div>
                ${monitoringActive ? `
                    <div class="flex items-center gap-1">
                        <div class="relative">
                            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                            <div class="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                        <span class="text-xs text-green-400">Active</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    return `
        <div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 text-gray-400">
            ${getIconV3('shield', 'h-3 w-3 mr-1 opacity-50')}
            <span class="text-xs">Not Protected</span>
        </div>
    `;
}

function getActionButtonsV3(token) {
    return `
        <div class="flex justify-center items-center space-x-1 min-w-fit">
            <div class="relative group inline-block">
                <button class="
                    relative group
                    p-2
                    rounded-xl transition-all duration-300
                    glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50
                    cursor-pointer hover:scale-105
                    backdrop-blur-sm
                " aria-label="Set up protection" title="Click to set up protection">
                    <div class="relative">
                        ${getIconV3('shield', 'h-4 w-4 text-gray-400 group-hover:text-gray-300 transition-colors duration-200')}
                    </div>
                </button>
                <div class="
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50
                    hidden group-hover:block
                    px-3 py-2 text-sm text-white bg-gray-900 rounded-lg
                    whitespace-nowrap pointer-events-none
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                ">
                    Click to set up protection
                    <div class="
                        absolute w-0 h-0 border-solid
                        top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-t-4 border-x-transparent border-x-4
                    "></div>
                </div>
            </div>
            <button class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group" title="Configure protection">
                ${getIconV3('settings', 'h-4 w-4 transition-colors duration-200')}
            </button>
            <a href="https://solscan.io/token/${token.token_mint}" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group inline-block" title="View on Solscan">
                ${getIconV3('arrow-up-right', 'h-4 w-4 transition-colors duration-200')}
            </a>
            <button class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-red-400 transition-all duration-300 hover:scale-105 backdrop-blur-sm group" title="Hide token">
                ${getIconV3('eye-off', 'h-4 w-4 transition-colors duration-200')}
            </button>
        </div>
    `;
}

// Helper functions
function formatNumberV3(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    if (num < 0.01) return num.toFixed(4);
    return num.toFixed(2);
}

function formatPriceV3(price) {
    // Convert to number if string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Handle invalid prices
    if (!numPrice || isNaN(numPrice) || numPrice === 0) {
        return `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$0.00</span>`;
    }
    
    // Use scientific notation for very small prices (less than 0.00001)
    if (numPrice < 0.00001) {
        const zeros = -Math.floor(Math.log10(numPrice)) - 1;
        const significant = (numPrice * Math.pow(10, zeros + 3)).toFixed(0);
        return `
            <span class="formatted-price font-semibold text-gray-100 tabular-nums">
                <span class="price-prefix">$0.0</span>
                <sup class="price-zeros text-[0.7em] text-white bg-gray-800/40 px-0 rounded">${zeros}</sup>
                <span class="price-significant tracking-tight">${significant}</span>
            </span>
        `;
    }
    
    // Format based on price range with appropriate decimal places
    if (numPrice >= 1) {
        return `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${numPrice.toFixed(2)}</span>`;
    } else if (numPrice >= 0.01) {
        return `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${numPrice.toFixed(4)}</span>`;
    } else if (numPrice >= 0.0001) {
        return `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${numPrice.toFixed(6)}</span>`;
    } else {
        // For prices between 0.00001 and 0.0001, show 8 decimal places
        return `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${numPrice.toFixed(8)}</span>`;
    }
}

function getIconV3(name, className = '') {
    const icons = {
        'shield': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield ${className}"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`,
        'alert-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle ${className}"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>`,
        'alert-triangle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle ${className}"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line></svg>`,
        'clock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock ${className}"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        'check-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle ${className}"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>`,
        'x-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle ${className}"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`,
        'help-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle ${className}"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>`,
        'lock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock ${className}"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
        'unlock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlock ${className}"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
        'settings': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings ${className}"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        'arrow-up-right': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right ${className}"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`,
        'eye-off': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off ${className}"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>`
    };
    return icons[name] || '';
}

// UI State functions
function showEmptyStateV3() {
    document.getElementById('loading-state-v3').classList.add('hidden');
    document.getElementById('empty-state-v3').classList.remove('hidden');
    document.getElementById('token-list-tbody-v3').innerHTML = '';
}

function hideLoadingStateV3() {
    document.getElementById('loading-state-v3').classList.add('hidden');
    document.getElementById('empty-state-v3').classList.add('hidden');
}

// Actions
function refreshTokensV3() {
    loadTokensV3();
}

function toggleBalancesV3() {
    tokenListV3State.showBalances = !tokenListV3State.showBalances;
    document.getElementById('balance-text-v3').textContent = tokenListV3State.showBalances ? 'Hide Balances' : 'Show Balances';
    renderTokensV3();
}

function setDemoToken(address) {
    document.getElementById('demo-token-input').value = address;
}

async function startDemo(event) {
    // Get button from event or direct call
    const startButton = event ? (event.target.closest('button') || event.currentTarget) : document.querySelector('button[onclick*="startDemo"]');
    const tokenInput = document.getElementById('demo-token-input');
    const tokenAddress = tokenInput.value.trim();
    
    if (!tokenAddress) {
        alert('Please enter a token mint address');
        return;
    }
    
    // Validate Solana address format (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
        alert('Invalid Solana token address');
        return;
    }
    
    try {
        // Show loading state
        const originalText = startButton.innerHTML;
        startButton.disabled = true;
        startButton.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...';
        
        // Get the user's real wallet address
        const walletAddress = localStorage.getItem('walletAddress');
        
        if (!walletAddress) {
            alert('Please connect your wallet first to add demo tokens');
            startButton.disabled = false;
            startButton.innerHTML = originalText;
            return;
        }
        
        console.log('Adding demo token to wallet:', walletAddress);
        
        // Wait for Supabase client to be available
        let supabaseReady = window.supabaseClient !== undefined;
        
        if (!supabaseReady) {
            // Wait for supabaseReady event or timeout
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 3000);
                window.addEventListener('supabaseReady', () => {
                    clearTimeout(timeout);
                    resolve(true);
                }, { once: true });
            });
        }
        
        // Add token directly to Supabase using the client
        if (window.supabaseClient) {
            console.log('Supabase client available, fetching token metadata...');
            
            // First, try to get token from database
            const { data: existingMetadata, error: metadataError } = await window.supabaseClient
                .from('token_metadata')
                .select('*')
                .eq('mint', tokenAddress)
                .single();
            
            let metadata = existingMetadata;
            
            // If not in database, fetch from blockchain via backend
            if (metadataError || !metadata) {
                console.log('Token not in database, fetching from blockchain...');
                
                try {
                    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
                    const response = await fetch(`${backendUrl}/api/tokens/enrich-test`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ mint: tokenAddress })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch token data from blockchain');
                    }
                    
                    const tokenData = await response.json();
                    console.log('Token data from blockchain:', tokenData);
                    
                    // Log Helius asset data if available
                    if (tokenData.heliusAsset) {
                        console.log('Helius Asset Data:', tokenData.heliusAsset);
                        console.log('Token Interface:', tokenData.heliusAsset.interface);
                        console.log('Token Supply:', tokenData.heliusAsset.supply);
                        console.log('Token Info:', tokenData.heliusAsset.token_info);
                        console.log('Content/Metadata:', tokenData.heliusAsset.content);
                    }
                    
                    // Save to database for future use - use upsert to handle existing tokens
                    const { error: insertError } = await window.supabaseClient
                        .from('token_metadata')
                        .upsert({
                            mint: tokenAddress,
                            symbol: tokenData.symbol || 'UNKNOWN',
                            name: tokenData.name || 'Unknown Token',
                            decimals: tokenData.decimals || 9,
                            logo_uri: tokenData.logoUri,
                            logo_url: tokenData.logoUri,
                            description: tokenData.description || null,
                            platform: tokenData.platform || 'unknown',
                            is_active: true,
                            // Store key Helius data if available
                            initial_price: tokenData.price || null,
                            initial_liquidity: tokenData.liquidity || null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'mint'
                        });
                    
                    if (insertError) {
                        console.error('Error saving token metadata:', insertError);
                        throw new Error('Failed to save token metadata: ' + insertError.message);
                    }
                    
                    // Small delay to ensure database consistency
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    metadata = {
                        mint: tokenAddress,
                        symbol: tokenData.symbol,
                        name: tokenData.name,
                        decimals: tokenData.decimals,
                        logo_uri: tokenData.logoUri,
                        platform: tokenData.platform
                    };
                    
                    // Also save initial price data if available
                    if (tokenData.price > 0) {
                        await window.supabaseClient
                            .from('token_prices')
                            .insert({
                                token_mint: tokenAddress,
                                price_usd: tokenData.price,
                                price: tokenData.price,
                                liquidity: tokenData.liquidity || 0,
                                volume_24h: tokenData.volume24h || 0,
                                price_change_24h: tokenData.priceChange24h || 0,
                                platform: tokenData.platform || 'unknown',
                                updated_at: new Date().toISOString()
                            });
                    }
                } catch (fetchError) {
                    console.error('Error fetching from blockchain:', fetchError);
                    throw new Error('Could not fetch token data. Make sure the backend is running on localhost:3001 and the token address is valid.');
                }
            }
            
            if (metadata) {
                console.log('Token metadata ready:', metadata.symbol, metadata.name);
                
                // Verify token exists in token_metadata before adding to wallet
                const { data: verifyToken, error: verifyError } = await window.supabaseClient
                    .from('token_metadata')
                    .select('mint')
                    .eq('mint', tokenAddress)
                    .single();
                
                if (verifyError || !verifyToken) {
                    throw new Error('Token metadata not properly saved. Please try again.');
                }
                
                console.log('Token verified in database, adding to wallet...');
                
                // Add to wallet_tokens with upsert to handle duplicates
                const { error: walletError } = await window.supabaseClient
                    .from('wallet_tokens')
                    .upsert({
                        wallet_address: walletAddress,  // User's real wallet
                        token_mint: tokenAddress,
                        balance: '1000000000000000',
                        decimals: metadata.decimals || 9,
                        is_test_token: true,  // Mark as test token
                        added_at: new Date().toISOString(),
                        last_seen_at: new Date().toISOString()
                    }, {
                        onConflict: 'wallet_address,token_mint'
                    });
                
                if (walletError) {
                    console.error('Error adding to wallet_tokens:', walletError);
                    throw new Error('Failed to add token to wallet: ' + walletError.message);
                }
                
                // Add protection with correct column names
                const { error: protectionError } = await window.supabaseClient
                    .from('protected_tokens')
                    .upsert({
                        wallet_address: walletAddress,  // User's real wallet
                        token_mint: tokenAddress,
                        token_symbol: metadata.symbol,
                        token_name: metadata.name,
                        is_active: true,
                        monitoring_enabled: true,
                        monitoring_active: true,
                        price_threshold: 30,
                        liquidity_threshold: 50,
                        max_slippage_bps: 500,
                        swap_to_sol: true,
                        dev_wallet_monitoring: true,
                        gas_boost: 1.5,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'wallet_address,token_mint'
                    });
                
                if (protectionError) {
                    console.error('Error adding protection:', protectionError);
                    // Don't throw here, token was added successfully
                }
                
                // Show success
                const successDiv = document.createElement('div');
                successDiv.className = 'mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400';
                successDiv.innerHTML = `✓ ${metadata.symbol || 'Token'} added to demo! Refreshing...`;
                tokenInput.parentElement.appendChild(successDiv);
                
                // Clear input
                tokenInput.value = '';
                
                // Check if this is the first demo token for this wallet
                const existingTokens = await window.supabaseClient
                    .from('wallet_tokens')
                    .select('*')
                    .eq('wallet_address', walletAddress)
                    .eq('is_test_token', true);
                
                if (!existingTokens.data || existingTokens.data.length === 1) {
                    // Add more demo tokens automatically
                    const additionalTokens = [
                        'So11111111111111111111111111111111111111112', // SOL
                        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
                    ];
                    
                    for (const mint of additionalTokens) {
                        const { data: tokenMeta } = await window.supabaseClient
                            .from('token_metadata')
                            .select('*')
                            .eq('mint', mint)
                            .single();
                        
                        if (tokenMeta) {
                            await window.supabaseClient.from('wallet_tokens').upsert({
                                wallet_address: walletAddress,  // User's real wallet
                                token_mint: mint,
                                balance: mint.includes('USDC') ? '100000000000' : '50000000000',
                                decimals: tokenMeta.decimals || 9,
                                is_test_token: true,
                                added_at: new Date().toISOString(),
                                last_seen_at: new Date().toISOString()
                            }, {
                                onConflict: 'wallet_address,token_mint'
                            });
                        }
                    }
                }
                
                // Reload tokens
                setTimeout(() => {
                    loadTokensV3();
                    successDiv.remove();
                    
                    // Register the new token for price polling
                    registerDashboardTokens(walletAddress, [{token_mint: tokenAddress}]);
                }, 1000);
            } else {
                throw new Error('Invalid token data received. Please check the token address and try again.');
            }
        } else {
            console.error('Supabase client not available after waiting');
            throw new Error('Database connection not available. Please refresh the page and try again.');
        }
        
        // Restore button
        startButton.disabled = false;
        startButton.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error adding demo token:', error);
        alert('Error: ' + error.message);
        
        // Restore button
        if (startButton) {
            startButton.disabled = false;
            startButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-4 w-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Start Demo';
        }
    }
}

// Real-time updates
if (window.SupabaseTokenFetcher) {
    // Subscribe to comprehensive updates
    const unsubscribe = window.SupabaseTokenFetcher.subscribeToUpdates((type, payload) => {
        console.log(`Received ${type} update:`, payload);
        
        // Handle price updates efficiently
        if (type === 'price' && payload.new) {
            updateTokenPriceV3(payload.new);
        } else if (type === 'rugcheck' && payload.new) {
            updateTokenRugcheckV3(payload.new);
        } else if (type === 'protection' && payload.new) {
            updateTokenProtectionV3(payload.new);
        }
    });
    
    // Store unsubscribe function for cleanup
    window.tokenListV3Unsubscribe = unsubscribe;
}

// Update single token price without reloading all
function updateTokenPriceV3(priceData) {
    console.log('[Price Update] Received price update:', priceData);
    
    // Find token in state
    const tokenIndex = tokenListV3State.tokens.findIndex(t => t.token_mint === priceData.token_mint);
    if (tokenIndex === -1) {
        console.log('[Price Update] Token not found in state:', priceData.token_mint);
        return;
    }
    
    const token = tokenListV3State.tokens[tokenIndex];
    const oldPrice = token.price;
    const oldValue = token.value;
    
    // Update price data
    token.price = priceData.price_usd || priceData.price || 0;
    token.price_change_24h = priceData.price_change_24h || 0;
    token.liquidity_usd = priceData.liquidity || token.liquidity_usd;
    token.volume_24h = priceData.volume_24h || token.volume_24h;
    token.market_cap = priceData.market_cap || token.market_cap;
    
    // Recalculate value
    token.value = token.balance * token.price;
    
    // Update the specific row in the table
    const tbody = document.getElementById('token-list-tbody-v3');
    if (tbody && tbody.children[tokenIndex]) {
        const row = tbody.children[tokenIndex];
        
        // Update price cell with animation
        const priceCell = row.children[3];
        if (priceCell) {
            const priceBadge = getPriceBadgeV3(token.price, token.price_change_24h);
            priceCell.innerHTML = priceBadge;
            
            // Add flash animation
            if (oldPrice !== token.price) {
                priceCell.classList.add(token.price > oldPrice ? 'flash-green' : 'flash-red');
                setTimeout(() => priceCell.classList.remove('flash-green', 'flash-red'), 500);
            }
        }
        
        // Update liquidity cell
        const liquidityCell = row.children[4];
        if (liquidityCell) {
            const liquidityBadge = getLiquidityBadgeV3(token.liquidity_usd, token.liquidity_change_1h);
            liquidityCell.innerHTML = liquidityBadge;
        }
        
        // Update value cell
        const valueCell = row.children[5];
        if (valueCell && tokenListV3State.showBalances) {
            valueCell.innerHTML = `
                <div title="Balance: ${formatNumberV3(token.balance)} ${token.symbol}">
                    <span class="formatted-price font-semibold text-gray-100 tabular-nums">$${formatNumberV3(token.value)}</span>
                </div>
            `;
            
            // Add flash animation for value change
            if (oldValue !== token.value) {
                valueCell.classList.add(token.value > oldValue ? 'flash-green' : 'flash-red');
                setTimeout(() => valueCell.classList.remove('flash-green', 'flash-red'), 500);
            }
        }
    }
    
    // Update totals
    updateTotalsV3();
}

// Update token rugcheck data
function updateTokenRugcheckV3(rugcheckData) {
    const tokenIndex = tokenListV3State.tokens.findIndex(t => t.token_mint === rugcheckData.token_mint);
    if (tokenIndex === -1) return;
    
    const token = tokenListV3State.tokens[tokenIndex];
    
    // Update rugcheck data
    token.risk_score = rugcheckData.risk_score || token.risk_score;
    token.risk_level = rugcheckData.risk_level || token.risk_level;
    token.holder_count = rugcheckData.holders || token.holder_count;
    token.creator_balance_pct = rugcheckData.creator_balance_percent || token.creator_balance_pct;
    token.honeypot_status = rugcheckData.honeypot_status || token.honeypot_status;
    token.lp_locked_pct = rugcheckData.lp_locked || token.lp_locked_pct;
    
    // Update the specific row
    const tbody = document.getElementById('token-list-tbody-v3');
    if (tbody && tbody.children[tokenIndex]) {
        tbody.children[tokenIndex].outerHTML = renderTokenRowV3(token);
    }
}

// Update token protection status
function updateTokenProtectionV3(protectionData) {
    const tokenIndex = tokenListV3State.tokens.findIndex(t => 
        t.token_mint === protectionData.token_mint && 
        localStorage.getItem('walletAddress') === protectionData.wallet_address
    );
    if (tokenIndex === -1) return;
    
    const token = tokenListV3State.tokens[tokenIndex];
    token.protected = protectionData.is_active;
    token.monitoring_active = protectionData.monitoring_active;
    
    // Update the protection badge
    const tbody = document.getElementById('token-list-tbody-v3');
    if (tbody && tbody.children[tokenIndex]) {
        const row = tbody.children[tokenIndex];
        const protectionCell = row.children[11];
        if (protectionCell) {
            protectionCell.innerHTML = getProtectionBadgeV3(token.protected, token.monitoring_active);
        }
    }
    
    // Update protected count
    updateTotalsV3();
}

// Update totals without rerendering
function updateTotalsV3() {
    let totalValue = 0;
    let protectedCount = 0;
    
    tokenListV3State.tokens.forEach(token => {
        totalValue += token.value || 0;
        if (token.protected) protectedCount++;
    });
    
    // Update stats
    document.getElementById('total-value-v3').textContent = formatNumberV3(totalValue);
    document.getElementById('protected-count-v3').textContent = protectedCount;
    
    // Update dashboard stats if they exist
    const portfolioValueEl = document.getElementById('portfolio-value');
    if (portfolioValueEl) {
        portfolioValueEl.textContent = '$' + formatNumberV3(totalValue);
    }
    
    const protectedCountEl = document.getElementById('protected-count');
    if (protectedCountEl) {
        protectedCountEl.textContent = protectedCount;
    }
    
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = tokenListV3State.tokens.length;
    }
}
</script>