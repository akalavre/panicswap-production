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