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

// Get wallet address from request
$walletAddress = $_GET['wallet'] ?? null;

if (!$walletAddress) {
    http_response_code(400);
    echo json_encode(['error' => 'Wallet address required']);
    exit;
}

try {
    // Initialize Supabase client
    $supabase = getSupabaseClient();
    
    // Fetch wallet tokens with all related data
    $response = $supabase->from('wallet_tokens')
        ->select('
            token_mint,
            balance,
            decimals,
            token_metadata (
                symbol,
                name,
                logo_uri,
                current_price,
                price_24h_change,
                market_cap,
                holder_count
            ),
            rugcheck_reports (
                risk_score,
                risk_level,
                liquidity_current,
                holders,
                dev_activity_pct,
                lp_locked,
                market_cap,
                creator_balance_percent
            ),
            ml_risk_analysis (
                risk_score,
                risk_level,
                ml_risk_score,
                ml_confidence,
                ml_recommendation,
                ml_time_to_rug,
                detected_patterns
            ),
            token_security_analysis (
                mint_renounced,
                freeze_renounced,
                lp_locked,
                lp_lock_percent,
                is_honeypot,
                tax_buy,
                tax_sell,
                is_blocklisted
            )
        ')
        ->eq('wallet_address', $walletAddress);
    
    $walletTokens = $response->data ?? [];
    
    // Transform data for frontend
    $tokens = [];
    foreach ($walletTokens as $token) {
        $metadata = $token['token_metadata'] ?? [];
        $rugcheck = $token['rugcheck_reports'] ?? [];
        $mlAnalysis = $token['ml_risk_analysis'] ?? [];
        $security = $token['token_security_analysis'] ?? [];
        
        // Calculate value
        $price = $metadata['current_price'] ?? 0;
        $balance = $token['balance'] ?? 0;
        $decimals = $token['decimals'] ?? 9;
        $actualBalance = $balance / pow(10, $decimals);
        $value = $actualBalance * $price;
        
        // Determine risk level and score
        $riskLevel = $mlAnalysis['risk_level'] ?? $rugcheck['risk_level'] ?? 'UNKNOWN';
        $riskScore = $mlAnalysis['risk_score'] ?? $rugcheck['risk_score'] ?? 50;
        $mlScore = $mlAnalysis['ml_risk_score'] ?? null;
        $confidence = $mlAnalysis['ml_confidence'] ?? 0;
        
        // Build token data
        $tokenData = [
            'mint' => $token['token_mint'],
            'symbol' => $metadata['symbol'] ?? 'UNKNOWN',
            'name' => $metadata['name'] ?? 'Unknown Token',
            'logo' => $metadata['logo_uri'] ?? null,
            'balance' => $actualBalance,
            'price' => $price,
            'value' => $value,
            'price_change_24h' => $metadata['price_24h_change'] ?? 0,
            'risk_level' => $riskLevel,
            'risk_score' => $riskScore,
            'ml_score' => $mlScore,
            'ml_confidence' => $confidence,
            'detected_patterns' => $mlAnalysis['detected_patterns'] ?? [],
            'liquidity' => $rugcheck['liquidity_current'] ?? 0,
            'holders' => $rugcheck['holders'] ?? $metadata['holder_count'] ?? 0,
            'dev_activity' => $rugcheck['dev_activity_pct'] ?? 0,
            'creator_balance' => $rugcheck['creator_balance_percent'] ?? 0,
            'lp_locked' => $security['lp_locked'] ?? false,
            'lp_lock_percent' => $security['lp_lock_percent'] ?? 0,
            'mint_renounced' => $security['mint_renounced'] ?? false,
            'is_honeypot' => $security['is_honeypot'] ?? false,
            'buy_tax' => $security['tax_buy'] ?? 0,
            'sell_tax' => $security['tax_sell'] ?? 0,
            'is_protected' => false, // Would need to check protection status
            'market_cap' => $rugcheck['market_cap'] ?? $metadata['market_cap'] ?? 0
        ];
        
        $tokens[] = $tokenData;
    }
    
    // Sort by value descending
    usort($tokens, function($a, $b) {
        return $b['value'] <=> $a['value'];
    });
    
    // Calculate stats
    $totalValue = array_sum(array_column($tokens, 'value'));
    $protectedCount = count(array_filter($tokens, function($t) { return $t['is_protected']; }));
    $highRiskCount = count(array_filter($tokens, function($t) { 
        return in_array($t['risk_level'], ['HIGH', 'CRITICAL']); 
    }));
    
    // Get SOL balance
    $solToken = array_filter($tokens, function($t) { 
        return $t['mint'] === 'So11111111111111111111111111111111111111112'; 
    });
    $solBalance = !empty($solToken) ? array_values($solToken)[0]['balance'] : 0;
    
    // Build response
    $dashboardData = [
        'stats' => [
            'portfolioValue' => round($totalValue, 2),
            'protectedTokens' => $protectedCount,
            'totalTokens' => count($tokens),
            'activeAlerts' => $highRiskCount,
            'solBalance' => round($solBalance, 4),
            'solSaved' => 0, // Would need to track actual saves
            'rugsAvoided' => 0, // Would need to track actual protections
            'activeMonitors' => $protectedCount
        ],
        'tokens' => $tokens,
        'alerts' => [], // Would need to fetch from alerts table
        'recentActivity' => [] // Would need to fetch from activity log
    ];
    
    echo json_encode($dashboardData);
    
} catch (Exception $e) {
    error_log('Dashboard error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch dashboard data']);
}
?>