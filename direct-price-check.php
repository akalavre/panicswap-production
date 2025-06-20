<?php
// Direct check of token prices in database

// Include Supabase config
require_once 'assets/php/supabase-config.php';

// Get active tokens from backend
$backendUrl = 'http://localhost:3001';
$activeTokensResponse = file_get_contents($backendUrl . '/api/dashboard/active-tokens');
$activeTokensData = json_decode($activeTokensResponse, true);

if (!$activeTokensData || !$activeTokensData['success']) {
    die('Failed to get active tokens');
}

$tokens = $activeTokensData['tokens'];

// Query Supabase directly for these tokens
$supabaseUrl = SUPABASE_URL . '/rest/v1/token_prices';
$headers = [
    'apikey: ' . SUPABASE_ANON_KEY,
    'Authorization: Bearer ' . SUPABASE_ANON_KEY,
    'Content-Type: application/json'
];

// Build query for specific tokens
$tokenList = implode(',', array_map(function($t) { return '"' . $t . '"'; }, $tokens));
$query = '?token_mint=in.(' . urlencode($tokenList) . ')&select=*';

$ch = curl_init($supabaseUrl . $query);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    die('Supabase query failed: ' . $response);
}

$prices = json_decode($response, true);

?>
<!DOCTYPE html>
<html>
<head>
    <title>Direct Price Check</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Direct Token Price Check</h1>
    <p>Active tokens: <?php echo count($tokens); ?></p>
    <p>Prices found: <?php echo count($prices); ?></p>
    
    <h2>Token Prices in Database:</h2>
    <table>
        <tr>
            <th>Token Mint</th>
            <th>Symbol</th>
            <th>Price (USD)</th>
            <th>Updated At</th>
        </tr>
        <?php foreach ($prices as $price): ?>
        <tr>
            <td><?php echo substr($price['token_mint'], 0, 16) . '...'; ?></td>
            <td><?php echo $price['symbol'] ?? 'N/A'; ?></td>
            <td>$<?php echo number_format($price['price'] ?? 0, 8); ?></td>
            <td><?php echo $price['updated_at'] ?? 'N/A'; ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
    
    <h2>Missing Prices:</h2>
    <?php
    $foundMints = array_column($prices, 'token_mint');
    $missingTokens = array_diff($tokens, $foundMints);
    if (count($missingTokens) > 0) {
        echo '<ul>';
        foreach ($missingTokens as $missing) {
            echo '<li>' . $missing . '</li>';
        }
        echo '</ul>';
    } else {
        echo '<p>All active tokens have prices!</p>';
    }
    ?>
</body>
</html>