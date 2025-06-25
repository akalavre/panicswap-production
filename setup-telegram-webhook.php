<?php
// Setup Telegram webhook for production
// Run this once to register the webhook with Telegram

// Load .env file if it exists
$envFile = __DIR__ . '/.env';
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

// Get command line argument for the webhook URL
if ($argc < 2) {
    echo "Usage: php setup-telegram-webhook.php <webhook_url>\n";
    echo "Example: php setup-telegram-webhook.php https://yourdomain.com/api/telegram-webhook.php\n";
    exit(1);
}

$webhookUrl = $argv[1];

// Validate URL
if (!filter_var($webhookUrl, FILTER_VALIDATE_URL) || !str_starts_with($webhookUrl, 'https://')) {
    echo "Error: Webhook URL must be a valid HTTPS URL\n";
    exit(1);
}

echo "Setting up Telegram webhook...\n";
echo "Bot Token: " . substr($botToken, 0, 10) . "...\n";
echo "Webhook URL: $webhookUrl\n\n";

// Set webhook
$url = "https://api.telegram.org/bot{$botToken}/setWebhook";
$data = [
    'url' => $webhookUrl,
    'allowed_updates' => ['message', 'callback_query']
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

if ($httpCode === 200 && $result['ok']) {
    echo "✅ Webhook set successfully!\n\n";
    
    // Get webhook info
    $infoUrl = "https://api.telegram.org/bot{$botToken}/getWebhookInfo";
    $ch = curl_init($infoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $infoResponse = curl_exec($ch);
    curl_close($ch);
    
    $info = json_decode($infoResponse, true);
    if ($info['ok'] && $info['result']) {
        echo "Webhook Info:\n";
        echo "- URL: " . $info['result']['url'] . "\n";
        echo "- Pending updates: " . ($info['result']['pending_update_count'] ?? 0) . "\n";
        echo "- Max connections: " . ($info['result']['max_connections'] ?? 40) . "\n";
        if (isset($info['result']['last_error_date'])) {
            echo "- Last error: " . date('Y-m-d H:i:s', $info['result']['last_error_date']) . "\n";
            echo "- Error message: " . ($info['result']['last_error_message'] ?? 'N/A') . "\n";
        }
    }
} else {
    echo "❌ Failed to set webhook!\n";
    echo "HTTP Code: $httpCode\n";
    echo "Response: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
}

echo "\nNote: Make sure your webhook URL is publicly accessible and uses HTTPS.\n";
echo "The webhook will receive updates when users interact with your bot.\n";