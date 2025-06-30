<?php
/**
 * Emergency Rollback Script
 * Reverts to the previous commit if deployment issues are detected
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

class EmergencyRollback {
    private $backupCommit;
    private $currentCommit;
    
    public function __construct() {
        $this->getCurrentCommit();
        $this->getBackupCommit();
    }
    
    private function getCurrentCommit() {
        $this->currentCommit = trim(shell_exec('git rev-parse HEAD'));
        echo "Current commit: {$this->currentCommit}\n";
    }
    
    private function getBackupCommit() {
        $this->backupCommit = trim(shell_exec('git rev-parse HEAD~1'));
        echo "Backup commit: {$this->backupCommit}\n";
    }
    
    public function performRollback() {
        echo "\n=== EMERGENCY ROLLBACK INITIATED ===\n";
        
        // Step 1: Stash any uncommitted changes
        echo "Stashing uncommitted changes...\n";
        shell_exec('git stash');
        
        // Step 2: Reset to previous commit
        echo "Reverting to previous commit...\n";
        $result = shell_exec("git reset --hard {$this->backupCommit}");
        echo $result;
        
        // Step 3: Force push to remote (if needed)
        if ($this->confirmForcePush()) {
            echo "Force pushing to remote...\n";
            shell_exec('git push --force origin main');
        }
        
        // Step 4: Clear caches
        $this->clearCaches();
        
        // Step 5: Verify rollback
        $this->verifyRollback();
        
        echo "\n=== ROLLBACK COMPLETED ===\n";
        echo "Previous deployment has been reverted.\n";
        echo "Please investigate the issues before attempting another deployment.\n";
    }
    
    private function confirmForcePush() {
        if (php_sapi_name() === 'cli') {
            echo "Force push to remote? (y/n): ";
            $handle = fopen("php://stdin", "r");
            $line = fgets($handle);
            fclose($handle);
            return trim($line) === 'y';
        }
        return false; // Don't auto-force push in web mode
    }
    
    private function clearCaches() {
        echo "Clearing caches...\n";
        
        // Clear PHP opcache if available
        if (function_exists('opcache_reset')) {
            opcache_reset();
            echo "PHP opcache cleared\n";
        }
        
        // Clear any application caches
        $cacheFiles = glob('cache/*');
        foreach ($cacheFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        
        // Clear browser cache headers
        if (!headers_sent()) {
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
        }
        
        echo "Application caches cleared\n";
    }
    
    private function verifyRollback() {
        echo "Verifying rollback...\n";
        
        $newCommit = trim(shell_exec('git rev-parse HEAD'));
        if ($newCommit === $this->backupCommit) {
            echo "✓ Rollback successful - now at commit: $newCommit\n";
        } else {
            echo "✗ Rollback may have failed - current commit: $newCommit\n";
        }
        
        // Test basic functionality
        $testResult = $this->runBasicTests();
        if ($testResult) {
            echo "✓ Basic functionality tests passed\n";
        } else {
            echo "✗ Basic functionality tests failed\n";
        }
    }
    
    private function runBasicTests() {
        // Test API endpoints
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost/api/test-basic.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return ($httpCode === 200 && strpos($result, 'success') !== false);
    }
    
    public function getCommitInfo($commit) {
        $info = shell_exec("git show --format='%H %s %an %ad' --no-patch $commit");
        return trim($info);
    }
}

// Check if running in CLI mode
if (php_sapi_name() === 'cli') {
    $rollback = new EmergencyRollback();
    
    echo "\nAre you sure you want to perform an emergency rollback? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $confirmation = trim(fgets($handle));
    fclose($handle);
    
    if ($confirmation === 'yes') {
        $rollback->performRollback();
    } else {
        echo "Rollback cancelled.\n";
    }
} else {
    // Web interface
    $rollback = new EmergencyRollback();
    
    echo "<h2>Emergency Rollback</h2>";
    
    if (isset($_POST['confirm_rollback']) && $_POST['confirm_rollback'] === 'yes') {
        echo "<div style='background: #ffcccc; padding: 10px; border: 1px solid #ff0000;'>";
        echo "<h3>ROLLBACK IN PROGRESS...</h3>";
        echo "<pre>";
        $rollback->performRollback();
        echo "</pre>";
        echo "</div>";
    } else {
        echo "<form method='post'>";
        echo "<p><strong>Warning:</strong> This will revert to the previous commit and may cause data loss.</p>";
        echo "<p>Current commit: " . $rollback->getCommitInfo('HEAD') . "</p>";
        echo "<p>Will revert to: " . $rollback->getCommitInfo('HEAD~1') . "</p>";
        echo "<p><input type='checkbox' name='confirm_rollback' value='yes'> I understand the risks and want to proceed</p>";
        echo "<p><input type='submit' value='EMERGENCY ROLLBACK' style='background: #ff0000; color: white; padding: 10px;'></p>";
        echo "</form>";
    }
}
?>
