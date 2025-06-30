<?php
/**
 * Simple Badge Fix Deployment (No Composer Dependencies)
 * Direct database operations to deploy the atomic badge renderer feature flag
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== SIMPLE BADGE OSCILLATION FIX DEPLOYMENT ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

// Direct Supabase configuration (no composer dependencies)
define('SUPABASE_URL', 'https://cfficjjdhgqwqprfhlrj.supabase.co');
define('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE');

/**
 * Simple Supabase API call
 */
function supabaseRequest($table, $method = 'GET', $data = null, $filter = null) {
    $url = SUPABASE_URL . '/rest/v1/' . $table;
    
    if ($filter) {
        $url .= '?' . http_build_query($filter);
    }
    
    $headers = [
        'apikey: ' . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        'Content-Type: application/json'
    ];
    
    if ($method === 'POST' || $method === 'PATCH') {
        $headers[] = 'Prefer: return=representation';
    }
    
    $options = [
        'http' => [
            'header' => implode("\r\n", $headers),
            'method' => $method,
            'content' => $data ? json_encode($data) : null,
            'ignore_errors' => true
        ]
    ];
    
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    
    // Get HTTP response code
    $http_response_header = $http_response_header ?? [];
    $status_line = $http_response_header[0] ?? '';
    $status_code = 200;
    if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $status_line, $matches)) {
        $status_code = (int)$matches[1];
    }
    
    if ($response === false || $status_code >= 400) {
        throw new Exception("Supabase API error: HTTP $status_code - " . ($response ?: 'Connection failed'));
    }
    
    return json_decode($response, true);
}

try {
    echo "Step 1: Deploying feature flag...\n";
    
    // Check if feature flag exists
    $existing = null;
    try {
        $result = supabaseRequest('feature_flags', 'GET', null, ['feature_name' => 'eq.atomic_badge_renderer']);
        if (!empty($result)) {
            $existing = $result[0];
        }
    } catch (Exception $e) {
        echo "Note: Could not check existing feature flag (table may not exist yet)\n";
    }
    
    $featureData = [
        'feature_name' => 'atomic_badge_renderer',
        'enabled' => true,
        'rollout_percentage' => 100,
        'description' => 'Atomic badge renderer that prevents oscillation and redundant updates',
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    if ($existing) {
        // Update existing
        echo "Updating existing feature flag...\n";
        supabaseRequest('feature_flags', 'PATCH', $featureData, ['feature_name' => 'eq.atomic_badge_renderer']);
        echo "✓ Updated existing feature flag\n";
    } else {
        // Create new
        echo "Creating new feature flag...\n";
        $featureData['created_at'] = date('Y-m-d H:i:s');
        supabaseRequest('feature_flags', 'POST', $featureData);
        echo "✓ Created new feature flag\n";
    }
    
    echo "\nStep 2: Verifying deployment...\n";
    
    // Verify the feature flag was created/updated
    $verification = supabaseRequest('feature_flags', 'GET', null, ['feature_name' => 'eq.atomic_badge_renderer']);
    
    if (!empty($verification) && $verification[0]['enabled']) {
        echo "✓ Feature flag is enabled with " . $verification[0]['rollout_percentage'] . "% rollout\n";
    } else {
        throw new Exception("Feature flag verification failed");
    }
    
    echo "\nStep 3: Starting monitoring...\n";
    
    // Create monitoring file
    $monitoringData = [
        'deployment_id' => 'badge-fix-' . date('YmdHis'),
        'feature_name' => 'atomic_badge_renderer',
        'start_time' => date('Y-m-d H:i:s'),
        'status' => 'MONITORING',
        'deployed_at' => date('Y-m-d H:i:s'),
        'instructions' => [
            'Monitor badge behavior on token list v3',
            'Watch browser console for oscillation warnings',
            'Check for "redundant update" messages',
            'Look for any badge flicker or incorrect states'
        ]
    ];
    
    file_put_contents('badge-deployment-status.json', json_encode($monitoringData, JSON_PRETTY_PRINT));
    echo "✓ Monitoring file created: badge-deployment-status.json\n";
    
    echo "\n=== DEPLOYMENT COMPLETE ===\n";
    echo "✓ Feature flag 'atomic_badge_renderer' is now ENABLED\n";
    echo "✓ Rollout percentage: 100%\n";
    echo "✓ Monitoring started\n\n";
    
    echo "Next steps:\n";
    echo "1. Open token list v3 in browser\n";
    echo "2. Check browser console for messages like:\n";
    echo "   - '[AtomicBadgeRenderer] Feature enabled, initializing atomic renderer'\n";
    echo "   - '[AtomicBadgeRenderer] Updated badge for [token]:'\n";
    echo "3. Watch for any oscillation patterns in badges\n";
    echo "4. If badges still show 'Safe' incorrectly, check:\n";
    echo "   - RiskStore data population\n";
    echo "   - Network requests to risk APIs\n";
    echo "   - Badge element initialization\n\n";
    
    echo "To check current status:\n";
    echo "curl 'http://localhost/api/feature-flags.php?feature=atomic_badge_renderer'\n\n";
    
    echo "To rollback if needed:\n";
    echo "php rollback.php\n\n";
    
    echo "Monitoring will help identify:\n";
    echo "- Badge oscillation (rapid on/off switching)\n";
    echo "- Redundant updates (same content rerendered)\n";
    echo "- Performance issues\n";
    echo "- Incorrect risk levels displayed\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Deployment failed. Please investigate and retry.\n";
    exit(1);
}
?>
