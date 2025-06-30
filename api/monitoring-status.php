<?php
// Disable error display to prevent HTML output
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set up custom error handler to capture fatal errors
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $message,
        'file' => basename($file),
        'line' => $line
    ]);
    exit;
});

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Fatal error',
            'message' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line']
        ]);
    }
});

// Start output buffering with compression for speed
if (!ob_start("ob_gzhandler")) ob_start();

// Skip headers if included from test
if (!isset($_INCLUDED_FROM_TEST)) {
    // Set JSON headers first
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Cache-Control: private, max-age=1'); // 1 second cache

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        ob_end_clean();
        exit(0);
    }
    
    // Handle batch requests for ultra-fast multi-token updates
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['tokens']) && is_array($input['tokens'])) {
            require_once __DIR__ . '/../config/supabase.php';
            handleBatchRequest($input['tokens']);
            exit;
        }
    }
}

// Try to include the required file with error handling
$configFile = __DIR__ . '/../config/supabase.php';
if (!file_exists($configFile)) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}

try {
    require_once $configFile;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration error: ' . $e->getMessage()]);
    exit;
}

// Ensure we have a proper namespace context
use function Supabase\getSupabaseClient;
use function Supabase\getSupabaseServiceClient;

// Get token mint from URL - handle both PATH_INFO and REQUEST_URI
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
if (empty($pathInfo) && isset($_SERVER['REQUEST_URI'])) {
    // Extract from REQUEST_URI if PATH_INFO is not available
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/monitoring-status\.php/([^/?]+)#', $uri, $matches)) {
        $tokenMint = $matches[1];
    } else {
        $tokenMint = '';
    }
} else {
    $tokenMint = trim($pathInfo, '/');
}

// Token mint is used as-is for all lookups

if (empty($tokenMint)) {
    http_response_code(400);
    echo json_encode(['error' => 'Token mint required']);
    exit;
}

// Get wallet address from query param or header
$walletAddress = $_GET['wallet'] ?? $_SERVER['HTTP_X_WALLET_ADDRESS'] ?? null;

if (empty($walletAddress)) {
    http_response_code(400);
    echo json_encode(['error' => 'Wallet address required']);
    exit;
}

