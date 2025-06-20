<?php
/**
 * Save Subscription Endpoint
 * Handles saving subscription details after successful payment
 */

// Load configuration
require_once dirname(__DIR__) . '/config.php';
require_once __DIR__ . '/supabase-config.php';

// Set JSON response header
header('Content-Type: application/json');

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['wallet_address', 'plan_type', 'payment_method', 'amount', 'currency'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit();
    }
}

// Validate plan type
$validPlans = ['basic', 'pro', 'enterprise'];
if (!in_array($input['plan_type'], $validPlans)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid plan type']);
    exit();
}

// Validate payment method
$validPaymentMethods = ['crypto', 'stripe'];
if (!in_array($input['payment_method'], $validPaymentMethods)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payment method']);
    exit();
}

// Validate wallet address format (basic Solana address validation)
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $input['wallet_address'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid wallet address format']);
    exit();
}

// Initialize Supabase client with service key for write operations
$supabase = new SupabaseClient(true);

try {
    // Prepare subscription data
    $subscriptionData = [
        'wallet_address' => $input['wallet_address'],
        'plan_type' => $input['plan_type'],
        'payment_method' => $input['payment_method'],
        'amount' => floatval($input['amount']),
        'currency' => strtoupper($input['currency']),
        'status' => 'pending' // Default status
    ];
    
    // Add payment method specific fields
    if ($input['payment_method'] === 'crypto' && isset($input['transaction_signature'])) {
        $subscriptionData['transaction_signature'] = $input['transaction_signature'];
        $subscriptionData['status'] = 'active'; // Crypto payments are active immediately after verification
    } elseif ($input['payment_method'] === 'stripe') {
        if (isset($input['stripe_session_id'])) {
            $subscriptionData['stripe_session_id'] = $input['stripe_session_id'];
        }
        if (isset($input['stripe_customer_id'])) {
            $subscriptionData['stripe_customer_id'] = $input['stripe_customer_id'];
        }
    }
    
    // Set expiration date based on plan
    $expirationDays = [
        'basic' => 30,
        'pro' => 30,
        'enterprise' => 30
    ];
    
    $expiresAt = new DateTime();
    $expiresAt->add(new DateInterval('P' . $expirationDays[$input['plan_type']] . 'D'));
    $subscriptionData['expires_at'] = $expiresAt->format('c');
    
    // Set plan features
    $features = [
        'basic' => [
            'max_tokens' => 5,
            'auto_protection' => true,
            'priority_support' => false,
            'advanced_analytics' => false
        ],
        'pro' => [
            'max_tokens' => 20,
            'auto_protection' => true,
            'priority_support' => true,
            'advanced_analytics' => true,
            'custom_alerts' => true
        ],
        'enterprise' => [
            'max_tokens' => -1, // unlimited
            'auto_protection' => true,
            'priority_support' => true,
            'advanced_analytics' => true,
            'custom_alerts' => true,
            'api_access' => true,
            'dedicated_support' => true
        ]
    ];
    
    $subscriptionData['features'] = json_encode($features[$input['plan_type']]);
    
    // First, deactivate any existing active subscriptions for this wallet
    $existingSubscriptions = $supabase->query('subscriptions', [
        'wallet_address' => 'eq.' . $input['wallet_address'],
        'status' => 'eq.active'
    ]);
    
    if (!empty($existingSubscriptions)) {
        foreach ($existingSubscriptions as $existing) {
            $supabase->update('subscriptions', $existing['id'], ['status' => 'expired']);
        }
    }
    
    // Insert new subscription
    $result = $supabase->insert('subscriptions', $subscriptionData);
    
    if ($result === null) {
        throw new Exception('Failed to save subscription');
    }
    
    // Log payment in history
    if (!empty($result) && isset($result[0]['id'])) {
        $paymentHistoryData = [
            'subscription_id' => $result[0]['id'],
            'wallet_address' => $input['wallet_address'],
            'event_type' => 'subscription_created',
            'payment_method' => $input['payment_method'],
            'amount' => floatval($input['amount']),
            'currency' => strtoupper($input['currency']),
            'transaction_data' => json_encode($input)
        ];
        
        $supabase->insert('payment_history', $paymentHistoryData);
    }
    
    // Return success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'subscription_id' => $result[0]['id'] ?? null,
        'status' => $subscriptionData['status'],
        'expires_at' => $subscriptionData['expires_at'],
        'features' => json_decode($subscriptionData['features'], true)
    ]);
    
} catch (Exception $e) {
    error_log('Save subscription error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save subscription']);
}
?>