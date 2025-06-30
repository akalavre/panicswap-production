// Token List V3 JavaScript Module
// Extracted from token-list-v3.php to reduce file size

// Token List V3 State
let tokenListV3State = {
    tokens: [],
    loading: true,
    filter: 'all',
    showBalances: true,
    hiddenTokens: new Set(),
    recentChanges: new Map(),
    autoProtectEnabled: false, // Will be loaded from Supabase
    autoProtectProcessing: false
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard] Token list v3 initializing...');
    console.log('[Dashboard] Backend URL:', window.BACKEND_URL || 'http://localhost:3001');
    
    // Export state for global access
    window.tokenListV3State = tokenListV3State;
    
    // Wait for Supabase to load
    const waitForSupabase = setInterval(() => {
        if (window.supabase && window.supabaseClient) {
            clearInterval(waitForSupabase);
            console.log('Supabase client ready, loading tokens...');
            console.log('[Dashboard] Starting initial token load...');
            loadTokensV3();
            
            // Initialize auto-protect toggle
            initializeAutoProtectToggle();
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(waitForSupabase);
        console.log('Supabase timeout, loading with mock data...');
        loadTokensV3();
    }, 5000);
    
    // Auto-protect toggle
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (autoProtectToggle) {
        autoProtectToggle.addEventListener('change', function(e) {
            tokenListV3State.autoProtectEnabled = e.target.checked;
            updateAutoProtectUI();
            console.log('Auto-protect:', e.target.checked);
        });
    }
});

