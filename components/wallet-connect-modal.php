<!-- Wallet Connection Modal -->
<div id="wallet-connect-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="wallet-connect-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-800 max-w-md w-full overflow-hidden animate-scale-in shadow-2xl" id="wallet-connect-modal-content">
            <!-- Header -->
            <div class="relative overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border-b border-gray-800">
                <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent"></div>
                <div class="relative flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-white">Connect Wallet</h3>
                        <p class="text-sm text-gray-400 mt-1">Choose your preferred wallet provider</p>
                    </div>
                    <button onclick="closeWalletConnectModal()" class="w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center transition-colors group">
                        <svg class="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <!-- Status Component for WalletState events -->
                <div id="wallet-connect-status" class="hidden mb-4">
                    <!-- Loading state -->
                    <div id="wallet-connecting-status" class="hidden bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div class="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-40 animate-pulse"></div>
                                <div class="relative w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <svg class="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold text-white">Connecting wallet...</p>
                                <p class="text-sm text-gray-400">Approve the connection in your wallet</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Success state -->
                    <div id="wallet-success-status" class="hidden bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div class="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-40"></div>
                                <div class="relative w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold text-white">Connected successfully!</p>
                                <p class="text-sm text-gray-400">Redirecting to dashboard...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Error state -->
                    <div id="wallet-error-status" class="hidden bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4">
                        <div class="flex items-start gap-3">
                            <div class="relative flex-shrink-0">
                                <div class="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-40"></div>
                                <div class="relative w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold text-white">Connection failed</p>
                                <p id="wallet-error-message" class="text-sm text-gray-400 mt-1"></p>
                                <button onclick="retryConnection()" class="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]">
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Wallet Options -->
                <div id="wallet-options" class="space-y-4">
                    <!-- Popular Wallets -->
                    <div class="space-y-3">
                        <button onclick="connectBrowserWallet('phantom')" 
                                class="w-full relative group bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700 hover:border-primary-500/50 rounded-xl p-4 transition-all duration-200 overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div class="relative flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-[#534BB1] flex items-center justify-center">
                                    <img src="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/phantom/src/icon.svg" 
                                         width="28" height="28" alt="Phantom" class="filter brightness-0 invert"
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9IiM1MzRCQjEiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNC4wMjkxIDU4LjYyOTFDMjQuMDM5MSA3MS41NzMyIDMxLjkzNzQgODguMDYwOCA0NS44NzU2IDkzLjc3NzdDNTEuMjc0NCA5NS44ODkzIDU3LjQ0OTMgOTUuMjg4MyA2Mi42MDcgOTMuMTYzN0M2OS4wMjgxIDkwLjUyNjggNzMuNzg5NCA4NC42Njg0IDc3LjE3MjcgNzcuNTU2MUM3OS44NzY5IDcxLjc5MTkgODEuNTA2OCA2NS41NjAzIDgyLjAyODYgNTkuMTA0OEM4Mi4xNDUxIDU3LjYwNDcgODIuMTc1MSA1NC45MTAyIDgyLjE1NTkgNTQuNjUxOUM4Mi4wMTUxIDUyLjU5MjcgODEuODcwOCA1MC4wMjI5IDgxLjY0MDEgNDcuOTY2NUM4MC43MjE0IDM5LjQ0MDUgNzcuNzcyMSAzMS4xNjg5IDczLjIyMDcgMjQuMDI5MUM2OC43MzY0IDE3LjAwNzQgNjIuODEwOSAxMS4yMzk2IDU1Ljk1NTcgNy4xODg1NUM1MC41OTYxIDQuMDM4NDkgNDQuNjE3NCAyLjA3MjgzIDM4LjU5MDggMi4wMDQ3NkMzNy4yMTA5IDEuOTg5NDcgMzUuODI4MiAyLjAwNDc2IDM0LjQ0ODggMi4wNDk5N0MzMi41MDY0IDIuMTEzNTMgMzAuMTAzNyAyLjU5NTc1IDI4LjEwODkgMy41MzA0N0MyNS4xMjY1IDQuOTI3NDMgMjIuOTM5OCA3LjQ0NDExIDIxLjcxNjMgMTAuNzAyNEMyMC44MzkzIDEzLjA0ODQgMjAuNDI1IDE1LjYzNjkgMjAuNDkxOCAxOC4yMjc4QzIwLjU0OTggMjAuNDg0NiAyMC45MDQ5IDIyLjc0MDggMjEuNTQ0OSAyNC45MTdDMjIuMjI1NSAyNy4yMTc5IDIzLjIxOTMgMjkuNDAxOSAyNC40ODY5IDMxLjQwMDJDMjYuNzQ5OCAzNS4wODk2IDI5LjU5NTUgMzYuNjE1MSAzMi42MzA4IDM2LjY1MjZDMzQuNzI4OSAzNi42NzkxIDM2LjgxNzIgMzYuMTA1NiAzOC42MjQgMzUuMDA3NkM0MC44MDE5IDMzLjY2MzQgNDIuNDY1MSAzMS41Njk5IDQzLjMzNzcgMjkuMDk2MkM0My43Mzg4IDI4LjAwMzQgNDMuOTk5MSAyNi44NTgzIDQ0LjExMDcgMjUuNjkyNkM0NC4yMTY0IDI0LjU5MDggNDQuMDg5MSAyMy40NzY5IDQzLjczNjQgMjIuNDI2NUM0My4yNjEgMjEuMDA5OCA0Mi40MDM4IDIwLjE1MTcgNDEuMTE2NCAxOS40MDgxQzM5LjUzNzUgMTguNDk3NSAzNy43MzcyIDE4LjEyNDQgMzUuOTM4IDE4LjMzNDRDMzQuNDk2NyAxOC41MDQ1IDMzLjM1OTMgMTkuMzMxNiAzMi41NzI0IDIwLjMzNjFDMzEuODcyMiAyMS4yMjg5IDMxLjQyMjQgMjIuMjkwNSAzMS4yNjQ0IDIzLjQxOTNDMzEuMDk2NiAyNC42MjMxIDMxLjI0NDMgMjUuODU0OCAzMS42OTYxIDI2Ljk4MjJDMzIuNTc4MiAyOS4xNTc4IDM0LjQ4ODcgMzAuODE2NCAzNi43MjA2IDMxLjM3NzZDMzcuODM3MiAzMS42NTg0IDM5LjAwNTEgMzEuNzE1NiA0MC4xNjEzIDMxLjU0NkM0MS4zNTc1IDMxLjM3MDkgNDIuNTI2MiAzMC45NTMyIDQzLjU5MDYgMzAuMzE5NUM0NS42MzM3IDI5LjA5MjkgNDcuMjkxMSAyNy4yMjcgNDguMzI2NyAyNS4wMTYzQzQ5LjAzMDEgMjMuNDg4NCA0OS40NDgzIDIxLjgyOTcgNDkuNTU1OSAyMC4xMzU0QzQ5LjcxNjMgMTcuNTQxNSA0OS4wMzI0IDE1LjA4IDQ3LjQ1MjUgMTIuODM4N0M0NS42Mjc2IDEwLjI2MSA0Mi43MjE2IDguMzY3NTQgMzkuNTM0IDcuNTUzNTNDMzcuMDk0NyA2LjkyMTk1IDM0LjUyNDUgNi44MjQxMSAzMi4wMzg2IDcuMjY2OTVDMjkuMzkzNSA3LjczODQgMjYuOTAxNyA4LjgyODMzIDI0Ljc2NDYgMTAuNDMyOUMyMi4yNDI0IDEyLjMwODkgMjAuMjQ3NSAxNC43ODQ0IDE4LjkzNTggMTcuNjY1NUMxNy41NjI3IDIwLjY5NDMgMTYuOTEzMiAyNC4wMjkxIDE3LjA0ODEgMjcuNDEyN0MxNy4xODUzIDMwLjg1MDQgMTguMTA4OCAzNC4yMjE1IDE5LjczNTMgMzcuMjE4MkMyMS42MjAzIDQwLjY5MDQgMjQuMjE0MSA0My41MDM1IDI3LjMyNzMgNDUuNDQ0OEMyOC42NTgyIDQ2LjI3OTUgMzAuMDczMSA0Ni45MDY4IDMxLjU0MzcgNDcuMzA3MkMzMi40Njg1IDQ3LjU1MjQgMzMuNDEwNyA0Ny43MjE1IDM0LjM2MDQgNDcuODEyNkMzNC40NDk2IDQ3LjgyMjMgMzQuNjI5MSA0Ny44NDMyIDM0LjYyOTEgNDcuODcxNVY1NS4yMjc0QzM0LjYyOTEgNTUuMjI3OSAzNC42MjkxIDU1LjIyODQgMzQuNjI5MSA1NS4yMjg5QzM0LjYyOTEgNTYuMTUzMyAzNC42MjkxIDU3LjA3NzcgMzQuNjI5MSA1OC4wMDIxQzM0LjYyOTEgNTguMTEzNCAzNC41Mzk2IDU4LjIyNDYgMzQuNDI0MiA1OC4yMjQ2QzMzLjc3MTcgNTguMjI0NiAzMy4xMTkyIDU4LjIyNDYgMzIuNDY2NyA1OC4yMjQ2QzMyLjM1NjYgNTguMjI0NiAzMi4yNDU0IDU4LjEzNTEgMzIuMjQ1NCA1OC4wMTk3VjQ4LjM2MjVDMzIuMjQ1NCA0OC4yNDY5IDMyLjE1NTggNDguMTU3NCAzMi4wNDAyIDQ4LjE1NzRDMzEuMzI0OCA0OC4xNTc0IDMwLjYwOTMgNDguMTU3NCAyOS44OTM5IDQ4LjE1NzRDMjkuNzc4MyA0OC4xNTc0IDI5LjY4ODcgNDguMjQ2OSAyOS42ODg3IDQ4LjM2MjVWNTguMDAyMUMyOS42ODg3IDU4LjExNzcgMjkuNTk5MiA1OC4yMDczIDI5LjQ4MzYgNTguMjA3M0MyOC44MzEgNTguMjA3MyAyOC4xNzg1IDU4LjIwNzMgMjcuNTI2IDU4LjIwNzNDMjcuNDEwNCA1OC4yMDczIDI3LjMyMDggNTguMTE3NyAyNy4zMjA4IDU4LjAwMjFWNDcuNjQ0N0MyNy4zMjA4IDQ3LjQ1NDggMjcuMjY3IDQ3LjQxNjkgMjcuMDg2OCA0Ny4zNzc1QzI2LjIyMzMgNDcuMTkyIDI1LjM4MzEgNDYuODkxNyAyNC41OTE5IDQ2LjQ4NDlDMjQuMDI3NCA0Ni4xOTI4IDI0LjAyNDkgNDUuOTg5OSAyNC4wMjQ5IDQ1LjM3NDFWNDUuMDQ0MUMyNC4wMjQ5IDQ1LjA0MzMgMjQuMDI0OSA1NS4yNTYxIDI0LjAyOTEgNTguNjI5MVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='">
                                </div>
                                <div class="flex-1 text-left">
                                    <p class="font-semibold text-white">Phantom</p>
                                    <p class="text-xs text-gray-400">Most popular Solana wallet</p>
                                </div>
                                <div class="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </button>
                        
                        <button onclick="connectBrowserWallet('solflare')" 
                                class="w-full relative group bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700 hover:border-primary-500/50 rounded-xl p-4 transition-all duration-200 overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div class="relative flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                    <img src="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/solflare/src/icon.svg" 
                                         width="28" height="28" alt="Solflare" class="filter brightness-0 invert"
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTEgMTVsLTUtNSAxLjQxLTEuNDFMMTEgMTQuMTdsNy41OS03LjU5TDIwIDhsLTkgOXoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg=='">
                                </div>
                                <div class="flex-1 text-left">
                                    <p class="font-semibold text-white">Solflare</p>
                                    <p class="text-xs text-gray-400">Built for DeFi & NFTs</p>
                                </div>
                                <div class="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </button>
                        
                        <button onclick="connectBrowserWallet('backpack')" 
                                class="w-full relative group bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700 hover:border-primary-500/50 rounded-xl p-4 transition-all duration-200 overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div class="relative flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-[#E93A3A] flex items-center justify-center">
                                    <img src="https://raw.githubusercontent.com/coral-xyz/backpack/master/assets/backpack.svg" 
                                         width="28" height="28" alt="Backpack" class="filter brightness-0 invert"
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iI0U5M0EzQSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE5Ljk5OTggNEMxOC4wMTA4IDQgMTYuMTAzMiA0Ljc5MDg2IDE0LjY5NjMgNi4xOTc3MkMxMy4yODk1IDcuNjA0NTggMTIuNDk4NiA5LjUxMjI1IDEyLjQ5ODYgMTEuNTAxMlYyNS41MDEyQzEyLjQ5ODYgMjcuNDkwMSAxMy4yODk1IDI5LjM5NzggMTQuNjk2MyAzMC44MDQ3QzE2LjEwMzIgMzIuMjExNSAxOC4wMTA4IDMzLjAwMjQgMTkuOTk5OCAzMy4wMDI0QzIxLjk4ODcgMzMuMDAyNCAyMy44OTY0IDMyLjIxMTUgMjUuMzAzMiAzMC44MDQ3QzI2LjcxMDEgMjkuMzk3OCAyNy41MDA5IDI3LjQ5MDEgMjcuNTAwOSAyNS41MDEyVjExLjUwMTJDMjcuNTAwOSA5LjUxMjI1IDI2LjcxMDEgNy42MDQ1OCAyNS4zMDMyIDYuMTk3NzJDMjMuODk2NCA0Ljc5MDg2IDIxLjk4ODcgNCAxOS45OTk4IDRaTTI1LjAwMDYgMTEuNTAxMlYxOC4wMDEySDIyLjUwMDRWMTYuNTAxQzIyLjUwMDQgMTUuNjczIDIxLjgyODQgMTUuMDAxIDIxLjAwMDMgMTUuMDAxQzIwLjE3MjMgMTUuMDAxIDE5LjUwMDMgMTUuNjczIDE5LjUwMDMgMTYuNTAxVjE4LjAwMTJIMTcuNTAwMVYxNi41MDFDMTcuNTAwMSAxNS42NzMgMTYuODI4MSAxNS4wMDEgMTYuMDAwMSAxNS4wMDFDMTUuMTcyIDE1LjAwMSAxNC41IDE1LjY3MyAxNC41IDE2LjUwMVYyMS4wMDEyQzE0LjUgMjMuMjEwNCAxNi4yOTA5IDI1LjAwMTMgMTguNTAwMSAyNS4wMDEzSDIxLjUwMDNDMjMuNzA5NSAyNS4wMDEzIDI1LjUwMDMgMjMuMjEwNCAyNS41MDAzIDIxLjAwMTJDMjUuNTAwMyAyMC44NjQ5IDI1LjQ5MDYgMjAuNzMxMSAyNS40NzIgMjAuNjAwMUMyNS4zODI0IDIwLjI2NzcgMjUuMTk0IDE5Ljk2NjQgMjQuOTM0IDE5LjczMzVDMjQuODkyOSAxOS42OTY0IDI0Ljg0OSAxOS42NjIzIDI0LjgwMjcgMTkuNjMxMUMyNC43MDczIDE5LjU2NjQgMjQuNjAyMiAxOS41MTQgMjQuNDg5NCAxOS40NzY1QzI0LjU1MzkgMTkuMzA5MyAyNC42MjEgMTkuMTQyOSAyNC42OTExIDE4Ljk3NzZDMjQuODg1NyAxOC41MjQ1IDI1LjAwMDYgMTguMDI0NCAyNS4wMDA2IDE3LjUwMTJWMTEuNTAxMloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='">
                                </div>
                                <div class="flex-1 text-left">
                                    <p class="font-semibold text-white">Backpack</p>
                                    <p class="text-xs text-gray-400">Built-in xNFT support</p>
                                </div>
                                <div class="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>
                    
                    <div class="relative my-6">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-800"></div>
                        </div>
                        <div class="relative flex justify-center text-xs uppercase">
                            <span class="bg-gray-900 px-4 text-gray-400">Don't see your wallet?</span>
                        </div>
                    </div>
                    
                    <p class="text-center text-sm text-gray-400">
                        We support all Solana wallets. Make sure your wallet extension is installed and unlocked.
                    </p>
                </div>
                
                
            </div>
        </div>
    </div>
</div>

<script>
// Modal functions - explicitly make them global
window.openWalletConnectModal = function() {
    const modal = document.getElementById('wallet-connect-modal');
    if (!modal) {
        console.error('Wallet connect modal not found');
        return;
    }
    modal.classList.remove('hidden');
    // Add animation
    setTimeout(() => {
        const scaleElement = modal.querySelector('.animate-scale-in');
        if (scaleElement) {
            scaleElement.classList.add('scale-100');
        }
    }, 10);
}

window.closeWalletConnectModal = function() {
    // Allow closing modal - users can now access dashboard without wallet connection
    // They can connect wallets later when they want to use specific features
    
    const modal = document.getElementById('wallet-connect-modal');
    if (!modal) {
        console.error('Wallet connect modal not found');
        return;
    }
    const scaleElement = modal.querySelector('.animate-scale-in');
    if (scaleElement) {
        scaleElement.classList.remove('scale-100');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}


window.connectBrowserWallet = async function(walletType) {
    // Store attempted wallet type for retry functionality
    if (window.walletConnectStatusManager) {
        window.walletConnectStatusManager.setLastAttemptedWalletType(walletType);
    }
    
    // Use WalletState for connection
    try {
        if (!window.walletState) {
            showNotification('Wallet system not ready. Please refresh the page.', 'error');
            return;
        }
        
        // Use WalletState to connect browser wallet
        await window.walletState.connect(walletType);
        
    } catch (error) {
        console.error('Wallet connection failed:', error);
        
        // Show user-friendly error messages
        let errorMessage = 'Failed to connect wallet.';
        if (error.message.includes('not found')) {
            errorMessage = `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet not found. Please install it first.`;
        } else if (error.message.includes('User rejected')) {
            errorMessage = 'Connection rejected by user.';
        }
        
        if (window.walletConnectStatusManager) {
            window.walletConnectStatusManager.showErrorState(errorMessage);
        } else {
            showNotification(errorMessage, 'error');
        }
    }
}

// Use global showNotification function from main.js

// Backdrop click to cancel - only close if clicked directly on backdrop
const backdrop = document.getElementById('wallet-connect-backdrop');
const modalContent = document.getElementById('wallet-connect-modal-content');

// Close on backdrop click only if clicking directly on backdrop
if (backdrop) {
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            closeWalletConnectModal();
        }
    });
}

