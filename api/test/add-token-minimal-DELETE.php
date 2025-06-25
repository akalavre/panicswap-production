<?php
// Minimal test endpoint with detailed error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Step 1: Load environment
    $envPath = dirname(__DIR__, 2) . '/env-config.php';
    if (!file_exists($envPath)) {
        throw new Exception("env-config.php not found at: $envPath");
    }
    require_once $envPath;
    
    // Step 2: Load Supabase config
    $supabasePath = __DIR__ . '/../supabase-config.php';
    if (!file_exists($supabasePath)) {
        throw new Exception("supabase-config.php not found at: $supabasePath");
    }
    require_once $supabasePath;
    
    // Step 3: Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    if (!isset($input['tokenMint']) || !isset($input['walletAddress'])) {
        throw new Exception('Missing required fields: tokenMint and walletAddress');
    }
    
    $tokenMint = $input['tokenMint'];
    $walletAddress = $input['walletAddress'];
    
    // Step 4: Initialize Supabase
    $supabase = new SupabaseClient(true);
    
    // Step 5: Check if token already exists
    $existing = $supabase->query('wallet_tokens', [
        'wallet_address' => 'eq.' . $walletAddress,
        'token_mint' => 'eq.' . $tokenMint
    ]);
    
    if ($existing && count($existing) > 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Token already exists in your wallet'
        ]);
        exit;
    }
    
    // Step 6: Check if metadata exists
    $metadata = $supabase->query('token_metadata', ['mint' => 'eq.' . $tokenMint]);
    
    if (!$metadata || count($metadata) === 0) {
        // Create minimal metadata
        $metadataResult = $supabase->insert('token_metadata', [
            'mint' => $tokenMint,
            'symbol' => 'TEST',
            'name' => 'Test Token',
            'decimals' => 6,
            'logo_uri' => '/assets/images/token-placeholder.svg',
            'verified' => false,
            'source' => 'manual',
            'platform' => 'solana',
            'current_price' => 0,
            'price_24h_change' => 0,
            'market_cap' => 0,
            'volume_24h' => 0,
            'holder_count' => 0,
            'current_liquidity' => 0,
            'price_last_updated' => date('c')
        ]);
        
        if (!$metadataResult) {
            throw new Exception('Failed to create token metadata');
        }
    }
    
    // Step 7: Insert wallet token
    $tokenData = [
        'wallet_address' => $walletAddress,
        'token_mint' => $tokenMint,
        'balance' => 1000000.0,
        'decimals' => 6,
        'is_test_token' => true,
        'added_at' => date('c'),
        'last_seen_at' => date('c')
    ];
    
    $result = $supabase->insert('wallet_tokens', $tokenData);
    
    if ($result) {
        // Also create protected_tokens entry
        $protectedResult = $supabase->insert('protected_tokens', [
            'wallet_address' => $walletAddress,
            'token_mint' => $tokenMint,
            'monitoring_active' => true,
            'monitoring_enabled' => true,
            'is_active' => true,
            'swap_to_sol' => true,
            'max_slippage_bps' => 500,
            'priority_fee_multiplier' => 1.5,
            'created_at' => date('c'),
            'updated_at' => date('c'),
            'is_demo_mode' => true,
            'protection_settings' => json_encode([
                'sell_percentage' => 100,
                'auto_protect' => true
            ])
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Token added successfully',
            'token' => [
                'mint' => $tokenMint,
                'symbol' => $metadata[0]['symbol'] ?? 'TEST',
                'name' => $metadata[0]['name'] ?? 'Test Token',
                'balance' => 1000000,
                'protected' => $protectedResult !== false
            ]
        ]);
    } else {
        throw new Exception('Failed to insert wallet token');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ]);
}
?>