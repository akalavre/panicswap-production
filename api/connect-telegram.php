<?php
require_once __DIR__ . '/../config/supabase.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$walletAddress = $input['walletAddress'] ?? null;
$action = $input['action'] ?? 'check'; // check, verify, disconnect

if (!$walletAddress) {
    echo json_encode(['success' => false, 'error' => 'Wallet address required']);
    exit;
}

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

// Create Supabase client with service key to bypass RLS
$serviceKey = SUPABASE_SERVICE_KEY; // Use constant from config
$supabase = new \Supabase\CreateClient(SUPABASE_URL, $serviceKey);

switch ($action) {
    case 'check':
        // Check if wallet has Telegram connected
        try {
            $result = $supabase->from('users')
                ->select('telegram_user_id, telegram_connected')
                ->eq('wallet_address', $walletAddress)
                ->execute();
            
            if ($result->data && count($result->data) > 0) {
                $user = $result->data[0];
                echo json_encode([
                    'success' => true,
                    'connected' => $user->telegram_connected ?? false,
                    'telegram_user_id' => $user->telegram_user_id ?? null
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'connected' => false
                ]);
            }
        } catch (\Exception $e) {
            echo json_encode([
                'success' => true,
                'connected' => false
            ]);
        }
        break;
        
    case 'verify':
        // Check if user has connected via Telegram bot
        try {
            error_log("Verifying Telegram connection for wallet: $walletAddress");
            
            $result = $supabase->from('users')
                ->select('telegram_connected, telegram_user_id, telegram_chat_id')
                ->eq('wallet_address', $walletAddress)
                ->execute();
            
            error_log("Query result: " . json_encode($result));
            
            if ($result->data && count($result->data) > 0) {
                $user = $result->data[0];
                error_log("User data: " . json_encode($user));
                
                if ($user->telegram_connected && $user->telegram_user_id && $user->telegram_chat_id) {
                    // User has successfully connected via bot
                    // Send welcome message to their personal chat
                    sendPersonalWelcomeMessage($user->telegram_chat_id, $walletAddress);
                    
                    // Also send to channel
                    sendTelegramWelcomeMessage($walletAddress);
                    
                    echo json_encode([
                        'success' => true,
                        'connected' => true,
                        'message' => 'Telegram connected successfully!'
                    ]);
                } else {
                    // User hasn't connected via bot yet
                    echo json_encode([
                        'success' => false,
                        'connected' => false,
                        'error' => 'Please start the bot first by clicking the link'
                    ]);
                }
            } else {
                // No user record exists yet - this is normal
                echo json_encode([
                    'success' => false,
                    'connected' => false,
                    'error' => 'Connection not found. Please start the bot first by clicking the link above.'
                ]);
            }
        } catch (\Exception $e) {
            // Handle the specific "No rows found" error gracefully
            if (strpos($e->getMessage(), 'No rows found') !== false) {
                echo json_encode([
                    'success' => false,
                    'connected' => false,
                    'error' => 'Connection not found. Please start the bot first by clicking the link above.'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Database error: ' . $e->getMessage()
                ]);
            }
        }
        break;
        
    case 'disconnect':
        // Disconnect Telegram
        try {
            $result = $supabase->from('users')
                ->update([
                    'telegram_connected' => false,
                    'telegram_notifications_enabled' => false,
                    'updated_at' => date('c')
                ])
                ->eq('wallet_address', $walletAddress)
                ->execute();
            
            if ($result->data) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Telegram disconnected'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to disconnect'
                ]);
            }
        } catch (\Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

function sendTelegramWelcomeMessage($walletAddress) {
    $botToken = getenv('TELEGRAM_BOT_TOKEN');
    $chatId = getenv('TELEGRAM_CHAT_ID');
    
    $message = "🎉 New user connected!\n\n";
    $message .= "Wallet: " . substr($walletAddress, 0, 4) . "..." . substr($walletAddress, -4) . "\n";
    $message .= "Status: ✅ Alert notifications enabled\n\n";
    $message .= "You'll now receive instant alerts for:\n";
    $message .= "• Rugpull detections\n";
    $message .= "• Emergency swaps\n";
    $message .= "• Price movements\n";
    $message .= "• Protection status changes";
    
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
    curl_exec($ch);
    curl_close($ch);
}

function sendPersonalWelcomeMessage($userChatId, $walletAddress) {
    $botToken = getenv('TELEGRAM_BOT_TOKEN');
    
    $message = "✅ <b>PanicSwap Protection Active!</b>\n\n";
    $message .= "Your wallet is now protected:\n";
    $message .= "<code>" . substr($walletAddress, 0, 4) . "..." . substr($walletAddress, -4) . "</code>\n\n";
    $message .= "You'll receive personal alerts here when:\n";
    $message .= "• 🚨 Rugpulls are detected\n";
    $message .= "• ⚡ Emergency swaps execute\n";
    $message .= "• 📉 Significant price drops occur\n";
    $message .= "• 🛡️ Protection status changes\n\n";
    $message .= "Manage your protection at app.panicswap.com";
    
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $data = [
        'chat_id' => $userChatId,
        'text' => $message,
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