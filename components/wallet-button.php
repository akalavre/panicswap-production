<!-- Wallet Connection Button Component -->
<div 
    id="wallet-button-container" 
    class="relative"
    data-wallet-connected="false"
    data-wallet-address=""
>
    <!-- Not Connected State -->
    <button 
        data-wallet-element="connect-button"
        class="relative group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-primary-500/20" 
        onclick="openWalletConnectModal()"
    >
        <div class="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-500 rounded-xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
        <svg class="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span class="relative">Connect Wallet</span>
    </button>
    
    <!-- Connected State -->
    <div 
        data-wallet-element="connected-container"
        class="hidden"
    >
        <button 
            data-wallet-element="connected-button"
            class="relative group flex items-center gap-3 px-4 py-2.5 bg-gray-900/90 hover:bg-gray-800/90 border border-gray-800 hover:border-gray-700 rounded-xl transition-all duration-200"
        >
            <!-- Wallet Identicon -->
            <div class="relative flex-shrink-0">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 p-[2px]">
                    <div class="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                        <svg class="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                    </div>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            
            <!-- Wallet Info -->
            <div class="text-left flex-1">
                <p 
                    data-wallet-element="balance-display" 
                    class="text-sm font-semibold text-white"
                >
                    0.0000 SOL
                </p>
                <p 
                    data-wallet-element="address-display" 
                    class="text-xs font-mono text-gray-400"
                >
                    ...
                </p>
            </div>
            
            <!-- Dropdown Arrow -->
            <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        </button>
        
        <!-- Dropdown Menu -->
        <div 
            data-wallet-element="dropdown" 
            class="hidden absolute right-0 mt-2 w-72 rounded-xl bg-gray-900/95 backdrop-blur-lg border border-gray-800 shadow-2xl overflow-hidden"
        >
            <!-- Wallet Header -->
            <div class="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-b border-gray-800">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 p-[2px]">
                        <div class="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                            <svg class="w-6 h-6 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-semibold text-white">Wallet Connected</p>
                        <p data-wallet-element="address-display-full" class="text-xs font-mono text-gray-400 truncate">...</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="bg-gray-800/50 rounded-lg p-2 text-center">
                        <p class="text-gray-400 text-xs">Balance</p>
                        <p data-wallet-element="balance-display-dropdown" class="font-semibold text-white">0.00 SOL</p>
                    </div>
                    <div class="bg-gray-800/50 rounded-lg p-2 text-center">
                        <p class="text-gray-400 text-xs">Network</p>
                        <p class="font-semibold text-green-400">Mainnet</p>
                    </div>
                </div>
            </div>
            <!-- Menu Items -->
            <div class="p-2">
                <button 
                    data-wallet-element="copy-address" 
                    class="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-800/50 transition-all flex items-center gap-3 group"
                >
                    <div class="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Copy Address</span>
                </button>
                
                <button 
                    data-wallet-element="view-explorer" 
                    class="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-800/50 transition-all flex items-center gap-3 group"
                >
                    <div class="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                    </div>
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">View on Solscan</span>
                </button>
                
                <a href="/dashboard" class="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-800/50 transition-all flex items-center gap-3 group">
                    <div class="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                    </div>
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Dashboard</span>
                </a>
                
                <div class="my-2 border-t border-gray-800"></div>
                
                <button 
                    data-wallet-element="disconnect" 
                    class="w-full text-left px-4 py-2.5 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-3 group"
                >
                    <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                        <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </div>
                    <span class="text-sm text-red-400">Disconnect Wallet</span>
                </button>
            </div>
        </div>
    </div>
</div>