// Load tokens
async function loadTokensV3() {
    tokenListV3State.loading = true;
    
    // Show loading skeleton
    if (window.TokenSkeleton && window.TokenSkeleton.showLoading) {
        window.TokenSkeleton.showLoading('token-list-tbody-v3', 5);
    }
    
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await loadFromSupabaseV3();
        } else {
            showEmptyStateV3();
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
        // Show error state if available
        if (window.TokenSkeleton && window.TokenSkeleton.createErrorState) {
            const tbody = document.getElementById('token-list-tbody-v3');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="12">${window.TokenSkeleton.createErrorState('Failed to load tokens', 'loadTokensV3()')}</td></tr>`;
            }
        } else {
            showEmptyStateV3();
        }
    }
}

// Load from Supabase using comprehensive fetcher
async function loadFromSupabaseV3() {
    const walletAddress = window.walletState?.getState()?.address || null;
    
    try {
        // Use the new TokenDataManager if available, fallback to SupabaseTokenFetcher
        const tokenFetcher = window.TokenDataManager || window.SupabaseTokenFetcher;
        
        if (tokenFetcher) {
            let tokens;
            
            if (walletAddress) {
                console.log('Fetching tokens for wallet:', walletAddress);
                tokens = await tokenFetcher.fetchDashboardTokens(walletAddress);
            } else {
                console.log('No wallet connected');
                showEmptyStateV3();
                return;
            }
            
            if (tokens && tokens.length > 0) {
                console.log('Loaded token data:', tokens);
                
                // Filter tokens (no hidden tokens feature for now)
                const filteredTokens = tokens;
                
                // Preserve recent protection state changes
                if (tokenListV3State.recentChanges && tokenListV3State.recentChanges.size > 0) {
                    filteredTokens.forEach(token => {
                        const recentChange = tokenListV3State.recentChanges.get(token.token_mint);
                        if (recentChange && (Date.now() - recentChange.timestamp) < 5000) {
                            console.log(`Preserving recent protection state for ${token.symbol}: ${recentChange.state}`);
                            token.protected = recentChange.state;
                            token.monitoring_active = recentChange.state;
                        }
                    });
                }
                
                tokenListV3State.tokens = filteredTokens;
                
                // Auto-protect new tokens if auto-protect is enabled
                await autoProtectNewTokens(filteredTokens, walletAddress);
                
                renderTokensV3();
                hideLoadingStateV3();
                
                return;
            } else {
                console.log('No tokens found');
                showEmptyStateV3();
            }
        } else {
            console.log('Token fetcher not available');
            showEmptyStateV3();
        }
        
    } catch (error) {
        console.error('Error in loadFromSupabaseV3:', error);
        showEmptyStateV3();
    }
}

// Render a single token row
function renderTokenRowV3(token, showBalances) {
    const tokenMint = token.token_mint;
    
    // Format age
    const ageHtml = token.age ? 
        `<div class="inline-flex items-center gap-1 ${Number(token.age.raw_days) < 7 ? 'text-red-400' : Number(token.age.raw_days) < 30 ? 'text-yellow-400' : 'text-blue-400'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock w-3.5 h-3.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span class="text-xs font-medium">${token.age.value}${token.age.unit}</span>
        </div>` : '<span class="text-xs text-gray-500">-</span>';
    
    // Format price
    const priceHtml = token.price && Number(token.price) > 0 ? 
        `<span class="text-sm text-gray-100">$${Number(token.price).toFixed(8)}</span>` : 
        `<span class="text-sm text-gray-500">$0</span>`;
    
    // Format balance
    const balanceHtml = `
        <div class="flex flex-col gap-1">
            <span class="price-significant tracking-tight text-sm font-semibold text-gray-100">${formatNumberV3(token.balance_ui || 0)}</span>
            <div class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-500/10 border-gray-500/20 border self-end whitespace-nowrap">
                <span class="text-xs font-medium text-gray-400">${token.symbol || 'TOKEN'}</span>
            </div>
        </div>`;
    
    // Format value
    const valueHtml = showBalances ? 
        `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${formatNumberV3(token.value || 0)}</span>` :
        `<span class="formatted-price font-semibold text-gray-100 tabular-nums">****</span>`;
    
    // Dev activity badge
    const devPct = Number(token.dev_activity_pct) || 0;
    const devColor = devPct > 30 ? 'red' : devPct > 10 ? 'yellow' : 'green';
    const devText = devPct > 30 ? 'High' : devPct > 10 ? 'Med' : 'Low';
    const devHtml = `
        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-${devColor}-500/10 border-${devColor}-500/20 border">
            <span class="text-xs font-medium text-${devColor}-400">${devText}</span>
        </div>`;
    
    // Protection badge
    const protectionHtml = token.protected ? 
        `<div class="inline-flex items-center px-2 py-1 rounded-full bg-primary-900/60 text-primary-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-3 w-3 mr-1"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
            <span class="text-xs font-medium">Protected</span>
        </div>` :
        `<div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-3 w-3 mr-1 opacity-50"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
            <span class="text-xs">Not Protected</span>
        </div>`;
    
    // Actions
    const protectionButtonClasses = token.protected ? 
        'p-2 rounded-xl bg-red-500/20 border-red-500/50 hover:bg-red-500/30 hover:border-red-500/70 shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-105' :
        'p-2 rounded-xl glass-card-enhanced bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600/50 transition-all duration-300 hover:scale-105';
    
    const protectionIconClasses = token.protected ? 
        'lucide lucide-shield h-4 w-4 text-red-400' :
        'lucide lucide-shield h-4 w-4 text-gray-400';
    
    const actionsHtml = `
        <div class="flex justify-center items-center space-x-1 min-w-fit">
            <button class="${protectionButtonClasses}"
                    data-protection-btn data-protect-button
                    data-mint="${tokenMint}"
                    data-symbol="${token.symbol}"
                    data-name="${token.name || token.symbol}"
                    data-protected="${token.protected}"
                    aria-label="${token.protected ? 'Disable protection' : 'Enable protection'}"
                    title="${token.protected ? 'Click to disable protection' : 'Click to enable protection'}"
                    aria-pressed="${token.protected}">
                <div class="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${protectionIconClasses}"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
                    ${token.protected ? '<div class="protection-indicator absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>' : ''}
                </div>
            </button>
            ${token.protected ? `
            <button class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 protection-settings-btn"
                    data-mint="${tokenMint}"
                    data-symbol="${token.symbol}"
                    data-name="${token.name || token.symbol}"
                    data-icon="${token.image || ''}"
                    aria-label="Protection settings"
                    title="Protection settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings h-4 w-4">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
            ` : ''}
            <a href="https://solscan.io/token/${tokenMint}" target="_blank" rel="noopener noreferrer" 
               class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right h-4 w-4"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>
            </a>
            <button onclick="hideTokenV3('${tokenMint}', '${token.symbol}', '${token.name || token.symbol}', '${token.image || ''}')" 
                    class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-red-400 transition-all duration-300 hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 h-4 w-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
            </button>
        </div>`;
    
    return `
        <tr class="hover:bg-gray-800/50 transition-colors" 
            data-token-mint="${tokenMint}"
            data-liquidity="${Number(token.liquidity_usd) || 0}"
            data-holders="${Number(token.holder_count) || 0}"
            data-dev-activity="${Number(token.dev_activity_pct) || 0}"
            data-creator-balance="${Number(token.creator_balance_pct) || 0}"
            data-price-change="${Number(token.price_change_24h) || 0}"
            data-age='${token.age ? JSON.stringify(token.age) : ""}'>
            <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    ${token.image || token.logo_uri || token.logo_url ? 
                        `<img alt="${token.symbol}" class="h-8 w-8 rounded-full mr-3" 
                              src="${token.image || token.logo_uri || token.logo_url}"
                              onerror="this.onerror=null; this.outerHTML='<div class=\\'h-8 w-8 rounded-full mr-3 token-loader\\'></div>';">` :
                        `<div class="h-8 w-8 rounded-full mr-3 token-loader"></div>`
                    }
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium">${token.symbol || 'UNKNOWN'}</span>
                        </div>
                        <div class="text-sm text-gray-400">${token.name || 'Unknown Token'}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 text-center">
                <div data-risk-badge="${tokenMint}"></div>
            </td>
            <td class="px-4 py-3 text-center">${ageHtml}</td>
            <td class="px-4 py-3 text-right price-column">${priceHtml}</td>
            <td class="px-4 py-3 text-right">${balanceHtml}</td>
            <td class="px-4 py-3 text-right">
                <div title="Balance: ${formatNumberV3(token.balance_ui || 0)} ${token.symbol}">
                    ${valueHtml}
                </div>
            </td>
            <td class="px-4 py-3 text-center">${devHtml}</td>
            <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-gray-100">${formatNumberV3(Number(token.holder_count) || 0)}</span>
            </td>
            <td class="px-4 py-3 text-right">
                <span class="text-sm font-medium text-gray-100">$${formatNumberV3(Number(token.market_cap) || 0)}</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium ${Number(token.creator_balance_pct) > 10 ? 'text-red-400' : 'text-green-400'}">${(Number(token.creator_balance_pct) || 0).toFixed(1)}%</span>
            </td>
            <td class="px-4 py-3 text-center">${protectionHtml}</td>
            <td class="px-4 py-3 text-center sticky right-0 bg-gray-900">${actionsHtml}</td>
        </tr>
    `;
}

// Render tokens
function renderTokensV3() {
    const tbody = document.getElementById('token-list-tbody-v3');
    const tokens = tokenListV3State.tokens;
    
    if (tokens.length === 0) {
        showEmptyStateV3();
        return;
    }
    
    hideLoadingStateV3();
    
    // Hide empty state if visible
    const emptyStateDiv = document.getElementById('empty-state-v3');
    if (emptyStateDiv) {
        emptyStateDiv.classList.add('hidden');
    }
    
    // Show the thead since we have tokens
    document.getElementById('token-list-thead-v3').classList.remove('hidden');
    
    let totalValue = 0;
    let protectedCount = 0;
    
    tbody.innerHTML = tokens.map(token => {
        totalValue += Number(token.value) || 0;
        if (token.protected) protectedCount++;
        
        // Update UnifiedBadgeService with token data
        if (window.UnifiedBadgeService) {
            const unifiedData = {
                badgeState: token.badge_state || null,
                sellSignal: token.sell_signal || null,
                liquidity: {
                    current: Number(token.liquidity_usd || token.liquidity) || 0
                },
                status: token.status,
                velocities: {
                    price5m: Number(token.price_change_5m || token.price_velocity_5m) || 0,
                    price1m: Number(token.price_change_1m || token.price_velocity_1m) || 0
                },
                price: {
                    change5m: Number(token.price_change_5m || token.price_velocity_5m) || 0,
                    change1m: Number(token.price_change_1m || token.price_velocity_1m) || 0
                },
                isNewlyAdded: token.is_newly_added || false,
                dataAge: token.data_age,
                addedAt: token.added_at || token.created_at,
                monitoring: {
                    active: token.monitoring_active || token.protected || false,
                    lastCheck: token.last_check_at,
                    activeMonitors: token.active_monitors || 1
                },
                protectionEnabled: token.protected || false,
                metadata: {
                    symbol: token.symbol,
                    name: token.name,
                    isTestToken: token.is_test_token,
                    holderCount: Number(token.holder_count) || 0,
                    creatorBalance: Number(token.creator_balance_pct) || 0
                }
            };
            window.UnifiedBadgeService.updateToken(token.token_mint, unifiedData);
        }
        
        // Render the row directly
        return renderTokenRowV3(token, tokenListV3State.showBalances);
    }).join('');
    
    // Update stats
    document.getElementById('total-value-v3').textContent = formatNumberV3(totalValue);
    document.getElementById('protected-count-v3').textContent = protectedCount;
    
    // Update dashboard stats if they exist
    const portfolioValueEl = document.getElementById('portfolio-value');
    if (portfolioValueEl) {
        portfolioValueEl.textContent = '$' + formatNumberV3(totalValue);
    }
    
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = tokenListV3State.tokens.length;
    }
    
    // Apply auto-protect UI state to newly rendered buttons
    if (typeof applyAutoProtectUIToTokens === 'function') {
        applyAutoProtectUIToTokens();
    }
    
    // Update protection counts after render
    if (window.protectionToggle && window.protectionToggle.updateProtectionCounts) {
        window.protectionToggle.updateProtectionCounts();
    }
    
    // Dispatch events that tokens have been loaded/updated
    document.dispatchEvent(new CustomEvent('tokenListUpdated', {
        detail: { 
            tokenCount: tokens.length
        }
    }));
    
    // Also dispatch tokensLoaded for compatibility
    document.dispatchEvent(new CustomEvent('tokensLoaded', {
        detail: { 
            tokenCount: tokens.length
        }
    }));
    
    // Trigger ML risk display update with a slight delay to ensure DOM is ready
    setTimeout(() => {
        console.log('[Token List] Triggering ML risk display update...');
        if (window.mlRiskDisplay && window.mlRiskDisplay.loadMLRiskForVisibleTokens) {
            window.mlRiskDisplay.loadMLRiskForVisibleTokens();
        }
        
        // Initialize protection button states
        if (window.protectionToggle && window.protectionToggle.initializeProtectionButtons) {
            window.protectionToggle.initializeProtectionButtons();
        }
    }, 100);
}

// UI State functions
function showEmptyStateV3() {
    document.getElementById('loading-state-v3').classList.add('hidden');
    document.getElementById('empty-state-v3').classList.remove('hidden');
    document.getElementById('token-list-tbody-v3').innerHTML = '';
    document.getElementById('token-list-thead-v3').classList.add('hidden');
    
    // Dynamically populate empty state content based on wallet status
    populateEmptyStateContent();
}

function hideLoadingStateV3() {
    document.getElementById('loading-state-v3').classList.add('hidden');
    document.getElementById('empty-state-v3').classList.add('hidden');
}

function populateEmptyStateContent() {
    document.getElementById('empty-state-v3').innerHTML = `
        <div class='p-4 mx-auto sm:p-6 lg:px-8'>
            <h3 class='mt-2 text-sm font-medium text-gray-900 dark:text-gray-100'>No Data Available</h3>
            <p class='mt-1 text-sm text-gray-500 dark:text-gray-400'>Please connect your wallet or try again later.</p>
        </div>
    `;
}

// Actions
function refreshTokensV3() {
    loadTokensV3();
}

function toggleBalancesV3() {
    tokenListV3State.showBalances = !tokenListV3State.showBalances;
    document.getElementById('balance-text-v3').textContent = tokenListV3State.showBalances ? 'Hide Balances' : 'Show Balances';
    renderTokensV3();
}

// Helper functions
function formatNumberV3(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    if (num < 0.0001) return num.toExponential(2); // Show in scientific notation for very small values
    if (num < 0.01) return num.toFixed(6); // Show 6 decimal places for small values
    if (num < 1) return num.toFixed(4); // Show 4 decimal places for values less than 1
    return num.toFixed(2);
}

// Delete token function
function hideTokenV3(tokenMint, tokenSymbol, tokenName, tokenIcon) {
    const walletAddress = window.walletState?.getState()?.address || null;
    if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    if (!tokenMint) {
        showNotification('Token information not found', 'error');
        return;
    }
    
    // Show delete confirmation modal
    const modal = document.getElementById('delete-token-modal');
    if (!modal) {
        console.error('Delete token modal not found');
        return;
    }
    
    // Set token info in modal
    const tokenIconEl = document.getElementById('delete-token-icon');
    const tokenIconPlaceholder = document.getElementById('delete-token-icon-placeholder');
    const tokenSymbolEl = document.getElementById('delete-token-symbol');
    const tokenNameEl = document.getElementById('delete-token-name');
    
    // Set token icon
    if (tokenIcon && tokenIcon !== '' && tokenIcon !== 'undefined') {
        tokenIconEl.src = tokenIcon;
        tokenIconEl.style.display = 'block';
        tokenIconPlaceholder.style.display = 'none';
    } else {
        tokenIconEl.style.display = 'none';
        tokenIconPlaceholder.style.display = 'flex';
    }
    
    // Set token details
    if (tokenSymbolEl) {
        tokenSymbolEl.textContent = tokenSymbol || 'UNKNOWN';
    }
    if (tokenNameEl) {
        tokenNameEl.textContent = tokenName || 'Unknown Token';
    }
    
    // Store token mint for deletion
    modal.setAttribute('data-current-token-mint', tokenMint);
    
    // Hide any previous errors
    hideDeleteError();
    
    // Reset loading state
    setDeleteButtonsLoading(false);
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Trigger scale-in animation
    setTimeout(() => {
        const modalContent = modal.querySelector('.animate-scale-in');
        if (modalContent) {
            modalContent.classList.add('scale-100');
        }
    }, 10);
    
    // Focus on cancel button for accessibility
    setTimeout(() => {
        document.getElementById('delete-token-cancel')?.focus();
    }, 100);
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full ${
        type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
        type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
        'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            ${type === 'success' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>' :
              type === 'error' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>' :
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>'}
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-y-full');
        notification.classList.add('translate-y-0');
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('translate-y-0');
        notification.classList.add('translate-y-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Auto-protect functionality
async function autoProtectNewTokens(tokens, walletAddress) {
    if (!tokenListV3State.autoProtectEnabled || !walletAddress) {
        return;
    }
    
    console.log('🛡️ Auto-protect is enabled, checking for new tokens to protect...');
    
    // Filter tokens that should be auto-protected
    const tokensToProtect = tokens.filter(token => {
        const value = Number(token.value) || 0;
        const isUnprotected = !token.protected;
        const hasMinValue = value > 10;
        
        return isUnprotected && hasMinValue;
    });
    
    if (tokensToProtect.length === 0) {
        console.log('No new tokens to auto-protect');
        return;
    }
    
    console.log(`Auto-protecting ${tokensToProtect.length} new tokens:`, tokensToProtect.map(t => t.symbol));
    
    // Protect each token via backend
    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
    const protectionPromises = tokensToProtect.map(async (token) => {
        try {
            const response = await fetch(`${backendUrl}/api/protection/protect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: walletAddress,
                    tokenMint: token.token_mint,
                    settings: {
                        priceDropThreshold: 20,
                        liquidityDropThreshold: 30,
                        gasBoost: 1.5,
                        slippageTolerance: 5,
                        autoSell: true
                    },
                    tokenInfo: {
                        symbol: token.symbol,
                        name: token.name,
                        currentPrice: token.price
                    }
                })
            });
            
            if (response.ok) {
                console.log(`✅ Auto-protected ${token.symbol}`);
                token.protected = true;
                token.monitoring_active = true;
                return true;
            } else {
                console.error(`❌ Failed to auto-protect ${token.symbol}:`, await response.text());
                return false;
            }
        } catch (error) {
            console.error(`❌ Error auto-protecting ${token.symbol}:`, error);
            return false;
        }
    });
    
    // Wait for all protection attempts to complete
    const results = await Promise.all(protectionPromises);
    const successCount = results.filter(Boolean).length;
    
    if (successCount > 0) {
        showNotification(`Auto-protected ${successCount} new tokens`, 'success');
    }
}

