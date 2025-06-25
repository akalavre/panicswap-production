<?php
// Include the token display helper
require_once __DIR__ . '/helpers/token-display.php';
?>
<!-- Token List Component -->
<div class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-800">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-semibold">Your Tokens</h2>
                <div class="flex items-center gap-4 mt-1">
                    <span class="text-sm text-gray-400">
                        Total Value: $<span id="total-portfolio-value">0.00</span>
                    </span>
                    <span class="text-sm text-gray-400">•</span>
                    <div id="hidden-tokens-count" class="hidden">
                        <button onclick="showAllHiddenTokens()" class="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                            </svg>
                            <span id="hidden-count">0</span> hidden
                        </button>
                        <span class="text-sm text-gray-400">•</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        <span class="text-sm text-gray-400"><span id="protected-count">0</span> Protected</span>
                    </div>
                </div>
            </div>
            
            <!-- Controls -->
            <div class="flex gap-2 items-center">
                <!-- Auto Protection Toggle -->
                <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
                    <span class="text-xs text-gray-400">Auto-Protect</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="auto-protect-toggle" class="sr-only peer">
                        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>
                
                <!-- Filter Dropdown -->
                <button id="filter-btn" onclick="toggleFilter()" class="btn btn-outline px-3 py-1.5 text-xs flex items-center">
                    <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                    <span id="filter-text">All Tokens</span>
                </button>
                
                <!-- Refresh Button -->
                <button onclick="refreshTokenList()" class="btn btn-outline px-3 py-1.5 text-xs flex items-center">
                    <svg id="refresh-icon" class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                </button>
                
                <!-- View Toggle -->
                <button onclick="toggleCompactMode()" class="btn btn-outline px-3 py-1.5 text-xs flex items-center">
                    <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                    </svg>
                    <span id="view-mode-text">Compact</span>
                </button>
                
                <!-- Balance Toggle -->
                <button onclick="toggleBalances()" class="btn btn-outline px-3 py-1.5 text-xs flex items-center">
                    <svg id="balance-icon" class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <span id="balance-text">Hide</span>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Manual Token Input -->
    <div class="px-6 py-3 border-b border-gray-800 bg-gray-800/50">
        <div class="flex items-center gap-2">
            <input 
                type="text" 
                id="manual-token-input" 
                placeholder="Add token by mint address (for testing)" 
                class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
            >
            <button onclick="addManualToken()" class="btn btn-primary px-4 py-1.5 text-xs">
                Add Token
            </button>
        </div>
    </div>
    
    <!-- Table -->
    <div class="overflow-x-auto">
        <table class="w-full" id="token-table">
            <thead class="bg-gray-800/50">
                <tr id="table-header-full" class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <th class="px-6 py-3">Token</th>
                    <th class="px-6 py-3 text-center">Risk</th>
                    <th class="px-6 py-3">Age</th>
                    <th class="px-6 py-3 text-right">Price</th>
                    <th class="px-6 py-3 text-right">Liquidity</th>
                    <th class="px-6 py-3 text-right">Value</th>
                    <th class="px-6 py-3 text-center">Dev</th>
                    <th class="px-6 py-3 text-right">Holders</th>
                    <th class="px-6 py-3 text-right">Creator %</th>
                    <th class="px-6 py-3 text-center">Sell</th>
                    <th class="px-6 py-3 text-center">LP</th>
                    <th class="px-6 py-3">Protection</th>
                    <th class="px-6 py-3 text-right">Actions</th>
                </tr>
                <tr id="table-header-compact" class="hidden text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <th class="px-6 py-3">Token</th>
                    <th class="px-6 py-3 text-center">Risk</th>
                    <th class="px-6 py-3 text-right">Price</th>
                    <th class="px-6 py-3 text-right">Liquidity</th>
                    <th class="px-6 py-3 text-right">Value</th>
                    <th class="px-6 py-3">Protection</th>
                    <th class="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody id="tokens-tbody" class="divide-y divide-gray-800">
                <!-- Tokens will be dynamically added here -->
            </tbody>
        </table>
        
        <!-- Loading State -->
        <div id="loading-state" class="hidden">
            <div class="flex items-center justify-center py-12">
                <svg class="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2 text-gray-400">Loading wallet tokens...</span>
            </div>
        </div>
        
        <!-- Empty State -->
        <div id="empty-state" class="hidden">
            <div class="text-center py-12">
                <svg class="h-12 w-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
                <p class="text-gray-400" id="empty-message">No tokens found in your wallet</p>
                <p class="text-sm text-gray-500 mt-2" id="empty-submessage">
                    Transfer some SPL tokens to see them here
                </p>
            </div>
        </div>
    </div>
    
    <!-- DEX Coverage Notice -->
    <div class="px-6 py-4 bg-gradient-to-r from-primary-900/10 to-purple-900/10 border-t border-gray-800">
        <div class="flex items-start space-x-3">
            <svg class="h-5 w-5 text-primary-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-300">
                    DEX Coverage: <span id="dex-coverage">All Major DEXs</span>
                </p>
                <p class="text-xs text-gray-400 mt-1">
                    Showing tokens from Raydium, Orca, Jupiter, and memecoin platforms
                </p>
            </div>
        </div>
    </div>
