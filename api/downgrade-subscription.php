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

if (!$input || !isset($input['subscriptionId']) || !isset($input['newPlan'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

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

// Supabase configuration
define('SUPABASE_URL', getenv('SUPABASE_URL'));
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY'));

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
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    $result = json_decode($response, true);
    
    if ($httpCode >= 400) {
        return ['error' => $result];
    }
    
    return ['data' => $result];
}

try {
    $subscriptionId = $input['subscriptionId'];
    $newPlan = $input['newPlan'];
    
    // Get subscription details
    $subResponse = supabaseRequest('GET', "/subscriptions?id=eq.$subscriptionId");
    
    if (empty($subResponse['data'])) {
        throw new Exception('Subscription not found');
    }
    
    $subscription = $subResponse['data'][0];
    
    // For downgrades, we schedule them to take effect at the end of the current billing period
    // This ensures users get what they paid for
    
    $scheduledDate = $subscription['next_payment_date'] ?? date('c', strtotime('+30 days'));
    
    // Create a scheduled downgrade record
    $scheduleData = [
        'subscription_id' => $subscriptionId,
        'user_id' => $subscription['user_id'],
        'action' => 'downgrade',
        'new_plan' => $newPlan,
        'scheduled_date' => $scheduledDate,
        'created_at' => date('c')
    ];
    
    supabaseRequest('POST', '/subscription_schedule', $scheduleData);
    
    // Update subscription with pending downgrade flag
    $updateData = [
        'pending_plan' => $newPlan,
        'pending_change_date' => $scheduledDate,
        'updated_at' => date('c')
    ];
    
    $updateResponse = supabaseRequest('PATCH', "/subscriptions?id=eq.$subscriptionId", $updateData);
    
    if (isset($updateResponse['error'])) {
        throw new Exception('Failed to schedule downgrade');
    }
    
    // Log the action
    $logData = [
        'subscription_id' => $subscriptionId,
        'user_id' => $subscription['user_id'],
        'action' => 'scheduled_downgrade',
        'details' => json_encode(['new_plan' => $newPlan, 'effective_date' => $scheduledDate]),
        'created_at' => date('c')
    ];
    
    supabaseRequest('POST', '/subscription_logs', $logData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Downgrade scheduled successfully',
        'scheduled_date' => $scheduledDate,
        'current_plan' => $subscription['plan'],
        'new_plan' => $newPlan
    ]);
    
} catch (Exception $e) {
    error_log('Downgrade subscription error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>