try {
    // Use service client to bypass RLS for monitoring_stats table
    $supabase = getSupabaseServiceClient();
    
    // Log to error_log for debugging
    error_log("[monitoring-status] Token: $tokenMint, Wallet: $walletAddress");
    
    // Check if this is a newly added token with no data
    $tokenCheckResponse = $supabase->from('wallet_tokens')
        ->select('is_newly_added, added_at')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    $isNewlyAdded = false;
    $tokenAddedAt = null;
    if ($tokenCheckResponse->data) {
        $tokenInfo = (array)$tokenCheckResponse->data;
        $isNewlyAdded = $tokenInfo['is_newly_added'] ?? false;
        $tokenAddedAt = $tokenInfo['added_at'] ?? null; // Store for badge calculation
        
        // If token is newly added and created within last 5 minutes, trigger data population
        if ($isNewlyAdded && isset($tokenInfo['added_at'])) {
            try {
                $createdTime = strtotime($tokenInfo['added_at']);
                $fiveMinutesAgo = time() - 300;
                
                if ($createdTime > $fiveMinutesAgo) {
                    // Trigger data population asynchronously
                    triggerBackendDataPopulation($tokenMint, $walletAddress);
                }
            } catch (Exception $e) {
                error_log("[monitoring-status] Error parsing added_at: " . $e->getMessage());
            }
        }
    }
    
    // Fetch monitoring stats
    $statsResponse = $supabase->from('monitoring_stats')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    // Log raw response for debugging (remove in production)
    error_log("[monitoring-status] Stats response: " . json_encode($statsResponse));
    
    // Ensure all responses are arrays
    $stats = is_array($statsResponse->data) || is_object($statsResponse->data) 
        ? (array)$statsResponse->data 
        : [];
    
    // Fetch latest velocity data
    $velocityResponse = $supabase->from('liquidity_velocity')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->order('timestamp', ['ascending' => false])
        ->limit(1)
        ->execute();
    
    // Log raw response for debugging (remove in production)
    error_log("[monitoring-status] Velocity response: " . json_encode($velocityResponse));
    
    $velocityData = (is_array($velocityResponse->data) && count($velocityResponse->data) > 0) 
        ? (array)$velocityResponse->data[0] 
        : [];
    
    // Fetch price data from token_prices table
    $priceResponse = $supabase->from('token_prices')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->single()
        ->execute();
    
    // Log raw response for debugging (remove in production)
    error_log("[monitoring-status] Price response: " . json_encode($priceResponse));
    
    $priceData = is_array($priceResponse->data) || is_object($priceResponse->data)
        ? (array)$priceResponse->data
        : [];
    
    // Fetch token metadata including symbol, name, logo
    $metadataResponse = $supabase->from('token_metadata')
        ->select('*')
        ->eq('mint', $tokenMint)
        ->single()
        ->execute();
    
    $tokenMetadata = [];
    $holderCount = 0;
    if ($metadataResponse->data) {
        $tokenMetadata = (array)$metadataResponse->data;
        $holderCount = intval($tokenMetadata['holder_count'] ?? 0);
    }
    
    // If no launch time in metadata, try to get it from rugcheck_reports
    if (empty($tokenMetadata['created_at'])) {
        $rugcheckResponse = $supabase->from('rugcheck_reports')
            ->select('launch_time')
            ->eq('token_mint', $tokenMint)
            ->single()
            ->execute();
        
        if ($rugcheckResponse->data && !empty($rugcheckResponse->data->launch_time)) {
            $tokenMetadata['created_at'] = $rugcheckResponse->data->launch_time;
            error_log("[monitoring-status] Got launch_time from rugcheck_reports: " . $rugcheckResponse->data->launch_time);
        }
    }
    
    // Fetch recent price history for velocity calculations
    $priceHistoryResponse = $supabase->from('token_price_history')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->order('recorded_at', ['ascending' => false])
        ->limit(10)
        ->execute();
    
    $priceHistory = is_array($priceHistoryResponse->data) ? $priceHistoryResponse->data : [];
    
    // Calculate price velocities from history
    $priceVelocities = calculatePriceVelocities($priceHistory, $priceData);
    
    // Fetch protection status (removed is_active filter to ensure we get all protection data)
    $protectionResponse = $supabase->from('protected_tokens')
        ->select('is_active, mempool_monitoring, risk_threshold, monitoring_active, last_threat_detected, alerts_count, trigger_count')
        ->eq('token_mint', $tokenMint)
        ->eq('wallet_address', $walletAddress)
        ->single()
        ->execute();
    
    // Log raw response for debugging (remove in production)
    error_log("[monitoring-status] Protection response: " . json_encode($protectionResponse));
    
    $protection = is_array($protectionResponse->data) || is_object($protectionResponse->data) 
        ? (array)$protectionResponse->data 
        : [];
    
    // Check if we need to fetch real-time data
    // Also check if the price is a tiny value which might indicate bad data
    // Always fetch for pump.fun tokens (ending with 'pump')
    $isPumpFunToken = preg_match('/pump$/i', $tokenMint);
    $needsRealtimeData = (
        $isPumpFunToken || // Always fetch for pump.fun tokens
        floatval($priceData['price'] ?? 0) == 0 ||
        floatval($priceData['price'] ?? 0) < 0.0000001 || // Price too small, likely bad data
        floatval($priceData['liquidity'] ?? 0) == 0 ||
        floatval($priceData['market_cap'] ?? 0) == 0 ||
        floatval($priceData['volume_24h'] ?? 0) == 0 ||
        $holderCount == 0
    );
    
    error_log("[monitoring-status] Price data from DB: " . json_encode($priceData));
    error_log("[monitoring-status] Is pump.fun token: " . ($isPumpFunToken ? 'YES' : 'NO'));
    error_log("[monitoring-status] Needs realtime data: " . ($needsRealtimeData ? 'YES' : 'NO'));
    
    // If critical data is missing, try to fetch from external APIs
    if ($needsRealtimeData) {
        error_log("[monitoring-status] Missing data for $tokenMint, fetching from external APIs");
        try {
            $realtimeData = fetchRealtimeTokenData($tokenMint);
            error_log("[monitoring-status] Real-time fetch result: " . json_encode($realtimeData));
        } catch (Exception $e) {
            error_log("[monitoring-status] Real-time fetch error: " . $e->getMessage());
            $realtimeData = null;
        }
        
        // Merge real-time data if available
        if ($realtimeData) {
            error_log("[monitoring-status] Merging realtime data - liquidity: " . $realtimeData['liquidity']);
            if ($realtimeData['price'] > 0) {
                $priceData['price'] = $realtimeData['price'];
                $priceData['price_usd'] = $realtimeData['price'];
            }
            if ($realtimeData['liquidity'] > 0) {
                $priceData['liquidity'] = $realtimeData['liquidity'];
                error_log("[monitoring-status] Set priceData liquidity to: " . $priceData['liquidity']);
            }
            if ($realtimeData['marketCap'] > 0) {
                $priceData['market_cap'] = $realtimeData['marketCap'];
            }
            if ($realtimeData['volume24h'] > 0) {
                $priceData['volume_24h'] = $realtimeData['volume24h'];
            }
            // Store holder count in token_metadata if we have it
            if ($realtimeData['holders'] > 0) {
                $holderCount = $realtimeData['holders']; // Update local variable
                // Check if token exists in metadata first
                $checkMeta = $supabase->from('token_metadata')
                    ->select('mint')
                    ->eq('mint', $tokenMint)
                    ->single()
                    ->execute();
                
                if ($checkMeta->data) {
                    // Update existing record
                    $supabase->from('token_metadata')
                        ->update([
                            'holder_count' => $realtimeData['holders'],
                            'updated_at' => date('c')
                        ])
                        ->eq('mint', $tokenMint)
                        ->execute();
                } else if (preg_match('/pump$/i', $tokenMint) && $realtimeData['source'] === 'pumpfun') {
                    // For pump.fun tokens, try to create metadata if we have enough data
                    error_log("[monitoring-status] Creating metadata for pump.fun token: $tokenMint");
                    try {
                        $supabase->from('token_metadata')
                            ->insert([
                                'mint' => $tokenMint,
                                'symbol' => 'PUMP', // Default symbol
                                'name' => 'Pump.fun Token',
                                'decimals' => 6,
                                'holder_count' => $realtimeData['holders'],
                                'verified' => false,
                                'source' => 'pumpfun_api',
                                'platform' => 'solana',
                                'created_at' => date('c'),
                                'updated_at' => date('c')
                            ])
                            ->execute();
                    } catch (Exception $e) {
                        error_log("[monitoring-status] Could not create token_metadata: " . $e->getMessage());
                    }
                }
            }
            
            // Store the fetched data for next time
            if ($realtimeData['price'] > 0 || $realtimeData['liquidity'] > 0) {
                // First check if token exists in token_prices
                $existingPrice = $supabase->from('token_prices')
                    ->select('token_mint')
                    ->eq('token_mint', $tokenMint)
                    ->single()
                    ->execute();
                
                if ($existingPrice->data) {
                    // Update existing record
                    $supabase->from('token_prices')
                        ->update([
                            'price' => $realtimeData['price'],
                            'price_usd' => $realtimeData['price'],
                            'liquidity' => $realtimeData['liquidity'],
                            'market_cap' => $realtimeData['marketCap'],
                            'volume_24h' => $realtimeData['volume24h'],
                            'platform' => $realtimeData['source'],
                            'updated_at' => date('c'),
                            'timestamp' => date('c')
                        ])
                        ->eq('token_mint', $tokenMint)
                        ->execute();
                } else {
                    // Try to insert, but ignore errors if token doesn't exist in metadata
                    try {
                        $supabase->from('token_prices')
                            ->insert([
                                'token_mint' => $tokenMint,
                                'price' => $realtimeData['price'],
                                'price_usd' => $realtimeData['price'],
                                'liquidity' => $realtimeData['liquidity'],
                                'market_cap' => $realtimeData['marketCap'],
                                'volume_24h' => $realtimeData['volume24h'],
                                'platform' => $realtimeData['source'],
                                'updated_at' => date('c'),
                                'timestamp' => date('c')
                            ])
                            ->execute();
                    } catch (Exception $e) {
                        // Ignore foreign key constraint errors
                        error_log("[monitoring-status] Could not insert token_prices: " . $e->getMessage());
                    }
                }
                
                // Also update monitoring_stats with liquidity data
                if ($realtimeData['liquidity'] > 0) {
                    try {
                        error_log("[monitoring-status] Updating monitoring_stats with liquidity: " . $realtimeData['liquidity']);
                        
                        // Check if monitoring_stats record exists
                        if (!empty($stats)) {
                            // Update existing record
                            $supabase->from('monitoring_stats')
                                ->update([
                                    'current_liquidity' => $realtimeData['liquidity'],
                                    'current_price' => $realtimeData['price'],
                                    'updated_at' => date('c')
                                ])
                                ->eq('token_mint', $tokenMint)
                                ->eq('wallet_address', $walletAddress)
                                ->execute();
                        } else {
                            // Create new monitoring_stats record
                            error_log("[monitoring-status] Creating new monitoring_stats record");
                            $supabase->from('monitoring_stats')
                                ->insert([
                                    'token_mint' => $tokenMint,
                                    'wallet_address' => $walletAddress,
                                    'current_liquidity' => $realtimeData['liquidity'],
                                    'current_price' => $realtimeData['price'],
                                    'monitoring_active' => false,
                                    'active_monitors' => 0,
                                    'websocket_connected' => false,
                                    'created_at' => date('c'),
                                    'updated_at' => date('c')
                                ])
                                ->execute();
                        }
                            
                        // Update the local stats array so it gets used in the response
                        $stats['current_liquidity'] = $realtimeData['liquidity'];
                    } catch (Exception $e) {
                        error_log("[monitoring-status] Could not update monitoring_stats: " . $e->getMessage());
                    }
                }
            }
        }
    }
    
    // Fetch ML predictions if not in monitoring_stats
    $mlData = null;
    if (empty($stats['ml_probability'])) {
        // Try to fetch directly from ml_predictions table
        $mlResponse = $supabase->from('ml_predictions')
            ->select('*')
            ->eq('token_mint', $tokenMint)
            ->order('created_at', ['ascending' => false])
            ->limit(1)
            ->execute();
        
        if ($mlResponse->data && count($mlResponse->data) > 0) {
            $mlData = (array)$mlResponse->data[0];
            error_log("[monitoring-status] ML data fetched from ml_predictions: " . json_encode($mlData));
        }
    }
    
    // Debug logging for liquidity
    error_log("[monitoring-status] Building response - stats current_liquidity: " . ($stats['current_liquidity'] ?? 'null'));
    error_log("[monitoring-status] Building response - velocityData liquidity_usd: " . ($velocityData['liquidity_usd'] ?? 'null'));
    error_log("[monitoring-status] Building response - priceData liquidity: " . ($priceData['liquidity'] ?? 'null'));
    
    // Calculate badge state - pass the token added time
    $badgeState = calculateBadgeState($stats, $priceData, $velocityData, $mlData, $protection, $tokenAddedAt);
    
    // Add a data completeness flag to help frontend decide when to show badge
    $hasCompleteData = !empty($priceData) && 
                      (isset($priceData['liquidity']) || isset($stats['current_liquidity'])) &&
                      (!empty($protection) || !empty($stats['monitoring_active']));
    
    // Debug logging for badge state
    error_log("[monitoring-status] Badge state calculation for $tokenMint:");
    error_log("  - Protection data: " . json_encode($protection));
    error_log("  - Monitoring active (protection): " . ($protection['monitoring_active'] ?? 'null'));
    error_log("  - Monitoring active (stats): " . ($stats['monitoring_active'] ?? 'null'));
    error_log("  - Token added at: " . ($tokenAddedAt ?? 'null'));
    error_log("  - Calculated badge state: " . ($badgeState ?? 'null'));
    
    // Format response with better null handling
    $response = [
        'tokenMint' => $tokenMint,
        'walletAddress' => $walletAddress,
        'badgeState' => $badgeState, // NEW: Action state for traders
        'hasCompleteData' => $hasCompleteData, // NEW: Data completeness flag
        'dataAge' => $isNewlyAdded && $tokenAddedAt ? (time() - strtotime($tokenAddedAt)) * 1000 : null, // Age in ms
        'isNewlyAdded' => $isNewlyAdded,
        'addedAt' => $tokenAddedAt,
        'tokenInfo' => [
            'symbol' => $tokenMetadata['symbol'] ?? 'UNKNOWN',
            'name' => $tokenMetadata['name'] ?? 'Unknown Token',
            'logoUrl' => $tokenMetadata['image_url'] ?? $tokenMetadata['logo_uri'] ?? null,
            'decimals' => intval($tokenMetadata['decimals'] ?? 9),
            'verified' => isset($tokenMetadata['verified']) ? (bool)$tokenMetadata['verified'] : false,
            'launchTime' => $tokenMetadata['created_at'] ?? null,
            'createdAt' => $tokenMetadata['created_at'] ?? null
        ],
        'monitoring' => [
            'active' => isset($protection['is_active']) && $protection['is_active'] === true,
            'mempoolEnabled' => isset($protection['mempool_monitoring']) ? (bool)$protection['mempool_monitoring'] : false,
            'riskThreshold' => $protection['risk_threshold'] ?? 'HIGH',
            'activeMonitors' => intval($stats['active_monitors'] ?? 1), // Default to 1 if monitoring is enabled
            'websocketConnected' => true,
            'lastCheck' => $stats['last_check_at'] ?? date('c'),
            'monitoring' => [ // Nested monitoring object for frontend compatibility
                'active' => isset($protection['is_active']) && $protection['is_active'] === true
            ]
        ],
        'liquidity' => [
            // Don't default to 0 - keep null if no data available
            'current' => $priceData['liquidity'] ?? $stats['current_liquidity'] ?? $velocityData['liquidity_usd'] ?? null,
            // Ultra-short windows (absolute % change)
            'change10s' => floatval($stats['liquidity_change_10s'] ?? $velocityData['liquidity_10s'] ?? 0),
            'change20s' => floatval($stats['liquidity_change_20s'] ?? $velocityData['liquidity_20s'] ?? 0),
            'change30s' => floatval($stats['liquidity_change_30s'] ?? $velocityData['liquidity_30s'] ?? 0),
            // Standard windows (per minute rates)
            'change1m' => floatval($stats['liquidity_change_1m'] ?? $velocityData['liquidity_velocity_1m'] ?? 0),
            'change5m' => floatval($stats['liquidity_change_5m'] ?? $velocityData['liquidity_velocity_5m'] ?? 0),
            'change30m' => floatval($stats['liquidity_change_30m'] ?? $velocityData['liquidity_velocity_30m'] ?? 0)
        ],
        'price' => [
            'current' => floatval($priceData['price'] ?? $priceData['price_usd'] ?? 0),
            // Ultra-short windows (absolute % change)
            'change10s' => floatval($stats['price_change_10s'] ?? $velocityData['price_10s'] ?? 0),
            'change20s' => floatval($stats['price_change_20s'] ?? $velocityData['price_20s'] ?? 0),
            'change30s' => floatval($stats['price_change_30s'] ?? $velocityData['price_30s'] ?? 0),
            // Standard windows
            'change1m' => floatval($stats['price_change_1m'] ?? $velocityData['price_velocity_1m'] ?? $priceVelocities['1m'] ?? 0),
            'change5m' => floatval($stats['price_change_5m'] ?? $velocityData['price_velocity_5m'] ?? $priceVelocities['5m'] ?? 0),
            'change24h' => floatval($priceData['change_24h'] ?? 0)
        ],
        'alerts' => [
            'flashRug' => isset($stats['flash_rug_alert']) ? (bool)$stats['flash_rug_alert'] : (isset($velocityData['flash_rug_alert']) ? (bool)$velocityData['flash_rug_alert'] : false),
            'rapidDrain' => isset($stats['rapid_drain_alert']) ? (bool)$stats['rapid_drain_alert'] : (isset($velocityData['rapid_drain_alert']) ? (bool)$velocityData['rapid_drain_alert'] : false),
            'slowBleed' => isset($stats['slow_bleed_alert']) ? (bool)$stats['slow_bleed_alert'] : (isset($velocityData['slow_bleed_alert']) ? (bool)$velocityData['slow_bleed_alert'] : false),
            'volumeSpike' => isset($stats['volume_spike']) ? (bool)$stats['volume_spike'] : false
        ],
        'patterns' => [
            'active' => isset($stats['active_patterns']) && is_array($stats['active_patterns']) ? $stats['active_patterns'] : [],
            'highestRisk' => $stats['highest_risk_pattern'] ?? null,
            'confidence' => floatval($stats['pattern_confidence'] ?? 0),
            'timeToRug' => $stats['estimated_time_to_rug'] ?? null
        ],
        'stats' => [
            'alertsCount' => intval($protection['alerts_count'] ?? 0),
            'triggerCount' => intval($protection['trigger_count'] ?? 0),
            'lastThreat' => $protection['last_threat_detected'] ?? null
        ],
        'marketData' => [
            'marketCap' => floatval($priceData['market_cap'] ?? 0),
            'volume24h' => floatval($priceData['volume_24h'] ?? 0),
            'holders' => $holderCount
        ],
        'mlAnalysis' => [
            'rugProbability' => floatval($stats['ml_probability'] ?? $mlData['probability'] ?? 0),
            'confidence' => floatval($stats['ml_confidence'] ?? $mlData['confidence'] ?? 0),
            'timeToRug' => $stats['ml_time_to_rug'] ?? $mlData['time_to_rug'] ?? null,
            'riskLevel' => $stats['ml_risk_level'] ?? calculateRiskLevel(floatval($stats['ml_probability'] ?? $mlData['probability'] ?? 0)),
            'topRiskFactors' => isset($stats['ml_top_factors']) && is_array($stats['ml_top_factors']) 
                ? $stats['ml_top_factors'] 
                : (isset($mlData['risk_factors']) && is_array($mlData['risk_factors']) ? $mlData['risk_factors'] : []),
            'modelVersion' => $stats['ml_model_version'] ?? $mlData['model_version'] ?? 'N/A',
            'lastUpdated' => $stats['ml_last_updated'] ?? $mlData['created_at'] ?? null,
            'hybridRiskScore' => floatval($stats['hybrid_risk_score'] ?? calculateHybridRisk(
                floatval($stats['pattern_confidence'] ?? 0),
                floatval($stats['ml_probability'] ?? $mlData['probability'] ?? 0)
            ))
        ],
        'sellSignal' => calculateSellSignal($stats, $priceData, $velocityData),
        'risk' => [
            'level' => $stats['risk_level'] ?? calculateRiskLevel(floatval($stats['ml_probability'] ?? $mlData['probability'] ?? 0)),
            'score' => floatval($stats['risk_score'] ?? $stats['pattern_confidence'] ?? 0),
            'rugProbability' => floatval($stats['ml_probability'] ?? $mlData['probability'] ?? 0)
        ],
        'protection' => [
            'isActive' => isset($protection['is_active']) && $protection['is_active'] === true
        ],
        'protected' => isset($protection['is_active']) && $protection['is_active'] === true,
        'monitoringActive' => isset($protection['is_active']) && $protection['is_active'] === true,
        'holders' => [
            'total' => $holderCount
        ],
        'volume' => [
            'volume24h' => floatval($priceData['volume_24h'] ?? 0)
        ],
        'velocity' => [
            'liquidity' => [
                '10s' => floatval($stats['liquidity_change_10s'] ?? $velocityData['liquidity_10s'] ?? 0),
                '20s' => floatval($stats['liquidity_change_20s'] ?? $velocityData['liquidity_20s'] ?? 0),
                '30s' => floatval($stats['liquidity_change_30s'] ?? $velocityData['liquidity_30s'] ?? 0),
                '1m' => floatval($stats['liquidity_change_1m'] ?? $velocityData['liquidity_velocity_1m'] ?? 0),
                '5m' => floatval($stats['liquidity_change_5m'] ?? $velocityData['liquidity_velocity_5m'] ?? 0),
                '30m' => floatval($stats['liquidity_change_30m'] ?? $velocityData['liquidity_velocity_30m'] ?? 0)
            ],
            'price' => [
                '10s' => floatval($stats['price_change_10s'] ?? $velocityData['price_10s'] ?? 0),
                '20s' => floatval($stats['price_change_20s'] ?? $velocityData['price_20s'] ?? 0),
                '30s' => floatval($stats['price_change_30s'] ?? $velocityData['price_30s'] ?? 0),
                '1m' => floatval($stats['price_change_1m'] ?? $velocityData['price_velocity_1m'] ?? $priceVelocities['1m'] ?? 0),
                '5m' => floatval($stats['price_change_5m'] ?? $velocityData['price_velocity_5m'] ?? $priceVelocities['5m'] ?? 0),
                '30m' => floatval($priceVelocities['30m'] ?? 0)
            ]
        ],
        'developerActivity' => null, // TODO: Add developer activity tracking
        'poolInfo' => null, // TODO: Add pool info
        'lastUpdate' => $stats['updated_at'] ?? $velocityData['timestamp'] ?? $priceData['updated_at'] ?? date('c')
    ];
    
    // Ensure we output the JSON with proper flags
    try {
        $json = json_encode($response, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        // Clear any stray output captured in the buffer before sending JSON
        if (ob_get_length()) {
            ob_end_clean();
        }
        http_response_code(200);
        echo $json;
        exit;
    } catch (\JsonException $jsonError) {
        // Clear any stray output captured in the buffer before sending JSON error
        if (ob_get_length()) {
            ob_end_clean();
        }
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to encode response',
            'json_error' => $jsonError->getMessage()
        ], JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }
    
} catch (\Throwable $e) {
    error_log('[monitoring-status] Exception: ' . $e->getMessage());
    error_log('[monitoring-status] File: ' . $e->getFile() . ' Line: ' . $e->getLine());
    error_log('[monitoring-status] Token: ' . $tokenMint . ' Wallet: ' . $walletAddress);
    
    // Clear any stray output captured in the buffer before sending JSON error
    if (ob_get_length()) {
        ob_end_clean();
    }
    http_response_code(500);
    $errorResponse = [
        'error' => 'Failed to fetch monitoring status',
        'message' => $e->getMessage(),
        'token' => $tokenMint,
        'wallet' => $walletAddress,
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ];
    
    $json = json_encode($errorResponse);
    if ($json === false) {
        echo '{"error":"Failed to encode error response"}';
    } else {
        echo $json;
    }
    exit;
}

