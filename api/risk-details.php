<?php
require_once '../config/supabase.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get token mint from request
$tokenMint = $_GET['mint'] ?? null;

if (!$tokenMint) {
    http_response_code(400);
    echo json_encode(['error' => 'Token mint required']);
    exit;
}

try {
    // Initialize Supabase client
    $supabase = getSupabaseClient();
    
    // Fetch comprehensive risk data
    $rugcheckResponse = $supabase->from('rugcheck_reports')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->single();
    
    $mlResponse = $supabase->from('ml_risk_analysis')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->single();
    
    $securityResponse = $supabase->from('token_security_analysis')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->single();
    
    $velocityResponse = $supabase->from('liquidity_velocity')
        ->select('*')
        ->eq('token_mint', $tokenMint)
        ->order('timestamp', ['ascending' => false])
        ->limit(1);
    
    $rugcheck = $rugcheckResponse->data ?? null;
    $mlAnalysis = $mlResponse->data ?? null;
    $security = $securityResponse->data ?? null;
    $velocity = !empty($velocityResponse->data) ? $velocityResponse->data[0] : null;
    
    // Build detailed risk response
    $riskDetails = [
        'token_mint' => $tokenMint,
        'overall_risk' => [
            'level' => $mlAnalysis['risk_level'] ?? $rugcheck['risk_level'] ?? 'UNKNOWN',
            'score' => $mlAnalysis['risk_score'] ?? $rugcheck['risk_score'] ?? 50,
            'confidence' => $mlAnalysis['ml_confidence'] ?? 0
        ],
        'ml_analysis' => [
            'ml_score' => $mlAnalysis['ml_risk_score'] ?? null,
            'rule_score' => $mlAnalysis['rule_risk_score'] ?? null,
            'time_to_rug' => $mlAnalysis['ml_time_to_rug'] ?? null,
            'recommendation' => $mlAnalysis['ml_recommendation'] ?? 'Monitor closely',
            'detected_patterns' => $mlAnalysis['detected_patterns'] ?? [],
            'last_updated' => $mlAnalysis['updated_at'] ?? null
        ],
        'rugcheck_data' => [
            'risk_score' => $rugcheck['risk_score'] ?? null,
            'liquidity' => $rugcheck['liquidity_current'] ?? 0,
            'holders' => $rugcheck['holders'] ?? 0,
            'dev_activity' => $rugcheck['dev_activity_pct'] ?? 0,
            'creator_balance' => $rugcheck['creator_balance_percent'] ?? 0,
            'lp_locked' => $rugcheck['lp_locked'] ?? 0,
            'market_cap' => $rugcheck['market_cap'] ?? 0,
            'last_checked' => $rugcheck['last_checked'] ?? null
        ],
        'security_analysis' => [
            'mint_renounced' => $security['mint_renounced'] ?? null,
            'freeze_renounced' => $security['freeze_renounced'] ?? null,
            'lp_locked' => $security['lp_locked'] ?? null,
            'lp_lock_percent' => $security['lp_lock_percent'] ?? 0,
            'lp_unlock_date' => $security['lp_unlock_date'] ?? null,
            'is_honeypot' => $security['is_honeypot'] ?? null,
            'buy_tax' => $security['tax_buy'] ?? null,
            'sell_tax' => $security['tax_sell'] ?? null,
            'is_blocklisted' => $security['is_blocklisted'] ?? null,
            'checked_at' => $security['checked_at'] ?? null
        ],
        'velocity_data' => [
            'liquidity_5m' => $velocity['liquidity_velocity_5m'] ?? null,
            'liquidity_30m' => $velocity['liquidity_velocity_30m'] ?? null,
            'price_5m' => $velocity['price_velocity_5m'] ?? null,
            'price_30m' => $velocity['price_velocity_30m'] ?? null,
            'flash_rug_alert' => $velocity['flash_rug_alert'] ?? false,
            'rapid_drain_alert' => $velocity['rapid_drain_alert'] ?? false,
            'timestamp' => $velocity['timestamp'] ?? null
        ],
        'data_sources' => [
            'rugcheck' => $rugcheck !== null,
            'ml_analysis' => $mlAnalysis !== null,
            'security' => $security !== null,
            'velocity' => $velocity !== null
        ]
    ];
    
    echo json_encode($riskDetails, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log('Risk details error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch risk details']);
}
?>