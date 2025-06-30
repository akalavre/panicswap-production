/**
 * Unified Badge Service for Memecoin Traders
 * Single source of truth for all badge states
 */

class UnifiedBadgeService {
    constructor() {
        // Data completeness tracking
        this.dataCompleteness = new Map();
        this.initialLoadTimers = new Map();
        this.INITIAL_LOAD_DELAY = 1500; // Wait up to 1.5s for complete data
        
        // Badge stability tracking
        this.lastBadgeChange = new Map();
        this.MIN_BADGE_DISPLAY_TIME = 2000; // Minimum 2s display time per badge state
        
        // Badge states for traders
        this.BADGE_STATES = {
            SELL_NOW: {
                color: 'red',
                bgClass: 'bg-red-600/20',
                borderClass: 'border-red-600/30',
                textClass: 'text-red-500',
                text: 'SELL NOW',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                       </svg>`,
                pulse: true,
                animationClass: 'animate-pulse-fast'
            },
            SELL: {
                color: 'orange',
                bgClass: 'bg-orange-500/20',
                borderClass: 'border-orange-500/30',
                textClass: 'text-orange-400',
                text: 'SELL',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            },
            PUMPING: {
                color: 'green',
                bgClass: 'bg-green-500/20',
                borderClass: 'border-green-500/30',
                textClass: 'text-green-400',
                text: 'PUMPING',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            },
            VOLATILE: {
                color: 'yellow',
                bgClass: 'bg-yellow-500/20',
                borderClass: 'border-yellow-500/30',
                textClass: 'text-yellow-400',
                text: 'VOLATILE',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            },
            WATCHING: {
                color: 'blue',
                bgClass: 'bg-blue-500/20',
                borderClass: 'border-blue-500/30',
                textClass: 'text-blue-400',
                text: 'WATCHING',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            },
            RUGGED: {
                color: 'gray',
                bgClass: 'bg-gray-500/20',
                borderClass: 'border-gray-500/30',
                textClass: 'text-gray-400',
                text: 'RUGGED',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            },
            NEW: {
                color: 'purple',
                bgClass: 'bg-purple-500/20',
                borderClass: 'border-purple-500/30',
                textClass: 'text-purple-400',
                text: 'NEW',
                icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                       </svg>`,
                pulse: false,
                animationClass: ''
            }
        };
        
        // Escalation priority – lower index means higher severity. Used to avoid
        // less-severe states overwriting more critical ones that were already
        // displayed. Adjust order if new states are added.
        this.BADGE_PRIORITY = [
            'SELL_NOW',   // 0 – highest severity
            'SELL',       // 1
            'RUGGED',     // 2 (irreversible state)
            'PUMPING',    // 3
            'VOLATILE',   // 4
            'NEW',        // 5
            'WATCHING',   // 6 – lowest severity / informational
            null          // fallback for unknown / loading
        ];
        
        // Store token data
        this.tokenData = new Map();
        
        // Debounce timers
        this.renderTimers = new Map();
        
        console.log('[UnifiedBadgeService] Initialized');
    }
    
    /**
     * Calculate badge state from token data
     * Priority order - first match wins
     */
    calculateBadgeState(data) {
        if (!data) return null;
        
        // 1. Sell signals (highest priority)
        if (data.sellSignal?.action === 'PANIC_SELL') return 'SELL_NOW';
        if (data.sellSignal?.action === 'SELL') return 'SELL';
        
        // 2. Rugged check – only mark as rugged if liquidity is truly gone
        const liquidityRaw = data.liquidity?.current ?? data.liquidity;
        const hasLiquidityValue = liquidityRaw !== null && liquidityRaw !== undefined;
        const liquidityValue = hasLiquidityValue ? Number(liquidityRaw) : null;
        
        // Only mark as RUGGED if we have actual liquidity data showing < $1
        // Don't mark as rugged if liquidity data is simply missing
        if (liquidityValue !== null && liquidityValue >= 0 && liquidityValue < 1) {
            return 'RUGGED';
        }
        
        // Also check for massive liquidity drop
        const liqDrop5m = data.velocities?.liquidity5m || data.liquidity?.change5m || 0;
        if (liqDrop5m < -18) { // More than 90% drop in 5 minutes
            return 'RUGGED';
        }
        
        // Explicit rugged status from backend
        if (data.status === 'RUGGED') {
            return 'RUGGED';
        }
        
        // Check for explicit rugged status from backend
        if (data.status === 'RUGGED') return 'RUGGED';
        
        // 3. Pumping check (>20% in 5m)
        const price5m = data.velocities?.price5m || data.price?.change5m || 0;
        if (price5m > 4) return 'PUMPING'; // >20% in 5 min = 4% per minute
        
        // 4. Volatility check
        if (Math.abs(price5m) > 2) return 'VOLATILE'; // >10% in 5 min
        
        // 5. New token check
        const isNew = data.isNewlyAdded || 
                     (data.dataAge && data.dataAge < 300000) || // <5 min
                     (data.addedAt && (Date.now() - new Date(data.addedAt)) < 300000);
        if (isNew) return 'NEW';
        
        // 6. Monitoring state
        const isMonitoring = data.monitoring?.active || 
                            data.monitoring?.monitoring?.active ||
                            data.protectionEnabled;
        if (isMonitoring) return 'WATCHING';
        
        // No badge if not monitoring and no other state
        return null;
    }
    
