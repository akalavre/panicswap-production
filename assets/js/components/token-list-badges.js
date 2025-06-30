// Token List Badge Generator Module
// Extracted from token-list-v3.php to reduce file size

window.TokenListBadges = {
    // Main function to render a token row
    renderTokenRow: function(token, showBalances) {
        const tokenMint = token.token_mint;
        
        // Convert token data to UnifiedBadgeService format
        const unifiedData = {
            // Badge state from API
            badgeState: token.badge_state || null,
            
            // Sell signals
            sellSignal: token.sell_signal || null,
            
            // Liquidity data
            liquidity: {
                current: parseFloat(token.liquidity_usd || token.liquidity || 0)
            },
            
            // Status
            status: token.status,
            
            // Velocities
            velocities: {
                price5m: parseFloat(token.price_change_5m || token.price_velocity_5m || 0),
                price1m: parseFloat(token.price_change_1m || token.price_velocity_1m || 0)
            },
            
            // Price data
            price: {
                change5m: parseFloat(token.price_change_5m || token.price_velocity_5m || 0),
                change1m: parseFloat(token.price_change_1m || token.price_velocity_1m || 0)
            },
            
            // New token detection
            isNewlyAdded: token.is_newly_added || false,
            dataAge: token.data_age,
            addedAt: token.added_at || token.created_at,
            
            // Monitoring state
            monitoring: {
                active: token.monitoring_active || token.protected || false,
                lastCheck: token.last_check_at
            },
            protectionEnabled: token.protected || false,
            
            // Additional metadata
            metadata: {
                symbol: token.symbol,
                name: token.name,
                isTestToken: token.is_test_token,
                holderCount: token.holder_count,
                creatorBalance: token.creator_balance_pct
            }
        };
        
        // Update UnifiedBadgeService with token data
        if (window.UnifiedBadgeService) {
            window.UnifiedBadgeService.updateToken(tokenMint, unifiedData);
        }
        
        // Create badge container - UnifiedBadgeService will handle rendering
        const riskBadge = `<div data-risk-badge="${tokenMint}"></div>`;
        
        const ageBadge = this.getAgeBadge(token.age || token.launch_time);
        const priceBadge = this.getPriceBadge(token.price, token.price_change_24h);
        const balanceBadge = this.getBalanceBadge(token.balance_ui || token.balance, token.symbol);
        const devBadge = this.getDevBadge(token);
        const protectionBadge = this.getProtectionBadge(token.protected, token.monitoring_active, token.status);
        const actionButtons = this.getActionButtons(token);
        
        return `
            <tr class="hover:bg-gray-800/50 transition-colors" 
                data-token-mint="${token.token_mint}"
                data-liquidity="${token.liquidity_usd || 0}"
                data-holders="${token.holder_count || 0}"
                data-dev-activity="${token.dev_activity_pct || 0}"
                data-creator-balance="${token.creator_balance_pct || 0}"
                data-price-change="${token.price_change_24h || 0}"
                data-age='${token.age ? JSON.stringify(token.age) : ""}'>
                <td class="px-4 py-3 whitespace-nowrap">
                    ${this.renderTokenDisplay(token)}
                </td>
                <td class="px-4 py-3 text-center">${riskBadge}</td>
                <td class="px-4 py-3 text-center">${ageBadge}</td>
                <td class="px-4 py-3 text-right price-column">${priceBadge}</td>
                <td class="px-4 py-3 text-right">${balanceBadge}</td>
                <td class="px-4 py-3 text-right">
                    <div title="Balance: ${this.formatNumber(token.balance)} ${token.symbol}">
                        ${showBalances ? 
                            `<span class="formatted-price font-semibold text-gray-100 tabular-nums">$${this.formatNumber(token.value)}</span>` :
                            `<span class="formatted-price font-semibold text-gray-100 tabular-nums">****</span>`
                        }
                    </div>
                </td>
                <td class="px-4 py-3 text-center">${devBadge}</td>
                <td class="px-4 py-3 text-center">
                    <span class="text-sm font-medium text-gray-100">${this.formatHolderCount(token.holder_count || 0)}</span>
                </td>
                <td class="px-4 py-3 text-right">
                    <span class="text-sm font-medium text-gray-100">${this.formatMarketCap(token.market_cap || 0)}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="text-sm font-medium ${token.creator_balance_pct > 10 ? 'text-red-400' : 'text-green-400'}">${(token.creator_balance_pct || 0).toFixed(1)}%</span>
                </td>
                <td class="px-4 py-3 text-center">${protectionBadge}</td>
                <td class="px-4 py-3 text-center sticky right-0 bg-gray-900">${actionButtons}</td>
            </tr>
        `;
    },

    // Token display with icon and name
    renderTokenDisplay: function(token) {
        const isPending = token.metadata_status === 'pending';
        const hasActualPlaceholderData = (
            (token.symbol === 'TEST' || token.symbol === 'UNKNOWN' || token.symbol === 'TOKEN') &&
            (token.name === 'Test Token' || token.name === 'Unknown Token' || token.name === 'Demo Token' || 
             (token.name && token.name.startsWith('Token ')))
        );
        
        const shouldShowLoading = isPending || (hasActualPlaceholderData && !token.image && !token.logo_uri);
        
        if (shouldShowLoading) {
            return `
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full mr-3 token-loader"></div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium token-loading-text">Loading...</span>
                        </div>
                        <div class="text-sm text-gray-500">Fetching metadata</div>
                    </div>
                </div>
            `;
        }
        
        const symbol = token.symbol || 'UNKNOWN';
        const name = token.name || 'Unknown Token';
        const image = token.image || token.logo_uri || token.logo_url || null;
        
        return `
            <div class="flex items-center">
                ${image ? 
                    `<img alt="${symbol}" 
                         class="h-8 w-8 rounded-full mr-3" 
                         src="${image}"
                         onerror="this.onerror=null; this.outerHTML='<div class=\\'h-8 w-8 rounded-full mr-3 token-loader\\'></div>';">` :
                    `<div class="h-8 w-8 rounded-full mr-3 token-loader"></div>`
                }
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium">${symbol}</span>
                    </div>
                    <div class="text-sm text-gray-400">${name}</div>
                </div>
            </div>
        `;
    },

    // Badge generators
    getAgeBadge: function(age) {
        if (!age) return '<span class="text-xs text-gray-500">-</span>';
        
        if (age.value && age.unit) {
            const ageColor = age.raw_days < 7 ? 'text-red-400' : age.raw_days < 30 ? 'text-yellow-400' : 'text-blue-400';
            return `
                <div class="inline-flex items-center gap-1 ${ageColor}">
                    ${this.getIcon('clock', 'w-3.5 h-3.5')}
                    <span class="text-xs font-medium">${age.value}${age.unit}</span>
                </div>
            `;
        }
        
        if (typeof age === 'string' || age instanceof Date) {
            const ageMs = Date.now() - new Date(age).getTime();
            const days = ageMs / (1000 * 60 * 60 * 24);
            const ageColor = days < 7 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-blue-400';
            
            return `
                <div class="inline-flex items-center gap-1 ${ageColor}" title="Launched ${new Date(age).toLocaleDateString()}">
                    ${this.getIcon('clock', 'w-3.5 h-3.5')}
                    <span class="text-xs font-medium">${Math.floor(days)}d</span>
                </div>
            `;
        }
        
        return '<span class="text-xs text-gray-500">-</span>';
    },

    getPriceBadge: function(price, change24h) {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        const numChange = typeof change24h === 'string' ? parseFloat(change24h) : (change24h || 0);
        
        if (!numPrice || numPrice === 0 || isNaN(numPrice)) {
            return `<span class="text-sm text-gray-500">$0</span>`;
        }
        
        return `<span class="text-sm text-gray-100">$${numPrice.toFixed(8)}</span>`;
    },

    getBalanceBadge: function(balance, symbol) {
        const formattedBalance = this.formatBalance(balance);
        
        return `
            <div class="flex flex-col gap-1">
                <span class="price-significant tracking-tight text-sm font-semibold text-gray-100">${formattedBalance}</span>
                <div class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-500/10 border-gray-500/20 border self-end whitespace-nowrap">
                    <span class="text-xs font-medium text-gray-400">${symbol || 'TOKEN'}</span>
                </div>
            </div>
        `;
    },

    getDevBadge: function(token) {
        const devActivityPct = token.dev_activity_24h_pct || token.dev_activity_pct || 0;
        const totalPct = token.dev_activity_pct_total || token.dev_activity_pct || 0;
        const pct1h = token.dev_activity_1h_pct || 0;
        const lastTx = token.last_dev_tx;
        const devWallets = token.dev_wallets || [];
        
        if (!devActivityPct && devActivityPct !== 0) {
            return '<span class="text-xs text-gray-500">-</span>';
        }
        
        let color = 'green';
        let text = 'Low';
        
        if (devActivityPct > 30) {
            color = 'red';
            text = 'High';
        } else if (devActivityPct > 10) {
            color = 'yellow';
            text = 'Med';
        }
        
        let lastTxText = 'No recent activity';
        if (lastTx) {
            const timeDiff = Date.now() - new Date(lastTx).getTime();
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            if (hours < 1) {
                lastTxText = 'Last tx: < 1h ago';
            } else if (hours < 24) {
                lastTxText = `Last tx: ${hours}h ago`;
            } else {
                const days = Math.floor(hours / 24);
                lastTxText = `Last tx: ${days}d ago`;
            }
        }
        
        const tooltipContent = `
            <div class="text-xs">
                <div class="font-semibold mb-1">Developer Activity</div>
                <div>Total: ${totalPct.toFixed(1)}%</div>
                <div>24h: ${devActivityPct.toFixed(1)}%</div>
                <div>1h: ${pct1h.toFixed(1)}%</div>
                <div class="mt-1">${lastTxText}</div>
                ${devWallets.length > 1 ? `<div class="mt-1">${devWallets.length} dev wallets tracked</div>` : ''}
            </div>
        `.trim();
        
        return `
            <div class="relative group">
                <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-${color}-500/10 border-${color}-500/20 border cursor-help">
                    <span class="text-xs font-medium text-${color}-400">${text}</span>
                    ${devActivityPct > 0 ? `<span class="text-xs text-${color}-400">(${devActivityPct.toFixed(0)}%)</span>` : ''}
                </div>
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg whitespace-nowrap">
                        ${tooltipContent}
                    </div>
                </div>
            </div>
        `;
    },


    getProtectionBadge: function(isProtected, monitoringActive, status) {
        if (status === 'RUGGED') {
            return `
                <div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800/50 text-gray-500 border border-gray-700/50">
                    ${this.getIcon('shield', 'h-3 w-3 mr-1 opacity-30')}
                    <span class="text-xs">Not Protected</span>
                </div>
            `;
        }
        
        if (isProtected) {
            return `
                <div class="flex flex-col items-center gap-1">
                    <div class="inline-flex items-center px-2 py-1 rounded-full bg-primary-900/60 text-primary-400">
                        ${this.getIcon('shield', 'h-3 w-3 mr-1')}
                        <span class="text-xs font-medium">Protected</span>
                    </div>
                </div>
            `;
        }
        return `
            <div class="inline-flex items-center px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                ${this.getIcon('shield', 'h-3 w-3 mr-1 opacity-50')}
                <span class="text-xs">Not Protected</span>
            </div>
        `;
    },

    getActionButtons: function(token) {
        const isProtected = token.protected;
        const isNewlyAdded = token.is_newly_added || false;
        const isRugged = token.status === 'RUGGED';
        
        let protectionButtonClass, protectionIconClass, protectionTitle, protectionLabel, tooltipText;
        
        if (isRugged) {
            protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
               bg-black/30 border border-gray-700/30
               cursor-not-allowed opacity-50`;
            protectionIconClass = 'h-4 w-4 text-gray-600';
            protectionTitle = 'Token has been rugged - protection disabled';
            protectionLabel = 'Protection unavailable (rugged)';
            tooltipText = 'This token has been rugged and cannot be protected';
        } else if (isNewlyAdded && !isProtected) {
            protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
               glass-card-enhanced bg-gray-800/40 border border-gray-700/30
               cursor-not-allowed opacity-50`;
            protectionIconClass = 'h-4 w-4 text-gray-500';
            protectionTitle = 'Please wait - fetching token data...';
            protectionLabel = 'Protection unavailable';
            tooltipText = 'Protection will be available once token data is loaded';
        } else if (isProtected) {
            protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300 
               bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 hover:border-red-500/70
               cursor-pointer hover:scale-105 backdrop-blur-sm shadow-lg shadow-red-500/20`;
            protectionIconClass = 'h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors duration-200';
            protectionTitle = 'Click to disable protection';
            protectionLabel = 'Disable protection';
            tooltipText = 'Click to disable protection';
        } else {
            protectionButtonClass = `relative group p-2 rounded-xl transition-all duration-300
               glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50
               cursor-pointer hover:scale-105 backdrop-blur-sm`;
            protectionIconClass = 'h-4 w-4 text-gray-400 group-hover:text-gray-300 transition-colors duration-200';
            protectionTitle = 'Click to enable protection';
            protectionLabel = 'Enable protection';
            tooltipText = 'Click to set up protection';
        }
        
        return `
            <div class="flex justify-center items-center space-x-1 min-w-fit">
                <div class="relative group inline-block">
                    <button class="${protectionButtonClass}" 
                            aria-label="${protectionLabel}" 
                            title="${protectionTitle}"
                            aria-pressed="${isProtected}"
                            ${isRugged ? 'disabled' : 'data-protection-btn data-protect-button'}
                            data-mint="${token.token_mint}"
                            data-symbol="${token.symbol}"
                            data-name="${token.name || token.symbol}"
                            data-protected="${isProtected}"
                            data-rugged="${isRugged}">
                        <div class="relative">
                            ${this.getIcon('shield', protectionIconClass)}
                            ${isProtected ? `<div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>` : ''}
                        </div>
                    </button>
                    <div class="
                        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50
                        hidden group-hover:block
                        px-3 py-2 text-sm text-white bg-gray-900 rounded-lg
                        whitespace-nowrap pointer-events-none
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                    ">
                        ${tooltipText}
                        <div class="
                            absolute w-0 h-0 border-solid
                            top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-t-4 border-x-transparent border-x-4
                        "></div>
                    </div>
                </div>
                ${isProtected && !isRugged ? `
                <button class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group"
                        title="Configure protection settings"
                        data-protection-settings
                        data-mint="${token.token_mint}"
                        data-symbol="${token.symbol}"
                        data-name="${token.name || token.symbol}"
                        data-icon="${token.image || token.logo_uri || token.logo_url || ''}">
                    ${this.getIcon('settings', 'h-4 w-4 transition-colors duration-200')}
                </button>
                ` : ''}
                <a href="https://solscan.io/token/${token.token_mint}" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-gray-300 transition-all duration-300 hover:scale-105 backdrop-blur-sm group inline-block" title="View on Solscan">
                    ${this.getIcon('arrow-up-right', 'h-4 w-4 transition-colors duration-200')}
                </a>
                <button onclick="hideTokenV3('${token.token_mint}', '${token.symbol}', '${token.name || token.symbol}', '${token.image || ''}')" class="p-2 rounded-xl glass-card-enhanced hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-400 hover:text-red-400 transition-all duration-300 hover:scale-105 backdrop-blur-sm group" title="Remove token from wallet">
                    ${this.getIcon('trash-2', 'h-4 w-4 transition-colors duration-200')}
                </button>
            </div>
        `;
    },

    // Helper functions
    formatNumber: function(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        if (num < 0.01) return num.toFixed(4);
        return num.toFixed(2);
    },
    
    formatHolderCount: function(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return Math.floor(num).toString(); // No decimals for numbers under 1000
    },

    formatMarketCap: function(num) {
        if (!num || num === 0) return '$0';
        if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
        return '$' + Math.floor(num).toString();
    },

    formatBalance: function(balance) {
        if (balance === null || balance === undefined) {
            return '0';
        }
        
        // Convert to number for proper formatting
        const num = typeof balance === 'string' ? parseFloat(balance) : balance;
        
        if (isNaN(num) || num === 0) {
            return '0';
        }
        
        // Format large numbers with K/M/B suffixes
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        
        // For small numbers, show appropriate decimal places
        if (num < 0.0001) return num.toExponential(2);
        if (num < 0.01) return num.toFixed(6);
        if (num < 1) return num.toFixed(4);
        if (num < 100) return num.toFixed(2);
        
        // For larger numbers, use comma formatting
        return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    },

    getIcon: function(name, className = '') {
        const icons = {
            'shield': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield ${className}"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`,
            'clock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock ${className}"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
            'check-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle ${className}"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>`,
            'x-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle ${className}"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`,
            'help-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle ${className}"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>`,
            'lock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock ${className}"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
            'unlock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlock ${className}"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
            'settings': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings ${className}"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
            'arrow-up-right': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right ${className}"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`,
            'trash-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 ${className}"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>`
        };
        return icons[name] || '';
    }
};