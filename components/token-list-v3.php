<?php
// Include the token display helper
require_once __DIR__ . '/helpers/token-display.php';
?>
<!-- Token List V3 - Optimized Version -->
<style>
/* Price update classes (no animations) */
.flash-green,
.flash-red { /* Remove all animations and font weight changes */ }

/* Ensure table cells have smooth transitions */
#token-list-tbody-v3 td {
    transition: all 0.2s ease;
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
                    <div class="flex gap-2" id="quick-try-tokens">
                        <!-- Loading state initially -->
                        <div class="flex gap-2 flex-wrap">
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                            <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                                <div class="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    </div>
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
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <div class="flex items-center justify-end whitespace-nowrap">
                            Market Cap
                            <div class="group relative inline-flex items-center ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-3 h-3 text-gray-500 cursor-help">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                                <div class="invisible group-hover:visible absolute z-50 w-48 p-3 mt-1 text-xs leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg -left-20 top-5 whitespace-normal break-words">Total market capitalization</div>
                            </div>
                        </div>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Creator %</th>
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
                <!-- Token rows will be inserted here by JavaScript -->
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
    <div id="empty-state-v3" class="py-16 text-center hidden">
        <!-- Floating Elements Animation -->
        <div class="relative mb-12">
            <!-- Main Illustration -->
            <div class="mx-auto w-32 h-32 relative">
                <!-- Animated Glow Background -->
                <div class="absolute inset-0 bg-gradient-to-br from-primary-500/30 via-purple-500/20 to-secondary-500/30 rounded-full blur-2xl animate-pulse"></div>
                
                <!-- Main Icon Container -->
                <div class="relative w-full h-full bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-full flex items-center justify-center border border-gray-700/50 backdrop-blur-sm shadow-2xl">
                    <!-- Wallet/Search Icon -->
                    <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300">
                            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
                        </svg>
                        <!-- Search overlay -->
                        <div class="absolute -bottom-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-800">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <!-- Floating Token Icons -->
                <div class="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-full border border-blue-500/30 flex items-center justify-center animate-bounce" style="animation-delay: 0.5s">
                    <div class="w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
                </div>
                <div class="absolute -top-1 -right-4 w-6 h-6 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-full border border-green-500/30 flex items-center justify-center animate-bounce" style="animation-delay: 1s">
                    <div class="w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
                </div>
                <div class="absolute -bottom-3 left-2 w-7 h-7 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-full border border-purple-500/30 flex items-center justify-center animate-bounce" style="animation-delay: 1.5s">
                    <div class="w-2.5 h-2.5 bg-purple-400 rounded-full opacity-60"></div>
                </div>
            </div>
        </div>
        
        <!-- Dynamic Heading Based on Wallet Status -->
        <div id="empty-state-heading" class="mb-6">
            <!-- Will be populated by JavaScript -->
        </div>
        
        <!-- Status-Aware Content -->
        <div id="empty-state-content" class="max-w-lg mx-auto mb-10">
            <!-- Will be populated by JavaScript -->
        </div>
        
        <!-- Action Buttons -->
        <div id="empty-state-actions" class="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto mb-8">
            <!-- Will be populated by JavaScript -->
        </div>
        
        <!-- Feature Highlights -->
        <div class="mt-12 pt-8 border-t border-gray-800/50">
            <div class="max-w-3xl mx-auto">
                <h4 class="text-lg font-semibold text-white mb-6 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary-400">
                        <path d="M9 12l2 2 4-4"></path>
                        <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h18z"></path>
                        <path d="M21 16c.552 0 1-.448 1-1v-3c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h18z"></path>
                    </svg>
                    What PanicSwap Offers
                </h4>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Feature 1 -->
                    <div class="group hover:bg-gray-800/30 rounded-lg p-4 transition-all duration-300 border border-transparent hover:border-gray-700/50">
                        <div class="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/30 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary-400">
                                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                            </svg>
                        </div>
                        <h5 class="text-sm font-semibold text-white mb-2">Auto-Protection</h5>
                        <p class="text-xs text-gray-400 leading-relaxed">Automatically protect your tokens from rug pulls and honeypot scams</p>
                    </div>
                    
                    <!-- Feature 2 -->
                    <div class="group hover:bg-gray-800/30 rounded-lg p-4 transition-all duration-300 border border-transparent hover:border-gray-700/50">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                                <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                                <path d="m10 15 5-3-5-3z"></path>
                            </svg>
                        </div>
                        <h5 class="text-sm font-semibold text-white mb-2">Real-time Monitoring</h5>
                        <p class="text-xs text-gray-400 leading-relaxed">24/7 monitoring of token prices, liquidity, and developer activity</p>
                    </div>
                    
                    <!-- Feature 3 -->
                    <div class="group hover:bg-gray-800/30 rounded-lg p-4 transition-all duration-300 border border-transparent hover:border-gray-700/50">
                        <div class="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
                                <path d="M3 3v18h18"></path>
                                <path d="m19 9-5 5-4-4-3 3"></path>
                            </svg>
                        </div>
                        <h5 class="text-sm font-semibold text-white mb-2">Smart Analytics</h5>
                        <p class="text-xs text-gray-400 leading-relaxed">Advanced risk analysis and portfolio insights for better decisions</p>
                    </div>
                </div>
            </div>
        </div>
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

<?php include __DIR__ . '/delete-token-modal.php'; ?>

<!-- Load JavaScript modules -->
<!-- Unified service is already loaded in dashboard.php -->
<script src="assets/js/components/token-skeleton.js"></script>
<script src="assets/js/components/token-list-badges.js"></script>
<script src="assets/js/components/token-list-v3.js"></script>
