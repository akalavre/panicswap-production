<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, X-Cron-Secret');

// Load environment variables
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

// Security check for cron job
$cronSecret = $_SERVER['HTTP_X_CRON_SECRET'] ?? '';
$expectedSecret = getenv('CRON_SECRET') ?: 'default-cron-secret-change-in-production';

if ($cronSecret !== $expectedSecret && $_SERVER['REQUEST_METHOD'] === 'POST') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// Supabase configuration
define('SUPABASE_URL', getenv('SUPABASE_URL'));
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY'));

function supabaseRequest($method, $endpoint, $data = null) {
    $url = SUPABASE_URL . '/rest/v1' . $endpoint;
    
    $headers = [
        'apikey: ' . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ];
    
    $curl = curl_init();
    
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    
    if ($method !== 'GET') {
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
        if ($data) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    $result = json_decode($response, true);
    
    if ($httpCode >= 400) {
        return ['error' => $result];
    }
    
    return ['data' => $result];
}

// Get subscriptions due for renewal
$cutoffDate = date('c');
$query = "/subscriptions?" . http_build_query([
    'status' => 'eq.active',
    'auto_renew' => 'eq.true',
    'is_hot_wallet' => 'eq.true',
    'payment_method' => 'eq.sol',
    'next_payment_date' => 'lte.' . $cutoffDate,
    'select' => '*,users(*)'
]);

$subscriptionsResponse = supabaseRequest('GET', $query);

if (isset($subscriptionsResponse['error'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch subscriptions',
        'details' => $subscriptionsResponse['error']
    ]);
    exit();
}

$subscriptions = $subscriptionsResponse['data'] ?? [];
$processed = 0;
$failed = 0;
$results = [];

foreach ($subscriptions as $subscription) {
    $subscriptionId = $subscription['id'];
    $walletAddress = $subscription['payment_wallet'];
    $amount = $subscription['amount_sol'];
    $plan = $subscription['plan'];
    $userId = $subscription['user_id'];
    
    try {
        // Process payment through hot wallet endpoint
        $paymentData = [
            'wallet' => $walletAddress,
            'plan' => ucfirst($plan),
            'amount' => $amount,
            'currency' => 'SOL',
            'auto_charge' => true,
            'subscription_id' => $subscriptionId
        ];
        
        $ch = curl_init('http://localhost/PanicSwap-php/api/process-hot-wallet-payment.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $paymentResult = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $paymentResponse = json_decode($paymentResult, true);
        
        if ($paymentResponse && $paymentResponse['success']) {
            // Update subscription with new next payment date
            $updateData = [
                'next_payment_date' => date('c', strtotime('+7 days')),
                'last_payment_date' => date('c'),
                'updated_at' => date('c')
            ];
            
            supabaseRequest('PATCH', "/subscriptions?id=eq.$subscriptionId", $updateData);
            
            // Log successful charge
            $chargeLog = [
                'subscription_id' => $subscriptionId,
                'user_id' => $userId,
                'amount' => $amount,
                'currency' => 'SOL',
                'status' => 'success',
                'tx_signature' => $paymentResponse['signature'] ?? null,
                'created_at' => date('c')
            ];
            
            supabaseRequest('POST', '/subscription_charges', $chargeLog);
            
            $processed++;
            $results[] = [
                'subscription_id' => $subscriptionId,
                'status' => 'success',
                'message' => 'Payment processed successfully'
            ];
            
        } else {
            // Handle payment failure
            $failureReason = $paymentResponse['error'] ?? 'Unknown error';
            
            // If insufficient balance, we might want to retry later or disable auto-renew
            if (strpos($failureReason, 'Insufficient balance') !== false) {
                // Optionally disable auto-renew after multiple failures
                // For now, just log the failure
            }
            
            // Log failed charge
            $chargeLog = [
                'subscription_id' => $subscriptionId,
                'user_id' => $userId,
                'amount' => $amount,
                'currency' => 'SOL',
                'status' => 'failed',
                'error_message' => $failureReason,
                'created_at' => date('c')
            ];
            
            supabaseRequest('POST', '/subscription_charges', $chargeLog);
            
            $failed++;
            $results[] = [
                'subscription_id' => $subscriptionId,
                'status' => 'failed',
                'error' => $failureReason
            ];
        }
        
    } catch (Exception $e) {
        $failed++;
        $results[] = [
            'subscription_id' => $subscriptionId,
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Return summary
echo json_encode([
    'success' => true,
    'summary' => [
        'total' => count($subscriptions),
        'processed' => $processed,
        'failed' => $failed
    ],
    'timestamp' => date('c'),
    'results' => $results
]);
?>