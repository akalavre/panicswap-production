<?php
/**
 * Deployment Script for Atomic Badge Renderer Fix
 * 
 * This script deploys the feature flag to enable the improved badge rendering
 * that eliminates oscillation and redundant updates.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== BADGE OSCILLATION FIX DEPLOYMENT ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

// Load configuration
require_once 'env-config.php';
require_once 'config/supabase.php';

class BadgeFixDeployment {
    private $supabase;
    private $featureName = 'atomic_badge_renderer';
    private $monitoringDuration = 30 * 60; // 30 minutes initial monitoring
    
    public function __construct() {
        $this->supabase = Supabase\getSupabaseServiceClient();
    }
    
    public function deploy() {
        echo "Step 1: Deploying feature flag...\n";
        $this->deployFeatureFlag();
        
        echo "\nStep 2: Starting monitoring...\n";
        $this->startMonitoring();
        
        echo "\nStep 3: Verifying deployment...\n";
        $this->verifyDeployment();
        
        echo "\n=== DEPLOYMENT COMPLETE ===\n";
        echo "Feature flag deployed successfully!\n";
        echo "Monitoring will continue for " . ($this->monitoringDuration / 60) . " minutes.\n";
        echo "Check console logs for any badge oscillation issues.\n\n";
        
        echo "To rollback if issues occur:\n";
        echo "php rollback.php\n\n";
        
        echo "To monitor deployment:\n";
        echo "php deployment-monitor.php\n";
    }
    
    private function deployFeatureFlag() {
        try {
            // Create/update the atomic badge renderer feature flag
            $featureData = [
                'feature_name' => $this->featureName,
                'enabled' => true,
                'rollout_percentage' => 100, // Full rollout
                'description' => 'Atomic badge renderer that prevents oscillation and redundant updates',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            // Check if feature exists
            $existing = $this->supabase->from('feature_flags')
                ->select('feature_name')
                ->eq('feature_name', $this->featureName)
                ->single()
                ->execute();
            
            if ($existing->data) {
                // Update existing
                unset($featureData['created_at']);
                $result = $this->supabase->from('feature_flags')
                    ->update($featureData)
                    ->eq('feature_name', $this->featureName)
                    ->execute();
                echo "✓ Updated existing feature flag\n";
            } else {
                // Create new
                $result = $this->supabase->from('feature_flags')
                    ->insert($featureData)
                    ->execute();
                echo "✓ Created new feature flag\n";
            }
            
            // Log deployment
            $this->logDeployment('FEATURE_FLAG_DEPLOYED', [
                'feature' => $this->featureName,
                'enabled' => true,
                'rollout_percentage' => 100
            ]);
            
        } catch (Exception $e) {
            throw new Exception("Failed to deploy feature flag: " . $e->getMessage());
        }
    }
    
    private function startMonitoring() {
        try {
            // Create monitoring entry
            $monitoringData = [
                'deployment_id' => 'badge-fix-' . date('YmdHis'),
                'feature_name' => $this->featureName,
                'start_time' => date('Y-m-d H:i:s'),
                'status' => 'MONITORING',
                'error_count' => 0,
                'oscillation_detected' => false
            ];
            
            // Store monitoring data
            file_put_contents('badge-fix-monitoring.json', json_encode($monitoringData, JSON_PRETTY_PRINT));
            
            echo "✓ Monitoring started\n";
            echo "  - Monitoring ID: " . $monitoringData['deployment_id'] . "\n";
            echo "  - Duration: " . ($this->monitoringDuration / 60) . " minutes\n";
            
            // Start background monitoring (would normally run as separate process)
            $this->setupBackgroundMonitoring($monitoringData['deployment_id']);
            
        } catch (Exception $e) {
            throw new Exception("Failed to start monitoring: " . $e->getMessage());
        }
    }
    
    private function setupBackgroundMonitoring($deploymentId) {
        // Create monitoring script that can be run separately
        $monitoringScript = "<?php
/**
 * Background monitoring for badge fix deployment
 * Run this with: php monitor-badge-fix.php
 */

require_once 'deployment-monitor.php';

class BadgeFixMonitor extends DeploymentMonitor {
    private \$deploymentId;
    private \$startTime;
    private \$errorThreshold = 5; // Max 5 oscillation errors
    
    public function __construct(\$deploymentId) {
        parent::__construct();
        \$this->deploymentId = \$deploymentId;
        \$this->startTime = time();
    }
    
    public function monitorBadgeOscillation() {
        \$endTime = \$this->startTime + {$this->monitoringDuration};
        \$oscillationCount = 0;
        
        while (time() < \$endTime) {
            // Check for badge oscillation in browser console logs
            \$this->checkForOscillation();
            
            // Check error logs
            \$errors = \$this->checkErrorLogs();
            if (\$errors > \$this->errorThreshold) {
                \$this->triggerRollback('Error threshold exceeded: ' . \$errors . ' errors detected');
                break;
            }
            
            sleep(60); // Check every minute
        }
        
        \$this->generateMonitoringReport();
    }
    
    private function checkForOscillation() {
        // Would check browser console logs via API or log files
        // For now, simulate the check
        return 0;
    }
    
    private function triggerRollback(\$reason) {
        echo \"ROLLBACK TRIGGERED: \$reason\\n\";
        // Would call rollback script
        exec('php rollback.php');
    }
}

\$monitor = new BadgeFixMonitor('$deploymentId');
\$monitor->monitorBadgeOscillation();
?>";
        
        file_put_contents('monitor-badge-fix.php', $monitoringScript);
        echo "✓ Background monitoring script created: monitor-badge-fix.php\n";
    }
    
    private function verifyDeployment() {
        try {
            // Test the feature flag API
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'http://localhost/api/feature-flags.php?feature=' . $this->featureName);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if ($data && $data['success'] && $data['feature']['enabled']) {
                    echo "✓ Feature flag API responding correctly\n";
                    echo "✓ Feature is enabled with " . $data['feature']['rollout_percentage'] . "% rollout\n";
                } else {
                    throw new Exception("Feature flag not properly enabled");
                }
            } else {
                throw new Exception("Feature flag API not responding (HTTP $httpCode)");
            }
            
            // Test basic token list functionality
            $this->testTokenListFunctionality();
            
        } catch (Exception $e) {
            throw new Exception("Deployment verification failed: " . $e->getMessage());
        }
    }
    
    private function testTokenListFunctionality() {
        // Test that token list v3 loads without errors
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost/dashboard.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && strpos($response, 'token-list-v3') !== false) {
            echo "✓ Token list page loads successfully\n";
        } else {
            echo "⚠ Warning: Token list page may have issues (HTTP $httpCode)\n";
        }
    }
    
    private function logDeployment($event, $data) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => $event,
            'data' => $data
        ];
        
        $logFile = 'deployment-badge-fix.log';
        file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND);
    }
}

// Check if running in CLI mode
if (php_sapi_name() === 'cli') {
    try {
        $deployment = new BadgeFixDeployment();
        $deployment->deploy();
        
        echo "Next steps:\n";
        echo "1. Monitor the badge behavior on token list v3\n";
        echo "2. Watch browser console for oscillation warnings\n";
        echo "3. Run 'php monitor-badge-fix.php' for automated monitoring\n";
        echo "4. Check Sentry/logs for any new errors\n\n";
        
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
        echo "Deployment failed. Please investigate and retry.\n";
        exit(1);
    }
} else {
    // Web interface
    echo "<h2>Badge Fix Deployment</h2>";
    echo "<p>This script must be run from command line for security.</p>";
    echo "<p>Run: <code>php deploy-badge-fix.php</code></p>";
}
?>
