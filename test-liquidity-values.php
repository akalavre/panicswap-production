<?php
// Test script to check liquidity values and badge states
require_once __DIR__ . '/config/supabase.php';

header('Content-Type: text/html; charset=utf-8');

$testTokens = [
    'So11111111111111111111111111111111111111112' => 'Wrapped SOL',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' => 'USDT',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' => 'USDC',
    // Add any other test tokens here
];

$walletAddress = $_GET['wallet'] ?? 'test-wallet';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Liquidity Values Test</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; }
        th { background: #333; }
        .low-liquidity { color: #ff6b6b; }
        .no-liquidity { color: #868e96; }
        .badge { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 12px;
            font-weight: bold;
        }
        .badge-RUGGED { background: #495057; color: #adb5bd; }
        .badge-WATCHING { background: #1c7ed6; color: #fff; }
        .badge-NEW { background: #7950f2; color: #fff; }
        .badge-VOLATILE { background: #fab005; color: #000; }
        .badge-PUMPING { background: #51cf66; color: #000; }
        .badge-SELL { background: #ff6b6b; color: #fff; }
        .badge-SELL_NOW { background: #ff0000; color: #fff; animation: pulse 1s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    </style>
</head>
<body>
    <h1>Token Liquidity Values and Badge States</h1>
    <p>Wallet: <?= htmlspecialchars($walletAddress) ?></p>
    
    <table>
        <thead>
            <tr>
                <th>Token</th>
                <th>Symbol</th>
                <th>Liquidity (USD)</th>
                <th>Price</th>
                <th>Badge State</th>
                <th>Reason</th>
            </tr>
        </thead>
        <tbody>
<?php
foreach ($testTokens as $mint => $name) {
    // Set up the test request
    $_SERVER['PATH_INFO'] = '/' . $mint;
    $_GET['wallet'] = $walletAddress;
    $_INCLUDED_FROM_TEST = true;
    
    // Capture the output
    ob_start();
    include __DIR__ . '/api/monitoring-status.php';
    $json = ob_get_clean();
    
    $data = json_decode($json, true);
    
    if ($data && !isset($data['error'])) {
        $liquidity = $data['liquidity']['current'] ?? 0;
        $price = $data['price']['current'] ?? 0;
        $badgeState = $data['badgeState'] ?? 'UNKNOWN';
        $symbol = $data['tokenInfo']['symbol'] ?? 'UNKNOWN';
        
        // Determine badge reason
        $reason = '';
        if ($badgeState === 'RUGGED') {
            if ($liquidity < 10) {
                $reason = 'Liquidity below $10';
            } else {
                $reason = 'Other rug indicators';
            }
        } elseif ($badgeState === 'WATCHING') {
            $reason = 'Monitoring active';
        } elseif ($badgeState === 'NEW') {
            $reason = 'Recently added';
        } elseif ($badgeState === 'VOLATILE') {
            $reason = 'High price volatility';
        } elseif ($badgeState === 'PUMPING') {
            $reason = 'Price pumping >20% in 5m';
        }
        
        $liquidityClass = '';
        if ($liquidity == 0) {
            $liquidityClass = 'no-liquidity';
        } elseif ($liquidity < 100) {
            $liquidityClass = 'low-liquidity';
        }
        
        echo "<tr>";
        echo "<td><small>" . substr($mint, 0, 8) . "...</small><br>$name</td>";
        echo "<td>$symbol</td>";
        echo "<td class='$liquidityClass'>$" . number_format($liquidity, 2) . "</td>";
        echo "<td>$" . number_format($price, 6) . "</td>";
        echo "<td><span class='badge badge-$badgeState'>$badgeState</span></td>";
        echo "<td>$reason</td>";
        echo "</tr>";
    } else {
        $error = $data['error'] ?? 'Unknown error';
        echo "<tr>";
        echo "<td colspan='6'>Error for $name: $error</td>";
        echo "</tr>";
    }
}
?>
        </tbody>
    </table>
    
    <h2>Badge State Logic Summary</h2>
    <ul>
        <li><strong>RUGGED</strong>: Liquidity < $10 (was $100) OR 95% liquidity drop from peak</li>
        <li><strong>WATCHING</strong>: Token has active monitoring/protection</li>
        <li><strong>NEW</strong>: Token added within last 5 minutes</li>
        <li><strong>VOLATILE</strong>: >10% price change in 5 minutes</li>
        <li><strong>PUMPING</strong>: >20% price increase in 5 minutes</li>
        <li><strong>SELL/SELL_NOW</strong>: Based on velocity and ML risk signals</li>
    </ul>
    
    <p style="margin-top: 20px;">
        <a href="dashboard.php" style="color: #4dabf7;">Back to Dashboard</a>
    </p>
</body>
</html>