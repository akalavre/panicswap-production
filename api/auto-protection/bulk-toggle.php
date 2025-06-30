<?php
// Auto-Protection Bulk Toggle API Endpoint
// POST /api/auto-protection/bulk-toggle/:walletAddress
// Enables/disables protection for all wallet tokens and manages wallet_auto_protection setting

// Ensure we output JSON even if there's an error
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

// Set up error handler to catch any errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log('[bulk-toggle] PHP Error: ' . $errstr . ' in ' . basename($errfile) . ':' . $errline);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'PHP Error',
        'message' => $errstr,
        'file' => basename($errfile),
        'line' => $errline
    ]);
    exit;
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if config file exists
$configPath = __DIR__ . '/../supabase-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found at: ' . $configPath]);
    exit;
}

require_once $configPath;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Extract wallet address from URL path or query parameter
$walletAddress = $_GET['wallet'] ?? null;

if (!$walletAddress) {
    // Fallback: try to extract from URL path
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    $walletAddress = end($pathSegments);
}

// Get request body
$input = json_decode(file_get_contents('php://input'), true);
$enabled = $input['enabled'] ?? null;

if (!$walletAddress || $enabled === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing wallet address or enabled parameter']);
    exit;
}

try {
    error_log('[bulk-toggle] Starting bulk toggle process');
    error_log('[bulk-toggle] Wallet: ' . $walletAddress);
    error_log('[bulk-toggle] Enabled: ' . ($enabled ? 'true' : 'false'));
    
    $supabase = new SupabaseClient(true);
    error_log('[bulk-toggle] SupabaseClient created successfully');
    
    // First, update or create wallet_auto_protection record using upsert
    $walletProtectionData = [
        'wallet_address' => $walletAddress,
        'enabled' => $enabled,
        'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
    ];
    
    // Check if record exists
    $existing = $supabase->query('wallet_auto_protection', [
        'wallet_address' => 'eq.' . $walletAddress
    ]);
    
    if ($existing && count($existing) > 0) {
        // Update existing record using direct API call
        $url = SUPABASE_URL . '/rest/v1/wallet_auto_protection?wallet_address=eq.' . $walletAddress;
        $headers = [
            'apikey: ' . SUPABASE_SERVICE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($walletProtectionData));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = ($httpCode >= 200 && $httpCode < 300);
    } else {
        // Create new record
        $walletProtectionData['created_at'] = (new DateTime())->format('Y-m-d H:i:s');
        $result = $supabase->insert('wallet_auto_protection', $walletProtectionData);
    }
    
    if (!$result) {
        throw new Exception('Failed to update wallet auto-protection setting');
    }
    
    // Get all wallet tokens
    $walletTokens = $supabase->query('wallet_tokens', [
        'wallet_address' => 'eq.' . $walletAddress
    ]);
    
    if (!$walletTokens) {
        echo json_encode([
            'success' => true,
            'message' => 'Auto-protect setting updated, but no tokens found for wallet',
            'tokens_affected' => 0,
            'wallet_auto_protection_updated' => true
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
            'wallet_address' => 'eq.' . $walletAddress
        ]);
        
        if ($existing && count($existing) > 0) {
            // Update all existing records
            foreach ($existing as $record) {
                // Check if id exists
                if (!isset($record['id'])) {
                    error_log('[bulk-toggle] Warning: No id field in protected_tokens record for token ' . $tokenMint);
                    error_log('[bulk-toggle] Record keys: ' . implode(', ', array_keys($record)));
                    continue;
                }
                
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
                'wallet_address' => $walletAddress,
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
        'total_wallet_tokens' => count($walletTokens),
        'wallet_auto_protection_updated' => true
    ]);
    
} catch (Exception $e) {
    error_log('Error in bulk-toggle API: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to toggle Auto-Protect',
        'message' => $e->getMessage()
    ]);
}
?>
