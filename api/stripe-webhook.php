<?php
// Disable any output buffering and error display
ob_clean();
error_reporting(0);
ini_set('display_errors', 0);

// Get the raw POST body before any processing
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// Load environment
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Stripe configuration
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY'));
define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET'));

// Supabase configuration
define('SUPABASE_URL', getenv('SUPABASE_URL'));
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY'));

// Load Stripe SDK
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    http_response_code(500);
    exit();
}

require_once __DIR__ . '/../vendor/autoload.php';
\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

function supabaseRequest($method, $endpoint, $data = null) {
    $url = SUPABASE_URL . '/rest/v1' . $endpoint;
    
    $headers = [
        'apikey: ' . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ];
    
    $curl = curl_init();
    
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    
    if ($method !== 'GET') {
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
        if ($data) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    $response = curl_exec($curl);
    curl_close($curl);
    
    return json_decode($response, true);
}

try {
    // Verify webhook signature
    $event = \Stripe\Webhook::constructEvent(
        $payload, $sig_header, STRIPE_WEBHOOK_SECRET
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

// Handle the event
try {
    switch ($event->type) {
        case 'checkout.session.completed':
            $session = $event->data->object;
            
            // Get wallet address from metadata or client reference ID
            $walletAddress = $session->client_reference_id ?? $session->metadata->wallet_address ?? null;
            $plan = $session->metadata->plan ?? 'pro';
            
            if ($walletAddress) {
                // Get or create user
                $users = supabaseRequest('GET', "/users?wallet_address=eq.$walletAddress");
                $userId = null;
                
                if (!empty($users)) {
                    $userId = $users[0]['id'];
                } else {
                    // Create user
                    $userData = [
                        'wallet_address' => $walletAddress,
                        'created_at' => date('c')
                    ];
                    $newUser = supabaseRequest('POST', '/users', $userData);
                    if (!empty($newUser)) {
                        $userId = $newUser[0]['id'];
                    }
                }
                
                if ($userId) {
                    // Save subscription
                    $subscriptionData = [
                        'user_id' => $userId,
                        'plan' => strtolower($plan),
                        'status' => 'active',
                        'amount' => $session->amount_total / 100,
                        'currency' => 'USD',
                        'billing_cycle' => 'monthly',
                        'payment_method' => 'stripe',
                        'payment_wallet' => $walletAddress,
                        'stripe_customer_id' => $session->customer,
                        'stripe_subscription_id' => $session->subscription,
                        'stripe_session_id' => $session->id,
                        'next_payment_date' => date('c', strtotime('+1 month')),
                        'created_at' => date('c'),
                        'updated_at' => date('c')
                    ];
                    
                    supabaseRequest('POST', '/subscriptions', $subscriptionData);
                }
            }
            break;
            
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            
            // Update subscription in database
            $updateData = [
                'status' => $subscription->status,
                'current_period_start' => date('c', $subscription->current_period_start),
                'current_period_end' => date('c', $subscription->current_period_end),
                'next_payment_date' => date('c', $subscription->current_period_end),
                'updated_at' => date('c')
            ];
            
            supabaseRequest('PATCH', "/subscriptions?stripe_subscription_id=eq.{$subscription->id}", $updateData);
            break;
            
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            
            // Mark subscription as cancelled
            $updateData = [
                'status' => 'cancelled',
                'cancelled_at' => date('c'),
                'updated_at' => date('c')
            ];
            
            supabaseRequest('PATCH', "/subscriptions?stripe_subscription_id=eq.{$subscription->id}", $updateData);
            break;
            
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            
            // Log successful payment
            if ($invoice->subscription) {
                $subs = supabaseRequest('GET', "/subscriptions?stripe_subscription_id=eq.{$invoice->subscription}");
                
                if (!empty($subs)) {
                    $chargeLog = [
                        'subscription_id' => $subs[0]['id'],
                        'user_id' => $subs[0]['user_id'],
                        'amount' => $invoice->amount_paid / 100,
                        'currency' => 'USD',
                        'status' => 'success',
                        'stripe_invoice_id' => $invoice->id,
                        'created_at' => date('c')
                    ];
                    
                    supabaseRequest('POST', '/subscription_charges', $chargeLog);
                }
            }
            break;
            
        case 'invoice.payment_failed':
            $invoice = $event->data->object;
            
            // Log failed payment
            if ($invoice->subscription) {
                $subs = supabaseRequest('GET', "/subscriptions?stripe_subscription_id=eq.{$invoice->subscription}");
                
                if (!empty($subs)) {
                    $chargeLog = [
                        'subscription_id' => $subs[0]['id'],
                        'user_id' => $subs[0]['user_id'],
                        'amount' => $invoice->amount_due / 100,
                        'currency' => 'USD',
                        'status' => 'failed',
                        'error_message' => 'Payment failed',
                        'stripe_invoice_id' => $invoice->id,
                        'created_at' => date('c')
                    ];
                    
                    supabaseRequest('POST', '/subscription_charges', $chargeLog);
                    
                    // Update subscription status
                    $updateData = [
                        'status' => 'past_due',
                        'updated_at' => date('c')
                    ];
                    
                    supabaseRequest('PATCH', "/subscriptions?id=eq.{$subs[0]['id']}", $updateData);
                }
            }
            break;
    }
    
    // Return 200 OK to acknowledge receipt of the event
    http_response_code(200);
    
} catch (Exception $e) {
    error_log('Stripe webhook error: ' . $e->getMessage());
    http_response_code(500);
}
?>