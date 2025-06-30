<?php
/**
 * Batch Token Data API v2
 * Direct endpoint for batch token fetching
 */

// Enable error display for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set up error handler
set_error_handler(function($severity, $message, $file, $line) {
    error_log("[batch-v2] PHP Error: $message in $file on line $line");
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $message,
        'file' => basename($file),
        'line' => $line
    ]);
    exit;
});

// Start output buffering FIRST before any potential output
ob_start();

// Clear any previous output
if (ob_get_level() > 1) {
    ob_end_clean();
    ob_start();
}

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

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Debug: Log the request
error_log('[batch-v2] Starting request processing');

// Load configuration
try {
    require_once __DIR__ . '/../../config/supabase.php';
    error_log('[batch-v2] Supabase config loaded');
} catch (Exception $e) {
    error_log('[batch-v2] Failed to load supabase config: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load configuration', 'details' => $e->getMessage()]);
    exit;
}

// Check if function exists
if (!function_exists('Supabase\getSupabaseServiceClient')) {
    error_log('[batch-v2] getSupabaseServiceClient function not found');
    http_response_code(500);
    echo json_encode(['error' => 'Supabase client function not available']);
    exit;
}

use function Supabase\getSupabaseServiceClient;

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
error_log('[batch-v2] Request data: ' . json_encode($input));

$tokenMints = $input['tokens'] ?? [];
$walletAddress = $input['wallet'] ?? $_SERVER['HTTP_X_WALLET_ADDRESS'] ?? null;

if (!$walletAddress || empty($tokenMints)) {
    error_log('[batch-v2] Missing required parameters - wallet: ' . $walletAddress . ', tokens: ' . count($tokenMints));
    http_response_code(400);
    echo json_encode(['error' => 'Wallet address and tokens array required']);
    exit;
}

// Limit batch size
$tokenMints = array_slice($tokenMints, 0, 50);
error_log('[batch-v2] Processing ' . count($tokenMints) . ' tokens for wallet: ' . $walletAddress);