// Stop propagation on modal content to avoid accidental cancel
if (modalContent) {
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('wallet-connect-modal').classList.contains('hidden')) {
        closeWalletConnectModal();
    }
});

// WalletState Status Manager Component
class WalletConnectStatusManager {
    constructor() {
        this.statusContainer = document.getElementById('wallet-connect-status');
        this.connectingStatus = document.getElementById('wallet-connecting-status');
        this.successStatus = document.getElementById('wallet-success-status');
        this.errorStatus = document.getElementById('wallet-error-status');
        this.errorMessage = document.getElementById('wallet-error-message');
        this.walletOptions = document.getElementById('wallet-options');
        this.browserWalletSelection = document.getElementById('browser-wallet-selection');
        
        this.lastAttemptedWalletType = null;
        
        // Bind methods
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleError = this.handleError.bind(this);
        
        // Initialize if WalletState is ready
        this.initialize();
    }
    
    initialize() {
        // Wait for WalletState to be available
        if (window.walletState) {
            this.setupEventListeners();
        } else {
            // Check every 100ms until WalletState is available
            const checkInterval = setInterval(() => {
                if (window.walletState) {
                    clearInterval(checkInterval);
                    this.setupEventListeners();
                }
            }, 100);
        }
    }
    
    setupEventListeners() {
        // Listen to WalletState events
        window.walletState.on('change', this.handleStateChange);
        window.walletState.on('error', this.handleError);
    }
    
