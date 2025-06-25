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

if (!$input || !isset($input['wallet']) || !isset($input['auto_renew'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$wallet = $input['wallet'];
$autoRenew = $input['auto_renew'];

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
    // First, get user by wallet
    $userResponse = supabaseRequest('GET', "/users?wallet_address=eq.$wallet");
    
    if (empty($userResponse['data'])) {
        throw new Exception('User not found');
    }
    
    $userId = $userResponse['data'][0]['id'];
    
    // Get active subscription
    $subResponse = supabaseRequest('GET', "/subscriptions?user_id=eq.$userId&status=eq.active&order=created_at.desc&limit=1");
    
    if (empty($subResponse['data'])) {
        throw new Exception('No active subscription found');
    }
    
    $subscriptionId = $subResponse['data'][0]['id'];
    
    // Update auto-renewal setting
    $updateData = [
        'auto_renew' => $autoRenew,
        'updated_at' => date('c')
    ];
    
    $updateResponse = supabaseRequest('PATCH', "/subscriptions?id=eq.$subscriptionId", $updateData);
    
    if (isset($updateResponse['error'])) {
        throw new Exception('Failed to update subscription');
    }
    
    // Log the change
    $logData = [
        'subscription_id' => $subscriptionId,
        'user_id' => $userId,
        'action' => $autoRenew ? 'enabled_auto_renewal' : 'disabled_auto_renewal',
        'created_at' => date('c')
    ];
    
    supabaseRequest('POST', '/subscription_logs', $logData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Auto-renewal settings updated',
        'auto_renew' => $autoRenew
    ]);
    
} catch (Exception $e) {
    error_log('Update auto-renewal error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>