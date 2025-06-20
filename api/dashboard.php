<?php
require_once '../config.php';

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
    'recentActivity' => []
];

try {
    // Get SOL price
    $solPriceUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    $solPriceData = @file_get_contents($solPriceUrl);
    $solPrice = 0;
    
    if ($solPriceData) {
        $priceJson = json_decode($solPriceData, true);
        $solPrice = $priceJson['solana']['usd'] ?? 0;
    }
    
    // Simulate wallet balance (in production, this would query the blockchain)
    $solBalance = rand(10, 100) / 10; // Random balance between 1-10 SOL
    $portfolioValue = $solBalance * $solPrice;
    
    // Update stats
    $dashboardData['stats']['solBalance'] = round($solBalance, 4);
    $dashboardData['stats']['portfolioValue'] = round($portfolioValue, 2);
    $dashboardData['stats']['protectedTokens'] = rand(2, 5);
    $dashboardData['stats']['totalTokens'] = rand(5, 15);
    $dashboardData['stats']['activeAlerts'] = rand(0, 3);
    $dashboardData['stats']['solSaved'] = round(rand(10, 100) + rand(0, 99) / 100, 2);
    $dashboardData['stats']['rugsAvoided'] = rand(1, 5);
    $dashboardData['stats']['activeMonitors'] = $dashboardData['stats']['protectedTokens'];
    
    // Generate sample protected tokens
    $sampleTokens = [
        ['symbol' => 'BONK', 'name' => 'Bonk', 'balance' => '1,234,567', 'value' => 12.45, 'price' => 0.00001234, 'change24h' => 5.67],
        ['symbol' => 'WIF', 'name' => 'dogwifhat', 'balance' => '89,012', 'value' => 23.78, 'price' => 0.26712, 'change24h' => -2.34],
        ['symbol' => 'MYRO', 'name' => 'Myro', 'balance' => '456,789', 'value' => 11.00, 'price' => 0.02408, 'change24h' => 12.45],
        ['symbol' => 'SAMO', 'name' => 'Samoyedcoin', 'balance' => '234,567', 'value' => 8.90, 'price' => 0.03796, 'change24h' => -0.89],
        ['symbol' => 'FOXY', 'name' => 'Foxy', 'balance' => '678,901', 'value' => 15.23, 'price' => 0.02243, 'change24h' => 3.21]
    ];
    
    // Select random tokens as protected
    $numProtected = $dashboardData['stats']['protectedTokens'];
    shuffle($sampleTokens);
    
    for ($i = 0; $i < $numProtected && $i < count($sampleTokens); $i++) {
        $token = $sampleTokens[$i];
        $dashboardData['protectedTokens'][] = [
            'id' => 'token_' . ($i + 1),
            'symbol' => $token['symbol'],
            'name' => $token['name'],
            'balance' => $token['balance'],
            'value' => $token['value'],
            'price' => $token['price'],
            'change24h' => $token['change24h'],
            'status' => rand(0, 10) > 2 ? 'active' : 'monitoring',
            'protection' => 'enabled',
            'riskLevel' => rand(0, 10) > 7 ? 'high' : (rand(0, 10) > 4 ? 'medium' : 'low'),
            'liquidityLocked' => rand(0, 10) > 5,
            'mintAuthority' => rand(0, 10) > 7 ? 'renounced' : 'active',
            'lastChecked' => time() - rand(0, 300)
        ];
    }
    
    // Generate sample alerts
    $alertTypes = [
        ['type' => 'success', 'title' => 'Token Protected', 'message' => 'Successfully added protection for {token}'],
        ['type' => 'warning', 'title' => 'Price Alert', 'message' => '{token} price dropped by {percent}%'],
        ['type' => 'error', 'title' => 'High Risk Detected', 'message' => 'Suspicious activity detected on {token}'],
        ['type' => 'protection', 'title' => 'Auto-Exit Triggered', 'message' => 'Protection activated for {token}']
    ];
    
    $numAlerts = $dashboardData['stats']['activeAlerts'];
    for ($i = 0; $i < $numAlerts; $i++) {
        $alert = $alertTypes[array_rand($alertTypes)];
        $token = $sampleTokens[array_rand($sampleTokens)];
        
        $dashboardData['alerts'][] = [
            'id' => 'alert_' . uniqid(),
            'type' => $alert['type'],
            'title' => $alert['title'],
            'message' => str_replace(
                ['{token}', '{percent}'],
                [$token['symbol'], rand(5, 20)],
                $alert['message']
            ),
            'timestamp' => time() - rand(0, 3600),
            'autoHide' => $alert['type'] === 'success' ? 5000 : 0
        ];
    }
    
    // Generate recent activity
    $activities = [
        ['action' => 'Token protected', 'details' => '{token} added to protection list', 'type' => 'success'],
        ['action' => 'Auto-exit triggered', 'details' => '{token}: Liquidity drop detected', 'type' => 'warning'],
        ['action' => 'Monitoring started', 'details' => '{token} protection activated', 'type' => 'info'],
        ['action' => 'Risk detected', 'details' => '{token}: Unusual trading pattern', 'type' => 'error']
    ];
    
    for ($i = 0; $i < 5; $i++) {
        $activity = $activities[array_rand($activities)];
        $token = $sampleTokens[array_rand($sampleTokens)];
        $timeAgo = rand(1, 180); // minutes ago
        
        $dashboardData['recentActivity'][] = [
            'id' => 'activity_' . uniqid(),
            'action' => $activity['action'],
            'details' => str_replace('{token}', $token['symbol'], $activity['details']),
            'type' => $activity['type'],
            'timestamp' => time() - ($timeAgo * 60),
            'timeAgo' => $timeAgo < 60 ? $timeAgo . ' mins ago' : round($timeAgo / 60, 1) . ' hours ago'
        ];
    }
    
    // Sort activity by timestamp
    usort($dashboardData['recentActivity'], function($a, $b) {
        return $b['timestamp'] - $a['timestamp'];
    });
    
    echo json_encode($dashboardData);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch dashboard data']);
}
?>