    handleStateChange(state) {
        console.log('WalletConnectModal: WalletState changed:', state);
        
        switch (state.status) {
            case 'connecting':
                this.showConnectingState();
                break;
            case 'connected':
                this.showSuccessState(state);
                break;
            case 'error':
                this.showErrorState('Connection failed. Please try again.');
                break;
            case 'disconnected':
                this.hideAllStates();
                break;
            default:
                this.hideAllStates();
        }
    }
    
    handleError(error) {
        console.error('WalletConnectModal: WalletState error:', error);
        this.showErrorState(error.message || 'An unexpected error occurred');
    }
    
    showConnectingState() {
        // Hide wallet options and show connecting status
        this.walletOptions.style.display = 'none';
        this.browserWalletSelection.style.display = 'none';
        
        // Disable all wallet buttons
        this.disableWalletButtons(true);
        
        // Show status container and connecting state
        this.statusContainer.classList.remove('hidden');
        this.hideAllStatusStates();
        this.connectingStatus.classList.remove('hidden');
    }
    
    showSuccessState(state) {
        // Show success status
        this.hideAllStatusStates();
        this.successStatus.classList.remove('hidden');
        
        // Auto-close modal after successful connection
        setTimeout(() => {
            closeWalletConnectModal();
            
            // Redirect to dashboard if not already there
            if (!window.location.pathname.includes('dashboard.php')) {
                setTimeout(() => {
                    window.location.href = 'dashboard.php';
                }, 500);
            }
        }, 2000);
    }
    
