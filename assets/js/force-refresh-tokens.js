// Force refresh token data in dashboard
async function forceRefreshTokens() {
    console.log('Force refreshing token data...');
    
    // Clear any cached data
    if (window.tokenListV3State) {
        window.tokenListV3State.tokens = [];
    }
    
    // Clear localStorage caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('token') || key.includes('cache')) {
            localStorage.removeItem(key);
            console.log('Cleared cache:', key);
        }
    });
    
    // Reload tokens
    if (typeof loadTokensV3 === 'function') {
        console.log('Reloading tokens from database...');
        await loadTokensV3();
    }
    
    // Refresh protected tokens
    if (typeof loadProtectedTokensData === 'function') {
        await loadProtectedTokensData();
    }
    
    // Reload quick try tokens
    if (typeof loadQuickTryTokens === 'function') {
        await loadQuickTryTokens();
    }
    
    console.log('Token refresh complete!');
}

// Auto-execute
forceRefreshTokens();