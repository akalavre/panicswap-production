<?php
/**
 * Simple Badge Oscillation Monitor
 * Monitors for badge issues after deployment without external dependencies
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== BADGE OSCILLATION MONITOR ===\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n";
echo "Monitoring for 30 minutes...\n\n";

$startTime = time();
$monitoringDuration = 30 * 60; // 30 minutes
$checkInterval = 60; // Check every minute
$errorCount = 0;
$lastCheck = time();

// Load monitoring status
$monitoringFile = 'badge-deployment-status.json';
if (file_exists($monitoringFile)) {
    $monitoring = json_decode(file_get_contents($monitoringFile), true);
    echo "Deployment ID: " . $monitoring['deployment_id'] . "\n";
    echo "Feature: " . $monitoring['feature_name'] . "\n\n";
}

function checkForErrors() {
    global $errorCount;
    
    // Check PHP error logs
    $errorLog = ini_get('error_log');
    if ($errorLog && file_exists($errorLog)) {
        $recentErrors = getRecentLogEntries($errorLog, 3600); // Last hour
        if (count($recentErrors) > 5) {
            echo "⚠ High error rate detected: " . count($recentErrors) . " errors in last hour\n";
            $errorCount += count($recentErrors);
            return count($recentErrors);
        }
    }
    
    return 0;
}

function getRecentLogEntries($logFile, $seconds) {
    $errors = [];
    $cutoffTime = time() - $seconds;
    
    if (file_exists($logFile)) {
        $lines = file($logFile, FILE_IGNORE_NEW_LINES);
        foreach (array_reverse($lines) as $line) {
            // Simple timestamp detection
            if (preg_match('/\[(\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2})/', $line, $matches)) {
                $lineTime = strtotime($matches[1]);
                if ($lineTime >= $cutoffTime) {
                    $errors[] = $line;
                } else {
                    break; // Stop checking older entries
                }
            }
        }
    }
    
    return $errors;
}

function checkFeatureFlag() {
    $supabaseUrl = 'https://cfficjjdhgqwqprfhlrj.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE';
    
    $url = $supabaseUrl . '/rest/v1/feature_flags?feature_name=eq.atomic_badge_renderer';
    $headers = [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ];
    
    $options = [
        'http' => [
            'header' => implode("\r\n", $headers),
            'method' => 'GET',
            'timeout' => 10
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    
    if ($response) {
        $data = json_decode($response, true);
        return !empty($data) && $data[0]['enabled'];
    }
    
    return false;
}

function logMonitoring($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $level: $message\n";
    file_put_contents('badge-monitoring.log', $logEntry, FILE_APPEND);
    echo $logEntry;
}

function updateMonitoringStatus($status, $errorCount = 0) {
    $monitoring = [
        'last_check' => date('Y-m-d H:i:s'),
        'status' => $status,
        'error_count' => $errorCount,
        'feature_enabled' => checkFeatureFlag(),
        'uptime_minutes' => floor((time() - $GLOBALS['startTime']) / 60)
    ];
    
    file_put_contents('badge-monitoring-live.json', json_encode($monitoring, JSON_PRETTY_PRINT));
}

// Main monitoring loop
logMonitoring("Badge oscillation monitoring started");
logMonitoring("Will monitor for " . ($monitoringDuration / 60) . " minutes");

while (time() < ($startTime + $monitoringDuration)) {
    $elapsed = time() - $startTime;
    $elapsedMinutes = floor($elapsed / 60);
    
    echo "\n--- Check #" . ceil($elapsed / $checkInterval) . " (T+{$elapsedMinutes}m) ---\n";
    
    // Check feature flag status
    $featureEnabled = checkFeatureFlag();
    if ($featureEnabled) {
        echo "✓ Feature flag: ENABLED\n";
    } else {
        echo "✗ Feature flag: DISABLED or unreachable\n";
        logMonitoring("Feature flag check failed", 'WARNING');
    }
    
    // Check for errors
    $newErrors = checkForErrors();
    if ($newErrors > 0) {
        echo "⚠ Found $newErrors new errors\n";
        logMonitoring("Found $newErrors new errors in logs", 'WARNING');
    } else {
        echo "✓ No recent errors detected\n";
    }
    
    // Check if error threshold exceeded
    if ($errorCount > 10) {
        echo "\n🚨 ERROR THRESHOLD EXCEEDED! 🚨\n";
        echo "Total errors: $errorCount\n";
        echo "Recommendation: Consider rollback\n";
        logMonitoring("Error threshold exceeded: $errorCount errors", 'CRITICAL');
        
        echo "\nTo rollback:\n";
        echo "php rollback.php\n\n";
        break;
    }
    
    // Update monitoring status
    updateMonitoringStatus('MONITORING', $errorCount);
    
    // Wait for next check
    sleep($checkInterval);
}

// Final report
echo "\n=== MONITORING COMPLETE ===\n";
$totalMinutes = floor((time() - $startTime) / 60);
echo "Monitoring duration: {$totalMinutes} minutes\n";
echo "Total errors detected: $errorCount\n";

if ($errorCount <= 5) {
    echo "Status: ✅ SUCCESS - Low error rate\n";
    echo "Recommendation: Deployment appears stable\n";
    updateMonitoringStatus('SUCCESS', $errorCount);
} else if ($errorCount <= 10) {
    echo "Status: ⚠️ WARNING - Moderate error rate\n";
    echo "Recommendation: Monitor closely for additional issues\n";
    updateMonitoringStatus('WARNING', $errorCount);
} else {
    echo "Status: ❌ FAILURE - High error rate\n";
    echo "Recommendation: Consider rollback\n";
    updateMonitoringStatus('FAILURE', $errorCount);
}

logMonitoring("Monitoring completed. Status: " . ($errorCount <= 5 ? 'SUCCESS' : ($errorCount <= 10 ? 'WARNING' : 'FAILURE')));

echo "\nNext steps:\n";
echo "1. Check browser console for badge behavior\n";
echo "2. Verify no oscillation in token list v3\n";
echo "3. Confirm correct risk levels are displayed\n";
echo "4. If issues persist, run: php rollback.php\n";
?>
