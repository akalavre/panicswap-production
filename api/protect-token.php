<?php
// Security: Disable error display in production
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Security: Set proper CORS and security headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

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
$token_symbol = $input['token_symbol'] ?? null;
$token_name = $input['token_name'] ?? null;
$enable_mempool = $input['enable_mempool'] ?? false;

// Validate risk threshold - database expects uppercase
$valid_thresholds = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
$risk_threshold = strtoupper($input['risk_threshold'] ?? 'HIGH');
if (!in_array($risk_threshold, $valid_thresholds)) {
    $risk_threshold = 'HIGH'; // Default to HIGH if invalid
}

// Validate priority fee multiplier
$priority_fee_multiplier = floatval($input['priority_fee_multiplier'] ?? 1.5);
if ($priority_fee_multiplier < 1.0 || $priority_fee_multiplier > 10.0) {
    $priority_fee_multiplier = 1.5; // Default to 1.5x if out of range
}

if (!$token_mint || !$wallet_address) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $supabase = new SupabaseClient(true); // Use service key for write operations
    
    // Check if token is already protected for this wallet
    $existing = $supabase->query('protected_tokens', [
        'token_mint' => 'eq.' . $token_mint,
        'wallet_address' => 'eq.' . $wallet_address
    ]);
    
    if ($existing && count($existing) > 0) {
        // Update ALL existing protection entries (handles duplicates)
        $updateData = [
            'is_active' => true,
            'monitoring_active' => true,
            'monitoring_enabled' => true,
            'status' => 'active',
            'token_symbol' => $token_symbol,
            'token_name' => $token_name,
            'mempool_monitoring' => $enable_mempool,
            'risk_threshold' => $risk_threshold,
            'priority_fee_multiplier' => $priority_fee_multiplier,
            'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
        ];
        
        $updatedCount = 0;
        $results = [];
        
        // Loop through all matching rows and update each one
        foreach ($existing as $record) {
            $result = $supabase->update('protected_tokens', $record['id'], $updateData);
            if ($result) {
                $updatedCount++;
                $results[] = $result;
            }
        }
            
        // Notify backend to start monitoring
        notifyBackendForProtection($token_mint, $wallet_address, $token_symbol, [
            'priceThreshold' => 15,
            'liquidityThreshold' => 30,
            'devWalletEnabled' => true,
            'gasBoost' => 1.0
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Protection reactivated',
            'rows_updated' => $updatedCount,
            'total_found' => count($existing),
            'data' => $results
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
            
        // Notify backend to start monitoring
        notifyBackendForProtection($token_mint, $wallet_address, $token_symbol, [
            'priceThreshold' => 15,
            'liquidityThreshold' => 30,
            'devWalletEnabled' => true,
            'gasBoost' => 1.0
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
        'error' => 'Failed to protect token',
        'message' => $e->getMessage()
    ]);
}

/**
 * Notify backend service to start monitoring
 */
function notifyBackendForProtection($tokenMint, $walletAddress, $tokenSymbol, $settings) {
    try {
        $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
        $endpoint = $backendUrl . '/api/protected-tokens';
        
        $payload = json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress,
            'tokenSymbol' => $tokenSymbol,
            'settings' => $settings,
            'isDemo' => false
        ]);
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            error_log("Backend notification failed: HTTP $httpCode - $response");
        } else {
            error_log("Backend notified successfully for token: $tokenMint");
        }
    } catch (Exception $e) {
        // Log but don't fail the main operation
        error_log("Failed to notify backend: " . $e->getMessage());
    }
}