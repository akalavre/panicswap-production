<?php
/**
 * Environment Configuration Loader
 * Loads environment variables from .env file or uses defaults
 */

// Load .env file if it exists
if (file_exists(__DIR__ . '/.env')) {
    $envFile = __DIR__ . '/.env';
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse key=value
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        
        // Remove quotes if present
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') || 
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
            $value = substr($value, 1, -1);
        }
        
        // Set environment variable
        putenv("$key=$value");
        $_ENV[$key] = $value;
    }
}

// Define all configuration constants with defaults
define('ENV_LOADED', true);

// Supabase Configuration
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://cfficjjdhgqwqprfhlrj.supabase.co');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA');
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE');

// Solana Network Configuration
define('SOLANA_NETWORK', getenv('SOLANA_NETWORK') ?: 'mainnet-beta');
define('SOLANA_RPC_URL', getenv('SOLANA_RPC_URL') ?: 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae');
define('HELIUS_RPC_URL', getenv('HELIUS_RPC_URL') ?: 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae');
define('HELIUS_API_KEY', getenv('HELIUS_API_KEY') ?: 'acf27094-f4d2-4318-b9e5-330735bfa6ae');

// Payment Configuration
define('PAYMENT_WALLET', getenv('PAYMENT_WALLET') ?: '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG');

// Price API Configuration
define('JUPITER_API_URL', getenv('JUPITER_API_URL') ?: 'https://price.jup.ag/v6');
define('COINGECKO_API_KEY', getenv('COINGECKO_API_KEY') ?: 'CG-a65g1Q3p6a55jvzewEunnRnJ');

// Moralis API Configuration
define('MORALIS_API_KEY', getenv('MORALIS_API_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjAxZWM1M2FiLWI2OWMtNDMzYi04YjAzLWY0NmE0NzQxMTJiYyIsIm9yZ0lkIjoiNDQ5NzE1IiwidXNlcklkIjoiNDYyNzEzIiwidHlwZUlkIjoiZDI4MGRhN2MtZWM2OS00ODkzLTkwOWEtMjcwNmVmYzVmOTVlIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDg0NTMwNzUsImV4cCI6NDkwNDIxMzA3NX0.QtOIPAx7q38OTvkKRbiECuKSUVkT6K4L-IFF0ygbDSc');

// Streaming Service Configuration
define('STREAMING_WS_URL', getenv('STREAMING_WS_URL') ?: 'http://localhost:3002');
define('SOLANA_STREAMING_API_KEY', getenv('SOLANA_STREAMING_API_KEY') ?: '986bc253b85f64514476537965127e4c');

// Application Configuration
define('APP_NAME', getenv('APP_NAME') ?: 'PanicSwap');
define('APP_URL', getenv('APP_URL') ?: 'https://panicswap.com');
define('APP_ENV', getenv('APP_ENV') ?: 'production');

// Backend API Configuration
define('API_URL', getenv('API_URL') ?: 'http://localhost:3001/api');
define('BACKEND_URL', getenv('BACKEND_URL') ?: 'http://localhost:3001');
define('BACKEND_PORT', getenv('BACKEND_PORT') ?: '3001');

// Security Settings
define('MAX_SLIPPAGE', getenv('MAX_SLIPPAGE') ?: 100);
define('DEFAULT_PRIORITY_FEE', getenv('DEFAULT_PRIORITY_FEE') ?: 1000);

// Feature Flags
define('ENABLE_MAINNET', getenv('ENABLE_MAINNET') === 'false' ? false : true);
define('ENABLE_DEVNET', getenv('ENABLE_DEVNET') === 'true' ? true : false);
define('ENABLE_TESTNET', getenv('ENABLE_TESTNET') === 'true' ? true : false);

// Debug Mode
define('DEBUG_MODE', getenv('DEBUG_MODE') === 'true' ? true : false);

// Test Mode Configuration
define('TEST_MODE', getenv('TEST_MODE') === 'true' ? true : false);
define('TEST_SUBSCRIPTION_PLAN', getenv('TEST_SUBSCRIPTION_PLAN') ?: 'pro');

// Token Refresh Configuration
define('TOKEN_REFRESH_MS', getenv('TOKEN_REFRESH_MS') ?: 60000);

// Helper function to get config as array (for JavaScript)
function getPublicConfig() {
    return [
        'SUPABASE_URL' => SUPABASE_URL,
        'SUPABASE_ANON_KEY' => SUPABASE_ANON_KEY,
        'SOLANA_NETWORK' => SOLANA_NETWORK,
        'SOLANA_RPC_URL' => SOLANA_RPC_URL,
        'HELIUS_API_KEY' => HELIUS_API_KEY,
        'PAYMENT_WALLET' => PAYMENT_WALLET,
        'JUPITER_API_URL' => JUPITER_API_URL,
        'STREAMING_WS_URL' => STREAMING_WS_URL,
        'APP_NAME' => APP_NAME,
        'APP_URL' => APP_URL,
        'API_URL' => API_URL,
        'BACKEND_URL' => BACKEND_URL,
        'MAX_SLIPPAGE' => MAX_SLIPPAGE,
        'DEFAULT_PRIORITY_FEE' => DEFAULT_PRIORITY_FEE,
        'ENABLE_MAINNET' => ENABLE_MAINNET,
        'ENABLE_DEVNET' => ENABLE_DEVNET,
        'ENABLE_TESTNET' => ENABLE_TESTNET,
        'DEBUG_MODE' => DEBUG_MODE,
        'TEST_MODE' => TEST_MODE,
        'TEST_SUBSCRIPTION_PLAN' => TEST_SUBSCRIPTION_PLAN,
        'TOKEN_REFRESH_MS' => TOKEN_REFRESH_MS
    ];
}
?>