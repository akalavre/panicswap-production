// Solana Wallet Adapter for PanicSwap
class WalletAdapter {
    constructor() {
        this.provider = null;
        this.publicKey = null;
        this.connected = false;
        this.listeners = new Map();
        this.walletType = null; // 'browser' or 'hot'
        this.hotWalletData = null; // Store hot wallet info (not the key!)
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

    // Import hot wallet
    async importHotWallet(privateKey) {
        try {
            // Validate private key format
            if (!privateKey || privateKey.length < 80 || privateKey.length > 90) {
                throw new Error('Invalid private key format');
            }

            // Derive public key from private key
            let secretKey;
            try {
                // Check if bs58 is available globally
                if (typeof bs58 !== 'undefined') {
                    secretKey = bs58.decode(privateKey);
                } else {
                    // Fallback to manual base58 decode
                    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
                    const ALPHABET_MAP = {};
                    for (let i = 0; i < ALPHABET.length; i++) {
                        ALPHABET_MAP[ALPHABET.charAt(i)] = i;
                    }
                    
                    let bytes = [0];
                    for (let i = 0; i < privateKey.length; i++) {
                        const c = privateKey[i];
                        if (!(c in ALPHABET_MAP)) throw new Error('Invalid character in base58 string');
                        
                        let carry = ALPHABET_MAP[c];
                        for (let j = 0; j < bytes.length; j++) {
                            carry += bytes[j] * 58;
                            bytes[j] = carry & 0xff;
                            carry >>= 8;
                        }
                        
                        while (carry > 0) {
                            bytes.push(carry & 0xff);
                            carry >>= 8;
                        }
                    }
                    
                    // Add leading zeros
                    for (let i = 0; i < privateKey.length && privateKey[i] === '1'; i++) {
                        bytes.push(0);
                    }
                    
                    secretKey = new Uint8Array(bytes.reverse());
                }
            } catch (e) {
                throw new Error('Invalid private key format. Please provide a base58 encoded private key.');
            }
            
            const keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
            const publicKey = keypair.publicKey.toString();

            // Store wallet info in Supabase users table
            const response = await fetch('api/connect-wallet.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.generateCSRFToken()
                },
                body: JSON.stringify({
                    wallet_address: publicKey,
                    private_key: privateKey,
                    wallet_type: 'hot'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to store wallet');
            }

            // Also send to auto-sell endpoint if it exists
            try {
                await fetch('api/auto-sell/hot-wallet', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': this.generateCSRFToken()
                    },
                    body: JSON.stringify({
                        private_key: privateKey,
                        wallet_address: publicKey
                    })
                });
            } catch (e) {
                // Silent fail for auto-sell endpoint
                console.warn('Auto-sell endpoint not available:', e);
            }

            // Update wallet state
            this.publicKey = publicKey;
            this.connected = true;
            this.walletType = 'hot';
            this.hotWalletData = {
                address: publicKey,
                importedAt: new Date().toISOString()
            };

            // Save to localStorage (only public info, never the key!)
            localStorage.setItem('walletType', 'hot');
            localStorage.setItem('walletAddress', publicKey);
            localStorage.setItem('hotWalletData', JSON.stringify(this.hotWalletData));

            this.emit('connect', { publicKey: this.publicKey, walletType: 'hot' });

            // Initialize protection automatically for hot wallets
            if (window.protectionEvents) {
                await window.protectionEvents.init(publicKey);
            }

            return publicKey;
        } catch (error) {
            console.error('Hot wallet import failed:', error);
            throw error;
        }
    }

    // Generate CSRF token
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
            this.walletType = 'browser';
            
            // Store wallet info in Supabase users table (no private key for browser wallets)
            try {
                const response = await fetch('api/connect-wallet.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': this.generateCSRFToken()
                    },
                    body: JSON.stringify({
                        wallet_address: this.publicKey,
                        wallet_type: 'browser'
                    })
                });

                if (!response.ok) {
                    console.error('Failed to store wallet in database');
                }
            } catch (e) {
                console.error('Failed to store wallet:', e);
            }
            
            this.emit('connect', { publicKey: this.publicKey, walletType: 'browser' });
            
            // Save wallet type
            localStorage.setItem('walletType', 'browser');
            localStorage.setItem('walletAddress', this.publicKey);
            
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
        // If hot wallet, disable auto-sell first
        if (this.walletType === 'hot' && this.publicKey) {
            try {
                await fetch('api/auto-sell/disable', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wallet_address: this.publicKey
                    })
                });
            } catch (error) {
                console.error('Failed to disable auto-sell:', error);
            }
        }
        
        if (this.provider && this.provider.disconnect) {
            await this.provider.disconnect();
        }
        this.handleDisconnect();
    }

    handleDisconnect() {
        this.publicKey = null;
        this.provider = null;
        this.connected = false;
        this.walletType = null;
        this.hotWalletData = null;
        
        // Clear localStorage
        localStorage.removeItem('walletType');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('hotWalletData');
        
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

    // Sign and send raw transaction from base64 encoded string
    async signAndSendRawTransaction(base64Tx) {
        if (!this.connected || !this.provider) {
            throw new Error('Wallet not connected');
        }

        try {
            // Decode the base64 transaction
            const transactionBuffer = Uint8Array.from(atob(base64Tx), c => c.charCodeAt(0));
            const transaction = solanaWeb3.Transaction.from(transactionBuffer);
            
            // Sign and send the transaction
            const result = await this.signAndSendTransaction(transaction);
            
            // Return the signature
            return result.signature || result;
        } catch (error) {
            console.error('Raw transaction failed:', error);
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

    // Restore connection from localStorage
    async restoreConnection() {
        const walletType = localStorage.getItem('walletType');
        const walletAddress = localStorage.getItem('walletAddress');
        
        if (!walletType || !walletAddress) return null;
        
        if (walletType === 'hot') {
            // Restore hot wallet connection
            const hotWalletData = localStorage.getItem('hotWalletData');
            if (hotWalletData) {
                this.publicKey = walletAddress;
                this.connected = true;
                this.walletType = 'hot';
                this.hotWalletData = JSON.parse(hotWalletData);
                
                this.emit('connect', { publicKey: this.publicKey, walletType: 'hot' });
                
                // Initialize protection events
                if (window.protectionEvents) {
                    await window.protectionEvents.init(walletAddress);
                }
                
                return walletAddress;
            }
        } else if (walletType === 'browser') {
            // For browser wallets, user needs to reconnect manually
            // but we can show them as "previously connected"
            return null;
        }
        
        return null;
    }
}

// Create singleton instance
const walletAdapter = new WalletAdapter();

// Export for use
window.WalletAdapter = WalletAdapter;
window.walletAdapter = walletAdapter;