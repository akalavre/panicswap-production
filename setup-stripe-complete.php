<?php
echo "=== PanicSwap Stripe Setup ===\n\n";

// Check if composer is installed
echo "1. Checking for Composer...\n";
$composerCheck = shell_exec('composer --version 2>&1');
if (strpos($composerCheck, 'Composer version') === false) {
    echo "❌ Composer is not installed. Please install Composer first.\n";
    echo "Visit: https://getcomposer.org/download/\n";
    exit(1);
}
echo "✅ Composer is installed\n\n";

// Install dependencies
echo "2. Installing Stripe dependencies...\n";
$installResult = shell_exec('cd ' . __DIR__ . ' && composer install 2>&1');
echo $installResult . "\n";

if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo "❌ Failed to install dependencies\n";
    exit(1);
}
echo "✅ Dependencies installed\n\n";

// Check .env file
echo "3. Checking .env configuration...\n";
$envFile = __DIR__ . '/.env';
$envContent = file_get_contents($envFile);

// Add Stripe configuration if not present
if (strpos($envContent, 'STRIPE_SECRET_KEY') === false) {
    echo "Adding Stripe configuration to .env file...\n";
    
    $stripeConfig = "\n# Stripe Configuration\n";
    $stripeConfig .= "STRIPE_SECRET_KEY=sk_test_your_test_key_here\n";
    $stripeConfig .= "STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here\n";
    $stripeConfig .= "STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here\n";
    
    file_put_contents($envFile, $envContent . $stripeConfig);
    echo "✅ Added Stripe configuration placeholders to .env\n";
} else {
    echo "✅ Stripe configuration already exists in .env\n";
}

echo "\n4. Next Steps:\n";
echo "   a) Get your Stripe API keys from: https://dashboard.stripe.com/apikeys\n";
echo "   b) Update the following values in your .env file:\n";
echo "      - STRIPE_SECRET_KEY (starts with sk_test_ or sk_live_)\n";
echo "      - STRIPE_PUBLISHABLE_KEY (starts with pk_test_ or pk_live_)\n";
echo "   c) Create a webhook endpoint in Stripe Dashboard:\n";
echo "      - URL: " . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'your-domain.com') . "/api/webhook-stripe.php\n";
echo "      - Events to listen: checkout.session.completed, customer.subscription.*, invoice.*\n";
echo "   d) Update STRIPE_WEBHOOK_SECRET with the signing secret from the webhook\n";
echo "\n✅ Stripe setup is ready! Update your .env file with actual keys to enable payments.\n";
?>