/**
 * Notification Utilities for Dashboard
 * Handles error, success, warning, and info notifications
 * Enhanced with WalletState and BannerController subscriptions
 */

// Helper function to show error messages
function showError(message, inputElement) {
    showNotification(message, 'error');
    if (inputElement) inputElement.focus();
}

// Helper function to show success messages
function showSuccess(message) {
    showNotification(message, 'success');
}

// Helper function to show warning messages
function showWarning(message) {
    showNotification(message, 'warning');
}

// Helper function to show info messages with custom lifespan
function showInfo(message, lifespan = 5000) {
    showNotification(message, 'info', lifespan);
}


// Notification history for de-duplication
const notificationHistory = new Map();
const NOTIFICATION_TIMEOUT = 60000; // 1 minute

// Enhanced showNotification with de-duplication and custom lifespan
function showNotification(message, type = 'info', lifespan = 5000) {
    const notificationId = `${type}-${message}`;
    const now = Date.now();

    // Check if a similar notification was shown recently
    if (notificationHistory.has(notificationId) && (now - notificationHistory.get(notificationId)) < NOTIFICATION_TIMEOUT) {
        console.log('Duplicate notification suppressed:', message);
        return;
    }

    // Update history
    notificationHistory.set(notificationId, now);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Set type-specific styles
    switch (type) {
        case 'error':
            notification.className += ' bg-red-600 text-white border border-red-500';
            break;
        case 'success':
            notification.className += ' bg-green-600 text-white border border-green-500';
            break;
        case 'warning':
            notification.className += ' bg-yellow-600 text-white border border-yellow-500';
            break;
        default:
            notification.className += ' bg-blue-600 text-white border border-blue-500';
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-sm font-medium">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Add to page
document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove based on lifespan
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, lifespan);
}

// Enhanced notification with semantic icons
function createNotificationWithIcon(message, type, icon, lifespan = 5000) {
    const notificationId = `${type}-${message}`;
    const now = Date.now();

    // Check for duplicates
    if (notificationHistory.has(notificationId) && (now - notificationHistory.get(notificationId)) < NOTIFICATION_TIMEOUT) {
        console.log('Duplicate notification suppressed:', message);
        return;
    }

    // Update history
    notificationHistory.set(notificationId, now);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Set type-specific styles
    switch (type) {
        case 'error':
            notification.className += ' bg-red-600 text-white border border-red-500';
            break;
        case 'success':
            notification.className += ' bg-green-600 text-white border border-green-500';
            break;
        case 'warning':
            notification.className += ' bg-yellow-600 text-white border border-yellow-500';
            break;
        case 'info':
            notification.className += ' bg-blue-600 text-white border border-blue-500';
            break;
        case 'upgrade':
            notification.className += ' bg-purple-600 text-white border border-purple-500';
            break;
        default:
            notification.className += ' bg-gray-600 text-white border border-gray-500';
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <div class="mr-3 flex-shrink-0">
                    ${icon}
                </div>
                <span class="text-sm font-medium">${message}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove based on lifespan
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, lifespan);
}

// Semantic icon definitions
const notificationIcons = {
    walletConnected: `
        <svg class="w-5 h-5 text-green-200" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
        </svg>
    `,
    walletUpgraded: `
        <svg class="w-5 h-5 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
        </svg>
    `,
    walletDisconnected: `
        <svg class="w-5 h-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
        </svg>
    `,
    autoSwap: `
        <svg class="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"></path>
        </svg>
    `
};

// Enhanced WalletState subscription system
class NotificationController {
    constructor() {
        this.subscribed = false;
        this.lastState = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('NotificationController: Initializing...');
        this.subscribeToWalletState();
        this.subscribeToBannerController();
    }

