/**
 * Demo Mode Functionality for Dashboard
 * Handles quick try tokens and demo token operations
 */

// Load quick try tokens from database
async function loadQuickTryTokens() {
    const container = document.getElementById('quick-try-tokens');
    if (!container) return;
    
    try {
        // Show loading state
        container.innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
                <div class="px-3 py-1.5 bg-gray-800/60 rounded-md animate-pulse">
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                </div>
            </div>
        `;
        
        // Hardcoded popular pump.fun tokens for quick try
        const pumpFunTokens = [
            { mint: '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJn', symbol: 'KIBA' },
            { mint: '5mbqsDKnQNZYWBZxsDMgRJcJXJdqJdKhFLQv2HvG', symbol: 'PEPE' },
            { mint: '8XE3TuqEZhzqMKqCB9LkbR8YcFCFwNMmYZnzA3Xp', symbol: 'DOGE' },
            { mint: '9Z5rJfQRXjH5g6kMkNUvxBz8h6F9pK4HgfvLnxVR', symbol: 'SHIB' },
            { mint: 'A2YsRLNxVkawBGvRkHQdJdKhFLQv2HvGZxsDMgRJ', symbol: 'BONK' },
            { mint: '7Y8qFpLkbR8YcFCFwNMmYZnzA3XpHgfvLnxVRB9L', symbol: 'FLOKI' }
        ];
        
        // Try to fetch latest tokens from Supabase first
        try {
            const { data: latestTokens, error } = await supabaseClient
                .from('token_metadata')
                .select('mint, symbol, name')
                .not('symbol', 'eq', 'TEST')
                .not('name', 'ilike', '%test%')
                .not('symbol', 'is', null)
                .order('created_at', { ascending: false })
                .limit(6);
            
            if (!error && latestTokens && latestTokens.length > 0) {
                // Use database tokens
                displayQuickTryTokens(container, latestTokens);
                return;
            }
        } catch (dbError) {
            console.error('Database error, using hardcoded tokens:', dbError);
        }
        
        // Fall back to hardcoded tokens if database fails
        displayQuickTryTokens(container, pumpFunTokens);
        
        
    } catch (error) {
        console.error('Error loading quick try tokens:', error);
        container.innerHTML = '<span class="text-xs text-gray-500">Error loading tokens</span>';
    }
}

// Helper function to display quick try tokens
function displayQuickTryTokens(container, tokens) {
    const tokensHTML = tokens.map(token => 
        `<button 
            onclick="startDemo(event)" 
            data-mint="${token.mint}" 
            data-symbol="${token.symbol}"
            class="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-md text-xs font-medium text-purple-300 transition-all duration-200 hover:scale-105 hover:border-purple-400/50"
        >
            ${token.symbol}
        </button>`
    ).join('');
    
    container.innerHTML = `<div class="flex gap-2 flex-wrap">${tokensHTML}</div>`;
}

// Start demo function with full validation
async function startDemo(event) {
    const button = event.target;
    const tokenMint = button.getAttribute('data-mint');
    const tokenSymbol = button.getAttribute('data-symbol');
    
    if (!tokenMint) {
        console.error('No token mint found');
        return;
    }
    
    // Check wallet connection
    if (!window.solana || !window.solana.isConnected) {
        showError('Please connect your wallet first to try demo protection.');
        return;
    }

    const currentWalletAddress = window.solana.publicKey?.toString();
    if (!currentWalletAddress) {
        showError('Unable to get wallet address. Please reconnect your wallet.');
        return;
    }

    // Show loading state
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;
    
    try {
        const input = document.querySelector('input[placeholder*="token mint"]');
        if (input) {
            input.value = tokenMint;
        }
        
        // Call the existing addTestToken function
        if (typeof addTestToken === 'function') {
            await addTestToken(tokenMint, currentWalletAddress);
        } else {
            console.error('addTestToken function not found');
            showError('Demo functionality not available');
        }
        
    } catch (error) {
        console.error('Error in startDemo:', error);
        showError('Failed to start demo: ' + error.message);
    } finally {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Initialize demo mode
function initializeDemoMode() {
    loadQuickTryTokens();
}

// Export for global use
window.loadQuickTryTokens = loadQuickTryTokens;
window.startDemo = startDemo;
window.initializeDemoMode = initializeDemoMode;