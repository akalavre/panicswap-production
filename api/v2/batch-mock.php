<?php
/**
 * Mock Batch API - Returns fake data for testing
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Wallet-Address');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$wallet = $input['wallet'] ?? 'test-wallet';
$tokens = $input['tokens'] ?? [];

// Return mock data
$results = [];
foreach ($tokens as $tokenMint) {
$results[] = [
        'token_mint' => $tokenMint,
        'wallet_address' => $wallet,
        'symbol' => 'TEST',
        'name' => 'Test Token',
        'logo_uri' => null,
        'logo_url' => null,
        'image' => null,
        'balance_ui' => 1.0,
        'price' => 0.001,
        'value' => 0.001,
        'liquidity_usd' => 1000,
        'liquidity' => 1000,
        'monitoring_active' => false,
        'alerts' => [
            'flashRug' => false,
            'rapidDrain' => false
        ],
        'protected' => false,
        'risk_score' => 0,
        'risk_level' => 'MINIMAL',
        'decimals' => 9,
        'balance' => 1000000000,
        'userBalance' => 1.0,
        'userValue' => 0.001,
        'holder_count' => 1234,
        'market_cap' => 1000000,
        'creator_balance_pct' => 5.5,
        'dev_activity_pct' => 2.1,
        'price_change_24h' => 0,
        'verified' => false,
        'is_test_token' => true,
        'badge_state' => null,
        'sell_signal' => null,
        'age' => {
            'value': '7',
            'unit': 'd',
            'raw_days': 7
        }
    ];
}

echo json_encode(['tokens' => $results]);
?>