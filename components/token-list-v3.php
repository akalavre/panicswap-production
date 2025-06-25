<?php
// Include the token display helper
require_once __DIR__ . '/helpers/token-display.php';
?>
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

/* ML Risk badge styles */
.ml-risk-badge {
    transition: all 0.3s ease;
}

.ml-risk-badge:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
}

/* ML Risk update animation */
@keyframes ml-update-flash {
    0% { 
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
        transform: scale(1);
    }
    50% { 
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
        transform: scale(1.05);
    }
    100% { 
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        transform: scale(1);
    }
}

.ml-risk-updated .ml-risk-badge {
    animation: ml-update-flash 0.8s ease-out;
}

/* Placeholder badge pulse */
.placeholder-badge {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.placeholder-badge svg {
    animation: spin 1s linear infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.8;
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>

<div class="card-glass">

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
    <div class="bg-gradient-to-r from-primary-900/20 to-purple-900/20 border border-primary-600/50 rounded-lg p-5 mb-6">
        <div class="flex items-start gap-3">
            <div class="p-2 bg-primary-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-5 w-5 text-primary-400">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-base font-semibold text-white">Try PanicSwap Protection</h4>
                    <span class="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium">Live Demo</span>
                </div>
                <p class="text-sm text-gray-300 mb-4">Test with any real Solana token to see our protection in action</p>
                
                <div class="flex gap-2 mb-3">
                    <input placeholder="Enter any Solana token mint address" class="flex-1 bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all" type="text" id="demo-token-input">
                    <button class="btn-primary px-6 py-2.5 text-sm font-medium flex items-center gap-2 hover:shadow-lg transition-all" onclick="startDemo(event)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Start Demo
                    </button>
                </div>
                
                <div class="flex items-center gap-4">
                    <span class="text-xs text-gray-400">Quick try:</span>
                    <div class="flex gap-2" id="quick-try-tokens"><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="SwarmSphere">Sphere</button><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="Romeo Open">ROMEO</button><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="The Hive">HIVE</button><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="gorbagana pnut">Gnut</button><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="Yourself">YOURSELF</button><button class="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white text-xs rounded-md transition-all duration-200 font-medium" title="SLOPCOIN ">SLOPCOIN </button></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-800">
            <thead id="token-list-thead-v3">
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
                            Balance
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Your token balance in this wallet</div>
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
    hiddenTokens: new Set(),
    recentChanges: new Map(), // Track recent protection changes to prevent overwrites
    autoProtectEnabled: JSON.parse(localStorage.getItem('autoProtectEnabled') || 'false'),
    autoProtectProcessing: false
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard] Token list v3 initializing...');
    console.log('[Dashboard] Backend URL:', window.BACKEND_URL || 'http://localhost:3001');
    
    // Export state for global access
    window.tokenListV3State = tokenListV3State;
    
    // Wait for Supabase to load
    const waitForSupabase = setInterval(() => {
        if (window.supabase && window.supabaseClient) {
            clearInterval(waitForSupabase);
            console.log('Supabase client ready, loading tokens...');
            console.log('[Dashboard] Starting initial token load...');
            loadTokensV3();
            
            // Check for tokens with pending metadata after load completes
            setTimeout(() => {
                if (typeof checkAndRefreshPendingTokens === 'function') {
                    console.log('[Dashboard] Checking for tokens with pending metadata...');
                    checkAndRefreshPendingTokens();
                }
            }, 2000); // Wait 2 seconds for tokens to load
            
            // Set up periodic token registration refresh (every 30 seconds)
            setInterval(() => {
                const walletAddress = localStorage.getItem('walletAddress');
                if (tokenListV3State.tokens.length > 0) {
                    console.log('[Dashboard] Re-registering tokens with backend...');
                    registerDashboardTokens(walletAddress, tokenListV3State.tokens);
                }
            }, 30000); // 30 seconds
            
            // Initialize auto-protect toggle
            initializeAutoProtectToggle();
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
            tokenListV3State.autoProtectEnabled = e.target.checked; // keep state in sync
            updateAutoProtectUI();                                   // instantly update visuals
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
            // Show empty state when no supabase client
            showEmptyStateV3();
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
                console.log('No wallet connected');
                showEmptyStateV3();
                return;
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
                
                // Load hidden tokens from localStorage
                const hiddenTokens = JSON.parse(localStorage.getItem('hiddenTokens') || '[]');
                const walletHiddenMints = new Set(
                    hiddenTokens
                        .filter(t => t.wallet === walletAddress)
                        .map(t => t.mint)
                );
                
                // Filter out hidden tokens
                const filteredTokens = tokens.filter(token => !walletHiddenMints.has(token.token_mint));
                
                // Preserve recent protection state changes
                if (tokenListV3State.recentChanges && tokenListV3State.recentChanges.size > 0) {
                    filteredTokens.forEach(token => {
                        const recentChange = tokenListV3State.recentChanges.get(token.token_mint);
                        if (recentChange && (Date.now() - recentChange.timestamp) < 5000) {
                            console.log(`Preserving recent protection state for ${token.symbol}: ${recentChange.state}`);
                            token.protected = recentChange.state;
                            token.monitoring_active = recentChange.state;
                        }
                    });
                }
                
                tokenListV3State.tokens = filteredTokens;
                tokenListV3State.hiddenTokens = walletHiddenMints;
                
                // Auto-protect new tokens if auto-protect is enabled
                await autoProtectNewTokens(filteredTokens, walletAddress);
                
                renderTokensV3();
                hideLoadingStateV3();
                
                // Update real-time risk display for all tokens
                if (window.realTimeRisk) {
                    window.realTimeRisk.updateAllTokenRiskDisplays();
                }
                
                // DISABLED: Backend token registration causing bug where all tokens are registered
                // This was sending ALL displayed tokens (30+) to backend even if user only has 1
                // Backend now discovers tokens through other means (webhooks, direct API calls)
                /*
                if (window.ENABLE_BACKEND_POLLING !== false) {
                    console.log('[Dashboard] Attempting to register tokens with backend...');
                    registerDashboardTokens(walletAddress, tokens).catch(err => {
                        console.log('[Dashboard] Backend registration failed (non-critical):', err.message);
                    });
                }
                */
                return;
            } else {
                console.log('No tokens found');
                showEmptyStateV3();
            }
        } else {
            // Fallback to empty state if fetcher not available
            console.log('Token fetcher not available');
            showEmptyStateV3();
        }
        
    } catch (error) {
        console.error('Error in loadFromSupabaseV3:', error);
        showEmptyStateV3();
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
        // Only log if it's not a network error (backend not running is expected)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.log('[Dashboard] Backend not reachable - skipping token registration (non-critical)');
        } else {
            console.error('[Dashboard] Error registering tokens:', error);
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
        
        // Get protection status
        const walletAddress = localStorage.getItem('walletAddress');
        let protectionData = null;
        if (walletAddress) {
            const { data: protection } = await supabaseClient
                .from('protected_tokens')
                .select('is_active, status, monitoring_active')
                .eq('token_mint', token.token_mint)
                .eq('wallet_address', walletAddress)
                .eq('is_active', true)
                .single();
            protectionData = protection;
        }
        
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
        
        // Determine symbol early for logging & downstream usage
        const symbol = metadata?.symbol || priceData.symbol || token.symbol || token.metadata_symbol || 'Unknown';
        
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
        
        // Get name (prefer metadata > priceData > token)
        const name = metadata?.name || priceData.name || token.name || token.metadata_name || symbol;
        
        return {
            token_mint: token.token_mint,
            symbol: symbol,
            name: name,
            balance: balance,
            price: price,
            price_change_24h: priceData.change_24h || token.change_24h || token.price_change_24h || 0,
            liquidity_usd: token.latest_liquidity || priceHistory?.liquidity || priceData.liquidity || token.liquidity || token.current_liquidity || 0,
            volume_24h: token.latest_volume || priceHistory?.volume_24h || priceData.volume_24h || token.volume_24h || 0,
            market_cap: token.latest_market_cap || priceHistory?.market_cap || priceData.market_cap || token.market_cap || 0,
            value: value,
            image: imageUrl,
            risk_score: metadata?.risk_score || Math.floor(Math.random() * 100),
            platform: priceData.platform || token.platform || token.data_source || 'unknown',
            created_at: priceData.created_at || token.created_at || priceData.updated_at || new Date().toISOString(),
            holder_count: token.holder_count || metadata?.holder_count || Math.floor(Math.random() * 10000),
            creator_balance_pct: token.creator_balance_pct || Math.random() * 10,
            dev_sold_pct: token.dev_sold_pct || Math.random() * 50,
            honeypot_status: token.honeypot_status || (Math.random() > 0.8 ? 'warning' : 'safe'),
            lp_locked_pct: token.lp_locked_pct || Math.random() * 100,
            bonding_curve_progress: token.bonding_curve_progress || null,
            sniper_count: token.sniper_count || null,
            dev_wallet: token.dev_wallet || null,
            data_source: token.data_source || 'unknown',
            protected: protectionData?.is_active || false,
            status: protectionData?.status || null,
            monitoring_active: protectionData?.monitoring_active || false
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
        // Use real data only, no mock values
        token.holder_count = token.holder_count || 0;
        token.creator_balance_pct = token.creator_balance_pct || 0;
        token.dev_activity_pct = token.dev_activity_pct || 0;
        token.liquidity_change_1h = token.liquidity_change_1h || 0;
        token.liquidity_change_24h = token.liquidity_change_24h || 0;
        token.age = token.age || { value: 30, unit: 'd', raw_days: 30 };
        token.risk_level = token.risk_level || (token.risk_score >= 60 ? 'HIGH' : token.risk_score >= 40 ? 'MODERATE' : 'LOW');
        token.monitoring_active = token.protected || false; // Only monitor if protected
        // Keep the protected status as defined in the mock data
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
    
    // Show the thead since we have tokens
    document.getElementById('token-list-thead-v3').classList.remove('hidden');
    
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
    
    // Only update protected count if we have a list-specific element
    const protectedCountList = document.getElementById('protected-count-list-v3');
    if (protectedCountList) {
        protectedCountList.textContent = protectedCount;
    }
    
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = tokenListV3State.tokens.length;
    }
    
    // Apply auto-protect UI state to newly rendered buttons
    if (typeof applyAutoProtectUIToTokens === 'function') {
        applyAutoProtectUIToTokens();
    }
    
    // Update protection counts after render
    if (window.protectionToggle && window.protectionToggle.updateProtectionCounts) {
        window.protectionToggle.updateProtectionCounts();
    }
    
    // Dispatch events that tokens have been loaded/updated
    document.dispatchEvent(new CustomEvent('tokenListUpdated', {
        detail: { 
            tokenCount: tokens.length
        }
    }));
    
    // Also dispatch tokensLoaded for compatibility
    document.dispatchEvent(new CustomEvent('tokensLoaded', {
        detail: { 
            tokenCount: tokens.length
        }
    }));
    
    // Trigger counter refresh directly if available
    if (window.refreshProtectedTokenCount) {
        setTimeout(() => window.refreshProtectedTokenCount(), 50);
    }
    
    // Trigger ML risk display update with a slight delay to ensure DOM is ready
    setTimeout(() => {
        console.log('[Token List] Triggering ML risk display update...');
        if (window.mlRiskDisplay && window.mlRiskDisplay.loadMLRiskForVisibleTokens) {
            window.mlRiskDisplay.loadMLRiskForVisibleTokens();
        }
    }, 100);
}

// JavaScript version of token display helper
function renderTokenDisplayJS(token) {
    // Check if token has pending metadata or placeholder data
    const isPending = token.metadata_status === 'pending';
    const hasPlaceholderData = (
        token.symbol === 'TEST' || 
        token.symbol === 'UNKNOWN' ||
        token.symbol === 'TOKEN' ||
        token.name === 'Test Token' ||
        token.name === 'Unknown Token' ||
        token.name === 'Demo Token' ||
        (token.name && token.name.startsWith('Token '))
    );
    
    if (isPending || hasPlaceholderData) {
        // Return loading state with gradient animation
        return `
            <div class="flex items-center">
                <div class="h-8 w-8 rounded-full mr-3 token-loader"></div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium token-loading-text">Loading...</span>
                    </div>
                    <div class="text-sm text-gray-500">Fetching metadata</div>
                </div>
            </div>
        `;
    }
    
    // Normal token display
    const symbol = token.symbol || 'UNKNOWN';
    const name = token.name || 'Unknown Token';
    const image = token.image || token.logo_uri || token.logo_url || null;
    
    return `
        <div class="flex items-center">
            ${image ? 
                `<img alt="${symbol}" 
                     class="h-8 w-8 rounded-full mr-3" 
                     src="${image}"
                     onerror="this.onerror=null; this.outerHTML='<div class=\\'h-8 w-8 rounded-full mr-3 token-loader\\'></div>';">` :
                `<div class="h-8 w-8 rounded-full mr-3 token-loader"></div>`
            }
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-medium">${symbol}</span>
                </div>
                <div class="text-sm text-gray-400">${name}</div>
            </div>
        </div>
    `;
}

// Render single token row
function renderTokenRowV3(token) {
    // Debug log token data
    console.log(`Rendering token ${token.symbol}:`, {
        price: token.price,
        price_change_24h: token.price_change_24h,
        value: token.value
    });
    
    // Risk badge will be populated by real-time-risk.js
    const riskBadge = `<div data-risk-badge="${token.token_mint}" class="risk-badge-container">
        <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md bg-gray-500/10 border-gray-500/20 text-gray-400">
            <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Loading</span>
        </span>
    </div>`;
    const ageBadge = getAgeBadgeV3(token.age || token.launch_time);
    const priceBadge = getPriceBadgeV3(token.price, token.price_change_24h);
    const balanceBadge = getBalanceBadgeV3(token.original_balance || token.raw_balance || token.balance, token.symbol);
    const devBadge = getDevBadgeV3(token);
    const honeypotBadge = getHoneypotBadgeV3(token.honeypot_status);
    const lpBadge = getLPBadgeV3(token.lp_locked_pct);
    const protectionBadge = getProtectionBadgeV3(token.protected, token.monitoring_active, token.status);
    const actionButtons = getActionButtonsV3(token);
    
    return `
        <tr class="hover:bg-gray-800/50 transition-colors" 
            data-token-mint="${token.token_mint}"
            data-liquidity="${token.liquidity_usd || 0}"
            data-holders="${token.holder_count || 0}"
            data-lp-locked="${token.lp_locked_pct || 0}"
            data-dev-activity="${token.dev_activity_pct || 0}"
            data-creator-balance="${token.creator_balance_pct || 0}"
            data-price-change="${token.price_change_24h || 0}"
            data-age='${token.age ? JSON.stringify(token.age) : ""}'>
            <td class="px-4 py-3 whitespace-nowrap">
                ${renderTokenDisplayJS(token)}
            </td>
            <td class="px-4 py-3 text-center">${riskBadge}</td>
            <td class="px-4 py-3 text-center">${ageBadge}</td>
            <td class="px-4 py-3 text-right">${priceBadge}</td>
            <td class="px-4 py-3 text-right">${balanceBadge}</td>
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

function getBalanceBadgeV3(balance, symbol) {
    // Format balance number with appropriate precision
    const formattedBalance = formatBalanceV3(balance);
    
    return `
        <div class="flex flex-col gap-1">
            <span class="price-significant tracking-tight text-sm font-semibold text-gray-100">${formattedBalance}</span>
            <div class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-500/10 border-gray-500/20 border self-end whitespace-nowrap">
                <span class="text-xs font-medium text-gray-400">${symbol || 'TOKEN'}</span>
            </div>
        </div>
    `;
}

function getDevBadgeV3(token) {
    // Use 24h activity as primary metric, fallback to total
    const devActivityPct = token.dev_activity_24h_pct || token.dev_activity_pct || 0;
    const totalPct = token.dev_activity_pct_total || token.dev_activity_pct || 0;
    const pct1h = token.dev_activity_1h_pct || 0;
    const lastTx = token.last_dev_tx;
    const devWallets = token.dev_wallets || [];
    
    if (!devActivityPct && devActivityPct !== 0) {
        return '<span class="text-xs text-gray-500">-</span>';
    }
    
    let color = 'green';
    let text = 'Low';
    
    // Use 24h activity for thresholds
    if (devActivityPct > 30) {
        color = 'red';
        text = 'High';
    } else if (devActivityPct > 10) {
        color = 'yellow';
        text = 'Med';
    }
    
    // Format last transaction time
    let lastTxText = 'No recent activity';
    if (lastTx) {
        const timeDiff = Date.now() - new Date(lastTx).getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        if (hours < 1) {
            lastTxText = 'Last tx: < 1h ago';
        } else if (hours < 24) {
            lastTxText = `Last tx: ${hours}h ago`;
        } else {
            const days = Math.floor(hours / 24);
            lastTxText = `Last tx: ${days}d ago`;
        }
    }
    
    // Build tooltip content
    const tooltipContent = `
        <div class="text-xs">
            <div class="font-semibold mb-1">Developer Activity</div>
            <div>Total: ${totalPct.toFixed(1)}%</div>
            <div>24h: ${devActivityPct.toFixed(1)}%</div>
            <div>1h: ${pct1h.toFixed(1)}%</div>
            <div class="mt-1">${lastTxText}</div>
            ${devWallets.length > 1 ? `<div class="mt-1">${devWallets.length} dev wallets tracked</div>` : ''}
        </div>
    `.trim();
    
    return `
        <div class="relative group">
            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-${color}-500/10 border-${color}-500/20 border cursor-help">
                <span class="text-xs font-medium text-${color}-400">${text}</span>
                ${devActivityPct > 0 ? `<span class="text-xs text-${color}-400">(${devActivityPct.toFixed(0)}%)</span>` : ''}
            </div>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg whitespace-nowrap">
                    ${tooltipContent}
                </div>
            </div>
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

function getProtectionBadgeV3(isProtected, monitoringActive, status) {
    // Check if token is rugged first
    if (status === 'RUGGED') {
        return `
            <div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800/50 text-gray-500 border border-gray-700/50">
                ${getIconV3('shield', 'h-3 w-3 mr-1 opacity-30')}
                <span class="text-xs">Not Protected</span>
            </div>
        `;
    }
    
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
    const isProtected = token.protected;
    const isNewlyAdded = token.is_newly_added || false;
    const isRugged = token.status === 'RUGGED';
    
    // For newly added tokens, use a disabled state
    let protectionButtonClass, protectionIconClass, protectionTitle, protectionLabel, tooltipText;
    
    if (isRugged) {
        // Rugged token - show completely disabled state
        protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
           bg-black/30 border border-gray-700/30
           cursor-not-allowed opacity-50`;
        protectionIconClass = 'h-4 w-4 text-gray-600';
        protectionTitle = 'Token has been rugged - protection disabled';
        protectionLabel = 'Protection unavailable (rugged)';
        tooltipText = 'This token has been rugged and cannot be protected';
    } else if (isNewlyAdded && !isProtected) {
        // Newly added token - show inactive/disabled state
        protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
           glass-card-enhanced bg-gray-800/40 border border-gray-700/30
           cursor-not-allowed opacity-50`;
        protectionIconClass = 'h-4 w-4 text-gray-500';
        protectionTitle = 'Please wait - fetching token data...';
        protectionLabel = 'Protection unavailable';
        tooltipText = 'Protection will be available once token data is loaded';
    } else if (isProtected) {
        // Protected token
        protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
           bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 hover:border-red-500/70
           cursor-pointer hover:scale-105 backdrop-blur-sm shadow-lg shadow-red-500/20`;
        protectionIconClass = 'h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors duration-200';
        protectionTitle = 'Click to disable protection';
        protectionLabel = 'Disable protection';
        tooltipText = 'Click to disable protection';
    } else {
        // Not protected token (but not newly added)
        protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300
           glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50
           cursor-pointer hover:scale-105 backdrop-blur-sm`;
        protectionIconClass = 'h-4 w-4 text-gray-400 group-hover:text-gray-300 transition-colors duration-200';
        protectionTitle = 'Click to enable protection';
        protectionLabel = 'Enable protection';
        tooltipText = 'Click to set up protection';
    }
    
    return `
        <div class="flex justify-center items-center space-x-1 min-w-fit">
            <div class="relative group inline-block">
                <button class="${protectionButtonClass}" 
                        aria-label="${protectionLabel}" 
                        title="${protectionTitle}"
                        aria-pressed="${isProtected}"
                        ${isRugged ? 'disabled' : 'data-protection-btn data-protect-button'}
                        data-mint="${token.token_mint}"
                        data-symbol="${token.symbol}"
                        data-name="${token.name || token.symbol}"
                        data-protected="${isProtected}"
                        data-rugged="${isRugged}">
                    <div class="relative">
                        ${getIconV3('shield', protectionIconClass)}
                        ${isProtected ? `<div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>` : ''}
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
                    ${tooltipText}
                    <div class="
                        absolute w-0 h-0 border-solid
                        top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-t-4 border-x-transparent border-x-4
                    "></div>
                </div>
            </div>
            ${isProtected && !isRugged ? `
            <button class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group"
                    title="Configure protection settings"
                    data-protection-settings
                    data-mint="${token.token_mint}"
                    data-symbol="${token.symbol}">
                ${getIconV3('settings', 'h-4 w-4 transition-colors duration-200')}
            </button>
            ` : ''}
            <a href="https://solscan.io/token/${token.token_mint}" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group inline-block" title="View on Solscan">
                ${getIconV3('arrow-up-right', 'h-4 w-4 transition-colors duration-200')}
            </a>
            <button onclick="hideTokenV3('${token.token_mint}', '${token.symbol}')" class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-red-400 transition-all duration-300 hover:scale-105 backdrop-blur-sm group" title="Remove token from wallet">
                ${getIconV3('trash-2', 'h-4 w-4 transition-colors duration-200')}
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

function formatBalanceV3(balance) {
    // Handle null/undefined
    if (balance === null || balance === undefined) {
        return '0';
    }
    
    // If it's already a string, return as-is to preserve all decimal places
    if (typeof balance === 'string') {
        return balance === '' || balance === '0' ? '0' : balance;
    }
    
    // If it's a number, convert to string but preserve all precision
    // Use toFixed with high precision to avoid scientific notation
    if (typeof balance === 'number') {
        if (balance === 0) return '0';
        // Use enough decimal places to preserve precision, then remove trailing zeros
        return balance.toFixed(20).replace(/\.?0+$/, '');
    }
    
    return '0';
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
        'eye-off': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off ${className}"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>`,
        'info': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info ${className}"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`
    };
    return icons[name] || '';
}

// UI State functions
function showEmptyStateV3() {
    document.getElementById('loading-state-v3').classList.add('hidden');
    document.getElementById('empty-state-v3').classList.remove('hidden');
    document.getElementById('token-list-tbody-v3').innerHTML = '';
    document.getElementById('token-list-thead-v3').classList.add('hidden');
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
            protectionCell.innerHTML = getProtectionBadgeV3(token.protected, token.monitoring_active, token.status);
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
    
    // Only update protected count if we have a list-specific element
    const protectedCountList = document.getElementById('protected-count-list-v3');
    if (protectedCountList) {
        protectedCountList.textContent = protectedCount;
    }
    
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = tokenListV3State.tokens.length;
    }
    
    // Update protection counts after render
    if (window.protectionToggle && window.protectionToggle.updateProtectionCounts) {
        window.protectionToggle.updateProtectionCounts();
    }
    
    // Dispatch event that tokens have been loaded/updated
    document.dispatchEvent(new CustomEvent('tokenListUpdated', {
        detail: { 
            tokenCount: window.tokenStateV3?.tokens?.length || 0
        }
    }));
}

