<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if config file exists
$configPath = __DIR__ . '/../supabase-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}

require_once $configPath;

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Handle protect request
    $input = json_decode(file_get_contents('php://input'), true);
    
    $token_mint = $input['token_mint'] ?? null;
    $wallet_address = $input['wallet_address'] ?? null;
    $token_symbol = $input['token_symbol'] ?? null;
    $token_name = $input['token_name'] ?? null;
    $enable_mempool = $input['enable_mempool'] ?? false;
    
    // Validate risk threshold
    $valid_thresholds = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    $risk_threshold = strtoupper($input['risk_threshold'] ?? 'HIGH');
    if (!in_array($risk_threshold, $valid_thresholds)) {
        $risk_threshold = 'HIGH';
    }
    
    // Validate priority fee multiplier
    $priority_fee_multiplier = floatval($input['priority_fee_multiplier'] ?? 1.5);
    if ($priority_fee_multiplier < 1.0 || $priority_fee_multiplier > 10.0) {
        $priority_fee_multiplier = 1.5;
    }
    
    if (!$token_mint || !$wallet_address) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    try {
        $supabase = new SupabaseClient(true);
        
        // Check if token is already protected
        $existing = $supabase->query('protected_tokens', [
            'token_mint' => 'eq.' . $token_mint,
            'wallet_address' => 'eq.' . $wallet_address
        ]);
        
        if ($existing && count($existing) > 0) {
            // Update existing protection
            $updateData = [
                'is_active' => true,
                'monitoring_active' => true,
                'monitoring_enabled' => true,
                'status' => 'active',
                'mempool_monitoring' => $enable_mempool,
                'risk_threshold' => $risk_threshold,
                'priority_fee_multiplier' => $priority_fee_multiplier,
                'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
            ];
            
            $result = $supabase->update('protected_tokens', $existing[0]['id'], $updateData);
            
            echo json_encode([
                'success' => true,
                'message' => 'Protection reactivated',
                'data' => $result
            ]);
        } else {
            // Create new protection
            $protection_settings = [
                'price_drop_threshold' => 20,
                'liquidity_drop_threshold' => 30,
                'enable_auto_sell' => false,
                'notification_enabled' => true
            ];
            
            $result = $supabase->insert('protected_tokens', [
                'wallet_address' => $wallet_address,
                'token_mint' => $token_mint,
                'token_symbol' => $token_symbol,
                'token_name' => $token_name,
                'protection_settings' => json_encode($protection_settings),
                'is_active' => true,
                'monitoring_active' => true,
                'monitoring_enabled' => true,
                'status' => 'active',
                'mempool_monitoring' => $enable_mempool,
                'risk_threshold' => $risk_threshold,
                'priority_fee_multiplier' => $priority_fee_multiplier,
                'created_at' => (new DateTime())->format('Y-m-d H:i:s'),
                'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Token protected successfully',
                'data' => $result
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to protect token',
            'message' => $e->getMessage()
        ]);
    }
    
} elseif ($method === 'DELETE') {
    // Handle unprotect request
    $wallet_address = $_GET['wallet'] ?? null;
    $token_mint = $_GET['mint'] ?? null;
    
    if (!$token_mint || !$wallet_address) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    try {
        $supabase = new SupabaseClient(true);
        
        // Check if token is protected
        $existing = $supabase->query('protected_tokens', [
            'token_mint' => 'eq.' . $token_mint,
            'wallet_address' => 'eq.' . $wallet_address
        ]);
        
        if ($existing && count($existing) > 0) {
            // Update all existing protection entries to disabled
            $updateData = [
                'is_active' => false,
                'monitoring_active' => false,
                'monitoring_enabled' => false,
                'status' => 'inactive',
                'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
            ];
            
            $updatedCount = 0;
            foreach ($existing as $record) {
                $result = $supabase->update('protected_tokens', $record['id'], $updateData);
                if ($result) {
                    $updatedCount++;
                }
            }
            
            echo json_encode([
                'success' => $updatedCount > 0,
                'message' => $updatedCount > 0 ? 'Protection disabled successfully' : 'Failed to update records',
                'rows_updated' => $updatedCount
            ]);
        } else {
            // Token not found - still return success
            echo json_encode([
                'success' => true,
                'message' => 'Token is not protected',
                'already_unprotected' => true
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to disable protection',
            'message' => $e->getMessage()
        ]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

