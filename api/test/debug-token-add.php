<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Debug info
$debug = [
    'php_version' => phpversion(),
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'raw_input' => file_get_contents('php://input'),
    'env_loaded' => false,
    'supabase_url' => null,
    'curl_enabled' => function_exists('curl_init'),
    'json_enabled' => function_exists('json_decode')
];

// Try to load environment
try {
    if (file_exists(dirname(__DIR__, 2) . '/env-config.php')) {
        require_once dirname(__DIR__, 2) . '/env-config.php';
        $debug['env_loaded'] = defined('ENV_LOADED');
        $debug['supabase_url'] = defined('SUPABASE_URL') ? SUPABASE_URL : 'not defined';
    } else {
        $debug['env_error'] = 'env-config.php not found at: ' . dirname(__DIR__, 2) . '/env-config.php';
    }
} catch (Exception $e) {
    $debug['env_exception'] = $e->getMessage();
}

// Try to load Supabase config
try {
    if (file_exists(__DIR__ . '/../supabase-config.php')) {
        require_once __DIR__ . '/../supabase-config.php';
        $debug['supabase_config_loaded'] = class_exists('SupabaseClient');
    } else {
        $debug['supabase_error'] = 'supabase-config.php not found at: ' . __DIR__ . '/../supabase-config.php';
    }
} catch (Exception $e) {
    $debug['supabase_exception'] = $e->getMessage();
}

// Try to parse input
try {
    $input = json_decode($debug['raw_input'], true);
    $debug['json_parsed'] = $input !== null;
    $debug['parsed_data'] = $input;
    $debug['json_error'] = json_last_error_msg();
} catch (Exception $e) {
    $debug['parse_exception'] = $e->getMessage();
}

// Test Supabase connection if possible
if (class_exists('SupabaseClient') && defined('SUPABASE_URL')) {
    try {
        $supabase = new SupabaseClient(true);
        
        // Try a simple query
        $testQuery = $supabase->query('token_metadata', ['limit' => '1']);
        $debug['supabase_connection'] = $testQuery !== null ? 'success' : 'failed';
        $debug['test_query_result'] = $testQuery ? 'got data' : 'no data';
    } catch (Exception $e) {
        $debug['supabase_test_exception'] = $e->getMessage();
    }
}

// Check file permissions
$debug['script_dir'] = __DIR__;
$debug['script_writable'] = is_writable(__DIR__);

// Return debug info
echo json_encode([
    'success' => false,
    'debug' => $debug,
    'message' => 'Debug endpoint - check debug data for issues'
], JSON_PRETTY_PRINT);
?>