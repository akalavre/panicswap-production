// Fix for token price display issue
// This script ensures prices are fetched and displayed correctly

async function fixPriceDisplay() {
    console.log('[Price Fix] Starting price display fix...');
    
    // Wait for token list to be loaded
    if (!window.tokenListV3State || !window.tokenListV3State.tokens) {
        console.log('[Price Fix] Token list not loaded yet, waiting...');
        setTimeout(fixPriceDisplay, 1000);
        return;
    }
    
    const tokens = window.tokenListV3State.tokens;
    console.log(`[Price Fix] Found ${tokens.length} tokens in state`);
    
    // Check which tokens have no price
    const tokensWithoutPrice = tokens.filter(t => !t.price || t.price === 0);
    console.log(`[Price Fix] ${tokensWithoutPrice.length} tokens without prices`);
    
    if (tokensWithoutPrice.length === 0) {
        console.log('[Price Fix] All tokens have prices!');
        return;
    }
    
    // Fetch prices from backend
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/dashboard/check-prices`);
        const data = await response.json();
        
        if (data.success && data.prices) {
            console.log(`[Price Fix] Got ${data.prices.length} prices from backend`);
            
            // Create a map of prices
            const priceMap = new Map();
            data.prices.forEach(p => {
                priceMap.set(p.token_mint, p.price);
            });
            
            // Update tokens with prices
            let updatedCount = 0;
            tokens.forEach(token => {
                if (priceMap.has(token.token_mint)) {
                    const newPrice = priceMap.get(token.token_mint);
                    if (token.price !== newPrice) {
                        console.log(`[Price Fix] Updating ${token.symbol} price from ${token.price} to ${newPrice}`);
                        token.price = newPrice;
                        token.value = token.balance * newPrice;
                        updatedCount++;
                        
                        // Trigger price update animation
                        if (window.updateTokenPriceV3) {
                            window.updateTokenPriceV3({
                                token_mint: token.token_mint,
                                price: newPrice,
                                price_usd: newPrice
                            });
                        }
                    }
                }
            });
            
            console.log(`[Price Fix] Updated ${updatedCount} token prices`);
            
            // Re-render if we updated prices
            if (updatedCount > 0 && window.renderTokensV3) {
                window.renderTokensV3();
            }
        }
    } catch (error) {
        console.error('[Price Fix] Error fetching prices:', error);
    }
}

// Run the fix after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fixPriceDisplay, 2000);
    
    // Also run periodically
    setInterval(fixPriceDisplay, 10000); // Every 10 seconds
});

// Export for manual testing
window.fixPriceDisplay = fixPriceDisplay;