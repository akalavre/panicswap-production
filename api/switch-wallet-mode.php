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
    
    if (!isset($input['wallet_address']) || !isset($input['mode'])) {
        throw new Exception('Wallet address and mode are required');
    }

    $walletAddress = $input['wallet_address'];
    $mode = $input['mode'];
    $privateKey = isset($input['private_key']) ? $input['private_key'] : null;

    // Validate mode
    if (!in_array($mode, ['watch', 'full'])) {
        throw new Exception('Invalid mode. Must be "watch" or "full"');
    }

    // If switching to full mode, private key is required
    if ($mode === 'full' && !$privateKey) {
        throw new Exception('Private key is required when switching to full protection');
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
    
    // Get the service key from environment
    $supabaseServiceKey = getenv('SUPABASE_SERVICE_KEY') ?: SUPABASE_ANON_KEY;
    
    $client = new Supabase\CreateClient(SUPABASE_URL, $supabaseServiceKey);
    
    // Check if user exists
    try {
        $existingUser = $client->from('users')
            ->select('*')
            ->eq('wallet_address', $walletAddress)
            ->single()
            ->execute();
        
        if (!$existingUser->data) {
            throw new Exception('Wallet not found. Please connect your wallet first.');
        }

        // Prepare update data
        $updateData = [
            'updated_at' => date('c')
        ];

        // Handle mode switching
        if ($mode === 'full') {
            // Switching to full protection - store encrypted private key
            $updateData['private_key'] = Encryption::encrypt($privateKey);
            $updateData['protection_mode'] = 'full';
            
            // Log the upgrade
            error_log("Wallet {$walletAddress} upgraded to full protection");
            
        } else if ($mode === 'watch') {
            // Switching to watch mode - remove private key
            $updateData['private_key'] = null;
            $updateData['protection_mode'] = 'watch';
            
            // Log the downgrade
            error_log("Wallet {$walletAddress} downgraded to watch mode");
        }

        // Update the user record
        $result = $client->from('users')
            ->update($updateData)
            ->eq('wallet_address', $walletAddress)
            ->execute();

        // Record the mode switch in activity log (if table exists)
        try {
            $activityData = [
                'wallet_address' => $walletAddress,
                'action' => 'mode_switch',
                'details' => json_encode([
                    'new_mode' => $mode,
                    'timestamp' => date('c')
                ]),
                'created_at' => date('c')
            ];

            $client->from('wallet_activity')
                ->insert($activityData)
                ->execute();
        } catch (Exception $e) {
            // Ignore if activity table doesn't exist
            error_log("Failed to log activity: " . $e->getMessage());
        }

        $response = [
            'success' => true,
            'message' => $mode === 'full' ? 
                'Successfully upgraded to full protection' : 
                'Successfully downgraded to watch mode',
            'wallet_address' => $walletAddress,
            'new_mode' => $mode,
            'timestamp' => date('c')
        ];

        echo json_encode($response);

    } catch (Exception $e) {
        throw new Exception('Failed to update wallet mode: ' . $e->getMessage());
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'MODE_SWITCH_FAILED'
    ]);
    
    error_log("Mode switch error: " . $e->getMessage());
}
