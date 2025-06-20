<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config/stripe.php';
require_once __DIR__ . '/../config/supabase.php';

$sessionId = $_GET['session_id'] ?? '';

if (!$sessionId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Session ID required']);
    exit();
}

try {
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
    
    // Format plan name
    $planNames = [
        'pro' => 'Pro',
        'degen' => 'Degen Mode',
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