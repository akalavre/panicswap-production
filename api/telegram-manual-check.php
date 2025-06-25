<?php
// Manual check for Telegram updates (for testing without webhook)
require_once __DIR__ . '/../config/supabase.php';

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

header('Content-Type: application/json');

$botToken = getenv('TELEGRAM_BOT_TOKEN');

// First, delete any existing webhook
$deleteUrl = "https://api.telegram.org/bot{$botToken}/deleteWebhook";
$ch = curl_init($deleteUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$deleteResponse = curl_exec($ch);
curl_close($ch);

// Get updates manually
$url = "https://api.telegram.org/bot{$botToken}/getUpdates";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['error' => 'Failed to get updates']);
    exit;
}

$data = json_decode($response, true);
$result = [
    'success' => true,
    'updates_found' => count($data['result']),
    'processed' => []
];

if ($data['ok'] && !empty($data['result'])) {
    $supabase = new \Supabase\CreateClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    foreach ($data['result'] as $update) {
        if (isset($update['message']['text']) && strpos($update['message']['text'], '/start') === 0) {
            $message = $update['message'];
            $chatId = $message['chat']['id'];
            $userId = $message['from']['id'];
            $username = $message['from']['username'] ?? null;
            
            // Extract wallet address
            $text = $message['text'];
            $parts = explode(' ', $text);
            $walletAddress = isset($parts[1]) ? $parts[1] : null;
            
            if ($walletAddress && strlen($walletAddress) > 20) {
                // Process the connection
                try {
                    $userData = [
                        'wallet_address' => $walletAddress,
                        'telegram_user_id' => (string)$userId,
                        'telegram_chat_id' => (string)$chatId,
                        'telegram_username' => $username,
                        'telegram_connected' => true,
                        'telegram_notifications_enabled' => true,
                        'updated_at' => date('c')
                    ];
                    
                    // Check if user exists
                    $existingUser = $supabase->from('users')
                        ->select('id')
                        ->eq('wallet_address', $walletAddress)
                        ->execute();
                    
                    if ($existingUser->data && count($existingUser->data) > 0) {
                        // Update existing user
                        $updateResult = $supabase->from('users')
                            ->update($userData)
                            ->eq('wallet_address', $walletAddress)
                            ->execute();
                        
                        $result['processed'][] = [
                            'action' => 'updated',
                            'wallet' => substr($walletAddress, 0, 8) . '...',
                            'username' => $username,
                            'chat_id' => $chatId
                        ];
                    } else {
                        // Create new user
                        $userData['id'] = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                            mt_rand(0, 0xffff),
                            mt_rand(0, 0x0fff) | 0x4000,
                            mt_rand(0, 0x3fff) | 0x8000,
                            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                        );
                        $userData['created_at'] = date('c');
                        
                        $insertResult = $supabase->from('users')
                            ->insert($userData)
                            ->execute();
                        
                        $result['processed'][] = [
                            'action' => 'created',
                            'wallet' => substr($walletAddress, 0, 8) . '...',
                            'username' => $username,
                            'chat_id' => $chatId
                        ];
                    }
                    
                    // Send confirmation message
                    $confirmUrl = "https://api.telegram.org/bot{$botToken}/sendMessage";
                    $confirmData = [
                        'chat_id' => $chatId,
                        'text' => "✅ Successfully connected wallet: " . substr($walletAddress, 0, 4) . "..." . substr($walletAddress, -4) . "\n\nReturn to PanicSwap and click 'Verify' to complete setup.",
                        'parse_mode' => 'HTML'
                    ];
                    
                    $ch = curl_init($confirmUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $confirmData);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_exec($ch);
                    curl_close($ch);
                    
                } catch (\Exception $e) {
                    $result['errors'][] = $e->getMessage();
                }
            }
        }
    }
    
    // Mark updates as read
    if (!empty($data['result'])) {
        $lastUpdateId = end($data['result'])['update_id'];
        $markReadUrl = "https://api.telegram.org/bot{$botToken}/getUpdates?offset=" . ($lastUpdateId + 1);
        $ch = curl_init($markReadUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        curl_close($ch);
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);