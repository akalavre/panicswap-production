<?php
/**
 * Stripe Installation Checker
 * Run this in your browser: http://localhost/PanicSwap-php/check-stripe.php
 */

echo "<h1>PanicSwap Stripe Installation Status</h1>";
echo "<pre style='background: #f0f0f0; padding: 20px; font-family: monospace;'>";

// Check if vendor directory exists
$vendorExists = file_exists(__DIR__ . '/vendor');
$autoloadExists = file_exists(__DIR__ . '/vendor/autoload.php');
$stripeExists = false;

echo "🔍 Checking installation status...\n\n";

echo "1. Vendor directory: " . ($vendorExists ? "✅ EXISTS" : "❌ NOT FOUND") . "\n";
echo "2. Autoloader file: " . ($autoloadExists ? "✅ EXISTS" : "❌ NOT FOUND") . "\n";

// Try to load Stripe
if ($autoloadExists) {
    try {
        require_once __DIR__ . '/vendor/autoload.php';
        if (class_exists('\Stripe\Stripe')) {
            $stripeExists = true;
            echo "3. Stripe SDK: ✅ INSTALLED (Version " . \Stripe\Stripe::VERSION . ")\n";
        } else {
            echo "3. Stripe SDK: ❌ NOT FOUND\n";
        }
    } catch (Exception $e) {
        echo "3. Stripe SDK: ❌ ERROR - " . $e->getMessage() . "\n";
    }
} else {
    echo "3. Stripe SDK: ❌ CANNOT CHECK (autoloader missing)\n";
}

// Check config
$configExists = file_exists(__DIR__ . '/config/stripe.php');
echo "4. Stripe config: " . ($configExists ? "✅ EXISTS" : "❌ NOT FOUND") . "\n";

// Check .env file
$envExists = file_exists(__DIR__ . '/.env');
$envExampleExists = file_exists(__DIR__ . '/.env.example');
echo "5. Environment file: " . ($envExists ? "✅ EXISTS" : ($envExampleExists ? "⚠️  .env.example EXISTS (needs to be copied)" : "❌ NOT FOUND")) . "\n";

echo "\n</pre>";

if (!$stripeExists) {
    echo "<h2 style='color: #e74c3c;'>❌ Stripe is NOT installed</h2>";
    echo "<p>Please follow one of these methods to install Stripe:</p>";
    
    echo "<div style='background: #fff; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3>Option 1: Run the Manual Installer (Recommended)</h3>";
    echo "<p>Click the button below to run the automatic installer:</p>";
    echo "<a href='install-stripe-manual.php' style='display: inline-block; padding: 10px 20px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px;'>Run Stripe Installer</a>";
    echo "</div>";
    
    echo "<div style='background: #fff; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3>Option 2: Manual Installation</h3>";
    echo "<ol>";
    echo "<li>Download Stripe SDK: <a href='https://github.com/stripe/stripe-php/archive/refs/tags/v13.0.0.zip' target='_blank'>Download ZIP</a></li>";
    echo "<li>Create a <code>vendor</code> folder in: <code>" . __DIR__ . "</code></li>";
    echo "<li>Extract the ZIP and place the <code>stripe-php-13.0.0</code> folder inside <code>vendor/stripe/</code></li>";
    echo "<li>Rename <code>stripe-php-13.0.0</code> to <code>stripe-php</code></li>";
    echo "<li>Create <code>vendor/autoload.php</code> with this content:</li>";
    echo "<pre style='background: #f8f8f8; padding: 10px; border: 1px solid #ddd;'>&lt;?php
require_once __DIR__ . '/stripe/stripe-php/lib/Stripe.php';
spl_autoload_register(function (\$class) {
    if (strpos(\$class, 'Stripe\\\\') === 0) {
        \$file = __DIR__ . '/stripe/stripe-php/lib/' . str_replace('\\\\', '/', \$class) . '.php';
        if (file_exists(\$file)) {
            require_once \$file;
        }
    }
});</pre>";
    echo "</ol>";
    echo "</div>";
    
} else {
    echo "<h2 style='color: #27ae60;'>✅ Stripe is installed!</h2>";
    
    // Check API keys
    if ($configExists) {
        require_once __DIR__ . '/config/stripe.php';
        $keysConfigured = (defined('STRIPE_SECRET_KEY') && 
                          !strpos(STRIPE_SECRET_KEY, 'your_test_key_here') &&
                          defined('STRIPE_PUBLISHABLE_KEY') && 
                          !strpos(STRIPE_PUBLISHABLE_KEY, 'your_test_key_here'));
        
        if (!$keysConfigured) {
            echo "<div style='background: #fff3cd; border: 1px solid #ffeeba; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
            echo "<h3>⚠️ Stripe API Keys Not Configured</h3>";
            
            if (!$envExists && $envExampleExists) {
                echo "<p>First, copy the example environment file:</p>";
                echo "<pre style='background: #f8f8f8; padding: 10px;'>cp .env.example .env</pre>";
            }
            
            echo "<p>Add your Stripe API keys to the <code>.env</code> file:</p>";
            echo "<pre style='background: #f8f8f8; padding: 10px;'>STRIPE_SECRET_KEY=sk_test_your_actual_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here</pre>";
            echo "<p>Get your API keys from: <a href='https://dashboard.stripe.com/apikeys' target='_blank'>Stripe Dashboard</a></p>";
            echo "</div>";
        } else {
            echo "<p style='color: #27ae60;'>✅ Stripe API keys are configured!</p>";
        }
    }
    
    // Test payment button
    echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3>Test Stripe Integration</h3>";
    echo "<p>Everything looks good! You can now test the payment system.</p>";
    echo "<a href='index.php' style='display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>Go to Homepage</a>";
    echo "<a href='subscription.php' style='display: inline-block; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px;'>Go to Subscription Page</a>";
    echo "</div>";
}

// Show current directory structure
echo "<h3>Current Directory Structure:</h3>";
echo "<pre style='background: #f0f0f0; padding: 20px;'>";
echo "Project Root: " . __DIR__ . "\n";
if ($vendorExists) {
    echo "└── vendor/\n";
    if (is_dir(__DIR__ . '/vendor/stripe')) {
        echo "    └── stripe/\n";
        $stripeContents = scandir(__DIR__ . '/vendor/stripe');
        foreach ($stripeContents as $item) {
            if ($item != '.' && $item != '..') {
                echo "        └── $item\n";
            }
        }
    }
}
echo "</pre>";

echo "<hr style='margin: 40px 0;'>";
echo "<p style='text-align: center; color: #666;'>PanicSwap Stripe Installation Checker</p>";
?>