try {
    $supabase = getSupabaseServiceClient();
    error_log('[batch-v2] Supabase client created successfully');
    
    // Process in parallel for better performance
    $results = [];
    
    // Try batch fetch from materialized view first
    try {
        error_log('[batch-v2] Attempting to query token_dashboard_view');
        $viewResp = $supabase->from('token_dashboard_view')
            ->select('*')
            ->eq('wallet_address', $walletAddress)
            ->in('token_mint', $tokenMints)
            ->execute();
        error_log('[batch-v2] View query completed');
    } catch (Exception $e) {
        error_log('[batch-v2] View query exception: ' . $e->getMessage());
        $viewResp = null;
    }
    
    // Check if view exists (if error contains "relation does not exist")
    $useView = true;
    if (!$viewResp || ($viewResp->error && strpos($viewResp->error->message ?? '', 'relation') !== false)) {
        error_log('[batch-v2] Materialized view not found, falling back to regular queries');
        $useView = false;
    }
    
    if ($useView && $viewResp->data) {
        // Create a map for easy lookup
        $tokenDataMap = [];
        foreach ($viewResp->data as $row) {
            $tokenDataMap[$row->token_mint] = $row;
        }
        
        // Process each requested token
        foreach ($tokenMints as $tokenMint) {
            if (isset($tokenDataMap[$tokenMint])) {
                $viewData = (array)$tokenDataMap[$tokenMint];
                
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
                
                // Simple risk calculation
                $riskScore = 0;
                if (isset($data['mlAnalysis']['rugProbability'])) {
                    $riskScore = max($riskScore, $data['mlAnalysis']['rugProbability'] * 100);
                }
                if (($data['monitoring']['liquidityChange5m'] ?? 0) < -10) {
                    $riskScore = max($riskScore, 80);
                }
                
                $data['risk'] = [
                    'score' => $riskScore,
                    'level' => $riskScore >= 80 ? 'CRITICAL' : ($riskScore >= 60 ? 'HIGH' : ($riskScore >= 40 ? 'MODERATE' : ($riskScore >= 20 ? 'LOW' : 'MINIMAL'))),
                    'factors' => []
                ];
                
                // Simple badge state
                $data['badgeState'] = null;
                if ($data['liquidity'] < 1) {
                    $data['badgeState'] = 'RUGGED';
                } elseif ($data['monitoring']['alerts']['flashRug'] ?? false) {
                    $data['badgeState'] = 'SELL_NOW';
                } elseif (($data['monitoring']['liquidityChange5m'] ?? 0) < -10) {
                    $data['badgeState'] = 'SELL';
                }
                
                $results[] = $data;
            } else {
                // Token not found in view, return minimal data
                $results[] = [
                    'tokenMint' => $tokenMint,
                    'walletAddress' => $walletAddress,
                    'error' => 'Token not found',
                    'symbol' => 'UNKNOWN',
                    'name' => 'Unknown Token',
                    'price' => 0,
                    'balance' => 0,
                    'userValue' => 0
                ];
            }
        }
    } elseif (!$useView) {
        // Fallback to regular queries when view doesn't exist
        // Get wallet tokens
        $walletTokensResp = $supabase->from('wallet_tokens')
            ->select('token_mint, balance, decimals, is_test_token, added_at')
            ->eq('wallet_address', $walletAddress)
            ->in('token_mint', $tokenMints)
            ->execute();
        
        $walletTokenMap = [];
        if ($walletTokensResp->data) {
            foreach ($walletTokensResp->data as $wt) {
                $walletTokenMap[$wt->token_mint] = $wt;
            }
        }
        
        // Get token metadata
        $metadataResp = $supabase->from('token_metadata')
            ->select('mint, symbol, name, logo_uri, verified, created_at')
            ->in('mint', $tokenMints)
            ->execute();
        
        $metadataMap = [];
        if ($metadataResp->data) {
            foreach ($metadataResp->data as $md) {
                $metadataMap[$md->mint] = $md;
            }
        }
        
        // Get prices
        $priceResp = $supabase->from('token_prices')
            ->select('token_mint, price, price_usd, liquidity, volume_24h, change_24h, market_cap')
            ->in('token_mint', $tokenMints)
            ->execute();
        
        $priceMap = [];
        if ($priceResp->data) {
            foreach ($priceResp->data as $pr) {
                $priceMap[$pr->token_mint] = $pr;
            }
        }
        
        // Build results
        foreach ($tokenMints as $tokenMint) {
            $walletToken = isset($walletTokenMap[$tokenMint]) ? $walletTokenMap[$tokenMint] : null;
            $metadata = isset($metadataMap[$tokenMint]) ? $metadataMap[$tokenMint] : null;
            $price = isset($priceMap[$tokenMint]) ? $priceMap[$tokenMint] : null;
            
            $balance = $walletToken ? floatval($walletToken->balance ?? 0) : 0;
            $decimals = $walletToken ? intval($walletToken->decimals ?? 9) : 9;
            $priceUsd = 0;
            if ($price) {
                $priceUsd = floatval($price->price_usd ?? $price->price ?? 0);
            }
            $userBalance = $decimals > 0 ? $balance / pow(10, $decimals) : 0;
            $userValue = $userBalance * $priceUsd;
            
            $results[] = [
                'tokenMint' => $tokenMint,
                'walletAddress' => $walletAddress,
                'lastUpdate' => date('c'),
                'balance' => $balance,
                'decimals' => $decimals,
                'userBalance' => $userBalance,
                'userValue' => $userValue,
                'isTestToken' => $walletToken ? ($walletToken->is_test_token ?? false) : false,
                'isNewlyAdded' => false,
                'addedAt' => $walletToken ? ($walletToken->added_at ?? null) : null,
                'symbol' => $metadata ? ($metadata->symbol ?? 'UNKNOWN') : 'UNKNOWN',
                'name' => $metadata ? ($metadata->name ?? 'Unknown Token') : 'Unknown Token',
                'logoUrl' => $metadata ? ($metadata->logo_uri ?? null) : null,
                'verified' => $metadata ? ($metadata->verified ?? false) : false,
                'createdAt' => $metadata ? ($metadata->created_at ?? null) : null,
                'price' => $priceUsd,
                'priceChange24h' => $price ? floatval($price->change_24h ?? 0) : 0,
                'liquidity' => $price ? floatval($price->liquidity ?? 0) : 0,
                'volume24h' => $price ? floatval($price->volume_24h ?? 0) : 0,
                'marketCap' => $price ? floatval($price->market_cap ?? 0) : 0,
                'monitoring' => [
                    'active' => false,
                    'priceChange1m' => 0,
                    'priceChange5m' => 0,
                    'liquidityChange1m' => 0,
                    'liquidityChange5m' => 0,
                    'alerts' => [
                        'flashRug' => false,
                        'rapidDrain' => false
                    ]
                ],
                'protection' => [
                    'isActive' => false,
                    'monitoringActive' => false,
                    'alertsCount' => 0,
                    'lastThreatDetected' => null
                ],
                'mlAnalysis' => null,
                'risk' => [
                    'score' => 0,
                    'level' => 'UNKNOWN',
                    'factors' => []
                ],
                'badgeState' => null
            ];
        }
    } else {
        // No data from view, return empty results
        foreach ($tokenMints as $tokenMint) {
            $results[] = [
                'tokenMint' => $tokenMint,
                'walletAddress' => $walletAddress,
                'error' => 'No data available',
                'symbol' => 'UNKNOWN',
                'name' => 'Unknown Token',
                'price' => 0,
                'balance' => 0,
                'userValue' => 0
            ];
        }
    }
    
    echo json_encode(['tokens' => $results]);
    
} catch (Exception $e) {
    error_log('[batch-v2] Exception caught: ' . $e->getMessage());
    error_log('[batch-v2] Stack trace: ' . $e->getTraceAsString());
    
    // Clear any output
    ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error', 
        'message' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => basename($e->getFile())
    ]);
    exit;
}

// Make sure to send clean JSON output
$output = ob_get_contents();
ob_end_clean();

// Check if output is valid JSON
if ($output && json_decode($output) === null && json_last_error() !== JSON_ERROR_NONE) {
    error_log('[batch-v2] Invalid JSON output detected');
    http_response_code(500);
    echo json_encode(['error' => 'Invalid response format']);
} else {
    echo $output;
}