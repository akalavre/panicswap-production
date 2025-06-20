// Supabase client configuration
// Use config from config.js or fallback to direct values
const SUPABASE_URL = window.PanicSwapConfig?.SUPABASE_URL || 'https://cfficjjdhgqwqprfhlrj.supabase.co';
const SUPABASE_ANON_KEY = window.PanicSwapConfig?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA';

// Initialize Supabase client (loaded from CDN)
let supabaseClient = null;

// Initialize Supabase when script loads
function initializeSupabase() {
    if (typeof window !== 'undefined' && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient; // Make it globally available
        console.log('Supabase client initialized successfully');
        
        // Dispatch event to notify other scripts
        window.dispatchEvent(new Event('supabaseReady'));
        return true;
    }
    console.log('Supabase library not yet loaded');
    return false;
}

// Keep trying to initialize until successful
let initAttempts = 0;
const maxAttempts = 20;

function tryInitialize() {
    if (initializeSupabase() || initAttempts >= maxAttempts) {
        if (initAttempts >= maxAttempts) {
            console.error('Failed to initialize Supabase after', maxAttempts, 'attempts');
        }
        return;
    }
    
    initAttempts++;
    setTimeout(tryInitialize, 100);
}

// Start initialization attempts
tryInitialize();

// Dashboard real-time updates
class DashboardRealtime {
    constructor() {
        this.channels = {};
        this.listeners = {};
    }
    
    // Initialize real-time subscriptions for dashboard
    async initializeDashboard(walletAddress) {
        if (!supabaseClient || !walletAddress) return;
        
        try {
            // Subscribe to wallet notifications
            this.subscribeToWalletNotifications(walletAddress);
            
            // Subscribe to system alerts
            this.subscribeToSystemAlerts();
            
            // Subscribe to protected tokens updates
            this.subscribeToProtectedTokens(walletAddress);
            
            console.log('Dashboard real-time subscriptions initialized');
        } catch (error) {
            console.error('Error initializing real-time:', error);
        }
    }
    
