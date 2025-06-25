/**
 * Notification Utilities for Dashboard
 * Handles error, success, warning, and info notifications
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


// Notification history for de-duplication
const notificationHistory = new Map();
const NOTIFICATION_TIMEOUT = 60000; // 1 minute

// Enhanced showNotification with de-duplication
function showNotification(message, type = 'info') {
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
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Export for global use
window.showError = showError;
window.showSuccess = showSuccess;
window.showWarning = showWarning;
window.showNotification = showNotification;
