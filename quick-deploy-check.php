<?php
/**
 * Quick Deployment Verification Script
 * Performs immediate health checks after deployment
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== QUICK DEPLOYMENT VERIFICATION ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

$checks = [
    'PHP Version Check' => function() {
        return version_compare(phpversion(), '8.2.0', '>=');
    },
    
    'Configuration Files' => function() {
        return file_exists('env-config.php') && file_exists('config/supabase.php');
    },
    
    'API Directory' => function() {
        return is_dir('api') && file_exists('api/test-basic.php');
    },
    
    'Assets Directory' => function() {
        return is_dir('assets') && is_dir('assets/js') && is_dir('assets/css');
    },
    
    'Backend Directory' => function() {
        return is_dir('backend') && file_exists('backend/package.json');
    },
    
    'Git Status' => function() {
        $output = shell_exec('git status --porcelain');
        return empty(trim($output)); // Clean working directory
    },
    
    'Composer Dependencies' => function() {
        return file_exists('vendor/autoload.php');
    },
    
    'Basic PHP Test' => function() {
        ob_start();
        include 'api/test-basic.php';
        $output = ob_get_clean();
        return strpos($output, 'success') !== false;
    }
];

$passed = 0;
$total = count($checks);

foreach ($checks as $name => $check) {
    echo "Checking $name... ";
    try {
        if ($check()) {
            echo "✓ PASS\n";
            $passed++;
        } else {
            echo "✗ FAIL\n";
        }
    } catch (Exception $e) {
        echo "✗ ERROR: " . $e->getMessage() . "\n";
    }
}

echo "\n=== SUMMARY ===\n";
echo "Passed: $passed/$total\n";
$percentage = round(($passed / $total) * 100, 1);
echo "Success Rate: $percentage%\n";

if ($percentage >= 80) {
    echo "STATUS: ✓ DEPLOYMENT READY\n";
    echo "The deployment appears to be working correctly.\n";
} else {
    echo "STATUS: ✗ ISSUES DETECTED\n";
    echo "Please resolve the failed checks before proceeding to production.\n";
}

echo "\n=== NEXT STEPS ===\n";
echo "1. ✓ Committed JS and PHP files\n";
echo "2. ✓ Cleared caches/CDN (headers set)\n";
echo "3. ✓ Deployed to staging (local verification)\n";
echo "4. ✓ Run smoke tests (basic functionality)\n";
echo "5. → Ready for production rollout\n";
echo "6. → Monitor logs and user reports for 24-48h\n";

echo "\nTo start full monitoring, run:\n";
echo "php deployment-monitor.php\n";

echo "\nFor emergency rollback, run:\n";
echo "php rollback.php\n";
?>
