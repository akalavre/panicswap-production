// Mode Switching Progress Indicator
// Shows a progress indicator overlay during wallet mode switching operations

class ModeSwitchingIndicator {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        
        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.updateProgress = this.updateProgress.bind(this);
        this.setMessage = this.setMessage.bind(this);
        
        // Initialize UI listeners
        this._initializeListeners();
    }
    
    // Show the progress indicator
    show(options = {}) {
        const {
            title = 'Switching Protection Mode',
            message = 'Please wait while we update your wallet...',
            from = '',
            to = ''
        } = options;
        
        if (this.isVisible) {
            return; // Already showing
        }
        
        this._createOverlay(title, message, from, to);
        this.isVisible = true;
        
        // Add to DOM
        document.body.appendChild(this.overlay);
        
        // Trigger animation
        setTimeout(() => {
            this.overlay.classList.add('opacity-100');
        }, 10);
    }
    
    // Hide the progress indicator
    hide() {
        if (!this.isVisible || !this.overlay) {
            return;
        }
        
        // Fade out
        this.overlay.classList.remove('opacity-100');
        this.overlay.classList.add('opacity-0');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.overlay = null;
            this.isVisible = false;
        }, 300);
    }
    
    // Update progress message
    setMessage(message) {
        if (!this.overlay) return;
        
        const messageElement = this.overlay.querySelector('.switching-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    // Update progress percentage (if needed)
    updateProgress(percent) {
        if (!this.overlay) return;
        
        const progressBar = this.overlay.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
    }
    
    // Create the overlay element
    _createOverlay(title, message, from, to) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center opacity-0 transition-opacity duration-300';
        
        // Mode switching direction indicator
        let directionIndicator = '';
        if (from && to) {
            directionIndicator = `
                <div class="flex items-center gap-3 mb-4">
                    <div class="flex items-center gap-2 text-sm">
                        <span class="px-2 py-1 rounded-full text-xs ${from === 'watch' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">${from === 'watch' ? 'Watch Mode' : 'Full Protection'}</span>
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                        </svg>
                        <span class="px-2 py-1 rounded-full text-xs ${to === 'watch' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">${to === 'watch' ? 'Watch Mode' : 'Full Protection'}</span>
                    </div>
                </div>
            `;
        }
        
        this.overlay.innerHTML = `
            <div class="bg-gray-900 rounded-2xl border border-gray-800 p-8 max-w-md w-full mx-4 text-center">
                <!-- Mode Direction Indicator -->
                ${directionIndicator}
                
                <!-- Loading Animation -->
                <div class="mb-6">
                    <div class="relative w-16 h-16 mx-auto mb-4">
                        <!-- Rotating Ring -->
                        <div class="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                        <div class="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                        
                        <!-- Center Icon -->
                        <div class="absolute inset-0 flex items-center justify-center">
                            <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <!-- Title -->
                <h3 class="text-xl font-semibold text-white mb-3">${title}</h3>
                
                <!-- Message -->
                <p class="text-gray-400 text-sm mb-6 switching-message">${message}</p>
                
                <!-- Progress Bar (optional) -->
                <div class="bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
                    <div class="progress-bar bg-gradient-to-r from-primary-500 to-primary-400 h-full transition-all duration-500 ease-out" style="width: 0%"></div>
                </div>
                
                <!-- Warning -->
                <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p class="text-xs text-yellow-400 flex items-center gap-2">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        Please do not close this tab or refresh the page
                    </p>
                </div>
            </div>
        `;
    }
    
    // Initialize wallet state listeners
    _initializeListeners() {
        // Wait for wallet state to be available
        const initListeners = () => {
            if (!window.walletState) {
                setTimeout(initListeners, 100);
                return;
            }
            
            // Listen for switching events
            window.walletState.on('switching', (data) => {
                this.show({
                    title: 'Switching Protection Mode',
                    message: `Switching from ${data.from} mode to ${data.to} mode...`,
                    from: data.from,
                    to: data.to
                });
                
                // Simulate progress updates
                this._simulateProgress();
            });
            
            // Listen for completion events
            window.walletState.on('modeSwitched', (data) => {
                this.setMessage(`Successfully switched to ${data.to} mode!`);
                this.updateProgress(100);
                
                // Hide after short delay
                setTimeout(() => {
                    this.hide();
                }, 1500);
            });
            
            // Listen for error events
            window.walletState.on('error', (error) => {
                if (this.isVisible) {
                    this.setMessage('Mode switching failed. Please try again.');
                    setTimeout(() => {
                        this.hide();
                    }, 2000);
                }
            });
        };
        
        initListeners();
    }
    
    // Simulate progress updates for better UX
    _simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5; // Increment by 5-20%
            
            if (progress >= 90) {
                progress = 90; // Stop at 90% until real completion
                clearInterval(interval);
            }
            
            this.updateProgress(progress);
        }, 200);
    }
}

// Create and export singleton instance
const modeSwitchingIndicator = new ModeSwitchingIndicator();

// Export for use
window.ModeSwitchingIndicator = ModeSwitchingIndicator;
window.modeSwitchingIndicator = modeSwitchingIndicator;

// Export as module if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = modeSwitchingIndicator;
}
