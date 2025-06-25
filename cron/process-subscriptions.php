<?php
/**
 * Cron job to process automatic subscription renewals
 * 
 * This script should be run daily via cron:
 * 0 0 * * * /usr/bin/php /path/to/PanicSwap-php/cron/process-subscriptions.php
 * 
 * For WAMP on Windows, use Task Scheduler to run this script daily
 */

// Load environment variables
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Add cron secret to .env if not exists
$cronSecret = getenv('CRON_SECRET') ?: 'default-cron-secret-change-in-production';

// Log file for cron execution
$logFile = __DIR__ . '/subscription-processing.log';

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

logMessage("Starting subscription processing...");

// Call the auto-charge API endpoint
$apiUrl = 'http://localhost/PanicSwap-php/api/process-auto-charge.php';

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Cron-Secret: ' . $cronSecret
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    
    if ($result && $result['success']) {
        $summary = $result['summary'];
        logMessage("Successfully processed subscriptions: Total={$summary['total']}, Processed={$summary['processed']}, Failed={$summary['failed']}");
        
        // Log individual results if needed
        if (!empty($result['results'])) {
            foreach ($result['results'] as $res) {
                if ($res['status'] === 'failed') {
                    logMessage("Failed subscription {$res['subscription_id']}: {$res['error']}");
                }
            }
        }
    } else {
        logMessage("API returned error: " . json_encode($result));
    }
} else {
    logMessage("Failed to call API. HTTP Code: $httpCode, Response: $response");
}

logMessage("Subscription processing completed.");

// Send notification email if there were failures (optional)
if (isset($summary) && $summary['failed'] > 0) {
    // You can add email notification logic here
    // mail('admin@panicswap.com', 'Subscription Processing - Failures Detected', ...);
}
?>