<?php
require_once 'config/supabase.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Token Display</title>
    <style>
        body { 
            background: #0a0a0a; 
            color: #fff; 
            font-family: Arial, sans-serif; 
            padding: 20px; 
        }
        .token-item {
            background: #1a1a1a;
            border: 1px solid #333;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
        }
        .success { color: #4f4; }
        .error { color: #f44; }
        .info { color: #44f; }
        button {
            background: #333;
            color: #fff;
            border: 1px solid #666;
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            border-radius: 4px;
        }
        button:hover {
            background: #444;
        }
    </style>
    <!-- Include Supabase -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="assets/js/config.js"></script>
    <script src="assets/js/backend-config.js"></script>
    <script src="assets/js/supabase-client.js"></script>
    <script src="assets/js/wallet-state.js"></script>
    <script src="assets/js/unified-token-data-service.js"></script>
    <script src="assets/js/supabase-token-fetcher.js"></script>
</head>
<body>
    <h1>Token Display Test</h1>
    
    <div>
        <button onclick="setTestWallet()">Set Test Wallet</button>
        <button onclick="loadTokens()">Load Tokens</button>
        <button onclick="testMonitoringAPI()">Test Monitoring API</button>
    </div>
    
    <div id="wallet-info" style="margin: 20px 0; padding: 10px; background: #222;">
        <h3>Wallet Info</h3>
        <div id="wallet-details"></div>
    </div>
    
    <div id="token-list" style="margin-top: 20px;">
        <h3>Tokens</h3>
        <div id="tokens-container"></div>
    </div>
    
    <div id="api-test" style="margin-top: 20px;">
        <h3>API Test Results</h3>
        <div id="api-results"></div>
    </div>

    <script>
        // Display wallet info
        function updateWalletInfo() {
            const walletDiv = document.getElementById('wallet-details');
            const walletAddress = localStorage.getItem('walletAddress');
            const walletType = localStorage.getItem('walletType');
            
            if (walletAddress) {
                walletDiv.innerHTML = `
                    <div class="success">Wallet Connected</div>
                    <div>Address: ${walletAddress}</div>
                    <div>Type: ${walletType || 'Unknown'}</div>
                `;
                
                if (window.walletState) {
                    const state = window.walletState.getState();
                    walletDiv.innerHTML += `<div>WalletState: ${JSON.stringify(state)}</div>`;
                }
            } else {
                walletDiv.innerHTML = '<div class="error">No wallet connected</div>';
            }
        }

        // Set a test wallet
        function setTestWallet() {
            const testAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
            localStorage.setItem('walletAddress', testAddress);
            localStorage.setItem('walletType', 'phantom');
            
            if (window.walletState && window.walletState._updateState) {
                window.walletState._updateState({
                    connected: true,
                    address: testAddress
                });
            }
            
            updateWalletInfo();
            alert('Test wallet set. Now click "Load Tokens"');
        }

        // Load tokens using SupabaseTokenFetcher
        async function loadTokens() {
            const container = document.getElementById('tokens-container');
            container.innerHTML = '<div class="info">Loading tokens...</div>';
            
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) {
                container.innerHTML = '<div class="error">Please set a wallet first</div>';
                return;
            }
            
            try {
                // Wait for Supabase to be ready
                if (!window.SupabaseTokenFetcher) {
                    throw new Error('SupabaseTokenFetcher not loaded');
                }
                
                const tokens = await window.SupabaseTokenFetcher.fetchDashboardTokens(walletAddress);
                
                if (tokens.length === 0) {
                    container.innerHTML = '<div class="error">No tokens found</div>';
                    return;
                }
                
                container.innerHTML = `<div class="success">Found ${tokens.length} tokens</div>`;
                
                tokens.forEach(token => {
                    const tokenDiv = document.createElement('div');
                    tokenDiv.className = 'token-item';
                    tokenDiv.innerHTML = `
                        <div><strong>${token.symbol || 'UNKNOWN'}</strong> - ${token.name || 'Unknown Token'}</div>
                        <div>Mint: ${token.token_mint}</div>
                        <div>Balance: ${token.balance_ui || 0}</div>
                        <div>Price: $${token.price || 0}</div>
                        <div>Value: $${token.value || 0}</div>
                        <div>Liquidity: $${token.liquidity || 0}</div>
                        <div>Protected: ${token.protected ? 'YES' : 'NO'}</div>
                        <button onclick="testTokenAPI('${token.token_mint}')">Test API</button>
                    `;
                    container.appendChild(tokenDiv);
                });
            } catch (error) {
                container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
                console.error('Load tokens error:', error);
            }
        }

        // Test monitoring API for specific token
        async function testTokenAPI(tokenMint) {
            const resultsDiv = document.getElementById('api-results');
            const walletAddress = localStorage.getItem('walletAddress');
            
            resultsDiv.innerHTML = `<div class="info">Testing API for ${tokenMint}...</div>`;
            
            try {
                const data = await window.getTokenData(tokenMint, walletAddress);
                resultsDiv.innerHTML = `
                    <div class="success">API Success</div>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                `;
            } catch (error) {
                resultsDiv.innerHTML = `<div class="error">API Error: ${error.message}</div>`;
            }
        }

        // Test monitoring API with a known token
        async function testMonitoringAPI() {
            const resultsDiv = document.getElementById('api-results');
            const testToken = 'A7m1dVCw1PXKxZTk8DJDQqUQAERTgWDhzGwVQp8apump';
            const walletAddress = localStorage.getItem('walletAddress') || '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
            
            resultsDiv.innerHTML = '<div class="info">Testing monitoring API...</div>';
            
            const url = `api/monitoring-status/${testToken}?wallet=${walletAddress}`;
            
            try {
                const response = await fetch(url);
                const text = await response.text();
                
                if (!response.ok) {
                    resultsDiv.innerHTML += `<div class="error">HTTP ${response.status}</div>`;
                    resultsDiv.innerHTML += `<pre>${text}</pre>`;
                    return;
                }
                
                const data = JSON.parse(text);
                resultsDiv.innerHTML = `
                    <div class="success">API Success</div>
                    <div>Token: ${data.tokenInfo.symbol} (${data.tokenInfo.name})</div>
                    <div>Price: $${data.price.current}</div>
                    <div>Liquidity: $${data.liquidity.current}</div>
                    <div>Monitoring: ${data.monitoring.active ? 'Active' : 'Inactive'}</div>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                `;
            } catch (error) {
                resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        }

        // Initialize on load
        window.addEventListener('load', () => {
            updateWalletInfo();
        });
    </script>
</body>
</html>