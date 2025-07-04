/**
 * Real-Time Risk Display
 * Shows mempool monitoring status and threat levels in real-time
 * Integrates with Supabase protection_alerts and token_price_history
 * Provides color-coded badge system with tooltips
 */

(function() {
    'use strict';
    
    // Cache for threat data and monitoring status
    const threatCache = new Map();
    const monitoringStatus = new Map();
    const priceHistoryCache = new Map();
    const alertsCache = new Map();
    let threatSubscription = null;
    let statusSubscription = null;
    let alertsSubscription = null;
    let priceHistorySubscription = null;
    
    /**
     * Initialize real-time risk display
     */
    function initRealTimeRisk() {
        console.log('[RealTimeRisk] Initializing real-time risk display');
        
        // Subscribe to protection events for monitoring status
        if (window.supabaseClient) {
            subscribeToProtectionEvents();
            subscribeToThreatAlerts();
        }
        
        // Update display when tokens load
        if (window.tokenListV3State) {
            updateAllTokenRiskDisplays();
        }
    }
    
    /**
     * Subscribe to protection events to track monitoring status
     */
    function subscribeToProtectionEvents() {
        statusSubscription = window.supabaseClient
            .channel('protection-monitoring')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'protected_tokens' 
                },
                (payload) => {
                    console.log('[RealTimeRisk] Protection status update:', payload);
                    
                    if (payload.new) {
                        const tokenMint = payload.new.token_mint;
                        const isMonitoring = payload.new.mempool_monitoring || false;
                        const riskThreshold = payload.new.risk_threshold || 'HIGH';
                        
                        monitoringStatus.set(tokenMint, {
                            monitoring: isMonitoring,
                            threshold: riskThreshold,
                            lastUpdate: new Date()
                        });
                        
                        // Update display for this token
                        updateTokenRiskDisplay(tokenMint);
                    }
                }
            )
            .subscribe();
            
        // Subscribe to protection alerts
        alertsSubscription = window.supabaseClient
            .channel('protection-alerts')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'protection_alerts' 
                },
                (payload) => {
                    console.log('[RealTimeRisk] Protection alert update:', payload);
                    
                    if (payload.new && (payload.new.severity === 'warning' || payload.new.severity === 'critical')) {
                        handleProtectionAlert(payload.new);
                    }
                }
            )
            .subscribe();
            
        // Subscribe to token price history for real-time price deltas
        priceHistorySubscription = window.supabaseClient
            .channel('price-history')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'token_price_history' 
                },
                (payload) => {
                    console.log('[RealTimeRisk] Price history update:', payload);
                    
                    if (payload.new) {
                        handlePriceHistoryUpdate(payload.new);
                    }
                }
            )
            .subscribe();
    }
    
    /**
     * Subscribe to threat alerts from pattern_alerts table
     */
    function subscribeToThreatAlerts() {
        threatSubscription = window.supabaseClient
            .channel('threat-alerts')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pattern_alerts'
                },
                (payload) => {
                    console.log('[RealTimeRisk] Threat alert received:', payload);
                    
                    if (payload.new) {
                        const alert = payload.new;
                        handleThreatAlert(alert);
                    }
                }
            )
            .subscribe();
    }
    
    /**
     * Handle incoming threat alert
     */
    function handleThreatAlert(alert) {
        const tokenMint = alert.token_mint;
        const riskScore = alert.risk_score || 0;
        const recommendation = alert.recommendation || '';
        const patterns = alert.patterns || [];
        
        // Cache threat data
        threatCache.set(tokenMint, {
            riskScore,
            recommendation,
            patterns,
            timestamp: new Date(alert.timestamp || Date.now()),
            alertType: alert.alert_type
        });
        
        // Show notification if high risk
        if (riskScore >= 70) {
            showThreatNotification(tokenMint, alert);
        }
        
        // Update display
        updateTokenRiskDisplay(tokenMint);
    }
    
    /**
     * Handle protection alert from Supabase
     */
    function handleProtectionAlert(alert) {
        const tokenMint = alert.token_mint;
        const severity = alert.severity; // 'warning' or 'critical'
        const message = alert.message;
        
        // Cache alert data
        if (!alertsCache.has(tokenMint)) {
            alertsCache.set(tokenMint, []);
        }
        
        const alerts = alertsCache.get(tokenMint);
        alerts.unshift({
            severity,
            message,
            timestamp: new Date(alert.created_at || Date.now()),
            data: alert.alert_data || {}
        });
        
        // Keep only last 10 alerts per token
        if (alerts.length > 10) {
            alerts.splice(10);
        }
        
        // Update risk badge based on alert severity
        updateTokenRiskDisplay(tokenMint);
        
        // Show notification for critical alerts
        if (severity === 'critical') {
            showThreatNotification(tokenMint, { recommendation: message });
        }
    }
    
    /**
     * Handle price history update for delta calculations
     */
    function handlePriceHistoryUpdate(priceData) {
        const tokenMint = priceData.token_mint;
        const price = parseFloat(priceData.price);
        const timestamp = new Date(priceData.recorded_at);
        
        // Cache price history for delta calculations
        if (!priceHistoryCache.has(tokenMint)) {
            priceHistoryCache.set(tokenMint, []);
        }
        
        const history = priceHistoryCache.get(tokenMint);
        history.unshift({ price, timestamp });
        
        // Keep only last 100 price points for calculations
        if (history.length > 100) {
            history.splice(100);
        }
        
        // Calculate price deltas
        const deltas = calculatePriceDeltas(history);
        
        // Update monitoring status with new price data
        const monitoring = monitoringStatus.get(tokenMint) || {};
        monitoring.price = deltas;
        monitoring.lastPriceUpdate = timestamp;
        monitoringStatus.set(tokenMint, monitoring);
        
        // Update risk display if significant price change
        if (Math.abs(deltas.change1m) > 5 || Math.abs(deltas.change5m) > 10) {
            updateTokenRiskDisplay(tokenMint);
        }
    }
    
    /**
     * Calculate price deltas from history
     */
    function calculatePriceDeltas(history) {
        if (history.length < 2) {
            return { change1m: 0, change5m: 0, change30m: 0 };
        }
        
        const now = Date.now();
        const current = history[0].price;
        
        // Find prices at different time intervals
        let price1m = null, price5m = null, price30m = null;
        
        for (const point of history) {
            const ageMs = now - point.timestamp.getTime();
            
            if (!price1m && ageMs >= 60000) { // 1 minute
                price1m = point.price;
            }
            if (!price5m && ageMs >= 300000) { // 5 minutes
                price5m = point.price;
            }
            if (!price30m && ageMs >= 1800000) { // 30 minutes
                price30m = point.price;
                break;
            }
        }
        
        return {
            change1m: price1m ? ((current - price1m) / price1m) * 100 : 0,
            change5m: price5m ? ((current - price5m) / price5m) * 100 : 0,
            change30m: price30m ? ((current - price30m) / price30m) * 100 : 0
        };
    }
    
    /**
     * Calculate risk score based on multiple factors
     */
    function calculateRiskScore(tokenMint) {
        const monitoring = monitoringStatus.get(tokenMint);
        const alerts = alertsCache.get(tokenMint) || [];
        const threat = threatCache.get(tokenMint);
        
        let riskScore = 0;
        
        // Base score from alerts (severity >= warning)
        const criticalAlerts = alerts.filter(a => a.severity === 'critical' && 
            (Date.now() - a.timestamp.getTime()) < 300000); // 5 min window
        const warningAlerts = alerts.filter(a => a.severity === 'warning' && 
            (Date.now() - a.timestamp.getTime()) < 600000); // 10 min window
        
        riskScore += criticalAlerts.length * 30; // +30 per critical alert
        riskScore += warningAlerts.length * 15; // +15 per warning alert
        
        // Price delta factors
        if (monitoring?.price) {
            const { change1m, change5m } = monitoring.price;
            
            // Rapid price drops increase risk
            if (change1m < -10) riskScore += 25;
            if (change1m < -20) riskScore += 25;
            if (change5m < -15) riskScore += 20;
            if (change5m < -30) riskScore += 30;
        }
        
        // Liquidity factors
        if (monitoring?.liquidity) {
            const { change1m, change5m } = monitoring.liquidity;
            
            // Liquidity drops are critical
            if (change1m < -15) riskScore += 30;
            if (change1m < -30) riskScore += 40;
            if (change5m < -25) riskScore += 25;
            if (change5m < -50) riskScore += 50;
        }
        
        // Pattern-based threats
        if (threat && (Date.now() - threat.timestamp.getTime()) < 300000) {
            riskScore += threat.riskScore * 0.5; // 50% weight for pattern threats
        }
        
        return Math.min(riskScore, 100); // Cap at 100
    }
    
    /**
     * Get badge color based on risk score
     */
    function getBadgeColor(riskScore) {
        if (riskScore >= 80) return 'red';     // Red 80+
        if (riskScore >= 60) return 'orange';  // Orange 60-80  
        if (riskScore >= 40) return 'yellow';  // Yellow 40-60
        return 'green';                        // Green <40
    }
    
    /**
     * Get last alert message for tooltip
     */
    function getLastAlertMessage(tokenMint) {
        const alerts = alertsCache.get(tokenMint);
        if (!alerts || alerts.length === 0) return null;
        
        // Get most recent alert with severity >= warning
        const relevantAlert = alerts.find(a => 
            ['warning', 'critical'].includes(a.severity) &&
            (Date.now() - a.timestamp.getTime()) < 600000 // 10 min window
        );
        
        return relevantAlert ? relevantAlert.message : null;
    }
    
    /**
     * Show threat notification
     */
    function showThreatNotification(tokenMint, alert) {
        // Find token info
        const token = window.tokenListV3State?.tokens?.find(t => t.token_mint === tokenMint);
        if (!token) return;
        
        const message = `⚠️ HIGH RISK DETECTED: ${token.symbol} - ${alert.recommendation}`;
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('PanicSwap Alert', {
                body: message,
                icon: '/PanicSwap-php/assets/images/logo.png',
                tag: `threat-${tokenMint}`,
                requireInteraction: true
            });
        }
        
        // Also show in-app notification
        showInAppNotification(message, 'error');
    }
    
    /**
     * Update risk display for all tokens
     */
    function updateAllTokenRiskDisplays() {
        if (!window.tokenListV3State?.tokens) return;
        
        window.tokenListV3State.tokens.forEach(token => {
            updateTokenRiskDisplay(token.token_mint);
            
            // Fetch current monitoring status for all tokens (not just protected ones)
            // This is needed to detect rugged tokens
            fetchTokenMonitoringStatus(token.token_mint);
        });
    }
    
    /**
     * Update risk display for a specific token
     */
    function updateTokenRiskDisplay(tokenMint) {
        const badgeElement = document.querySelector(`[data-risk-badge="${tokenMint}"]`);
        if (!badgeElement) return;
        
        const badge = createRealTimeRiskBadge(tokenMint);
        badgeElement.innerHTML = badge;
    }
    
    /**
     * Fetch current monitoring status for a token
     */
    async function fetchTokenMonitoringStatus(tokenMint) {
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) return;
        
        try {
            // Get the base path from the current location
            const basePath = window.location.pathname.includes('/PanicSwap-php') ? '/PanicSwap-php' : '';
            
            // Fetch from PHP monitoring API which includes liquidity and price data
            const response = await fetch(`${basePath}/api/monitoring-status.php/${tokenMint}?wallet=${walletAddress}`);
            if (response.ok) {
                const apiData = await response.json();
                console.log('[RealTimeRisk] Fetched monitoring status:', apiData);
                
                monitoringStatus.set(tokenMint, {
                    monitoring: apiData.monitoring?.active || false,
                    threshold: apiData.monitoring?.riskThreshold || 'HIGH',
                    liquidity: apiData.liquidity || { current: 0, change1m: 0, change5m: 0 },
                    price: apiData.price || { change1m: 0, change5m: 0 },
                    alerts: apiData.alerts || {},
                    patterns: apiData.patterns || {},
                    stats: apiData.stats || {},
                    marketData: apiData.marketData || {},
                    status: apiData.status,
                    rugged: apiData.status === 'RUGGED',
                    lastUpdate: new Date(apiData.lastUpdate || Date.now())
                });
                
                // Update display immediately
                updateTokenRiskDisplay(tokenMint);
                return;
            }
        } catch (error) {
            console.error('[RealTimeRisk] Error fetching monitoring status:', error);
        }
        
        // Fallback to Supabase if API fails
        try {
            if (!window.supabaseClient) return;
            
            const { data, error } = await window.supabaseClient
                .from('protected_tokens')
                .select('mempool_monitoring, risk_threshold, is_active')
                .eq('token_mint', tokenMint)
                .eq('wallet_address', walletAddress)
                .eq('is_active', true)
                .single();
                
            if (data && !error) {
                console.log('[RealTimeRisk] Fetched fallback monitoring status:', data);
                
                monitoringStatus.set(tokenMint, {
                    monitoring: { active: data.mempool_monitoring || false },
                    threshold: data.risk_threshold || 'HIGH',
                    lastUpdate: new Date()
                });
                
                // Update display immediately
                updateTokenRiskDisplay(tokenMint);
            }
        } catch (error) {
            console.error('[RealTimeRisk] Error fetching monitoring status:', error);
        }
    }
    
    /**
     * Create real-time risk badge
     */
    function createRealTimeRiskBadge(tokenMint) {
        const monitoring = monitoringStatus.get(tokenMint);
        const threat = threatCache.get(tokenMint);
        
        // Check if token is rugged from multiple sources
        const token = window.tokenListV3State?.tokens?.find(t => t.token_mint === tokenMint);
        const isRugged = token?.status === 'RUGGED' || 
                        monitoring?.rugged === true ||
                        monitoring?.status === 'RUGGED';
        
        if (isRugged) {
            const colorClasses = 'bg-black/30 border-gray-700 text-gray-500';
            return `
                <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md ${colorClasses} cursor-help real-time-risk-badge"
                      data-token-mint="${tokenMint}"
                      data-tooltip='{"rugged": true, "message": "Token has been rugged - liquidity drained"}'>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Rugged</span>
                </span>
            `;
        }
        
        // Determine status
        let status = 'inactive';
        let color = 'gray';
        let text = 'Not Monitored';
        let icon = '';
        let tooltipText = '';
        
        if (monitoring?.monitoring) {
            status = 'monitoring';
            color = 'blue';
            text = 'Monitoring';
            icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
            
            // Check monitoring data for alerts
            if (monitoring.alerts?.flashRug || monitoring.alerts?.rapidDrain) {
                status = 'critical';
                color = 'red';
                text = 'CRITICAL';
                icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
                tooltipText = 'Critical liquidity drain detected!';
            } else if (monitoring.alerts?.slowBleed || monitoring.alerts?.volumeSpike) {
                status = 'warning';
                color = 'yellow';
                text = 'Warning';
                icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
                tooltipText = 'Suspicious activity detected';
            } else if (monitoring.price?.change1m < -10 || monitoring.liquidity?.change1m < -10) {
                // Check for significant price/liquidity drops
                status = 'warning';
                color = 'yellow';
                text = 'Dropping';
                icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>';
                tooltipText = 'Price or liquidity dropping rapidly';
            } else {
                text = 'Safe';
                color = 'green';
                icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                tooltipText = 'No threats detected';
            }
            
            // Check for active threat from pattern_alerts
            if (threat && (Date.now() - threat.timestamp.getTime()) < 300000) { // 5 min
                const riskScore = threat.riskScore;
                
                if (riskScore >= 70) {
                    status = 'critical';
                    color = 'red';
                    text = 'CRITICAL';
                    icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
                    tooltipText = threat.recommendation || 'High risk detected!';
                } else if (riskScore >= 50) {
                    status = 'warning';
                    color = 'yellow';
                    text = 'Warning';
                    icon = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
                    tooltipText = threat.recommendation || 'Moderate risk detected';
                }
            }
        }
        
        // Build tooltip data
        const tooltipData = {
            monitoring: monitoring?.monitoring || false,
            threshold: monitoring?.threshold || 'N/A',
            liquidity: monitoring?.liquidity || null,
            price: monitoring?.price || null,
            alerts: monitoring?.alerts || null,
            patterns: monitoring?.patterns || null,
            threat: threat || null,
            lastUpdate: monitoring?.lastUpdate || null,
            tooltipText: tooltipText
        };
        
        // Color classes
        const colorClasses = {
            red: 'bg-red-500/10 border-red-500/20 text-red-400',
            yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            green: 'bg-green-500/10 border-green-500/20 text-green-400',
            gray: 'bg-gray-500/10 border-gray-500/20 text-gray-400'
        };
        
        const classes = colorClasses[color] || colorClasses.gray;
        
        return `
            <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md ${classes} hover:scale-105 transition-all duration-200 cursor-help real-time-risk-badge"
                  data-token-mint="${tokenMint}"
                  data-tooltip='${JSON.stringify(tooltipData)}'>
                ${icon}
                <span>${text}</span>
                ${monitoring?.monitoring ? '<span class="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>' : ''}
            </span>
        `;
    }
    
    /**
     * Show in-app notification
     */
    function showInAppNotification(message, type = 'info') {
        const container = document.getElementById('notification-container') || createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} animate-slide-in`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white/70 hover:text-white">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            notification.classList.add('animate-slide-out');
            setTimeout(() => notification.remove(), 300);
        }, 10000);
    }
    
    /**
     * Create notification container
     */
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Setup tooltip handlers
     */
    function setupTooltips() {
        document.addEventListener('mouseover', (e) => {
            const badge = e.target.closest('.real-time-risk-badge');
            if (!badge) return;
            
            const data = JSON.parse(badge.dataset.tooltip || '{}');
            
            // If monitoring is enabled, let the monitoring tooltip handle it
            if (data.monitoring && window.monitoringTooltip) {
                console.log('[RealTimeRisk] Skipping basic tooltip - monitoring enabled');
                return;
            }
            
            showRiskTooltip(badge, data);
        });
        
        document.addEventListener('mouseout', (e) => {
            const badge = e.target.closest('.real-time-risk-badge');
            if (!badge) return;
            
            const data = JSON.parse(badge.dataset.tooltip || '{}');
            
            // If monitoring is enabled, let the monitoring tooltip handle it
            if (data.monitoring && window.monitoringTooltip) {
                return;
            }
            
            hideRiskTooltip();
        });
    }
    
    /**
     * Show risk tooltip
     */
    function showRiskTooltip(element, data) {
        hideRiskTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.id = 'risk-tooltip';
        tooltip.className = 'absolute z-50 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-sm max-w-sm';
        
        let content = '<div class="space-y-2">';
        content += '<h4 class="font-semibold text-white">Mempool Monitoring</h4>';
        
        if (data.monitoring) {
            content += `<p class="text-green-400">✓ Active Monitoring</p>`;
            content += `<p class="text-gray-300">Threshold: ${data.threshold}</p>`;
            
            if (data.threat) {
                content += '<hr class="border-gray-700">';
                content += `<p class="text-red-400 font-semibold">⚠️ Threat Detected</p>`;
                content += `<p class="text-gray-300">Risk Score: ${data.threat.riskScore}%</p>`;
                content += `<p class="text-gray-300">${data.threat.recommendation}</p>`;
                
                if (data.threat.patterns?.length > 0) {
                    content += '<p class="text-gray-400 text-xs mt-1">Patterns: ' + 
                        data.threat.patterns.map(p => p.type).join(', ') + '</p>';
                }
            }
        } else {
            content += `<p class="text-gray-400">Not monitored</p>`;
            content += `<p class="text-xs text-gray-500 mt-2">Enable protection to start monitoring</p>`;
        }
        
        if (data.lastUpdate) {
            // Ensure lastUpdate is a Date object
            const updateTime = data.lastUpdate instanceof Date ? data.lastUpdate : new Date(data.lastUpdate);
            const timeAgo = Math.floor((Date.now() - updateTime.getTime()) / 1000);
            content += `<p class="text-xs text-gray-500 mt-2">Updated ${timeAgo}s ago</p>`;
        }
        
        content += '</div>';
        tooltip.innerHTML = content;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.bottom + window.scrollY + 8;
        let left = rect.left + window.scrollX + (rect.width - tooltipRect.width) / 2;
        
        // Adjust if tooltip goes off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top + tooltipRect.height > window.innerHeight + window.scrollY - 10) {
            top = rect.top + window.scrollY - tooltipRect.height - 8;
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }
    
    /**
     * Hide risk tooltip
     */
    function hideRiskTooltip() {
        const tooltip = document.getElementById('risk-tooltip');
        if (tooltip) tooltip.remove();
    }
    
    /**
     * Request notification permission
     */
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initRealTimeRisk();
            setupTooltips();
            requestNotificationPermission();
        });
    } else {
        initRealTimeRisk();
        setupTooltips();
        requestNotificationPermission();
    }
    
    /**
     * Cleanup subscriptions
     */
    function cleanup() {
        console.log('[RealTimeRisk] Cleaning up subscriptions');
        
        if (statusSubscription) {
            statusSubscription.unsubscribe();
            statusSubscription = null;
        }
        
        if (threatSubscription) {
            threatSubscription.unsubscribe();
            threatSubscription = null;
        }
        
        // Clear caches
        threatCache.clear();
        monitoringStatus.clear();
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    
    // Expose API for token list integration
    window.realTimeRisk = {
        updateTokenRiskDisplay,
        updateAllTokenRiskDisplays,
        createRealTimeRiskBadge,
        fetchTokenMonitoringStatus,
        cleanup
    };
    
})();