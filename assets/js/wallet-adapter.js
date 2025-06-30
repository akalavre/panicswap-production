// Solana Wallet Adapter for PanicSwap
class WalletAdapter {
    constructor() {
        this.provider = null;
        this.publicKey = null;
        this.connected = false;
        this.listeners = new Map();
        this.protectionMode = null; // 'watch' or 'full'
        this.hotWalletData = null; // Store hot wallet info (not the key!)
    }

    // Supported wallets
    getSupportedWallets() {
        return {
            phantom: {
                name: 'Phantom',
                url: 'https://phantom.app/',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9IiM1MzRCQjEiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNC4wMjkxIDU4LjYyOTFDMjQuMDM5MSA3MS41NzMyIDMxLjkzNzQgODguMDYwOCA0NS44NzU2IDkzLjc3NzdDNTEuMjc0NCA5NS44ODkzIDU3LjQ0OTMgOTUuMjg4MyA2Mi42MDcgOTMuMTYzN0M2OS4wMjgxIDkwLjUyNjggNzMuNzg5NCA4NC42Njg0IDc3LjE3MjcgNzcuNTU2MUM3OS44NzY5IDcxLjc5MTkgODEuNTA2OCA2NS41NjAzIDgyLjAyODYgNTkuMTA0OEM4Mi4xNDUxIDU3LjYwNDcgODIuMTc1MSA1NC45MTAyIDgyLjE1NTkgNTQuNjUxOUM4Mi4wMTUxIDUyLjU5MjcgODEuODcwOCA1MC4wMjI5IDgxLjY0MDEgNDcuOTY2NUM4MC43MjE0IDM5LjQ0MDUgNzcuNzcyMSAzMS4xNjg5IDczLjIyMDcgMjQuMDI5MUM2OC43MzY0IDE3LjAwNzQgNjIuODEwOSAxMS4yMzk2IDU1Ljk1NTcgNy4xODg1NUM1MC41OTYxIDQuMDM4NDkgNDQuNjE3NCAyLjA3MjgzIDM4LjU5MDggMi4wMDQ3NkMzNy4yMTA5IDEuOTg5NDcgMzUuODI4MiAyLjAwNDc2IDM0LjQ0ODggMi4wNDk5N0MzMi41MDY0IDIuMTEzNTMgMzAuMTAzNyAyLjU5NTc1IDI4LjEwODkgMy41MzA0N0MyNS4xMjY1IDQuOTI3NDMgMjIuOTM5OCA3LjQ0NDExIDIxLjcxNjMgMTAuNzAyNEMyMC44MzkzIDEzLjA0ODQgMjAuNDI1IDE1LjYzNjkgMjAuNDkxOCAxOC4yMjc4QzIwLjU0OTggMjAuNDg0NiAyMC45MDQ5IDIyLjc0MDggMjEuNTQ0OSAyNC45MTdDMjIuMjI1NSAyNy4yMTc5IDIzLjIxOTMgMjkuNDAxOSAyNC40ODY5IDMxLjQwMDJDMjYuNzQ5OCAzNS4wODk2IDI5LjU5NTUgMzYuNjE1MSAzMi42MzA4IDM2LjY1MjZDMzQuNzI4OSAzNi42NzkxIDM2LjgxNzIgMzYuMTA1NiAzOC42MjQgMzUuMDA3NkM0MC44MDE5IDMzLjY2MzQgNDIuNDY1MSAzMS41Njk5IDQzLjMzNzcgMjkuMDk2MkM0My43Mzg4IDI4LjAwMzQgNDMuOTk5MSAyNi44NTgzIDQ0LjExMDcgMjUuNjkyNkM0NC4yMTY0IDI0LjU5MDggNDQuMDg5MSAyMy40NzY5IDQzLjczNjQgMjIuNDI2NUM0My4yNjEgMjEuMDA5OCA0Mi40MDM4IDIwLjE1MTcgNDEuMTE2NCAxOS40MDgxQzM5LjUzNzUgMTguNDk3NSAzNy43MzcyIDE4LjEyNDQgMzUuOTM4IDE4LjMzNDRDMzQuNDk2NyAxOC41MDQ1IDMzLjM1OTMgMTkuMzMxNiAzMi41NzI0IDIwLjMzNjFDMzEuODcyMiAyMS4yMjg5IDMxLjQyMjQgMjIuMjkwNSAzMS4yNjQ0IDIzLjQxOTNDMzEuMDk2NiAyNC42MjMxIDMxLjI0NDMgMjUuODU0OCAzMS42OTYxIDI2Ljk4MjJDMzIuNTc4MiAyOS4xNTc4IDM0LjQ4ODcgMzAuODE2NCAzNi43MjA2IDMxLjM3NzZDMzcuODM3MiAzMS42NTg0IDM5LjAwNTEgMzEuNzE1NiA0MC4xNjEzIDMxLjU0NkM0MS4zNTc1IDMxLjM3MDkgNDIuNTI2MiAzMC45NTMyIDQzLjU5MDYgMzAuMzE5NUM0NS42MzM3IDI5LjA5MjkgNDcuMjkxMSAyNy4yMjcgNDguMzI2NyAyNS4wMTYzQzQ5LjAzMDEgMjMuNDg4NCA0OS40NDgzIDIxLjgyOTcgNDkuNTU1OSAyMC4xMzU0QzQ5LjcxNjMgMTcuNTQxNSA0OS4wMzI0IDE1LjA4IDQ3LjQ1MjUgMTIuODM4N0M0NS42Mjc2IDEwLjI2MSA0Mi43MjE2IDguMzY3NTQgMzkuNTM0IDcuNTUzNTNDMzcuMDk0NyA2LjkyMTk1IDM0LjUyNDUgNi44MjQxMSAzMi4wMzg2IDcuMjY2OTVDMjkuMzkzNSA3LjczODQgMjYuOTAxNyA4LjgyODMzIDI0Ljc2NDYgMTAuNDMyOUMyMi4yNDI0IDEyLjMwODkgMjAuMjQ3NSAxNC43ODQ0IDE4LjkzNTggMTcuNjY1NUMxNy41NjI3IDIwLjY5NDMgMTYuOTEzMiAyNC4wMjkxIDE3LjA0ODEgMjcuNDEyN0MxNy4xODUzIDMwLjg1MDQgMTguMTA4OCAzNC4yMjE1IDE5LjczNTMgMzcuMjE4MkMyMS42MjAzIDQwLjY5MDQgMjQuMjE0MSA0My41MDM1IDI3LjMyNzMgNDUuNDQ0OEMyOC42NTgyIDQ2LjI3OTUgMzAuMDczMSA0Ni45MDY4IDMxLjU0MzcgNDcuMzA3MkMzMi40Njg1IDQ3LjU1MjQgMzMuNDEwNyA0Ny43MjE1IDM0LjM2MDQgNDcuODEyNkMzNC40NDk2IDQ3LjgyMjMgMzQuNjI5MSA0Ny44NDMyIDM0LjYyOTEgNDcuODcxNVY1NS4yMjc0QzM0LjYyOTEgNTUuMjI3OSAzNC42MjkxIDU1LjIyODQgMzQuNjI5MSA1NS4yMjg5QzM0LjYyOTEgNTYuMTUzMyAzNC42MjkxIDU3LjA3NzcgMzQuNjI5MSA1OC4wMDIxQzM0LjYyOTEgNTguMTEzNCAzNC41Mzk2IDU4LjIyNDYgMzQuNDI0MiA1OC4yMjQ2QzMzLjc3MTcgNTguMjI0NiAzMy4xMTkyIDU4LjIyNDYgMzIuNDY2NyA1OC4yMjQ2QzMyLjM1NjYgNTguMjI0NiAzMi4yNDU0IDU4LjEzNTEgMzIuMjQ1NCA1OC4wMTk3VjQ4LjM2MjVDMzIuMjQ1NCA0OC4yNDY5IDMyLjE1NTggNDguMTU3NCAzMi4wNDAyIDQ4LjE1NzRDMzEuMzI0OCA0OC4xNTc0IDMwLjYwOTMgNDguMTU3NCAyOS44OTM5IDQ4LjE1NzRDMjkuNzc4MyA0OC4xNTc0IDI5LjY4ODcgNDguMjQ2OSAyOS42ODg3IDQ4LjM2MjVWNTguMDAyMUMyOS42ODg3IDU4LjExNzcgMjkuNTk5MiA1OC4yMDczIDI5LjQ4MzYgNTguMjA3M0MyOC44MzEgNTguMjA3MyAyOC4xNzg1IDU4LjIwNzMgMjcuNTI2IDU4LjIwNzNDMjcuNDEwNCA1OC4yMDczIDI3LjMyMDggNTguMTE3NyAyNy4zMjA4IDU4LjAwMjFWNDcuNjQ0N0MyNy4zMjA4IDQ3LjQ1NDggMjcuMjY3IDQ3LjQxNjkgMjcuMDg2OCA0Ny4zNzc1QzI2LjIyMzMgNDcuMTkyIDI1LjM4MzEgNDYuODkxNyAyNC41OTE5IDQ2LjQ4NDlDMjQuMDI3NCA0Ni4xOTI4IDI0LjAyNDkgNDUuOTg5OSAyNC4wMjQ5IDQ1LjM3NDFWNDUuMDQ0MUMyNC4wMjQ5IDQ1LjA0MzMgMjQuMDI0OSA1NS4yNTYxIDI0LjAyOTEgNTguNjI5MVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
                adapter: window.solana || window.phantom?.solana
            },
            solflare: {
                name: 'Solflare',
                url: 'https://solflare.com/',
                icon: 'https://raw.githubusercontent.com/solflare-wallet/solflare-snap/master/logo.svg',
                adapter: window.solflare
            },
            backpack: {
                name: 'Backpack',
                url: 'https://backpack.app/',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iI0U5M0EzQSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE5Ljk5OTggNEMxOC4wMTA4IDQgMTYuMTAzMiA0Ljc5MDg2IDE0LjY5NjMgNi4xOTc3MkMxMy4yODk1IDcuNjA0NTggMTIuNDk4NiA5LjUxMjI1IDEyLjQ5ODYgMTEuNTAxMlYyNS41MDEyQzEyLjQ5ODYgMjcuNDkwMSAxMy4yODk1IDI5LjM5NzggMTQuNjk2MyAzMC44MDQ3QzE2LjEwMzIgMzIuMjExNSAxOC4wMTA4IDMzLjAwMjQgMTkuOTk5OCAzMy4wMDI0QzIxLjk4ODcgMzMuMDAyNCAyMy44OTY0IDMyLjIxMTUgMjUuMzAzMiAzMC44MDQ3QzI2LjcxMDEgMjkuMzk3OCAyNy41MDA5IDI3LjQ5MDEgMjcuNTAwOSAyNS41MDEyVjExLjUwMTJDMjcuNTAwOSA5LjUxMjI1IDI2LjcxMDEgNy42MDQ1OCAyNS4zMDMyIDYuMTk3NzJDMjMuODk2NCA0Ljc5MDg2IDIxLjk4ODcgNCAxOS45OTk4IDRaTTI1LjAwMDYgMTEuNTAxMlYxOC4wMDEySDIyLjUwMDRWMTYuNTAxQzIyLjUwMDQgMTUuNjczIDIxLjgyODQgMTUuMDAxIDIxLjAwMDMgMTUuMDAxQzIwLjE3MjMgMTUuMDAxIDE5LjUwMDMgMTUuNjczIDE5LjUwMDMgMTYuNTAxVjE4LjAwMTJIMTcuNTAwMVYxNi41MDFDMTcuNTAwMSAxNS42NzMgMTYuODI4MSAxNS4wMDEgMTYuMDAwMSAxNS4wMDFDMTUuMTcyIDE1LjAwMSAxNC41IDE1LjY3MyAxNC41IDE2LjUwMVYyMS4wMDEyQzE0LjUgMjMuMjEwNCAxNi4yOTA5IDI1LjAwMTMgMTguNTAwMSAyNS4wMDEzSDIxLjUwMDNDMjMuNzA5NSAyNS4wMDEzIDI1LjUwMDMgMjMuMjEwNCAyNS41MDAzIDIxLjAwMTJDMjUuNTAwMyAyMC44NjQ5IDI1LjQ5MDYgMjAuNzMxMSAyNS40NzIgMjAuNjAwMUMyNS4zODI0IDIwLjI2NzcgMjUuMTk0IDE5Ljk2NjQgMjQuOTM0IDE5LjczMzVDMjQuODkyOSAxOS42OTY0IDI0Ljg0OSAxOS42NjIzIDI0LjgwMjcgMTkuNjMxMUMyNC43MDczIDE5LjU2NjQgMjQuNjAyMiAxOS41MTQgMjQuNDg5NCAxOS40NzY1QzI0LjU1MzkgMTkuMzA5MyAyNC42MjEgMTkuMTQyOSAyNC42OTExIDE4Ljk3NzZDMjQuODg1NyAxOC41MjQ1IDI1LjAwMDYgMTguMDI0NCAyNS4wMDA2IDE3LjUwMTJWMTEuNTAxMloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
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

    // Upgrade to full protection
    async upgradeToFullProtection(privateKey) {
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
                    mode: 'full'
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
            this.protectionMode = 'full';
            this.hotWalletData = {
                address: publicKey,
                importedAt: new Date().toISOString()
            };

            // Save to localStorage (only public info, never the key!)
            // Note: localStorage sync is now handled by WalletState
            localStorage.setItem('protectionMode', 'full');
            localStorage.setItem('walletAddress', publicKey);
            localStorage.setItem('hotWalletData', JSON.stringify(this.hotWalletData));

            this.emit('upgrade_full', { publicKey: this.publicKey, protectionMode: 'full' });

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

    // Connect to wallet in watch mode
    async connectWatchMode(walletKey = null) {
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
this.protectionMode = 'watch';
            
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
                        mode: 'watch'
                    })
                });

                if (!response.ok) {
                    console.error('Failed to store wallet in database');
                }
            } catch (e) {
                console.error('Failed to store wallet:', e);
            }
            
this.emit('connect_watch', { publicKey: this.publicKey, protectionMode: 'watch' });
            
