<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/supabase.php';
require_once '../config/encryption.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['wallet_address'])) {
        throw new Exception('Wallet address is required');
    }

    $walletAddress = $input['wallet_address'];
    $privateKey = isset($input['private_key']) ? $input['private_key'] : null;
    $walletType = isset($input['wallet_type']) ? $input['wallet_type'] : 'browser';

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
    
    // Get the service key from environment
    $supabaseServiceKey = getenv('SUPABASE_SERVICE_KEY') ?: SUPABASE_ANON_KEY;
    
    $client = new Supabase\CreateClient(SUPABASE_URL, $supabaseServiceKey);
    
    // Check if user already exists
    try {
        $existingUser = $client->from('users')
            ->select('*')
            ->eq('wallet_address', $walletAddress)
            ->single()
            ->execute();
        
        // User exists, update if necessary
        $updateData = [
            'updated_at' => date('c')
        ];

        // Update private key if provided (hot wallet)
        if ($walletType === 'hot' && $privateKey) {
            // Encrypt the private key before storing
            $updateData['private_key'] = Encryption::encrypt($privateKey);
        }

        $result = $client->from('users')
            ->update($updateData)
            ->eq('wallet_address', $walletAddress)
            ->execute();

        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully',
            'user_id' => (is_object($existingUser->data) ? $existingUser->data->id : $existingUser->data['id']) ?? null,
            'wallet_address' => $walletAddress
        ]);
    } catch (Exception $e) {
        // User doesn't exist, create new one
        $userData = [
            'wallet_address' => $walletAddress,
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];

        // Only add private key if it's a hot wallet
        if ($walletType === 'hot' && $privateKey) {
            // Encrypt the private key before storing
            $userData['private_key'] = Encryption::encrypt($privateKey);
        }

        $result = $client->from('users')
            ->insert($userData)
            ->execute();

        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user_id' => (is_array($result->data) && isset($result->data[0]) ? 
                (is_object($result->data[0]) ? $result->data[0]->id : $result->data[0]['id']) : null),
            'wallet_address' => $walletAddress
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}