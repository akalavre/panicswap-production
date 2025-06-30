<?php
// Prevent any HTML output and catch all errors
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Error handler to catch any PHP errors and output as JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => "PHP Error: $errstr in $errfile on line $errline"
    ]);
    exit();
});

// Exception handler
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Exception: ' . $exception->getMessage()
    ]);
    exit();
});

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

if (!$input || !isset($input['plan']) || !isset($input['walletAddress'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

$plan = $input['plan'];
$walletAddress = $input['walletAddress'];

// Plan pricing configuration
$plans = [
    'pro' => [
        'name' => 'Pro Plan',
        'price_cents' => 7900, // $79.00
        'description' => 'Pro subscription - 5 tokens, < 2s response'
    ],
    'degen' => [
        'name' => 'Degen Mode Plan',
        'price_cents' => 14900, // $149.00
        'description' => 'Degen Mode - 20 tokens, < 1s response, Pump.fun'
    ],
    'degen-mode' => [ // Keep for backwards compatibility
        'name' => 'Degen Mode Plan',
        'price_cents' => 14900, // $149.00
        'description' => 'Degen Mode - 20 tokens, < 1s response, Pump.fun'
    ],
    'enterprise' => [
        'name' => 'Enterprise Plan',
        'price_cents' => 39900, // $399.00
        'description' => 'Enterprise - 50 tokens, all DEXs, dedicated support'
    ]
];

if (!isset($plans[$plan])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid plan']);
    exit();
}

// Check if vendor/autoload.php exists
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    // Stripe is not installed, return informative error
    echo json_encode([
        'success' => false,
        'error' => 'Stripe is not configured. Please run setup-stripe-complete.php to install dependencies.',
        'setupRequired' => true
    ]);
    exit();
}

try {
    require_once __DIR__ . '/../vendor/autoload.php';
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load Stripe library: ' . $e->getMessage(),
        'setupRequired' => true
    ]);
    exit();
}

// Load Stripe configuration
try {
    require_once __DIR__ . '/../config/stripe.php';
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load Stripe configuration: ' . $e->getMessage(),
        'configRequired' => true
    ]);
    exit();
}

// Check if Stripe keys are configured
if (strpos(STRIPE_SECRET_KEY, 'your_test_key_here') !== false) {
    echo json_encode([
        'success' => false,
        'error' => 'Stripe API keys not configured. Please add your Stripe keys to the .env file.',
        'configRequired' => true
    ]);
    exit();
}

try {
    // Set Stripe API key after everything is loaded
    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
    
    // Get the host URL dynamically
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $basePath = dirname(dirname($_SERVER['PHP_SELF']));
    $baseUrl = $protocol . '://' . $host . $basePath;
    
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => 'usd',
                'product_data' => [
                    'name' => $plans[$plan]['name'],
                    'description' => $plans[$plan]['description'],
                ],
                'unit_amount' => $plans[$plan]['price_cents'],
                'recurring' => [
                    'interval' => 'month',
                    'interval_count' => 1,
                ],
            ],
            'quantity' => 1,
        ]],
        'mode' => 'subscription',
        'success_url' => $baseUrl . '/payment-success.php?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $baseUrl . '/index.php?canceled=true',
        'client_reference_id' => $walletAddress, // Important: this is needed for the webhook
        'metadata' => [
            'wallet_address' => $walletAddress,
            'plan' => $plan
        ]
    ]);
    
    echo json_encode([
        'success' => true,
        'url' => $session->url,
        'sessionId' => $session->id
    ]);
} catch (Exception $e) {
    error_log('Stripe checkout error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create checkout session: ' . $e->getMessage()]);
}
?>