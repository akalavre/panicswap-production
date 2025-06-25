<?php
// Force monitoring data update for a token
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Wallet-Address');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/supabase.php';

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$tokenMint = $input['tokenMint'] ?? null;
$walletAddress = $input['walletAddress'] ?? $_SERVER['HTTP_X_WALLET_ADDRESS'] ?? null;

if (!$tokenMint || !$walletAddress) {
    http_response_code(400);
    echo json_encode(['error' => 'Token mint and wallet address required']);
    exit;
}

try {
    // Call backend API to force monitoring update
    $backendUrl = 'http://localhost:3001/api/monitoring/force-update';
    
    $ch = curl_init($backendUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'tokenMint' => $tokenMint,
        'walletAddress' => $walletAddress
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Wallet-Address: ' . $walletAddress
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception('Backend request failed: ' . $error);
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        throw new Exception($errorData['error'] ?? 'Backend returned error code ' . $httpCode);
    }
    
    // Also trigger token data population
    $populateUrl = 'http://localhost:3001/api/tokens/populate-data';
    
    $ch = curl_init($populateUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'tokenMint' => $tokenMint,
        'walletAddress' => $walletAddress
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    curl_exec($ch);
    curl_close($ch);
    
    echo json_encode([
        'success' => true,
        'message' => 'Monitoring update initiated',
        'tokenMint' => $tokenMint,
        'walletAddress' => $walletAddress
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to initiate monitoring update',
        'message' => $e->getMessage()
    ]);
}