            // Save wallet type and which wallet was used
            // Note: localStorage sync is now handled by WalletState
            localStorage.setItem('protectionMode', 'watch');
            localStorage.setItem('walletAddress', this.publicKey);
            localStorage.setItem('lastConnectedWallet', walletKey || 'phantom');
            
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
        // If full protection wallet, disable auto-sell first
        if (this.protectionMode === 'full' && this.publicKey) {
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
        this.protectionMode = null;
        this.hotWalletData = null;
        
        // Note: localStorage clearing is now handled by WalletState
        // Only clear adapter-specific data here
        localStorage.removeItem('lastConnectedWallet');
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
        // Migration script: Update old walletType 'hot' to protectionMode 'full'
        const walletType = localStorage.getItem('walletType');
        if (walletType === 'hot') {
            localStorage.setItem('protectionMode', 'full');
            localStorage.removeItem('walletType');
        }
        
        const protectionMode = localStorage.getItem('protectionMode');
        const walletAddress = localStorage.getItem('walletAddress');
        const lastConnectedWallet = localStorage.getItem('lastConnectedWallet');
        
        if (!walletAddress) return null;
        
        if (protectionMode === 'full') {
            // Restore full protection wallet connection
            const hotWalletData = localStorage.getItem('hotWalletData');
            if (hotWalletData) {
                this.publicKey = walletAddress;
                this.connected = true;
                this.protectionMode = 'full';
                this.hotWalletData = JSON.parse(hotWalletData);
                
                this.emit('upgrade_full', { publicKey: this.publicKey, protectionMode: 'full' });
                
                // Initialize protection events
                if (window.protectionEvents) {
                    await window.protectionEvents.init(walletAddress);
                }
                
                return walletAddress;
            }
        } else if (protectionMode === 'watch' || !protectionMode) {
            // Try to reconnect watch mode wallets automatically
            try {
                // Detect which wallet was previously connected
                const walletKey = lastConnectedWallet || null;
                const detected = await this.detectWallet();
                
                if (detected) {
                    // Check if the wallet is still available and has permission
                    const adapter = detected.adapter;
                    
                    // For Phantom
                    if (adapter.isPhantom && adapter.isConnected) {
                        this.publicKey = adapter.publicKey.toString();
                        this.provider = adapter;
                        this.connected = true;
                        this.protectionMode = 'watch';
                        
                        // Verify the address matches what we had before
                        if (this.publicKey === walletAddress) {
                            this.emit('connect_watch', { publicKey: this.publicKey, protectionMode: 'watch' });
                            console.log('Wallet connection restored automatically');
                            return walletAddress;
                        }
                    }
                    // For other wallets that support silent connection
                    else if (adapter.publicKey && adapter.isConnected !== false) {
                        try {
                            const publicKey = adapter.publicKey.toString();
                            if (publicKey === walletAddress) {
                                this.publicKey = publicKey;
                                this.provider = adapter;
                                this.connected = true;
                                this.protectionMode = 'watch';
                                
                                this.emit('connect_watch', { publicKey: this.publicKey, protectionMode: 'watch' });
                                console.log('Wallet connection restored automatically');
                                return walletAddress;
                            }
                        } catch (e) {
                            // Silent fail for auto-restore attempts
                            console.log('Could not auto-restore wallet connection, user will need to reconnect');
                        }
                    }
                }
            } catch (error) {
                console.log('Could not auto-restore wallet connection:', error.message);
            }
            
            // If auto-restore failed, indicate the wallet was previously connected
            // but don't mark as connected until user manually reconnects
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