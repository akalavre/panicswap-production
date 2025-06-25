<?php
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

// Telegram webhook endpoint to receive /start commands
header('Content-Type: application/json');

// Get webhook data
$input = file_get_contents('php://input');
$update = json_decode($input, true);

// Log webhook for debugging
error_log('Telegram webhook: ' . $input);

if (!$update) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

// Check if this is a /start command
if (isset($update['message']['text']) && strpos($update['message']['text'], '/start') === 0) {
    $message = $update['message'];
    $chatId = $message['chat']['id'];
    $userId = $message['from']['id'];
    $username = $message['from']['username'] ?? null;
    $firstName = $message['from']['first_name'] ?? 'User';
    
    // Extract wallet address from start parameter
    $text = $message['text'];
    $parts = explode(' ', $text);
    $walletAddress = isset($parts[1]) ? $parts[1] : null;
    
    error_log("Processing /start command - Chat ID: $chatId, User ID: $userId, Wallet: $walletAddress");
    
    $botToken = getenv('TELEGRAM_BOT_TOKEN');
    
    if ($walletAddress && strlen($walletAddress) > 20) {
        // Valid wallet address provided
        // Use service key to bypass RLS
        $serviceKey = SUPABASE_SERVICE_KEY; // Use constant from config
        error_log("Using service key: " . substr($serviceKey, 0, 20) . "...");
        
        $supabase = new \Supabase\CreateClient(SUPABASE_URL, $serviceKey);
        
        try {
            // Update user record with Telegram info
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
                error_log("Updating existing user for wallet: $walletAddress");
                $result = $supabase->from('users')
                    ->update($userData)
                    ->eq('wallet_address', $walletAddress)
                    ->execute();
                
                if ($result->error) {
                    error_log("Update error: " . json_encode($result->error));
                } else {
                    error_log("User updated successfully");
                }
            } else {
                // Create new user with UUID
                error_log("Creating new user for wallet: $walletAddress");
                $userData['id'] = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                    mt_rand(0, 0xffff),
                    mt_rand(0, 0x0fff) | 0x4000,
                    mt_rand(0, 0x3fff) | 0x8000,
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                );
                $userData['created_at'] = date('c');
                $result = $supabase->from('users')
                    ->insert($userData)
                    ->execute();
                
                if ($result->error) {
                    error_log("Insert error: " . json_encode($result->error));
                } else {
                    error_log("User created successfully");
                }
            }
            
            // Send success message to user
            $shortWallet = substr($walletAddress, 0, 4) . '...' . substr($walletAddress, -4);
            $responseText = "✅ <b>Successfully connected!</b>\n\n";
            $responseText .= "Wallet: <code>$shortWallet</code>\n";
            $responseText .= "Status: Active\n\n";
            $responseText .= "You'll receive alerts here when:\n";
            $responseText .= "• 🚨 Rugpulls are detected\n";
            $responseText .= "• ⚡ Emergency swaps execute\n";
            $responseText .= "• 📉 Significant price drops occur\n";
            $responseText .= "• 🛡️ Protection status changes\n\n";
            $responseText .= "Return to PanicSwap and click 'Verify' to complete setup.";
            
        } catch (\Exception $e) {
            $responseText = "❌ Error connecting wallet. Please try again.";
            error_log('Telegram connection error: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
        }
    } else {
        // No wallet address or invalid format
        $responseText = "👋 Welcome to PanicSwap Alerts!\n\n";
        $responseText .= "To connect your wallet:\n";
        $responseText .= "1. Go to app.panicswap.com\n";
        $responseText .= "2. Connect your wallet\n";
        $responseText .= "3. Click 'Connect Telegram'\n";
        $responseText .= "4. Follow the instructions\n\n";
        $responseText .= "This will link your wallet to receive protection alerts.";
    }
    
    // Send response to user
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $responseText,
        'parse_mode' => 'HTML'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_exec($ch);
    curl_close($ch);
}

// Telegram expects 200 OK response
http_response_code(200);
echo json_encode(['ok' => true]);