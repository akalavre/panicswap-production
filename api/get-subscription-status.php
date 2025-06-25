<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Get wallet address from query parameter
    $wallet = $_GET['wallet'] ?? null;

    if (!$wallet) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Wallet address required',
            'received' => $_GET
        ]);
        exit;
    }

    // Load environment
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                putenv(trim($key) . '=' . trim($value));
            }
        }
    }

    // Supabase configuration
    define('SUPABASE_URL', getenv('SUPABASE_URL'));
    define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY'));

    function supabaseRequest($endpoint) {
        $url = SUPABASE_URL . '/rest/v1' . $endpoint;
        
        $headers = [
            'apikey: ' . SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . SUPABASE_ANON_KEY,
            'Content-Type: application/json'
        ];
        
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($httpCode >= 400) {
            return null;
        }
        
        return json_decode($response, true);
    }

    // Try to get subscription from Supabase
    $subscription = null;
    
    try {
        // Get user by wallet
        $users = supabaseRequest("/users?wallet_address=eq.$wallet");
        
        if ($users && count($users) > 0) {
            $userId = $users[0]['id'];
            
            // Get active subscription
            $subs = supabaseRequest("/subscriptions?user_id=eq.$userId&status=eq.active&order=created_at.desc&limit=1");
            
            if ($subs && count($subs) > 0) {
                $subscription = $subs[0];
            }
        }
    } catch (Exception $e) {
        error_log('Failed to fetch subscription: ' . $e->getMessage());
    }

    // Build response
    if ($subscription) {
        $subscriptionStatus = [
            'wallet' => $wallet,
            'subscription' => [
                'status' => $subscription['status'],
                'plan' => $subscription['plan'],
                'expiresAt' => $subscription['next_payment_date'],
                'created_at' => $subscription['created_at'],
                'payment_method' => $subscription['payment_method'],
                'payment_wallet' => $subscription['payment_wallet'],
                'amount' => $subscription['amount'],
                'amount_sol' => $subscription['amount_sol'],
                'next_payment_date' => $subscription['next_payment_date'],
                'auto_renew' => $subscription['auto_renew'] ?? true,
                'is_hot_wallet' => $subscription['is_hot_wallet'] ?? false,
                'features' => [
                    'maxTokens' => $subscription['plan'] === 'pro' ? 50 : ($subscription['plan'] === 'degen-mode' ? 100 : 'unlimited'),
                    'maxProtections' => 'unlimited',
                    'realtimeAlerts' => true,
                    'autoProtection' => true,
                    'priorityExecution' => true
                ]
            ],
            'usage' => [
                'protectedTokens' => 0,
                'totalTransactions' => 0,
                'rugsStopped' => 0,
                'amountSaved' => 0
            ]
        ];
    } else {
        // Default free subscription
        $subscriptionStatus = [
            'wallet' => $wallet,
            'subscription' => [
                'status' => 'active',
                'plan' => 'free',
                'expiresAt' => null,
                'features' => [
                    'maxTokens' => 5,
                    'maxProtections' => 3,
                    'realtimeAlerts' => true,
                    'autoProtection' => false,
                    'priorityExecution' => false
                ]
            ],
            'usage' => [
                'protectedTokens' => 0,
                'totalTransactions' => 0,
                'rugsStopped' => 0,
                'amountSaved' => 0
            ]
        ];
    }

    echo json_encode($subscriptionStatus);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}