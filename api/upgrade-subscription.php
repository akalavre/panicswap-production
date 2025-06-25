<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Include Supabase configuration
require_once '../config/supabase.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['walletAddress']) || !isset($input['plan'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Wallet address and plan are required']);
    exit();
}

// Plan pricing
$planPricing = [
    'pro' => [
        'sol' => 0.56,
        'usd' => 79,
        'weekly_sol' => 0.141,
        'weekly_usd' => 19.75
    ],
    'degen' => [
        'sol' => 1.06,
        'usd' => 149,
        'weekly_sol' => 0.266,
        'weekly_usd' => 37.25
    ],
    'enterprise' => [
        'sol' => 2.85,
        'usd' => 399,
        'weekly_sol' => 0.713,
        'weekly_usd' => 99.75
    ]
];

$plan = strtolower($input['plan']);
if (!isset($planPricing[$plan])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid plan']);
    exit();
}

try {
    // Initialize Supabase client
    $supabase = new \Supabase\CreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check for existing active subscription
    $existingSub = $supabase->from('subscriptions')
        ->select('*')
        ->eq('wallet_address', $input['walletAddress'])
        ->eq('status', 'active')
        ->single()
        ->execute();

    if (isset($existingSub->data) && !isset($existingSub->error)) {
        // Update existing subscription
        $response = $supabase->from('subscriptions')
            ->update([
                'plan' => $plan,
                'updated_at' => date('Y-m-d H:i:s'),
                'pending_plan_change' => null,
                'pending_change_date' => null
            ])
            ->eq('id', $existingSub->data->id)
            ->execute();

        $subscriptionId = $existingSub->data->id;
        $eventType = 'upgraded';
    } else {
        // Create new subscription
        $response = $supabase->from('subscriptions')
            ->insert([
                'wallet_address' => $input['walletAddress'],
                'plan' => $plan,
                'status' => 'active',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 month')),
                'created_at' => date('Y-m-d H:i:s')
            ])
            ->select()
            ->single()
            ->execute();

        $subscriptionId = $response->data->id ?? null;
        $eventType = 'created';
    }

    if (isset($response->error)) {
        throw new Exception($response->error->message ?? 'Failed to upgrade subscription');
    }

    // Log the upgrade event
    if ($subscriptionId) {
        $supabase->from('subscription_events')
            ->insert([
                'subscription_id' => $subscriptionId,
                'event_type' => $eventType,
                'event_data' => json_encode([
                    'plan' => $plan,
                    'pricing' => $planPricing[$plan],
                    'timestamp' => date('Y-m-d H:i:s')
                ]),
                'created_at' => date('Y-m-d H:i:s')
            ])
            ->execute();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Subscription upgraded successfully',
        'plan' => $plan,
        'pricing' => $planPricing[$plan]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}