// Initialize auto-protect toggle
function initializeAutoProtectToggle() {
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (!autoProtectToggle) return;
    
    loadAutoProtectStatus();
    updateAutoProtectUI();
    autoProtectToggle.addEventListener('change', handleAutoProtectToggle);
    subscribeToAutoProtectUpdates();
}

// Load auto-protect status from Supabase
async function loadAutoProtectStatus() {
    const walletAddress = window.walletState?.getState()?.address || null;
    if (!walletAddress) return;
    
    try {
        const { data, error } = await window.supabaseClient
            .from('wallet_auto_protection')
            .select('enabled')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (data && !error) {
            tokenListV3State.autoProtectEnabled = data.enabled;
            updateAutoProtectUI();
        }
    } catch (error) {
        console.log('No auto-protect settings found for wallet, using default (false)');
    }
}

// Handle auto-protect toggle change
async function handleAutoProtectToggle(event) {
    const enabled = event.target.checked;
    const walletAddress = window.walletState?.getState()?.address || null;
    
    if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
        event.target.checked = false;
        return;
    }
    
    if (tokenListV3State.autoProtectProcessing) {
        event.target.checked = !enabled;
        return;
    }
    
    tokenListV3State.autoProtectProcessing = true;
    
    try {
        tokenListV3State.autoProtectEnabled = enabled;
        updateAutoProtectUI();
        
        showNotification(
            enabled ? 'Enabling auto-protect...' : 'Disabling auto-protect...', 
            'info'
        );
        
        // Call PHP bulk toggle API
        const response = await fetch(`/PanicSwap-php/api/auto-protection/bulk-toggle.php?wallet=${walletAddress}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(data.message, 'success');
            
            // Update all tokens' protection state in UI
            if (enabled) {
                console.log('🛡️ Auto-Protect ON: Protecting all tokens in UI');
                tokenListV3State.tokens.forEach(token => {
                    token.protected = true;
                    token.monitoring_active = true;
                });
            } else {
                console.log('🛡️ Auto-Protect OFF: Unprotecting all tokens in UI');
                tokenListV3State.tokens.forEach(token => {
                    token.protected = false;
                    token.monitoring_active = false;
                });
            }
            
            renderTokensV3();
            
            setTimeout(() => {
                refreshTokensV3();
            }, 2000);
        } else {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        console.error('Error toggling auto-protection:', error);
        
        tokenListV3State.autoProtectEnabled = !enabled;
        event.target.checked = !enabled;
        updateAutoProtectUI();
        
        showNotification('Failed to update auto-protection', 'error');
    } finally {
        tokenListV3State.autoProtectProcessing = false;
    }
}

// Update auto-protect UI based on current state
function updateAutoProtectUI() {
    const autoProtectToggle = document.getElementById('auto-protect-v3');
    if (!autoProtectToggle) return;
    
    const toggleContainer = autoProtectToggle.parentElement;
    const toggleTrack = toggleContainer.querySelector('div:last-child');
    const toggleHandle = toggleTrack.querySelector('div');
    
    autoProtectToggle.checked = tokenListV3State.autoProtectEnabled;
    
    if (tokenListV3State.autoProtectEnabled) {
        toggleTrack.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        toggleTrack.classList.add('bg-green-600', 'hover:bg-green-500');
        toggleHandle.classList.remove('translate-x-0');
        toggleHandle.classList.add('translate-x-5');
    } else {
        toggleTrack.classList.remove('bg-green-600', 'hover:bg-green-500');
        toggleTrack.classList.add('bg-gray-700', 'hover:bg-gray-600');
        toggleHandle.classList.remove('translate-x-5');
        toggleHandle.classList.add('translate-x-0');
    }
    
    if (tokenListV3State.autoProtectProcessing) {
        autoProtectToggle.disabled = true;
        toggleContainer.style.opacity = '0.6';
    } else {
        autoProtectToggle.disabled = false;
        toggleContainer.style.opacity = '1';
    }
    
    applyAutoProtectUIToTokens();
}

// Apply auto-protect UI state to individual token buttons
function applyAutoProtectUIToTokens() {
    const protectButtons = document.querySelectorAll('[data-protect-button]');
    
    protectButtons.forEach(button => {
        const isAutoProtectEnabled = tokenListV3State.autoProtectEnabled;
        const isTokenProtected = button.getAttribute('data-protected') === 'true';
        
        if (isAutoProtectEnabled) {
            button.disabled = true;
            button.classList.add('shield-button-disabled', 'shield-tooltip');
            
            if (isTokenProtected) {
                button.classList.add('shield-button-auto-protected');
            }
            
            if (isTokenProtected) {
                button.setAttribute('data-tooltip', 'Auto-Protected - disable Auto-Protect to manage manually');
            } else {
                button.setAttribute('data-tooltip', 'Will be auto-protected when value exceeds $10 - disable Auto-Protect to manage manually');
            }
        } else {
            button.disabled = false;
            button.classList.remove('shield-button-disabled', 'shield-tooltip', 'shield-button-auto-protected');
            
            if (isTokenProtected) {
                button.title = 'Click to disable protection';
            } else {
                button.title = 'Click to enable protection';
            }
        }
    });
}

// Subscribe to realtime updates for auto-protect status
function subscribeToAutoProtectUpdates() {
    const walletAddress = window.walletState?.getState()?.address || null;
    if (!walletAddress || !window.supabaseClient) return;
    
    console.log('📡 Subscribing to auto-protect realtime updates...');
    
    const subscription = window.supabaseClient
        .channel(`auto-protect-${walletAddress}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'wallet_auto_protection',
                filter: `wallet_address=eq.${walletAddress}`
            },
            (payload) => {
                console.log('🔄 Auto-protect status changed:', payload);
                
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const newEnabled = payload.new.enabled;
                    
                    if (newEnabled !== tokenListV3State.autoProtectEnabled) {
                        console.log(`🔄 Syncing auto-protect state: ${newEnabled ? 'ON' : 'OFF'}`);
                        
                        tokenListV3State.autoProtectEnabled = newEnabled;
                        
                        updateAutoProtectUI();
                        
                        showNotification(
                            `Auto-protect ${newEnabled ? 'enabled' : 'disabled'} from another device`,
                            'info'
                        );
                        
                        if (newEnabled) {
                            tokenListV3State.tokens.forEach(token => {
                                token.protected = true;
                                token.monitoring_active = true;
                            });
                        } else {
                            tokenListV3State.tokens.forEach(token => {
                                token.protected = false;
                                token.monitoring_active = false;
                            });
                        }
                        
                        renderTokensV3();
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Subscribed to auto-protect realtime updates');
            }
        });
    
    window.autoProtectSubscription = subscription;
}