/**
 * Calculate price velocities from price history
 */
function calculatePriceVelocities($priceHistory, $currentPriceData) {
    $velocities = [
        '1m' => 0,
        '5m' => 0,
        '30m' => 0
    ];
    
    if (empty($priceHistory) || empty($currentPriceData['price'])) {
        return $velocities;
    }
    
    $currentPrice = floatval($currentPriceData['price']);
    $now = time();
    
    foreach ($priceHistory as $historicalPrice) {
        // Convert object to array if needed
        $historicalPrice = (array)$historicalPrice;
        
        $timestamp = strtotime($historicalPrice['recorded_at'] ?? $historicalPrice['timestamp'] ?? '');
        if (!$timestamp) continue;
        
        $timeDiff = $now - $timestamp;
        $historicalPriceValue = floatval($historicalPrice['price'] ?? 0);
        
        if ($historicalPriceValue <= 0) continue;
        
        // Calculate percentage change
        $percentChange = (($currentPrice - $historicalPriceValue) / $historicalPriceValue) * 100;
        
        // 1 minute velocity
        if ($timeDiff >= 55 && $timeDiff <= 65 && $velocities['1m'] == 0) {
            $velocities['1m'] = $percentChange;
        }
        
        // 5 minute velocity
        if ($timeDiff >= 295 && $timeDiff <= 305 && $velocities['5m'] == 0) {
            $velocities['5m'] = $percentChange;
        }
        
        // 30 minute velocity
        if ($timeDiff >= 1795 && $timeDiff <= 1805 && $velocities['30m'] == 0) {
            $velocities['30m'] = $percentChange;
        }
    }
    
    return $velocities;
}

