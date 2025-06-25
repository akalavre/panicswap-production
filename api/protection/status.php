<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$wallet = $_GET['wallet'] ?? null;
$mint = $_GET['mint'] ?? null;

if (!$wallet || !$mint) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing wallet or mint parameter']);
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

try {
    $supabase = new SupabaseClient();
    
    // Query protection status
    $existing = $supabase->query('protected_tokens', [
        'token_mint' => 'eq.' . $mint,
        'wallet_address' => 'eq.' . $wallet,
        'is_active' => 'eq.true'
    ]);
    
    $isProtected = $existing && count($existing) > 0;
    
    echo json_encode([
        'success' => true,
        'protected' => $isProtected,
        'data' => $isProtected ? $existing[0] : null
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to check protection status',
        'message' => $e->getMessage()
    ]);
}
?>
