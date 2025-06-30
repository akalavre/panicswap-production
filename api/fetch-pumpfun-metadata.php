<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['mint']) || empty($input['mint'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Token mint address is required']);
    exit();
}

$tokenMint = trim($input['mint']);

// Validate Solana address format (basic validation)
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $tokenMint)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid Solana token address format']);
    exit();
}

try {
    // Initialize cURL for PumpFun API call
    $ch = curl_init();
    
    // PumpFun scraper API endpoint
    $url = 'https://pumpfun-scraper-api.p.rapidapi.com/search_tokens';
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'x-rapidapi-host: pumpfun-scraper-api.p.rapidapi.com',
            'x-rapidapi-key: 569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22',
            'Content-Type: application/json'
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception('PumpFun API request failed: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        throw new Exception('PumpFun API returned HTTP ' . $httpCode);
    }
    
    $pumpFunData = json_decode($response, true);
    
    if (!$pumpFunData || !isset($pumpFunData['data'])) {
        throw new Exception('Invalid response from PumpFun API');
    }
    
    // Search for the specific token mint in the returned data
    $tokenData = null;
    foreach ($pumpFunData['data'] as $token) {
        if (isset($token['coinMint']) && $token['coinMint'] === $tokenMint) {
            $tokenData = $token;
            break;
        }
    }
    
    // If not found in search results, try a direct search by mint
    if (!$tokenData) {
        // Try different search approach - search by partial mint
        $searchMint = substr($tokenMint, 0, 10); // First 10 characters
        foreach ($pumpFunData['data'] as $token) {
            if (isset($token['coinMint']) && strpos($token['coinMint'], $searchMint) === 0) {
                $tokenData = $token;
                break;
            }
        }
    }
    
    if (!$tokenData) {
        // Return unknown token data if not found on PumpFun
        echo json_encode([
            'success' => true,
            'found' => false,
            'mint' => $tokenMint,
            'symbol' => 'UNKNOWN',
            'name' => 'Unknown Token',
            'decimals' => 9,
            'logoUri' => null,
            'description' => 'Token not found in PumpFun database',
            'platform' => 'unknown',
            'price' => 0,
            'marketCap' => 0,
            'volume' => 0,
            'numHolders' => 0,
            'bondingCurveProgress' => 0
        ]);
        exit();
    }
    
    // Extract and format token metadata
    $metadata = [
        'success' => true,
        'found' => true,
        'mint' => $tokenData['coinMint'],
        'symbol' => $tokenData['ticker'] ?? 'UNKNOWN',
        'name' => $tokenData['name'] ?? 'Unknown Token',
        'decimals' => 6, // PumpFun tokens typically use 6 decimals
        'logoUri' => $tokenData['imageUrl'] ?? null,
        'description' => $tokenData['name'] ?? '',
        'platform' => 'pump.fun',
        'price' => $tokenData['currentMarketPrice'] ?? 0,
        'marketCap' => $tokenData['marketCap'] ?? 0,
        'volume' => $tokenData['volume'] ?? 0,
        'numHolders' => $tokenData['numHolders'] ?? 0,
        'bondingCurveProgress' => $tokenData['bondingCurveProgress'] ?? 0,
        'creationTime' => $tokenData['creationTime'] ?? null,
        'sniperCount' => $tokenData['sniperCount'] ?? 0,
        'dev' => $tokenData['dev'] ?? null,
        'holders' => $tokenData['holders'] ?? []
    ];
    
    // Add additional risk assessment data
    if (isset($tokenData['holders']) && is_array($tokenData['holders'])) {
        $totalSnipers = 0;
        $totalDevPercentage = 0;
        
        foreach ($tokenData['holders'] as $holder) {
            if (isset($holder['isSniper']) && $holder['isSniper']) {
                $totalSnipers++;
            }
            if (isset($holder['holderId']) && $holder['holderId'] === $tokenData['dev']) {
                $totalDevPercentage = $holder['ownedPercentage'] ?? 0;
            }
        }
        
        $metadata['riskMetrics'] = [
            'totalSnipers' => $totalSnipers,
            'sniperPercentage' => count($tokenData['holders']) > 0 ? ($totalSnipers / count($tokenData['holders'])) * 100 : 0,
            'devHoldingPercentage' => $totalDevPercentage * 100,
            'bondingCurveProgress' => $tokenData['bondingCurveProgress'] ?? 0
        ];
    }
    
    echo json_encode($metadata);
    
} catch (Exception $e) {
    error_log('PumpFun API Error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to fetch token metadata',
        'message' => $e->getMessage(),
        'mint' => $tokenMint
    ]);
}
?>
