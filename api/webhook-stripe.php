<?php
// Stripe Webhook Handler
require_once __DIR__ . '/../config/stripe.php';
require_once __DIR__ . '/../config/supabase.php';

// Get the webhook payload and signature
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$event = null;

try {
    // Verify webhook signature
    $event = \Stripe\Webhook::constructEvent(
        $payload, 
        $sig_header, 
        STRIPE_WEBHOOK_SECRET
    );
} catch(\UnexpectedValueException $e) {
    // Invalid payload
    http_response_code(400);
    exit();
} catch(\Stripe\Exception\SignatureVerificationException $e) {
    // Invalid signature
    http_response_code(400);
    exit();
}

// Initialize Supabase
$supabase = createSupabaseClient();

// Handle the event
try {
    switch ($event->type) {
        case 'checkout.session.completed':
            $session = $event->data->object;
            handleCheckoutCompleted($session, $supabase);
            break;
            
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            handleSubscriptionUpdate($subscription, $supabase);
            break;
            
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            handleSubscriptionCancelled($subscription, $supabase);
            break;
            
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            handlePaymentSucceeded($invoice, $supabase);
            break;
            
        case 'invoice.payment_failed':
            $invoice = $event->data->object;
            handlePaymentFailed($invoice, $supabase);
            break;
            
        default:
            // Unexpected event type
            error_log('Unhandled Stripe event type: ' . $event->type);
    }
    
    http_response_code(200);
    echo json_encode(['status' => 'success']);
    
} catch (Exception $e) {
    error_log('Stripe webhook error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// Handler functions
function handleCheckoutCompleted($session, $supabase) {
    $walletAddress = $session->client_reference_id;
    $plan = $session->metadata->plan;
    
    // Update subscription status
    $updateData = [
        'status' => 'active',
        'stripe_customer_id' => $session->customer,
        'stripe_subscription_id' => $session->subscription,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $result = $supabase->from('subscriptions')
        ->update($updateData)
        ->eq('stripe_session_id', $session->id)
        ->execute();
    
    if (isset($result->error)) {
        throw new Exception('Failed to update subscription: ' . json_encode($result->error));
    }
    
    // Log payment
    logPayment($supabase, [
        'wallet_address' => $walletAddress,
        'amount' => $session->amount_total / 100,
        'currency' => strtoupper($session->currency),
        'payment_method' => 'stripe',
        'transaction_id' => $session->payment_intent,
        'status' => 'completed',
        'metadata' => json_encode([
            'plan' => $plan,
            'session_id' => $session->id,
            'customer_id' => $session->customer
        ])
    ]);
}

function handleSubscriptionUpdate($subscription, $supabase) {
    $walletAddress = $subscription->metadata->wallet_address;
    $plan = $subscription->metadata->plan;
    
    // Calculate expiration date
    $expiresAt = date('Y-m-d H:i:s', $subscription->current_period_end);
    
    // Update subscription
    $updateData = [
        'status' => $subscription->status === 'active' ? 'active' : 'inactive',
        'stripe_subscription_id' => $subscription->id,
        'expires_at' => $expiresAt,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $result = $supabase->from('subscriptions')
        ->update($updateData)
        ->eq('stripe_customer_id', $subscription->customer)
        ->eq('wallet_address', $walletAddress)
        ->execute();
    
    if (isset($result->error)) {
        error_log('Failed to update subscription: ' . json_encode($result->error));
    }
}

function handleSubscriptionCancelled($subscription, $supabase) {
    $walletAddress = $subscription->metadata->wallet_address;
    
    // Update subscription status
    $updateData = [
        'status' => 'cancelled',
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $result = $supabase->from('subscriptions')
        ->update($updateData)
        ->eq('stripe_subscription_id', $subscription->id)
        ->execute();
    
    if (isset($result->error)) {
        error_log('Failed to cancel subscription: ' . json_encode($result->error));
    }
}

function handlePaymentSucceeded($invoice, $supabase) {
    // Log successful payment
    $subscription = \Stripe\Subscription::retrieve($invoice->subscription);
    $walletAddress = $subscription->metadata->wallet_address;
    
    logPayment($supabase, [
        'wallet_address' => $walletAddress,
        'amount' => $invoice->amount_paid / 100,
        'currency' => strtoupper($invoice->currency),
        'payment_method' => 'stripe',
        'transaction_id' => $invoice->payment_intent,
        'status' => 'completed',
        'metadata' => json_encode([
            'invoice_id' => $invoice->id,
            'subscription_id' => $invoice->subscription
        ])
    ]);
}

function handlePaymentFailed($invoice, $supabase) {
    // Log failed payment
    $subscription = \Stripe\Subscription::retrieve($invoice->subscription);
    $walletAddress = $subscription->metadata->wallet_address;
    
    logPayment($supabase, [
        'wallet_address' => $walletAddress,
        'amount' => $invoice->amount_due / 100,
        'currency' => strtoupper($invoice->currency),
        'payment_method' => 'stripe',
        'transaction_id' => $invoice->payment_intent ?? 'failed_' . $invoice->id,
        'status' => 'failed',
        'metadata' => json_encode([
            'invoice_id' => $invoice->id,
            'subscription_id' => $invoice->subscription,
            'failure_reason' => $invoice->last_payment_error?->message ?? 'Unknown'
        ])
    ]);
    
    // Update subscription status
    $updateData = [
        'status' => 'payment_failed',
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $result = $supabase->from('subscriptions')
        ->update($updateData)
        ->eq('stripe_subscription_id', $invoice->subscription)
        ->execute();
}

function logPayment($supabase, $data) {
    $result = $supabase->from('payment_history')->insert($data)->execute();
    
    if (isset($result->error)) {
        error_log('Failed to log payment: ' . json_encode($result->error));
    }
}