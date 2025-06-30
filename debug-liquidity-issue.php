<?php
// Debug script to understand liquidity data issues
require_once __DIR__ . '/config/supabase.php';
use function Supabase\getSupabaseServiceClient;

$walletAddress = $_GET['wallet'] ?? '';
if (empty($walletAddress)) {
    die('Please provide a wallet address: ?wallet=YOUR_WALLET_ADDRESS');
}

$supabase = getSupabaseServiceClient();

// Get user's tokens
$response = $supabase->from('wallet_tokens')
    ->select('*')
    ->eq('wallet_address', $walletAddress)
    ->limit(10)
    ->execute();

$tokens = $response->data ?? [];
?>
<!DOCTYPE html>
<html>
<head>
    <title>Liquidity Debug</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; }
        .token { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .data-source { margin: 10px 0; padding: 10px; background: #333; }
        .error { color: #ff6b6b; }
        .warning { color: #fab005; }
        .success { color: #51cf66; }
        pre { background: #000; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Liquidity Data Debug</h1>
    <p>Checking liquidity sources for wallet: <?= htmlspecialchars($walletAddress) ?></p>
    
    <?php foreach ($tokens as $token): 
        $mint = $token->token_mint;
    ?>
    <div class="token">
        <h2><?= $token->symbol ?? 'Unknown' ?> - <?= substr($mint, 0, 16) ?>...</h2>
        
        <?php
        // 1. Check monitoring_stats table
        $statsResp = $supabase->from('monitoring_stats')
            ->select('current_liquidity, updated_at')
            ->eq('token_mint', $mint)
            ->eq('wallet_address', $walletAddress)
            ->single()
            ->execute();
        
        $statsLiquidity = $statsResp->data->current_liquidity ?? null;
        ?>
        <div class="data-source">
            <h3>1. monitoring_stats table:</h3>
            <p>Liquidity: <?= $statsLiquidity !== null ? '$' . number_format($statsLiquidity, 2) : '<span class="error">NULL</span>' ?></p>
            <p>Updated: <?= $statsResp->data->updated_at ?? 'Never' ?></p>
        </div>
        
        <?php
        // 2. Check token_prices table
        $priceResp = $supabase->from('token_prices')
            ->select('liquidity, price, updated_at')
            ->eq('token_mint', $mint)
            ->single()
            ->execute();
        
        $priceLiquidity = $priceResp->data->liquidity ?? null;
        ?>
        <div class="data-source">
            <h3>2. token_prices table:</h3>
            <p>Liquidity: <?= $priceLiquidity !== null ? '$' . number_format($priceLiquidity, 2) : '<span class="error">NULL</span>' ?></p>
            <p>Price: $<?= number_format($priceResp->data->price ?? 0, 6) ?></p>
            <p>Updated: <?= $priceResp->data->updated_at ?? 'Never' ?></p>
        </div>
        
        <?php
        // 3. Check liquidity_velocity table
        $velocityResp = $supabase->from('liquidity_velocity')
            ->select('liquidity_usd, timestamp')
            ->eq('token_mint', $mint)
            ->order('timestamp', ['ascending' => false])
            ->limit(1)
            ->execute();
        
        $velocityLiquidity = ($velocityResp->data && count($velocityResp->data) > 0) 
            ? $velocityResp->data[0]->liquidity_usd 
            : null;
        ?>
        <div class="data-source">
            <h3>3. liquidity_velocity table:</h3>
            <p>Liquidity: <?= $velocityLiquidity !== null ? '$' . number_format($velocityLiquidity, 2) : '<span class="error">NULL</span>' ?></p>
            <p>Timestamp: <?= ($velocityResp->data && count($velocityResp->data) > 0) ? $velocityResp->data[0]->timestamp : 'No data' ?></p>
        </div>
        
        <?php
        // 4. Call monitoring-status API to see final result
        $_SERVER['PATH_INFO'] = '/' . $mint;
        $_GET['wallet'] = $walletAddress;
        $_INCLUDED_FROM_TEST = true;
        
        ob_start();
        include __DIR__ . '/api/monitoring-status.php';
        $json = ob_get_clean();
        $apiData = json_decode($json, true);
        
        $finalLiquidity = $apiData['liquidity']['current'] ?? null;
        $badgeState = $apiData['badgeState'] ?? 'UNKNOWN';
        ?>
        <div class="data-source">
            <h3>4. Final API Response:</h3>
            <p>Liquidity: <?= $finalLiquidity !== null ? '$' . number_format($finalLiquidity, 2) : '<span class="error">NULL</span>' ?></p>
            <p>Badge State: <strong class="<?= $badgeState === 'RUGGED' ? 'error' : '' ?>"><?= $badgeState ?></strong></p>
            
            <?php if ($badgeState === 'RUGGED'): ?>
            <p class="warning">⚠️ Token marked as RUGGED with liquidity: $<?= number_format($finalLiquidity ?? 0, 2) ?></p>
            <?php endif; ?>
        </div>
        
        <details>
            <summary>Raw API Response</summary>
            <pre><?= json_encode($apiData, JSON_PRETTY_PRINT) ?></pre>
        </details>
    </div>
    <?php endforeach; ?>
    
    <div style="margin-top: 40px; padding: 20px; background: #333;">
        <h2>Summary</h2>
        <p>Tokens are marked as RUGGED when:</p>
        <ul>
            <li>Liquidity is less than $1 (previously $10)</li>
            <li>Liquidity drops more than 90% in 5 minutes</li>
            <li>Backend explicitly marks it as RUGGED</li>
        </ul>
        <p class="warning">Note: If liquidity data is NULL/missing, tokens should NOT be marked as RUGGED.</p>
    </div>
</body>
</html>