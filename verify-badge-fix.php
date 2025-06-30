<?php
require_once __DIR__ . '/config/supabase.php';

// Test wallet address
$walletAddress = $_GET['wallet'] ?? 'test-wallet';

// Test tokens that might have liquidity issues
$testMints = [
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
];

// Add any custom mint from query parameter
if (isset($_GET['mint'])) {
    array_unshift($testMints, $_GET['mint']);
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Verify Badge Fix</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white p-8">
    <h1 class="text-2xl font-bold mb-6">Badge State Verification</h1>
    <p class="mb-4">Testing wallet: <?= htmlspecialchars($walletAddress) ?></p>
    
    <div class="grid gap-4">
        <?php foreach ($testMints as $mint): 
            // Call API
            $_SERVER['PATH_INFO'] = '/' . $mint;
            $_GET['wallet'] = $walletAddress;
            $_INCLUDED_FROM_TEST = true;
            
            ob_start();
            include __DIR__ . '/api/monitoring-status.php';
            $json = ob_get_clean();
            $data = json_decode($json, true);
            
            if ($data && !isset($data['error']):
                $liquidity = $data['liquidity']['current'];
                $badgeState = $data['badgeState'];
                $symbol = $data['tokenInfo']['symbol'] ?? 'UNKNOWN';
                
                // Badge colors
                $colors = [
                    'RUGGED' => 'bg-gray-600',
                    'WATCHING' => 'bg-blue-600',
                    'NEW' => 'bg-purple-600',
                    'VOLATILE' => 'bg-yellow-600',
                    'PUMPING' => 'bg-green-600',
                    'SELL' => 'bg-orange-600',
                    'SELL_NOW' => 'bg-red-600'
                ];
                $color = $colors[$badgeState] ?? 'bg-gray-600';
        ?>
        <div class="bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-2">
                <div>
                    <h3 class="font-semibold"><?= $symbol ?></h3>
                    <p class="text-xs text-gray-400"><?= substr($mint, 0, 20) ?>...</p>
                </div>
                <span class="<?= $color ?> px-3 py-1 rounded text-sm font-semibold">
                    <?= $badgeState ?: 'NONE' ?>
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span class="text-gray-400">Liquidity:</span>
                    <?php if ($liquidity === null): ?>
                        <span class="text-gray-500">No data</span>
                    <?php else: ?>
                        <span class="<?= $liquidity < 1 ? 'text-red-400' : '' ?>">
                            $<?= number_format($liquidity, 2) ?>
                        </span>
                    <?php endif; ?>
                </div>
                <div>
                    <span class="text-gray-400">Has Complete Data:</span>
                    <?= $data['hasCompleteData'] ? '✓' : '✗' ?>
                </div>
            </div>
            
            <?php if ($badgeState === 'RUGGED' && $liquidity !== null && $liquidity >= 1): ?>
            <div class="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400">
                ⚠️ Incorrectly marked as RUGGED (liquidity = $<?= number_format($liquidity, 2) ?>)
            </div>
            <?php elseif ($badgeState === 'RUGGED' && $liquidity === null): ?>
            <div class="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400">
                ⚠️ Marked as RUGGED but liquidity data is missing
            </div>
            <?php endif; ?>
            
            <details class="mt-2">
                <summary class="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
                <pre class="text-xs mt-2 bg-gray-900 p-2 rounded overflow-x-auto"><?= json_encode([
                    'liquidity' => $liquidity,
                    'badgeState' => $badgeState,
                    'hasCompleteData' => $data['hasCompleteData'],
                    'isNewlyAdded' => $data['isNewlyAdded'],
                    'monitoring' => $data['monitoring']['active']
                ], JSON_PRETTY_PRINT) ?></pre>
            </details>
        </div>
        <?php endif; endforeach; ?>
    </div>
    
    <div class="mt-8 bg-gray-800 p-4 rounded">
        <h2 class="font-semibold mb-2">Expected Behavior</h2>
        <ul class="text-sm space-y-1">
            <li>✓ Tokens with null liquidity should NOT be marked as RUGGED</li>
            <li>✓ Only tokens with liquidity < $1 should be marked as RUGGED</li>
            <li>✓ Tokens with monitoring active should show WATCHING badge</li>
            <li>✓ Recently added tokens should show NEW badge</li>
        </ul>
    </div>
    
    <div class="mt-4">
        <a href="dashboard.php" class="text-blue-400 hover:underline">← Back to Dashboard</a>
    </div>
</body>
</html>