</div>

<!-- Token List JavaScript -->
<script>
// Token List State
let tokenListState = {
    tokens: [],
    filter: 'all', // all, protected, unprotected
    showBalances: true,
    compactMode: false,
    hiddenTokens: new Set(JSON.parse(localStorage.getItem('hiddenTokens') || '[]')),
    autoProtect: false,
    loading: false,
    realtimePrices: {}
};

// Initialize token list
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    const initializeTokenList = () => {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            // Load auto-protect state
            tokenListState.autoProtect = localStorage.getItem('autoProtect') === 'true';
            document.getElementById('auto-protect-toggle').checked = tokenListState.autoProtect;
            
            // Set up auto-protect toggle
            document.getElementById('auto-protect-toggle').addEventListener('change', function(e) {
                tokenListState.autoProtect = e.target.checked;
                localStorage.setItem('autoProtect', e.target.checked);
                showNotification(`Auto-protect ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });
            
            // Load token list from Supabase
            loadTokenListFromSupabase();
            
            // Set up real-time subscriptions
            setupRealtimeSubscriptions();
        } else {
            // Fallback to API if Supabase not available
            loadTokenList();
            setInterval(loadTokenList, 60000);
        }
    };
    
    // Check if Supabase is already loaded
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        initializeTokenList();
    } else {
        // Wait for Supabase to load
        setTimeout(initializeTokenList, 1000);
    }
});

// Load token list from API
async function loadTokenList() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
        showEmptyState('Connect your wallet to see tokens');
        return;
    }
    
    tokenListState.loading = true;
    showLoadingState();
    
    try {
        const response = await fetch(`api/tokens.php?wallet=${walletAddress}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        tokenListState.tokens = data.tokens || [];
        renderTokenList();
        updateStats();
        
        // Subscribe to realtime updates
        subscribeToRealtimeUpdates();
        
    } catch (error) {
        console.error('Error loading tokens:', error);
        showEmptyState('Failed to load tokens. Please try again.');
    } finally {
        tokenListState.loading = false;
    }
}

// Render token list
function renderTokenList() {
    const tbody = document.getElementById('tokens-tbody');
    const filteredTokens = getFilteredTokens();
    
    if (filteredTokens.length === 0) {
        showEmptyState(getEmptyMessage());
        return;
    }
    
    hideEmptyState();
    
    tbody.innerHTML = filteredTokens.map(token => 
        tokenListState.compactMode ? renderCompactTokenRow(token) : renderFullTokenRow(token)
    ).join('');
    
    // Update stats
    updateStats();
}

// Helper to get token image URL
function getTokenImageUrl(token) {
    // For tokens with pending metadata, return null to trigger loading animation
    if (token.metadata_status === 'pending') {
        return null;
    }
    
    if (!token.image || token.image === '') {
        return null; // Will trigger loading animation
    }
    
    // If it's already a full URL, use it directly
    if (token.image.startsWith('http')) {
        return token.image;
    }
    
    // Handle IPFS URLs
    if (token.image.startsWith('ipfs://')) {
        const ipfsHash = token.image.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    return token.image;
}

// JavaScript version of token display helper
function renderTokenDisplay(token) {
    // Check if token has pending metadata
    const isPending = token.metadata_status === 'pending';
    
    if (isPending) {
        // Return loading state with gradient animation
        return `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full token-loader"></div>
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="font-medium token-loading-text">Loading...</span>
                    </div>
                    <div class="text-xs text-gray-500">Fetching metadata</div>
                </div>
            </div>
        `;
    }
    
    // Normal token display
    const symbol = token.symbol || 'UNKNOWN';
    const name = token.name || 'Unknown Token';
    const imageUrl = getTokenImageUrl(token);
    const platformBadge = token.platform ? getPlatformBadge(token.platform) : '';
    const bundlerBadge = token.bundlerCount > 0 ? getBundlerBadge(token.bundlerCount) : '';
    
    return `
        <div class="flex items-center space-x-3">
            ${imageUrl ? 
                `<img src="${imageUrl}" 
                     alt="${symbol}" 
                     class="w-8 h-8 rounded-full bg-gray-700 object-cover"
                     onerror="this.onerror=null; this.classList.add('token-loader');">` :
                `<div class="w-8 h-8 rounded-full token-loader"></div>`
            }
            <div>
                <div class="flex items-center space-x-2">
                    <span class="font-medium">${symbol}</span>
                    ${platformBadge}
                    ${bundlerBadge}
                </div>
                <div class="text-xs text-gray-500">${name}</div>
            </div>
        </div>
    `;
}

// Render full token row
function renderFullTokenRow(token) {
    const price = tokenListState.realtimePrices[token.mint]?.price || token.price;
    const value = token.balance * price;
    const change24h = token.change24h || 0;
    const changeClass = change24h >= 0 ? 'text-green-400' : 'text-red-400';
    const changeIcon = change24h >= 0 ? '↑' : '↓';
    const imageUrl = getTokenImageUrl(token);
    
    return `
        <tr class="hover:bg-gray-800/50 transition-colors">
            <td class="px-6 py-4">
                ${renderTokenDisplay(token)}
            </td>
            <td class="px-6 py-4 text-center">
                ${getRiskScoreBadge(token.riskScore || 0)}
            </td>
            <td class="px-6 py-4">
                ${getAgeBadge(token.launchTime)}
            </td>
            <td class="px-6 py-4 text-right">
                <div>$${formatPrice(price)}</div>
                <div class="text-xs ${changeClass}">
                    ${changeIcon} ${Math.abs(change24h).toFixed(2)}%
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div>$${formatNumber(token.liquidity || 0)}</div>
                ${getLiquidityChange(token)}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="${tokenListState.showBalances ? '' : 'blur-sm'}">
                    $${formatNumber(value)}
                </div>
                <div class="text-xs text-gray-500 ${tokenListState.showBalances ? '' : 'blur-sm'}">
                    ${formatNumber(token.balance)}
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                ${getDevActivityIndicator(token.devActivity)}
            </td>
            <td class="px-6 py-4 text-right">
                ${formatNumber(token.holders || 0)}
            </td>
            <td class="px-6 py-4 text-right">
                ${token.creatorPercent ? token.creatorPercent.toFixed(1) + '%' : '-'}
            </td>
            <td class="px-6 py-4 text-center">
                ${getHoneypotStatus(token.honeypotStatus)}
            </td>
            <td class="px-6 py-4 text-center">
                ${getLPStatus(token.lpLocked)}
            </td>
            <td class="px-6 py-4">
                ${getProtectionBadges(token)}
            </td>
            <td class="px-6 py-4 text-right">
                ${getActionButtons(token)}
            </td>
        </tr>
    `;
}

// Render compact token row
function renderCompactTokenRow(token) {
    const price = tokenListState.realtimePrices[token.mint]?.price || token.price;
    const value = token.balance * price;
    const change24h = token.change24h || 0;
    const changeClass = change24h >= 0 ? 'text-green-400' : 'text-red-400';
    const imageUrl = getTokenImageUrl(token);
    
    return `
        <tr class="hover:bg-gray-800/50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" 
                             alt="${token.symbol}" 
                             class="w-8 h-8 rounded-full bg-gray-700 object-cover"
                             onerror="this.onerror=null; this.classList.add('token-loader');">` :
                        `<div class="w-8 h-8 rounded-full token-loader"></div>`
                    }
                    <div>
                        <span class="font-medium">${token.symbol}</span>
                        <span class="text-xs text-gray-500 ml-2">${token.name}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                ${getRiskScoreBadge(token.riskScore || 0)}
            </td>
            <td class="px-6 py-4 text-right">
                <div>$${formatPrice(price)}</div>
                <div class="text-xs ${changeClass}">${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%</div>
            </td>
            <td class="px-6 py-4 text-right">
                $${formatNumber(token.liquidity || 0)}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="${tokenListState.showBalances ? '' : 'blur-sm'}">
                    $${formatNumber(value)}
                </div>
            </td>
            <td class="px-6 py-4">
                ${getProtectionBadges(token)}
            </td>
            <td class="px-6 py-4 text-right">
                ${getActionButtons(token, true)}
            </td>
        </tr>
    `;
}

// Helper functions for rendering
function getPlatformBadge(platform) {
    const platforms = {
        'pump.fun': { color: 'bg-green-900/50 text-green-400', label: 'Pump' },
        'moonshot': { color: 'bg-purple-900/50 text-purple-400', label: 'Moon' },
        'raydium': { color: 'bg-blue-900/50 text-blue-400', label: 'Ray' },
        'meteora': { color: 'bg-orange-900/50 text-orange-400', label: 'Met' }
    };
    
    const p = platforms[platform] || { color: 'bg-gray-900/50 text-gray-400', label: platform };
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.color}">${p.label}</span>`;
}

function getBundlerBadge(count) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        ${count} Bundlers
    </span>`;
}

function getRiskScoreBadge(score) {
    let color, label;
    if (score >= 80) {
        color = 'text-red-500';
        label = score;
    } else if (score >= 60) {
        color = 'text-orange-500';
        label = score;
    } else if (score >= 40) {
        color = 'text-yellow-500';
        label = score;
    } else {
        color = 'text-green-500';
        label = score;
    }
    
    return `<span class="font-semibold ${color}">${label}</span>`;
}

function getAgeBadge(launchTime) {
    if (!launchTime) return '<span class="text-gray-500">-</span>';
    
    const now = Date.now();
    const launch = new Date(launchTime).getTime();
    const ageMs = now - launch;
    const ageHours = ageMs / (1000 * 60 * 60);
    const ageDays = ageHours / 24;
    
    if (ageHours < 1) {
        return '<span class="text-red-400">< 1h</span>';
    } else if (ageHours < 24) {
        return `<span class="text-orange-400">${Math.floor(ageHours)}h</span>`;
    } else if (ageDays < 7) {
        return `<span class="text-yellow-400">${Math.floor(ageDays)}d</span>`;
    } else {
        return `<span class="text-green-400">${Math.floor(ageDays)}d</span>`;
    }
}

function getLiquidityChange(token) {
    const change1h = token.liquidityChange1h || 0;
    const change24h = token.liquidityChange24h || 0;
    
    return `
        <div class="flex items-center gap-2 text-xs">
            <span class="${change1h >= 0 ? 'text-green-400' : 'text-red-400'}">
                1h: ${change1h >= 0 ? '+' : ''}${change1h.toFixed(1)}%
            </span>
            <span class="${change24h >= 0 ? 'text-green-400' : 'text-red-400'}">
                24h: ${change24h >= 0 ? '+' : ''}${change24h.toFixed(1)}%
            </span>
        </div>
    `;
}

function getDevActivityIndicator(activity) {
    if (!activity) return '<span class="text-gray-500">-</span>';
    
    const soldPercent = activity.soldPercent || 0;
    if (soldPercent > 50) {
        return '<span class="text-red-400">High</span>';
    } else if (soldPercent > 20) {
        return '<span class="text-yellow-400">Med</span>';
    } else if (soldPercent > 0) {
        return '<span class="text-green-400">Low</span>';
    } else {
        return '<span class="text-gray-400">None</span>';
    }
}

function getHoneypotStatus(status) {
    if (status === 'safe') {
        return '<span class="text-green-400">✓</span>';
    } else if (status === 'honeypot') {
        return '<span class="text-red-400">✗</span>';
    } else if (status === 'warning') {
        return '<span class="text-yellow-400">!</span>';
    } else {
        return '<span class="text-gray-500">?</span>';
    }
}

function getLPStatus(lpLocked) {
    if (lpLocked > 90) {
        return '<span class="text-green-400">🔒</span>';
    } else if (lpLocked > 50) {
        return '<span class="text-yellow-400">🔓</span>';
    } else {
        return '<span class="text-gray-500">-</span>';
    }
}

function getProtectionBadges(token) {
    const badges = [];
    
    if (token.protected) {
        badges.push('<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-900/50 text-primary-400">Protected</span>');
    }
    
    if (tokenListState.autoProtect && !token.protected) {
        badges.push(`
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" onchange="toggleAutoProtection('${token.mint}', this.checked)">
                <div class="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
        `);
    }
    
    return badges.join(' ');
}

function getActionButtons(token, compact = false) {
    const buttons = [];
    
    // Shield/Settings button
    if (token.protected) {
        buttons.push(`
            <button onclick="openTokenSettings('${token.mint}')" class="text-gray-400 hover:text-white p-1" title="Protection Settings">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </button>
        `);
    } else {
        buttons.push(`
            <button onclick="protectToken('${token.mint}')" class="text-primary-400 hover:text-primary-300 p-1" title="Enable Protection">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
            </button>
        `);
    }
    
    if (!compact) {
        // View on Solscan
        buttons.push(`
            <button onclick="viewOnSolscan('${token.mint}')" class="text-gray-400 hover:text-white p-1" title="View on Solscan">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
            </button>
        `);
        
        // Hide token
        buttons.push(`
            <button onclick="hideToken('${token.mint}')" class="text-gray-400 hover:text-white p-1" title="Hide Token">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
            </button>
        `);
    }
    
    return `<div class="flex items-center justify-end space-x-1">${buttons.join('')}</div>`;
}

// Filter functions
function toggleFilter() {
    const filters = ['all', 'protected', 'unprotected'];
    const currentIndex = filters.indexOf(tokenListState.filter);
    tokenListState.filter = filters[(currentIndex + 1) % filters.length];
    
    const filterText = document.getElementById('filter-text');
    filterText.textContent = tokenListState.filter === 'all' ? 'All Tokens' : 
                             tokenListState.filter === 'protected' ? 'Protected Only' : 
                             'Unprotected Only';
    
    renderTokenList();
}

function getFilteredTokens() {
    let tokens = tokenListState.tokens.filter(t => !tokenListState.hiddenTokens.has(t.mint));
    
    switch (tokenListState.filter) {
        case 'protected':
            return tokens.filter(t => t.protected);
        case 'unprotected':
            return tokens.filter(t => !t.protected);
        default:
            return tokens;
    }
}

// View toggles
function toggleCompactMode() {
    tokenListState.compactMode = !tokenListState.compactMode;
    document.getElementById('view-mode-text').textContent = tokenListState.compactMode ? 'Full' : 'Compact';
    document.getElementById('table-header-full').classList.toggle('hidden', tokenListState.compactMode);
    document.getElementById('table-header-compact').classList.toggle('hidden', !tokenListState.compactMode);
    renderTokenList();
}

function toggleBalances() {
    tokenListState.showBalances = !tokenListState.showBalances;
    document.getElementById('balance-text').textContent = tokenListState.showBalances ? 'Hide' : 'Show';
    document.getElementById('balance-icon').innerHTML = tokenListState.showBalances ? 
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>' :
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    renderTokenList();
}

// Token actions
function protectToken(mint) {
    showNotification('Opening protection modal...', 'info');
    // In production, this would open the protection modal
    window.location.href = `dashboard.php?token=${mint}`;
}

function openTokenSettings(mint) {
    showNotification('Opening token settings...', 'info');
    // In production, this would open settings modal
}

function viewOnSolscan(mint) {
    window.open(`https://solscan.io/token/${mint}`, '_blank');
}

function hideToken(mint) {
    tokenListState.hiddenTokens.add(mint);
    localStorage.setItem('hiddenTokens', JSON.stringify(Array.from(tokenListState.hiddenTokens)));
    renderTokenList();
    showNotification('Token hidden', 'info');
}

function showAllHiddenTokens() {
    tokenListState.hiddenTokens.clear();
    localStorage.setItem('hiddenTokens', '[]');
    renderTokenList();
    showNotification('All tokens restored', 'success');
}

// Manual token input
async function addManualToken() {
    const input = document.getElementById('manual-token-input');
    const mint = input.value.trim();
    
    if (!mint) {
        showNotification('Please enter a token mint address', 'error');
        return;
    }
    
    // In production, this would validate the mint and fetch token data
    showNotification('Adding token...', 'info');
    
    // Simulate adding token
    setTimeout(() => {
        showNotification('Token added successfully', 'success');
        input.value = '';
        loadTokenList();
    }, 1000);
}

// Auto protection toggle
function toggleAutoProtection(mint, enabled) {
    if (enabled && tokenListState.autoProtect) {
        showNotification('Auto-protection enabled for token', 'success');
        // In production, this would enable protection
    }
}

// Refresh token list
function refreshTokenList() {
    const icon = document.getElementById('refresh-icon');
    icon.classList.add('animate-spin');
    loadTokenList().finally(() => {
        icon.classList.remove('animate-spin');
    });
}

// Update stats
function updateStats() {
    const visibleTokens = getFilteredTokens();
    const totalValue = visibleTokens.reduce((sum, token) => {
        const price = tokenListState.realtimePrices[token.mint]?.price || token.price;
        return sum + (token.balance * price);
    }, 0);
    
    const protectedCount = tokenListState.tokens.filter(t => 
        !tokenListState.hiddenTokens.has(t.mint) && t.protected
    ).length;
    
    document.getElementById('total-portfolio-value').textContent = formatNumber(totalValue);
    // Only update protected count if we have a list-specific element
    const protectedCountList = document.getElementById('protected-count-list');
    if (protectedCountList) {
        protectedCountList.textContent = protectedCount;
    }
    document.getElementById('hidden-count').textContent = tokenListState.hiddenTokens.size;
    document.getElementById('hidden-tokens-count').classList.toggle('hidden', tokenListState.hiddenTokens.size === 0);
}

// UI state functions
function showLoadingState() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('tokens-tbody').innerHTML = '';
}

function showEmptyState(message) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('empty-message').textContent = message;
    document.getElementById('tokens-tbody').innerHTML = '';
}

