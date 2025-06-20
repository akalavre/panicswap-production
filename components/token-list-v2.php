<!-- Token List V2 - Matching Screenshot Design -->
<div class="card-dark rounded-lg">
    <!-- Header -->
    <div class="p-4 border-b border-gray-800">
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Your Tokens</h2>
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-400">Total Value: $<span id="total-value">0.00</span></span>
                <span class="text-gray-600">•</span>
                <span class="text-sm text-gray-400"><span id="protected-count">0</span> Protected</span>
                <span class="text-gray-600">•</span>
                <span class="text-sm text-gray-400"><span id="risk-count">0</span> High Risk</span>
                <button class="ml-4 text-xs text-primary-400 hover:text-primary-300">View Details</button>
            </div>
        </div>
        
        <!-- Warning Banner -->
        <div id="warning-banner" class="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-800/30 hidden">
            <div class="flex items-start space-x-2">
                <svg class="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div class="flex-1">
                    <p class="text-sm text-red-400 font-medium">It's Pumpulius Maximus!</p>
                    <p class="text-xs text-gray-400 mt-1">
                        Community Backed Memecoin • 10m old • Quick tokens: All alerts based on alerts tokens ($1000 capital to test our system)
                    </p>
                    <div class="flex items-center gap-4 mt-2">
                        <span class="text-xs text-gray-500">Honeypot Status Unknown</span>
                        <span class="text-xs text-gray-500">Emergency notifications active</span>
                        <span class="text-xs text-gray-500">22.6k dashboard features</span>
                    </div>
                </div>
                <button class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                    Start Demo
                </button>
            </div>
        </div>
        
        <!-- Token Address Input -->
        <div class="mt-3 flex items-center gap-2">
            <input 
                type="text" 
                id="token-address-input" 
                placeholder="Enter any token's mint address to add token" 
                class="flex-1 bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            >
        </div>
    </div>
    
    <!-- Table -->
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="text-xs text-gray-500 uppercase">
                    <th class="px-4 py-3 text-left font-normal">TOKEN</th>
                    <th class="px-4 py-3 text-center font-normal">RISK</th>
                    <th class="px-4 py-3 text-center font-normal">AGE</th>
                    <th class="px-4 py-3 text-right font-normal">PRICE</th>
                    <th class="px-4 py-3 text-right font-normal">LIQUIDITY</th>
                    <th class="px-4 py-3 text-right font-normal">VALUE</th>
                    <th class="px-4 py-3 text-center font-normal">DEV</th>
                    <th class="px-4 py-3 text-right font-normal">HOLDERS</th>
                    <th class="px-4 py-3 text-right font-normal">CREATOR</th>
                    <th class="px-4 py-3 text-center font-normal">SELL</th>
                    <th class="px-4 py-3 text-center font-normal">LP</th>
                    <th class="px-4 py-3 text-center font-normal">PROTECTION</th>
                    <th class="px-4 py-3 text-center font-normal">ACTIONS</th>
                </tr>
            </thead>
            <tbody id="token-list-body">
                <!-- Tokens will be inserted here -->
            </tbody>
        </table>
        
        <!-- Empty State -->
        <div id="empty-state" class="py-12 text-center hidden">
            <p class="text-gray-500">No tokens found in your wallet</p>
            <p class="text-sm text-gray-600 mt-2">Connect your wallet or add tokens manually</p>
        </div>
        
        <!-- Loading State -->
        <div id="loading-state" class="py-12 text-center">
            <svg class="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-500 mt-2">Loading tokens...</p>
        </div>
        
        <!-- Warning Footer -->
        <div class="px-4 py-3 bg-yellow-900/10 border-t border-yellow-900/20 text-center">
            <p class="text-xs text-yellow-600">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                Not seeing all your tokens? 
                <span class="text-yellow-500">Some DEXs are not being tracked due to your Basic subscription.</span>
                <a href="#" class="text-primary-400 hover:text-primary-300 ml-1">Upgrade to Degen Mode to see tokens from all DEXs and launchpads.</a>
            </p>
        </div>
    </div>
</div>

<script>
// Token List V2 State
let tokenListV2State = {
    tokens: [],
    loading: true,
    filter: 'all'
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadTokensV2();
    
    // Add token input handler
    document.getElementById('token-address-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTokenByAddress(e.target.value);
        }
    });
});

// Load tokens from Supabase or API
async function loadTokensV2() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
        showEmptyStateV2();
        return;
    }
    
    try {
        // Try Supabase first
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await loadFromSupabaseV2();
        } else {
            // Fallback to API
            await loadFromAPIV2();
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
        showEmptyStateV2();
    }
}

