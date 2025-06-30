<?php
require_once __DIR__ . '/config/supabase.php';
use function Supabase\getSupabaseClient;

$walletAddress = $_GET['wallet'] ?? '';
if (empty($walletAddress)) {
    die('Please provide a wallet address: ?wallet=YOUR_WALLET_ADDRESS');
}

// Fetch user's tokens from wallet_tokens table
$supabase = getSupabaseClient();
$response = $supabase->from('wallet_tokens')
    ->select('*')
    ->eq('wallet_address', $walletAddress)
    ->execute();

$walletTokens = $response->data ?? [];
?>
<!DOCTYPE html>
<html>
<head>
    <title>Real-time Badge State Monitor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <meta http-equiv="refresh" content="10">
</head>
<body class="bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold mb-4">Badge State Monitor</h1>
    <p class="mb-4">Wallet: <?= htmlspecialchars($walletAddress) ?></p>
    <p class="text-sm text-gray-400 mb-8">Auto-refreshing every 10 seconds...</p>
    
    <div class="grid gap-4">
        <?php foreach ($walletTokens as $token): 
            // Fetch monitoring data for each token
            $_SERVER['PATH_INFO'] = '/' . $token->token_mint;
            $_GET['wallet'] = $walletAddress;
            $_INCLUDED_FROM_TEST = true;
            
            ob_start();
            include __DIR__ . '/api/monitoring-status.php';
            $json = ob_get_clean();
            $data = json_decode($json, true);
            
            if ($data && !isset($data['error'])):
                $liquidity = $data['liquidity']['current'] ?? 0;
                $badgeState = $data['badgeState'] ?? 'UNKNOWN';
                $hasCompleteData = $data['hasCompleteData'] ?? false;
                $isNewlyAdded = $data['isNewlyAdded'] ?? false;
                $monitoring = $data['monitoring']['active'] ?? false;
                
                // Determine badge color
                $badgeColors = [
                    'RUGGED' => 'bg-gray-600',
                    'WATCHING' => 'bg-blue-600',
                    'NEW' => 'bg-purple-600',
                    'VOLATILE' => 'bg-yellow-600',
                    'PUMPING' => 'bg-green-600',
                    'SELL' => 'bg-orange-600',
                    'SELL_NOW' => 'bg-red-600'
                ];
                $badgeColor = $badgeColors[$badgeState] ?? 'bg-gray-600';
        ?>
        <div class="bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-semibold"><?= htmlspecialchars($token->symbol ?? 'UNKNOWN') ?></h3>
                    <p class="text-xs text-gray-400"><?= substr($token->token_mint, 0, 16) ?>...</p>
                </div>
                <span class="<?= $badgeColor ?> px-3 py-1 rounded text-sm font-semibold">
                    <?= $badgeState ?>
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span class="text-gray-400">Liquidity:</span>
                    <span class="<?= $liquidity < 10 ? 'text-red-400' : '' ?>">
                        $<?= number_format($liquidity, 2) ?>
                    </span>
                </div>
                <div>
                    <span class="text-gray-400">Price:</span>
                    $<?= number_format($data['price']['current'] ?? 0, 6) ?>
                </div>
                <div>
                    <span class="text-gray-400">Complete Data:</span>
                    <?= $hasCompleteData ? '✓' : '✗' ?>
                </div>
                <div>
                    <span class="text-gray-400">Monitoring:</span>
                    <?= $monitoring ? '✓' : '✗' ?>
                </div>
            </div>
            
            <?php if ($badgeState === 'RUGGED'): ?>
            <div class="mt-2 p-2 bg-red-900/20 rounded text-xs">
                Marked as RUGGED because liquidity is $<?= number_format($liquidity, 2) ?> (threshold: $10)
            </div>
            <?php endif; ?>
            
            <?php if ($isNewlyAdded): ?>
            <div class="mt-2 text-xs text-yellow-400">
                ⚠️ Newly added token - gathering data...
            </div>
            <?php endif; ?>
        </div>
        <?php endif; endforeach; ?>
    </div>
    
    <div class="mt-8 p-4 bg-gray-800 rounded">
        <h2 class="font-semibold mb-2">Debug Info</h2>
        <p class="text-sm text-gray-400">Total tokens: <?= count($walletTokens) ?></p>
        <p class="text-sm text-gray-400">Time: <?= date('Y-m-d H:i:s') ?></p>
    </div>
</body>
</html>