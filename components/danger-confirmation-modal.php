&lt;!-- Danger Confirmation Modal Component --&gt;
&lt;div id="danger-confirmation-modal" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-labelledby="danger-modal-title"&gt;
    &lt;!-- Backdrop with reused bg-black/80 and transition-opacity --&gt;
    &lt;div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="danger-modal-backdrop"&gt;&lt;/div&gt;
    
    &lt;!-- Modal --&gt;
    &lt;div class="relative z-10 flex items-center justify-center min-h-screen p-4"&gt;
        &lt;div class="danger-card max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in"&gt;
            &lt;!-- Header --&gt;
            &lt;div class="px-6 py-5 border-b border-red-800/30"&gt;
                &lt;div class="flex items-center justify-between"&gt;
                    &lt;div class="flex items-center space-x-3"&gt;
                        &lt;div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"&gt;
                            &lt;svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"&gt;
                                &lt;path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"&gt;&lt;/path&gt;
                            &lt;/svg&gt;
                        &lt;/div&gt;
                        &lt;div&gt;
                            &lt;h2 class="text-xl font-bold text-white" id="danger-modal-title"&gt;Confirm Action&lt;/h2&gt;
                            &lt;p class="text-sm text-gray-400 mt-1" id="danger-modal-subtitle"&gt;This action cannot be undone&lt;/p&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                    &lt;button id="close-danger-modal" class="text-gray-400 hover:text-white transition-colors"&gt;
                        &lt;svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"&gt;
                            &lt;path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"&gt;&lt;/path&gt;
                        &lt;/svg&gt;
                    &lt;/button&gt;
                &lt;/div&gt;
            &lt;/div&gt;
            
            &lt;!-- Content --&gt;
            &lt;div class="px-6 py-6"&gt;
                &lt;div class="mb-6"&gt;
                    &lt;p class="text-gray-300 mb-4" id="danger-modal-message"&gt;
                        Are you sure you want to proceed with this action?
                    &lt;/p&gt;
                    
                    &lt;!-- Warning Box --&gt;
                    &lt;div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4"&gt;
                        &lt;div class="flex items-start space-x-3"&gt;
                            &lt;svg class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"&gt;
                                &lt;path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"&gt;&lt;/path&gt;
                            &lt;/svg&gt;
                            &lt;div class="text-sm"&gt;
                                &lt;p class="text-red-300 font-medium mb-1"&gt;Warning&lt;/p&gt;
                                &lt;p class="text-red-200/80" id="danger-modal-warning"&gt;
                                    This action is permanent and cannot be reversed.
                                &lt;/p&gt;
                            &lt;/div&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                &lt;/div&gt;
                
                &lt;!-- Action Buttons --&gt;
                &lt;div class="flex space-x-3"&gt;
                    &lt;!-- Cancel Button using btn-secondary --&gt;
                    &lt;button id="danger-modal-cancel" class="btn btn-secondary flex-1"&gt;
                        Cancel
                    &lt;/button&gt;
                    
                    &lt;!-- Delete/Confirm Button with red gradient, hover darken, focus rings --&gt;
                    &lt;button id="danger-modal-confirm" class="btn btn-danger flex-1"&gt;
                        Delete
                    &lt;/button&gt;
                &lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
    &lt;/div&gt;
&lt;/div&gt;

