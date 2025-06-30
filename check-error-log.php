<?php
// Check recent PHP error log entries

$errorLog = 'c:/wamp64/logs/php_error.log';

echo "<h2>Recent PHP Error Log Entries</h2>";
echo "<pre>";

if (file_exists($errorLog)) {
    // Get last 50 lines
    $lines = file($errorLog);
    $lastLines = array_slice($lines, -50);
    
    echo "Last 50 error log entries:\n";
    echo "================================\n\n";
    
    foreach ($lastLines as $line) {
        // Highlight lines containing our API
        if (strpos($line, 'batch') !== false || 
            strpos($line, 'v2') !== false || 
            strpos($line, 'supabase') !== false ||
            strpos($line, 'token') !== false) {
            echo "<strong style='color: red;'>" . htmlspecialchars($line) . "</strong>";
        } else {
            echo htmlspecialchars($line);
        }
    }
} else {
    echo "Error log file not found at: $errorLog\n";
}

echo "</pre>";

// Also check if there's a local error log
$localLog = __DIR__ . '/error.log';
if (file_exists($localLog)) {
    echo "<h2>Local Error Log</h2><pre>";
    echo file_get_contents($localLog);
    echo "</pre>";
}
?>