    showErrorState(message) {
        // Show error status with message
        this.hideAllStatusStates();
        this.errorStatus.classList.remove('hidden');
        this.errorMessage.textContent = message;
        
        // Re-enable wallet options after error
        setTimeout(() => {
            this.walletOptions.style.display = '';
            this.disableWalletButtons(false);
        }, 1000);
    }
    
    hideAllStates() {
        this.statusContainer.classList.add('hidden');
        this.walletOptions.style.display = '';
        this.disableWalletButtons(false);
    }
    
    hideAllStatusStates() {
        this.connectingStatus.classList.add('hidden');
        this.successStatus.classList.add('hidden');
        this.errorStatus.classList.add('hidden');
    }
    
    disableWalletButtons(disabled) {
        // Disable/enable all wallet connection buttons
        const buttons = document.querySelectorAll('#wallet-options button, #browser-wallet-selection button');
        buttons.forEach(button => {
            button.disabled = disabled;
            if (disabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            } else {
                button.style.opacity = '';
                button.style.cursor = '';
            }
        });
    }
    
    // Store the last attempted wallet type for retry functionality
    setLastAttemptedWalletType(walletType) {
        this.lastAttemptedWalletType = walletType;
    }
}

// Initialize the status manager when DOM is ready
let walletConnectStatusManager;

// Function to initialize status manager
function initializeStatusManager() {
    if (!walletConnectStatusManager) {
        walletConnectStatusManager = new WalletConnectStatusManager();
        // Make it globally available
        window.walletConnectStatusManager = walletConnectStatusManager;
    }
}

// Initialize based on DOM ready state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStatusManager);
} else {
    initializeStatusManager();
}

// Retry connection function for error state
window.retryConnection = function() {
    if (walletConnectStatusManager && walletConnectStatusManager.lastAttemptedWalletType) {
        window.connectBrowserWallet(walletConnectStatusManager.lastAttemptedWalletType);
    } else {
        // Reset to wallet options if no previous attempt
        walletConnectStatusManager.hideAllStates();
    }
}

</script>
