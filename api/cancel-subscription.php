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

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['wallet'])) {
    // Also check for subscriptionId as an alternative
    if (!$input || !isset($input['subscriptionId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }
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
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY'));

// Stripe configuration
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY'));

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

try {
    $subscriptionId = null;
    $subscription = null;
    
    // If subscriptionId is provided directly
    if (isset($input['subscriptionId'])) {
        $subscriptionId = $input['subscriptionId'];
        
        // Get subscription details
        $subResponse = supabaseRequest('GET', "/subscriptions?id=eq.$subscriptionId");
        
        if (!empty($subResponse['data'])) {
            $subscription = $subResponse['data'][0];
        }
    } else {
        // Get by wallet address
        $wallet = $input['wallet'];
        
        // First, get user by wallet
        $userResponse = supabaseRequest('GET', "/users?wallet_address=eq.$wallet");
        
        if (empty($userResponse['data'])) {
            throw new Exception('User not found');
        }
        
        $userId = $userResponse['data'][0]['id'];
        
        // Get active subscription
        $subResponse = supabaseRequest('GET', "/subscriptions?user_id=eq.$userId&status=eq.active&order=created_at.desc&limit=1");
        
        if (empty($subResponse['data'])) {
            throw new Exception('No active subscription found');
        }
        
        $subscription = $subResponse['data'][0];
        $subscriptionId = $subscription['id'];
    }
    
    if (!$subscription) {
        throw new Exception('Subscription not found');
    }
    
    // Handle cancellation based on payment method
    if ($subscription['payment_method'] === 'stripe' && !empty($subscription['stripe_subscription_id'])) {
        // Cancel Stripe subscription
        if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
            require_once __DIR__ . '/../vendor/autoload.php';
            
            \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
            
            try {
                // Cancel at period end
                $stripeSubscription = \Stripe\Subscription::update(
                    $subscription['stripe_subscription_id'],
                    ['cancel_at_period_end' => true]
                );
                
                // Update our database
                $updateData = [
                    'status' => 'cancelled',
                    'cancelled_at' => date('c'),
                    'cancel_at_period_end' => true,
                    'updated_at' => date('c')
                ];
                
            } catch (Exception $e) {
                error_log('Stripe cancellation error: ' . $e->getMessage());
                // Continue with local cancellation even if Stripe fails
            }
        }
    }
    
    // For SOL payments or if Stripe cancellation wasn't needed
    if (!isset($updateData)) {
        $updateData = [
            'status' => 'cancelled',
            'cancelled_at' => date('c'),
            'auto_renew' => false,
            'updated_at' => date('c')
        ];
    }
    
    // Update subscription in database
    $updateResponse = supabaseRequest('PATCH', "/subscriptions?id=eq.$subscriptionId", $updateData);
    
    if (isset($updateResponse['error'])) {
        throw new Exception('Failed to update subscription');
    }
    
    // Log the cancellation
    $logData = [
        'subscription_id' => $subscriptionId,
        'user_id' => $subscription['user_id'],
        'action' => 'cancelled',
        'created_at' => date('c')
    ];
    
    supabaseRequest('POST', '/subscription_logs', $logData);
    
    // Calculate refund for SOL payments (if applicable)
    $refundAmount = 0;
    if ($subscription['payment_method'] === 'sol' && $subscription['next_payment_date']) {
        $now = time();
        $nextPayment = strtotime($subscription['next_payment_date']);
        $daysRemaining = max(0, ($nextPayment - $now) / (60 * 60 * 24));
        $refundAmount = round(($daysRemaining / 7) * $subscription['amount_sol'], 3);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Subscription cancelled successfully',
        'expires_at' => $subscription['next_payment_date'],
        'refund_amount' => $refundAmount,
        'payment_method' => $subscription['payment_method']
    ]);
    
} catch (Exception $e) {
    error_log('Cancel subscription error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>