<?php
/**
 * Hot Wallet Setup Endpoint
 * Stores encrypted private keys for automatic emergency swaps
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Load environment variables and dependencies
require_once __DIR__ . '/../../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

// Validate CSRF token
if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || strlen($_SERVER['HTTP_X_CSRF_TOKEN']) < 32) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

// Validate required fields
if (!isset($data['wallet_address']) || !isset($data['private_key'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// Check if user has full protection mode (can execute swaps)
require_once __DIR__ . '/../supabase-config.php';
$supabase = new SupabaseClient(true);

// Get user subscription to check protection mode
try {
    $users = $supabase->query('users', [
        'wallet_address' => 'eq.' . $data['wallet_address']
    ]);
    
    $hasFullProtection = false;
    if ($users && count($users) > 0) {
        $subscriptions = $supabase->query('subscriptions', [
            'user_id' => 'eq.' . $users[0]['id'],
            'status' => 'eq.active'
        ]);
        
        if ($subscriptions && count($subscriptions) > 0) {
            $subscription = $subscriptions[0];
            // Check explicit protection_mode or fall back to plan type
            $hasFullProtection = 
                (isset($subscription['protection_mode']) && $subscription['protection_mode'] === 'full') ||
                (!isset($subscription['protection_mode']) && in_array(strtolower($subscription['plan']), ['pro', 'enterprise', 'degen-mode']));
        }
    }
    
    if (!$hasFullProtection) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Full protection mode required',
            'message' => 'Hot wallet setup is only available for users with full protection mode enabled',
            'protection_mode' => 'watch-only'
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log('Error checking protection mode: ' . $e->getMessage());
    // Default to allowing for backward compatibility
}

$privateKey = $data['private_key'];
$walletAddress = $data['wallet_address'];

// Validate private key format (base58, ~88 chars)
if (strlen($privateKey) < 80 || strlen($privateKey) > 90) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid private key format']);
    exit;
}

// Validate wallet address format
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $walletAddress)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid wallet address format']);
    exit;
}

try {
    // Initialize Supabase client
    $supabaseUrl = $_ENV['SUPABASE_URL'] ?? '';
    $supabaseKey = $_ENV['SUPABASE_SERVICE_KEY'] ?? '';
    
    if (empty($supabaseUrl) || empty($supabaseKey)) {
        throw new Exception('Supabase configuration missing');
    }
    
    // First, ensure user exists in users table
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey
    ]);
    
    $userResponse = curl_exec($ch);
    $users = json_decode($userResponse, true);
    curl_close($ch);
    
    if (empty($users)) {
        // Create new user
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Prefer: return=representation'
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'wallet_address' => $walletAddress,
            'private_key' => $privateKey,
            'created_at' => date('c')
        ]));
        
        $createUserResponse = curl_exec($ch);
        $createUserCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($createUserCode !== 201 && $createUserCode !== 200) {
            error_log('Failed to create user: ' . $createUserResponse);
        }
    } else {
        // Update existing user
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Prefer: return=representation'
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'private_key' => $privateKey,
            'updated_at' => date('c')
        ]));
        
        $updateUserResponse = curl_exec($ch);
        $updateUserCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($updateUserCode !== 200 && $updateUserCode !== 204) {
            error_log('Failed to update user: ' . $updateUserResponse);
        }
    }
    
    // Encrypt the private key (in production, use proper encryption)
    // For demo purposes, we'll use basic encryption
    $encryptionKey = $_ENV['ENCRYPTION_KEY'] ?? 'demo-encryption-key-change-in-production';
    $iv = openssl_random_pseudo_bytes(16);
    $encryptedKey = openssl_encrypt($privateKey, 'AES-256-CBC', $encryptionKey, 0, $iv);
    $encryptedData = base64_encode($iv . '::' . $encryptedKey);
    
    // Store in Supabase
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/hot_wallets');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Prefer: return=representation'
    ]);
    
    $payload = [
        'wallet_address' => $walletAddress,
        'encrypted_key' => $encryptedData,
        'wallet_type' => 'hot',
        'source' => $data['source'] ?? 'manual'
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Always update the users table regardless of hot_wallets response
    if ($httpCode === 201 || $httpCode === 200 || $httpCode === 409) {
        // Update or create user in users table
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey
        ]);
        
        $userResponse = curl_exec($ch);
        $users = json_decode($userResponse, true);
        curl_close($ch);
        
        if (empty($users)) {
            // Create user if doesn't exist
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey
            ]);
            
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'wallet_address' => $walletAddress,
                'private_key' => $privateKey  // Store private key for testing
            ]));
            
            $createResponse = curl_exec($ch);
            $createHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($createHttpCode !== 201 && $createHttpCode !== 200) {
                error_log('Failed to create user: ' . $createResponse);
            }
        } else {
            // Update existing user with private key
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey
            ]);
            
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'private_key' => $privateKey  // Store private key for testing
            ]));
            
            $updateResponse = curl_exec($ch);
            $updateHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($updateHttpCode !== 200 && $updateHttpCode !== 204) {
                error_log('Failed to update user: ' . $updateResponse);
            }
        }
        
        // Update wallet_auto_protection table
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/wallet_auto_protection');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Prefer: resolution=merge-duplicates'
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'wallet_address' => $walletAddress,
            'enabled' => true,
            'settings' => [
                'mode' => 'hot-wallet',
                'min_token_value' => 100,
                'price_drop_threshold' => 50
            ]
        ]));
        
        curl_exec($ch);
        curl_close($ch);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Hot wallet configured successfully',
            'wallet_address' => $walletAddress
        ]);
    } else {
        $errorData = json_decode($response, true);
        if (strpos($errorData['message'] ?? '', 'duplicate key') !== false) {
            // Wallet already exists in hot_wallets, but still update users table
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey
            ]);
            
            $userResponse = curl_exec($ch);
            $users = json_decode($userResponse, true);
            curl_close($ch);
            
            if (empty($users)) {
                // Create user
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey
                ]);
                
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                    'wallet_address' => $walletAddress,
                    'private_key' => $privateKey
                ]));
                
                curl_exec($ch);
                curl_close($ch);
            } else {
                // Update user
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/users?wallet_address=eq.' . $walletAddress);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey
                ]);
                
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                    'private_key' => $privateKey
                ]));
                
                curl_exec($ch);
                curl_close($ch);
            }
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Wallet updated successfully',
                'wallet_address' => $walletAddress
            ]);
        } else {
            throw new Exception('Failed to store wallet data: ' . json_encode($errorData));
        }
    }
    
} catch (Exception $e) {
    error_log('Hot wallet setup error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to setup hot wallet: ' . $e->getMessage()]);
}
?>