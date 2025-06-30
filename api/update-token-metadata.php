<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/supabase.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['token_mint'])) {
    http_response_code(400);
    echo json_encode(['error' => 'token_mint required']);
    exit;
}

$tokenMint = $input['token_mint'];

// Strip "pump" suffix if present
if (preg_match('/pump$/i', $tokenMint)) {
    $tokenMint = substr($tokenMint, 0, -4);
}

try {
    $supabase = Supabase\getSupabaseServiceClient();
    
    // Update token_prices table
    $priceData = [
        'token_mint' => $tokenMint,
        'price' => floatval($input['price'] ?? 0),
        'price_usd' => floatval($input['price'] ?? 0),
        'liquidity' => floatval($input['liquidity'] ?? 0),
        'volume_24h' => floatval($input['volume_24h'] ?? 0),
        'market_cap' => floatval($input['market_cap'] ?? 0),
        'change_24h' => floatval($input['change_24h'] ?? 0),
        'platform' => 'dexscreener',
        'updated_at' => date('c'),
        'timestamp' => date('c')
    ];
    
    error_log("[update-token-metadata] Updating price data: " . json_encode($priceData));
    
    $priceResponse = $supabase->from('token_prices')
        ->upsert($priceData, ['onConflict' => 'token_mint'])
        ->execute();
    
    if (isset($priceResponse->error)) {
        error_log("[update-token-metadata] Error updating token_prices: " . json_encode($priceResponse->error));
    }
    
    // Update token_metadata table if we have symbol/name
    if (isset($input['symbol']) || isset($input['name'])) {
        // Only update metadata if we have real values (not UNKNOWN)
        $hasValidData = false;
        $metadataData = [
            'mint' => $tokenMint,
            'is_active' => true,
            'platform' => 'pump.fun'
        ];
        
        // Only set symbol if it's not empty and not UNKNOWN
        if (!empty($input['symbol']) && $input['symbol'] !== 'UNKNOWN') {
            $metadataData['symbol'] = $input['symbol'];
            $hasValidData = true;
        }
        
        // Only set name if it's not empty and not Unknown/UNKNOWN
        if (!empty($input['name']) && $input['name'] !== 'Unknown Token' && $input['name'] !== 'UNKNOWN') {
            $metadataData['name'] = $input['name'];
            $hasValidData = true;
        }
        
        // Only update if we have valid data
        if (!$hasValidData) {
            error_log("[update-token-metadata] Skipping metadata update - no valid symbol/name provided");
        } else {
            $metadataResponse = $supabase->from('token_metadata')
                ->upsert($metadataData, ['onConflict' => 'mint'])
                ->execute();
                
            if (isset($metadataResponse->error)) {
                error_log("[update-token-metadata] Error updating token_metadata: " . json_encode($metadataResponse->error));
            }
        }
    }
    
    // Add to price history for velocity calculations
    if (floatval($input['price'] ?? 0) > 0) {
        $historyData = [
            'id' => Supabase\generateUuid(),
            'token_mint' => $tokenMint,
            'price' => floatval($input['price'] ?? 0),
            'liquidity' => floatval($input['liquidity'] ?? 0),
            'volume_24h' => floatval($input['volume_24h'] ?? 0),
            'market_cap' => floatval($input['market_cap'] ?? 0),
            'recorded_at' => date('c'),
            'source' => 'manual_update'
        ];
        
        $historyResponse = $supabase->from('token_price_history')
            ->insert($historyData)
            ->execute();
            
        if (isset($historyResponse->error)) {
            error_log("[update-token-metadata] Error inserting price history: " . json_encode($historyResponse->error));
        }
    }
    
    // Update liquidity_velocity for monitoring
    if (floatval($input['liquidity'] ?? 0) > 0) {
        $velocityData = [
            'id' => rand(100000, 999999), // Simple ID generation
            'token_mint' => $tokenMint,
            'liquidity_usd' => floatval($input['liquidity'] ?? 0),
            'liquidity_velocity_1m' => 0,
            'liquidity_velocity_5m' => 0,
            'liquidity_velocity_30m' => 0,
            'price_velocity_1m' => 0,
            'price_velocity_5m' => 0,
            'price_velocity_30m' => 0,
            'volume_24h' => floatval($input['volume_24h'] ?? 0),
            'flash_rug_alert' => false,
            'rapid_drain_alert' => false,
            'slow_bleed_alert' => false,
            'timestamp' => date('c'),
            'created_at' => date('c')
        ];
        
        $velocityResponse = $supabase->from('liquidity_velocity')
            ->upsert($velocityData, ['onConflict' => 'id'])
            ->execute();
            
        if (isset($velocityResponse->error)) {
            error_log("[update-token-metadata] Error updating liquidity_velocity: " . json_encode($velocityResponse->error));
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Token data updated successfully',
        'token_mint' => $tokenMint
    ]);
    
} catch (Exception $e) {
    error_log('[update-token-metadata] Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to update token data',
        'message' => $e->getMessage()
    ]);
}
?>