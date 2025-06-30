<?php
// Direct debugging script for batch API

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h2>Batch API Debug Test</h2>";
echo "<pre>";

// Test 1: Check if Supabase config can be loaded
echo "Test 1: Loading Supabase config...\n";
try {
    require_once __DIR__ . '/config/supabase.php';
    echo "✓ Supabase config loaded successfully\n";
} catch (Exception $e) {
    echo "✗ Failed to load Supabase config: " . $e->getMessage() . "\n";
    exit;
}

// Test 2: Check if function exists
echo "\nTest 2: Checking Supabase function...\n";
if (function_exists('Supabase\getSupabaseServiceClient')) {
    echo "✓ getSupabaseServiceClient function exists\n";
} else {
    echo "✗ getSupabaseServiceClient function not found\n";
    exit;
}

// Test 3: Try to create Supabase client
echo "\nTest 3: Creating Supabase client...\n";
try {
    $supabase = Supabase\getSupabaseServiceClient();
    echo "✓ Supabase client created successfully\n";
} catch (Exception $e) {
    echo "✗ Failed to create Supabase client: " . $e->getMessage() . "\n";
    exit;
}

// Test 4: Try a simple query
echo "\nTest 4: Testing simple query...\n";
try {
    $testWallet = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
    $response = $supabase->from('wallet_tokens')
        ->select('token_mint')
        ->eq('wallet_address', $testWallet)
        ->limit(1)
        ->execute();
    
    if ($response->error) {
        echo "✗ Query error: " . json_encode($response->error) . "\n";
    } else {
        echo "✓ Query successful\n";
        echo "Data: " . json_encode($response->data) . "\n";
    }
} catch (Exception $e) {
    echo "✗ Query exception: " . $e->getMessage() . "\n";
}

// Test 5: Test the IN filter
echo "\nTest 5: Testing IN filter...\n";
try {
    $testTokens = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'];
    $response = $supabase->from('wallet_tokens')
        ->select('*')
        ->eq('wallet_address', $testWallet)
        ->in('token_mint', $testTokens)
        ->execute();
    
    if ($response->error) {
        echo "✗ IN filter error: " . json_encode($response->error) . "\n";
        echo "Error details:\n";
        var_dump($response->error);
    } else {
        echo "✓ IN filter successful\n";
        echo "Found " . count($response->data) . " tokens\n";
    }
} catch (Exception $e) {
    echo "✗ IN filter exception: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

// Test 6: Check materialized view
echo "\nTest 6: Testing materialized view...\n";
try {
    $response = $supabase->from('token_dashboard_view')
        ->select('*')
        ->limit(1)
        ->execute();
    
    if ($response->error && strpos($response->error->message ?? '', 'relation') !== false) {
        echo "✗ Materialized view does not exist\n";
    } elseif ($response->error) {
        echo "✗ View query error: " . json_encode($response->error) . "\n";
    } else {
        echo "✓ Materialized view exists and is queryable\n";
    }
} catch (Exception $e) {
    echo "✗ View exception: " . $e->getMessage() . "\n";
}

// Test 7: Direct batch API call
echo "\nTest 7: Testing batch API directly...\n";
$batchUrl = 'http://localhost/PanicSwap-php/api/v2/batch.php';
$testData = [
    'wallet' => $testWallet,
    'tokens' => ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
];

$ch = curl_init($batchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Wallet-Address: ' . $testWallet
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: " . substr($response, 0, 500) . "\n";

if ($httpCode !== 200) {
    $decoded = json_decode($response, true);
    if ($decoded) {
        echo "Error details:\n";
        print_r($decoded);
    }
}

// Check PHP error log
echo "\n\nPHP Error Log Location: " . ini_get('error_log') . "\n";

echo "</pre>";
?>