// Delete token modal functions
function closeDeleteTokenModal() {
    const modal = document.getElementById('delete-token-modal');
    const modalContent = modal.querySelector('.danger-card');
    
    if (modalContent) {
        modalContent.classList.remove('animate-scale-in');
        modalContent.classList.add('animate-scale-out');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modalContent.classList.remove('animate-scale-out');
        }, 300);
    } else {
        modal.classList.add('hidden');
    }
}

async function confirmDeleteToken() {
    const modal = document.getElementById('delete-token-modal');
    const tokenSymbol = document.getElementById('delete-token-symbol').textContent;
    const tokenMint = modal.getAttribute('data-current-token-mint');
    
    if (!tokenMint) {
        console.error('No token mint found for deletion');
        showDeleteError('Token information not found. Please try again.');
        return;
    }
    
    try {
        hideDeleteError();
        setDeleteButtonsLoading(true);
        
        const walletAddress = window.walletState?.getState()?.address || null;
        if (!walletAddress) {
            throw new Error('Wallet not connected');
        }
        
        console.log(`Deleting token ${tokenSymbol} (${tokenMint}) from wallet ${walletAddress}`);
        
        const { error: walletError } = await window.supabaseClient
            .from('wallet_tokens')
            .delete()
            .eq('wallet_address', walletAddress)
            .eq('token_mint', tokenMint);
            
        if (walletError) {
            throw new Error(`Failed to remove token: ${walletError.message}`);
        }
        
        const { error: protectionError } = await window.supabaseClient
            .from('protected_tokens')
            .delete()
            .eq('wallet_address', walletAddress)
            .eq('token_mint', tokenMint);
            
        if (protectionError) {
            console.warn('Failed to remove protection (non-critical):', protectionError.message);
        }
        
        closeDeleteTokenModal();
        
        setTimeout(() => {
            showNotification(`${tokenSymbol} has been removed from your wallet`, 'success');
        }, 300);
        
        if (window.tokenListV3State) {
            window.tokenListV3State.tokens = window.tokenListV3State.tokens.filter(t => t.token_mint !== tokenMint);
            
            if (window.renderTokensV3) {
                window.renderTokensV3();
            }
        }
        
        if (window.refreshProtectedTokenCount) {
            window.refreshProtectedTokenCount();
        }
        
    } catch (error) {
        console.error('Error deleting token:', error);
        showDeleteError(error.message || 'Failed to delete token. Please try again.');
        setDeleteButtonsLoading(false);
    }
}

