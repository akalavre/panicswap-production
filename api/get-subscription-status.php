<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get wallet address from query parameter
$wallet = $_GET['wallet'] ?? null;

if (!$wallet) {
    echo json_encode([
        'error' => 'Wallet address required'
    ]);
    exit;
}

// For demo purposes, return a mock subscription status
// In production, this would check against your database
$subscriptionStatus = [
    'wallet' => $wallet,
    'subscription' => [
        'status' => 'active',
        'plan' => 'free', // free, pro, premium
        'expiresAt' => null,
        'features' => [
            'maxTokens' => 5,
            'maxProtections' => 3,
            'realtimeAlerts' => true,
            'autoProtection' => false,
            'priorityExecution' => false
        ]
    ],
    'usage' => [
        'protectedTokens' => 0,
        'totalTransactions' => 0,
        'rugsStopped' => 0,
        'amountSaved' => 0
    ]
];

echo json_encode($subscriptionStatus);