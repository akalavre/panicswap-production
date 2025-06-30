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

// Don't set API key here - let individual scripts do it after ensuring all dependencies are loaded
// \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

// Pricing Configuration (in cents)
define('STRIPE_PRICES', [
    'pro' => [
        'name' => 'Pro Plan',
        'amount' => 7900, // $79.00
        'currency' => 'usd',
        'interval' => 'month',
        'description' => '5 tokens, < 2s response time'
    ],
    'degen' => [
        'name' => 'Degen Mode',
        'amount' => 14900, // $149.00
        'currency' => 'usd',
        'interval' => 'month',
        'description' => '10 tokens, < 1s response, Pump.fun integration'
    ],
    'enterprise' => [
        'name' => 'Enterprise Plan',
        'amount' => 39900, // $399.00
        'currency' => 'usd',
        'interval' => 'month',
        'description' => '25 tokens, all DEXs, dedicated support'
    ]
]);

// Success and Cancel URLs
define('STRIPE_SUCCESS_URL', (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/payment-success.php?session_id={CHECKOUT_SESSION_ID}');
define('STRIPE_CANCEL_URL', (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/pricing.php?canceled=true');