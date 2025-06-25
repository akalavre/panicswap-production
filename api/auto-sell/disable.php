<?php
/**
 * Disable Auto-Sell Endpoint
 * Removes stored keys and disables automatic protection
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

// Validate required fields
if (!isset($data['wallet_address'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing wallet address']);
    exit;
}

$walletAddress = $data['wallet_address'];

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
    
    // Mark hot wallet as inactive
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/hot_wallets?wallet_address=eq.' . $walletAddress);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey
    ]);
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'is_active' => false,
        'updated_at' => date('c')
    ]));
    
    curl_exec($ch);
    curl_close($ch);
    
    // Disable auto protection
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/wallet_auto_protection?wallet_address=eq.' . $walletAddress);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey
    ]);
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'enabled' => false,
        'updated_at' => date('c')
    ]));
    
    curl_exec($ch);
    curl_close($ch);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Auto-sell disabled successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Auto-sell disable error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to disable auto-sell']);
}
?>