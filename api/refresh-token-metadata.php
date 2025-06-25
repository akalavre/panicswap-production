<?php
// Refresh token metadata endpoint
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load environment configuration first
require_once dirname(__DIR__) . '/env-config.php';

// Then load Supabase config
require_once __DIR__ . '/supabase-config.php';

// Set proper headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Function to fetch token metadata from Helius RPC
function fetchTokenMetadataFromHelius($tokenMint) {
    $heliusApiKey = getenv('HELIUS_API_KEY');
    $heliusUrl = "https://mainnet.helius-rpc.com/?api-key={$heliusApiKey}";
    
    // Get token metadata using getAsset method
    $postData = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'getAsset',
        'params' => [
            'id' => $tokenMint
        ]
    ];
    
    $ch = curl_init($heliusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("Helius API request failed: HTTP $httpCode - $response");
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || isset($data['error']) || !isset($data['result'])) {
        error_log("Helius API error: " . ($data['error']['message'] ?? 'Unknown error'));
        return null;
    }
    
    $result = $data['result'];
    
    // Extract metadata
    return [
        'symbol' => $result['content']['metadata']['symbol'] ?? null,
        'name' => $result['content']['metadata']['name'] ?? null,
        'image' => $result['content']['files'][0]['uri'] ?? $result['content']['metadata']['image'] ?? null,
        'decimals' => $result['token_info']['decimals'] ?? 6
    ];
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
    $existingMetadata = $supabase->query('token_metadata', ['mint' => 'eq.' . $tokenMint]);
    
    if (!$existingMetadata || count($existingMetadata) === 0) {
        // Token doesn't exist in metadata table
        error_log("Token metadata not found for mint: $tokenMint");
        echo json_encode([
            'success' => false,
            'error' => 'Token not found in database. Please add the token first.'
        ]);
        exit;
    }

    // Fetch fresh metadata from Helius
    $tokenMetadata = fetchTokenMetadataFromHelius($tokenMint);
    
    if (!$tokenMetadata || empty($tokenMetadata['symbol']) || empty($tokenMetadata['name'])) {
        // If still no metadata, return error
        echo json_encode([
            'success' => false,
            'error' => 'Unable to fetch token metadata from blockchain'
        ]);
        exit;
    }
    
    // Update metadata in database
    $hasValidMetadata = !empty($tokenMetadata['symbol']) && !empty($tokenMetadata['name']);
    
    $updateData = [
        'symbol' => $tokenMetadata['symbol'],
        'name' => $tokenMetadata['name'],
        'logo_uri' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
        'decimals' => $tokenMetadata['decimals'],
        'metadata_status' => $hasValidMetadata ? 'complete' : 'pending',
        'updated_at' => date('c')
    ];
    
    // Update token_metadata table
    $metadataResult = $supabase->update('token_metadata', $updateData, [
        'mint' => 'eq.' . $tokenMint
    ]);
    
    // Return the fresh metadata
    echo json_encode([
        'success' => true,
        'metadata' => [
            'mint' => $tokenMint,
            'symbol' => $tokenMetadata['symbol'],
            'name' => $tokenMetadata['name'],
            'image' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
            'logo_uri' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
            'decimals' => $tokenMetadata['decimals'],
            'metadata_status' => $hasValidMetadata ? 'complete' : 'pending'
        ]
    ]);

} catch (Exception $e) {
    error_log('Exception in refresh-token-metadata.php: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>