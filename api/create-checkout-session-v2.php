<?php
// Start output buffering to prevent any accidental output
ob_start();

// Set JSON header first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['plan']) || !isset($input['walletAddress'])) {
        throw new Exception('Missing required fields');
    }
    
    // Load dependencies
    if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
        throw new Exception('Vendor autoload not found');
    }
    require_once __DIR__ . '/../vendor/autoload.php';
    
    // Load config
    if (!file_exists(__DIR__ . '/../config/stripe.php')) {
        throw new Exception('Stripe config not found');
    }
    require_once __DIR__ . '/../config/stripe.php';
    
    // Set Stripe API key
    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
    
    // Plan configuration
    $plans = [
        'pro' => ['name' => 'Pro Plan', 'price' => 7900],
        'degen' => ['name' => 'Degen Mode', 'price' => 14900],
        'degen-mode' => ['name' => 'Degen Mode', 'price' => 14900], // backwards compatibility
        'enterprise' => ['name' => 'Enterprise', 'price' => 39900]
    ];
    
    $plan = str_replace(' ', '-', strtolower($input['plan']));
    
    if (!isset($plans[$plan])) {
        throw new Exception('Invalid plan: ' . $plan);
    }
    
    // Create checkout session
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => 'usd',
                'product_data' => [
                    'name' => $plans[$plan]['name'],
                ],
                'unit_amount' => $plans[$plan]['price'],
                'recurring' => [
                    'interval' => 'month',
                ],
            ],
            'quantity' => 1,
        ]],
        'mode' => 'subscription',
        'success_url' => 'http://localhost/PanicSwap-php/payment-success.php?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => 'http://localhost/PanicSwap-php/index.php',
        'metadata' => [
            'wallet_address' => $input['walletAddress'],
            'plan' => $plan
        ]
    ]);
    
    // Clear any output buffer
    ob_clean();
    
    // Return success
    echo json_encode([
        'success' => true,
        'url' => $session->url,
        'sessionId' => $session->id
    ]);
    
} catch (\Stripe\Exception\ApiErrorException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Stripe API Error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// End output buffering
ob_end_flush();
?>