<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config/stripe.php';

// Handle both GET and POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $sessionId = $input['session_id'] ?? '';
} else {
    $sessionId = $_GET['session_id'] ?? '';
}

if (!$sessionId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Session ID required']);
    exit();
}

try {
    // Set Stripe API key
    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
    
    // Retrieve session from Stripe
    $session = \Stripe\Checkout\Session::retrieve([
        'id' => $sessionId,
        'expand' => ['subscription', 'customer']
    ]);
    
    if ($session->payment_status !== 'paid') {
        throw new Exception('Payment not completed');
    }
    
    // Get subscription details
    $subscription = $session->subscription;
    $plan = $session->metadata->plan ?? 'pro';
    $walletAddress = $session->client_reference_id ?? $session->metadata->wallet_address;
    
    // Save to Supabase if this is a POST request (from payment success page)
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $walletAddress) {
        // Include the save subscription logic
        $subscriptionData = [
            'wallet' => $walletAddress,
            'plan' => ucfirst($plan),
            'amount' => $session->amount_total / 100,
            'currency' => 'USD',
            'txSignature' => $session->payment_intent,
            'status' => 'active',
            'stripe_customer_id' => $session->customer,
            'stripe_subscription_id' => $subscription->id ?? null,
            'stripe_session_id' => $session->id
        ];
        
        // Call save-subscription.php endpoint
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $ch = curl_init($protocol . '://' . $host . '/api/save-subscription.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($subscriptionData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $saveResult = curl_exec($ch);
        curl_close($ch);
    }
    
    // Format plan name
    $planNames = [
        'pro' => 'Pro',
        'degen-mode' => 'Degen Mode',
        'enterprise' => 'Enterprise'
    ];
    
    $response = [
        'success' => true,
        'plan' => $planNames[$plan] ?? 'Pro',
        'amount' => $session->amount_total / 100,
        'currency' => strtoupper($session->currency),
        'customerEmail' => $session->customer_details->email ?? null,
        'nextBilling' => $subscription ? date('Y-m-d', $subscription->current_period_end) : null,
        'status' => 'active'
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}