    /**
     * Update token data
     */
    updateToken(tokenMint, data) {
        if (!tokenMint || !data) return;

        // Pull any existing record so we can merge fields and compare severity
        const existing = this.tokenData.get(tokenMint) || {};
        
        // Track data completeness
        const isFirstUpdate = !existing.lastUpdated;
        const hasCompleteData = data.hasCompleteData || this.isDataComplete(data);
        
        // If this is the first update, start a timer to wait for complete data
        if (isFirstUpdate && !hasCompleteData) {
            if (!this.initialLoadTimers.has(tokenMint)) {
                this.initialLoadTimers.set(tokenMint, setTimeout(() => {
                    // Force render after timeout even if data is incomplete
                    this.dataCompleteness.set(tokenMint, true);
                    this.scheduleRender(tokenMint);
                    this.initialLoadTimers.delete(tokenMint);
                }, this.INITIAL_LOAD_DELAY));
            }
        }
        
        // If we have complete data, mark it and clear any timer
        if (hasCompleteData) {
            this.dataCompleteness.set(tokenMint, true);
            if (this.initialLoadTimers.has(tokenMint)) {
                clearTimeout(this.initialLoadTimers.get(tokenMint));
                this.initialLoadTimers.delete(tokenMint);
            }
        }

        // Merge – later values override earlier, but keep anything not provided
        const mergedData = {
            ...existing,
            ...data
        };

        // Determine candidate badge state: prefer explicit incoming value,
        // otherwise recalc based on merged data
        let candidateState =
            data.badgeState !== undefined && data.badgeState !== null
                ? data.badgeState
                : this.calculateBadgeState(mergedData);

        // Compare with current badge state using priority list – only update
        // if the new state is more severe (lower index). This avoids the badge
        // "downgrading" after page load when lightweight updates arrive.
        const currentState = existing.badgeState || null;
        if (
            currentState &&
            this.getBadgePriority(candidateState) > this.getBadgePriority(currentState)
        ) {
            candidateState = currentState; // keep higher-priority existing state
        }
        
        // Check if enough time has passed since last badge change
        const lastChangeTime = this.lastBadgeChange.get(tokenMint) || 0;
        const timeSinceLastChange = Date.now() - lastChangeTime;
        
        // If the badge state is changing and not enough time has passed, keep current state
        if (currentState && candidateState !== currentState && timeSinceLastChange < this.MIN_BADGE_DISPLAY_TIME) {
            // Exception: Allow immediate escalation to critical states
            if (candidateState !== 'SELL_NOW' && candidateState !== 'SELL') {
                candidateState = currentState;
            }
        }
        
        // Track badge state changes
        if (candidateState !== currentState) {
            this.lastBadgeChange.set(tokenMint, Date.now());
        }

        // Final record
        const finalData = {
            ...mergedData,
            badgeState: candidateState,
            lastUpdated: new Date().toISOString()
        };

        this.tokenData.set(tokenMint, finalData);

        // Only render if we have complete data or timeout has passed
        if (this.dataCompleteness.get(tokenMint)) {
            this.scheduleRender(tokenMint);
        }
    }
    
    /**
     * Get token data
     */
    getToken(tokenMint) {
        return this.tokenData.get(tokenMint) || null;
    }
    
    /**
     * Generate badge HTML
     */
    generateBadgeHTML(tokenMint) {
        const data = this.getToken(tokenMint);
        
        // Loading state if no data
        if (!data || !data.badgeState) {
            return `
                <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md bg-gray-500/10 border-gray-500/20 text-gray-400 cursor-help unified-badge"
                      data-token-mint="${tokenMint}">
                    <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Loading</span>
                </span>
            `;
        }
        
        const badge = this.BADGE_STATES[data.badgeState];
        if (!badge) return '';
        
        // Build tooltip data
        const tooltipData = {
            state: data.badgeState,
            message: this.getTooltipMessage(data.badgeState, data),
            lastUpdated: data.lastUpdated
        };
        
        // Add state-specific data
        if (data.sellSignal) {
            tooltipData.sellSignal = data.sellSignal;
        }
        if (data.velocities) {
            tooltipData.velocities = data.velocities;
        }
        if (data.monitoring) {
            tooltipData.monitoring = data.monitoring;
        }
        
        return `
            <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md ${badge.bgClass} ${badge.borderClass} ${badge.textClass} cursor-help unified-badge ${badge.animationClass}"
                  data-token-mint="${tokenMint}"
                  data-badge-state="${data.badgeState}"
                  data-tooltip='${JSON.stringify(tooltipData)}'>
                ${badge.icon}
                <span>${badge.text}</span>
            </span>
        `;
    }
    
