<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Feature flags configuration
$featureFlags = [
    'atomic_badge_renderer' => true,
    'ml_risk_display' => true,
    'websocket_fallback' => true,
    'auto_protection' => true,
    'real_time_monitoring' => true,
    'advanced_risk_tooltips' => true,
    'telegram_alerts' => true,
    'demo_mode' => true
];

// Get requested feature
$feature = $_GET['feature'] ?? null;

if ($feature && isset($featureFlags[$feature])) {
    // Return specific feature flag
    echo json_encode([
        'feature' => $feature,
        'enabled' => $featureFlags[$feature]
    ]);
} else {
    // Return all feature flags
    echo json_encode([
        'features' => $featureFlags
    ]);
}
?>