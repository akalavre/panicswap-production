<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// For now, handle Supabase operations with direct API calls
define('SUPABASE_URL', 'https://cfficjjdhgqwqprfhlrj.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA');

function supabaseRequest($method, $endpoint, $data = null, $isQuery = false) {
    $url = SUPABASE_URL . '/rest/v1' . $endpoint;
    
    $headers = [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_ANON_KEY,
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

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['wallet']) || !isset($input['plan'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$wallet = $input['wallet'];
$plan = $input['plan'];
$amount = $input['amount'] ?? 0;
$currency = $input['currency'] ?? 'SOL';
$txSignature = $input['txSignature'] ?? null;
$status = $input['status'] ?? 'active';

try {
    // First, check if user exists
    $userResponse = supabaseRequest('GET', "/users?wallet_address=eq.$wallet", null, true);
    
    $userId = null;
    if (!empty($userResponse['data'])) {
        $userId = $userResponse['data'][0]['id'];
    } else {
        // Create user if doesn't exist
        $createUserData = [
            'wallet_address' => $wallet,
            'created_at' => date('c')
        ];
        
        $createUserResponse = supabaseRequest('POST', '/users', $createUserData);
        if (!empty($createUserResponse['data'][0]['id'])) {
            $userId = $createUserResponse['data'][0]['id'];
        }
    }
    
    if (!$userId) {
        throw new Exception('Failed to get or create user');
    }
    
    // Cancel any existing active subscriptions
    $existingSubsResponse = supabaseRequest('GET', "/subscriptions?user_id=eq.$userId&status=eq.active", null, true);
    
    if (!empty($existingSubsResponse['data'])) {
        foreach ($existingSubsResponse['data'] as $sub) {
            $updateData = ['status' => 'cancelled', 'cancelled_at' => date('c')];
            supabaseRequest('PATCH', "/subscriptions?id=eq.{$sub['id']}", $updateData);
        }
    }
    
    // Calculate next payment date (7 days from now for weekly subscription)
    $nextPaymentDate = date('c', strtotime('+7 days'));
    
    // Determine payment method and billing cycle
    $paymentMethod = $currency === 'USD' ? 'stripe' : 'sol';
    $billingCycle = $paymentMethod === 'stripe' ? 'monthly' : 'weekly';
    
    // Calculate next payment date
    $nextPaymentDate = $paymentMethod === 'stripe' 
        ? date('c', strtotime('+1 month'))
        : date('c', strtotime('+7 days'));
    
    // Create new subscription
    $subscriptionData = [
        'user_id' => $userId,
        'plan' => strtolower($plan),
        'status' => $status,
        'amount' => (float)$amount,
        'amount_sol' => $currency === 'SOL' ? (float)$amount : null,
        'currency' => $currency,
        'billing_cycle' => $billingCycle,
        'payment_method' => $paymentMethod,
        'payment_wallet' => $wallet,
        'tx_signature' => $txSignature,
        'next_payment_date' => $nextPaymentDate,
        'auto_renew' => isset($input['auto_renew']) ? $input['auto_renew'] : ($paymentMethod === 'sol'),
        'is_hot_wallet' => isset($input['is_hot_wallet']) ? $input['is_hot_wallet'] : false,
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];
    
    // Add Stripe-specific fields if present
    if (isset($input['stripe_customer_id'])) {
        $subscriptionData['stripe_customer_id'] = $input['stripe_customer_id'];
    }
    if (isset($input['stripe_subscription_id'])) {
        $subscriptionData['stripe_subscription_id'] = $input['stripe_subscription_id'];
    }
    if (isset($input['stripe_session_id'])) {
        $subscriptionData['stripe_session_id'] = $input['stripe_session_id'];
    }
    
    $response = supabaseRequest('POST', '/subscriptions', $subscriptionData);
    
    if (isset($response['error'])) {
        throw new Exception($response['error']['message'] ?? 'Failed to save subscription');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Subscription saved successfully',
        'subscription_id' => $response['data'][0]['id'] ?? null,
        'next_payment_date' => $nextPaymentDate
    ]);
    
} catch (Exception $e) {
    error_log('Save subscription error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>