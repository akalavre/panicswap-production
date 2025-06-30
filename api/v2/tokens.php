<?php
/**
 * Unified Token Data API v2
 * Single endpoint for all token data with optimized queries
 */

// Disable error display in production
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set up error handler
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $message
    ]);
    exit;
});

// Start output buffering
ob_start();

// Set JSON headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Wallet-Address');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

// Load configuration
require_once __DIR__ . '/../../config/supabase.php';
use function Supabase\getSupabaseServiceClient;

// Parse request path
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$pathParts = array_filter(explode('/', trim($pathInfo, '/')));

// Debug logging
error_log('[tokens-v2] Request: ' . $_SERVER['REQUEST_METHOD'] . ' ' . $_SERVER['REQUEST_URI']);
error_log('[tokens-v2] PathInfo: ' . $pathInfo);
error_log('[tokens-v2] PathParts: ' . json_encode($pathParts));

// Route handling
try {
    $supabase = getSupabaseServiceClient();
    
    // Single token endpoint: /api/v2/tokens/{tokenMint}
    if (count($pathParts) === 1 && $_SERVER['REQUEST_METHOD'] === 'GET' && $pathParts[0] !== 'batch') {
        $tokenMint = $pathParts[0];
        $walletAddress = $_GET['wallet'] ?? $_SERVER['HTTP_X_WALLET_ADDRESS'] ?? null;
        
        if (!$walletAddress) {
            http_response_code(400);
            echo json_encode(['error' => 'Wallet address required']);
            exit;
        }
        
        $tokenData = fetchSingleTokenData($supabase, $tokenMint, $walletAddress);
        echo json_encode($tokenData);
        exit;
    }
    
    // Batch endpoint: POST /api/v2/tokens/batch
    if ((count($pathParts) === 1 && $pathParts[0] === 'batch' && $_SERVER['REQUEST_METHOD'] === 'POST') ||
        (count($pathParts) === 0 && $_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], '/batch') !== false)) {
        $input = json_decode(file_get_contents('php://input'), true);
        $tokenMints = $input['tokens'] ?? [];
        $walletAddress = $input['wallet'] ?? $_SERVER['HTTP_X_WALLET_ADDRESS'] ?? null;
        
        if (!$walletAddress || empty($tokenMints)) {
            http_response_code(400);
            echo json_encode(['error' => 'Wallet address and tokens array required']);
            exit;
        }
        
        // Limit batch size
        $tokenMints = array_slice($tokenMints, 0, 50);
        
        $results = [];
        foreach ($tokenMints as $tokenMint) {
            $results[] = fetchSingleTokenData($supabase, $tokenMint, $walletAddress);
        }
        
        echo json_encode(['tokens' => $results]);
        exit;
    }
    
    // Invalid route
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    
} catch (Exception $e) {
    error_log('[tokens-v2] Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Fetch comprehensive data for a single token
 */
function fetchSingleTokenData($supabase, $tokenMint, $walletAddress) {
    // Try to use the materialized view first for performance
    $viewResp = $supabase->from('token_dashboard_view')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    if ($viewResp->data) {
        // Use data from the materialized view
        $viewData = (array)$viewResp->data;
        
        $data = [
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress,
            'lastUpdate' => date('c'),
            
            // User holdings
            'balance' => floatval($viewData['balance'] ?? 0),
            'decimals' => intval($viewData['decimals'] ?? 9),
            'userBalance' => floatval($viewData['user_balance'] ?? 0),
            'userValue' => floatval($viewData['user_value'] ?? 0),
            'isTestToken' => $viewData['is_test_token'] ?? false,
            'isNewlyAdded' => $viewData['is_newly_added'] ?? false,
            'addedAt' => $viewData['added_at'] ?? null,
            
            // Token info
            'symbol' => $viewData['symbol'] ?? 'UNKNOWN',
            'name' => $viewData['name'] ?? 'Unknown Token',
            'logoUrl' => $viewData['logo_uri'] ?? null,
            'verified' => $viewData['verified'] ?? false,
            'createdAt' => $viewData['token_created_at'] ?? null,
            
            // Market data
            'price' => floatval($viewData['price'] ?? 0),
            'priceChange24h' => floatval($viewData['price_change_24h'] ?? 0),
            'liquidity' => floatval($viewData['liquidity'] ?? 0),
            'volume24h' => floatval($viewData['volume_24h'] ?? 0),
            'marketCap' => floatval($viewData['market_cap'] ?? 0),
            
            // Monitoring data
            'monitoring' => [
                'active' => $viewData['monitoring_active'] ?? false,
                'priceChange1m' => floatval($viewData['price_change_1m'] ?? 0),
                'priceChange5m' => floatval($viewData['price_change_5m'] ?? 0),
                'liquidityChange1m' => floatval($viewData['liquidity_change_1m'] ?? 0),
                'liquidityChange5m' => floatval($viewData['liquidity_change_5m'] ?? 0),
                'alerts' => [
                    'flashRug' => $viewData['flash_rug_alert'] ?? false,
                    'rapidDrain' => $viewData['rapid_drain_alert'] ?? false
                ]
            ],
            
            // Protection status
            'protection' => [
                'isActive' => $viewData['protection_is_active'] ?? false,
                'monitoringActive' => $viewData['protection_monitoring_active'] ?? false,
                'alertsCount' => intval($viewData['alerts_count'] ?? 0),
                'lastThreatDetected' => $viewData['last_threat_detected'] ?? null
            ],
            
            // ML Analysis
            'mlAnalysis' => ($viewData['ml_probability'] ?? 0) > 0 ? [
                'rugProbability' => floatval($viewData['ml_probability'] ?? 0),
                'confidence' => floatval($viewData['ml_confidence'] ?? 0)
            ] : null
        ];
        
        // Calculate risk data
        $data['risk'] = calculateRiskData($data);
        
        // Calculate badge state
        $data['badgeState'] = calculateBadgeState($data);
        
        // Check if we need real-time data
        if ($data['price'] == 0 || $data['liquidity'] == 0) {
            $realtimeData = fetchRealtimeData($tokenMint);
            if ($realtimeData) {
                $data['price'] = $realtimeData['price'] ?: $data['price'];
                $data['liquidity'] = $realtimeData['liquidity'] ?: $data['liquidity'];
                $data['marketCap'] = $realtimeData['marketCap'] ?: $data['marketCap'];
                $data['volume24h'] = $realtimeData['volume24h'] ?: $data['volume24h'];
            }
        }
        
        return $data;
    }
    
    // Fallback to individual queries if view is not available
    $data = [
        'tokenMint' => $tokenMint,
        'walletAddress' => $walletAddress,
        'lastUpdate' => date('c')
    ];
    
    // 1. Get wallet token info
    $walletTokenResp = $supabase->from('wallet_tokens')
        ->select('balance, decimals, is_test_token, is_newly_added, added_at')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    if ($walletTokenResp->data) {
        $walletToken = (array)$walletTokenResp->data;
        $data['balance'] = floatval($walletToken['balance'] ?? 0);
        $data['decimals'] = intval($walletToken['decimals'] ?? 9);
        $data['isTestToken'] = $walletToken['is_test_token'] ?? false;
        $data['isNewlyAdded'] = $walletToken['is_newly_added'] ?? false;
        $data['addedAt'] = $walletToken['added_at'] ?? null;
    }
    
    // 2. Get token metadata
    $metadataResp = $supabase->from('token_metadata')
        ->select('symbol, name, logo_uri, verified, created_at')
        ->eq('mint', $tokenMint)
        ->single()
        ->execute();
    
    if ($metadataResp->data) {
        $metadata = (array)$metadataResp->data;
        $data['symbol'] = $metadata['symbol'] ?? 'UNKNOWN';
        $data['name'] = $metadata['name'] ?? 'Unknown Token';
        $data['logoUrl'] = $metadata['logo_uri'] ?? null;
        $data['verified'] = $metadata['verified'] ?? false;
        $data['createdAt'] = $metadata['created_at'] ?? null;
    } else {
        $data['symbol'] = 'UNKNOWN';
        $data['name'] = 'Unknown Token';
        $data['logoUrl'] = null;
        $data['verified'] = false;
    }
    
    // 3. Get current price and market data
    $priceResp = $supabase->from('token_prices')
        ->select('price, price_usd, liquidity, volume_24h, change_24h, market_cap')
        ->eq('token_mint', $tokenMint)
        ->single()
        ->execute();
    
    if ($priceResp->data) {
        $price = (array)$priceResp->data;
        $data['price'] = floatval($price['price_usd'] ?? $price['price'] ?? 0);
        $data['priceChange24h'] = floatval($price['change_24h'] ?? 0);
        $data['liquidity'] = floatval($price['liquidity'] ?? 0);
        $data['volume24h'] = floatval($price['volume_24h'] ?? 0);
        $data['marketCap'] = floatval($price['market_cap'] ?? 0);
    } else {
        $data['price'] = 0;
        $data['priceChange24h'] = 0;
        $data['liquidity'] = 0;
        $data['volume24h'] = 0;
        $data['marketCap'] = 0;
    }
    
    // 4. Get monitoring stats and velocities
    $statsResp = $supabase->from('monitoring_stats')
        ->select('monitoring_active, price_change_1m, price_change_5m, liquidity_change_1m, liquidity_change_5m, flash_rug_alert, rapid_drain_alert, ml_probability, ml_confidence')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    if ($statsResp->data) {
        $stats = (array)$statsResp->data;
        $data['monitoring'] = [
            'active' => $stats['monitoring_active'] ?? false,
            'priceChange1m' => floatval($stats['price_change_1m'] ?? 0),
            'priceChange5m' => floatval($stats['price_change_5m'] ?? 0),
            'liquidityChange1m' => floatval($stats['liquidity_change_1m'] ?? 0),
            'liquidityChange5m' => floatval($stats['liquidity_change_5m'] ?? 0),
            'alerts' => [
                'flashRug' => $stats['flash_rug_alert'] ?? false,
                'rapidDrain' => $stats['rapid_drain_alert'] ?? false
            ]
        ];
        $data['mlAnalysis'] = [
            'rugProbability' => floatval($stats['ml_probability'] ?? 0),
            'confidence' => floatval($stats['ml_confidence'] ?? 0)
        ];
    } else {
        $data['monitoring'] = [
            'active' => false,
            'priceChange1m' => 0,
            'priceChange5m' => 0,
            'liquidityChange1m' => 0,
            'liquidityChange5m' => 0,
            'alerts' => [
                'flashRug' => false,
                'rapidDrain' => false
            ]
        ];
        $data['mlAnalysis'] = null;
    }
    
    // 5. Get protection status
    $protectionResp = $supabase->from('protected_tokens')
        ->select('is_active, monitoring_active, alerts_count, last_threat_detected')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    if ($protectionResp->data) {
        $protection = (array)$protectionResp->data;
        $data['protection'] = [
            'isActive' => $protection['is_active'] ?? false,
            'monitoringActive' => $protection['monitoring_active'] ?? false,
            'alertsCount' => intval($protection['alerts_count'] ?? 0),
            'lastThreatDetected' => $protection['last_threat_detected'] ?? null
        ];
    } else {
        $data['protection'] = [
            'isActive' => false,
            'monitoringActive' => false,
            'alertsCount' => 0,
            'lastThreatDetected' => null
        ];
    }
    
    // 6. Calculate risk data
    $data['risk'] = calculateRiskData($data);
    
    // 7. Calculate badge state
    $data['badgeState'] = calculateBadgeState($data);
    
    // 8. Calculate user value
    if (isset($data['balance']) && isset($data['decimals']) && $data['price'] > 0) {
        $adjustedBalance = $data['balance'] / pow(10, $data['decimals']);
        $data['userValue'] = $adjustedBalance * $data['price'];
        $data['userBalance'] = $adjustedBalance;
    } else {
        $data['userValue'] = 0;
        $data['userBalance'] = 0;
    }
    
    // Check if we need real-time data
    if ($data['price'] == 0 || $data['liquidity'] == 0) {
        // Try to fetch from external APIs
        $realtimeData = fetchRealtimeData($tokenMint);
        if ($realtimeData) {
            $data['price'] = $realtimeData['price'] ?: $data['price'];
            $data['liquidity'] = $realtimeData['liquidity'] ?: $data['liquidity'];
            $data['marketCap'] = $realtimeData['marketCap'] ?: $data['marketCap'];
            $data['volume24h'] = $realtimeData['volume24h'] ?: $data['volume24h'];
        }
    }
    
    return $data;
}

/**
 * Calculate risk data based on various metrics
 */
function calculateRiskData($data) {
    $riskScore = 0;
    $riskFactors = [];
    
    // ML probability is weighted heavily
    if (isset($data['mlAnalysis']['rugProbability'])) {
        $mlRisk = $data['mlAnalysis']['rugProbability'] * 100;
        $riskScore = max($riskScore, $mlRisk);
        if ($mlRisk > 50) {
            $riskFactors[] = 'High ML risk probability';
        }
    }
    
    // Check liquidity drops
    $liqChange5m = $data['monitoring']['liquidityChange5m'] ?? 0;
    if ($liqChange5m < -10) {
        $riskScore = max($riskScore, 80);
        $riskFactors[] = 'Rapid liquidity drain';
    }
    
    // Check for alerts
    if ($data['monitoring']['alerts']['flashRug'] ?? false) {
        $riskScore = 100;
        $riskFactors[] = 'Flash rug detected';
    }
    
    if ($data['monitoring']['alerts']['rapidDrain'] ?? false) {
        $riskScore = max($riskScore, 90);
        $riskFactors[] = 'Rapid drain alert';
    }
    
    // Determine risk level
    if ($riskScore >= 80) $riskLevel = 'CRITICAL';
    elseif ($riskScore >= 60) $riskLevel = 'HIGH';
    elseif ($riskScore >= 40) $riskLevel = 'MODERATE';
    elseif ($riskScore >= 20) $riskLevel = 'LOW';
    else $riskLevel = 'MINIMAL';
    
    return [
        'score' => $riskScore,
        'level' => $riskLevel,
        'factors' => $riskFactors
    ];
}

/**
 * Calculate badge state based on token data
 */
function calculateBadgeState($data) {
    // Check for critical states first
    if ($data['liquidity'] < 1 && $data['liquidity'] !== null) {
        return 'RUGGED';
    }
    
    // Check for sell signals
    if (($data['monitoring']['alerts']['flashRug'] ?? false) || 
        ($data['monitoring']['liquidityChange5m'] ?? 0) < -18) {
        return 'SELL_NOW';
    }
    
    if (($data['monitoring']['liquidityChange5m'] ?? 0) < -10) {
        return 'SELL';
    }
    
    // Check if pumping
    if (($data['monitoring']['priceChange5m'] ?? 0) > 4) {
        return 'PUMPING';
    }
    
    // Check volatility
    if (abs($data['monitoring']['priceChange5m'] ?? 0) > 2) {
        return 'VOLATILE';
    }
    
    // Check if new
    if ($data['isNewlyAdded'] ?? false) {
        $addedTime = strtotime($data['addedAt'] ?? '');
        if ($addedTime && (time() - $addedTime) < 300) {
            return 'NEW';
        }
    }
    
    // Check if watching
    if (($data['protection']['monitoringActive'] ?? false) || 
        ($data['monitoring']['active'] ?? false)) {
        return 'WATCHING';
    }
    
    return null;
}

/**
 * Fetch real-time data from external sources
 */
function fetchRealtimeData($tokenMint) {
    try {
        // Try DexScreener first
        $url = "https://api.dexscreener.com/latest/dex/tokens/{$tokenMint}";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: PanicSwap/2.0']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            if (isset($result['pairs']) && count($result['pairs']) > 0) {
                $bestPair = $result['pairs'][0];
                return [
                    'price' => floatval($bestPair['priceUsd'] ?? 0),
                    'liquidity' => floatval($bestPair['liquidity']['usd'] ?? 0),
                    'volume24h' => floatval($bestPair['volume']['h24'] ?? 0),
                    'marketCap' => floatval($bestPair['fdv'] ?? 0)
                ];
            }
        }
    } catch (Exception $e) {
        error_log('[tokens-v2] Realtime fetch error: ' . $e->getMessage());
    }
    
    return null;
}

// Clean output and exit
ob_end_flush();