/**
 * Fetch token data from PumpFun API
 */
function fetchPumpFunTokenData($tokenMint) {
    error_log("[monitoring-status] fetchPumpFunTokenData called for $tokenMint");
    
    $data = [
        'price' => 0,
        'liquidity' => 0,
        'marketCap' => 0,
        'volume24h' => 0,
        'holders' => 0,
        'source' => 'none'
    ];
    
    try {
        // Try to get from environment first, fallback to hardcoded for local dev
        $rapidApiKey = getenv('RAPIDAPI_KEY');
        if (!$rapidApiKey) {
            // Check if it's in $_ENV
            $rapidApiKey = $_ENV['RAPIDAPI_KEY'] ?? null;
        }
        if (!$rapidApiKey) {
            // Hardcoded fallback for local dev (should be removed in production)
            $rapidApiKey = '569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22';
            error_log("[monitoring-status] Using hardcoded RAPIDAPI_KEY");
        }
        
        // Use the token mint as-is without any suffix
        error_log("[monitoring-status] Attempting PumpFun fetch with mint: $tokenMint");
        
        $url = "https://pumpfun-scraper-api.p.rapidapi.com/search_tokens?term={$tokenMint}";
        error_log("[monitoring-status] PumpFun URL: $url");
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Disable SSL verification for local dev
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // Disable SSL verification for local dev
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-rapidapi-host: pumpfun-scraper-api.p.rapidapi.com',
            'x-rapidapi-key: ' . $rapidApiKey
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        error_log("[monitoring-status] PumpFun HTTP code: $httpCode");
        if ($curlError) {
            error_log("[monitoring-status] PumpFun CURL error: $curlError");
        }
        
        if ($httpCode === 200 && $response) {
            error_log("[monitoring-status] PumpFun raw response: " . substr($response, 0, 500)); // Log first 500 chars
            $result = json_decode($response, true);
            if (isset($result['data']) && is_array($result['data']) && count($result['data']) > 0) {
                $tokenData = $result['data'][0]; // First result
                error_log("[monitoring-status] PumpFun token data: " . json_encode($tokenData));
                
                // Extract data from PumpFun response
                $data['marketCap'] = floatval($tokenData['marketCap'] ?? 0);
                $data['volume24h'] = floatval($tokenData['volume'] ?? 0);
                $data['holders'] = intval($tokenData['numHolders'] ?? 0);
                
                // Use current market price if available, otherwise calculate from market cap
                $currentMarketPrice = floatval($tokenData['currentMarketPrice'] ?? 0);
                if ($currentMarketPrice > 0) {
                    $data['price'] = $currentMarketPrice;
                } else if ($data['marketCap'] > 0) {
                    // Calculate price from market cap (assuming 1B total supply for pump.fun tokens)
                    $data['price'] = $data['marketCap'] / 1000000000; // Rough estimate
                }
                
                // Calculate liquidity for pump.fun tokens
                $bondingProgress = floatval($tokenData['bondingCurveProgress'] ?? 0);
                $marketCap = $data['marketCap'];
                $hasGraduated = isset($tokenData['graduationDate']) && !empty($tokenData['graduationDate']);
                $poolAddress = $tokenData['poolAddress'] ?? null;
                
                error_log("[monitoring-status] PumpFun bondingCurveProgress: $bondingProgress");
                error_log("[monitoring-status] PumpFun marketCap: $marketCap");
                error_log("[monitoring-status] PumpFun hasGraduated: " . ($hasGraduated ? 'YES' : 'NO'));
                error_log("[monitoring-status] PumpFun poolAddress: " . ($poolAddress ?? 'none'));
                
                if ($hasGraduated && !empty($poolAddress)) {
                    // Token has graduated to Raydium - fetch liquidity from the pool
                    try {
                        $liquidityFromPool = fetchRaydiumPoolLiquidity($poolAddress);
                        if ($liquidityFromPool > 0) {
                            $data['liquidity'] = $liquidityFromPool;
                            error_log("[monitoring-status] Fetched Raydium pool liquidity: $liquidityFromPool USD");
                        } else {
                            // No liquidity data available for graduated token
                            $data['liquidity'] = 0;
                            error_log("[monitoring-status] No Raydium pool liquidity data available");
                        }
                    } catch (Exception $e) {
                        error_log("[monitoring-status] Error fetching pool liquidity: " . $e->getMessage());
                        // No liquidity data available
                        $data['liquidity'] = 0;
                    }
                } elseif ($marketCap > 0 && $bondingProgress > 0 && $bondingProgress < 100.0) {
                    // Token still on bonding curve
                    // Bonding curve progress should be 0-1, but might be 0-100
                    $normalizedProgress = $bondingProgress > 1 ? $bondingProgress / 100 : $bondingProgress;
                    
                    // For pump.fun tokens, liquidity calculation:
                    // - The bonding curve starts with 30 SOL virtual liquidity
                    // - At 100% progress, there's 85 SOL in the curve
                    // - Current SOL in curve = 30 + (progress * 55)
                    $solInCurve = 30 + ($normalizedProgress * 55);
                    
                    // Convert SOL to USD (approximate SOL price)
                    $solPriceUSD = 240; // Current approximate SOL price
                    $liquidityUSD = $solInCurve * $solPriceUSD;
                    
                    $data['liquidity'] = $liquidityUSD;
                    error_log("[monitoring-status] Calculated pump.fun bonding curve liquidity: $liquidityUSD USD (SOL in curve: $solInCurve)");
                } elseif ($marketCap > 0) {
                    // For pump.fun tokens without bonding curve data, don't estimate liquidity
                    // It's better to show 0 than a misleading estimate
                    $data['liquidity'] = 0;
                    error_log("[monitoring-status] No bonding curve data for pump.fun token - liquidity unknown");
                } else {
                    error_log("[monitoring-status] Cannot calculate liquidity - no data available");
                    $data['liquidity'] = 0;
                }
                
                $data['source'] = 'pumpfun';
                
                error_log("[monitoring-status] PumpFun final parsed data: " . json_encode($data));
            } else {
                error_log("[monitoring-status] PumpFun API returned no data for token: $tokenMint");
            }
        } else {
            error_log("[monitoring-status] PumpFun API failed with HTTP $httpCode");
        }
    } catch (Exception $e) {
        error_log("[monitoring-status] PumpFun error: " . $e->getMessage());
    }
    
    return $data;
}

