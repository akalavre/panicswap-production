<?php
// Generate JavaScript configuration from PHP environment
header('Content-Type: application/javascript');
header('Cache-Control: no-cache, must-revalidate');

// Load environment configuration
require_once dirname(__DIR__) . '/env-config.php';

// Get public configuration
$config = getPublicConfig();

// Generate JavaScript
?>
// PanicSwap Frontend Configuration
// This file is dynamically generated from PHP environment variables
// Generated at: <?php echo date('Y-m-d H:i:s'); ?>


const PanicSwapConfig = <?php echo json_encode($config, JSON_PRETTY_PRINT); ?>;

// Make config globally available
window.PanicSwapConfig = PanicSwapConfig;

// Update existing constants for backward compatibility
if (typeof SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = PanicSwapConfig.SUPABASE_URL;
    window.SUPABASE_ANON_KEY = PanicSwapConfig.SUPABASE_ANON_KEY;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanicSwapConfig;
}