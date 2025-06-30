<?php
// Security headers
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

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

$token_mint = $input['token_mint'] ?? null;
$wallet_address = $input['wallet_address'] ?? null;
$settings = $input['settings'] ?? [];

if (!$token_mint || !$wallet_address) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// More intelligent rate limiting using session
session_start();

// Global rate limit key for wallet
$global_rate_key = 'monitoring_global_' . md5($wallet_address);
$token_rate_key = 'monitoring_update_' . md5($wallet_address . $token_mint);
$current_time = time();

// Initialize rate limit tracking
if (!isset($_SESSION[$global_rate_key])) {
    $_SESSION[$global_rate_key] = [
        'requests' => [],
        'last_reset' => $current_time
    ];
}

// Clean old requests (older than 60 seconds)
$_SESSION[$global_rate_key]['requests'] = array_filter(
    $_SESSION[$global_rate_key]['requests'],
    function($timestamp) use ($current_time) {
        return ($current_time - $timestamp) < 60;
    }
);

// Check global rate limit (max 10 requests per minute per wallet)
$recent_requests = count($_SESSION[$global_rate_key]['requests']);
if ($recent_requests >= 10) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Rate limit exceeded',
        'message' => 'Too many requests. Please wait a moment before trying again',
        'retry_after' => 60 - ($current_time - min($_SESSION[$global_rate_key]['requests']))
    ]);
    exit;
}

// Check per-token rate limit (max 1 update per 2 seconds for same token)
$last_token_update = $_SESSION[$token_rate_key] ?? 0;
if ($current_time - $last_token_update < 2) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Rate limit exceeded',
        'message' => 'Please wait before updating this token again',
        'retry_after' => 2 - ($current_time - $last_token_update)
    ]);
    exit;
}

try {
    $supabase = new SupabaseClient(true); // Use service key
    
    // Add this request to the global tracking
    $_SESSION[$global_rate_key]['requests'][] = $current_time;
    
    // Update per-token timestamp
    $_SESSION[$token_rate_key] = $current_time;
    
    // Build update data from settings
    $updateData = [
        'updated_at' => (new DateTime())->format('Y-m-d H:i:s')
    ];
    
    // Only update fields that are provided
    if (isset($settings['mempool_monitoring'])) {
        $updateData['mempool_monitoring'] = (bool)$settings['mempool_monitoring'];
    }
    
    if (isset($settings['risk_threshold'])) {
        $validThresholds = ['low', 'medium', 'high', 'critical'];
        $threshold = strtolower($settings['risk_threshold']);
        if (in_array($threshold, $validThresholds)) {
            $updateData['risk_threshold'] = $threshold;
        }
    }
    
    if (isset($settings['priority_fee_multiplier'])) {
        $multiplier = floatval($settings['priority_fee_multiplier']);
        if ($multiplier >= 1.0 && $multiplier <= 10.0) {
            $updateData['priority_fee_multiplier'] = $multiplier;
        }
    }
    
    // Check if protection exists
    $existing = $supabase->query('protected_tokens', [
        'token_mint' => 'eq.' . $token_mint,
        'wallet_address' => 'eq.' . $wallet_address,
        'is_active' => 'eq.true'
    ]);
    
    if (!$existing || count($existing) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'No active protection found for this token']);
        exit;
    }
    
    // Update all matching records
    $updatedCount = 0;
    $results = [];
    
    foreach ($existing as $record) {
        if (!empty($record['id'])) {
            $result = $supabase->update('protected_tokens', $record['id'], $updateData);
            if ($result) {
                $updatedCount++;
                $results[] = $result;
            }
        }
    }
    
    // If mempool monitoring was enabled, update the last threat detected timestamp
    if (isset($settings['mempool_monitoring']) && $settings['mempool_monitoring']) {
        $updateData['last_threat_detected'] = null; // Reset threat timestamp
        
        // Log that mempool monitoring was enabled
        error_log("Mempool monitoring enabled for token: $token_mint");
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Monitoring settings updated',
        'updated' => $updatedCount,
        'settings' => $updateData
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to update monitoring settings',
        'message' => $e->getMessage()
    ]);
}
?>