// Delete token function (renamed from hideTokenV3)
async function hideTokenV3(tokenMint, tokenSymbol) {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to remove ${tokenSymbol} from your wallet? This will delete it from the database.`)) {
        return;
    }
    
    try {
        // Delete from database
        const { error } = await supabaseClient
            .from('wallet_tokens')
            .delete()
            .eq('wallet_address', walletAddress)
            .eq('token_mint', tokenMint);
            
        if (error) {
            console.error('Error deleting token:', error);
            showNotification(`Failed to delete ${tokenSymbol}: ${error.message}`, 'error');
            return;
        }
        
        // Also check if token is protected and remove protection
        const { data: protectedToken } = await supabaseClient
            .from('protected_tokens')
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('token_mint', tokenMint)
            .single();
            
        if (protectedToken) {
            // Remove protection
            await supabaseClient
                .from('protected_tokens')
                .delete()
                .eq('wallet_address', walletAddress)
                .eq('token_mint', tokenMint);
        }
        
        // Remove from current tokens in UI
        tokenListV3State.tokens = tokenListV3State.tokens.filter(t => t.token_mint !== tokenMint);
        
        // Re-render tokens
        renderTokensV3();
        
        // Update protected count if needed
        if (window.refreshProtectedTokenCount) {
            window.refreshProtectedTokenCount();
        }
        
        // Show notification
        showNotification(`${tokenSymbol} has been removed from your wallet`, 'success');
        
    } catch (error) {
        console.error('Error in hideTokenV3:', error);
        showNotification(`Failed to remove ${tokenSymbol}`, 'error');
    }
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full ${
        type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
        type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
        'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            ${type === 'success' ? getIconV3('check-circle', 'w-5 h-5') :
              type === 'error' ? getIconV3('x-circle', 'w-5 h-5') :
              getIconV3('info', 'w-5 h-5')}
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-y-full');
        notification.classList.add('translate-y-0');
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('translate-y-0');
        notification.classList.add('translate-y-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize auto-protect toggle
function initializeAutoProtectToggle() {
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (!autoProtectToggle) return;
    
    // Load auto-protect status from Supabase for current wallet
    loadAutoProtectStatus();
    
    // Set initial UI state
    updateAutoProtectUI();
    
    // Add event listener
    autoProtectToggle.addEventListener('change', handleAutoProtectToggle);
    
    // Subscribe to realtime updates for auto-protect status
    subscribeToAutoProtectUpdates();
}

// Load auto-protect status from Supabase
async function loadAutoProtectStatus() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('wallet_auto_protection')
            .select('enabled')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (data && !error) {
            tokenListV3State.autoProtectEnabled = data.enabled;
            localStorage.setItem('autoProtectEnabled', JSON.stringify(data.enabled));
            updateAutoProtectUI();
        }
    } catch (error) {
        console.log('No auto-protect settings found for wallet, using default (false)');
    }
}

// Handle auto-protect toggle change
async function handleAutoProtectToggle(event) {
    const enabled = event.target.checked;
    const walletAddress = localStorage.getItem('walletAddress');
    
    if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
        event.target.checked = false;
        return;
    }
    
    if (tokenListV3State.autoProtectProcessing) {
        event.target.checked = !enabled; // Revert the change
        return;
    }
    
    tokenListV3State.autoProtectProcessing = true;
    
    try {
        // Update local state immediately for UI responsiveness
        tokenListV3State.autoProtectEnabled = enabled;
        localStorage.setItem('autoProtectEnabled', JSON.stringify(enabled));
        updateAutoProtectUI();
        
        // Show processing notification
        showNotification(
            enabled ? 'Enabling auto-protect...' : 'Disabling auto-protect...', 
            'info'
        );
        
        // Call backend bulk toggle API
        const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/auto-protection/bulk-toggle/${walletAddress}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(data.message, 'success');
            
            // Immediately update all tokens' protection state in UI
            if (enabled) {
                // When enabling auto-protect, mark ALL tokens as protected
                console.log('🛡️ Auto-Protect ON: Protecting all tokens in UI');
                tokenListV3State.tokens.forEach(token => {
                    console.log(`- Protecting ${token.symbol}`);
                    token.protected = true;
                    token.monitoring_active = true;
                });
            } else {
                // When disabling, unprotect all tokens
                console.log('🛡️ Auto-Protect OFF: Unprotecting all tokens in UI');
                tokenListV3State.tokens.forEach(token => {
                    console.log(`- Unprotecting ${token.symbol}`);
                    token.protected = false;
                    token.monitoring_active = false;
                });
            }
            
            // Re-render to show updated protection states
            console.log('Re-rendering token list with updated protection states...');
            renderTokensV3();
            
            // Also refresh from backend after a short delay to sync
            setTimeout(() => {
                refreshTokensV3();
            }, 2000);
        } else {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        console.error('Error toggling auto-protection:', error);
        
        // Revert state on error
        tokenListV3State.autoProtectEnabled = !enabled;
        localStorage.setItem('autoProtectEnabled', JSON.stringify(!enabled));
        event.target.checked = !enabled;
        updateAutoProtectUI();
        
        showNotification('Failed to update auto-protection', 'error');
    } finally {
        tokenListV3State.autoProtectProcessing = false;
    }
}

// Update auto-protect UI based on current state
function updateAutoProtectUI() {
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (!autoProtectToggle) return;
    
    const toggleContainer = autoProtectToggle.parentElement;
    const toggleTrack = toggleContainer.querySelector('div:last-child');
    const toggleHandle = toggleTrack.querySelector('div');
    
    // Update checkbox state
    autoProtectToggle.checked = tokenListV3State.autoProtectEnabled;
    
    // Update visual state
    if (tokenListV3State.autoProtectEnabled) {
        toggleTrack.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        toggleTrack.classList.add('bg-green-600', 'hover:bg-green-500');
        toggleHandle.classList.remove('translate-x-0');
        toggleHandle.classList.add('translate-x-5');
    } else {
        toggleTrack.classList.remove('bg-green-600', 'hover:bg-green-500');
        toggleTrack.classList.add('bg-gray-700', 'hover:bg-gray-600');
        toggleHandle.classList.remove('translate-x-5');
        toggleHandle.classList.add('translate-x-0');
    }
    
    // Update processing state
    if (tokenListV3State.autoProtectProcessing) {
        autoProtectToggle.disabled = true;
        toggleContainer.style.opacity = '0.6';
    } else {
        autoProtectToggle.disabled = false;
        toggleContainer.style.opacity = '1';
    }
    
    // Update individual token button states
    applyAutoProtectUIToTokens();
}

// Auto-protect new tokens if auto-protect is enabled
async function autoProtectNewTokens(tokens, walletAddress) {
    if (!tokenListV3State.autoProtectEnabled || !walletAddress) {
        return;
    }
    
    console.log('🛡️ Auto-protect is enabled, checking for new tokens to protect...');
    
    // Filter tokens that should be auto-protected
    const tokensToProtect = tokens.filter(token => {
        // Only protect tokens with reasonable value (>$10) to avoid spam tokens
        const value = token.value || 0;
        const isUnprotected = !token.protected;
        const hasMinValue = value > 10;
        
        return isUnprotected && hasMinValue;
    });
    
    if (tokensToProtect.length === 0) {
        console.log('No new tokens to auto-protect');
        return;
    }
    
    console.log(`Auto-protecting ${tokensToProtect.length} new tokens:`, tokensToProtect.map(t => t.symbol));
    
    // Protect each token via backend
    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
    const protectionPromises = tokensToProtect.map(async (token) => {
        try {
            const response = await fetch(`${backendUrl}/api/protection/protect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: walletAddress,
                    tokenMint: token.token_mint,
                    settings: {
                        priceDropThreshold: 20,
                        liquidityDropThreshold: 30,
                        gasBoost: 1.5,
                        slippageTolerance: 5,
                        autoSell: true
                    },
                    tokenInfo: {
                        symbol: token.symbol,
                        name: token.name,
                        currentPrice: token.price
                    }
                })
            });
            
            if (response.ok) {
                console.log(`✅ Auto-protected ${token.symbol}`);
                // Update local state
                token.protected = true;
                token.monitoring_active = true;
                return true;
            } else {
                console.error(`❌ Failed to auto-protect ${token.symbol}:`, await response.text());
                return false;
            }
        } catch (error) {
            console.error(`❌ Error auto-protecting ${token.symbol}:`, error);
            return false;
        }
    });
    
    // Wait for all protection attempts to complete
    const results = await Promise.all(protectionPromises);
    const successCount = results.filter(Boolean).length;
    
    if (successCount > 0) {
        showNotification(`Auto-protected ${successCount} new tokens`, 'success');
    }
}

