// Helper functions for fetching token prices with history

async function getLatestTokenPrices(tokenMints) {
    if (!tokenMints || tokenMints.length === 0) return {};
    
    try {
        // Fetch latest prices for all tokens at once
        const { data: priceHistory, error } = await supabaseClient
            .from('token_price_history')
            .select('token_mint, price, liquidity, volume_24h, market_cap, recorded_at')
            .in('token_mint', tokenMints)
            .order('recorded_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching price history:', error);
            return {};
        }
        
        // Group by token_mint and get the latest price for each
        const latestPrices = {};
        priceHistory?.forEach(record => {
            if (!latestPrices[record.token_mint] || 
                new Date(record.recorded_at) > new Date(latestPrices[record.token_mint].recorded_at)) {
                latestPrices[record.token_mint] = record;
            }
        });
        
        return latestPrices;
    } catch (error) {
        console.error('Error in getLatestTokenPrices:', error);
        return {};
    }
}

// Subscribe to real-time price updates
function subscribeToTokenPriceHistory(callback) {
    const channel = supabaseClient
        .channel('token-price-history-updates')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'token_price_history'
        }, (payload) => {
            if (callback) callback(payload.new);
        })
        .subscribe();
    
    return channel;
}

// Get price with fallback
function getTokenPrice(tokenMint, priceHistory, tokenPrices) {
    // First try price history
    if (priceHistory[tokenMint]?.price) {
        return priceHistory[tokenMint].price;
    }
    
    // Then try token prices data
    const tokenPrice = tokenPrices?.find(tp => tp.token_mint === tokenMint);
    return tokenPrice?.price_usd || tokenPrice?.price || 0;
}

// Export for use in other scripts
window.TokenPriceHelper = {
    getLatestTokenPrices,
    subscribeToTokenPriceHistory,
    getTokenPrice
};