/**
 * Fetch real-time token data from external APIs
 */
function fetchRealtimeTokenData($tokenMint) {
    error_log("[monitoring-status] fetchRealtimeTokenData called for $tokenMint");
    
    $data = [
        'price' => 0,
        'liquidity' => 0,
        'marketCap' => 0,
        'volume24h' => 0,
        'holders' => 0,
        'source' => 'none'
    ];
    
    // For pump.fun tokens, strip the 'pump' suffix for DexScreener/Jupiter
    $baseMint = $tokenMint;
    if (preg_match('/pump$/i', $tokenMint)) {
        $baseMint = substr($tokenMint, 0, -4); // Remove 'pump' suffix
        error_log("[monitoring-status] Detected pump.fun token, using base mint: $baseMint for DexScreener/Jupiter");
    }
    
    // Try DexScreener first
    try {
        error_log("[monitoring-status] Attempting DexScreener fetch...");
        $dexUrl = "https://api.dexscreener.com/latest/dex/tokens/{$baseMint}";
        error_log("[monitoring-status] DexScreener URL: $dexUrl");
        $ch = curl_init($dexUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Disable SSL verification for local dev
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // Disable SSL verification for local dev
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: PanicSwap/1.0']);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        error_log("[monitoring-status] DexScreener HTTP code: $httpCode");
        if ($curlError) {
            error_log("[monitoring-status] DexScreener CURL error: $curlError");
        }
        if ($response) {
            error_log("[monitoring-status] DexScreener response length: " . strlen($response));
        }
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            if (isset($result['pairs']) && count($result['pairs']) > 0) {
                // Get the pair with highest liquidity
                $bestPair = null;
                $maxLiquidity = 0;
                foreach ($result['pairs'] as $pair) {
                    $liquidity = floatval($pair['liquidity']['usd'] ?? 0);
                    if ($liquidity > $maxLiquidity) {
                        $maxLiquidity = $liquidity;
                        $bestPair = $pair;
                    }
                }
                
                if ($bestPair) {
                    $data['price'] = floatval($bestPair['priceUsd'] ?? 0);
                    // Handle missing liquidity field
                    if (isset($bestPair['liquidity']['usd'])) {
                        $data['liquidity'] = floatval($bestPair['liquidity']['usd']);
                    } else {
                        // If no liquidity data, leave it as 0 rather than using market cap
                        // Market cap is not a good proxy for liquidity
                        $data['liquidity'] = 0;
                        error_log("[monitoring-status] DexScreener: No liquidity data available for pair");
                    }
                    $data['volume24h'] = floatval($bestPair['volume']['h24'] ?? 0);
                    $data['marketCap'] = floatval($bestPair['fdv'] ?? $bestPair['marketCap'] ?? 0);
                    $data['source'] = 'dexscreener';
                    
                    error_log("[monitoring-status] DexScreener data: Price: {$data['price']}, Liquidity: {$data['liquidity']}, Volume: {$data['volume24h']}, MC: {$data['marketCap']}");
                }
            }
        }
    } catch (Exception $e) {
        error_log("[monitoring-status] DexScreener error: " . $e->getMessage());
    }
    
    // If no price from DexScreener, try Jupiter
    if ($data['price'] == 0) {
        try {
            $jupiterUrl = "https://price.jup.ag/v4/price?ids={$baseMint}";
            error_log("[monitoring-status] Jupiter URL: $jupiterUrl");
            $ch = curl_init($jupiterUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Disable SSL verification for local dev
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // Disable SSL verification for local dev
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: PanicSwap/1.0']);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200 && $response) {
                $result = json_decode($response, true);
                if (isset($result['data'][$baseMint]['price'])) {
                    $data['price'] = floatval($result['data'][$baseMint]['price']);
                    if ($data['source'] === 'none') {
                        $data['source'] = 'jupiter';
                    }
                    
                    error_log("[monitoring-status] Jupiter price: {$data['price']}");
                }
            }
        } catch (Exception $e) {
            error_log("[monitoring-status] Jupiter error: " . $e->getMessage());
        }
    }
    
    // If still no data OR this is a pump.fun token, try PumpFun API with full mint including 'pump'
    if (($data['price'] == 0 && $data['liquidity'] == 0 && $data['marketCap'] == 0) || preg_match('/pump$/i', $tokenMint)) {
        error_log("[monitoring-status] Trying PumpFun API for token: $tokenMint (with full mint including 'pump')");
        $pumpData = fetchPumpFunTokenData($tokenMint);
        if ($pumpData['source'] === 'pumpfun') {
            // For pump.fun tokens, always use PumpFun data if available
            if (preg_match('/pump$/i', $tokenMint)) {
                // Always override with PumpFun data for pump.fun tokens
                $data = $pumpData;
            } else {
                // For other tokens, merge PumpFun data only if missing
                if ($pumpData['price'] > 0 || $data['price'] == 0) {
                    $data['price'] = $pumpData['price'];
                }
                if ($pumpData['liquidity'] > 0 || $data['liquidity'] == 0) {
                    $data['liquidity'] = $pumpData['liquidity'];
                }
                if ($pumpData['marketCap'] > 0 || $data['marketCap'] == 0) {
                    $data['marketCap'] = $pumpData['marketCap'];
                }
                if ($pumpData['volume24h'] > 0 || $data['volume24h'] == 0) {
                    $data['volume24h'] = $pumpData['volume24h'];
                }
                if ($pumpData['holders'] > 0 || $data['holders'] == 0) {
                    $data['holders'] = $pumpData['holders'];
                }
                if ($data['source'] === 'none') {
                    $data['source'] = 'pumpfun';
                }
            }
        }
    }
    
    return $data;
}

