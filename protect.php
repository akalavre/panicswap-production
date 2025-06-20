<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protect Token - PanicSwap</title>
    <meta name="description" content="Add tokens to your protection list">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
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
                        },
                        secondary: {
                            50: '#f0fdfa',
                            100: '#ccfbf1',
                            200: '#99f6e4',
                            300: '#5eead4',
                            400: '#2dd4bf',
                            500: '#14b8a6',
                            600: '#0d9488',
                            700: '#0f766e',
                            800: '#115e59',
                            900: '#134e4a',
                            950: '#042f2e',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
</head>
<body class="bg-gray-950 text-gray-100 font-sans antialiased">
    <div class="noise-overlay">
        <?php include 'components/network-status.php'; ?>
        <?php include 'components/header.php'; ?>
        
        <main class="container mx-auto px-4 py-8 mt-8 max-w-4xl">
            <!-- Page Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold mb-2">Protect Your Tokens</h1>
                <p class="text-gray-400">Add tokens to automatic rug protection</p>
            </div>
            
            <!-- Protection Form -->
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
                <h2 class="text-xl font-semibold mb-6">Add Token to Protection</h2>
                
                <form id="protect-form" class="space-y-6">
                    <!-- Token Address Input -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Token Contract Address
                        </label>
                        <input 
                            type="text" 
                            id="token-address" 
                            placeholder="Enter SPL token address..."
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-100"
                        >
                        <p class="mt-2 text-sm text-gray-500">
                            Paste the contract address of the SPL token you want to protect
                        </p>
                    </div>
                    
                    <!-- Token Info Display -->
                    <div id="token-info" class="hidden bg-gray-800 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mr-3"></div>
                                <div>
                                    <div class="font-semibold" id="token-symbol">-</div>
                                    <div class="text-sm text-gray-400" id="token-name">-</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-400">Balance</div>
                                <div class="font-semibold" id="token-balance">-</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Protection Settings -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium">Protection Settings</h3>
                        
                        <!-- Exit Strategy -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Exit Strategy
                            </label>
                            <select class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-100">
                                <option value="sol">Swap to SOL (Recommended)</option>
                                <option value="usdc">Swap to USDC</option>
                                <option value="custom">Custom Token</option>
                            </select>
                        </div>
                        
                        <!-- Sensitivity -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Detection Sensitivity
                            </label>
                            <div class="flex items-center space-x-4">
                                <input type="range" id="sensitivity" min="1" max="10" value="7" class="flex-1 slider">
                                <span id="sensitivity-value" class="text-sm font-medium">7</span>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Conservative</span>
                                <span>Balanced</span>
                                <span>Aggressive</span>
                            </div>
                        </div>
                        
                        <!-- Advanced Options -->
                        <div class="bg-gray-800/50 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="font-medium">Advanced Options</span>
                                <button type="button" id="toggle-advanced" class="text-primary-400 text-sm">
                                    Show →
                                </button>
                            </div>
                            
                            <div id="advanced-options" class="hidden space-y-3">
                                <label class="flex items-center">
                                    <input type="checkbox" class="mr-3" checked>
                                    <span class="text-sm">Monitor liquidity pools</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" class="mr-3" checked>
                                    <span class="text-sm">Track dev wallet activity</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" class="mr-3">
                                    <span class="text-sm">Enable partial exits</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" class="mr-3">
                                    <span class="text-sm">Send Telegram alerts</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Submit Button -->
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-400">
                            Protection starts immediately after confirmation
                        </div>
                        <button type="submit" class="btn btn-primary px-8 py-3">
                            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                            Start Protection
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Token List -->
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-6">Your Wallet Tokens</h2>
                
                <div class="space-y-3" id="wallet-tokens">
                    <!-- Loading state -->
                    <div class="text-center py-8 text-gray-500">
                        <svg class="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading wallet tokens...
                    </div>
                </div>
            </div>
        </main>
        
        <?php include 'components/footer.php'; ?>
    </div>
    
    <!-- Protect page JavaScript -->
    <script>
        // Check wallet connection
        document.addEventListener('DOMContentLoaded', function() {
            if (!walletState.connected) {
                window.location.href = 'index.php';
            } else {
                loadWalletTokens();
            }
        });
        
        // Sensitivity slider
        const sensitivitySlider = document.getElementById('sensitivity');
        const sensitivityValue = document.getElementById('sensitivity-value');
        
        sensitivitySlider.addEventListener('input', function() {
            sensitivityValue.textContent = this.value;
        });
        
        // Toggle advanced options
        document.getElementById('toggle-advanced').addEventListener('click', function() {
            const advanced = document.getElementById('advanced-options');
            if (advanced.classList.contains('hidden')) {
                advanced.classList.remove('hidden');
                this.textContent = 'Hide ↑';
            } else {
                advanced.classList.add('hidden');
                this.textContent = 'Show →';
            }
        });
        
        // Token address input
        let tokenLookupTimeout;
        document.getElementById('token-address').addEventListener('input', function(e) {
            clearTimeout(tokenLookupTimeout);
            const address = e.target.value.trim();
            
            if (address.length > 40) {
                tokenLookupTimeout = setTimeout(() => lookupToken(address), 500);
            } else {
                document.getElementById('token-info').classList.add('hidden');
            }
        });
        
        // Lookup token info
        async function lookupToken(address) {
            try {
                // Simulate token lookup
                const tokenInfo = {
                    symbol: 'BONK',
                    name: 'Bonk Token',
                    balance: '1,234,567'
                };
                
                document.getElementById('token-symbol').textContent = tokenInfo.symbol;
                document.getElementById('token-name').textContent = tokenInfo.name;
                document.getElementById('token-balance').textContent = tokenInfo.balance;
                document.getElementById('token-info').classList.remove('hidden');
            } catch (error) {
                console.error('Token lookup error:', error);
            }
        }
        
        // Load wallet tokens
        async function loadWalletTokens() {
            const container = document.getElementById('wallet-tokens');
            
            // Simulate loading tokens
            setTimeout(() => {
                const tokens = [
                    { symbol: 'BONK', name: 'Bonk Token', balance: '1,234,567', value: '12.45' },
                    { symbol: 'WIF', name: 'dogwifhat', balance: '89,012', value: '23.78' },
                    { symbol: 'MYRO', name: 'Myro', balance: '456,789', value: '11.00' },
                    { symbol: 'POPCAT', name: 'Popcat', balance: '234,567', value: '5.67' }
                ];
                
                container.innerHTML = tokens.map(token => `
                    <div class="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors" onclick="selectToken('${token.symbol}')">
                        <div class="flex items-center">
                            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mr-3"></div>
                            <div>
                                <div class="font-semibold">${token.symbol}</div>
                                <div class="text-sm text-gray-400">${token.name}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="font-medium">${token.balance}</div>
                            <div class="text-sm text-gray-400">${token.value} SOL</div>
                        </div>
                    </div>
                `).join('');
            }, 1000);
        }
        
        // Select token from list
        function selectToken(symbol) {
            // Simulate getting token address
            const fakeAddress = 'DezXAZ8z5fxfgBZpZfvtJXchNwqfXNsRqBa7mBkz1234';
            document.getElementById('token-address').value = fakeAddress;
            lookupToken(fakeAddress);
            
            // Scroll to form
            document.getElementById('protect-form').scrollIntoView({ behavior: 'smooth' });
        }
        
        // Form submission
        document.getElementById('protect-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const tokenAddress = document.getElementById('token-address').value.trim();
            if (!tokenAddress) {
                showNotification('Please enter a token address', 'error');
                return;
            }
            
            // Simulate protection setup
            showNotification('Setting up protection...', 'info');
            
            setTimeout(() => {
                showNotification('Token protected successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.php';
                }, 1500);
            }, 2000);
        });
    </script>
    
    <script src="assets/js/main.js"></script>
</body>
</html>