<?php
// Check Telegram webhook status

// Load .env file if it exists
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

$botToken = getenv('TELEGRAM_BOT_TOKEN');

// Get webhook info
$url = "https://api.telegram.org/bot{$botToken}/getWebhookInfo";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Disable SSL verification for local development
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json');

if ($httpCode === 200) {
    $data = json_decode($response, true);
    
    if ($data['ok'] && $data['result']) {
        $info = $data['result'];
        $result = [
            'success' => true,
            'webhook_url' => $info['url'] ?? 'Not set',
            'has_custom_certificate' => $info['has_custom_certificate'] ?? false,
            'pending_update_count' => $info['pending_update_count'] ?? 0,
            'last_error_date' => isset($info['last_error_date']) ? date('Y-m-d H:i:s', $info['last_error_date']) : null,
            'last_error_message' => $info['last_error_message'] ?? null,
            'max_connections' => $info['max_connections'] ?? 40,
            'allowed_updates' => $info['allowed_updates'] ?? []
        ];
        
        // Check if webhook is set
        if (empty($info['url'])) {
            $result['warning'] = 'No webhook URL is set. Run setup-telegram-webhook.php to configure.';
        }
        
        echo json_encode($result, JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to get webhook info'
        ]);
    }
} else {
    $result = [
        'success' => false,
        'error' => 'Failed to connect to Telegram API',
        'http_code' => $httpCode
    ];
    
    if ($curlError) {
        $result['curl_error'] = $curlError;
    }
    
    if ($response) {
        $result['response'] = $response;
    }
    
    // Check if bot token is set
    if (!$botToken) {
        $result['error'] = 'Bot token not configured';
        $result['hint'] = 'Check TELEGRAM_BOT_TOKEN in .env file';
    }
    
    echo json_encode($result);
}