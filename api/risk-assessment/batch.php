<?php
/**
 * Batch Risk Assessment API
 * Provides risk data for multiple tokens when WebSocket fails
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get request body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['tokens']) || !is_array($data['tokens'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request format. Expected: {"tokens": ["mint1", "mint2", ...]}']);
        exit;
    }
    
    $tokenMints = $data['tokens'];
    $includeMl = $data['include_ml'] ?? true;
    $includeMonitoring = $data['include_monitoring'] ?? true;
    
    if (empty($tokenMints)) {
        echo json_encode([]);
        exit;
    }
    
    // Load Supabase config
    require_once __DIR__ . '/../../config/supabase.php';
    
    // Use the defined constants
    $SUPABASE_URL = SUPABASE_URL;
    $SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    
    $results = [];
    
    foreach ($tokenMints as $tokenMint) {
        if (!$tokenMint || !is_string($tokenMint)) continue;
        
        $tokenResult = [
            'token_mint' => $tokenMint,
            'ml_risk' => null,
            'monitoring_risk' => null,
            'token_data' => null
        ];
        
        // Fetch ML risk data
        if ($includeMl) {
            $mlRisk = fetchMLRiskData($tokenMint);
            if ($mlRisk) {
                $tokenResult['ml_risk'] = $mlRisk;
            }
        }
        
        // Fetch monitoring risk data
        if ($includeMonitoring) {
            $monitoringRisk = fetchMonitoringRiskData($tokenMint);
            if ($monitoringRisk) {
                $tokenResult['monitoring_risk'] = $monitoringRisk;
            }
        }
        
        // Fetch token data
        $tokenData = fetchTokenData($tokenMint);
        if ($tokenData) {
            $tokenResult['token_data'] = $tokenData;
        }
        
        // If no risk data found, provide a basic fallback
        if (!$tokenResult['ml_risk'] && !$tokenResult['monitoring_risk'] && !$tokenResult['token_data']) {
            $tokenResult['token_data'] = [
                'risk_level' => 'Moderate',
                'risk_score' => 25,
                'status' => 'ACTIVE',
                'honeypot_status' => 'UNKNOWN',
                'lp_locked_pct' => 0,
                'holder_count' => 0,
                'updated_at' => date('c')
            ];
        }
        
        $results[] = $tokenResult;
    }
    
    echo json_encode($results);
    
} catch (Exception $e) {
    error_log("Batch Risk Assessment API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Fetch ML risk data for a token
 */
function fetchMLRiskData($tokenMint) {
    global $SUPABASE_URL, $SUPABASE_ANON_KEY;
    
    $url = "$SUPABASE_URL/rest/v1/ml_risk_predictions?token_mint=eq.$tokenMint&order=created_at.desc&limit=1";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer $SUPABASE_ANON_KEY",
                "apikey: $SUPABASE_ANON_KEY",
                "Content-Type: application/json"
            ]
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (empty($data)) {
        return null;
    }
    
    $latest = $data[0];
    
    return [
        'risk_level' => $latest['risk_level'],
        'risk_score' => $latest['risk_score'],
        'confidence' => $latest['confidence'],
        'model_version' => $latest['model_version'],
        'updated_at' => $latest['created_at']
    ];
}

/**
 * Fetch monitoring risk data for a token
 */
function fetchMonitoringRiskData($tokenMint) {
    global $SUPABASE_URL, $SUPABASE_ANON_KEY;
    
    $url = "$SUPABASE_URL/rest/v1/monitoring_alerts?token_mint=eq.$tokenMint&status=eq.active&order=created_at.desc";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer $SUPABASE_ANON_KEY",
                "apikey: $SUPABASE_ANON_KEY",
                "Content-Type: application/json"
            ]
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    $alerts = json_decode($response, true);
    
    if (empty($alerts)) {
        // No active alerts = Safe
        return [
            'risk_level' => 'Safe',
            'risk_score' => 0,
            'active_alerts' => [],
            'last_check' => date('c'),
            'updated_at' => date('c')
        ];
    }
    
    // Calculate risk from active alerts
    $maxRiskScore = 0;
    $riskLevel = 'Safe';
    
    foreach ($alerts as $alert) {
        $alertScore = $alert['risk_score'] ?? 0;
        if ($alertScore > $maxRiskScore) {
            $maxRiskScore = $alertScore;
            $riskLevel = $alert['risk_level'] ?? 'Unknown';
        }
    }
    
    return [
        'risk_level' => $riskLevel,
        'risk_score' => $maxRiskScore,
        'active_alerts' => $alerts,
        'last_check' => date('c'),
        'updated_at' => $alerts[0]['created_at'] ?? date('c')
    ];
}

/**
 * Fetch basic token data
 */
function fetchTokenData($tokenMint) {
    global $SUPABASE_URL, $SUPABASE_ANON_KEY;
    
    $url = "$SUPABASE_URL/rest/v1/tokens?mint=eq.$tokenMint&limit=1";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer $SUPABASE_ANON_KEY",
                "apikey: $SUPABASE_ANON_KEY",
                "Content-Type: application/json"
            ]
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (empty($data)) {
        return null;
    }
    
    $token = $data[0];
    
    return [
        'risk_level' => $token['risk_level'] ?? 'Unknown',
        'risk_score' => $token['risk_score'] ?? null,
        'status' => $token['status'] ?? 'ACTIVE',
        'honeypot_status' => $token['honeypot_status'] ?? 'UNKNOWN',
        'lp_locked_pct' => $token['lp_locked_pct'] ?? 0,
        'holder_count' => $token['holder_count'] ?? 0,
        'updated_at' => $token['updated_at'] ?? date('c')
    ];
}
?>
