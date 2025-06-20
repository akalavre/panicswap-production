<?php
// Stripe Configuration
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// Stripe API Keys
define('STRIPE_SECRET_KEY', $_ENV['STRIPE_SECRET_KEY'] ?? 'sk_test_your_test_key_here');
define('STRIPE_PUBLISHABLE_KEY', $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? 'pk_test_your_test_key_here');
define('STRIPE_WEBHOOK_SECRET', $_ENV['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_your_webhook_secret_here');

// Set Stripe API Key
\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

// Pricing Configuration (in cents)
define('STRIPE_PRICES', [
    'pro' => [
        'name' => 'Pro Plan',
        'amount' => 16104, // $161.04
        'currency' => 'usd',
        'interval' => 'month',
        'description' => 'Up to 50 tokens, < 2s response time'
    ],
    'degen' => [
        'name' => 'Degen Mode',
        'amount' => 32363, // $323.63
        'currency' => 'usd',
        'interval' => 'month',
        'description' => 'Up to 100 tokens, < 1s response, Pump.fun integration'
    ],
    'enterprise' => [
        'name' => 'Enterprise Plan',
        'amount' => 48612, // $486.12
        'currency' => 'usd',
        'interval' => 'month',
        'description' => 'Unlimited tokens, all DEXs, dedicated support'
    ]
]);

// Success and Cancel URLs
define('STRIPE_SUCCESS_URL', (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/payment-success.php?session_id={CHECKOUT_SESSION_ID}');
define('STRIPE_CANCEL_URL', (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/pricing.php?canceled=true');