function hideEmptyState() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
}

function getEmptyMessage() {
    if (tokenListState.filter === 'protected') {
        return 'No protected tokens yet.';
    } else if (tokenListState.filter === 'unprotected') {
        return 'All your tokens are protected!';
    } else if (tokenListState.tokens.length === 0) {
        return 'No tokens found in your wallet';
    } else {
        return 'No tokens match the current filter';
    }
}

// Format helpers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    } else {
        return num.toFixed(2);
    }
}

function formatPrice(price) {
    if (price < 0.00001) {
        return price.toExponential(2);
    } else if (price < 0.01) {
        return price.toFixed(6);
    } else if (price < 1) {
        return price.toFixed(4);
    } else {
        return price.toFixed(2);
    }
}

// Load token list from Supabase
async function loadTokenListFromSupabase() {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress || !supabaseClient) {
        showEmptyState('Connect your wallet to see tokens');
        return;
    }
    
    tokenListState.loading = true;
    showLoadingState();
    
    try {
        // First, get user from wallet address
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (userError || !userData) {
            console.log('User not found in Supabase, falling back to API');
            loadTokenList();
            return;
        }
        
        // Get protected tokens for this user
        const { data: protectedTokens, error: protectedError } = await supabaseClient
            .from('protected_tokens')
            .select('*')
            .eq('user_id', userData.id);
        
        // Get token prices from token_prices table
        const { data: tokenPrices, error: pricesError } = await supabaseClient
            .from('token_prices')
            .select('*')
            .order('updated_at', { ascending: false });
        
        // Get wallet tokens (this would normally come from blockchain)
        // For now, we'll use the token_prices data as a proxy
        const tokens = await Promise.all(tokenPrices?.map(async priceData => {
            const isProtected = protectedTokens?.some(pt => pt.token_mint === priceData.token_mint);
            
            // Get token metadata for image
            const { data: metadata } = await supabaseClient
                .from('token_metadata')
                .select('logo_uri, logo_url, decimals')
                .eq('mint', priceData.token_mint)
                .single();
            
            // Get latest price from history
            const { data: priceHistory } = await supabaseClient
                .from('token_price_history')
                .select('price, liquidity, volume_24h, market_cap, recorded_at')
                .eq('token_mint', priceData.token_mint)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();
            
            // Use latest price from history if available
            const latestPrice = priceHistory?.price || priceData.price_usd || priceData.price || 0;
            
            // Use logo_uri or logo_url from metadata
            const imageUrl = metadata?.logo_uri || metadata?.logo_url || '';
            
            return {
                mint: priceData.token_mint,
                symbol: priceData.symbol || 'Unknown',
                name: priceData.name || 'Unknown Token',
                balance: Math.random() * 100000, // Simulated balance
                decimals: metadata?.decimals || priceData.decimals || 9,
                price: latestPrice,
                value: 0, // Will be calculated
                change24h: priceData.price_change_24h || 0,
                liquidity: priceHistory?.liquidity || priceData.liquidity_usd || 0,
                liquidityChange1h: priceData.liquidity_change_1h || 0,
                liquidityChange24h: priceData.liquidity_change_24h || 0,
                marketCap: priceHistory?.market_cap || priceData.market_cap || 0,
                image: imageUrl,
                platform: priceData.platform || 'unknown',
                riskScore: priceData.risk_score || 0,
                isMemecoin: priceData.is_meme_token || false,
                launchTime: priceData.created_at,
                honeypotStatus: priceData.honeypot_status || 'unknown',
                lpLocked: priceData.lp_locked_pct || 0,
                holders: priceData.holder_count || 0,
                creatorPercent: priceData.creator_balance_pct || 0,
                bundlerCount: priceData.bundler_count || 0,
                devActivity: priceData.dev_sold_pct ? {
                    soldPercent: priceData.dev_sold_pct,
                    lastActivityTime: priceData.updated_at
                } : null,
                protected: isProtected,
                protectionSettings: isProtected ? protectedTokens.find(pt => pt.token_mint === priceData.token_mint) : null
            };
        })) || [];
        
        // Calculate values
        tokens.forEach(token => {
            token.value = token.balance * token.price;
        });
        
        tokenListState.tokens = tokens;
        renderTokenList();
        updateStats();
        
    } catch (error) {
        console.error('Error loading tokens from Supabase:', error);
        // Fallback to API
        loadTokenList();
    } finally {
        tokenListState.loading = false;
    }
}

