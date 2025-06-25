/**
 * Monitoring Integration
 * Connects real-time risk display with monitoring tooltips
 */

class MonitoringIntegration {
    constructor() {
        this.supabaseClient = window.supabaseClient;
        this.walletAddress = null;
        this.monitoringSubscription = null;
        this.velocitySubscription = null;
        this.init();
    }

    init() {
        // Wait for wallet connection
        const checkWallet = setInterval(() => {
            const wallet = localStorage.getItem('walletAddress');
            if (wallet) {
                this.walletAddress = wallet;
                clearInterval(checkWallet);
                this.setupIntegration();
            }
        }, 1000);
    }

    setupIntegration() {
        console.log('[MonitoringIntegration] Setting up monitoring integration');
        
        // DISABLED: Realtime subscriptions to prevent WebSocket errors
        // The app uses REST API polling instead of realtime updates
        const ENABLE_REALTIME_MONITORING = false;
        
        if (ENABLE_REALTIME_MONITORING) {
            // Subscribe to monitoring stats updates
            this.subscribeToMonitoringStats();
            
            // Subscribe to velocity data updates
            this.subscribeToVelocityData();
        } else {
            console.log('[MonitoringIntegration] Realtime subscriptions disabled');
        }
        
        // Update risk badges with monitoring attributes
        this.updateExistingBadges();
        
        // Listen for new badges being created
        this.observeBadgeCreation();
    }