// Apply auto-protect UI state to individual token buttons
function applyAutoProtectUIToTokens() {
    const protectButtons = document.querySelectorAll('[data-protect-button]');
    
    protectButtons.forEach(button => {
        const isAutoProtectEnabled = tokenListV3State.autoProtectEnabled;
        const isTokenProtected = button.getAttribute('data-protected') === 'true';
        
        if (isAutoProtectEnabled) {
            // When auto-protect is enabled, disable manual control but show current state
            button.disabled = true;
            button.classList.add('shield-button-disabled', 'shield-tooltip');
            
            if (isTokenProtected) {
                button.classList.add('shield-button-auto-protected');
            }
            
            if (isTokenProtected) {
                button.setAttribute('data-tooltip', 'Auto-Protected - disable Auto-Protect to manage manually');
            } else {
                button.setAttribute('data-tooltip', 'Will be auto-protected when value exceeds $10 - disable Auto-Protect to manage manually');
            }
        } else {
            // When auto-protect is disabled, restore normal functionality
            button.disabled = false;
            button.classList.remove('shield-button-disabled', 'shield-tooltip', 'shield-button-auto-protected');
            
            if (isTokenProtected) {
                button.title = 'Click to disable protection';
            } else {
                button.title = 'Click to enable protection';
            }
        }
    });
}