/**
 * Trigger backend data population for newly added tokens
 */
function triggerBackendDataPopulation($tokenMint, $walletAddress) {
    try {
        $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
        
        // Use cURL to make async requests
        $mh = curl_multi_init();
        $handles = [];
        
        // Request 1: Populate token data
        $ch1 = curl_init($backendUrl . '/api/tokens/populate-data');
        curl_setopt($ch1, CURLOPT_POST, 1);
        curl_setopt($ch1, CURLOPT_POSTFIELDS, json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress
        ]));
        curl_setopt($ch1, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch1, CURLOPT_TIMEOUT, 2);
        curl_multi_add_handle($mh, $ch1);
        $handles[] = $ch1;
        
        // Request 2: Force monitoring update
        $ch2 = curl_init($backendUrl . '/api/monitoring/force-update');
        curl_setopt($ch2, CURLOPT_POST, 1);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress
        ]));
        curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
        curl_multi_add_handle($mh, $ch2);
        $handles[] = $ch2;
        
        // Execute all requests in parallel
        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);
        
        // Clean up
        foreach ($handles as $ch) {
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);
        
        error_log("[monitoring-status] Triggered backend data population for $tokenMint");
    } catch (Exception $e) {
        error_log("[monitoring-status] Failed to trigger backend population: " . $e->getMessage());
    }
}