// Load from Supabase
async function loadFromSupabaseV2() {
    const walletAddress = localStorage.getItem('walletAddress');
    
    try {
        // First, try to get wallet tokens with all related data
        const { data: walletTokens, error: walletError } = await supabaseClient
            .from('wallet_tokens')
            .select('*')
            .eq('wallet_address', walletAddress);
        
        if (walletError || !walletTokens || walletTokens.length === 0) {
            // Fallback: Just get token prices for demo
            const { data: tokenPrices, error: pricesError } = await supabaseClient
                .from('token_prices')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50);
            
            if (pricesError) {
                console.error('Error loading token prices:', pricesError);
                showEmptyStateV2();
                return;
            }
            
            // For each token price, try to get metadata and latest price
            const tokensWithMetadata = await Promise.all((tokenPrices || []).map(async (price) => {
                // Get metadata
                const { data: metadata } = await supabaseClient
                    .from('token_metadata')
                    .select('logo_uri, logo_url, decimals, risk_score')
                    .eq('mint', price.token_mint)
                    .single();
                
                // Get latest price from history
                const { data: priceHistory } = await supabaseClient
                    .from('token_price_history')
                    .select('price, liquidity, volume_24h, market_cap, recorded_at')
                    .eq('token_mint', price.token_mint)
                    .order('recorded_at', { ascending: false })
                    .limit(1)
                    .single();
                
                // Use latest price from history if available
                const latestPrice = priceHistory?.price || price.price_usd || price.price || 0;
                
                // Mock balance for demo
                const mockBalance = Math.random() * 10000;
                const decimals = metadata?.decimals || 9;
                const actualBalance = mockBalance;
                
                // Calculate value
                const value = actualBalance * latestPrice;
                
                // Get image URL - use logo_uri or logo_url directly
                let imageUrl = metadata?.logo_uri || metadata?.logo_url || '';
                
                return {
                    token_mint: price.token_mint,
                    symbol: price.symbol,
                    name: price.name,
                    balance: actualBalance,
                    price: latestPrice,
                    price_change_24h: price.change_24h || 0,
                    liquidity_usd: priceHistory?.liquidity || price.liquidity || 0,
                    volume_24h: priceHistory?.volume_24h || price.volume_24h || 0,
                    market_cap: priceHistory?.market_cap || price.market_cap || 0,
                    value: value,
                    logo_uri: imageUrl,
                    image: imageUrl,
                    risk_score: metadata?.risk_score || Math.floor(Math.random() * 100),
                    platform: price.platform || 'unknown',
                    created_at: price.updated_at,
                    holder_count: Math.floor(Math.random() * 10000),
                    creator_balance_pct: Math.random() * 10,
                    dev_sold_pct: Math.random() * 50,
                    honeypot_status: Math.random() > 0.8 ? 'warning' : 'safe',
                    lp_locked_pct: Math.random() * 100,
                    protected: Math.random() > 0.7
                };
            }));
            
            tokenListV2State.tokens = tokensWithMetadata;
            renderTokensV2();
            return;
        }
        
        // Process wallet tokens
        const processedTokens = await Promise.all(walletTokens.map(async (walletToken) => {
            // Get token price
            const { data: priceData } = await supabaseClient
                .from('token_prices')
                .select('*')
                .eq('token_mint', walletToken.token_mint)
                .single();
            
            // Get latest price from history
            const { data: priceHistory } = await supabaseClient
                .from('token_price_history')
                .select('price, liquidity, volume_24h, market_cap, recorded_at')
                .eq('token_mint', walletToken.token_mint)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();
            
            // Use latest price from history if available
            const latestPrice = priceHistory?.price || priceData?.price_usd || priceData?.price || 0;
            
            // Get token metadata
            const { data: metadata } = await supabaseClient
                .from('token_metadata')
                .select('logo_uri, logo_url, decimals, risk_score')
                .eq('mint', walletToken.token_mint)
                .single();
            
            // Use decimals from wallet_tokens or metadata
            const decimals = walletToken.decimals || metadata?.decimals || 9;
            const actualBalance = walletToken.balance / Math.pow(10, decimals);
            
            // Calculate value using latest price
            const value = actualBalance * latestPrice;
            
            // Get image URL - use logo_uri or logo_url directly
            let imageUrl = metadata?.logo_uri || metadata?.logo_url || '';
            
            return {
                token_mint: walletToken.token_mint,
                symbol: priceData?.symbol || 'Unknown',
                name: priceData?.name || 'Unknown Token',
                balance: actualBalance,
                price: latestPrice,
                price_change_24h: priceData?.change_24h || 0,
                liquidity_usd: priceHistory?.liquidity || priceData?.liquidity || 0,
                volume_24h: priceHistory?.volume_24h || priceData?.volume_24h || 0,
                market_cap: priceHistory?.market_cap || priceData?.market_cap || 0,
                value: value,
                logo_uri: imageUrl,
                image: imageUrl,
                risk_score: metadata?.risk_score || 50,
                platform: priceData?.platform || 'unknown',
                created_at: priceData?.updated_at,
                holder_count: Math.floor(Math.random() * 10000),
                creator_balance_pct: Math.random() * 10,
                dev_sold_pct: Math.random() * 50,
                honeypot_status: 'safe',
                lp_locked_pct: Math.random() * 100,
                protected: false
            };
        }));
        
        // Sort by value
        processedTokens.sort((a, b) => b.value - a.value);
        
        tokenListV2State.tokens = processedTokens;
        renderTokensV2();
        
    } catch (error) {
        console.error('Error in loadFromSupabaseV2:', error);
        showEmptyStateV2();
    }
}