    /**
     * Subscribe to monitoring stats table
     */
    subscribeToMonitoringStats() {
        if (!this.supabaseClient) return;
        
        this.monitoringSubscription = this.supabaseClient
            .channel('monitoring-stats-updates')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'monitoring_stats',
                    filter: `wallet_address=eq.${this.walletAddress}`
                },
                (payload) => {
                    console.log('[MonitoringIntegration] Monitoring stats update:', payload);
                    
                    if (payload.new) {
                        const tokenMint = payload.new.token_mint;
                        this.updateBadgeForToken(tokenMint);
                        
                        // Show alert if critical pattern detected
                        if (payload.new.flash_rug_alert || payload.new.rapid_drain_alert) {
                            this.showCriticalAlert(tokenMint, payload.new);
                        }
                    }
                }
            )
            .subscribe();
    }

    /**
     * Subscribe to velocity data updates
     */
    subscribeToVelocityData() {
        if (!this.supabaseClient) return;
        
        this.velocitySubscription = this.supabaseClient
            .channel('velocity-data-updates')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'liquidity_velocity'
                },
                (payload) => {
                    if (payload.new) {
                        const tokenMint = payload.new.token_mint;
                        
                        // Check if this token is protected by current user
                        this.checkIfProtectedToken(tokenMint).then(isProtected => {
                            if (isProtected) {
                                console.log('[MonitoringIntegration] Velocity update for protected token:', tokenMint);
                                this.updateBadgeForToken(tokenMint);
                            }
                        });
                    }
                }
            )
            .subscribe();
    }

    /**
     * Check if token is protected by current user
     */
    async checkIfProtectedToken(tokenMint) {
        if (!this.supabaseClient || !this.walletAddress) return false;
        
        try {
            const { data } = await this.supabaseClient
                .from('protected_tokens')
                .select('id')
                .eq('token_mint', tokenMint)
                .eq('wallet_address', this.walletAddress)
                .eq('is_active', true)
                .single();
                
            return !!data;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update existing risk badges with monitoring attributes
     */
    updateExistingBadges() {
        // Find all risk cells
        const riskCells = document.querySelectorAll('td[data-column="risk"]');
        
        riskCells.forEach(cell => {
            const row = cell.closest('tr');
            const tokenMint = row?.getAttribute('data-token-mint');
            
            if (tokenMint) {
                this.updateBadgeForToken(tokenMint);
            }
        });
    }

    /**
     * Update badge for specific token
     */
    async updateBadgeForToken(tokenMint) {
        const row = document.querySelector(`tr[data-token-mint="${tokenMint}"]`);
        if (!row) return;
        
        const riskCell = row.querySelector('td[data-column="risk"]');
        if (!riskCell) return;
        
        const badge = riskCell.querySelector('.risk-badge, .real-time-risk-badge');
        if (!badge) return;
        
        // Check if monitoring is enabled
        const protectionData = await this.getProtectionStatus(tokenMint);
        
        if (protectionData && protectionData.mempool_monitoring) {
            // Add monitoring attributes
            badge.setAttribute('data-monitoring-mint', tokenMint);
            badge.setAttribute('data-wallet-address', this.walletAddress);
            badge.classList.add('monitoring-enabled', 'cursor-pointer');
            
            // Add visual indicator
            if (!badge.querySelector('.monitoring-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'monitoring-indicator';
                indicator.innerHTML = `
                    <svg class="w-3 h-3 text-blue-400 animate-pulse ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                `;
                badge.appendChild(indicator);
            }
        } else {
            // Remove monitoring attributes
            badge.removeAttribute('data-monitoring-mint');
            badge.removeAttribute('data-wallet-address');
            badge.classList.remove('monitoring-enabled');
            
            // Remove indicator
            const indicator = badge.querySelector('.monitoring-indicator');
            if (indicator) indicator.remove();
        }
    }

    /**
     * Get protection status for token
     */
    async getProtectionStatus(tokenMint) {
        if (!this.supabaseClient || !this.walletAddress) return null;
        
        try {
            const { data } = await this.supabaseClient
                .from('protected_tokens')
                .select('mempool_monitoring, risk_threshold, monitoring_active')
                .eq('token_mint', tokenMint)
                .eq('wallet_address', this.walletAddress)
                .eq('is_active', true)
                .single();
                
            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Observe for new badge creation
     */
    observeBadgeCreation() {
        // Use MutationObserver to watch for new badges
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const badge = node.querySelector?.('.risk-badge, .real-time-risk-badge');
                        if (badge) {
                            const row = badge.closest('tr');
                            const tokenMint = row?.getAttribute('data-token-mint');
                            if (tokenMint) {
                                this.updateBadgeForToken(tokenMint);
                            }
                        }
                    }
                });
            });
        });

        // Observe the token list tbody
        const tbody = document.getElementById('token-list-tbody-v3');
        if (tbody) {
            observer.observe(tbody, { 
                childList: true, 
                subtree: true 
            });
        }
    }

    /**
     * Show critical alert
     */
    showCriticalAlert(tokenMint, monitoringData) {
        // Find token info
        const row = document.querySelector(`tr[data-token-mint="${tokenMint}"]`);
        const symbol = row?.querySelector('[data-column="token"] .font-bold')?.textContent || 'Token';
        
        let alertMessage = `⚠️ CRITICAL ALERT: ${symbol}`;
        
        if (monitoringData.flash_rug_alert) {
            alertMessage += ' - FLASH RUG DETECTED! Liquidity dropping rapidly!';
        } else if (monitoringData.rapid_drain_alert) {
            alertMessage += ' - Rapid liquidity drain detected!';
        }
        
        // Show notification
        this.showNotification(alertMessage, 'critical');
        
        // Flash the row
        if (row) {
            row.classList.add('flash-critical');
            setTimeout(() => row.classList.remove('flash-critical'), 3000);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type === 'critical' ? 'error' : type);
        } else {
            // Fallback to console
            console.log(`[ALERT] ${message}`);
        }
    }

    /**
     * Cleanup subscriptions
     */
    cleanup() {
        if (this.monitoringSubscription) {
            this.monitoringSubscription.unsubscribe();
        }
        if (this.velocitySubscription) {
            this.velocitySubscription.unsubscribe();
        }
    }
}

// Initialize monitoring integration
document.addEventListener('DOMContentLoaded', () => {
    window.monitoringIntegration = new MonitoringIntegration();
});

// Add critical flash animation
const style = document.createElement('style');
style.textContent = `
    @keyframes flash-critical {
        0%, 100% { background-color: transparent; }
        25%, 75% { background-color: rgba(239, 68, 68, 0.2); }
        50% { background-color: rgba(239, 68, 68, 0.3); }
    }
    
    .flash-critical {
        animation: flash-critical 1s ease-in-out 3;
    }
    
    .monitoring-enabled {
        position: relative;
    }
    
    .monitoring-indicator {
        display: inline-flex;
        align-items: center;
    }
`;
document.head.appendChild(style);