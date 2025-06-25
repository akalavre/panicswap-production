<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$walletAddress = $input['walletAddress'] ?? 'Unknown';

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

// Send test alert to Telegram
$botToken = getenv('TELEGRAM_BOT_TOKEN');
$chatId = getenv('TELEGRAM_CHAT_ID');

$shortWallet = substr($walletAddress, 0, 4) . '...' . substr($walletAddress, -4);

$message = "🎉 <b>Telegram Alerts Connected!</b>\n\n";
$message .= "Wallet: <code>$shortWallet</code>\n";
$message .= "Status: ✅ Active\n\n";
$message .= "You'll now receive alerts for:\n";
$message .= "• 🚨 Rugpull detections\n";
$message .= "• ⚡ Emergency swaps\n";
$message .= "• 📉 Price movements\n";
$message .= "• 🛡️ Protection updates\n\n";
$message .= "<i>Welcome to PanicSwap protection!</i>";

$url = "https://api.telegram.org/bot{$botToken}/sendMessage";
$data = [
    'chat_id' => $chatId,
    'text' => $message,
    'parse_mode' => 'HTML'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

echo json_encode(['success' => true]);