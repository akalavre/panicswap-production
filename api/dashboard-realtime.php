<?php
require_once '../config.php';
require_once 'supabase-config.php';

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

// Initialize Supabase client
$supabase = new SupabaseClient();

// Initialize response data
$dashboardData = [
    'stats' => [
        'portfolioValue' => 0,
        'protectedTokens' => 0,
        'totalTokens' => 0,
        'activeAlerts' => 0,
        'solBalance' => 0,
        'solSaved' => 0,
        'rugsAvoided' => 0,
        'activeMonitors' => 0
    ],
    'alerts' => [],
    'protectedTokens' => [],
    'recentActivity' => [],
    'realtime' => true
];

try {
    // Get user from Supabase
    $user = $supabase->getUserByWallet($walletAddress);
    
    if ($user) {
        // Get protected tokens from Supabase
        $protectedTokens = $supabase->getProtectedTokens($user['id']);
        $dashboardData['stats']['protectedTokens'] = count($protectedTokens);
        $dashboardData['stats']['activeMonitors'] = count($protectedTokens);
        
        // Get wallet notifications/alerts
        $alerts = $supabase->getWalletAlerts($walletAddress, 10);
        $dashboardData['stats']['activeAlerts'] = count(array_filter($alerts, function($alert) {
            return $alert['read_at'] === null;
        }));
        
        // Format protected tokens
        foreach ($protectedTokens as $token) {
            $dashboardData['protectedTokens'][] = [
                'id' => $token['id'],
                'symbol' => $token['token_symbol'] ?? 'Unknown',
                'name' => $token['token_name'] ?? 'Unknown Token',
                'mint' => $token['token_mint'],
                'balance' => $token['balance'] ?? '0',
                'value' => $token['value_usd'] ?? 0,
                'price' => $token['current_price'] ?? 0,
                'change24h' => $token['price_change_24h'] ?? 0,
                'status' => $token['monitoring_enabled'] ? 'active' : 'paused',
                'protection' => $token['monitoring_enabled'] ? 'enabled' : 'disabled',
                'riskLevel' => $token['risk_level'] ?? 'unknown',
                'liquidityLocked' => $token['liquidity_locked'] ?? false,
                'mintAuthority' => $token['mint_authority_status'] ?? 'unknown',
                'lastChecked' => strtotime($token['last_checked'] ?? 'now'),
                'protectedAt' => strtotime($token['created_at'])
            ];
        }
        
        // Format alerts
        foreach ($alerts as $alert) {
            $alertType = 'info';
            if ($alert['priority'] === 'critical') $alertType = 'error';
            elseif ($alert['priority'] === 'high') $alertType = 'warning';
            elseif (strpos($alert['message'], 'success') !== false) $alertType = 'success';
            
            $dashboardData['alerts'][] = [
                'id' => $alert['id'],
                'type' => $alertType,
                'title' => $alert['title'],
                'message' => $alert['message'],
                'timestamp' => strtotime($alert['created_at']),
                'autoHide' => $alert['priority'] === 'critical' ? 0 : 5000,
                'read' => $alert['read_at'] !== null
            ];
        }
        
        // Get system alerts
        $systemAlerts = $supabase->getSystemAlerts(5);
        foreach ($systemAlerts as $alert) {
            $dashboardData['alerts'][] = [
                'id' => 'system_' . $alert['id'],
                'type' => $alert['alert_type'] ?? 'info',
                'title' => $alert['title'],
                'message' => $alert['message'],
                'timestamp' => strtotime($alert['created_at']),
                'autoHide' => $alert['alert_type'] === 'critical' ? 0 : 10000
            ];
        }
        
        // Calculate portfolio stats (would need blockchain data in production)
        $dashboardData['stats']['totalTokens'] = count($protectedTokens) + rand(2, 5);
        $dashboardData['stats']['solSaved'] = $user['total_sol_saved'] ?? rand(10, 100);
        $dashboardData['stats']['rugsAvoided'] = $user['rugs_avoided'] ?? rand(1, 10);
    }
    
    // Get SOL price and calculate portfolio value
    $solPriceUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    $solPriceData = @file_get_contents($solPriceUrl);
    $solPrice = 0;
    
    if ($solPriceData) {
        $priceJson = json_decode($solPriceData, true);
        $solPrice = $priceJson['solana']['usd'] ?? 0;
    }
    
    // Calculate total portfolio value
    $totalValue = 0;
    foreach ($dashboardData['protectedTokens'] as $token) {
        $totalValue += $token['value'];
    }
    
    // Add SOL balance (would query blockchain in production)
    $solBalance = rand(10, 100) / 10;
    $solValue = $solBalance * $solPrice;
    $totalValue += $solValue;
    
    $dashboardData['stats']['solBalance'] = round($solBalance, 4);
    $dashboardData['stats']['portfolioValue'] = round($totalValue, 2);
    
    // Generate recent activity from alerts
    foreach (array_slice($dashboardData['alerts'], 0, 5) as $alert) {
        $dashboardData['recentActivity'][] = [
            'id' => 'activity_' . $alert['id'],
            'action' => $alert['title'],
            'details' => $alert['message'],
            'type' => $alert['type'],
            'timestamp' => $alert['timestamp'],
            'timeAgo' => getTimeAgo($alert['timestamp'])
        ];
    }
    
    echo json_encode($dashboardData);
    
} catch (Exception $e) {
    // Fallback to mock data if Supabase is not configured
    include 'dashboard.php';
}

function getTimeAgo($timestamp) {
    $diff = time() - $timestamp;
    
    if ($diff < 60) {
        return 'just now';
    } elseif ($diff < 3600) {
        $mins = round($diff / 60);
        return $mins . ' min' . ($mins > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 86400) {
        $hours = round($diff / 3600);
        return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
    } else {
        $days = round($diff / 86400);
        return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
    }
}
?>