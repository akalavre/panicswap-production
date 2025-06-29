/**
 * Token Management for Dashboard
 * Handles protected tokens loading, subscription limits, and display updates
 */

// Load protected tokens data
async function loadProtectedTokensData() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
        updateProtectedTokensDisplay(0, 5); // Default to Basic plan limit
        return;
    }
    
    try {
        // Get current subscription/plan to determine limit
        const planLimit = await getCurrentPlanTokenLimit();
        
        // Fetch protected tokens count from Supabase
        // Count tokens where both monitoring_enabled AND is_active are true
        const { count, error } = await supabaseClient
            .from('protected_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('wallet_address', walletAddress)
            .eq('monitoring_enabled', true)
            .eq('is_active', true);
        
        if (error) {
            console.error('Error fetching protected tokens:', error);
            updateProtectedTokensDisplay(0, planLimit);
            return;
        }
        
        const protectedCount = count || 0;
        updateProtectedTokensDisplay(protectedCount, planLimit);
        
    } catch (error) {
        console.error('Error loading protected tokens data:', error);
        updateProtectedTokensDisplay(0, 5); // Default to Basic plan
    }
}

// Get current plan token limit
async function getCurrentPlanTokenLimit() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return 5; // Default Basic plan
    
    try {
        // Try to get subscription from Supabase
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress);
        
        if (error || !users || users.length === 0) {
            return 5; // Default Basic plan if no user found
        }
        
        const user = users[0];
        
        if (user && user.id) {
            const { data: subscriptions, error: subError } = await supabaseClient
                .from('subscriptions')
                .select('plan')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (subError) {
                console.error('Subscription query error:', subError);
                return 5; // Default to Basic plan on error
            }
            
            if (!subError && subscriptions && subscriptions.length > 0) {
                const subscription = subscriptions[0];
                // Extract token limit from plan
                const planName = subscription.plan?.toLowerCase();
                if (planName?.includes('pro')) return 50;
                if (planName?.includes('premium')) return 100;
                if (planName?.includes('enterprise')) return -1; // Unlimited
            }
        }
        
        return 5; // Default to Basic plan
    } catch (error) {
        console.error('Error fetching plan limit:', error);
        return 5; // Default to Basic plan
    }
}

// Update protected tokens display
function updateProtectedTokensDisplay(protectedCount, planLimit) {
    // Update main stats card
    const protectedCountEl = document.getElementById('protected-count');
    const protectedLimitEl = document.getElementById('protected-limit');
    
    // Commented out - using new simple counter instead
    // if (protectedCountEl) {
    //     protectedCountEl.textContent = protectedCount.toString();
    // }
    
    if (protectedLimitEl) {
        const limitText = planLimit === -1 ? 'unlimited' : planLimit.toString();
        protectedLimitEl.textContent = `of ${limitText} maximum`;
    }
    
    // Update progress bar if exists
    const progressBar = document.querySelector('[data-progress-bar]');
    if (progressBar && planLimit > 0) {
        const percentage = Math.min((protectedCount / planLimit) * 100, 100);
        progressBar.style.width = `${percentage}%`;
        
        // Update color based on usage
        progressBar.className = progressBar.className.replace(/bg-\w+-\d+/, '');
        if (percentage >= 90) {
            progressBar.classList.add('bg-red-500');
        } else if (percentage >= 75) {
            progressBar.classList.add('bg-yellow-500');
        } else {
            progressBar.classList.add('bg-green-500');
        }
    }
    
    // Show upgrade prompt if near limit
    if (planLimit > 0 && protectedCount >= planLimit * 0.8) {
        const upgradePrompt = document.getElementById('upgrade-prompt');
        if (upgradePrompt) {
            upgradePrompt.classList.remove('hidden');
        }
    }
}

// Setup real-time updates for protected tokens
function setupProtectedTokensRealtime() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return;
    
    // Check if subscription already exists
    const channelName = `protected_tokens_${walletAddress}`;
    if (window.dashboardSubscriptions && window.dashboardSubscriptions[channelName]) {
        return window.dashboardSubscriptions[channelName];
    }
    
    // Initialize subscriptions tracker
    if (!window.dashboardSubscriptions) {
        window.dashboardSubscriptions = {};
    }
    
    // Subscribe to protected_tokens changes
    const subscription = supabaseClient
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'protected_tokens',
                filter: `wallet_address=eq.${walletAddress}`
            },
            (payload) => {
                // Reload protected tokens data
                loadProtectedTokensData();
            }
        )
        .subscribe();
    
    // Store subscription reference
    window.dashboardSubscriptions[channelName] = subscription;
    
    return subscription;
}

// Check wallet connection status
function checkWalletConnection() {
    const walletAddress = localStorage.getItem('walletAddress');
    const walletConnected = window.solana && window.solana.isConnected;
    
    if (!walletAddress || !walletConnected) {
        // Show connect wallet prompt
        const connectPrompt = document.getElementById('connect-wallet-prompt');
        if (connectPrompt) {
            connectPrompt.classList.remove('hidden');
        }
        
        // Hide main dashboard content
        const mainContent = document.getElementById('main-dashboard-content');
        if (mainContent) {
            mainContent.classList.add('hidden');
        }
        
        return false;
    }
    
    return true;
}

// Cleanup subscriptions
function cleanupSubscriptions() {
    if (window.dashboardSubscriptions) {
        Object.values(window.dashboardSubscriptions).forEach(subscription => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        });
        window.dashboardSubscriptions = {};
    }
}

// Initialize token management
function initializeTokenManagement() {
    if (checkWalletConnection()) {
        loadProtectedTokensData();
        setupProtectedTokensRealtime();
    }
    
    // Set up periodic refresh
    setInterval(() => {
        if (checkWalletConnection()) {
            loadProtectedTokensData();
        }
    }, 30000); // Refresh every 30 seconds
}

// Export for global use
window.loadProtectedTokensData = loadProtectedTokensData;
window.getCurrentPlanTokenLimit = getCurrentPlanTokenLimit;
window.updateProtectedTokensDisplay = updateProtectedTokensDisplay;
window.setupProtectedTokensRealtime = setupProtectedTokensRealtime;
window.checkWalletConnection = checkWalletConnection;
window.initializeTokenManagement = initializeTokenManagement;
window.cleanupSubscriptions = cleanupSubscriptions;