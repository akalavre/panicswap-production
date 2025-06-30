/**
 * WalletStatusComponent - A reusable component for showing wallet status messages
 * Subscribes to WalletState events and shows inline status updates with spinners and messages
 */

class WalletStatusComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            autoHide: true,
            autoHideDelay: 5000,
            showSpinner: true,
            showSuccessRedirect: true,
            redirectDelay: 2000,
            onSuccess: null,
            onError: null,
            ...options
        };
        
        this.container = null;
        this.isVisible = false;
        
        // Bind methods
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleError = this.handleError.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        // Get or create container
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            this.container.className = 'wallet-status-component hidden mb-4';
            
            // Try to add to a common parent or body
            const targetParent = document.querySelector('.wallet-connect-modal, .main-content, body');
            if (targetParent) {
                targetParent.appendChild(this.container);
            }
        }
        
        // Initialize WalletState listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Wait for WalletState to be available
        const initListeners = () => {
            if (window.walletState) {
                window.walletState.on('change', this.handleStateChange);
                window.walletState.on('error', this.handleError);
            } else {
                setTimeout(initListeners, 100);
            }
        };
        
        initListeners();
    }
    
    handleStateChange(state) {
        switch (state.status) {
            case 'connecting':
                this.showConnectingState();
                break;
            case 'connected':
                this.showSuccessState(state);
                break;
            case 'error':
                this.showErrorState('Connection failed. Please try again.');
                break;
            case 'disconnected':
                this.hide();
                break;
            default:
                this.hide();
        }
    }
    
    handleError(error) {
        this.showErrorState(error.message || 'An unexpected error occurred');
        
        // Call custom error handler if provided
        if (this.options.onError) {
            this.options.onError(error);
        }
    }
    
    showConnectingState() {
        const spinnerHtml = this.options.showSpinner ? `
            <div class="flex-shrink-0">
                <svg class="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        ` : '';
        
        this.show(`
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
                ${spinnerHtml}
                <div>
                    <p class="text-blue-300 font-medium">Connecting wallet...</p>
                    <p class="text-blue-400 text-sm mt-1">Please confirm in your wallet extension</p>
                </div>
            </div>
        `);
    }
    
    showSuccessState(state) {
        const redirectMessage = this.options.showSuccessRedirect ? 
            `<p class="text-green-400 text-sm mt-1">Redirecting to dashboard...</p>` : '';
            
        this.show(`
            <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-green-300 font-medium">Wallet connected successfully!</p>
                    ${redirectMessage}
                </div>
            </div>
        `);
        
        // Auto-hide after success
        if (this.options.autoHide) {
            setTimeout(() => {
                this.hide();
            }, this.options.autoHideDelay);
        }
        
        // Call custom success handler if provided
        if (this.options.onSuccess) {
            setTimeout(() => {
                this.options.onSuccess(state);
            }, this.options.redirectDelay);
        }
    }
    
    showErrorState(message) {
        this.show(`
            <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0">
                        <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <p class="text-red-300 font-medium">Connection failed</p>
                        <p class="text-red-400 text-sm mt-1">${message}</p>
                    </div>
                </div>
            </div>
        `);
        
        // Auto-hide error after delay
        if (this.options.autoHide) {
            setTimeout(() => {
                this.hide();
            }, this.options.autoHideDelay);
        }
    }
    
    show(content) {
        if (this.container) {
            this.container.innerHTML = content;
            this.container.classList.remove('hidden');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            this.container.innerHTML = '';
            this.isVisible = false;
        }
    }
    
    // Manual show methods for custom use
    showCustom(content, type = 'info') {
        const typeClasses = {
            info: 'bg-blue-900/20 border-blue-500/30 text-blue-300',
            success: 'bg-green-900/20 border-green-500/30 text-green-300',
            error: 'bg-red-900/20 border-red-500/30 text-red-300',
            warning: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
        };
        
        const typeClass = typeClasses[type] || typeClasses.info;
        
        this.show(`
            <div class="${typeClass} border rounded-lg p-4">
                ${content}
            </div>
        `);
    }
    
    // Cleanup
    destroy() {
        if (window.walletState) {
            window.walletState.off('change', this.handleStateChange);
            window.walletState.off('error', this.handleError);
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Export for global use
window.WalletStatusComponent = WalletStatusComponent;

// Auto-initialize for common containers
document.addEventListener('DOMContentLoaded', () => {
    // Auto-create status component for wallet connect modal if it exists
    if (document.getElementById('wallet-connect-modal')) {
        window.walletConnectStatus = new WalletStatusComponent('wallet-connect-auto-status', {
            showSuccessRedirect: true,
            onSuccess: (state) => {
                // Auto-redirect to dashboard on success
                if (!window.location.pathname.includes('dashboard.php')) {
                    setTimeout(() => {
                        window.location.href = 'dashboard.php';
                    }, 500);
                }
            }
        });
    }
});
