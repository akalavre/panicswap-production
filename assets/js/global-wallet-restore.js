// Global wallet restoration script
// This ensures wallet connection persists across all pages

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Global wallet restore: Starting...');
    
    // Wait for WalletState to be available
    const waitForWalletState = () => {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.walletState && !window.walletState._isPlaceholder) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    };
    
    await waitForWalletState();
    
    if (!window.walletState) {
        console.error('Global wallet restore: WalletState not available');
        return;
    }
    
    // Check if we have a saved wallet connection
    const savedAddress = localStorage.getItem('walletAddress');
    const lastWallet = localStorage.getItem('lastConnectedWallet');
    
    if (savedAddress && lastWallet) {
        console.log('Global wallet restore: Found saved wallet:', savedAddress);
        
        // Try to restore the connection
        try {
            const restoredAddress = await window.walletState.restoreConnection();
            if (restoredAddress) {
                console.log('Global wallet restore: Successfully restored connection');
                
                // Update balance
                await window.walletState.updateBalance();
            } else {
                console.log('Global wallet restore: Could not restore connection, wallet may be locked');
            }
        } catch (error) {
            console.error('Global wallet restore: Error restoring connection:', error);
        }
    } else {
        console.log('Global wallet restore: No saved wallet connection found');
    }
});