<?php
// Test script to debug liquidity values

// Load environment variables
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Get test tokens from the dashboard
$testTokens = [
    'Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1',  // USDC-USDT
    'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
    '6CNHDCzD5RkvBWxxyokQQNQPJgjjfWvyb3e8txchtGEV'  // Sample pump token
];

?>
<!DOCTYPE html>
<html>
<head>
    <title>Liquidity Debug Test</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .token { margin: 20px 0; padding: 20px; border: 1px solid #333; background: #222; }
        .low-liquidity { background: #3a2020; border-color: #a00; }
        .good-liquidity { background: #203a20; border-color: #0a0; }
        .data { margin: 10px 0; }
        .label { color: #888; }
        .value { color: #0ff; }
        .error { color: #f00; }
    </style>
</head>
<body>
    <h1>Liquidity Debug Test</h1>
    
    <?php foreach ($testTokens as $tokenMint): ?>
        <div class="token" id="token-<?php echo $tokenMint; ?>">
            <h3><?php echo $tokenMint; ?></h3>
            <div class="data">Fetching...</div>
        </div>
    <?php endforeach; ?>

    <script>
        async function testToken(tokenMint) {
            const container = document.getElementById(`token-${tokenMint}`);
            const dataDiv = container.querySelector('.data');
            
            try {
                // Test the monitoring-status API
                const response = await fetch(`api/monitoring-status/${tokenMint}`);
                const data = await response.json();
                
                console.log(`Data for ${tokenMint}:`, data);
                
                // Extract liquidity values
                const currentLiquidity = data.liquidity?.current || 0;
                const liquidityFromStats = data.stats?.current_liquidity || 0;
                const liquidityFromVelocity = data.velocity?.liquidity_usd || 0;
                const liquidityFromPrice = data.price?.liquidity || 0;
                
                // Check if token would be marked as RUGGED
                const wouldBeRugged = currentLiquidity < 100;
                
                if (wouldBeRugged) {
                    container.classList.add('low-liquidity');
                } else {
                    container.classList.add('good-liquidity');
                }
                
                dataDiv.innerHTML = `
                    <div><span class="label">Symbol:</span> <span class="value">${data.tokenInfo?.symbol || 'UNKNOWN'}</span></div>
                    <div><span class="label">Name:</span> <span class="value">${data.tokenInfo?.name || 'Unknown'}</span></div>
                    <div><span class="label">Badge State:</span> <span class="value">${data.badgeState || 'null'}</span></div>
                    <div><span class="label">Current Liquidity:</span> <span class="value">$${currentLiquidity.toFixed(2)}</span></div>
                    <div><span class="label">Would be RUGGED:</span> <span class="value ${wouldBeRugged ? 'error' : ''}">${wouldBeRugged ? 'YES' : 'NO'}</span></div>
                    <hr style="border-color: #444; margin: 10px 0;">
                    <div><span class="label">Liquidity Sources:</span></div>
                    <div style="margin-left: 20px;">
                        <div><span class="label">data.liquidity.current:</span> <span class="value">$${currentLiquidity.toFixed(2)}</span></div>
                        <div><span class="label">stats.current_liquidity:</span> <span class="value">$${liquidityFromStats.toFixed(2)}</span></div>
                        <div><span class="label">velocity.liquidity_usd:</span> <span class="value">$${liquidityFromVelocity.toFixed(2)}</span></div>
                        <div><span class="label">price.liquidity:</span> <span class="value">$${liquidityFromPrice.toFixed(2)}</span></div>
                    </div>
                    <hr style="border-color: #444; margin: 10px 0;">
                    <div><span class="label">Price:</span> <span class="value">$${data.price?.current || 0}</span></div>
                    <div><span class="label">Market Cap:</span> <span class="value">$${(data.marketData?.marketCap || 0).toLocaleString()}</span></div>
                    <div><span class="label">Source:</span> <span class="value">${data.source || 'unknown'}</span></div>
                `;
                
            } catch (error) {
                dataDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
                console.error(`Error testing ${tokenMint}:`, error);
            }
        }
        
        // Test all tokens
        <?php foreach ($testTokens as $tokenMint): ?>
        testToken('<?php echo $tokenMint; ?>');
        <?php endforeach; ?>
    </script>
</body>
</html>