// Set up real-time subscriptions
function setupRealtimeSubscriptions() {
    if (!supabaseClient) return;
    
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return;
    
    // Subscribe to token price updates
    const priceChannel = supabaseClient
        .channel('token-prices-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'token_prices'
        }, (payload) => {
            handlePriceUpdate(payload);
        })
        .subscribe();
    
    // Subscribe to protected tokens updates
    supabaseClient
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single()
        .then(({ data: userData }) => {
            if (userData) {
                const protectionChannel = supabaseClient
                    .channel(`protected-tokens-${userData.id}`)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'protected_tokens',
                        filter: `user_id=eq.${userData.id}`
                    }, (payload) => {
                        handleProtectionUpdate(payload);
                    })
                    .subscribe();
            }
        });
}

// Handle real-time price updates
function handlePriceUpdate(payload) {
    console.log('Price update received:', payload);
    
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const priceData = payload.new;
        const tokenIndex = tokenListState.tokens.findIndex(t => t.mint === priceData.token_address);
        
        if (tokenIndex !== -1) {
            // Update existing token
            const token = tokenListState.tokens[tokenIndex];
            token.price = priceData.price || token.price;
            token.change24h = priceData.price_change_24h || token.change24h;
            token.liquidity = priceData.liquidity_usd || token.liquidity;
            token.liquidityChange1h = priceData.liquidity_change_1h || token.liquidityChange1h;
            token.liquidityChange24h = priceData.liquidity_change_24h || token.liquidityChange24h;
            token.marketCap = priceData.market_cap || token.marketCap;
            token.riskScore = priceData.risk_score || token.riskScore;
            token.holders = priceData.holder_count || token.holders;
            token.value = token.balance * token.price;
            
            // Update realtime prices cache
            tokenListState.realtimePrices[token.mint] = {
                price: token.price,
                change24h: token.change24h,
                liquidity: token.liquidity
            };
            
            // Re-render just this row if possible, or the whole list
            renderTokenList();
            updateStats();
        }
    }
}

