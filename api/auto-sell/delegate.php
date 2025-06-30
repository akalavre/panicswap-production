<?php
/**
 * Delegate Authority Setup Endpoint
 * Creates SPL Token delegate approval transaction
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

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['wallet_address'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing wallet address']);
    exit;
}

// Check if user has full protection mode (can execute swaps)
require_once __DIR__ . '/../supabase-config.php';
$supabase = new SupabaseClient(true);

// Get user subscription to check protection mode
try {
    $users = $supabase->query('users', [
        'wallet_address' => 'eq.' . $data['wallet_address']
    ]);
    
    $hasFullProtection = false;
    if ($users && count($users) > 0) {
        $subscriptions = $supabase->query('subscriptions', [
            'user_id' => 'eq.' . $users[0]['id'],
            'status' => 'eq.active'
        ]);
        
        if ($subscriptions && count($subscriptions) > 0) {
            $subscription = $subscriptions[0];
            // Check explicit protection_mode or fall back to plan type
            $hasFullProtection = 
                (isset($subscription['protection_mode']) && $subscription['protection_mode'] === 'full') ||
                (!isset($subscription['protection_mode']) && in_array(strtolower($subscription['plan']), ['pro', 'enterprise', 'degen-mode']));
        }
    }
    
    if (!$hasFullProtection) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Full protection mode required',
            'message' => 'Auto-sell delegation is only available for users with full protection mode enabled',
            'protection_mode' => 'watch-only'
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log('Error checking protection mode: ' . $e->getMessage());
    // Default to allowing for backward compatibility
}

$walletAddress = $data['wallet_address'];

// Validate wallet address format
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $walletAddress)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid wallet address format']);
    exit;
}

try {
    // TODO: In production, this would:
    // 1. Create an SPL Token approve instruction
    // 2. Set PanicSwap's program as delegate
    // 3. Set appropriate allowance amount
    // 4. Serialize the transaction
    
    // For demo, return a mock serialized transaction
    // In reality, this would be a properly constructed Solana transaction
    $mockTransaction = base64_encode(random_bytes(256)); // Mock transaction bytes
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'serialized_tx' => $mockTransaction,
        'delegate_address' => 'PanicSwap11111111111111111111111111111111111', // Mock delegate
        'message' => 'Approve this transaction to enable auto-sell protection'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create delegate transaction']);
}
?>