    subscribeToWalletState() {
        if (window.walletState && !this.subscribed) {
            console.log('NotificationController: Subscribing to WalletState');
            
            // Subscribe to wallet state changes
            window.walletState.on('change', (state) => this.handleWalletStateChange(state));
            
            // Subscribe to mode switching events
            window.walletState.on('modeSwitched', (data) => this.handleModeSwitched(data));
            
            // Subscribe to connection events from wallet adapter
            window.walletState.on('connect_watch', (data) => this.handleWalletConnected(data, 'watch'));
            window.walletState.on('upgrade_full', (data) => this.handleWalletUpgraded(data));
            window.walletState.on('disconnect', () => this.handleWalletDisconnected());
            
            this.subscribed = true;
            this.lastState = window.walletState.getState();
        } else if (!window.walletState) {
            // Wait for WalletState to become available
            setTimeout(() => this.subscribeToWalletState(), 100);
        }
    }

    subscribeToBannerController() {
        if (window.bannerController) {
            console.log('NotificationController: BannerController integration ready');
            // BannerController already listens to WalletState changes
            // We can access banner states through bannerController.getBannerStates()
        } else {
            // Wait for BannerController to become available
            setTimeout(() => this.subscribeToBannerController(), 100);
        }
    }

    handleWalletStateChange(state) {
        const { status, address, mode } = state;
        const lastState = this.lastState || {};
        
        // Detect connection events
        if (status === 'connected' && lastState.status !== 'connected' && address) {
            if (mode === 'watch') {
                this.handleWalletConnected({ publicKey: address }, 'watch');
            } else if (mode === 'full') {
                // Check if this is an upgrade or initial full connection
                if (lastState.mode === 'watch') {
                    this.handleWalletUpgraded({ publicKey: address });
                } else {
                    this.handleWalletConnected({ publicKey: address }, 'full');
                }
            }
        }
        
        // Detect disconnection events
        if (status === 'disconnected' && lastState.status === 'connected') {
            this.handleWalletDisconnected();
        }
        
        this.lastState = state;
    }

    handleWalletConnected(data, mode) {
        const message = mode === 'watch' 
            ? 'Wallet connected (watch mode)'
            : 'Wallet connected (full protection)';
        
        createNotificationWithIcon(
            message,
            'success',
            notificationIcons.walletConnected,
            6000 // 6 seconds for connection events
        );
        
        console.log('NotificationController: Wallet connected notification shown', { mode, address: data.publicKey });
    }

    handleWalletUpgraded(data) {
        createNotificationWithIcon(
            'Upgraded to Full Protection – auto swaps enabled',
            'upgrade',
            notificationIcons.walletUpgraded,
            8000 // 8 seconds for upgrade events (higher importance)
        );
        
        console.log('NotificationController: Wallet upgrade notification shown', { address: data.publicKey });
    }

    handleWalletDisconnected() {
        createNotificationWithIcon(
            'Wallet disconnected',
            'info',
            notificationIcons.walletDisconnected,
            4000 // 4 seconds for disconnection events
        );
        
        console.log('NotificationController: Wallet disconnection notification shown');
    }

    handleModeSwitched(data) {
        const { from, to } = data;
        
        if (from === 'watch' && to === 'full') {
            createNotificationWithIcon(
                'Upgraded to Full Protection – auto swaps enabled',
                'upgrade',
                notificationIcons.walletUpgraded,
                8000 // 8 seconds for mode switch events (high importance)
            );
        } else if (from === 'full' && to === 'watch') {
            createNotificationWithIcon(
                'Switched to Watch Mode – auto swaps disabled',
                'warning',
                notificationIcons.walletConnected,
                6000 // 6 seconds for downgrade events
            );
        }
        
        console.log('NotificationController: Mode switch notification shown', data);
    }
}

// Initialize notification controller
const notificationController = new NotificationController();

// Export for global use
window.showError = showError;
window.showSuccess = showSuccess;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showNotification = showNotification;
window.createNotificationWithIcon = createNotificationWithIcon;
window.notificationController = notificationController;
window.NotificationController = NotificationController;
