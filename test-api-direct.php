<?php
// Direct test of monitoring-status.php API

// Test token from wallet that has tokens
$tokenMint = 'FKHhp1mHgKevhYkvNQEMTRAuFHBmEA5xTmo8cxjBpump';
$walletAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';

$url = "http://localhost/PanicSwap-php/api/monitoring-status.php/{$tokenMint}?wallet={$walletAddress}";

echo "Testing API: $url\n\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Headers:\n$header\n";
echo "Body:\n";

// Try to decode as JSON
$json = json_decode($body, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode($json, JSON_PRETTY_PRINT);
} else {
    // If not JSON, show raw body (first 500 chars)
    echo substr($body, 0, 500);
    if (strlen($body) > 500) {
        echo "\n... (truncated)";
    }
}
echo "\n";