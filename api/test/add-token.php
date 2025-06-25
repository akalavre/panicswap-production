<?php
// Enable error reporting for debugging but send to error log, not output
error_reporting(E_ALL);
ini_set('display_errors', 0);  // Don't display errors in output
ini_set('log_errors', 1);       // Log errors instead

// Set up error handler to catch any errors and return JSON
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Error: ' . $message,
        'file' => $file,
        'line' => $line,
        'severity' => $severity
    ]);
    exit;
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed', 'method' => $_SERVER['REQUEST_METHOD']]);
    exit;
}

// Get request body
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg(), 'rawInput' => $rawInput]);
    exit;
}

if (!$input || !isset($input['tokenMint']) || !isset($input['walletAddress'])) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required parameters: tokenMint and walletAddress',
        'received' => $input,
        'tokenMint' => $input['tokenMint'] ?? 'missing',
        'walletAddress' => $input['walletAddress'] ?? 'missing'
    ]);
    exit;
}

$tokenMint = $input['tokenMint'];
$walletAddress = $input['walletAddress'];

// Include Supabase config
try {
    require_once __DIR__ . '/../../config/supabase.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to load Supabase config: ' . $e->getMessage(),
        'file' => __FILE__,
        'line' => __LINE__
    ]);
    exit;
}

try {
    // Check if Supabase config is loaded
    if (!defined('SUPABASE_URL') || !defined('SUPABASE_ANON_KEY')) {
        throw new Exception('Supabase configuration not found');
    }
    
    // Initialize Supabase client
    $supabase = new \Supabase\CreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 1. Check if token metadata exists
    try {
        $metadataResponse = $supabase->from('token_metadata')
            ->select('*')
            ->eq('mint', $tokenMint)
            ->single()
            ->execute();
    } catch (Exception $e) {
        throw new Exception('Failed to query token_metadata: ' . $e->getMessage());
    }
    
    $tokenMetadata = null;
    
    if (!empty($metadataResponse->data)) {
        $tokenMetadata = $metadataResponse->data;
    } else {
        // Token not found in metadata, try to get from token_prices
        $priceResponse = $supabase->from('token_prices')
            ->select('*')
            ->eq('token_mint', $tokenMint)
            ->single()
            ->execute();
        
        if (!empty($priceResponse->data)) {
            // Create metadata from price data
            $tokenMetadata = [
                'mint' => $tokenMint,
                'symbol' => $priceResponse->data->symbol ?? 'UNKNOWN',
                'name' => $priceResponse->data->name ?? 'Unknown Token',
                'decimals' => 9, // Default Solana decimals
                'platform' => $priceResponse->data->platform ?? 'unknown'
            ];
            
            // Insert into token_metadata
            $supabase->from('token_metadata')->insert($tokenMetadata)->execute();
        } else {
            // Token not found anywhere, create minimal metadata
            $tokenMetadata = [
                'mint' => $tokenMint,
                'symbol' => 'DEMO',
                'name' => 'Demo Token',
                'decimals' => 9,
                'platform' => 'demo'
            ];
            
            // Insert into token_metadata
            $supabase->from('token_metadata')->insert($tokenMetadata)->execute();
        }
    }
    
    // 2. Add to wallet_tokens with test balance
    $walletToken = [
        'wallet_address' => $walletAddress,
        'token_mint' => $tokenMint,
        'balance' => '1000000000000000', // 1M tokens with 9 decimals
        'decimals' => $tokenMetadata['decimals'] ?? 9,
        'is_test_token' => true,
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];
    
    // Check if already exists
    $existingResponse = $supabase->from('wallet_tokens')
        ->select('*')
        ->eq('wallet_address', $walletAddress)
        ->eq('token_mint', $tokenMint)
        ->single()
        ->execute();
    
    if (!empty($existingResponse->data)) {
        // Update existing
        $supabase->from('wallet_tokens')
            ->update(['balance' => $walletToken['balance'], 'is_test_token' => true])
            ->eq('wallet_address', $walletAddress)
            ->eq('token_mint', $tokenMint)
            ->execute();
    } else {
        // Insert new
        $supabase->from('wallet_tokens')->insert($walletToken)->execute();
    }
    
    // 3. Ensure token has price data
    $priceCheckResponse = $supabase->from('token_prices')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->single()
        ->execute();
    
    if (empty($priceCheckResponse->data)) {
        // Create test price data
        $testPrice = [
            'token_mint' => $tokenMint,
            'symbol' => $tokenMetadata['symbol'],
            'name' => $tokenMetadata['name'],
            'price' => 0.001,
            'price_usd' => 0.001,
            'liquidity' => 50000,
            'market_cap' => 1000000,
            'platform' => 'demo',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];
        
        $supabase->from('token_prices')->insert($testPrice)->execute();
    }
    
    // 4. Add protection (optional, but matches Next.js implementation)
    $protection = [
        'wallet_address' => $walletAddress,
        'token_mint' => $tokenMint,
        'is_active' => true,
        'price_drop_threshold' => 30,
        'liquidity_drop_threshold' => 50,
        'sell_amount_percentage' => 100,
        'slippage_tolerance' => 5,
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];
    
    // Check if protection exists
    $protectionResponse = $supabase->from('protected_tokens')
        ->select('*')
        ->eq('wallet_address', $walletAddress)
        ->eq('token_mint', $tokenMint)
        ->single()
        ->execute();
    
    if (empty($protectionResponse->data)) {
        $supabase->from('protected_tokens')->insert($protection)->execute();
    }
    
    // Return success response
    echo json_encode([
        'success' => true,
        'walletAddress' => $walletAddress,
        'token' => [
            'mint' => $tokenMint,
            'symbol' => $tokenMetadata['symbol'],
            'name' => $tokenMetadata['name'],
            'balance' => 1000000,
            'isTestToken' => true,
            'protected' => true
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to add demo token: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'tokenMint' => $tokenMint ?? 'unknown',
        'walletAddress' => $walletAddress ?? 'unknown'
    ]);
}