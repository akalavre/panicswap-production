/**
 * Shows a delete token confirmation modal
 * @param {Object} token - Token object with icon, symbol, name, etc.
 * @returns {Promise<boolean>} - Resolves true if user confirms delete, false if cancelled
 */
function showDeleteTokenModal(token) {
    return new Promise((resolve) => {
        const modal = document.getElementById('delete-token-modal');
        if (!modal) {
            console.error('Delete token modal not found');
            resolve(false);
            return;
        }

        // Inject token data into modal
        const tokenIcon = document.getElementById('delete-token-icon');
        const tokenIconPlaceholder = document.getElementById('delete-token-icon-placeholder');
        const tokenSymbol = document.getElementById('delete-token-symbol');
        const tokenName = document.getElementById('delete-token-name');

        // Set token icon
        if (token.icon || token.src) {
            tokenIcon.src = token.icon || token.src;
            tokenIcon.style.display = 'block';
            tokenIconPlaceholder.style.display = 'none';
        } else {
            tokenIcon.style.display = 'none';
            tokenIconPlaceholder.style.display = 'flex';
        }

        // Set token symbol and name
        if (tokenSymbol) {
            tokenSymbol.textContent = token.symbol || token.name || 'UNKNOWN';
        }
        if (tokenName) {
            tokenName.textContent = token.name || token.symbol || 'Unknown Token';
        }

        // Show modal by removing hidden class
        modal.classList.remove('hidden');

        // Trigger scale-in animation (similar to openWalletConnectModal)
        setTimeout(() => {
            const modalContent = modal.querySelector('.animate-scale-in');
            if (modalContent) {
                modalContent.classList.add('scale-100');
            }
        }, 10);

        // Variables to track if modal is resolved
        let isResolved = false;

        // Function to resolve and cleanup
        const resolveAndCleanup = (result) => {
            if (isResolved) return;
            isResolved = true;

            // Remove event listeners
            document.removeEventListener('keydown', handleKeydown);
            document.getElementById('delete-token-backdrop')?.removeEventListener('click', handleBackdropClick);

            // Run scale-out animation then hide modal
            const modalContent = modal.querySelector('.danger-card');
            if (modalContent) {
                modalContent.classList.remove('animate-scale-in');
                modalContent.classList.add('animate-scale-out');
                
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modalContent.classList.remove('animate-scale-out');
                    resolve(result);
                }, 300);
            } else {
                modal.classList.add('hidden');
                resolve(result);
            }
        };

        // ESC key handler (cancel)
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                resolveAndCleanup(false);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                resolveAndCleanup(true);
            }
        };

        // Backdrop click handler (cancel) - only close if clicked directly on backdrop
        const handleBackdropClick = (e) => {
            if (e.target.id === 'delete-token-backdrop') {
                resolveAndCleanup(false);
            }
        };
        
        // Stop propagation on modal content to avoid accidental cancel
        const modalContent = modal.querySelector('.danger-card');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Add event listeners
        document.addEventListener('keydown', handleKeydown);
        document.getElementById('delete-token-backdrop')?.addEventListener('click', handleBackdropClick);

        // Override button click handlers to use our Promise resolution
        const cancelButton = document.getElementById('delete-token-cancel');
        const confirmButton = document.getElementById('delete-token-confirm');

        if (cancelButton) {
            // Remove existing onclick and add new handler
            cancelButton.onclick = null;
            cancelButton.addEventListener('click', () => resolveAndCleanup(false));
        }

        if (confirmButton) {
            // Remove existing onclick and add new handler
            confirmButton.onclick = null;
            confirmButton.addEventListener('click', () => resolveAndCleanup(true));
        }

        // Override global close function temporarily
        const originalCloseFunction = window.closeDeleteTokenModal;
        window.closeDeleteTokenModal = () => resolveAndCleanup(false);

        // Restore original function after resolution
        Promise.resolve().then(() => {
            if (isResolved) {
                setTimeout(() => {
                    window.closeDeleteTokenModal = originalCloseFunction;
                }, 500);
            }
        });
    });
}

// Export function to global scope
window.showDeleteTokenModal = showDeleteTokenModal;
