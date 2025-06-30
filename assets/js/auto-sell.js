// Auto-Sell Module - Handles opt-in workflow for automatic emergency swaps
// Use global walletAdapter from wallet-adapter.js

class AutoSell {
    constructor() {
        this.settings = this.loadSettings();
        this.modal = null;
    }

    // Load settings from localStorage
    loadSettings() {
        const stored = localStorage.getItem('panicswap_auto_sell');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse auto-sell settings:', e);
            }
        }
        return {
            enabled: false,
            mode: null, // 'hot-wallet' or 'delegate'
            walletAddress: null
        };
    }

    // Save settings to localStorage (never stores private keys)
    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('panicswap_auto_sell', JSON.stringify(this.settings));
    }

    // Initialize auto-sell module
    init() {
        // Set up event listeners for settings modal
        this.setupEventListeners();
        
        // Update UI based on current settings
        this.updateUI();
    }

    // Set up event listeners
    setupEventListeners() {
        // Toggle auto-sell
        document.addEventListener('click', (e) => {
            if (e.target.matches('#auto-sell-toggle')) {
                this.handleToggle(e.target.checked);
            }
        });

        // Mode selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('input[name="auto-sell-mode"]')) {
                this.handleModeChange(e.target.value);
            }
        });

        // Hot wallet setup
        document.addEventListener('click', (e) => {
            if (e.target.matches('#setup-hot-wallet-btn')) {
                this.showHotWalletSetup();
            }
        });

        // Delegate setup
        document.addEventListener('click', (e) => {
            if (e.target.matches('#setup-delegate-btn')) {
                this.setupDelegate();
            }
        });

        // Submit hot wallet key
        document.addEventListener('click', (e) => {
            if (e.target.matches('#submit-hot-wallet-btn')) {
                this.submitHotWallet();
            }
        });

        // Disable auto-sell
        document.addEventListener('click', (e) => {
            if (e.target.matches('#disable-auto-sell-btn')) {
                this.disableAutoSell();
            }
        });
    }

    // Handle auto-sell toggle
    handleToggle(enabled) {
        if (enabled && !this.settings.mode) {
            // Show mode selection
            document.getElementById('auto-sell-mode-selection').style.display = 'block';
            document.getElementById('auto-sell-status').style.display = 'none';
        } else if (!enabled) {
            this.disableAutoSell();
        }
    }

    // Handle mode change
    handleModeChange(mode) {
        const hotWalletSetup = document.getElementById('hot-wallet-setup');
        const delegateSetup = document.getElementById('delegate-setup');
        
        if (mode === 'hot-wallet') {
            hotWalletSetup.style.display = 'block';
            delegateSetup.style.display = 'none';
        } else if (mode === 'delegate') {
            hotWalletSetup.style.display = 'none';
            delegateSetup.style.display = 'block';
        }
    }

    // Show hot wallet setup form
    showHotWalletSetup() {
        const keyInput = document.getElementById('hot-wallet-key');
        const modal = document.getElementById('hot-wallet-warning-modal');
        
        // Show modal
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            
            // Focus on input after a brief delay
            setTimeout(() => {
                keyInput?.focus();
            }, 100);
        }
    }

    // Submit hot wallet to backend
    async submitHotWallet() {
        const keyInput = document.getElementById('hot-wallet-key');
        const privateKey = keyInput.value.trim();
        
        if (!privateKey) {
            this.showError('Please enter a private key');
            return;
        }

        // Validate private key format (base58, ~88 chars)
        if (privateKey.length < 80 || privateKey.length > 90) {
            this.showError('Invalid private key format');
            return;
        }

        try {
            // Generate CSRF token
            const csrfToken = this.generateCSRFToken();
            
            // Show loading state
            this.showLoading('Setting up hot wallet...');
            
            // Send to backend (key will be encrypted server-side)
            const response = await fetch('api/auto-sell/hot-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    private_key: privateKey,
                    wallet_address: this.getWalletAddress()
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to setup hot wallet');
            }

            // Clear the input immediately
            keyInput.value = '';
            
            // Update settings (never store the key locally)
            this.saveSettings({
                enabled: true,
                mode: 'hot-wallet',
                walletAddress: data.wallet_address
            });

            // Update UI
            this.updateUI();
            
            // Close modal
            this.closeModal('hot-wallet-warning-modal');
            
            this.showSuccess('Auto-sell enabled with hot wallet!');
            
        } catch (error) {
            console.error('Failed to setup hot wallet:', error);
            this.showError(error.message);
        }
    }

    // Setup delegate authority
    async setupDelegate() {
        try {
            const walletAddress = this.getWalletAddress();
            if (!walletAddress) {
                this.showError('Please connect your wallet first');
                return;
            }

            this.showLoading('Preparing delegate transaction...');
            
            // Get delegate setup transaction from backend
            const response = await fetch('api/auto-sell/delegate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: walletAdapter.publicKey
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to prepare delegate transaction');
            }

            // Sign and send the approval transaction
            const signature = await walletAdapter.signAndSendRawTransaction(data.serialized_tx);
            
            // Confirm with backend
            const confirmResponse = await fetch('api/auto-sell/delegate/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: walletAdapter.publicKey,
                    signature: signature
                })
            });

            if (!confirmResponse.ok) {
                throw new Error('Failed to confirm delegate setup');
            }

            // Update settings
            this.saveSettings({
                enabled: true,
                mode: 'delegate',
                walletAddress: walletAdapter.publicKey
            });

            this.updateUI();
            this.showSuccess('Auto-sell enabled with delegate authority!');
            
        } catch (error) {
            console.error('Failed to setup delegate:', error);
            this.showError(error.message);
        }
    }

    // Disable auto-sell
    async disableAutoSell() {
        try {
            if (this.settings.enabled) {
                // Notify backend to remove stored keys/delegate
                await fetch('api/auto-sell/disable', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wallet_address: this.settings.walletAddress
                    })
                });
            }

            // Clear settings
            this.saveSettings({
                enabled: false,
                mode: null,
                walletAddress: null
            });

            this.updateUI();
            this.showSuccess('Auto-sell disabled');
            
        } catch (error) {
            console.error('Failed to disable auto-sell:', error);
            this.showError(error.message);
        }
    }

    // Update UI based on current settings
    updateUI() {
        const toggle = document.getElementById('auto-sell-toggle');
        const modeSelection = document.getElementById('auto-sell-mode-selection');
        const status = document.getElementById('auto-sell-status');
        
        if (toggle) {
            toggle.checked = this.settings.enabled;
        }

        if (this.settings.enabled && this.settings.mode) {
            // Show status
            if (modeSelection) modeSelection.style.display = 'none';
            if (status) {
                status.style.display = 'block';
                status.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Auto-Sell Active</strong><br>
                        Mode: ${this.settings.mode === 'hot-wallet' ? 'Hot Wallet' : 'Delegate Authority'}<br>
                        <small class="text-muted">Emergency swaps will execute automatically</small>
                    </div>
                    <button id="disable-auto-sell-btn" class="btn btn-danger btn-sm mt-2">
                        Disable Auto-Sell
                    </button>
                `;
            }
        } else {
            // Show setup options
            if (status) status.style.display = 'none';
            if (modeSelection && toggle?.checked) {
                modeSelection.style.display = 'block';
            } else if (modeSelection) {
                modeSelection.style.display = 'none';
            }
        }
    }

    // Generate CSRF token
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Show loading state
    showLoading(message) {
        showNotification(message, 'info');
    }

    // Show success message
    showSuccess(message) {
        showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        showNotification(message, 'error');
    }

    // Close modal helper
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }
    
    // Get wallet address from WalletState or fallback
    getWalletAddress() {
        // Try WalletState first
        if (window.walletState) {
            const state = window.walletState.state;
            if (state.status === 'connected' && state.address) {
                return state.address;
            }
        }
        
        // Fallback to adapter
        if (window.walletAdapter && window.walletAdapter.connected) {
            return window.walletAdapter.publicKey;
        }
        
        // Final fallback to localStorage
        return localStorage.getItem('walletAddress');
    }

}

// Create singleton instance
const autoSell = new AutoSell();

// Make available globally
window.autoSell = autoSell;