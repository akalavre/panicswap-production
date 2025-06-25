<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['wallet']) || !isset($input['plan']) || !isset($input['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

$wallet = $input['wallet'];
$plan = $input['plan'];
$amount = $input['amount'];
$currency = $input['currency'] ?? 'SOL';
$isAutoCharge = $input['auto_charge'] ?? false;
$subscriptionId = $input['subscription_id'] ?? null;

// For hot wallets, we simulate the payment process
// In a real implementation, this would:
// 1. Retrieve the hot wallet private key from secure storage
// 2. Create and sign the transaction
// 3. Send it to the Solana network
// 4. Return the transaction signature

try {
    // In a real implementation, we would:
    // 1. Check the hot wallet balance
    // 2. Create and sign the transaction
    // 3. Send to Solana network
    
    // For now, simulate balance check
    $walletBalance = getWalletBalance($wallet);
    
    // For auto-charge, add a small buffer for network fees
    $requiredAmount = $isAutoCharge ? $amount + 0.002 : $amount;
    
    if ($walletBalance < $requiredAmount) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient balance',
            'balance' => $walletBalance,
            'required' => $requiredAmount,
            'is_auto_charge' => $isAutoCharge
        ]);
        exit();
    }
    
    // Generate a mock transaction signature for now
    $signature = generateMockSignature();
    
    // Log the payment attempt
    error_log("Hot wallet payment request: wallet=$wallet, plan=$plan, amount=$amount $currency");
    
    // Return success response
    echo json_encode([
        'success' => true,
        'signature' => $signature,
        'message' => 'Payment processed successfully',
        'wallet' => $wallet,
        'plan' => $plan,
        'amount' => $amount,
        'currency' => $currency
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function generateMockSignature() {
    // Generate a mock Solana signature format (88 characters, base58)
    $chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    $signature = '';
    for ($i = 0; $i < 88; $i++) {
        $signature .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $signature;
}

function getWalletBalance($wallet) {
    // In production, this would query the Solana blockchain
    // For now, return 0 to simulate empty wallet
    return 0;
}
?>