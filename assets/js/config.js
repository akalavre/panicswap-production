// PanicSwap Frontend Configuration
// This file is auto-generated from PHP environment variables

const PanicSwapConfig = {
    // Supabase
    SUPABASE_URL: 'https://cfficjjdhgqwqprfhlrj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA',
    
    // Solana Network
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URL: 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae',
    HELIUS_API_KEY: 'acf27094-f4d2-4318-b9e5-330735bfa6ae',
    
    // Payment
    PAYMENT_WALLET: '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG',
    
    // APIs
    JUPITER_API_URL: 'https://price.jup.ag/v6',
    STREAMING_WS_URL: 'http://localhost:3002',
    API_URL: 'http://localhost:3001/api',
    BACKEND_URL: 'http://localhost:3001',
    
    // App Settings
    APP_NAME: 'PanicSwap',
    APP_URL: 'https://panicswap.com',
    
    // Trading Settings
    MAX_SLIPPAGE: 100,
    DEFAULT_PRIORITY_FEE: 1000,
    
    // Feature Flags
    ENABLE_MAINNET: true,
    ENABLE_DEVNET: false,
    ENABLE_TESTNET: false,
    
    // Debug
    DEBUG_MODE: false,
    TEST_MODE: true,
    TEST_SUBSCRIPTION_PLAN: 'pro',
    
    // Refresh
    TOKEN_REFRESH_MS: 60000
};

// Make config globally available
window.PanicSwapConfig = PanicSwapConfig;

// Update existing constants for backward compatibility
if (typeof SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = PanicSwapConfig.SUPABASE_URL;
    window.SUPABASE_ANON_KEY = PanicSwapConfig.SUPABASE_ANON_KEY;
}