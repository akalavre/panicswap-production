<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Payment System - PanicSwap</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
    
    <style>
        body {
            background: #0a0a0a;
        }
    </style>
</head>
<body class="bg-black text-gray-100">
    <div class="container mx-auto px-4 py-16 max-w-4xl">
        <h1 class="text-3xl font-bold mb-8">Payment System Test</h1>
        
        <!-- Test Controls -->
        <div class="mb-8 p-6 rounded-lg bg-gray-900 border border-gray-800">
            <h2 class="text-xl font-semibold mb-4">Test Payment Flow</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onclick="openPaymentModal('pro', 0.99, 161.04)" class="p-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all">
                    Test Pro Plan<br>
                    <span class="text-sm opacity-80">$40.26/week</span>
                </button>
                
                <button onclick="openPaymentModal('degen', 1.99, 323.63)" class="p-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all">
                    Test Degen Mode<br>
                    <span class="text-sm opacity-80">$80.91/week</span>
                </button>
                
                <button onclick="openPaymentModal('enterprise', 2.99, 486.12)" class="p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all">
                    Test Enterprise<br>
                    <span class="text-sm opacity-80">$121.53/week</span>
                </button>
            </div>
        </div>
        
        <!-- Wallet Status -->
        <div class="mb-8 p-6 rounded-lg bg-gray-900 border border-gray-800">
            <h2 class="text-xl font-semibold mb-4">Wallet Status</h2>
            <div id="wallet-info">
                <p class="text-gray-400">No wallet connected</p>
            </div>
        </div>
        
        <!-- Test Results -->
        <div class="p-6 rounded-lg bg-gray-900 border border-gray-800">
            <h2 class="text-xl font-semibold mb-4">Console Output</h2>
            <pre id="console-output" class="text-xs font-mono text-gray-400 overflow-x-auto">
Waiting for actions...
            </pre>
        </div>
    </div>
    
    <!-- Payment Modal -->
    <?php include 'components/payment-modal.php'; ?>
    
    <!-- Scripts -->
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/payment.js"></script>
    
    <script>
        // Override console.log to show in test output
        const output = document.getElementById('console-output');
        const originalLog = console.log;
        console.log = function(...args) {
            originalLog.apply(console, args);
            output.textContent += '\n' + new Date().toLocaleTimeString() + ' - ' + args.join(' ');
            output.scrollTop = output.scrollHeight;
        };
        
        // Monitor wallet status
        if (typeof WalletAdapter !== 'undefined') {
            const adapter = new WalletAdapter();
            adapter.on('connect', ({ publicKey }) => {
                document.getElementById('wallet-info').innerHTML = `
                    <p class="text-green-400 font-semibold">Wallet Connected!</p>
                    <p class="text-sm text-gray-300 mt-1">Address: ${publicKey}</p>
                `;
            });
            
            adapter.on('disconnect', () => {
                document.getElementById('wallet-info').innerHTML = `
                    <p class="text-gray-400">No wallet connected</p>
                `;
            });
        }
        
        console.log('Payment test page loaded');
    </script>
</body>
</html>