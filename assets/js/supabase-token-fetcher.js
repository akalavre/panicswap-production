// Comprehensive Supabase token data fetcher for PanicSwap dashboard
// Now uses UnifiedTokenDataService for all data fetching
class SupabaseTokenFetcher {
    constructor() {
        // No caching - use unified service
    }

    /**
     * Fetch comprehensive token data for dashboard
     * @param {string} walletAddress - User's wallet address
     * @returns {Promise<Array>} Array of tokens with all dashboard data
     */
    async fetchDashboardTokens(walletAddress) {
        try {
            // If no wallet address, return empty array
            if (!walletAddress) {
                console.log('No wallet connected');
                return [];
            }

            // First, get user's wallet tokens from Supabase
            const { data: walletTokens, error: walletError } = await supabaseClient
                .from('wallet_tokens')
                .select('*')
                .eq('wallet_address', walletAddress);

            if (walletError) {
                console.error('Error fetching wallet tokens:', walletError);
                return [];
            }

            if (!walletTokens || walletTokens.length === 0) {
                console.log('No wallet tokens found for address:', walletAddress);
                return [];
            }

            // Get all token mints
            const tokenMints = walletTokens.map(wt => wt.token_mint);
            
            // Use UnifiedTokenDataService to fetch all token data
            const tokenDataArray = await window.getMultipleTokensData(tokenMints, walletAddress);
            
            // Create a map for easy lookup
            const tokenDataMap = new Map(tokenDataArray.map(data => [data.tokenMint, data]));
            
            // Combine wallet token data with unified data
            const combinedData = walletTokens.map(walletToken => {
                const unifiedData = tokenDataMap.get(walletToken.token_mint) || {};
                
                // Calculate user's balance and value
                const balance = parseFloat(walletToken.balance || 0);
                const decimals = walletToken.decimals || 9;
                const adjustedBalance = balance / Math.pow(10, decimals);
                const price = unifiedData.price || 0;
                const value = adjustedBalance * price;
                
                return {
                    // Wallet token data
                    wallet_address: walletToken.wallet_address,
                    token_mint: walletToken.token_mint,
                    balance: walletToken.balance,
                    balance_ui: adjustedBalance,
                    decimals: decimals,
                    value: value,
                    added_at: walletToken.added_at,
                    is_test_token: walletToken.is_test_token,
                    
                    // Unified data (always fresh from API)
                    symbol: unifiedData.symbol || walletToken.symbol || 'UNKNOWN',
                    name: unifiedData.name || walletToken.name || 'Unknown Token',
                    logo_uri: unifiedData.logoUrl || walletToken.logo_uri || walletToken.image_url,
                    image: unifiedData.logoUrl || walletToken.logo_uri || walletToken.image_url,
                    logo_url: unifiedData.logoUrl || walletToken.logo_uri || walletToken.image_url,
                    price: unifiedData.price || 0,
                    price_change_24h: unifiedData.priceChange24h || 0,
                    price_change_5m: unifiedData.priceChange5m || 0,
                    price_change_1m: unifiedData.priceChange1m || 0,
                    liquidity: unifiedData.liquidity ?? null,
                    liquidity_usd: unifiedData.liquidity ?? null,
                    liquidity_change_24h: unifiedData.liquidityChange24h || 0,
                    liquidity_change_5m: unifiedData.liquidityChange5m || 0,
                    liquidity_change_1m: unifiedData.liquidityChange1m || 0,
                    market_cap: unifiedData.marketCap || 0,
                    volume_24h: unifiedData.volume24h || 0,
                    holders: unifiedData.holders || 0,
                    holder_count: unifiedData.holders || 0,
                    risk_level: unifiedData.riskLevel || 'Unknown',
                    risk_score: unifiedData.riskScore || 0,
                    rug_probability: unifiedData.rugProbability || 0,
                    protected: unifiedData.protected || false,
                    monitoring_active: unifiedData.monitoringActive || false,
                    active_monitors: unifiedData.activeMonitors || 0,
                    ml_analysis: unifiedData.mlAnalysis,
                    has_ml_analysis: !!unifiedData.mlAnalysis,
                    patterns: unifiedData.patterns || [],
                    developer_activity: unifiedData.developerActivity,
                    velocity: unifiedData.velocity,
                    pool_info: unifiedData.poolInfo,
                    
                    // Additional fields needed by UI
                    metadata_status: walletToken.metadata_status || (unifiedData.symbol && unifiedData.symbol !== 'UNKNOWN' ? 'complete' : 'pending'),
                    status: walletToken.status || 'active',
                    is_newly_added: walletToken.is_newly_added || false,
                    created_at: walletToken.created_at || walletToken.added_at,
                    creator_balance_pct: unifiedData.developerActivity?.creatorBalance || 0,
                    dev_activity_pct: unifiedData.developerActivity?.activity || 0,
                    badge_state: unifiedData.badgeState || null,
                    sell_signal: unifiedData.sellSignal || null,
                    price_velocity_5m: unifiedData.priceChange5m || 0,
                    price_velocity_1m: unifiedData.priceChange1m || 0,
                    
                    // Age and launch time data
                    age: unifiedData.age || null,
                    launch_time: unifiedData.launchTime || unifiedData.createdAt || null
                };
            });
            
            // Sort by value descending
            combinedData.sort((a, b) => b.value - a.value);
            
            return combinedData;

        } catch (error) {
            console.error('Error in fetchDashboardTokens:', error);
            return [];
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
                dev_activity_pct_total,
                dev_activity_24h_pct,
                dev_activity_1h_pct,
                last_dev_tx,
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
            .in('token_mint', tokenMints);
            // Removed .eq('is_active', true) to fetch all protection records
        
        if (error) {
            console.error('Error fetching protected tokens:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }

    /**
     * Fetch ML risk analysis data
     */
    async fetchMLRiskAnalysis(tokenMints) {
        const { data, error } = await supabaseClient
            .from('ml_risk_analysis')
            .select(`
                token_mint,
                risk_score,
                risk_level,
                ml_risk_score,
                ml_confidence,
                ml_recommendation,
                detected_patterns,
                updated_at
            `)
            .in('token_mint', tokenMints);
        
        if (error) {
            console.error('Error fetching ML risk analysis:', error);
            return new Map();
        }
        
        return new Map(data.map(item => [item.token_mint, item]));
    }
    
    /**
     * Queue tokens for ML generation
     */
    async queueTokensForMLGeneration(tokenMints) {
        try {
            const queueData = tokenMints.map(mint => ({
                token_mint: mint,
                needs_ml_generation: true
            }));
            
            await supabaseClient
                .from('ml_generation_queue')
                .upsert(queueData, { onConflict: 'token_mint' });
        } catch (error) {
            console.error('Error queuing tokens for ML generation:', error);
        }
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
    combineTokenData(walletTokens, metadata, prices, rugchecks, pumpFunData, protectedTokens, priceHistory, mlRiskData) {
        return walletTokens.map(walletToken => {
            const mint = walletToken.token_mint;
            const meta = metadata.get(mint) || {};
            const price = prices.get(mint) || {};
            const rugcheck = rugchecks.get(mint) || {};
            const pumpFun = pumpFunData.get(mint);
            const protection = protectedTokens.get(mint);
            const latestPrice = priceHistory.get(mint) || {};
            const mlData = mlRiskData ? mlRiskData.get(mint) : null;

            // Use exact balance from database - NO calculations
            const decimals = walletToken.decimals || meta.decimals || 9;
            let rawBalance;
            
            // Balance logic: Use exact value from database
            if (walletToken.balance !== null && walletToken.balance !== undefined) {
                rawBalance = parseFloat(walletToken.balance.toString());
            } else {
                rawBalance = 0;
            }

            const adjustedBalance = rawBalance / Math.pow(10, decimals);
            
            // Debug balance calculation
            console.log(`Balance calculation for ${mint}:`, {
                raw_balance: walletToken.balance,
                stored_balance: walletToken.balance,
                wallet_decimals: walletToken.decimals,
                meta_decimals: meta.decimals,
                used_decimals: decimals,
                division_factor: Math.pow(10, decimals),
                calculated_balance: adjustedBalance,
                is_test_token: walletToken.is_test_token
            });

            // Get best price (prefer most recent sources)
            let currentPrice = latestPrice.price || price.price_usd || price.price || meta.current_price || 0;
            
            // Ensure we have a valid price
            if (!currentPrice || currentPrice === 0 || isNaN(currentPrice)) {
                // Try other price sources
                currentPrice = price.current_price || rugcheck.current_price || meta.initial_price || 0;
                
                // For demo/test tokens, provide a reasonable fallback price
                if ((currentPrice === 0 || !currentPrice) && walletToken.is_test_token) {
                    // Set demo price based on decimals (matching the startDemo logic)
                    if (decimals >= 9) {
                        currentPrice = 0.0001; // $0.0001 for high-decimal tokens
                    } else if (decimals >= 6) {
                        currentPrice = 0.1; // $0.1 for medium-decimal tokens  
                    } else {
                        currentPrice = 1.0; // $1.0 for low-decimal tokens
                    }
                    console.log(`Applied demo token fallback price for ${mint}: $${currentPrice} (${decimals} decimals)`);
                }
                
                console.log(`Using fallback price for ${mint}: ${currentPrice}`);
            }
            
            // Calculate value using the decimal-adjusted balance
            const value = adjustedBalance * currentPrice;
            
            // Debug value calculation
            console.log(`Value calculation for ${mint}:`, {
                symbol: meta.symbol || price.symbol,
                decimal_adjusted_balance: adjustedBalance,
                raw_balance: walletToken.balance,
                current_price: currentPrice,
                calculated_value: value,
                price_sources: {
                    meta_price: meta.current_price,
                    latest_price: latestPrice.price,
                    price_usd: price.price_usd,
                    fallback_price: price.price,
                    rugcheck_price: rugcheck.current_price
                },
                value_is_zero: value === 0,
                price_is_zero: currentPrice === 0,
                balance_is_zero: adjustedBalance === 0
            });

            // Calculate age
            const launchTime = rugcheck.launch_time || meta.created_at;
            const age = launchTime ? this.calculateAge(launchTime) : null;

            const tokenData = {
                // Identity
                token_mint: mint,
                symbol: meta.symbol || price.symbol || 'Unknown',
                name: meta.name || price.name || price.symbol || meta.symbol || 'Unknown Token',
                image: meta.logo_uri || meta.logo_url || '',
                platform: meta.platform || price.platform || 'unknown',

                // Balance & Value
                balance: adjustedBalance, // Decimal-adjusted balance for calculations
                balance_ui: adjustedBalance, // UI-friendly balance (same as balance)
                original_balance: walletToken.balance, // Original raw balance from database
                decimals: decimals,
                price: currentPrice,
                value: value, // Calculated as: balance * currentPrice

                // Price metrics - prioritize metadata values from our database
                price_change_24h: meta.price_24h_change || price.change_24h || 0,
                liquidity_usd: meta.current_liquidity || latestPrice.liquidity || rugcheck.liquidity_current || price.liquidity || 0,
                liquidity_change_1h: rugcheck.liquidity_change_1h_pct || 0,
                liquidity_change_24h: rugcheck.liquidity_change_24h_pct || 0,
                volume_24h: meta.volume_24h || latestPrice.volume_24h || price.volume_24h || 0,
                market_cap: meta.market_cap || latestPrice.market_cap || price.market_cap || 0,

                // Risk metrics - prefer ML-enhanced data
                risk_score: mlData?.risk_score || rugcheck.risk_score || pumpFun?.risk_score || 0,
                risk_level: mlData?.risk_level || rugcheck.risk_level || this.calculateRiskLevel(rugcheck.risk_score || pumpFun?.risk_score || 0),
                ml_risk_score: mlData?.ml_risk_score || rugcheck.ml_risk_score || null,
                ml_confidence: mlData?.ml_confidence || rugcheck.ml_confidence || null,
                ml_recommendation: mlData?.ml_recommendation || rugcheck.ml_recommendation || null,
                detected_patterns: mlData?.detected_patterns || rugcheck.detected_patterns || [],
                has_ml_analysis: !!mlData,
                holder_count: meta.holder_count || rugcheck.holders || pumpFun?.total_holders || 0,
                creator_balance_pct: rugcheck.creator_balance_percent || pumpFun?.dev_wallet_percentage || 0,
                dev_activity_pct: rugcheck.dev_activity_pct || 0,
                dev_activity_pct_total: rugcheck.dev_activity_pct_total || rugcheck.dev_activity_pct || 0,
                dev_activity_24h_pct: rugcheck.dev_activity_24h_pct || rugcheck.dev_activity_pct || 0,
                dev_activity_1h_pct: rugcheck.dev_activity_1h_pct || 0,
                last_dev_tx: rugcheck.last_dev_tx || null,
                dev_wallets: [], // Now stored in separate table
                honeypot_status: rugcheck.honeypot_status || 'unknown',
                lp_locked_pct: rugcheck.lp_locked || 0,
                warnings: rugcheck.warnings || [],

                // Additional data
                age: age,
                launch_time: launchTime,
                is_pump_fun: !!pumpFun,
                pump_fun_complete: pumpFun?.is_complete || false,
                concentration_risk: pumpFun?.concentration_risk || rugcheck.concentration_risk,
                is_test_token: walletToken.is_test_token || false,

                // Protection status - check is_active which is the source of truth
                protected: !!(protection && protection.is_active),
                protection_data: protection,
                monitoring_active: !!(protection && protection.is_active && protection.monitoring_active),
                status: protection?.status || 'active', // Include status for rug detection

                // Sorting helpers
                sort_value: value,
                sort_liquidity: latestPrice.liquidity || rugcheck.liquidity_current || price.liquidity || 0,
                sort_risk: rugcheck.risk_score || pumpFun?.risk_score || 0
            };

            // Debug log to see what data is being created
            console.log(`Token ${tokenData.symbol} data:`, {
                raw_balance: walletToken.balance,
                calculated_balance: adjustedBalance,
                meta_price: meta.current_price,
                latest_price: latestPrice.price,
                price_usd: price.price_usd,
                final_price: currentPrice,
                calculated_value: value,
                final_token_data: tokenData
            });

            return tokenData;
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
                    holder_count: 0,
                    creator_balance_pct: 0,
                    dev_activity_pct: 0,
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
                    name: meta.name || token.name || token.symbol || meta.symbol || 'Unknown Token',
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
                    holder_count: rugcheck.holders || 0,
                    creator_balance_pct: rugcheck.creator_balance_percent || 0,
                    dev_activity_pct: rugcheck.dev_activity_pct || 0,
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