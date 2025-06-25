// Monitoring Tooltip Component
class MonitoringTooltip {
    constructor() {
        this.tooltip = null;
        this.currentTarget = null;
        this.updateInterval = null;
        this.isVisible = false;
        this.cache = new Map();
        this.init();
    }

    init() {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'monitoring-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            z-index: 999999;
            background: rgba(17, 24, 39, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 16px;
            max-width: 320px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s ease;
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(this.tooltip);

        // Add event listeners for elements with monitoring data
        // Use capturing phase to intercept before basic tooltip
        document.addEventListener('mouseover', this.handleMouseOver.bind(this), true);
        document.addEventListener('mouseout', this.handleMouseOut.bind(this), true);
    }

    handleMouseOver(e) {
        // Look for both monitoring-mint and token-mint attributes
        const target = e.target.closest('[data-monitoring-mint], .real-time-risk-badge[data-token-mint]');
        if (!target) return;

        // Check if monitoring is enabled from the basic tooltip data
        const tooltipData = target.dataset.tooltip ? JSON.parse(target.dataset.tooltip) : null;
        
        console.log('[MonitoringTooltip] Mouseover:', {
            tokenMint: target.dataset.tokenMint,
            tooltipData: tooltipData,
            monitoring: tooltipData?.monitoring
        });
        
        if (!tooltipData || !tooltipData.monitoring) {
            // Let the basic tooltip handle non-monitored tokens
            return;
        }

        // Stop event propagation to prevent basic tooltip
        e.stopPropagation();

        this.currentTarget = target;
        const tokenMint = target.dataset.monitoringMint || target.dataset.tokenMint;
        const walletAddress = target.dataset.walletAddress || localStorage.getItem('walletAddress');

        if (!tokenMint || !walletAddress) return;

        this.showTooltip(target, tokenMint, walletAddress);
    }

    handleMouseOut(e) {
        const target = e.target.closest('[data-monitoring-mint], .real-time-risk-badge[data-token-mint]');
        if (!target || target !== this.currentTarget) return;

        // Check if this was a monitored token
        const tooltipData = target.dataset.tooltip ? JSON.parse(target.dataset.tooltip) : null;
        if (tooltipData && tooltipData.monitoring) {
            e.stopPropagation();
        }

        this.hideTooltip();
    }

    async showTooltip(target, tokenMint, walletAddress) {
        this.isVisible = true;
        
        // Hide any existing basic tooltip
        const existingTooltip = document.getElementById('risk-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Show loading state
        this.tooltip.innerHTML = this.getLoadingHTML();
        this.positionTooltip(target);
        this.tooltip.style.display = 'block';
        
        setTimeout(() => {
            this.tooltip.style.opacity = '1';
            this.tooltip.style.transform = 'translateY(0)';
        }, 10);

        // Fetch monitoring data
        await this.updateMonitoringData(tokenMint, walletAddress);

        // Start auto-update
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateMonitoringData(tokenMint, walletAddress);
            }
        }, 30000); // Update every 30 seconds
    }

    hideTooltip() {
        this.isVisible = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.tooltip.style.opacity = '0';
        this.tooltip.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            if (!this.isVisible) {
                this.tooltip.style.display = 'none';
            }
        }, 200);
    }

    async updateMonitoringData(tokenMint, walletAddress) {
        try {
            // Get the base path from the current location
            const basePath = window.location.pathname.includes('/PanicSwap-php') ? '/PanicSwap-php' : '';
            const response = await fetch(`${basePath}/api/monitoring-status.php/${tokenMint}?wallet=${walletAddress}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!this.isVisible) return;
            
            this.cache.set(tokenMint, data);
            this.tooltip.innerHTML = this.renderMonitoringData(data);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
            if (this.isVisible) {
                this.tooltip.innerHTML = this.getErrorHTML();
            }
        }
    }

    renderMonitoringData(data) {
        const { monitoring, liquidity, price, alerts, patterns, stats } = data;
        
        let html = '<div class="monitoring-content">';
        
        // Header
        html += `
            <div class="monitoring-header">
                <h4 class="text-sm font-semibold text-white mb-3">
                    Live Monitoring Status
                </h4>
                ${monitoring.active ? 
                    '<span class="monitoring-badge active">● Active</span>' : 
                    '<span class="monitoring-badge inactive">● Inactive</span>'
                }
            </div>
        `;
        
        // Monitoring Settings
        html += `
            <div class="monitoring-section">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-400">Mempool Monitoring</span>
                    <span class="text-xs ${monitoring.mempoolEnabled ? 'text-green-400' : 'text-gray-500'}">
                        ${monitoring.mempoolEnabled ? 'ON' : 'OFF'}
                    </span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-400">Risk Threshold</span>
                    <span class="text-xs text-blue-400">${monitoring.riskThreshold}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-400">Active Monitors</span>
                    <span class="text-xs text-white">${monitoring.activeMonitors}</span>
                </div>
            </div>
        `;
        
        // Liquidity Velocity
        if (liquidity.current > 0) {
            html += `
                <div class="monitoring-section">
                    <h5 class="text-xs font-medium text-gray-300 mb-2">Liquidity Tracking</h5>
                    <div class="liquidity-stats">
                        <div class="stat-row">
                            <span class="text-xs text-gray-400">Current</span>
                            <span class="text-xs text-white">$${this.formatNumber(liquidity.current)}</span>
                        </div>
                        ${this.renderVelocityRow('1m', liquidity.change1m)}
                        ${this.renderVelocityRow('5m', liquidity.change5m)}
                        ${this.renderVelocityRow('30m', liquidity.change30m)}
                    </div>
                </div>
            `;
        }
        
        // Active Alerts
        const activeAlerts = [];
        if (alerts.flashRug) activeAlerts.push({ type: 'Flash Rug', severity: 'critical' });
        if (alerts.rapidDrain) activeAlerts.push({ type: 'Rapid Drain', severity: 'high' });
        if (alerts.slowBleed) activeAlerts.push({ type: 'Slow Bleed', severity: 'medium' });
        if (alerts.volumeSpike) activeAlerts.push({ type: 'Volume Spike', severity: 'low' });
        
        if (activeAlerts.length > 0) {
            html += `
                <div class="monitoring-section alerts">
                    <h5 class="text-xs font-medium text-red-400 mb-2">⚠️ Active Alerts</h5>
                    ${activeAlerts.map(alert => `
                        <div class="alert-item ${alert.severity}">
                            <span class="alert-dot"></span>
                            <span class="text-xs">${alert.type}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Pattern Detection
        if (patterns.active && patterns.active.length > 0) {
            html += `
                <div class="monitoring-section patterns">
                    <h5 class="text-xs font-medium text-purple-400 mb-2">Pattern Detection</h5>
                    ${patterns.active.map(pattern => `
                        <div class="pattern-item">
                            <span class="text-xs text-gray-300">${pattern.type}</span>
                            <span class="text-xs text-gray-500">${(pattern.confidence * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                    ${patterns.timeToRug ? `
                        <div class="time-to-rug mt-2">
                            <span class="text-xs text-orange-400">Est. time to rug: ${patterns.timeToRug}m</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Stats
        html += `
            <div class="monitoring-section stats">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">Alerts: ${stats.alertsCount}</span>
                    <span class="text-xs text-gray-500">Triggers: ${stats.triggerCount}</span>
                </div>
                ${data.lastUpdate ? `
                    <div class="text-xs text-gray-600 mt-2">
                        Updated ${this.getRelativeTime(data.lastUpdate)}
                    </div>
                ` : ''}
            </div>
        `;
        
        html += '</div>';
        
        // Add custom styles
        html += this.getStyles();
        
        return html;
    }

    renderVelocityRow(period, value) {
        const isNegative = value < 0;
        const color = isNegative ? 'text-red-400' : 'text-green-400';
        const arrow = isNegative ? '↓' : '↑';
        
        return `
            <div class="stat-row">
                <span class="text-xs text-gray-400">${period} change</span>
                <span class="text-xs ${color}">${arrow} ${Math.abs(value).toFixed(2)}%/min</span>
            </div>
        `;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    getRelativeTime(timestamp) {
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diff = now - then;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return Math.floor(diff / 86400000) + 'd ago';
    }

    positionTooltip(target) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;
        
        // Check boundaries
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    getLoadingHTML() {
        return `
            <div class="monitoring-loading">
                <div class="spinner"></div>
                <span class="text-xs text-gray-400 ml-2">Loading monitoring data...</span>
            </div>
            ${this.getStyles()}
        `;
    }

    getErrorHTML() {
        return `
            <div class="monitoring-error">
                <span class="text-xs text-red-400">Failed to load monitoring data</span>
            </div>
            ${this.getStyles()}
        `;
    }

    getStyles() {
        return `
            <style>
                .monitoring-content {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .monitoring-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(75, 85, 99, 0.3);
                }
                
                .monitoring-badge {
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .monitoring-badge.active {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                
                .monitoring-badge.inactive {
                    background: rgba(107, 114, 128, 0.1);
                    color: #6b7280;
                    border: 1px solid rgba(107, 114, 128, 0.2);
                }
                
                .monitoring-section {
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
                }
                
                .monitoring-section:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }
                
                .alert-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 4px;
                    padding: 4px 8px;
                    border-radius: 6px;
                }
                
                .alert-item.critical {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .alert-item.high {
                    background: rgba(251, 146, 60, 0.1);
                    color: #fb923c;
                }
                
                .alert-item.medium {
                    background: rgba(250, 204, 21, 0.1);
                    color: #facc15;
                }
                
                .alert-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: pulse 2s infinite;
                }
                
                .pattern-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                
                .time-to-rug {
                    padding: 6px 10px;
                    background: rgba(251, 146, 60, 0.1);
                    border: 1px solid rgba(251, 146, 60, 0.2);
                    border-radius: 6px;
                    text-align: center;
                }
                
                .monitoring-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(59, 130, 246, 0.2);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
        `;
    }
}

// Initialize monitoring tooltip when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.monitoringTooltip = new MonitoringTooltip();
        console.log('[MonitoringTooltip] Initialized');
    });
} else {
    window.monitoringTooltip = new MonitoringTooltip();
    console.log('[MonitoringTooltip] Initialized (DOM already loaded)');
}