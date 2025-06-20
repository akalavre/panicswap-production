// Solana Wallet Adapter for PanicSwap
class WalletAdapter {
    constructor() {
        this.provider = null;
        this.publicKey = null;
        this.connected = false;
        this.listeners = new Map();
    }

    // Supported wallets
    getSupportedWallets() {
        return {
            phantom: {
                name: 'Phantom',
                url: 'https://phantom.app/',
                icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg',
                adapter: window.solana || window.phantom?.solana
            },
            solflare: {
                name: 'Solflare',
                url: 'https://solflare.com/',
                icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg',
                adapter: window.solflare
            },
            backpack: {
                name: 'Backpack',
                url: 'https://backpack.app/',
                icon: 'https://raw.githubusercontent.com/coral-xyz/backpack/master/assets/backpack.svg',
                adapter: window.backpack
            }
        };
    }

    // Check if any wallet is installed
    async detectWallet() {
        const wallets = this.getSupportedWallets();
        
        for (const [key, wallet] of Object.entries(wallets)) {
            if (wallet.adapter) {
                return { key, ...wallet };
            }
        }
        
        return null;
    }

    // Connect to wallet
    async connect(walletKey = null) {
        try {
            let adapter;
            
            if (walletKey) {
                const wallets = this.getSupportedWallets();
                adapter = wallets[walletKey]?.adapter;
            } else {
                // Auto-detect wallet
                const detected = await this.detectWallet();
                if (!detected) {
                    throw new Error('No Solana wallet found. Please install Phantom, Solflare, or Backpack.');
                }
                adapter = detected.adapter;
            }

            if (!adapter) {
                throw new Error('Wallet not found or not installed');
            }

            // For Phantom
            if (adapter.isPhantom) {
                const resp = await adapter.connect();
                this.publicKey = resp.publicKey.toString();
                this.provider = adapter;
            }
            // For Solflare
            else if (adapter.isSolflare) {
                await adapter.connect();
                this.publicKey = adapter.publicKey.toString();
                this.provider = adapter;
            }
            // For Backpack
            else if (adapter.isBackpack) {
                const resp = await adapter.connect();
                this.publicKey = resp.publicKey.toString();
                this.provider = adapter;
            }
            // Generic adapter
            else {
                const resp = await adapter.connect();
                this.publicKey = resp.publicKey?.toString() || adapter.publicKey?.toString();
                this.provider = adapter;
            }

            this.connected = true;
            this.emit('connect', { publicKey: this.publicKey });
            
            // Set up disconnect listener
            if (this.provider.on) {
                this.provider.on('disconnect', () => this.handleDisconnect());
            }

            return this.publicKey;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    // Disconnect wallet
    async disconnect() {
        if (this.provider && this.provider.disconnect) {
            await this.provider.disconnect();
        }
        this.handleDisconnect();
    }

    handleDisconnect() {
        this.publicKey = null;
        this.provider = null;
        this.connected = false;
        this.emit('disconnect');
    }

    // Sign and send transaction
    async signAndSendTransaction(transaction) {
        if (!this.connected || !this.provider) {
            throw new Error('Wallet not connected');
        }

        try {
            // For different wallet adapters
            if (this.provider.signAndSendTransaction) {
                return await this.provider.signAndSendTransaction(transaction);
            } else if (this.provider.signTransaction && this.provider.sendTransaction) {
                const signed = await this.provider.signTransaction(transaction);
                return await this.provider.sendTransaction(signed);
            } else {
                throw new Error('Wallet does not support transaction signing');
            }
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    // Get wallet balance
    async getBalance(connection) {
        if (!this.publicKey) return 0;
        
        try {
            const pubKey = new solanaWeb3.PublicKey(this.publicKey);
            const balance = await connection.getBalance(pubKey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Failed to get balance:', error);
            return 0;
        }
    }

    // Event handling
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }
}

// Export for use
window.WalletAdapter = WalletAdapter;