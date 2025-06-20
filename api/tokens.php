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

// Initialize response
$response = [
    'tokens' => [],
    'totalValue' => 0,
    'timestamp' => time()
];

try {
    // In production, this would:
    // 1. Query Solana blockchain for wallet tokens
    // 2. Get token metadata from various sources
    // 3. Fetch prices from Jupiter/CoinGecko
    // 4. Check protection status from Supabase
    
    // For now, return sample data
    $sampleTokens = [
        [
            'mint' => 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            'symbol' => 'BONK',
            'name' => 'Bonk',
            'balance' => 15234567.89,
            'decimals' => 5,
            'price' => 0.00001234,
            'value' => 187.99,
            'change24h' => 5.67,
            'liquidity' => 2500000,
            'liquidityChange1h' => 2.3,
            'liquidityChange24h' => -1.2,
            'marketCap' => 800000000,
            'image' => 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
            'platform' => 'pump.fun',
            'riskScore' => 35,
            'isMemecoin' => true,
            'launchTime' => date('c', strtotime('-15 days')),
            'honeypotStatus' => 'safe',
            'lpLocked' => 95,
            'holders' => 150234,
            'creatorPercent' => 2.5,
            'bundlerCount' => 0,
            'devActivity' => [
                'soldPercent' => 15,
                'lastActivityTime' => time() - 86400
            ],
            'protected' => true
        ],
        [
            'mint' => 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
            'symbol' => 'WIF',
            'name' => 'dogwifhat',
            'balance' => 89012.34,
            'decimals' => 6,
            'price' => 2.67,
            'value' => 237654.95,
            'change24h' => -2.34,
            'liquidity' => 45000000,
            'liquidityChange1h' => -0.5,
            'liquidityChange24h' => -3.2,
            'marketCap' => 2670000000,
            'image' => 'https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link',
            'platform' => 'raydium',
            'riskScore' => 25,
            'isMemecoin' => true,
            'launchTime' => date('c', strtotime('-120 days')),
            'honeypotStatus' => 'safe',
            'lpLocked' => 100,
            'holders' => 89567,
            'creatorPercent' => 0.8,
            'bundlerCount' => 0,
            'protected' => true
        ],
        [
            'mint' => 'CULLsLZjMZkA2B9rPmjyTzUsXHWqfbJKgikNTJYP1zjb',
            'symbol' => 'MYRO',
            'name' => 'Myro',
            'balance' => 456789.01,
            'decimals' => 9,
            'price' => 0.02408,
            'value' => 10999.48,
            'change24h' => 12.45,
            'liquidity' => 1200000,
            'liquidityChange1h' => 5.2,
            'liquidityChange24h' => 15.8,
            'marketCap' => 24080000,
            'image' => 'https://bafkreidlzc5pzudqnswbjc7ws5vihcbdmtfrqswcxvsfnmrqimlmnxpomm.ipfs.nftstorage.link',
            'platform' => 'meteora',
            'riskScore' => 45,
            'isMemecoin' => true,
            'launchTime' => date('c', strtotime('-45 days')),
            'honeypotStatus' => 'safe',
            'lpLocked' => 80,
            'holders' => 23456,
            'creatorPercent' => 5.2,
            'bundlerCount' => 2,
            'devActivity' => [
                'soldPercent' => 25,
                'lastActivityTime' => time() - 3600
            ],
            'protected' => false
        ],
        [
            'mint' => '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
            'symbol' => 'POPCAT',
            'name' => 'Popcat',
            'balance' => 234567.89,
            'decimals' => 9,
            'price' => 0.89,
            'value' => 208765.42,
            'change24h' => 8.92,
            'liquidity' => 8900000,
            'liquidityChange1h' => 1.2,
            'liquidityChange24h' => 6.5,
            'marketCap' => 890000000,
            'image' => 'https://i.imgur.com/PkgAuZl.png',
            'platform' => 'pump.fun',
            'riskScore' => 55,
            'isMemecoin' => true,
            'launchTime' => date('c', strtotime('-90 days')),
            'honeypotStatus' => 'warning',
            'lpLocked' => 50,
            'holders' => 45678,
            'creatorPercent' => 8.5,
            'bundlerCount' => 5,
            'devActivity' => [
                'soldPercent' => 60,
                'lastActivityTime' => time() - 7200
            ],
            'protected' => false
        ],
        [
            'mint' => 'A3eME5CetyZPBoWbRUwY3tSe25S6tb18ba9ZPbWk9eFJ',
            'symbol' => 'PENG',
            'name' => 'Penguin',
            'balance' => 678901.23,
            'decimals' => 6,
            'price' => 0.0312,
            'value' => 21181.72,
            'change24h' => -15.23,
            'liquidity' => 450000,
            'liquidityChange1h' => -8.2,
            'liquidityChange24h' => -22.5,
            'marketCap' => 3120000,
            'image' => 'https://bafkreib4fewvxireekmluabfkz3r4dqc5xtqtbynkqldl2gvmqb6hk7nwu.ipfs.nftstorage.link',
            'platform' => 'moonshot',
            'riskScore' => 78,
            'isMemecoin' => true,
            'launchTime' => date('c', strtotime('-2 days')),
            'honeypotStatus' => 'unknown',
            'lpLocked' => 0,
            'holders' => 1234,
            'creatorPercent' => 15.8,
            'bundlerCount' => 12,
            'devActivity' => [
                'soldPercent' => 85,
                'lastActivityTime' => time() - 1800
            ],
            'protected' => false
        ],
        [
            'mint' => 'So11111111111111111111111111111111111111112',
            'symbol' => 'SOL',
            'name' => 'Wrapped SOL',
            'balance' => 5.234,
            'decimals' => 9,
            'price' => 150.25,
            'value' => 786.41,
            'change24h' => 3.45,
            'liquidity' => 999999999,
            'liquidityChange1h' => 0,
            'liquidityChange24h' => 0,
            'marketCap' => 65000000000,
            'image' => 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            'platform' => 'native',
            'riskScore' => 0,
            'isMemecoin' => false,
            'launchTime' => date('c', strtotime('-1000 days')),
            'honeypotStatus' => 'safe',
            'lpLocked' => 100,
            'holders' => 9999999,
            'creatorPercent' => 0,
            'bundlerCount' => 0,
            'protected' => false
        ]
    ];
    
    // Calculate total value
    $totalValue = array_reduce($sampleTokens, function($sum, $token) {
        return $sum + $token['value'];
    }, 0);
    
    $response['tokens'] = $sampleTokens;
    $response['totalValue'] = $totalValue;
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch tokens']);
}
?>