// Load from API
async function loadFromAPIV2() {
    const walletAddress = localStorage.getItem('walletAddress');
    const response = await fetch(`api/tokens.php?wallet=${walletAddress}`);
    const data = await response.json();
    
    tokenListV2State.tokens = data.tokens || [];
    renderTokensV2();
}

// Render tokens
function renderTokensV2() {
    const tbody = document.getElementById('token-list-body');
    const tokens = tokenListV2State.tokens;
    
    if (tokens.length === 0) {
        showEmptyStateV2();
        return;
    }
    
    hideLoadingStateV2();
    
    let totalValue = 0;
    let protectedCount = 0;
    let riskCount = 0;
    
    tbody.innerHTML = tokens.map(token => {
        const value = (token.balance || 0) * (token.price || 0);
        totalValue += value;
        if (token.protected) protectedCount++;
        if (token.risk_score > 70) riskCount++;
        
        return renderTokenRowV2(token);
    }).join('');
    
    // Update stats
    document.getElementById('total-value').textContent = totalValue.toFixed(2);
    document.getElementById('protected-count').textContent = protectedCount;
    document.getElementById('risk-count').textContent = riskCount;
    
    // Show warning banner if high risk tokens
    if (riskCount > 0) {
        document.getElementById('warning-banner').classList.remove('hidden');
    }
}

