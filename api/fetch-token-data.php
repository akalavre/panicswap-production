<?php
// Disable error display in production for security
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load environment configuration
require_once dirname(__DIR__) . '/env-config.php';
require_once __DIR__ . '/supabase-config.php';

// Security headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['tokenMint'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameter: tokenMint']);
        exit;
    }
    
    $tokenMint = $input['tokenMint'];
    $supabase = new SupabaseClient(true);
    
    // Check if token exists in metadata table
    $metadata = $supabase->query('token_metadata', ['mint' => 'eq.' . $tokenMint]);
    
    if (!$metadata || count($metadata) === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Token not found in database'
        ]);
        exit;
    }
    
    // Get current metadata
    $currentMetadata = $metadata[0];
    $needsUpdate = false;
    $updates = [];
    
    // Check if we need to fetch price data
    $lastPriceUpdate = $currentMetadata['price_last_updated'] ?? null;
    $priceTooOld = !$lastPriceUpdate || (strtotime($lastPriceUpdate) < strtotime('-5 minutes'));
    
    if ($priceTooOld || !isset($currentMetadata['current_price']) || $currentMetadata['current_price'] == 0) {
        // Fetch price from Jupiter
        $priceData = fetchPriceData($tokenMint);
        if ($priceData) {
            $needsUpdate = true;
            $updates = array_merge($updates, [
                'current_price' => $priceData['price'],
                'market_cap' => $priceData['market_cap'],
                'volume_24h' => $priceData['volume_24h'],
                'price_24h_change' => $priceData['price_change_24h'],
                'price_last_updated' => date('c')
            ]);
        }
    }
    
    // Check if we need more metadata
    if (empty($currentMetadata['symbol']) || $currentMetadata['symbol'] === 'UNKNOWN' ||
        empty($currentMetadata['name']) || $currentMetadata['name'] === 'Unknown Token' ||
        $currentMetadata['metadata_status'] === 'pending') {
        
        // Fetch from DexScreener
        $dexData = fetchFromDexScreener($tokenMint);
        if ($dexData) {
            $needsUpdate = true;
            
            if (!empty($dexData['symbol']) && $dexData['symbol'] !== 'UNKNOWN') {
                $updates['symbol'] = $dexData['symbol'];
            }
            if (!empty($dexData['name']) && $dexData['name'] !== 'Unknown Token') {
                $updates['name'] = $dexData['name'];
            }
            if (!empty($dexData['image'])) {
                $updates['logo_uri'] = $dexData['image'];
            }
            
            // Additional data from DexScreener
            if (isset($dexData['liquidity'])) {
                $updates['current_liquidity'] = $dexData['liquidity'];
            }
            if (isset($dexData['holders'])) {
                $updates['holder_count'] = $dexData['holders'];
            }
            
            // Update metadata status if we got good data
            if (!empty($updates['symbol']) && !empty($updates['name'])) {
                $updates['metadata_status'] = 'complete';
            }
        }
    }
    
    // Update database if needed
    if ($needsUpdate && count($updates) > 0) {
        $updateResult = $supabase->update('token_metadata', $updates, ['mint' => 'eq.' . $tokenMint]);
        
        if ($updateResult === false) {
            error_log('Failed to update token metadata for: ' . $tokenMint);
        }
    }
    
    // Also check and update wallet_tokens table
    $walletAddress = $input['walletAddress'] ?? null;
    if ($walletAddress) {
        $walletToken = $supabase->query('wallet_tokens', [
            'wallet_address' => 'eq.' . $walletAddress,
            'token_mint' => 'eq.' . $tokenMint
        ]);
        
        if ($walletToken && count($walletToken) > 0 && $walletToken[0]['is_newly_added']) {
            // Remove newly_added flag if we have complete metadata
            if (isset($updates['metadata_status']) && $updates['metadata_status'] === 'complete') {
                $supabase->update('wallet_tokens', ['is_newly_added' => false], [
                    'wallet_address' => 'eq.' . $walletAddress,
                    'token_mint' => 'eq.' . $tokenMint
                ]);
            }
        }
    }
    
    // Return the updated metadata
    $finalMetadata = array_merge($currentMetadata, $updates);
    
    echo json_encode([
        'success' => true,
        'metadata' => $finalMetadata,
        'updated' => $needsUpdate
    ]);
    
} catch (Exception $e) {
    error_log('Error in fetch-token-data.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}

// Helper function to fetch price data from Jupiter
function fetchPriceData($tokenMint) {
    $jupiterUrl = "https://price.jup.ag/v6/price?ids={$tokenMint}&showExtraInfo=true";
    
    $ch = curl_init($jupiterUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || !isset($data['data'][$tokenMint])) {
        return null;
    }
    
    $priceInfo = $data['data'][$tokenMint];
    
    return [
        'price' => $priceInfo['price'] ?? 0,
        'market_cap' => $priceInfo['marketCap'] ?? 0,
        'volume_24h' => $priceInfo['volume24h'] ?? 0,
        'price_change_24h' => $priceInfo['priceChange24h'] ?? 0
    ];
}

// Helper function to fetch from DexScreener
function fetchFromDexScreener($tokenMint) {
    $dexUrl = "https://api.dexscreener.com/latest/dex/tokens/{$tokenMint}";
    
    $ch = curl_init($dexUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'User-Agent: PanicSwap/1.0'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || !isset($data['pairs']) || count($data['pairs']) === 0) {
        return null;
    }
    
    // Get the first pair (usually the most liquid)
    $pair = $data['pairs'][0];
    $baseToken = $pair['baseToken'] ?? null;
    
    if (!$baseToken) {
        return null;
    }
    
    return [
        'symbol' => $baseToken['symbol'] ?? null,
        'name' => $baseToken['name'] ?? null,
        'image' => $pair['info']['imageUrl'] ?? null,
        'liquidity' => $pair['liquidity']['usd'] ?? 0,
        'holders' => $pair['info']['holders'] ?? null
    ];
}