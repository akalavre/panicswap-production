<?php
/**
 * Swap Confirmation Endpoint
 * Confirms user-signed emergency swap transaction
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
if (!isset($data['event_id']) || !isset($data['signature']) || !isset($data['wallet_address'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$eventId = $data['event_id'];
$signature = $data['signature'];
$walletAddress = $data['wallet_address'];

// Validate signature format (base58)
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{87,88}$/', $signature)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature format']);
    exit;
}

// Validate wallet address format
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $walletAddress)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid wallet address format']);
    exit;
}

try {
    // TODO: In production, this would:
    // 1. Verify the signature corresponds to the transaction
    // 2. Update the protection_events table to mark as confirmed
    // 3. Track the transaction on-chain
    // 4. Update user statistics
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Swap confirmed and being tracked',
        'event_id' => $eventId,
        'signature' => $signature,
        'status' => 'confirmed'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to confirm swap']);
}
?>