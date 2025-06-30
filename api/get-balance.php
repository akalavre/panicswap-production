<?php
// Enable error reporting for debugging  
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Backend proxy for Solana balance to avoid CORS issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$wallet = $_GET['wallet'] ?? null;

if (!$wallet) {
    http_response_code(400);
    echo json_encode(['error' => 'Wallet address required']);
    exit;
}

// Validate Solana address format (basic check)
if (!preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $wallet)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid Solana wallet address format']);
    exit;
}

try {
    // Use cURL to call Solana RPC
    $rpcEndpoints = [
        'https://api.mainnet-beta.solana.com',
        'https://solana-mainnet.g.alchemy.com/v2/demo'
    ];
    
    $balance = null;
    $error = null;
    
    foreach ($rpcEndpoints as $endpoint) {
        $postData = json_encode([
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'getBalance',
            'params' => [$wallet]
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($postData)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($response !== false && $httpCode === 200) {
            $data = json_decode($response, true);
            
            if (isset($data['result']['value'])) {
                $balance = $data['result']['value'] / 1000000000; // Convert lamports to SOL
                curl_close($ch);
                break;
            }
        }
        
        $error = curl_error($ch);
        curl_close($ch);
    }
    
    if ($balance !== null) {
        echo json_encode([
            'success' => true,
            'wallet' => $wallet,
            'balance' => $balance,
            'balanceFormatted' => number_format($balance, 4) . ' SOL'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Unable to fetch balance from any RPC endpoint',
            'lastError' => $error
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error: ' . $e->getMessage()
    ]);
} 