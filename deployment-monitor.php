<?php
/**
 * Deployment Monitoring Script
 * Monitors system health, logs errors, and checks for anomalies
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load configuration
require_once 'env-config.php';
require_once 'config/supabase.php';

// Monitoring configuration
define('MONITOR_DURATION', 48 * 60 * 60); // 48 hours in seconds
define('LOG_FILE', 'deployment-monitoring.log');
define('ERROR_THRESHOLD', 10); // Maximum errors per hour
define('CHECK_INTERVAL', 300); // Check every 5 minutes

class DeploymentMonitor {
    private $startTime;
    private $errorCount = 0;
    private $lastCheckTime;
    private $logFile;
    
    public function __construct() {
        $this->startTime = time();
        $this->lastCheckTime = time();
        $this->logFile = LOG_FILE;
        $this->log("Deployment monitoring started");
    }
    
    public function monitor() {
        $endTime = $this->startTime + MONITOR_DURATION;
        
        while (time() < $endTime) {
            $this->performHealthChecks();
            sleep(CHECK_INTERVAL);
        }
        
        $this->log("Monitoring period completed");
        $this->generateReport();
    }
    
    private function performHealthChecks() {
        $this->log("Performing health checks...");
        
        // Check API endpoints
        $this->checkApiHealth();
        
        // Check database connectivity
        $this->checkDatabaseHealth();
        
        // Check backend service
        $this->checkBackendHealth();
        
        // Check for PHP errors
        $this->checkPhpErrors();
        
        // Update last check time
        $this->lastCheckTime = time();
    }
    
    private function checkApiHealth() {
        $endpoints = [
            'api/test-basic.php',
            'api/test-config.php',
            'api/test-simple.php'
        ];
        
        foreach ($endpoints as $endpoint) {
            $result = $this->curlGet("http://localhost/$endpoint");
            if (!$result || strpos($result, 'success') === false) {
                $this->logError("API endpoint failed: $endpoint");
            } else {
                $this->log("API endpoint OK: $endpoint");
            }
        }
    }
    
    private function checkDatabaseHealth() {
        try {
            // Simple database connectivity test
            $response = $this->curlGet('api/monitoring-status.php');
            if ($response) {
                $this->log("Database connectivity OK");
            } else {
                $this->logError("Database connectivity failed");
            }
        } catch (Exception $e) {
            $this->logError("Database check failed: " . $e->getMessage());
        }
    }
    
    private function checkBackendHealth() {
        $backendUrl = 'http://localhost:3001/api/health';
        $result = $this->curlGet($backendUrl);
        
        if ($result) {
            $this->log("Backend service OK");
        } else {
            $this->logError("Backend service unreachable");
        }
    }
    
    private function checkPhpErrors() {
        // Check for PHP errors in logs
        $errorLog = ini_get('error_log');
        if ($errorLog && file_exists($errorLog)) {
            $recentErrors = $this->getRecentErrors($errorLog);
            if (count($recentErrors) > ERROR_THRESHOLD) {
                $this->logError("High error rate detected: " . count($recentErrors) . " errors in last hour");
            }
        }
    }
    
    private function getRecentErrors($logFile) {
        $errors = [];
        $oneHourAgo = time() - 3600;
        
        if (file_exists($logFile)) {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES);
            foreach ($lines as $line) {
                // Simple check for recent timestamp (this is basic - improve based on log format)
                if (strpos($line, date('Y-m-d H', $oneHourAgo)) !== false ||
                    strpos($line, date('Y-m-d H')) !== false) {
                    $errors[] = $line;
                }
            }
        }
        
        return $errors;
    }
    
    private function curlGet($url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            return false;
        }
        
        return $result;
    }
    
    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] INFO: $message\n";
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
        echo $logEntry;
    }
    
    private function logError($message) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] ERROR: $message\n";
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
        echo $logEntry;
        
        $this->errorCount++;
        
        // Check if we need to trigger alerts
        if ($this->errorCount > ERROR_THRESHOLD) {
            $this->triggerAlert();
        }
    }
    
    private function triggerAlert() {
        $this->log("ERROR THRESHOLD EXCEEDED - Consider rollback!");
        
        // Here you could implement:
        // - Email notifications
        // - Slack/Discord webhooks
        // - SMS alerts
        // - Automatic rollback triggers
        
        echo "\n*** ALERT: Error threshold exceeded! ***\n";
        echo "Consider rolling back the deployment!\n\n";
    }
    
    private function generateReport() {
        $duration = time() - $this->startTime;
        $hours = round($duration / 3600, 2);
        
        $report = "\n=== DEPLOYMENT MONITORING REPORT ===\n";
        $report .= "Monitoring Duration: $hours hours\n";
        $report .= "Total Errors: {$this->errorCount}\n";
        $report .= "Error Rate: " . round($this->errorCount / $hours, 2) . " errors/hour\n";
        
        if ($this->errorCount > ERROR_THRESHOLD) {
            $report .= "STATUS: FAILED - Rollback recommended\n";
        } else {
            $report .= "STATUS: SUCCESS - Deployment stable\n";
        }
        
        $report .= "=====================================\n";
        
        $this->log($report);
        echo $report;
    }
}

// Check if running in CLI mode
if (php_sapi_name() === 'cli') {
    echo "Starting deployment monitoring...\n";
    echo "Monitoring for " . (MONITOR_DURATION / 3600) . " hours\n";
    echo "Check interval: " . (CHECK_INTERVAL / 60) . " minutes\n\n";
    
    $monitor = new DeploymentMonitor();
    $monitor->monitor();
} else {
    // Web interface for checking status
    echo "<h2>Deployment Monitor Status</h2>";
    
    if (file_exists(LOG_FILE)) {
        echo "<h3>Recent Log Entries:</h3>";
        echo "<pre>";
        $logs = file_get_contents(LOG_FILE);
        echo htmlspecialchars(substr($logs, -2000)); // Show last 2KB
        echo "</pre>";
    } else {
        echo "<p>No monitoring logs found.</p>";
    }
    
    echo "<p><a href='?action=start'>Start Monitoring</a></p>";
    
    if (isset($_GET['action']) && $_GET['action'] === 'start') {
        echo "<script>alert('Monitoring should be started from command line');</script>";
    }
}
?>
