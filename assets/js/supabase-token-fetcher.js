// Comprehensive Supabase token data fetcher for PanicSwap dashboard
class SupabaseTokenFetcher {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Fetch comprehensive token data for dashboard
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Array>} Array of tokens with all dashboard data
     */
    async fetchDashboardTokens(walletAddress) {
        try {
            // If no wallet address, show demo tokens
            if (!walletAddress) {
                console.log('No wallet connected, loading demo tokens...');
                return this.fetchDemoTokens();
            }

            // First, get user's wallet tokens (including test tokens)
            const { data: walletTokens, error: walletError } = await supabaseClient
                .from('wallet_tokens')
                .select('*')
                .eq('wallet_address', walletAddress);

            if (walletError) {
                console.error('Error fetching wallet tokens:', walletError);
                return this.fetchDemoTokens();
            }

            if (!walletTokens || walletTokens.length === 0) {
                console.log('No wallet tokens found, loading demo tokens...');
                return this.fetchDemoTokens();
            }

            // Get all token mints
            const tokenMints = walletTokens.map(wt => wt.token_mint);
            
            // Fetch all data in parallel for efficiency
            const [
                metadata,
                prices,
                rugchecks,
                pumpFunData,
                protectedTokens,
                priceHistory
            ] = await Promise.all([
                this.fetchTokenMetadata(tokenMints),
                this.fetchTokenPrices(tokenMints),
                this.fetchRugcheckReports(tokenMints),
                this.fetchPumpFunMonitoring(tokenMints),
                this.fetchProtectedTokens(walletAddress, tokenMints),
                this.fetchLatestPriceHistory(tokenMints) // Re-enabled with fixed query
            ]);

            // Combine all data
            return this.combineTokenData(
                walletTokens,
                metadata,
                prices,
                rugchecks,
                pumpFunData,
                protectedTokens,
                priceHistory
            );

        } catch (error) {
            console.error('Error in fetchDashboardTokens:', error);
            return this.fetchDemoTokens();
        }
    }

    /**
     * Fetch token metadata
     */
    async fetchTokenMetadata(tokenMints) {
        const { data, error } = await supabaseClient
            .from('token_metadata')
            .select('*')
            .in('mint', tokenMints);
        
        if (error) {
            console.error('Error fetching metadata:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.mint, item]));
    }

    /**
     * Fetch current token prices
     */
    async fetchTokenPrices(tokenMints) {
        const { data, error } = await supabaseClient
            .from('token_prices')
            .select('*')
            .in('token_mint', tokenMints);
        
        if (error) {
            console.error('Error fetching prices:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }

    /**
     * Fetch rugcheck reports for risk data
     */
    async fetchRugcheckReports(tokenMints) {
        const { data, error } = await supabaseClient
            .from('rugcheck_reports')
            .select(`
                token_mint,
                risk_score,
                risk_level,
                holders,
                creator_balance_percent,
                lp_locked,
                honeypot_status,
                dev_activity_pct,
                launch_time,
                liquidity_current,
                liquidity_change_1h_pct,
                liquidity_change_24h_pct,
                warnings
            `)
            .in('token_mint', tokenMints);
        
        if (error) {
            console.error('Error fetching rugcheck reports:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }

    /**
     * Fetch pump.fun specific monitoring data
     */
    async fetchPumpFunMonitoring(tokenMints) {
        const { data, error } = await supabaseClient
            .from('pump_fun_monitoring')
            .select(`
                token_mint,
                creator,
                sol_reserves,
                token_reserves,
                is_complete,
                total_holders,
                dev_wallet_percentage,
                concentration_risk,
                risk_score
            `)
            .in('token_mint', tokenMints);
        
        if (error) {
            console.error('Error fetching pump.fun data:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }

    /**
     * Fetch protected tokens status
     */
    async fetchProtectedTokens(walletAddress, tokenMints) {
        const { data, error } = await supabaseClient
            .from('protected_tokens')
            .select('*')
            .eq('wallet_address', walletAddress)
            .in('token_mint', tokenMints)
            .eq('is_active', true);
        
        if (error) {
            console.error('Error fetching protected tokens:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }

    /**
     * Fetch latest price history
     */
    async fetchLatestPriceHistory(tokenMints) {
        // Get latest price for each token
        const pricePromises = tokenMints.map(async (mint) => {
            const { data, error } = await supabaseClient
                .from('token_price_history')
                .select('*')
                .eq('token_mint', mint)
                .order('recorded_at', { ascending: false })
                .limit(1);
            
            // Return first item if exists, null otherwise
            return { mint, data: data && data.length > 0 ? data[0] : null, error };
        });

        const results = await Promise.all(pricePromises);
        const priceMap = new Map();
        
        results.forEach(({ mint, data, error }) => {
            if (!error && data) {
                priceMap.set(mint, data);
            }
        });
        
        return priceMap;
    }

    /**
     * Combine all token data into dashboard format
     */
    combineTokenData(walletTokens, metadata, prices, rugchecks, pumpFunData, protectedTokens, priceHistory) {
        return walletTokens.map(walletToken => {
            const mint = walletToken.token_mint;
            const meta = metadata.get(mint) || {};
            const price = prices.get(mint) || {};
            const rugcheck = rugchecks.get(mint) || {};
            const pumpFun = pumpFunData.get(mint);
            const protection = protectedTokens.get(mint);
            const latestPrice = priceHistory.get(mint) || {};

            // Calculate actual balance
            const decimals = walletToken.decimals || meta.decimals || 9;
            const balance = walletToken.balance / Math.pow(10, decimals);

            // Get best price (prefer latest history)
            const currentPrice = latestPrice.price || price.price_usd || price.price || 0;
            
            // Calculate value
            const value = balance * currentPrice;

            // Calculate age
            const launchTime = rugcheck.launch_time || meta.created_at;
            const age = launchTime ? this.calculateAge(launchTime) : null;

            return {
                // Identity
                token_mint: mint,
                symbol: meta.symbol || price.symbol || 'Unknown',
                name: meta.name || price.name || meta.symbol || 'Unknown Token',
                image: meta.logo_uri || meta.logo_url || '',
                platform: meta.platform || price.platform || 'unknown',

                // Balance & Value
                balance: balance,
                price: currentPrice,
                value: value,

                // Price metrics
                price_change_24h: price.change_24h || 0,
                liquidity_usd: latestPrice.liquidity || rugcheck.liquidity_current || price.liquidity || 0,
                liquidity_change_1h: rugcheck.liquidity_change_1h_pct || 0,
                liquidity_change_24h: rugcheck.liquidity_change_24h_pct || 0,
                volume_24h: latestPrice.volume_24h || price.volume_24h || 0,
                market_cap: latestPrice.market_cap || price.market_cap || 0,

                // Risk metrics
                risk_score: rugcheck.risk_score || pumpFun?.risk_score || 0,
                risk_level: rugcheck.risk_level || this.calculateRiskLevel(rugcheck.risk_score),
                holder_count: rugcheck.holders || pumpFun?.total_holders || 0,
                creator_balance_pct: rugcheck.creator_balance_percent || pumpFun?.dev_wallet_percentage || 0,
                dev_activity_pct: rugcheck.dev_activity_pct || 0,
                honeypot_status: rugcheck.honeypot_status || 'unknown',
                lp_locked_pct: rugcheck.lp_locked || 0,
                warnings: rugcheck.warnings || [],

                // Additional data
                age: age,
                launch_time: launchTime,
                is_pump_fun: !!pumpFun,
                pump_fun_complete: pumpFun?.is_complete || false,
                concentration_risk: pumpFun?.concentration_risk || rugcheck.concentration_risk,

                // Protection status
                protected: !!protection,
                protection_data: protection,
                monitoring_active: protection?.monitoring_active || false,

                // Sorting helpers
                sort_value: value,
                sort_liquidity: latestPrice.liquidity || rugcheck.liquidity_current || price.liquidity || 0,
                sort_risk: rugcheck.risk_score || pumpFun?.risk_score || 0
            };
        }).sort((a, b) => b.sort_value - a.sort_value); // Sort by value descending
    }

    /**
     * Calculate token age from launch time
     */
    calculateAge(launchTime) {
        const now = Date.now();
        const launch = new Date(launchTime).getTime();
        const diff = now - launch;
        
        const minutes = diff / (1000 * 60);
        const hours = minutes / 60;
        const days = hours / 24;
        
        if (days >= 30) {
            return { value: Math.floor(days / 30), unit: 'mo', raw_days: days };
        } else if (days >= 1) {
            return { value: Math.floor(days), unit: 'd', raw_days: days };
        } else if (hours >= 1) {
            return { value: Math.floor(hours), unit: 'h', raw_days: days };
        } else {
            return { value: Math.floor(minutes), unit: 'm', raw_days: days };
        }
    }

    /**
     * Calculate risk level from score
     */
    calculateRiskLevel(score) {
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MODERATE';
        if (score >= 20) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Fetch demo tokens for users without wallet
     */
    async fetchDemoTokens() {
        try {
            // Check if there's a demo wallet address
            const demoWalletAddress = localStorage.getItem('demoWalletAddress');
            
            if (demoWalletAddress) {
                // Fetch tokens for demo wallet
                return await this.fetchDashboardTokens(demoWalletAddress);
            }
            
            // Otherwise, try to get generic test tokens
            const { data: testTokens, error: testError } = await supabaseClient
                .from('wallet_tokens')
                .select('*')
                .eq('is_test_token', true)
                .limit(20);

            if (testTokens && testTokens.length > 0) {
                console.log('Found test tokens:', testTokens);
                
                // Get token mints
                const tokenMints = testTokens.map(t => t.token_mint);
                
                // Fetch all related data
                const [metadata, prices, rugchecks, priceHistory] = await Promise.all([
                    this.fetchTokenMetadata(tokenMints),
                    this.fetchTokenPrices(tokenMints),
                    this.fetchRugcheckReports(tokenMints),
                    this.fetchLatestPriceHistory(tokenMints)
                ]);

                // Combine data like regular tokens
                return this.combineTokenData(
                    testTokens,
                    metadata,
                    prices,
                    rugchecks,
                    new Map(), // No pump.fun data for demo
                    new Map(), // No protection data for demo
                    priceHistory
                ).map(token => ({
                    ...token,
                    is_test_token: true,
                    is_demo_mode: true
                }));
            }

            // Fallback: Get popular tokens from token_prices
            console.log('No test tokens found, loading popular tokens...');
            const { data: popularTokens, error } = await supabaseClient
                .from('token_prices')
                .select('*')
                .not('market_cap', 'is', null)
                .gt('market_cap', 0)
                .order('market_cap', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching popular tokens:', error);
                // Try token_metadata instead
                const { data: metadataTokens, error: metaError } = await supabaseClient
                    .from('token_metadata')
                    .select('*')
                    .limit(10);
                    
                if (metaError || !metadataTokens || metadataTokens.length === 0) {
                    console.error('Error fetching token metadata:', metaError);
                    return [];
                }
                
                // Use metadata tokens as fallback
                return metadataTokens.map(token => ({
                    token_mint: token.mint || token.token_mint,
                    symbol: token.symbol || 'Unknown',
                    name: token.name || token.symbol || 'Unknown Token',
                    image: token.logo_uri || token.logo_url || '',
                    platform: token.platform || 'unknown',
                    balance: 1000000,
                    price: 0,
                    value: 0,
                    price_change_24h: Math.random() * 20 - 10,
                    liquidity_usd: 500000,
                    volume_24h: 100000,
                    market_cap: 1000000,
                    risk_score: 25,
                    risk_level: 'LOW',
                    holder_count: 5000,
                    creator_balance_pct: 5,
                    dev_activity_pct: 10,
                    honeypot_status: 'safe',
                    lp_locked_pct: 100,
                    age: { value: 30, unit: 'd', raw_days: 30 },
                    protected: true,
                    monitoring_active: true,
                    is_test_token: true,
                    is_demo_mode: true
                }));
            }
            
            if (!popularTokens || popularTokens.length === 0) {
                console.log('No popular tokens found');
                return [];
            }

            // Get metadata for these tokens
            const tokenMints = popularTokens.map(t => t.token_mint);
            const metadata = await this.fetchTokenMetadata(tokenMints);
            const rugchecks = await this.fetchRugcheckReports(tokenMints);
            const priceHistory = await this.fetchLatestPriceHistory(tokenMints);

            // Transform to demo tokens with fixed $1000 value
            return popularTokens.map(token => {
                const meta = metadata.get(token.token_mint) || {};
                const rugcheck = rugchecks.get(token.token_mint) || {};
                const latestPrice = priceHistory.get(token.token_mint) || {};
                
                // Get price from various sources, default to 0 if none found
                const price = latestPrice.price || token.price_usd || token.price || 0;
                const demoBalance = 1000000; // 1M tokens
                const demoValue = price > 0 ? demoBalance * price : 0; // Calculate value based on price
                
                return {
                    token_mint: token.token_mint,
                    symbol: meta.symbol || token.symbol || 'Unknown',
                    name: meta.name || token.name || 'Unknown Token',
                    image: meta.logo_uri || meta.logo_url || '',
                    platform: token.platform || 'unknown',
                    balance: demoBalance,
                    price: price,
                    value: demoValue,
                    price_change_24h: token.change_24h || 0,
                    liquidity_usd: latestPrice.liquidity || token.liquidity || 0,
                    liquidity_change_1h: rugcheck.liquidity_change_1h_pct || 0,
                    liquidity_change_24h: rugcheck.liquidity_change_24h_pct || 0,
                    volume_24h: latestPrice.volume_24h || token.volume_24h || 0,
                    market_cap: latestPrice.market_cap || token.market_cap || 0,
                    risk_score: rugcheck.risk_score || 25,
                    risk_level: rugcheck.risk_level || 'LOW',
                    holder_count: rugcheck.holders || Math.floor(Math.random() * 10000),
                    creator_balance_pct: rugcheck.creator_balance_percent || 5,
                    dev_activity_pct: rugcheck.dev_activity_pct || 10,
                    honeypot_status: rugcheck.honeypot_status || 'safe',
                    lp_locked_pct: rugcheck.lp_locked || 100,
                    age: this.calculateAge(rugcheck.launch_time || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
                    protected: true, // All demo tokens show as protected
                    monitoring_active: true,
                    is_test_token: true,
                    is_demo_mode: true
                };
            });
        } catch (error) {
            console.error('Error in fetchDemoTokens:', error);
            return [];
        }
    }

    /**
     * Subscribe to real-time updates
     */
    subscribeToUpdates(callback) {
        // Subscribe to price updates
        const priceChannel = supabaseClient
            .channel('token-prices-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'token_prices'
            }, (payload) => {
                console.log('Price update:', payload);
                if (callback) callback('price', payload);
            });

        // Subscribe to rugcheck updates
        const rugcheckChannel = supabaseClient
            .channel('rugcheck-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'rugcheck_reports'
            }, (payload) => {
                console.log('Rugcheck update:', payload);
                if (callback) callback('rugcheck', payload);
            });

        // Subscribe to protection updates
        const protectionChannel = supabaseClient
            .channel('protection-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'protected_tokens'
            }, (payload) => {
                console.log('Protection update:', payload);
                if (callback) callback('protection', payload);
            });

        // Start subscriptions
        priceChannel.subscribe();
        rugcheckChannel.subscribe();
        protectionChannel.subscribe();

        // Return unsubscribe function
        return () => {
            priceChannel.unsubscribe();
            rugcheckChannel.unsubscribe();
            protectionChannel.unsubscribe();
        };
    }
}

// Export for use
window.SupabaseTokenFetcher = new SupabaseTokenFetcher();