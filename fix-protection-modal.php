<?php
// This script will help diagnose and fix the protection modal issue

$modalFile = 'components/protection-settings-modal.php';
$content = file_get_contents($modalFile);

// Check for potential issues
$issues = [];

// Check for syntax errors in JavaScript
if (strpos($content, 'window.openProtectionSettings') === false) {
    $issues[] = "window.openProtectionSettings function not found in modal file";
}

// Check for unclosed script tags
$scriptOpenCount = substr_count($content, '<script>');
$scriptCloseCount = substr_count($content, '</script>');
if ($scriptOpenCount !== $scriptCloseCount) {
    $issues[] = "Mismatched script tags: $scriptOpenCount opening, $scriptCloseCount closing";
}

// Check for console errors that might prevent execution
$errorPatterns = [
    '/console\.error\([^)]*\);/' => 'Console error statements found',
    '/throw\s+new\s+Error/' => 'Throw statements found',
];

foreach ($errorPatterns as $pattern => $message) {
    if (preg_match($pattern, $content)) {
        $issues[] = $message;
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protection Modal Diagnostic</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #111; color: #fff; }
    </style>
</head>
<body class="p-8">
    <h1 class="text-2xl mb-4">Protection Modal Diagnostic Report</h1>
    
    <div class="mb-6">
        <h2 class="text-lg mb-2">File Analysis: <?php echo $modalFile; ?></h2>
        
        <?php if (empty($issues)): ?>
            <p class="text-green-500">✅ No obvious issues found in modal file</p>
        <?php else: ?>
            <p class="text-red-500 mb-2">⚠️ Potential issues found:</p>
            <ul class="list-disc list-inside">
                <?php foreach ($issues as $issue): ?>
                    <li class="text-yellow-400"><?php echo htmlspecialchars($issue); ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
    
    <div class="mb-6">
        <h2 class="text-lg mb-2">Live Test</h2>
        <p class="mb-4">Click the button below to test if the modal function is available:</p>
        
        <button onclick="testModalFunction()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            Test Modal Function
        </button>
        
        <div id="test-result" class="mt-4"></div>
    </div>
    
    <div class="mb-6">
        <h2 class="text-lg mb-2">Script Loading Order</h2>
        <p>The following scripts should be loaded in this order:</p>
        <ol class="list-decimal list-inside space-y-1">
            <li>protectionApi.js - Defines the protection API</li>
            <li>protection-settings-modal.php - Defines openProtectionSettings</li>
            <li>protection-toggle.js - Uses openProtectionSettings</li>
        </ol>
    </div>
    
    <div class="mb-6">
        <h2 class="text-lg mb-2">Recommended Fix</h2>
        <div class="bg-gray-800 p-4 rounded">
            <p class="mb-2">Add this to the end of dashboard.php, just before &lt;/body&gt;:</p>
            <pre class="text-sm bg-gray-900 p-2 rounded overflow-x-auto"><code>&lt;script&gt;
// Ensure protection settings modal is initialized
document.addEventListener('DOMContentLoaded', function() {
    if (!window.openProtectionSettings) {
        console.error('Protection settings modal failed to initialize');
        // Reload the modal component
        const script = document.createElement('script');
        script.src = 'components/protection-settings-modal.php?t=' + Date.now();
        document.body.appendChild(script);
    }
});
&lt;/script&gt;</code></pre>
        </div>
    </div>
    
    <script>
        function testModalFunction() {
            const resultDiv = document.getElementById('test-result');
            
            if (typeof window.openProtectionSettings === 'function') {
                resultDiv.innerHTML = '<p class="text-green-500">✅ window.openProtectionSettings is available and is a function</p>';
                
                // Try to call it
                try {
                    // This should open the modal
                    window.openProtectionSettings('test-mint', 'TEST', {}, 'Test Token', '');
                    resultDiv.innerHTML += '<p class="text-green-500">✅ Function called successfully</p>';
                } catch (error) {
                    resultDiv.innerHTML += '<p class="text-red-500">❌ Error calling function: ' + error.message + '</p>';
                }
            } else {
                resultDiv.innerHTML = '<p class="text-red-500">❌ window.openProtectionSettings is not available</p>';
                resultDiv.innerHTML += '<p class="text-yellow-400">Type: ' + typeof window.openProtectionSettings + '</p>';
            }
        }
        
        // Check on load
        window.addEventListener('load', function() {
            console.log('Page loaded. Checking for openProtectionSettings...');
            console.log('openProtectionSettings exists:', typeof window.openProtectionSettings === 'function');
        });
    </script>
    
    <!-- Include the modal to test -->
    <?php include 'components/protection-settings-modal.php'; ?>
</body>
</html>