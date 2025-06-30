<?php
// Ensure we output JSON even if there's an error
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set up error handler to catch any errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
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
$configPath = __DIR__ . '/supabase-config.php';
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

$input = json_decode(file_get_contents('php://input'), true);

$token_mint = $input['token_mint'] ?? null;
$wallet_address = $input['wallet_address'] ?? null;

if (!$token_mint || !$wallet_address) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $supabase = new SupabaseClient(true); // Use service key for write operations
    
    // Log the request details
    error_log("Unprotect request - Token: $token_mint, Wallet: $wallet_address");
    
    // Check if token is protected for this wallet
    $existing = $supabase->query('protected_tokens', [
        'token_mint' => 'eq.' . $token_mint,
        'wallet_address' => 'eq.' . $wallet_address
    ]);
    
    error_log("Found " . count($existing ?: []) . " matching rows");
    
    if ($existing && count($existing) > 0) {
        // Update ALL existing protection entries to disabled (handles duplicates)
        $updateData = [
            'is_active' => false,
            'monitoring_active' => false,
            'monitoring_enabled' => false,
            'status' => 'inactive',
            'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
        ];
        
        $updatedCount = 0;
        $results = [];
        $errors = [];
        
        // Loop through all matching rows and update each one
        foreach ($existing as $record) {
            error_log("Updating record ID: " . ($record['id'] ?? 'NULL'));
            
            if (empty($record['id'])) {
                error_log("WARNING: Record has empty/null ID - skipping");
                $errors[] = "Record has empty ID";
                continue;
            }
            
            $result = $supabase->update('protected_tokens', $record['id'], $updateData);
            if ($result) {
                $updatedCount++;
                $results[] = $result;
                error_log("Successfully updated record ID: " . $record['id']);
            } else {
                error_log("Failed to update record ID: " . $record['id']);
                $errors[] = "Failed to update ID: " . $record['id'];
            }
        }
        
        // Log final status
        error_log("Update complete - Updated: $updatedCount of " . count($existing) . " rows");
        
        // Invalidate cache and force realtime sync if any rows were updated
        if ($updatedCount > 0) {
            $supabase->invalidateCache('protected_tokens', [
                'token_mint' => $token_mint,
                'wallet_address' => $wallet_address
            ]);
            $supabase->forceProtectionSync($token_mint, $wallet_address, false);
        }
            
        echo json_encode([
            'success' => $updatedCount > 0,
            'message' => $updatedCount > 0 ? 'Protection disabled successfully' : 'Failed to update records',
            'rows_updated' => $updatedCount,
            'total_found' => count($existing),
            'data' => $results,
            'errors' => $errors
        ]);
    } else {
        // Token not found or not protected - still return success to avoid UI issues
        // The token is already not protected, which is the desired state
        error_log("No protected tokens found for this combination");
        echo json_encode([
            'success' => true,
            'message' => 'Token is not protected',
            'already_unprotected' => true
        ]);
    }
} catch (Exception $e) {
    error_log('Error in unprotect-token.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to disable protection',
        'message' => $e->getMessage()
    ]);
}
?>