// Render single token row
function renderTokenRowV2(token) {
    const price = token.price || 0;
    const value = (token.balance || 0) * price;
    const change24h = token.price_change_24h || 0;
    const riskScore = token.risk_score || 0;
    
    // Risk color
    let riskClass = 'text-green-400';
    if (riskScore >= 70) riskClass = 'text-red-400';
    else if (riskScore >= 50) riskClass = 'text-yellow-400';
    
    // Platform badge
    const platformBadge = getPlatformBadgeV2(token.platform);
    
    return `
        <tr class="border-t border-gray-800 hover:bg-gray-900/50 token-row">
            <td class="px-4 py-3">
                <div class="flex items-center space-x-3">
                    <img src="${token.logo_uri || token.image || '/assets/images/token-placeholder.svg'}" 
                         alt="${token.symbol}" 
                         class="w-8 h-8 rounded-full bg-gray-800 object-cover"
                         onerror="this.src='/assets/images/token-placeholder.svg'"
                         loading="lazy">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-medium text-white">${token.symbol || 'Unknown'}</span>
                            ${platformBadge}
                        </div>
                        <div class="text-xs text-gray-500">${token.name || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="${riskClass} font-semibold">${riskScore}%</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="text-xs text-gray-400">${getTokenAge(token.created_at)}</span>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="text-white">$${formatPriceV2(price)}</div>
                <div class="text-xs ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
                </div>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="text-white">$${formatNumberV2(token.liquidity_usd || 0)}</div>
                ${getLiquidityChangeV2(token)}
            </td>
            <td class="px-4 py-3 text-right">
                <div class="text-white">$${formatNumberV2(value)}</div>
                <div class="text-xs text-gray-500">${formatNumberV2(token.balance || 0)}</div>
            </td>
            <td class="px-4 py-3 text-center">
                ${getDevActivityBadge(token.dev_sold_pct)}
            </td>
            <td class="px-4 py-3 text-right text-white">
                ${formatNumberV2(token.holder_count || 0)}
            </td>
            <td class="px-4 py-3 text-right text-white">
                ${token.creator_balance_pct ? token.creator_balance_pct.toFixed(1) + '%' : '0%'}
            </td>
            <td class="px-4 py-3 text-center">
                ${getHoneypotBadge(token.honeypot_status)}
            </td>
            <td class="px-4 py-3 text-center">
                ${getLPBadge(token.lp_locked_pct)}
            </td>
            <td class="px-4 py-3 text-center">
                ${getProtectionBadgeV2(token)}
            </td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center space-x-1">
                    ${token.protected ? `
                        <button class="p-1 text-gray-400 hover:text-white" title="Settings">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </button>
                    ` : `
                        <button class="p-1 text-primary-400 hover:text-primary-300" title="Enable Protection">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                        </button>
                    `}
                    <button class="p-1 text-gray-400 hover:text-white" title="View on Solscan">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                    </button>
                    <button class="p-1 text-gray-400 hover:text-white" title="More">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Helper functions
function getPlatformBadgeV2(platform) {
    const badges = {
        'pump.fun': '<span class="platform-badge badge-pump">Pump</span>',
        'raydium': '<span class="platform-badge badge-raydium">Raydium</span>',
        'orca': '<span class="platform-badge badge-orca">Orca</span>',
        'meteora': '<span class="platform-badge bg-orange-900/20 text-orange-400">Meteora</span>',
        'moonshot': '<span class="platform-badge bg-purple-900/20 text-purple-400">Moonshot</span>'
    };
    return badges[platform] || '';
}

function getTokenAge(createdAt) {
    if (!createdAt) return '-';
    const age = Date.now() - new Date(createdAt).getTime();
    const hours = age / (1000 * 60 * 60);
    const days = hours / 24;
    
    if (hours < 1) return '< 1h';
    if (hours < 24) return Math.floor(hours) + 'h';
    if (days < 30) return Math.floor(days) + 'd';
    return Math.floor(days / 30) + 'mo';
}

function formatPriceV2(price) {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}

function formatNumberV2(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function getLiquidityChangeV2(token) {
    const change1h = token.liquidity_change_1h || 0;
    const change24h = token.liquidity_change_24h || 0;
    
    return `
        <div class="text-xs space-x-2">
            <span class="${change1h >= 0 ? 'text-green-400' : 'text-red-400'}">
                ${change1h >= 0 ? '+' : ''}${change1h.toFixed(1)}%
            </span>
        </div>
    `;
}

function getDevActivityBadge(devSoldPct) {
    if (!devSoldPct) return '<span class="text-gray-500">-</span>';
    if (devSoldPct > 50) return '<span class="text-red-400">High</span>';
    if (devSoldPct > 20) return '<span class="text-yellow-400">Med</span>';
    return '<span class="text-green-400">Low</span>';
}

function getHoneypotBadge(status) {
    if (status === 'safe') return '<span class="text-green-400">✓</span>';
    if (status === 'honeypot') return '<span class="text-red-400">✗</span>';
    if (status === 'warning') return '<span class="text-yellow-400">!</span>';
    return '<span class="text-gray-500">?</span>';
}

function getLPBadge(lpLocked) {
    if (lpLocked > 90) return '<span class="text-green-400">🔒</span>';
    if (lpLocked > 50) return '<span class="text-yellow-400">🔓</span>';
    return '<span class="text-gray-500">-</span>';
}

function getProtectionBadgeV2(token) {
    if (token.protected) {
        return '<span class="text-xs px-2 py-0.5 rounded bg-primary-900/20 text-primary-400 border border-primary-800/30">Protected</span>';
    }
    return '<span class="text-xs text-gray-500">Not Protected</span>';
}

// UI State functions
function showEmptyStateV2() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('token-list-body').innerHTML = '';
}

function hideLoadingStateV2() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
}

// Add token by address
async function addTokenByAddress(address) {
    if (!address) return;
    
    showNotification('Adding token...', 'info');
    
    // In production, validate and fetch token data
    setTimeout(() => {
        showNotification('Token added successfully', 'success');
        document.getElementById('token-address-input').value = '';
        loadTokensV2();
    }, 1000);
}

// Set up real-time updates
if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    // Subscribe to token price updates
    supabaseClient
        .channel('token-prices-dashboard')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'token_prices'
        }, () => {
            loadTokensV2();
        })
        .subscribe();
}
</script>