    // Subscribe to wallet-specific notifications
    subscribeToWalletNotifications(walletAddress) {
        const channelName = `wallet-${walletAddress}`;
        
        if (this.channels[channelName]) {
            this.channels[channelName].unsubscribe();
        }
        
        this.channels[channelName] = supabaseClient
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'wallet_notifications',
                filter: `wallet_address=eq.${walletAddress}`
            }, (payload) => {
                this.handleWalletNotification(payload);
            })
            .subscribe();
    }
    
    // Subscribe to system-wide alerts
    subscribeToSystemAlerts() {
        const channelName = 'system-alerts';
        
        if (this.channels[channelName]) {
            this.channels[channelName].unsubscribe();
        }
        
        this.channels[channelName] = supabaseClient
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'system_alerts',
                filter: 'is_active=eq.true'
            }, (payload) => {
                this.handleSystemAlert(payload);
            })
            .subscribe();
    }
    
    // Subscribe to protected tokens updates
    subscribeToProtectedTokens(walletAddress) {
        const channelName = `protected-tokens-${walletAddress}`;
        
        if (this.channels[channelName]) {
            this.channels[channelName].unsubscribe();
        }
        
        // First get user ID from wallet address
        this.getUserByWallet(walletAddress).then(user => {
            if (!user) return;
            
            this.channels[channelName] = supabaseClient
                .channel(channelName)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'protected_tokens',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    this.handleProtectedTokenUpdate(payload);
                })
                .subscribe();
        });
    }
    
    // Handle wallet notification
    handleWalletNotification(payload) {
        console.log('Wallet notification:', payload);
        
        if (payload.eventType === 'INSERT') {
            const notification = payload.new;
            
            // Show notification based on priority
            if (notification.priority === 'critical' || notification.priority === 'high') {
                this.showAlert({
                    type: notification.priority === 'critical' ? 'error' : 'warning',
                    title: notification.title,
                    message: notification.message,
                    autoHide: notification.priority === 'critical' ? 0 : 5000
                });
            }
            
            // Update activity log
            this.addActivity({
                action: notification.title,
                details: notification.message,
                type: notification.priority === 'critical' ? 'error' : 'info',
                timeAgo: 'just now'
            });
            
            // Increment alert count
            this.incrementAlertCount();
        }
    }
    
    // Handle system alert
    handleSystemAlert(payload) {
        console.log('System alert:', payload);
        
        if (payload.eventType === 'INSERT') {
            const alert = payload.new;
            
            this.showAlert({
                type: alert.alert_type || 'info',
                title: alert.title,
                message: alert.message,
                autoHide: alert.alert_type === 'critical' ? 0 : 10000
            });
        }
    }
    
    // Handle protected token update
    handleProtectedTokenUpdate(payload) {
        console.log('Protected token update:', payload);
        
        // Refresh dashboard data when tokens change
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
    }
    
    // Helper function to get user by wallet
    async getUserByWallet(walletAddress) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }
    
    // Show alert in UI
    showAlert(alert) {
        const alertId = `alert-${Date.now()}`;
        const alertsContainer = document.getElementById('alerts-container');
        
        if (!alertsContainer) return;
        
        const alertHtml = `
            <div id="${alertId}" class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 ${
                alert.type === 'error' ? 'border-red-500' :
                alert.type === 'warning' ? 'border-yellow-500' :
                alert.type === 'success' ? 'border-green-500' : ''
            } animate-slide-in">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-semibold mb-1">${alert.title || 'Alert'}</h4>
                        <p class="text-sm text-gray-400">${alert.message}</p>
                    </div>
                    <button onclick="dismissAlert('${alertId}')" class="text-gray-500 hover:text-white ml-4">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        alertsContainer.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-hide if specified
        if (alert.autoHide > 0) {
            setTimeout(() => {
                const el = document.getElementById(alertId);
                if (el) {
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 300);
                }
            }, alert.autoHide);
        }
    }
    
    // Add activity to recent activity log
    addActivity(activity) {
        const activityLog = document.getElementById('activity-log');
        if (!activityLog) return;
        
        const activityHtml = `
            <div class="flex items-start space-x-3 animate-slide-in">
                <div class="w-2 h-2 mt-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-yellow-500' :
                    activity.type === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                }"></div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <span class="font-medium">${activity.action}</span>
                        <span class="text-xs text-gray-500">${activity.timeAgo}</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">${activity.details}</p>
                </div>
            </div>
        `;
        
        // Remove "no activity" message if present
        const noActivity = activityLog.querySelector('.text-center');
        if (noActivity) {
            noActivity.remove();
        }
        
        activityLog.insertAdjacentHTML('afterbegin', activityHtml);
        
        // Limit to 10 recent activities
        const activities = activityLog.children;
        while (activities.length > 10) {
            activities[activities.length - 1].remove();
        }
    }
    
    // Increment alert count
    incrementAlertCount() {
        const alertCountEl = document.getElementById('active-alerts-count');
        if (alertCountEl) {
            const currentCount = parseInt(alertCountEl.textContent) || 0;
            alertCountEl.textContent = currentCount + 1;
        }
    }
    
    // Cleanup subscriptions
    cleanup() {
        Object.values(this.channels).forEach(channel => {
            channel.unsubscribe();
        });
        this.channels = {};
    }
}

// Global instance
const dashboardRealtime = new DashboardRealtime();

// Auto-initialize when wallet is connected
document.addEventListener('DOMContentLoaded', function() {
    // Wait for wallet connection
    const checkWallet = setInterval(() => {
        const walletAddress = localStorage.getItem('walletAddress');
        if (walletAddress && supabaseClient) {
            dashboardRealtime.initializeDashboard(walletAddress);
            clearInterval(checkWallet);
        }
    }, 1000);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        dashboardRealtime.cleanup();
    });
});

// Export for use in other scripts
window.dashboardRealtime = dashboardRealtime;