&lt;script&gt;
// Danger Modal Functions
class DangerModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.lastActiveElement = null;
        this.keydownHandler = null;
        this.callbacks = {
            onConfirm: null,
            onCancel: null
        };
        
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('danger-confirmation-modal');
        if (!this.modal) return;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const cancelBtn = document.getElementById('danger-modal-cancel');
        const confirmBtn = document.getElementById('danger-modal-confirm');
        const closeBtn = document.getElementById('close-danger-modal');
        const backdrop = document.getElementById('danger-modal-backdrop');
        const modalContent = this.modal.querySelector('.danger-card');
        
        // Close modal events (cancel path)
        [cancelBtn, closeBtn].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.close());
            }
        });
        
        // Backdrop click to cancel
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                // Only close if clicked directly on backdrop, not on modal content
                if (e.target === backdrop) {
                    this.close();
                }
            });
        }
        
        // Stop propagation on modal content to avoid accidental cancel
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Confirm button event
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirm());
        }
    }
    
    show(options = {}) {
        if (!this.modal) return;
        
        // Store the currently focused element to return focus later
        this.lastActiveElement = document.activeElement;
        
        // Set modal content
        this.setContent(options);
        
        // Store callbacks
        this.callbacks.onConfirm = options.onConfirm || null;
        this.callbacks.onCancel = options.onCancel || null;
        
        // Set up keyboard event handler
        this.keydownHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            } else if (e.key === 'Enter') {
                // If focus is on the confirm button, trigger confirmation
                if (document.activeElement === document.getElementById('danger-modal-confirm')) {
                    e.preventDefault();
                    this.confirm();
                }
            }
        };
        
        // Add keyboard event listener
        document.addEventListener('keydown', this.keydownHandler);
        
        // Remove pointer-events-none from body to allow interaction
        document.body.style.pointerEvents = 'auto';
        
        // Show modal
        this.modal.classList.remove('hidden');
        this.isOpen = true;
        
        // Trigger scale-in animation
        const modalContent = this.modal.querySelector('.danger-card');
        if (modalContent) {
            modalContent.classList.add('animate-scale-in');
        }
        
        // Focus on Delete button for accessibility (as per requirements)
        setTimeout(() => {
            const deleteButton = document.getElementById('danger-modal-confirm');
            if (deleteButton) {
                deleteButton.focus();
            }
        }, 100);
    }
    
    close() {
        if (!this.modal || !this.isOpen) return;
        
        // Clean up keyboard event listener
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        const modalContent = this.modal.querySelector('.danger-card');
        if (modalContent) {
            // Remove scale-in and add scale-out
            modalContent.classList.remove('animate-scale-in');
            modalContent.classList.add('animate-scale-out');
            
            // Wait for animation to complete
            setTimeout(() => {
                this.modal.classList.add('hidden');
                modalContent.classList.remove('animate-scale-out');
                this.isOpen = false;
                
                // Return focus to the last active element
                if (this.lastActiveElement && this.lastActiveElement.focus) {
                    this.lastActiveElement.focus();
                }
                this.lastActiveElement = null;
                
                // Execute cancel callback
                if (this.callbacks.onCancel) {
                    this.callbacks.onCancel();
                }
            }, 300);
        } else {
            this.modal.classList.add('hidden');
            this.isOpen = false;
            
            // Return focus to the last active element
            if (this.lastActiveElement && this.lastActiveElement.focus) {
                this.lastActiveElement.focus();
            }
            this.lastActiveElement = null;
        }
    }
    
    confirm() {
        if (!this.isOpen) return;
        
        // Execute confirm callback
        if (this.callbacks.onConfirm) {
            this.callbacks.onConfirm();
        }
        
        this.close();
    }
    
    setContent(options) {
        // Set title
        const titleElement = document.getElementById('danger-modal-title');
        if (titleElement && options.title) {
            titleElement.textContent = options.title;
        }
        
        // Set subtitle
        const subtitleElement = document.getElementById('danger-modal-subtitle');
        if (subtitleElement && options.subtitle) {
            subtitleElement.textContent = options.subtitle;
        }
        
        // Set message
        const messageElement = document.getElementById('danger-modal-message');
        if (messageElement && options.message) {
            messageElement.textContent = options.message;
        }
        
        // Set warning
        const warningElement = document.getElementById('danger-modal-warning');
        if (warningElement && options.warning) {
            warningElement.textContent = options.warning;
        }
        
        // Set button text
        const confirmBtn = document.getElementById('danger-modal-confirm');
        if (confirmBtn && options.confirmText) {
            confirmBtn.textContent = options.confirmText;
        }
        
        const cancelBtn = document.getElementById('danger-modal-cancel');
        if (cancelBtn && options.cancelText) {
            cancelBtn.textContent = options.cancelText;
        }
    }
}

// Initialize danger modal when DOM is loaded
let dangerModal;
document.addEventListener('DOMContentLoaded', function() {
    dangerModal = new DangerModal();
});

// Global function to show danger modal
function showDangerConfirmation(options) {
    if (dangerModal) {
        dangerModal.show(options);
    }
}

// Example usage:
// showDangerConfirmation({
//     title: 'Delete Token',
//     subtitle: 'This action cannot be undone',
//     message: 'Are you sure you want to delete this token from your watchlist?',
//     warning: 'This will permanently remove the token and all associated data.',
//     confirmText: 'Delete',
//     cancelText: 'Cancel',
//     onConfirm: () =&gt; {
//         console.log('Token deleted');
//         // Your delete logic here
//     },
//     onCancel: () =&gt; {
//         console.log('Delete cancelled');
//     }
// });
&lt;/script&gt;
