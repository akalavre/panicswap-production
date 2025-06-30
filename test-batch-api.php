<?php
// Test script for batch API endpoint

// Test wallet and tokens
$testWallet = 'So11111111111111111111111111111111111111112';
$testTokens = [
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'So11111111111111111111111111111111111111112' // SOL
];

// Make request to batch API
$url = 'http://localhost/PanicSwap-php/api/v2/batch.php';
$data = [
    'wallet' => $testWallet,
    'tokens' => $testTokens
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Wallet-Address: ' . $testWallet
]);

echo "Testing batch API endpoint...\n";
echo "URL: $url\n";
echo "Data: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($error) {
    echo "CURL Error: $error\n";
}
echo "Response:\n";
echo $response . "\n\n";

// Try to decode JSON
$decoded = json_decode($response, true);
if ($decoded) {
    echo "Decoded Response:\n";
    print_r($decoded);
} else {
    echo "Failed to decode JSON response\n";
}

// Check PHP error log
$errorLog = ini_get('error_log');
echo "\nPHP Error Log Location: $errorLog\n";

// Try to read last few lines of error log
if (file_exists($errorLog) && is_readable($errorLog)) {
    echo "\nLast 10 lines of PHP error log:\n";
    $lines = file($errorLog);
    $lastLines = array_slice($lines, -10);
    foreach ($lastLines as $line) {
        if (strpos($line, 'batch-v2') !== false) {
            echo $line;
        }
    }
}
?>