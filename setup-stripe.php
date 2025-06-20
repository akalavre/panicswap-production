<?php
/**
 * Stripe Setup Helper
 * Run this script from command line to set up your Stripe keys securely
 */

echo "\n🔐 PanicSwap Stripe Setup\n";
echo "========================\n\n";

// Check if running from CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line for security.\n");
}

// Check if .env exists
$envFile = __DIR__ . '/.env';
$envExampleFile = __DIR__ . '/.env.example';

if (!file_exists($envFile)) {
    if (file_exists($envExampleFile)) {
        echo "Creating .env file from .env.example...\n";
        copy($envExampleFile, $envFile);
    } else {
        die("Error: .env.example file not found!\n");
    }
}

// Read current .env
$envContent = file_get_contents($envFile);

echo "This script will help you set up your Stripe keys securely.\n\n";

// Get keys from user
echo "Please enter your Stripe PUBLISHABLE key (starts with pk_):\n";
$publishableKey = trim(fgets(STDIN));

if (!preg_match('/^pk_(test|live)_/', $publishableKey)) {
    die("Error: Invalid publishable key format. It should start with pk_test_ or pk_live_\n");
}

echo "\nPlease enter your Stripe SECRET key (starts with sk_):\n";
echo "⚠️  Warning: Make sure nobody is watching your screen!\n";
$secretKey = trim(fgets(STDIN));

if (!preg_match('/^sk_(test|live)_/', $secretKey)) {
    die("Error: Invalid secret key format. It should start with sk_test_ or sk_live_\n");
}

// Check if keys match (both test or both live)
$isTest = strpos($publishableKey, 'pk_test_') === 0;
if ($isTest && strpos($secretKey, 'sk_test_') !== 0) {
    die("Error: Mismatch - publishable key is TEST but secret key is LIVE\n");
}
if (!$isTest && strpos($secretKey, 'sk_live_') !== 0) {
    die("Error: Mismatch - publishable key is LIVE but secret key is TEST\n");
}

echo "\nPlease enter your Stripe WEBHOOK secret (starts with whsec_):\n";
echo "You can find this in Stripe Dashboard → Webhooks → Your endpoint\n";
$webhookSecret = trim(fgets(STDIN));

if (!preg_match('/^whsec_/', $webhookSecret)) {
    echo "Warning: Webhook secret doesn't start with whsec_. Continue anyway? (y/n): ";
    $confirm = trim(fgets(STDIN));
    if (strtolower($confirm) !== 'y') {
        die("Setup cancelled.\n");
    }
}

// Update .env file
$patterns = [
    '/STRIPE_SECRET_KEY=.*/m',
    '/STRIPE_PUBLISHABLE_KEY=.*/m',
    '/STRIPE_WEBHOOK_SECRET=.*/m'
];

$replacements = [
    'STRIPE_SECRET_KEY=' . $secretKey,
    'STRIPE_PUBLISHABLE_KEY=' . $publishableKey,
    'STRIPE_WEBHOOK_SECRET=' . $webhookSecret
];

$envContent = preg_replace($patterns, $replacements, $envContent);

// Write back to .env
file_put_contents($envFile, $envContent);

echo "\n✅ Stripe keys have been configured successfully!\n";
echo "Mode: " . ($isTest ? "TEST" : "LIVE") . "\n\n";

// Additional setup instructions
echo "Next steps:\n";
echo "1. Set up your webhook endpoint in Stripe Dashboard:\n";
echo "   URL: https://yourdomain.com/api/webhook-stripe.php\n";
echo "   Events: checkout.session.completed, customer.subscription.*, invoice.payment_*\n";
echo "\n";
echo "2. Install dependencies:\n";
echo "   composer install\n";
echo "\n";
echo "3. Test the integration:\n";
if ($isTest) {
    echo "   - Use test card: 4242 4242 4242 4242\n";
    echo "   - Any future date for expiry\n";
    echo "   - Any 3 digits for CVC\n";
} else {
    echo "   - You're in LIVE mode - real charges will occur!\n";
    echo "   - Test carefully with small amounts first\n";
}

echo "\n🔒 Security reminder: Never commit your .env file to version control!\n\n";