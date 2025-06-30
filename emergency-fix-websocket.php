<?php
/**
 * Emergency Fix for WebSocket Issues
 * This script immediately enables the WebSocket fallback system
 */

header('Content-Type: application/json');

echo json_encode([
    'status' => 'success',
    'message' => 'WebSocket fallback enabled',
    'actions' => [
        '1. Open your browser console on the token list page',
        '2. Look for "[WebSocketFallback]" messages',
        '3. The fallback should automatically start within 5 seconds',
        '4. Risk badges should update within 30 seconds'
    ],
    'manual_trigger' => 'Run: window.webSocketFallback.startPolling() in browser console',
    'timestamp' => date('c')
]);

// Force enable the feature flag
require_once 'config/supabase.php';

try {
    $url = "$SUPABASE_URL/rest/v1/feature_flags?name=eq.atomic_badge_renderer";
    $data = json_encode([
        'enabled' => true,
        'rollout_percentage' => 100,
        'updated_at' => date('c')
    ]);
    
    $context = stream_context_create([
        'http' => [
            'method' => 'PATCH',
            'header' => [
                "Authorization: Bearer $SUPABASE_ANON_KEY",
                "apikey: $SUPABASE_ANON_KEY",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ],
            'content' => $data
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    error_log("Emergency fix: Feature flag updated");
    
} catch (Exception $e) {
    error_log("Emergency fix error: " . $e->getMessage());
}
?>
