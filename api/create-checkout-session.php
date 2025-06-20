<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
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

require_once __DIR__ . '/../config/stripe.php';
require_once __DIR__ . '/../config/supabase.php';

try {
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid request data');
    }
    
    $plan = $input['plan'] ?? '';
    $walletAddress = $input['walletAddress'] ?? '';
    
    // Validate plan
    if (!array_key_exists($plan, STRIPE_PRICES)) {
        throw new Exception('Invalid plan selected');
    }
    
    // Validate wallet address (basic check)
    if (!$walletAddress || strlen($walletAddress) < 32) {
        throw new Exception('Invalid wallet address');
    }
    
    $priceConfig = STRIPE_PRICES[$plan];
    
    // Create Stripe checkout session
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => $priceConfig['currency'],
                'product_data' => [
                    'name' => $priceConfig['name'],
                    'description' => $priceConfig['description'],
                    'images' => ['https://panicswap.com/assets/images/logo.png'],
                ],
                'unit_amount' => $priceConfig['amount'],
                'recurring' => [
                    'interval' => $priceConfig['interval'],
                ],
            ],
            'quantity' => 1,
        ]],
        'mode' => 'subscription',
        'success_url' => STRIPE_SUCCESS_URL,
        'cancel_url' => STRIPE_CANCEL_URL,
        'client_reference_id' => $walletAddress,
        'metadata' => [
            'plan' => $plan,
            'wallet_address' => $walletAddress,
        ],
        'subscription_data' => [
            'metadata' => [
                'plan' => $plan,
                'wallet_address' => $walletAddress,
            ],
        ],
        'allow_promotion_codes' => true,
    ]);
    
    // Create pending subscription record in database
    $supabase = createSupabaseClient();
    
    $subscriptionData = [
        'wallet_address' => $walletAddress,
        'plan' => $plan,
        'payment_method' => 'stripe',
        'amount' => $priceConfig['amount'] / 100, // Convert cents to dollars
        'currency' => strtoupper($priceConfig['currency']),
        'status' => 'pending',
        'stripe_session_id' => $session->id,
        'features' => json_encode(getPlanFeatures($plan)),
        'expires_at' => date('Y-m-d H:i:s', strtotime('+1 month')),
    ];
    
    $result = $supabase->from('subscriptions')->insert($subscriptionData);
    
    if (isset($result->error)) {
        error_log('Failed to create subscription record: ' . json_encode($result->error));
    }
    
    // Return checkout URL
    echo json_encode([
        'success' => true,
        'url' => $session->url,
        'sessionId' => $session->id
    ]);
    
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Stripe error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// Helper function to get plan features
function getPlanFeatures($plan) {
    $features = [
        'pro' => [
            'max_tokens' => 50,
            'response_time' => '< 2s',
            'dex_coverage' => 'Major DEXs',
            'alerts' => true,
            'mev_protection' => 'basic',
            'multi_wallet' => 3
        ],
        'degen' => [
            'max_tokens' => 100,
            'response_time' => '< 1s',
            'dex_coverage' => 'Memecoin launchpads',
            'alerts' => true,
            'mev_protection' => 'jito',
            'multi_wallet' => 5,
            'pump_fun' => true
        ],
        'enterprise' => [
            'max_tokens' => 'unlimited',
            'response_time' => '< 1s',
            'dex_coverage' => 'All DEXs + Private',
            'alerts' => true,
            'mev_protection' => 'private',
            'multi_wallet' => 'unlimited',
            'dedicated_support' => true
        ]
    ];
    
    return $features[$plan] ?? $features['pro'];
}