// Subscribe to realtime updates for auto-protect status
function subscribeToAutoProtectUpdates() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress || !window.supabaseClient) return;
    
    console.log('📡 Subscribing to auto-protect realtime updates...');
    
    // Subscribe to changes in wallet_auto_protection table for this wallet
    const subscription = window.supabaseClient
        .channel(`auto-protect-${walletAddress}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'wallet_auto_protection',
                filter: `wallet_address=eq.${walletAddress}`
            },
            (payload) => {
                console.log('🔄 Auto-protect status changed:', payload);
                
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const newEnabled = payload.new.enabled;
                    
                    // Only update if the state actually changed
                    if (newEnabled !== tokenListV3State.autoProtectEnabled) {
                        console.log(`🔄 Syncing auto-protect state: ${newEnabled ? 'ON' : 'OFF'}`);
                        
                        // Update local state
                        tokenListV3State.autoProtectEnabled = newEnabled;
                        localStorage.setItem('autoProtectEnabled', JSON.stringify(newEnabled));
                        
                        // Update UI
                        updateAutoProtectUI();
                        
                        // Show notification
                        showNotification(
                            `Auto-protect ${newEnabled ? 'enabled' : 'disabled'} from another device`,
                            'info'
                        );
                        
                        // If enabled from another device, update all tokens to show as protected
                        if (newEnabled) {
                            tokenListV3State.tokens.forEach(token => {
                                token.protected = true;
                                token.monitoring_active = true;
                            });
                        } else {
                            tokenListV3State.tokens.forEach(token => {
                                token.protected = false;
                                token.monitoring_active = false;
                            });
                        }
                        
                        // Re-render tokens to show updated states
                        renderTokensV3();
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Subscribed to auto-protect realtime updates');
            }
        });
    
    // Store subscription for cleanup if needed
    window.autoProtectSubscription = subscription;
}

// Cleanup auto-protect subscription (call when wallet changes)
function cleanupAutoProtectSubscription() {
    if (window.autoProtectSubscription) {
        console.log('🧹 Cleaning up auto-protect subscription');
        window.autoProtectSubscription.unsubscribe();
        window.autoProtectSubscription = null;
    }
}

// Risk tooltip functionality
let riskTooltipTimeout = null;
let riskTooltip = null;

function showRiskTooltip(element, event) {
    // Clear any existing timeout
    if (riskTooltipTimeout) {
        clearTimeout(riskTooltipTimeout);
    }
    
    const tokenMint = element.closest('tr').querySelector('[data-token-mint]')?.getAttribute('data-token-mint');
    const token = tokenListV3State.tokens.find(t => t.token_mint === tokenMint);
    
    if (!token) return;
    
    // Create tooltip element if it doesn't exist
    if (!riskTooltip) {
        riskTooltip = document.createElement('div');
        riskTooltip.className = 'fixed z-[100] bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[400px] transition-opacity duration-200';
        riskTooltip.style.opacity = '0';
        document.body.appendChild(riskTooltip);
    }
    
    // Build tooltip content
    const riskColor = token.risk_score >= 80 ? 'text-red-400' : 
                      token.risk_score >= 60 ? 'text-orange-400' :
                      token.risk_score >= 40 ? 'text-yellow-400' :
                      token.risk_score >= 20 ? 'text-blue-400' : 'text-green-400';
    
    const autoSellStatus = token.protected && token.risk_level === 'CRITICAL' ? 
        '<div class="flex items-center gap-2 text-red-400 font-medium"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Auto-sell will trigger!</div>' : '';
    
    riskTooltip.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <h4 class="text-sm font-semibold text-gray-200">Risk Analysis</h4>
                <span class="text-xs text-gray-500">${token.symbol}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <div class="text-xs text-gray-500 mb-1">Risk Score</div>
                    <div class="text-lg font-bold ${riskColor}">${token.risk_score || 0}/100</div>
                </div>
                <div>
                    <div class="text-xs text-gray-500 mb-1">Risk Level</div>
                    <div class="text-sm font-medium ${riskColor}">${token.risk_level || 'UNKNOWN'}</div>
                </div>
            </div>
            
            <div class="space-y-2 pt-2 border-t border-gray-800">
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">Holders</span>
                    <span class="font-medium ${token.holder_count < 10 ? 'text-red-400' : 'text-gray-200'}">${formatNumberV3(token.holder_count || 0)}</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">LP Locked</span>
                    <span class="font-medium ${token.lp_locked_pct < 50 ? 'text-yellow-400' : 'text-green-400'}">${(token.lp_locked_pct || 0).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">Dev Wallet</span>
                    <span class="font-medium ${token.creator_balance_pct > 20 ? 'text-red-400' : 'text-green-400'}">${(token.creator_balance_pct || 0).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">Honeypot</span>
                    <span class="font-medium ${token.honeypot_status === 'warning' ? 'text-red-400' : token.honeypot_status === 'safe' ? 'text-green-400' : 'text-gray-400'}">${token.honeypot_status || 'Unknown'}</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">Liquidity 24h</span>
                    <span class="font-medium ${token.liquidity_change_24h < -10 ? 'text-red-400' : 'text-gray-200'}">${token.liquidity_change_24h > 0 ? '+' : ''}${(token.liquidity_change_24h || 0).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400">Dev Activity</span>
                    <span class="font-medium ${token.dev_activity_24h_pct > 30 ? 'text-red-400' : 'text-green-400'}">${(token.dev_activity_24h_pct || 0).toFixed(1)}%</span>
                </div>
            </div>
            
            ${token.warnings && token.warnings.length > 0 ? `
                <div class="pt-2 border-t border-gray-800">
                    <div class="text-xs text-gray-500 mb-1">Warnings</div>
                    <ul class="text-xs text-yellow-400 space-y-1">
                        ${token.warnings.map(w => `<li>• ${w}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${autoSellStatus ? `<div class="pt-2 border-t border-gray-800">${autoSellStatus}</div>` : ''}
            
            <div class="pt-2 border-t border-gray-800">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">Protection Status</span>
                    <span class="text-xs font-medium ${token.protected ? 'text-green-400' : 'text-gray-400'}">
                        ${token.protected ? '🛡️ Protected' : 'Not Protected'}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 350;
    const tooltipHeight = 400; // Approximate height
    
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.bottom + 10;
    
    // Adjust if tooltip goes off screen
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    
    if (top + tooltipHeight > window.innerHeight - 10) {
        top = rect.top - tooltipHeight - 10;
    }
    
    riskTooltip.style.left = `${left}px`;
    riskTooltip.style.top = `${top}px`;
    
    // Show tooltip with fade in
    requestAnimationFrame(() => {
        riskTooltip.style.opacity = '1';
    });
}

function hideRiskTooltip() {
    if (riskTooltipTimeout) {
        clearTimeout(riskTooltipTimeout);
    }
    
    riskTooltipTimeout = setTimeout(() => {
        if (riskTooltip) {
            riskTooltip.style.opacity = '0';
            setTimeout(() => {
                if (riskTooltip && riskTooltip.parentNode) {
                    riskTooltip.parentNode.removeChild(riskTooltip);
                    riskTooltip = null;
                }
            }, 200);
        }
    }, 100);
}

// Expose functions globally for other modules
window.cleanupAutoProtectSubscription = cleanupAutoProtectSubscription;
window.renderTokenRowV3 = renderTokenRowV3;
window.tokenListV3State = tokenListV3State;
window.showRiskTooltip = showRiskTooltip;
window.hideRiskTooltip = hideRiskTooltip;
window.refreshTokensV3 = refreshTokensV3;
</script>