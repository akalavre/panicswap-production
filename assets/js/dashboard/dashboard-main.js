/**
 * Main Dashboard Initialization
 * Coordinates all dashboard modules and handles page setup
 */

// Dashboard initialization
async function initializeDashboard() {
    console.log('Initializing PanicSwap Dashboard...');
    
    try {
        // Wait for required dependencies
        await waitForDependencies();
        
        // Initialize all modules
        // Commented out - using new simple counter instead
        // if (typeof initializeTokenManagement === 'function') {
        //     initializeTokenManagement();
        // }
        
        if (typeof initializeDemoMode === 'function') {
            initializeDemoMode();
        }
        
        if (typeof initializeAddToken === 'function') {
            initializeAddToken();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        await loadInitialData();
        
        console.log('Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

// Wait for required dependencies to load
async function waitForDependencies() {
    const dependencies = [
        () => window.supabaseClient,
        () => window.solana,
        () => document.readyState === 'complete'
    ];
    
    const maxWait = 10000; // 10 seconds max wait
    const checkInterval = 100; // Check every 100ms
    let waited = 0;
    
    while (waited < maxWait) {
        const allReady = dependencies.every(check => check());
        if (allReady) return;
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }
    
    throw new Error('Required dependencies not available after 10 seconds');
}

// Set up global event listeners
function setupEventListeners() {
    // Wallet connection changes
    if (window.solana) {
        window.solana.on('connect', () => {
            console.log('Wallet connected');
            // Use the new simple counter
            if (typeof window.refreshProtectedTokenCount === 'function') {
                window.refreshProtectedTokenCount();
            }
        });
        
        window.solana.on('disconnect', () => {
            console.log('Wallet disconnected');
            // Note: WalletState now handles wallet address cleanup
            
            // Cleanup subscriptions before reload
            if (typeof cleanupSubscriptions === 'function') {
                cleanupSubscriptions();
            }
            
            location.reload(); // Refresh page on disconnect
        });
    }
    
    // Page visibility changes (pause/resume updates when tab is hidden/visible)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Dashboard paused (tab hidden)');
        } else {
            console.log('Dashboard resumed (tab visible)');
            // Use the new simple counter instead of legacy function
            if (typeof window.refreshProtectedTokenCount === 'function') {
                window.refreshProtectedTokenCount();
            }
        }
    });
}

// Load initial dashboard data
async function loadInitialData() {
    // Use WalletState for wallet information
    const walletState = window.walletState ? window.walletState.state : null;
    const walletAddress = walletState ? walletState.address : null;
    
    if (walletAddress) {
        console.log('Loading data for wallet:', walletAddress);
        
        // Load protected tokens data using simple counter
        if (typeof window.refreshProtectedTokenCount === 'function') {
            window.refreshProtectedTokenCount();
        }
    } else {
        console.log('No wallet connected, showing connection prompt');
    }
}

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    if (typeof showError === 'function') {
        showError('An unexpected error occurred: ' + event.reason.message);
    }
    event.preventDefault();
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM already loaded
    initializeDashboard();
}

// Export for manual initialization if needed
window.initializeDashboard = initializeDashboard;