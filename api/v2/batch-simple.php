<?php
/**
 * Simplified Batch Token API - for debugging
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Log the request
error_log('[batch-simple] Request received: ' . $_SERVER['REQUEST_METHOD']);

// Start with clean output
if (ob_get_level()) {
    ob_end_clean();
}
ob_start();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get input
    $rawInput = file_get_contents('php://input');
    error_log('[batch-simple] Raw input: ' . substr($rawInput, 0, 200));
    
    $input = json_decode($rawInput, true);
    if (!$input) {
        throw new Exception('Invalid JSON input: ' . json_last_error_msg());
    }
    
    $wallet = $input['wallet'] ?? null;
    $tokens = $input['tokens'] ?? [];
    
    error_log('[batch-simple] Wallet: ' . $wallet);
    error_log('[batch-simple] Tokens count: ' . count($tokens));
    
    if (!$wallet || empty($tokens)) {
        throw new Exception('Missing wallet or tokens');
    }
    
    // Load Supabase
    error_log('[batch-simple] Loading Supabase config...');
    require_once __DIR__ . '/../../config/supabase.php';
    
    error_log('[batch-simple] Creating Supabase client...');
    $supabase = Supabase\getSupabaseServiceClient();
    error_log('[batch-simple] Supabase client created');
    
    // Simple response array
    $results = [];
    
    // Fetch each token individually to avoid IN filter issues
    foreach ($tokens as $tokenMint) {
        try {
            // Get wallet token data
            $walletResp = $supabase->from('wallet_tokens')
                ->select('*')
                ->eq('wallet_address', $wallet)
                ->eq('token_mint', $tokenMint)
                ->single()
                ->execute();
            
            // Get metadata
            $metaResp = $supabase->from('token_metadata')
                ->select('*')
                ->eq('mint', $tokenMint)
                ->single()
                ->execute();
            
            // Get price
            $priceResp = $supabase->from('token_prices')
                ->select('*')
                ->eq('token_mint', $tokenMint)
                ->single()
                ->execute();
            
            // Build result
            $balance = floatval($walletResp->data->balance ?? 0);
            $decimals = intval($walletResp->data->decimals ?? 9);
            $price = floatval($priceResp->data->price_usd ?? $priceResp->data->price ?? 0);
            $userBalance = $decimals > 0 ? $balance / pow(10, $decimals) : 0;
            
$results[] = [
                'token_mint' => $tokenMint,
                'wallet_address' => $wallet,
                'symbol' => $metaResp->data->symbol ?? 'UNKNOWN',
                'name' => $metaResp->data->name ?? 'Unknown Token',
                'logo_uri' => $metaResp->data->logo_uri ?? null,
                'logo_url' => $metaResp->data->logo_uri ?? null,
                'image' => $metaResp->data->logo_uri ?? null,
                'balance_ui' => $userBalance,
                'price' => $price,
                'value' => $userBalance * $price,
                'liquidity_usd' => floatval($priceResp->data->liquidity ?? 0),
                'liquidity' => floatval($priceResp->data->liquidity ?? 0),
                'monitoring_active' => false,
                'alerts' => ['flashRug' => false, 'rapidDrain' => false],
                'protected' => false,
                'risk_score' => 0,
                'risk_level' => 'UNKNOWN',
                'decimals' => $decimals,
                'balance' => $balance,
                'userBalance' => $userBalance,
                'userValue' => $userBalance * $price,
                'holder_count' => 0,
                'market_cap' => 0,
                'creator_balance_pct' => 0,
                'dev_activity_pct' => 0,
                'price_change_24h' => 0,
                'verified' => false,
                'is_test_token' => $walletResp->data->is_test_token ?? false,
                'badge_state' => null,
                'sell_signal' => null,
                'age' => null
            ];
            
        } catch (Exception $e) {
            // Skip tokens that don't exist or have errors - only return real data
            error_log('[batch-simple] Error fetching token ' . $tokenMint . ': ' . $e->getMessage());
            continue;
        }
    }
    
    // Clean output and send
    ob_clean();
    echo json_encode(['tokens' => $results]);
    
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage(),
        'line' => $e->getLine()
    ]);
}
?>