<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token System Refactor Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Supabase Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/config.js"></script>
    <script src="assets/js/backend-config.js"></script>
    <script src="assets/js/supabase-client.js"></script>
    
    <!-- Token Services -->
    <script src="assets/js/unified-token-data-service.js"></script>
    <script src="assets/js/services/TokenDataManager.js"></script>
</head>
<body class="bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">Token System Refactor Test</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- V2 API Test -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4 text-green-400">V2 API Test</h2>
                <div class="space-y-2">
                    <button onclick="testV2Api()" class="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors">
                        Test Single Token
                    </button>
                    <button onclick="testV2BatchApi()" class="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors">
                        Test Batch Endpoint
                    </button>
                </div>
                <pre id="v2-result" class="mt-4 p-4 bg-gray-900 rounded text-xs overflow-auto max-h-96"></pre>
            </div>
            
            <!-- TokenDataManager Test -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4 text-blue-400">TokenDataManager Test</h2>
                <div class="space-y-2">
                    <button onclick="testTokenDataManager()" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                        Test TokenDataManager
                    </button>
                    <button onclick="testDashboardFetch()" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                        Test Dashboard Fetch
                    </button>
                </div>
                <pre id="manager-result" class="mt-4 p-4 bg-gray-900 rounded text-xs overflow-auto max-h-96"></pre>
            </div>
        </div>
        
        <!-- Performance Comparison -->
        <div class="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4 text-purple-400">Performance Comparison</h2>
            <div class="grid grid-cols-3 gap-4 mb-4">
                <button onclick="testOldSystem()" class="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors">
                    Test Old System
                </button>
                <button onclick="testNewSystem()" class="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors">
                    Test New System
                </button>
                <button onclick="comparePerformance()" class="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors">
                    Compare Both
                </button>
            </div>
            <div id="performance-result" class="grid grid-cols-2 gap-4">
                <div>
                    <h3 class="font-semibold mb-2">Old System</h3>
                    <pre id="old-perf" class="p-4 bg-gray-900 rounded text-xs"></pre>
                </div>
                <div>
                    <h3 class="font-semibold mb-2">New System</h3>
                    <pre id="new-perf" class="p-4 bg-gray-900 rounded text-xs"></pre>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Test wallet address and token mint
        const TEST_WALLET = 'So11111111111111111111111111111111111111112'; // Example wallet
        const TEST_TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
        const TEST_TOKENS = [
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'So11111111111111111111111111111111111111112', // SOL
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' // USDT
        ];
        
        // V2 API Tests
        async function testV2Api() {
            const result = document.getElementById('v2-result');
            result.textContent = 'Testing V2 API...';
            
            try {
                const start = performance.now();
                const response = await fetch(`/api/v2/tokens/${TEST_TOKEN}?wallet=${TEST_WALLET}`);
                const data = await response.json();
                const duration = performance.now() - start;
                
                result.textContent = `Response (${duration.toFixed(2)}ms):\n${JSON.stringify(data, null, 2)}`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        async function testV2BatchApi() {
            const result = document.getElementById('v2-result');
            result.textContent = 'Testing V2 Batch API...';
            
            try {
                const start = performance.now();
                const response = await fetch('/api/v2/tokens/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: TEST_WALLET, tokens: TEST_TOKENS })
                });
                const data = await response.json();
                const duration = performance.now() - start;
                
                result.textContent = `Batch Response (${duration.toFixed(2)}ms):\n${JSON.stringify(data, null, 2)}`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        // TokenDataManager Tests
        async function testTokenDataManager() {
            const result = document.getElementById('manager-result');
            result.textContent = 'Testing TokenDataManager...';
            
            if (!window.TokenDataManager) {
                result.textContent = 'TokenDataManager not loaded!';
                return;
            }
            
            try {
                const start = performance.now();
                const data = await window.TokenDataManager.getTokenData(TEST_TOKEN, TEST_WALLET);
                const duration = performance.now() - start;
                
                result.textContent = `TokenDataManager Response (${duration.toFixed(2)}ms):\n${JSON.stringify(data, null, 2)}`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        async function testDashboardFetch() {
            const result = document.getElementById('manager-result');
            result.textContent = 'Testing Dashboard Fetch...';
            
            if (!window.TokenDataManager) {
                result.textContent = 'TokenDataManager not loaded!';
                return;
            }
            
            try {
                const start = performance.now();
                const tokens = await window.TokenDataManager.fetchDashboardTokens(TEST_WALLET);
                const duration = performance.now() - start;
                
                result.textContent = `Dashboard Tokens (${duration.toFixed(2)}ms):\n${JSON.stringify(tokens, null, 2)}`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        // Performance Tests
        async function testOldSystem() {
            const result = document.getElementById('old-perf');
            result.textContent = 'Testing...';
            
            try {
                const start = performance.now();
                
                // Simulate old system with multiple API calls
                const promises = TEST_TOKENS.map(token => 
                    fetch(`/api/monitoring-status.php/${token}`)
                        .then(r => r.json())
                );
                
                await Promise.all(promises);
                const duration = performance.now() - start;
                
                result.textContent = `Old System:\n${TEST_TOKENS.length} tokens\nTime: ${duration.toFixed(2)}ms\nAvg: ${(duration/TEST_TOKENS.length).toFixed(2)}ms/token`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        async function testNewSystem() {
            const result = document.getElementById('new-perf');
            result.textContent = 'Testing...';
            
            try {
                const start = performance.now();
                
                // Use batch endpoint
                const response = await fetch('/api/v2/tokens/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: TEST_WALLET, tokens: TEST_TOKENS })
                });
                await response.json();
                const duration = performance.now() - start;
                
                result.textContent = `New System:\n${TEST_TOKENS.length} tokens\nTime: ${duration.toFixed(2)}ms\nAvg: ${(duration/TEST_TOKENS.length).toFixed(2)}ms/token`;
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            }
        }
        
        async function comparePerformance() {
            await Promise.all([testOldSystem(), testNewSystem()]);
        }
    </script>
</body>
</html>