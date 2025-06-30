document.addEventListener('DOMContentLoaded', () => {
    // Wait for WalletState to be available
    const initWalletButtonUI = () => {
        if (!window.walletState || !window.WalletState) {
            setTimeout(initWalletButtonUI, 100);
            return;
        }
        
        const walletButtonContainer = document.querySelector('#wallet-button-container');
        if (!walletButtonContainer) {
            console.warn('Wallet button container not found');
            return;
        }
        
        const connectButton = walletButtonContainer.querySelector('[data-wallet-element="connect-button"]');
        const connectedContainer = walletButtonContainer.querySelector('[data-wallet-element="connected-container"]');
        const modeBadge = walletButtonContainer.querySelector('[data-wallet-element="mode-badge"]');
        const modeText = walletButtonContainer.querySelector('[data-wallet-element="mode-text"]');
        const addressDisplay = walletButtonContainer.querySelector('[data-wallet-element="address-display"]');
        const balanceDisplay = walletButtonContainer.querySelector('[data-wallet-element="balance-display"]');
        const dropdown = walletButtonContainer.querySelector('[data-wallet-element="dropdown"]');
        const copyAddress = walletButtonContainer.querySelector('[data-wallet-element="copy-address"]');
        const viewExplorer = walletButtonContainer.querySelector('[data-wallet-element="view-explorer"]');
        const disconnectButton = walletButtonContainer.querySelector('[data-wallet-element="disconnect"]');
        
        let isDropdownOpen = false;

        const addressDisplayFull = walletButtonContainer.querySelector('[data-wallet-element="address-display-full"]');
        const balanceDisplayDropdown = walletButtonContainer.querySelector('[data-wallet-element="balance-display-dropdown"]');
        
        const updateUI = (state) => {
            // Update container data attributes
            walletButtonContainer.setAttribute('data-wallet-connected', state.connected);
            walletButtonContainer.setAttribute('data-wallet-address', state.address || '');
            
            if (state.connected && state.address) {
                // Show connected state, hide connect button
                connectButton.classList.add('hidden');
                connectedContainer.classList.remove('hidden');
                
                // Update address displays
                const shortAddress = state.address.slice(0, 4) + '...' + state.address.slice(-4);
                addressDisplay.textContent = shortAddress;
                if (addressDisplayFull) {
                    addressDisplayFull.textContent = state.address;
                }
                
                // Update balance displays
                const formattedBalance = state.balance ? state.balance.toFixed(4) + ' SOL' : '0.0000 SOL';
                balanceDisplay.textContent = formattedBalance;
                if (balanceDisplayDropdown) {
                    balanceDisplayDropdown.textContent = formattedBalance;
                }
            } else {
                // Show connect button, hide connected state
                connectButton.classList.remove('hidden');
                connectedContainer.classList.add('hidden');
                
                // Hide dropdown if open
                closeDropdown();
            }
        };
        
        const openDropdown = () => {
            isDropdownOpen = true;
            dropdown.classList.remove('hidden');
            // Force reflow
            dropdown.offsetHeight;
            dropdown.classList.add('opacity-100', 'translate-y-0');
        };
        
        const closeDropdown = () => {
            isDropdownOpen = false;
            dropdown.classList.remove('opacity-100', 'translate-y-0');
            setTimeout(() => {
                dropdown.classList.add('hidden');
            }, 200);
        };

        const handleStateChange = (newState) => {
            updateUI(newState);
        };

        // Listen to WalletState events
        window.walletState.on('connected', (data) => {
            updateUI({ connected: true, address: data.address, balance: 0 });
        });
        
        window.walletState.on('disconnected', () => {
            updateUI({ connected: false, address: null, balance: 0 });
        });
        
        window.walletState.on('balanceUpdated', (data) => {
            const state = window.walletState.getState();
            updateUI({ ...state, balance: data.balance });
        });
        
        // Initialize UI with current state
        updateUI(window.walletState.getState());
        
        // Try to restore connection if needed
        window.walletState.restoreConnection().then((address) => {
            if (address) {
                console.log('Wallet connection restored:', address);
                updateUI(window.walletState.getState());
            }
        });

        // Handle dropdown toggle - only listen on the button, not the entire container
        const connectedButton = connectedContainer.querySelector('[data-wallet-element="connected-button"]');
        if (connectedButton) {
            connectedButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isDropdownOpen) {
                    closeDropdown();
                } else {
                    openDropdown();
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (isDropdownOpen && !connectedContainer.contains(e.target)) {
                closeDropdown();
            }
        });

        // Copy address functionality
        if (copyAddress) {
            copyAddress.addEventListener('click', () => {
                const state = window.walletState.getState();
                if (state.address) {
                    navigator.clipboard.writeText(state.address);
                    const textEl = copyAddress.querySelector('span');
                    const originalText = textEl.textContent;
                    textEl.textContent = 'Copied!';
                    setTimeout(() => {
                        textEl.textContent = originalText;
                    }, 2000);
                }
            });
        }

        // View on explorer functionality
        if (viewExplorer) {
            viewExplorer.addEventListener('click', () => {
                const state = window.walletState.getState();
                if (state.address) {
                    window.open(`https://solscan.io/account/${state.address}`, '_blank');
                }
            });
        }

        // Disconnect functionality
        if (disconnectButton) {
            disconnectButton.addEventListener('click', async () => {
                closeDropdown();
                await window.walletState.disconnect();
                // Redirect to homepage after disconnect
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            });
        }
    };
    
    // Start initialization
    initWalletButtonUI();
});
