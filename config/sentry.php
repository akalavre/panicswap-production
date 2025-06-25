<?php
/**
 * Sentry Configuration
 * Initialize Sentry as early as possible to capture all errors
 */

// Initialize Sentry
\Sentry\init([
    'dsn' => 'https://072e5388e63771ce10b53f45fd2e0ae3@o4509520444850176.ingest.de.sentry.io/4509558980870224',
    
    // Performance Monitoring
    'traces_sample_rate' => 1.0, // Capture 100% of transactions for performance monitoring
    
    // Environment
    'environment' => isset($_ENV['APP_ENV']) ? $_ENV['APP_ENV'] : 'production',
    
    // Release tracking (optional)
    // 'release' => 'panicswap@1.0.0',
    
    // Set sample rate to capture errors
    'sample_rate' => 1.0,
    
    // Send default PII (personally identifiable information)
    'send_default_pii' => false,
    
    // Attach stack traces
    'attach_stacktrace' => true,
    
    // Max breadcrumbs
    'max_breadcrumbs' => 50,
    
    // Integrations
    'integrations' => [
        new \Sentry\Integration\RequestIntegration(),
        new \Sentry\Integration\TransactionIntegration(),
    ],
]);

// Set user context if wallet is connected
if (isset($_SESSION['wallet_address'])) {
    \Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
        $scope->setUser([
            'id' => $_SESSION['wallet_address'],
        ]);
    });
}