    /**
     * Get tooltip message based on state
     */
    getTooltipMessage(state, data) {
        switch (state) {
            case 'SELL_NOW':
                return data.sellSignal?.reason || 'Exit immediately - liquidity collapsing';
            case 'SELL':
                return data.sellSignal?.reason || 'Consider exiting - negative signals detected';
            case 'PUMPING':
                const pump = data.velocities?.price5m || data.price?.change5m || 0;
                return `Price up ${Math.round(pump * 5)}% in 5 minutes`;
            case 'VOLATILE':
                const vol = Math.abs(data.velocities?.price5m || data.price?.change5m || 0);
                return `${Math.round(vol * 5)}% price movement in 5 minutes`;
            case 'WATCHING':
                return 'Active monitoring - protection enabled';
            case 'RUGGED':
                return 'Token has been rugged - liquidity removed';
            case 'NEW':
                return 'Recently added token - gathering data';
            default:
                return 'Unknown state';
        }
    }
    
    /**
     * Render badge with debouncing
     */
    scheduleRender(tokenMint) {
        // Clear existing timer
        if (this.renderTimers.has(tokenMint)) {
            clearTimeout(this.renderTimers.get(tokenMint));
        }
        
        // Schedule new render
        const timer = setTimeout(() => {
            this.renderBadge(tokenMint);
            this.renderTimers.delete(tokenMint);
        }, 50);
        
        this.renderTimers.set(tokenMint, timer);
    }
    
    /**
     * Render badge immediately
     */
    renderBadge(tokenMint) {
        const container = document.querySelector(`[data-risk-badge="${tokenMint}"]`);
        if (!container) return;
        
        const newHTML = this.generateBadgeHTML(tokenMint);
        
        // Only update if changed
        if (container.innerHTML !== newHTML) {
            container.innerHTML = newHTML;
        }
    }
    
    /**
     * Render all visible badges
     */
    renderAllBadges() {
        const containers = document.querySelectorAll('[data-risk-badge]');
        containers.forEach(container => {
            const tokenMint = container.getAttribute('data-risk-badge');
            if (tokenMint) {
                this.renderBadge(tokenMint);
            }
        });
    }
    
    /**
     * Check if data is complete enough to show a stable badge
     */
    isDataComplete(data) {
        // Consider data complete if we have:
        // 1. Explicit completeness flag from backend
        // 2. Explicit badge state from backend
        // 3. Or all critical fields for calculation
        if (data.hasCompleteData === true) {
            return true;
        }
        
        if (data.badgeState !== undefined && data.badgeState !== null) {
            return true;
        }
        
        // Check for critical fields
        const hasPrice = data.price !== undefined || data.velocities?.price5m !== undefined;
        const hasLiquidity = data.liquidity !== undefined && data.liquidity !== null;
        const hasMonitoring = data.monitoring !== undefined || data.monitoringActive !== undefined;
        const hasSellSignal = data.sellSignal !== undefined;
        
        // We need at least price, liquidity, and monitoring status for a stable badge
        return hasPrice && hasLiquidity && hasMonitoring;
    }
    
    /**
     * Clear token data
     */
    clearToken(tokenMint) {
        this.tokenData.delete(tokenMint);
        this.dataCompleteness.delete(tokenMint);
        this.lastBadgeChange.delete(tokenMint);
        
        if (this.renderTimers.has(tokenMint)) {
            clearTimeout(this.renderTimers.get(tokenMint));
            this.renderTimers.delete(tokenMint);
        }
        
        if (this.initialLoadTimers.has(tokenMint)) {
            clearTimeout(this.initialLoadTimers.get(tokenMint));
            this.initialLoadTimers.delete(tokenMint);
        }
    }
    
    /**
     * Clear all data
     */
    clearAll() {
        this.tokenData.clear();
        this.dataCompleteness.clear();
        this.lastBadgeChange.clear();
        
        this.renderTimers.forEach(timer => clearTimeout(timer));
        this.renderTimers.clear();
        
        this.initialLoadTimers.forEach(timer => clearTimeout(timer));
        this.initialLoadTimers.clear();
    }
    
    /**
     * Return numeric priority for a given badge state. Unknown / null states
     * get the lowest priority so they will not override any real value.
     */
    getBadgePriority(state) {
        const idx = this.BADGE_PRIORITY.indexOf(state);
        return idx === -1 ? this.BADGE_PRIORITY.length : idx;
    }
}

// Create singleton instance
window.UnifiedBadgeService = new UnifiedBadgeService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedBadgeService;
}