// Helper functions for delete modal
function setDeleteButtonsLoading(loading) {
    const confirmButton = document.getElementById('delete-token-confirm');
    const cancelButton = document.getElementById('delete-token-cancel');
    const buttonText = document.getElementById('delete-button-text');
    
    if (loading) {
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
        buttonText.textContent = 'Deleting...';
    } else {
        confirmButton.disabled = false;
        cancelButton.disabled = false;
        confirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
        buttonText.textContent = 'Delete';
    }
}

function showDeleteError(message) {
    const errorDiv = document.getElementById('delete-token-error');
    const errorText = document.getElementById('delete-token-error-text');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideDeleteError() {
    const errorDiv = document.getElementById('delete-token-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// Demo functionality
function setDemoToken(address) {
    document.getElementById('demo-token-input').value = address;
}

async function startDemo(event) {
    const startButton = event ? (event.target.closest('button') || event.currentTarget) : document.querySelector('button[onclick*="startDemo"]');
    const tokenInput = document.getElementById('demo-token-input');
    const tokenAddress = tokenInput.value.trim();
    
    if (!tokenAddress) {
        alert('Please enter a token mint address');
        return;
    }
    
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
        alert('Invalid Solana token address');
        return;
    }
    
    try {
        const originalText = startButton.innerHTML;
        startButton.disabled = true;
        startButton.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...';
        
        const walletAddress = window.walletState?.getState()?.address || null;
        
        if (!walletAddress) {
            alert('Please connect your wallet first to add demo tokens');
            startButton.disabled = false;
            startButton.innerHTML = originalText;
            return;
        }
        
        console.log('Adding demo token to wallet:', walletAddress);
        
        let supabaseReady = window.supabaseClient !== undefined;
        
        if (!supabaseReady) {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 3000);
                window.addEventListener('supabaseReady', () => {
                    clearTimeout(timeout);
                    resolve(true);
                }, { once: true });
            });
        }
        
        if (window.supabaseClient) {
            console.log('Supabase client available, fetching token metadata...');
            
            const { data: existingMetadata, error: metadataError } = await window.supabaseClient
                .from('token_metadata')
                .select('*')
                .eq('mint', tokenAddress)
                .single();
            
            let metadata = existingMetadata;
            
            if (metadataError || !metadata) {
                console.log('Token not in database, fetching from blockchain...');
                
                try {
                    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
                    const response = await fetch(`${backendUrl}/api/tokens/enrich-test`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ mint: tokenAddress })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch token data from blockchain');
                    }
                    
                    const tokenData = await response.json();
                    console.log('Token data from blockchain:', tokenData);
                    
                    const { error: insertError } = await window.supabaseClient
                        .from('token_metadata')
                        .upsert({
                            mint: tokenAddress,
                            symbol: tokenData.symbol || 'UNKNOWN',
                            name: tokenData.name || 'Unknown Token',
                            decimals: tokenData.decimals || 9,
                            logo_uri: tokenData.logoUri,
                            logo_url: tokenData.logoUri,
                            description: tokenData.description || null,
                            platform: tokenData.platform || 'unknown',
                            is_active: true,
                            initial_price: tokenData.price || null,
                            initial_liquidity: tokenData.liquidity || null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'mint'
                        });
                    
                    if (insertError) {
                        console.error('Error saving token metadata:', insertError);
                        throw new Error('Failed to save token metadata: ' + insertError.message);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    metadata = {
                        mint: tokenAddress,
                        symbol: tokenData.symbol,
                        name: tokenData.name,
                        decimals: tokenData.decimals,
                        logo_uri: tokenData.logoUri,
                        platform: tokenData.platform
                    };
                    
                    let demoPrice = tokenData.price || 0;
                    if (demoPrice === 0) {
                        const tokenDecimals = tokenData.decimals || 9;
                        if (tokenDecimals >= 9) {
                            demoPrice = 0.0001;
                        } else if (tokenDecimals >= 6) {
                            demoPrice = 0.1;
                        } else {
                            demoPrice = 1.0;
                        }
                        console.log(`Setting demo price for ${tokenData.symbol}: $${demoPrice} (${tokenDecimals} decimals)`);
                    }
                    
                    if (demoPrice > 0) {
                        await window.supabaseClient
                            .from('token_prices')
                            .upsert({
                                token_mint: tokenAddress,
                                price_usd: demoPrice,
                                price: demoPrice,
                                liquidity: tokenData.liquidity || 50000,
                                volume_24h: tokenData.volume24h || 10000,
                                price_change_24h: tokenData.priceChange24h || (Math.random() * 20 - 10),
                                platform: tokenData.platform || 'unknown',
                                symbol: tokenData.symbol,
                                name: tokenData.name,
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'token_mint'
                            });
                    }
                } catch (fetchError) {
                    console.error('Error fetching from blockchain:', fetchError);
                    throw new Error('Could not fetch token data. Make sure the backend is running on localhost:3001 and the token address is valid.');
                }
            }
            
            if (metadata) {
                console.log('Token metadata ready:', metadata.symbol, metadata.name);
                
                const { data: verifyToken, error: verifyError } = await window.supabaseClient
                    .from('token_metadata')
                    .select('mint')
                    .eq('mint', tokenAddress)
                    .single();
                
                if (verifyError || !verifyToken) {
                    throw new Error('Token metadata not properly saved. Please try again.');
                }
                
                console.log('Token verified in database, adding to wallet...');
                
                const decimals = metadata.decimals || 9;
                const desiredBalance = 1000000;
                const rawBalance = (desiredBalance * Math.pow(10, decimals)).toString();
                
                console.log(`Setting demo token balance: ${desiredBalance} tokens = ${rawBalance} raw balance (${decimals} decimals)`);
                
                const { error: walletError } = await window.supabaseClient
                    .from('wallet_tokens')
                    .upsert({
                        wallet_address: walletAddress,
                        token_mint: tokenAddress,
                        balance: rawBalance,
                        decimals: decimals,
                        is_test_token: true,
                        added_at: new Date().toISOString(),
                        last_seen_at: new Date().toISOString()
                    }, {
                        onConflict: 'wallet_address,token_mint'
                    });
                
                if (walletError) {
                    console.error('Error adding to wallet_tokens:', walletError);
                    throw new Error('Failed to add token to wallet: ' + walletError.message);
                }
                
                const { error: protectionError } = await window.supabaseClient
                    .from('protected_tokens')
                    .upsert({
                        wallet_address: walletAddress,
                        token_mint: tokenAddress,
                        token_symbol: metadata.symbol,
                        token_name: metadata.name,
                        is_active: true,
                        monitoring_enabled: true,
                        monitoring_active: true,
                        price_threshold: 30,
                        liquidity_threshold: 50,
                        max_slippage_bps: 500,
                        swap_to_sol: true,
                        dev_wallet_monitoring: true,
                        gas_boost: 1.5,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'wallet_address,token_mint'
                    });
                
                if (protectionError) {
                    console.error('Error adding protection:', protectionError);
                }
                
                const successDiv = document.createElement('div');
                successDiv.className = 'mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400';
                successDiv.innerHTML = `✓ ${metadata.symbol || 'Token'} added to demo! Refreshing...`;
                tokenInput.parentElement.appendChild(successDiv);
                
                tokenInput.value = '';
                
                setTimeout(() => {
                    // Clear cache before reloading to ensure fresh data
                    if (window.SupabaseTokenFetcher && window.SupabaseTokenFetcher.invalidateCache) {
                        console.log('Invalidating cache after demo token addition');
                        window.SupabaseTokenFetcher.invalidateCache();
                    }
                    loadTokensV3();
                    successDiv.remove();
                }, 1000);
            } else {
                throw new Error('Invalid token data received. Please check the token address and try again.');
            }
        } else {
            console.error('Supabase client not available after waiting');
            throw new Error('Database connection not available. Please refresh the page and try again.');
        }
        
        startButton.disabled = false;
        startButton.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error adding demo token:', error);
        alert('Error: ' + error.message);
        
        if (startButton) {
            startButton.disabled = false;
            startButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-4 w-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Start Demo';
        }
    }
}

