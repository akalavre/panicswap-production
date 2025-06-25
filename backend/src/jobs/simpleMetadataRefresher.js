/**
 * Simple metadata refresher without TypeScript dependencies
 * This can be run directly with node for cron jobs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Load Jupiter configuration
const JUPITER_LITE_URL = process.env.JUPITER_LITE_URL || 'https://lite-api.jup.ag';
const JUPITER_API_TIMEOUT = parseInt(process.env.JUPITER_API_TIMEOUT || '10000');
const JUPITER_MAX_RETRIES = parseInt(process.env.JUPITER_MAX_RETRIES || '3');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch token metadata from Helius
 */
async function fetchTokenMetadataFromHelius(tokenMint) {
    try {
        const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
        
        const response = await axios.post(heliusUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getAsset',
            params: {
                id: tokenMint
            }
        });

        if (response.data.result) {
            const asset = response.data.result;
            return {
                symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
                name: asset.content?.metadata?.name || 'Unknown Token',
                decimals: asset.token_info?.decimals || 6,
                image: asset.content?.links?.image || asset.content?.files?.[0]?.uri || null
            };
        }
    } catch (error) {
        console.error(`Error fetching Helius metadata for ${tokenMint}:`, error.message);
    }
    return null;
}

/**
 * Fetch token price from Jupiter
 */
async function fetchTokenPriceFromJupiter(tokenMint) {
    try {
        const jupiterUrl = `${JUPITER_LITE_URL}/price/v2?ids=${tokenMint}`;
        const response = await axios.get(jupiterUrl, {
            timeout: JUPITER_API_TIMEOUT,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PanicSwap/1.0'
            }
        });
        
        if (response.data.data && response.data.data[tokenMint]) {
            const priceData = response.data.data[tokenMint];
            return {
                price: priceData.price || 0,
                marketCap: priceData.marketCapFD || 0,
                volume24h: priceData.volume24h || 0,
                priceChange24h: priceData.priceChange24h || 0
            };
        }
    } catch (error) {
        console.error(`Error fetching Jupiter price for ${tokenMint}:`, error.message);
    }
    return null;
}

/**
 * Main refresh function
 */
async function refreshPendingMetadata() {
    console.log(`[${new Date().toISOString()}] Starting metadata refresh...`);
    
    try {
        // Fetch tokens with pending metadata
        const { data: pendingTokens, error } = await supabase
            .from('token_metadata')
            .select('mint')
            .eq('metadata_status', 'pending')
            .limit(50);

        if (error) {
            console.error('Error fetching pending tokens:', error);
            return;
        }

        if (!pendingTokens || pendingTokens.length === 0) {
            console.log('No pending tokens to refresh');
            return;
        }

        console.log(`Processing ${pendingTokens.length} tokens...`);
        
        // Process tokens in batches
        const batchSize = 5;
        let successCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < pendingTokens.length; i += batchSize) {
            const batch = pendingTokens.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (token) => {
                try {
                    console.log(`Processing ${token.mint}...`);
                    
                    // Fetch metadata
                    const metadata = await fetchTokenMetadataFromHelius(token.mint);
                    const priceData = await fetchTokenPriceFromJupiter(token.mint);
                    
                    const updateData = {
                        updated_at: new Date().toISOString()
                    };
                    
                    // Check if we got valid metadata
                    const hasValidMetadata = metadata && 
                                           metadata.symbol !== 'UNKNOWN' &&
                                           metadata.symbol !== 'TEST' &&
                                           metadata.symbol !== 'DEMO' &&
                                           metadata.name !== 'Unknown Token' &&
                                           metadata.name !== 'Test Token' &&
                                           metadata.name !== 'Demo Token';
                    
                    if (hasValidMetadata) {
                        updateData.metadata_status = 'complete';
                        updateData.symbol = metadata.symbol;
                        updateData.name = metadata.name;
                        updateData.decimals = metadata.decimals;
                        updateData.logo_uri = metadata.image || '/assets/images/token-placeholder.svg';
                        successCount++;
                    } else {
                        updateData.metadata_status = 'failed';
                        failedCount++;
                    }
                    
                    if (priceData) {
                        updateData.current_price = priceData.price;
                        updateData.market_cap = priceData.marketCap;
                        updateData.volume_24h = priceData.volume24h;
                        updateData.price_24h_change = priceData.priceChange24h;
                        updateData.price_last_updated = new Date().toISOString();
                    }
                    
                    // Update database
                    await supabase
                        .from('token_metadata')
                        .update(updateData)
                        .eq('mint', token.mint);
                    
                    if (hasValidMetadata) {
                        console.log(`✓ Updated ${token.mint} - ${metadata.symbol}`);
                    } else {
                        console.log(`✗ Failed to get valid metadata for ${token.mint}`);
                    }
                    
                } catch (error) {
                    console.error(`Error processing ${token.mint}:`, error.message);
                    failedCount++;
                    
                    // Mark as failed
                    await supabase
                        .from('token_metadata')
                        .update({ 
                            metadata_status: 'failed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('mint', token.mint);
                }
            }));
            
            // Small delay between batches
            if (i + batchSize < pendingTokens.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`[${new Date().toISOString()}] Metadata refresh completed`);
        console.log(`Success: ${successCount}, Failed: ${failedCount}`);
        
    } catch (error) {
        console.error('Fatal error in metadata refresher:', error);
        process.exit(1);
    }
}

// Check for command line arguments
if (process.argv.includes('--force-all')) {
    console.log('Force-all mode not implemented yet');
    process.exit(0);
}

// Run the refresh
refreshPendingMetadata()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });