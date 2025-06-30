// WalletState - Simple wallet state management
// Simplified version - just connect/disconnect, no modes

class WalletState {
    constructor() {
        // Simple state object
        this._state = {
            connected: false,
            address: null,
            balance: 0
        };

        // Event listeners
        this._listeners = new Map();

        // Bind methods to preserve context
        this.getState = this.getState.bind(this);
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.updateBalance = this.updateBalance.bind(this);

        // Load initial state from localStorage
        this._loadFromStorage();
        
        // Initialize wallet adapter listeners
        this._initializeAdapterListeners();
        
        // Auto-restore connection if wallet was previously connected
        if (this._state.connected && this._state.address) {
            this.restoreConnection().then(() => {
                console.log('Wallet connection restored');
            }).catch(err => {
                console.error('Failed to restore wallet connection:', err);
            });
        }
    }

    // Public API: Get current state (read-only)
    get state() {
        return { ...this._state };
    }

    // Public API: Get current state (alias method)
    getState() {
        return this.state;
    }

    // Public API: Check if wallet is connected
    get isConnected() {
        return this._state.connected;
    }

    // Public API: Add event listener
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
    }

    // Public API: Remove event listener
    off(event, callback) {
        if (!this._listeners.has(event)) return;
        const callbacks = this._listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    // Public API: Connect wallet
    async connect(walletKey) {
        try {
            this._emit('connecting', { walletKey });
            
            const adapter = this._getWalletAdapter(walletKey);
            if (!adapter) {
                throw new Error(`${walletKey} wallet not found. Please install it first.`);
            }

            // Connect to the wallet
            await adapter.connect();
            
            if (!adapter.publicKey) {
                throw new Error('Failed to get wallet public key');
            }

            const address = adapter.publicKey.toString();
            
            this._updateState({
                connected: true,
                address: address
            });
            
            // Save the wallet type for reconnection
            localStorage.setItem('lastConnectedWallet', walletKey);

            // Fetch initial balance
            await this.updateBalance();

            this._emit('connected', { address });
            return address;
        } catch (error) {
            this._updateState({ connected: false, address: null });
            this._emit('error', error);
            throw error;
        }
    }

    // Public API: Disconnect wallet
    async disconnect() {
        try {
            // Find and disconnect the active wallet adapter
            const wallets = this._getSupportedWallets();
            for (const [key, wallet] of Object.entries(wallets)) {
                if (wallet.adapter && wallet.adapter.connected) {
                    await wallet.adapter.disconnect();
                }
            }
            
            this._updateState({
                connected: false,
                address: null,
                balance: 0
            });
            
            // Clear minimal localStorage
            localStorage.removeItem('walletAddress');
            localStorage.removeItem('lastConnectedWallet');
            
            this._emit('disconnected');
        } catch (error) {
            this._emit('error', error);
            throw error;
        }
    }

    // Public API: Update wallet balance
    async updateBalance() {
        if (!this._state.address) return;
        
        try {
            const response = await fetch(`api/get-balance.php?wallet=${encodeURIComponent(this._state.address)}`);
            const data = await response.json();
            
            if (data.success) {
                this._updateState({ balance: data.balance });
                this._emit('balanceUpdated', { balance: data.balance });
            }
        } catch (error) {
            console.error('Failed to update balance:', error);
        }
    }

    // Public API: Restore connection from localStorage
    async restoreConnection() {
        try {
            const savedAddress = localStorage.getItem('walletAddress');
            const lastWallet = localStorage.getItem('lastConnectedWallet');
            
            if (savedAddress && lastWallet) {
                // Try to reconnect to the last wallet
                const adapter = this._getWalletAdapter(lastWallet);
                if (adapter && adapter.connected && adapter.publicKey?.toString() === savedAddress) {
                    this._updateState({
                        connected: true,
                        address: savedAddress
                    });
                    
                    await this.updateBalance();
                    return savedAddress;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to restore connection:', error);
            return null;
        }
    }

    // Private: Update state and emit changes
    _updateState(updates) {
        const oldState = { ...this._state };
        
        // Apply updates
        Object.assign(this._state, updates);
        
        // Save to localStorage
        this._saveToStorage();
        
        // Emit change event if state actually changed
        if (JSON.stringify(oldState) !== JSON.stringify(this._state)) {
            this._emit('change', this._state);
        }
    }

    // Private: Emit event to all listeners
    _emit(event, data) {
        if (!this._listeners.has(event)) return;
        this._listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }

    // Private: Load state from localStorage
    _loadFromStorage() {
        try {
            const walletAddress = localStorage.getItem('walletAddress');
            
            if (walletAddress) {
                this._state = {
                    connected: true,
                    address: walletAddress,
                    balance: 0
                };
            }
        } catch (error) {
            console.error('Failed to load wallet state from storage:', error);
        }
    }

    // Private: Save state to localStorage
    _saveToStorage() {
        try {
            if (this._state.address) {
                localStorage.setItem('walletAddress', this._state.address);
            } else {
                localStorage.removeItem('walletAddress');
            }
        } catch (error) {
            console.error('Failed to save wallet state to storage:', error);
        }
    }

    // Private: Get supported wallets
    _getSupportedWallets() {
        return {
            phantom: {
                name: 'Phantom',
                adapter: window.solana || window.phantom?.solana
            },
            solflare: {
                name: 'Solflare',
                adapter: window.solflare
            },
            backpack: {
                name: 'Backpack',
                adapter: window.backpack
            }
        };
    }

    // Private: Get wallet adapter by key
    _getWalletAdapter(walletKey) {
        const wallets = this._getSupportedWallets();
        return wallets[walletKey]?.adapter;
    }

    // Private: Initialize wallet adapter event listeners
    _initializeAdapterListeners() {
        // Listen to wallet events on window
        if (window.solana || window.phantom?.solana) {
            const adapter = window.solana || window.phantom?.solana;
            adapter.on('connect', () => {
                if (adapter.publicKey) {
                    this._updateState({
                        connected: true,
                        address: adapter.publicKey.toString()
                    });
                    this.updateBalance();
                }
            });
            
            adapter.on('disconnect', () => {
                this._updateState({
                    connected: false,
                    address: null,
                    balance: 0
                });
            });
        }
    }

    // For backward compatibility - these methods do nothing now
    async connectWatch(address) {
        // Just use regular connect
        return this.connect('phantom');
    }
    
    async connectBrowser(walletKey) {
        return this.connect(walletKey);
    }
    
    async upgradeFull() {
        // No modes anymore
        return this._state.address;
    }
    
    async switchToFull() {
        // No modes anymore
        return { success: true };
    }
    
    async switchToWatch() {
        // No modes anymore
        return { success: true };
    }
}

// Create and export singleton instance
const walletState = new WalletState();

// Export for use
window.WalletState = WalletState;
window.walletState = walletState;

// Export as module if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = walletState;
}