/**
 * Calculate risk level from ML probability
 */
function calculateRiskLevel($probability) {
    if ($probability >= 0.8) return 'CRITICAL';
    if ($probability >= 0.6) return 'HIGH';
    if ($probability >= 0.4) return 'MODERATE';
    if ($probability >= 0.2) return 'LOW';
    return 'MINIMAL';
}

/**
 * Calculate badge state for memecoin traders
 * Matches UnifiedBadgeService logic for consistency
 */
function calculateBadgeState($stats, $priceData, $velocityData, $mlData, $protection, $tokenAddedAt = null) {
    // Get sell signal first
    $sellSignal = calculateSellSignal($stats, $priceData, $velocityData);
    
    // Priority order - first match wins (same as UnifiedBadgeService)
    
    // 1. Sell signals (highest priority)
    if ($sellSignal['action'] === 'PANIC_SELL') return 'SELL_NOW';
    if ($sellSignal['action'] === 'SELL') return 'SELL';
    
    // 2. Rugged check - only mark as rugged if liquidity is truly gone
    $currentLiquidity = floatval($priceData['liquidity'] ?? $stats['current_liquidity'] ?? $velocityData['liquidity_usd'] ?? null);
    
    // Only mark as RUGGED if we have explicit liquidity data showing it's gone
    // Don't mark as rugged if liquidity data is simply missing (null/empty)
    if ($currentLiquidity !== null && $currentLiquidity >= 0 && $currentLiquidity < 1) {
        // Less than $1 liquidity AND we have actual data (not missing)
        return 'RUGGED';
    }
    
    // Also check for massive liquidity drop from stats
    if (isset($stats['liquidity_change_5m']) && $stats['liquidity_change_5m'] < -18) {
        // More than 90% drop in 5 minutes
        return 'RUGGED';
    }
    
    // Check for massive liquidity drop (95%+ from peak)
    $peakLiquidity = floatval($stats['peak_liquidity'] ?? 0);
    if ($peakLiquidity > 1000 && $currentLiquidity < ($peakLiquidity * 0.05)) {
        return 'RUGGED';
    }
    
    // 3. Pumping check (>20% in 5m)
    $price5m = floatval($stats['price_change_5m'] ?? $velocityData['price_velocity_5m'] ?? 0);
    if ($price5m > 4) return 'PUMPING'; // >20% in 5 min = 4% per minute
    
    // 4. Volatility check (>10% in 5m)
    if (abs($price5m) > 2) return 'VOLATILE'; // >10% in 5 min
    
    // 5. New token check (before WATCHING to match UnifiedBadgeService)
    $isNew = false;
    if (!empty($tokenAddedAt)) {
        $addedTime = strtotime($tokenAddedAt);
        $fiveMinutesAgo = time() - 300;
        $isNew = $addedTime > $fiveMinutesAgo;
    }
    if ($isNew) return 'NEW';
    
    // 6. Watching state
    // Check multiple sources for monitoring status
    $isMonitoring = false;
    
    // Check protection data
    if (isset($protection['monitoring_active']) && $protection['monitoring_active']) {
        $isMonitoring = true;
    }
    
    // Also check monitoring stats
    if (!$isMonitoring && isset($stats['monitoring_active']) && $stats['monitoring_active']) {
        $isMonitoring = true;
    }
    
    // If we have any protection data at all, consider it as monitoring
    if (!$isMonitoring && !empty($protection)) {
        $isMonitoring = true;
    }
    
    if ($isMonitoring) return 'WATCHING';
    
    // 7. Default - no badge
    return null;
}

/**
 * Calculate sell signal for memecoin traders
 */
function calculateSellSignal($stats, $priceData, $velocityData) {
    $signal = [
        'action' => 'HOLD', // HOLD, SELL, PANIC_SELL
        'confidence' => 0,
        'reason' => '',
        'urgency' => 'low', // low, medium, high, critical
        'timeWindow' => null
    ];
    
    // Get ultra-short velocities (absolute % change)
    $liquidityVel10s = floatval($stats['liquidity_change_10s'] ?? $velocityData['liquidity_10s'] ?? 0);
    $liquidityVel20s = floatval($stats['liquidity_change_20s'] ?? $velocityData['liquidity_20s'] ?? 0);
    $liquidityVel30s = floatval($stats['liquidity_change_30s'] ?? $velocityData['liquidity_30s'] ?? 0);
    $priceVel10s = floatval($stats['price_change_10s'] ?? $velocityData['price_10s'] ?? 0);
    $priceVel20s = floatval($stats['price_change_20s'] ?? $velocityData['price_20s'] ?? 0);
    $priceVel30s = floatval($stats['price_change_30s'] ?? $velocityData['price_30s'] ?? 0);
    
    // Get standard velocities (per minute rates)
    $liquidityVel1m = floatval($stats['liquidity_change_1m'] ?? $velocityData['liquidity_velocity_1m'] ?? 0);
    $liquidityVel5m = floatval($stats['liquidity_change_5m'] ?? $velocityData['liquidity_velocity_5m'] ?? 0);
    $creatorVel5m = floatval($stats['creator_change_5m'] ?? 0);
    $creatorBalance = floatval($stats['creator_balance_percent'] ?? 0);
    $mlProbability = floatval($stats['ml_probability'] ?? $velocityData['ml_probability'] ?? 0);
    $activePatterns = $stats['active_patterns'] ?? [];
    
    // PANIC SELL conditions - Ultra-fast detection first
    if ($liquidityVel10s < -50) { // >50% liquidity gone in 10 seconds!
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 100,
            'reason' => 'FLASH RUG: 50% liquidity vanished in 10 seconds!',
            'urgency' => 'critical',
            'timeWindow' => '10s'
        ];
    }
    else if ($liquidityVel20s < -70) { // >70% liquidity gone in 20 seconds
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 100,
            'reason' => 'FLASH RUG: 70% liquidity drained in 20 seconds!',
            'urgency' => 'critical',
            'timeWindow' => '20s'
        ];
    }
    else if ($liquidityVel30s < -30 && $priceVel30s < -20) { // Rapid collapse
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 98,
            'reason' => 'Market collapse: 30% liquidity + 20% price drop in 30 seconds',
            'urgency' => 'critical',
            'timeWindow' => '30s'
        ];
    }
    else if ($liquidityVel5m < -18) { // >90% liquidity gone in 5 min
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 95,
            'reason' => 'Liquidity collapsed - definite rug',
            'urgency' => 'critical',
            'timeWindow' => '5m'
        ];
    }
    // Flash rug detected
    else if (in_array('FLASH_RUG_DETECTED', $activePatterns) || $liquidityVel1m < -15) {
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 95,
            'reason' => 'Flash rug in progress',
            'urgency' => 'critical',
            'timeWindow' => '1m'
        ];
    }
    // Creator dumping most of their stack
    else if ($creatorVel5m < -10 && $creatorBalance < 10) {
        $signal = [
            'action' => 'PANIC_SELL',
            'confidence' => 90,
            'reason' => 'Creator dumping remaining tokens',
            'urgency' => 'critical',
            'timeWindow' => '5m'
        ];
    }
    // SELL conditions - Fast detection
    else if ($liquidityVel1m < -10) { // >10% liquidity per minute
        $signal = [
            'action' => 'SELL',
            'confidence' => 90,
            'reason' => 'Rapid drain: ' . abs($liquidityVel1m) . '% liquidity/min',
            'urgency' => 'high',
            'timeWindow' => '1m'
        ];
    }
    else if ($liquidityVel5m < -10) { // 50% liquidity drop in 5m
        $signal = [
            'action' => 'SELL',
            'confidence' => 85,
            'reason' => 'Liquidity down 50% - high risk',
            'urgency' => 'high',
            'timeWindow' => '5m'
        ];
    }
    // High ML probability with any negative velocity
    else if ($mlProbability > 0.8 && $liquidityVel5m < -2) {
        $signal = [
            'action' => 'SELL',
            'confidence' => 80,
            'reason' => 'ML predicts rug + liquidity dropping',
            'urgency' => 'high',
            'timeWindow' => '5m'
        ];
    }
    // Sustained drain pattern
    else if (in_array('SUSTAINED_DRAIN', $activePatterns) || $liquidityVel5m < -5) {
        $signal = [
            'action' => 'SELL',
            'confidence' => 75,
            'reason' => 'Sustained liquidity drain detected',
            'urgency' => 'medium',
            'timeWindow' => '5m'
        ];
    }
    // Very high ML probability alone
    else if ($mlProbability > 0.85) {
        $signal = [
            'action' => 'SELL',
            'confidence' => 70,
            'reason' => 'AI predicts imminent rug',
            'urgency' => 'medium',
            'timeWindow' => 'ML'
        ];
    }
    
    return $signal;
}