// Show empty state
function showEmptyStateV3() {
    const tbody = document.getElementById('token-list-tbody-v3');
    const thead = document.getElementById('token-list-thead-v3');
    const loadingStateDiv = document.getElementById('loading-state-v3');
    const emptyStateDiv = document.getElementById('empty-state-v3');
    
    // Hide loading state
    if (loadingStateDiv) {
        loadingStateDiv.classList.add('hidden');
    }
    
    // Hide thead
    if (thead) thead.classList.add('hidden');
    
    // Show empty state div if it exists
    if (emptyStateDiv) {
        emptyStateDiv.classList.remove('hidden');
    }
    
    // Clear tbody
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    tokenListV3State.loading = false;
}

// Hide loading state
function hideLoadingStateV3() {
    // Hide the loading state div
    const loadingStateDiv = document.getElementById('loading-state-v3');
    if (loadingStateDiv) {
        loadingStateDiv.classList.add('hidden');
    }
    
    // Also hide any loading placeholder rows
    const loadingRow = document.querySelector('#token-list-tbody-v3 .loading-placeholder');
    if (loadingRow) {
        loadingRow.style.display = 'none';
    }
    
    // Use TokenSkeleton hideLoading if available
    if (window.TokenSkeleton && window.TokenSkeleton.hideLoading) {
        window.TokenSkeleton.hideLoading();
    }
    
    tokenListV3State.loading = false;
}

// Export functions for global access
window.tokenListV3State = tokenListV3State;
window.loadTokensV3 = loadTokensV3;
window.renderTokensV3 = renderTokensV3;
window.refreshTokensV3 = refreshTokensV3;
window.toggleBalancesV3 = toggleBalancesV3;
window.hideTokenV3 = hideTokenV3;
window.startDemo = startDemo;
window.setDemoToken = setDemoToken;
window.closeDeleteTokenModal = closeDeleteTokenModal;
window.confirmDeleteToken = confirmDeleteToken;
window.showEmptyStateV3 = showEmptyStateV3;
window.hideLoadingStateV3 = hideLoadingStateV3;
window.formatNumberV3 = formatNumberV3;
window.showNotification = showNotification;

// Alias for compatibility
window.refreshTokenListV3 = loadTokensV3;

// Delete token modal functions (if not already loaded from showDeleteTokenModal.js)
if (!window.closeDeleteTokenModal) {
    window.closeDeleteTokenModal = function() {
        const modal = document.getElementById('delete-token-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

if (!window.confirmDeleteToken) {
    window.confirmDeleteToken = function() {
        // This function should be implemented based on your delete logic
        console.log('Delete token confirmed');
        closeDeleteTokenModal();
    };
}