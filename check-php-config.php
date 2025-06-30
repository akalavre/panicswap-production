<?php
echo "<h2>PHP Configuration Check</h2>";
echo "<pre>";

// PHP Version
echo "PHP Version: " . PHP_VERSION . "\n\n";

// Error settings
echo "Error Reporting Settings:\n";
echo "  error_reporting: " . error_reporting() . "\n";
echo "  display_errors: " . ini_get('display_errors') . "\n";
echo "  log_errors: " . ini_get('log_errors') . "\n";
echo "  error_log: " . ini_get('error_log') . "\n\n";

// Memory limits
echo "Resource Limits:\n";
echo "  memory_limit: " . ini_get('memory_limit') . "\n";
echo "  max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "  post_max_size: " . ini_get('post_max_size') . "\n\n";

// Required extensions
echo "Required Extensions:\n";
$required = ['curl', 'json', 'mbstring'];
foreach ($required as $ext) {
    echo "  $ext: " . (extension_loaded($ext) ? '✓ Loaded' : '✗ Missing') . "\n";
}

echo "\nAll Loaded Extensions:\n";
print_r(get_loaded_extensions());

echo "</pre>";
?>