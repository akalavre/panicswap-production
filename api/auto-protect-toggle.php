<?php
// Auto-Protect Toggle API Endpoint
// Enables/disables protection for all wallet tokens

// Ensure we output JSON even if there's an error
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if config file exists
$configPath = __DIR__ . '/supabase-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}

require_once $configPath;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$wallet_address = $input['wallet_address'] ?? null;
$enabled = $input['enabled'] ?? null;

if (!$wallet_address || $enabled === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $supabase = new SupabaseClient(true);
    
    // Get all wallet tokens
    $walletTokens = $supabase->query('wallet_tokens', [
        'wallet_address' => 'eq.' . $wallet_address
    ]);
    
    if (!$walletTokens) {
        echo json_encode([
            'success' => true,
            'message' => 'No tokens found for wallet',
            'tokens_affected' => 0
        ]);
        exit;
    }
    
    $updatedCount = 0;
    $createdCount = 0;
    
    // Process each token
    foreach ($walletTokens as $walletToken) {
        $tokenMint = $walletToken['token_mint'];
        
        // Check if protection record exists
        $existing = $supabase->query('protected_tokens', [
            'token_mint' => 'eq.' . $tokenMint,
            'wallet_address' => 'eq.' . $wallet_address
        ]);
        
        if ($existing && count($existing) > 0) {
            // Update all existing records
            foreach ($existing as $record) {
                $result = $supabase->update('protected_tokens', $record['id'], [
                    'monitoring_enabled' => $enabled,
                    'is_active' => $enabled,
                    'monitoring_active' => $enabled,
                    'status' => $enabled ? 'active' : 'inactive',
                    'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
                ]);
                if ($result) {
                    $updatedCount++;
                }
            }
        } else if ($enabled) {
            // Create new protection record only if enabling
            // Get token metadata for symbol and name
            $metadata = $supabase->query('token_metadata', [
                'mint' => 'eq.' . $tokenMint
            ]);
            
            $tokenSymbol = 'Unknown';
            $tokenName = 'Unknown Token';
            
            if ($metadata && count($metadata) > 0) {
                $tokenSymbol = $metadata[0]['symbol'] ?? $tokenSymbol;
                $tokenName = $metadata[0]['name'] ?? $metadata[0]['symbol'] ?? $tokenName;
            }
            
            $result = $supabase->insert('protected_tokens', [
                'wallet_address' => $wallet_address,
                'token_mint' => $tokenMint,
                'token_symbol' => $tokenSymbol,
                'token_name' => $tokenName,
                'protection_settings' => json_encode([
                    'price_drop_threshold' => 20,
                    'liquidity_drop_threshold' => 30,
                    'enable_auto_sell' => false,
                    'notification_enabled' => true
                ]),
                'is_active' => true,
                'monitoring_active' => true,
                'monitoring_enabled' => true,
                'status' => 'active',
                'created_at' => (new DateTime())->format('Y-m-d H:i:s'),
                'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
            ]);
            
            if ($result) {
                $createdCount++;
            }
        }
    }
    
    $totalAffected = $updatedCount + $createdCount;
    
    echo json_encode([
        'success' => true,
        'message' => $enabled 
            ? "Auto-Protect enabled for all tokens ($createdCount new, $updatedCount updated)" 
            : "Auto-Protect disabled for all tokens ($updatedCount updated)",
        'tokens_affected' => $totalAffected,
        'tokens_created' => $createdCount,
        'tokens_updated' => $updatedCount,
        'total_wallet_tokens' => count($walletTokens)
    ]);
    
} catch (Exception $e) {
    error_log('Error in auto-protect-toggle.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to toggle Auto-Protect',
        'message' => $e->getMessage()
    ]);
}
?>