// Handle protection status updates
function handleProtectionUpdate(payload) {
    console.log('Protection update received:', payload);
    
    if (payload.eventType === 'INSERT') {
        // Token was protected
        const protectedToken = payload.new;
        const tokenIndex = tokenListState.tokens.findIndex(t => t.mint === protectedToken.token_mint);
        if (tokenIndex !== -1) {
            tokenListState.tokens[tokenIndex].protected = true;
            tokenListState.tokens[tokenIndex].protectionSettings = protectedToken;
            renderTokenList();
            updateStats();
        }
    } else if (payload.eventType === 'DELETE') {
        // Protection was removed
        const unprotectedToken = payload.old;
        const tokenIndex = tokenListState.tokens.findIndex(t => t.mint === unprotectedToken.token_mint);
        if (tokenIndex !== -1) {
            tokenListState.tokens[tokenIndex].protected = false;
            tokenListState.tokens[tokenIndex].protectionSettings = null;
            renderTokenList();
            updateStats();
        }
    } else if (payload.eventType === 'UPDATE') {
        // Protection settings updated
        const updatedToken = payload.new;
        const tokenIndex = tokenListState.tokens.findIndex(t => t.mint === updatedToken.token_mint);
        if (tokenIndex !== -1) {
            tokenListState.tokens[tokenIndex].protectionSettings = updatedToken;
            renderTokenList();
        }
    }
}

// Subscribe to realtime updates (legacy function for compatibility)
function subscribeToRealtimeUpdates() {
    // This is now handled by setupRealtimeSubscriptions
    console.log('Real-time subscriptions are handled by Supabase');
}
</script>