/**
 * Fetch liquidity from Raydium pool for graduated pump.fun tokens
 */
function fetchRaydiumPoolLiquidity($poolAddress) {
    try {
        error_log("[monitoring-status] Fetching Raydium pool liquidity for pool: $poolAddress");
        
        // Try Raydium API v3 for pool info
        $raydiumUrl = "https://api-v3.raydium.io/pools/info/ids?ids={$poolAddress}";
        error_log("[monitoring-status] Raydium API URL: $raydiumUrl");
        
        $ch = curl_init($raydiumUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            'User-Agent: PanicSwap/1.0'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        error_log("[monitoring-status] Raydium API HTTP code: $httpCode");
        if ($curlError) {
            error_log("[monitoring-status] Raydium API CURL error: $curlError");
        }
        
        if ($httpCode === 200 && $response) {
            error_log("[monitoring-status] Raydium API response length: " . strlen($response));
            $result = json_decode($response, true);
            
            if (isset($result['success']) && $result['success'] && isset($result['data']) && count($result['data']) > 0) {
                $poolData = $result['data'][0];
                
                // Extract TVL (Total Value Locked) which represents liquidity
                $liquidity = floatval($poolData['tvl'] ?? 0);
                
                error_log("[monitoring-status] Raydium pool liquidity found: $liquidity USD");
                return $liquidity;
            } else {
                error_log("[monitoring-status] Raydium API returned no pool data or error");
            }
        } else {
            error_log("[monitoring-status] Raydium API failed with HTTP $httpCode");
        }
        
        return 0;
    } catch (Exception $e) {
        error_log("[monitoring-status] Raydium pool liquidity fetch error: " . $e->getMessage());
        return 0;
    }
}

/**
 * Handle batch requests for multiple tokens - Ultra-optimized for speed
 */
function handleBatchRequest($tokens) {
    global $supabase;
    
    // Limit batch size for performance
    $tokens = array_slice($tokens, 0, 50);
    
    // Start streaming response immediately
    header('X-Content-Type-Options: nosniff');
    header('Transfer-Encoding: chunked');
    
    echo "["; // Start JSON array
    
    $first = true;
    foreach ($tokens as $token) {
        if (!$first) echo ",";
        $first = false;
        
        // Get critical data only for speed
        $data = getMinimalTokenData($token);
        echo json_encode($data);
        
        // Flush output immediately
        ob_flush();
        flush();
    }
    
    echo "]"; // End JSON array
    ob_end_flush();
}

/**
 * Get minimal token data for ultra-fast response
 */
function getMinimalTokenData($tokenMint) {
    global $supabase;
    
    // Fetch only critical fields for speed
    $tokenData = $supabase
        ->from('token_metadata')
        ->select('mint, symbol, name, image_uri')
        ->eq('mint', $tokenMint)
        ->single()
        ->execute();
    
    $priceData = $supabase
        ->from('token_prices')
        ->select('price_usd, price_change_24h, liquidity_usd, market_cap_usd')
        ->eq('token_mint', $tokenMint)
        ->order('timestamp', ['ascending' => false])
        ->limit(1)
        ->execute();
    
    $riskData = $supabase
        ->from('ml_risk_predictions')
        ->select('risk_score')
        ->eq('token_mint', $tokenMint)
        ->order('created_at', ['ascending' => false])
        ->limit(1)
        ->execute();
    
    $price = $priceData->data[0] ?? null;
    $risk = $riskData->data[0] ?? null;
    
    return [
        'mint' => $tokenMint,
        'symbol' => $tokenData->data->symbol ?? '',
        'name' => $tokenData->data->name ?? '',
        'imageUri' => $tokenData->data->image_uri ?? '',
        'priceUsd' => $price ? floatval($price->price_usd) : 0,
        'priceChange24h' => $price ? floatval($price->price_change_24h) : 0,
        'liquidity' => $price ? floatval($price->liquidity_usd) : 0,
        'marketCap' => $price ? floatval($price->market_cap_usd) : 0,
        'riskScore' => $risk ? floatval($risk->risk_score) : null,
        'timestamp' => time()
    ];
}

/**
 * Calculate hybrid risk score
 */
function calculateHybridRisk($ruleBasedRisk, $mlProbability) {
    // Weight ML predictions more heavily (60/40 split)
    $hybridRisk = (0.4 * $ruleBasedRisk * 100) + (0.6 * $mlProbability * 100);
    return min(100, max(0, $hybridRisk));
}
