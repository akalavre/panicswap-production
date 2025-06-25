import supabase from '../utils/supabaseClient';
import { Connection } from '@solana/web3.js';

export interface SwapAlert {
  type: 'swap_failed' | 'swap_delayed' | 'protection_failed' | 'key_missing' | 'rugpull_detected' | 
        'predictive_rugpull' | 'velocity_warning' | 'liquidity_critical' | 'pattern_detected' |
        'pre_rug_warning' | 'flash_rug_imminent' | 'coordinated_dump_detected' | 'honeypot_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority?: number; // 1-10, with 10 being highest priority
  wallet_address: string;
  token_mint: string;
  message: string;
  error_details?: any;
  metadata?: any;
  predictions?: {
    rugpullProbability: number;
    estimatedTimeToRug?: number; // milliseconds
    confidence: number;
  };
  actionRequired?: {
    type: 'exit_now' | 'exit_soon' | 'monitor' | 'none';
    reason: string;
  };
}

export class AlertingService {
  private static instance: AlertingService;
  private connection: Connection;
  private alertThresholds = {
    confirmationTimeout: 30000, // 30 seconds
    maxRetries: 3,
    criticalFailureCount: 5 // Number of failures before critical alert
  };
  
  // Rate limiting
  private alertCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_ALERTS_PER_WINDOW = 10;
  private readonly CRITICAL_ALERTS_BYPASS_LIMIT = true; // Critical alerts bypass rate limits
  
  // Priority queue for alerts
  private alertQueue: SwapAlert[] = [];
  private processingQueue = false;
  private readonly QUEUE_PROCESS_INTERVAL = 100; // Process queue every 100ms
  
  // Health monitoring
  private lastAlertTimestamp: number = Date.now();
  private alertStats = {
    total: 0,
    successful: 0,
    failed: 0,
    rateLimited: 0
  };

  private constructor(connection: Connection) {
    this.connection = connection;
    // Start queue processor
    this.startQueueProcessor();
  }

  static getInstance(connection: Connection): AlertingService {
    if (!AlertingService.instance) {
      AlertingService.instance = new AlertingService(connection);
    }
    return AlertingService.instance;
  }

  /**
   * Check if alert should be rate limited
   */
  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.alertCounts.get(key);
    
    if (!record || now > record.resetTime) {
      // Create new window
      this.alertCounts.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return false;
    }
    
    if (record.count >= this.MAX_ALERTS_PER_WINDOW) {
      return true;
    }
    
    record.count++;
    return false;
  }

  /**
   * Send an operational alert (adds to priority queue)
   */
  async sendAlert(alert: SwapAlert): Promise<void> {
    // Set default priority based on severity if not provided
    if (!alert.priority) {
      alert.priority = {
        'critical': 10,
        'high': 7,
        'medium': 5,
        'low': 2
      }[alert.severity] || 5;
    }
    
    // Add to priority queue
    this.alertQueue.push(alert);
    this.alertQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Process immediately if critical
    if (alert.severity === 'critical' && !this.processingQueue) {
      this.processNextAlert();
    }
  }
  
  /**
   * Process alerts from the priority queue
   */
  private async processNextAlert(): Promise<void> {
    if (this.processingQueue || this.alertQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    const alert = this.alertQueue.shift();
    
    if (!alert) {
      this.processingQueue = false;
      return;
    }
    
    try {
      await this.processAlert(alert);
    } finally {
      this.processingQueue = false;
    }
  }
  
  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue && this.alertQueue.length > 0) {
        this.processNextAlert();
      }
    }, this.QUEUE_PROCESS_INTERVAL);
  }
  
  /**
   * Process an individual alert
   */
  private async processAlert(alert: SwapAlert): Promise<void> {
    try {
      // Rate limiting by wallet + alert type (bypassed for critical)
      const rateLimitKey = `${alert.wallet_address}:${alert.type}`;
      if (alert.severity !== 'critical' || !this.CRITICAL_ALERTS_BYPASS_LIMIT) {
        if (this.isRateLimited(rateLimitKey)) {
          console.warn(`[AlertingService] Rate limit exceeded for ${rateLimitKey}`);
          this.alertStats.rateLimited++;
          return;
        }
      }
      
      this.alertStats.total++;
      // Log to database
      const { error } = await supabase
        .from('operational_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          wallet_address: alert.wallet_address,
          token_mint: alert.token_mint,
          message: alert.message,
          error_details: alert.error_details,
          metadata: alert.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[AlertingService] Failed to log alert:', error);
      }

      // Log to console with color coding
      const severityColors = {
        low: '\x1b[34m',      // Blue
        medium: '\x1b[33m',   // Yellow
        high: '\x1b[35m',     // Magenta
        critical: '\x1b[31m'  // Red
      };

      const color = severityColors[alert.severity] || '\x1b[0m';
      console.log(`${color}[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}\x1b[0m`);

      // For critical alerts, also broadcast via Supabase realtime
      if (alert.severity === 'critical') {
        await this.broadcastCriticalAlert(alert);
      }

      // Send to Telegram for medium, high, and critical alerts
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && alert.severity !== 'low') {
        await this.sendTelegramAlert(alert);
      }
      
      // Update stats on success
      this.alertStats.successful++;
      this.lastAlertTimestamp = Date.now();

    } catch (error) {
      console.error('[AlertingService] Error sending alert:', error);
      this.alertStats.failed++;
    }
  }
  
  /**
   * Get health status of the alerting service
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastAlertTimestamp: number;
    timeSinceLastAlert: number;
    stats: { total: number; successful: number; failed: number; rateLimited: number };
    rateLimit: {
      window: number;
      maxPerWindow: number;
    };
  } {
    const now = Date.now();
    const timeSinceLastAlert = now - this.lastAlertTimestamp;
    
    // Consider unhealthy if no alerts in last hour and there have been failures
    const status = 
      this.alertStats.failed > this.alertStats.successful ? 'unhealthy' :
      timeSinceLastAlert > 3600000 && this.alertStats.total > 0 ? 'degraded' :
      'healthy';
    
    return {
      status,
      lastAlertTimestamp: this.lastAlertTimestamp,
      timeSinceLastAlert,
      stats: { ...this.alertStats },
      rateLimit: {
        window: this.RATE_LIMIT_WINDOW,
        maxPerWindow: this.MAX_ALERTS_PER_WINDOW
      }
    };
  }

  /**
   * Monitor swap execution and alert on failures
   */
  async monitorSwapExecution(
    tokenMint: string,
    walletAddress: string,
    signature: string | null,
    startTime: number
  ): Promise<void> {
    if (!signature) {
      await this.sendAlert({
        type: 'swap_failed',
        severity: 'high',
        wallet_address: walletAddress,
        token_mint: tokenMint,
        message: `Swap failed - no signature returned`,
        metadata: { execution_time: Date.now() - startTime }
      });
      return;
    }

    // Monitor confirmation
    const confirmationTimeout = setTimeout(async () => {
      await this.sendAlert({
        type: 'swap_delayed',
        severity: 'medium',
        wallet_address: walletAddress,
        token_mint: tokenMint,
        message: `Swap confirmation delayed beyond ${this.alertThresholds.confirmationTimeout}ms`,
        metadata: { signature }
      });
    }, this.alertThresholds.confirmationTimeout);

    try {
      const result = await this.connection.confirmTransaction(signature, 'confirmed');
      clearTimeout(confirmationTimeout);

      if (result.value.err) {
        await this.sendAlert({
          type: 'swap_failed',
          severity: 'high',
          wallet_address: walletAddress,
          token_mint: tokenMint,
          message: `Swap transaction failed on-chain`,
          error_details: result.value.err,
          metadata: { signature }
        });
      }
    } catch (error) {
      clearTimeout(confirmationTimeout);
      await this.sendAlert({
        type: 'swap_failed',
        severity: 'critical',
        wallet_address: walletAddress,
        token_mint: tokenMint,
        message: `Failed to confirm swap transaction`,
        error_details: error,
        metadata: { signature }
      });
    }
  }

  /**
   * Alert when private key is missing for auto-protection
   */
  async alertMissingKey(walletAddress: string, tokenMint: string): Promise<void> {
    await this.sendAlert({
      type: 'key_missing',
      severity: 'critical',
      wallet_address: walletAddress,
      token_mint: tokenMint,
      message: `No private key available for auto-protection execution`
    });
  }

  /**
   * Check recent failure rates and escalate if needed
   */
  async checkFailureRates(): Promise<void> {
    try {
      // Get failures in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentFailures, error } = await supabase
        .from('operational_alerts')
        .select('*')
        .in('alert_type', ['swap_failed', 'protection_failed'])
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AlertingService] Error checking failure rates:', error);
        return;
      }

      if (recentFailures && recentFailures.length >= this.alertThresholds.criticalFailureCount) {
        await this.sendAlert({
          type: 'protection_failed',
          severity: 'critical',
          wallet_address: 'SYSTEM',
          token_mint: 'SYSTEM',
          message: `Critical: ${recentFailures.length} protection failures in the last hour`,
          metadata: {
            failure_count: recentFailures.length,
            recent_failures: recentFailures.slice(0, 5) // First 5 for context
          }
        });
      }
    } catch (error) {
      console.error('[AlertingService] Error in checkFailureRates:', error);
    }
  }

  /**
   * Broadcast critical alerts via Supabase realtime
   */
  private async broadcastCriticalAlert(alert: SwapAlert): Promise<void> {
    try {
      await supabase
        .from('critical_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          wallet_address: alert.wallet_address,
          token_mint: alert.token_mint,
          message: alert.message,
          metadata: alert.metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('[AlertingService] Error broadcasting critical alert:', error);
    }
  }

  /**
   * Send alert to Telegram (if configured)
   */
  private async sendTelegramAlert(alert: SwapAlert): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

    try {
      const emoji = {
        low: '💙',
        medium: '⚠️',
        high: '🔴',
        critical: '🚨'
      }[alert.severity];

      const severityText = {
        low: 'LOW',
        medium: 'MEDIUM',
        high: 'HIGH',
        critical: 'CRITICAL'
      }[alert.severity];

      // Use HTML format for better reliability
      const shortWallet = alert.wallet_address.substring(0, 4) + '...' + alert.wallet_address.substring(alert.wallet_address.length - 4);
      const shortToken = alert.token_mint.substring(0, 4) + '...' + alert.token_mint.substring(alert.token_mint.length - 4);

      let message = '';
      
      // Special formatting for pattern-based alerts
      if (alert.type === 'pattern_detected' || alert.type === 'flash_rug_imminent' || 
          alert.type === 'coordinated_dump_detected' || alert.type === 'honeypot_detected' ||
          alert.type === 'pre_rug_warning') {
        message = this.formatPatternAlertForTelegram(alert);
      }
      // Special formatting for rugpull alerts
      else if (alert.type === 'rugpull_detected') {
        const symbol = alert.metadata?.token_symbol || 'Unknown';
        const name = alert.metadata?.token_name || 'Unknown Token';
        
        message = `${emoji} <b>RUGPULL ALERT!</b> ${emoji}\n\n`;
        message += `🪙 <b>Token</b>: ${symbol} (${name})\n`;
        message += `📍 <b>Contract</b>: <code>${shortToken}</code>\n`;
        message += `👛 <b>Your Wallet</b>: <code>${shortWallet}</code>\n\n`;
        message += `⚠️ <b>Alert</b>: ${alert.message}\n\n`;
        
        if (alert.metadata?.pool_address) {
          message += `🏊 <b>Pool</b>: <code>${alert.metadata.pool_address.substring(0, 8)}...</code>\n`;
        }
        
        message += `\n🛡️ <b>Action</b>: PanicSwap is protecting your funds!\n`;
        message += `⏱️ <b>Time</b>: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;
      } else {
        // Default formatting for other alerts
        message = `${emoji} <b>${severityText} ALERT</b>: ${alert.type.replace(/_/g, ' ').toUpperCase()}\n\n`;
        message += `📝 <b>Message</b>: ${alert.message}\n`;
        message += `👛 <b>Wallet</b>: <code>${shortWallet}</code>\n`;
        message += `🪙 <b>Token</b>: <code>${shortToken}</code>\n`;
        message += `🕒 <b>Time</b>: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC\n`;

        if (alert.error_details) {
          const errorStr = JSON.stringify(alert.error_details).substring(0, 200);
          message += `\n⚠️ <b>Error Details</b>: ${errorStr}...`;
        }
      }

      message += `\n\n<i>PanicSwap Protection System</i>`;

      // Send to channel
      await this.sendTelegramMessage(process.env.TELEGRAM_CHAT_ID, message);

      // Also send to user's personal chat if they have Telegram connected
      await this.sendToUserTelegram(alert.wallet_address, message);
      
    } catch (error) {
      console.error('[AlertingService] Error sending Telegram alert:', error);
    }
  }

  /**
   * Send message to a specific Telegram chat
   */
  private async sendTelegramMessage(chatId: string, message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('[AlertingService] Telegram message failed:', result);
    }
  }

  /**
   * Send alert to user's personal Telegram if connected
   */
  private async sendToUserTelegram(walletAddress: string, message: string): Promise<void> {
    try {
      // Check if user has Telegram connected
      const { data: user, error } = await supabase
        .from('users')
        .select('telegram_chat_id, telegram_connected, telegram_notifications_enabled')
        .eq('wallet_address', walletAddress)
        .single();

      if (error || !user || !user.telegram_connected || !user.telegram_notifications_enabled || !user.telegram_chat_id) {
        return;
      }

      // Send personal alert
      await this.sendTelegramMessage(user.telegram_chat_id, message);
    } catch (error) {
      console.error('[AlertingService] Error sending personal Telegram alert:', error);
    }
  }

  /**
   * Send predictive rugpull alert based on patterns
   */
  async sendPredictiveAlert(
    tokenMint: string,
    walletAddress: string,
    rugpullProbability: number,
    patterns: string[],
    estimatedTimeToRug?: number
  ): Promise<void> {
    const severity = rugpullProbability > 80 ? 'critical' :
                    rugpullProbability > 60 ? 'high' :
                    rugpullProbability > 40 ? 'medium' : 'low';
    
    const timeEstimate = estimatedTimeToRug ? 
      ` Estimated time: ${Math.round(estimatedTimeToRug / 60000)} minutes` : '';
    
    await this.sendAlert({
      type: 'predictive_rugpull',
      severity,
      priority: Math.ceil(rugpullProbability / 10), // 1-10 based on probability
      wallet_address: walletAddress,
      token_mint: tokenMint,
      message: `Rugpull probability: ${rugpullProbability.toFixed(1)}%.${timeEstimate} Patterns: ${patterns.join(', ')}`,
      predictions: {
        rugpullProbability,
        estimatedTimeToRug,
        confidence: patterns.length > 3 ? 0.9 : patterns.length > 1 ? 0.7 : 0.5
      },
      metadata: { patterns }
    });
  }
  
  /**
   * Send velocity warning alert
   */
  async sendVelocityAlert(
    tokenMint: string,
    walletAddress: string,
    velocityMetrics: any
  ): Promise<void> {
    const { liquidityVelocity, priceVelocity, isHighVelocity } = velocityMetrics;
    
    await this.sendAlert({
      type: 'velocity_warning',
      severity: isHighVelocity ? 'high' : 'medium',
      priority: isHighVelocity ? 8 : 5,
      wallet_address: walletAddress,
      token_mint: tokenMint,
      message: `High velocity detected: Liquidity ${liquidityVelocity.toFixed(1)}%/min, Price ${priceVelocity.toFixed(1)}%/min`,
      metadata: velocityMetrics
    });
  }
  
  /**
   * Analyze patterns for predictive alerts
   */
  async analyzeForPredictiveAlerts(tokenMint: string): Promise<void> {
    try {
      // Get recent rugcheck data
      const { data: recentData, error } = await supabase
        .from('rugcheck_reports')
        .select('*')
        .eq('token_mint', tokenMint)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error || !recentData || recentData.length < 2) return;
      
      const patterns: string[] = [];
      let rugpullProbability = 0;
      
      const latest = recentData[0];
      const previous = recentData[1];
      
      // Pattern 1: Rapid liquidity decrease
      if (latest.liquidity_current < previous.liquidity_current * 0.8) {
        patterns.push('rapid_liquidity_drop');
        rugpullProbability += 30;
      }
      
      // Pattern 2: Dev wallet activity spike
      if (latest.dev_activity_pct > 50 && latest.dev_activity_pct > previous.dev_activity_pct * 2) {
        patterns.push('dev_activity_spike');
        rugpullProbability += 25;
      }
      
      // Pattern 3: Holder concentration increase
      const latestTopHolder = latest.top_holders?.[0]?.percentage || 0;
      const previousTopHolder = previous.top_holders?.[0]?.percentage || 0;
      if (latestTopHolder > previousTopHolder * 1.5 && latestTopHolder > 30) {
        patterns.push('holder_concentration');
        rugpullProbability += 20;
      }
      
      // Pattern 4: Multiple red flags
      if (latest.warnings?.length > 5) {
        patterns.push('multiple_warnings');
        rugpullProbability += 15;
      }
      
      // Pattern 5: Critical risk score trend
      if (latest.risk_score > 70 && latest.risk_score > previous.risk_score) {
        patterns.push('escalating_risk');
        rugpullProbability += 10;
      }
      
      // If patterns detected, send predictive alert
      if (patterns.length > 0 && rugpullProbability > 30) {
        // Get all wallets holding this token
        const { data: wallets } = await supabase
          .from('wallet_tokens')
          .select('wallet_address')
          .eq('token_mint', tokenMint)
          .eq('is_active', true);
          
        if (wallets) {
          for (const wallet of wallets) {
            await this.sendPredictiveAlert(
              tokenMint,
              wallet.wallet_address,
              rugpullProbability,
              patterns
            );
          }
        }
      }
    } catch (error) {
      console.error('[AlertingService] Error analyzing for predictive alerts:', error);
    }
  }
  
  /**
   * Send pattern-based pre-rug warning
   */
  async sendPatternAlert(
    tokenMint: string,
    walletAddress: string,
    analysis: any
  ): Promise<void> {
    const { patterns, overallRisk, recommendation } = analysis;
    
    // Determine alert type based on patterns
    let alertType: SwapAlert['type'] = 'pattern_detected';
    if (patterns.some((p: any) => p.type === 'flash_rug')) {
      alertType = 'flash_rug_imminent';
    } else if (patterns.some((p: any) => p.type === 'coordinated_dump')) {
      alertType = 'coordinated_dump_detected';
    } else if (patterns.some((p: any) => p.type === 'honeypot_evolution')) {
      alertType = 'honeypot_detected';
    } else if (overallRisk >= 70) {
      alertType = 'pre_rug_warning';
    }
    
    const patternDescriptions = patterns.map((p: any) => 
      `${p.type.replace(/_/g, ' ')}: ${(p.confidence * 100).toFixed(0)}% confidence`
    );
    
    await this.sendAlert({
      type: alertType,
      severity: overallRisk >= 80 ? 'critical' : overallRisk >= 60 ? 'high' : 'medium',
      priority: Math.ceil(overallRisk / 10),
      wallet_address: walletAddress,
      token_mint: tokenMint,
      message: `Multiple rug patterns detected. Risk: ${overallRisk}%. ${patternDescriptions.join(', ')}`,
      predictions: {
        rugpullProbability: overallRisk,
        estimatedTimeToRug: patterns[0]?.estimatedTimeToRug ? patterns[0].estimatedTimeToRug * 60000 : undefined,
        confidence: Math.max(...patterns.map((p: any) => p.confidence))
      },
      actionRequired: {
        type: recommendation,
        reason: `Based on ${patterns.length} detected patterns`
      },
      metadata: { patterns, analysis }
    });
  }
  
  /**
   * Enhanced Telegram formatting for pattern alerts
   */
  private formatPatternAlertForTelegram(alert: SwapAlert): string {
    const emoji = '🚨';
    let message = `${emoji} <b>RUG PATTERN DETECTED!</b> ${emoji}\n\n`;
    
    const symbol = alert.metadata?.token_symbol || 'Unknown';
    const shortToken = alert.token_mint.substring(0, 8) + '...';
    
    message += `🪙 <b>Token</b>: ${symbol} (<code>${shortToken}</code>)\n`;
    message += `🎯 <b>Risk Level</b>: ${alert.predictions?.rugpullProbability || 0}%\n\n`;
    
    if (alert.metadata?.patterns) {
      message += `⚠️ <b>Detected Patterns:</b>\n`;
      for (const pattern of alert.metadata.patterns) {
        const emoji = pattern.severity === 'critical' ? '🔴' : 
                      pattern.severity === 'high' ? '🟠' : '🟡';
        message += `${emoji} ${pattern.type.replace(/_/g, ' ').toUpperCase()}\n`;
        pattern.indicators.forEach((ind: string) => {
          message += `   • ${ind}\n`;
        });
      }
    }
    
    if (alert.actionRequired) {
      const actionEmoji = alert.actionRequired.type === 'exit_now' ? '🚪💨' :
                         alert.actionRequired.type === 'exit_soon' ? '⏰' :
                         alert.actionRequired.type === 'monitor' ? '👀' : '✅';
      message += `\n${actionEmoji} <b>Recommended Action</b>: ${alert.actionRequired.type.replace(/_/g, ' ').toUpperCase()}\n`;
    }
    
    if (alert.predictions?.estimatedTimeToRug) {
      const minutes = Math.round(alert.predictions.estimatedTimeToRug / 60000);
      message += `⏱️ <b>Estimated Time</b>: ${minutes} minutes\n`;
    }
    
    message += `\n🛡️ <i>PanicSwap is monitoring this token closely</i>`;
    
    return message;
  }
  
  /**
   * Start periodic monitoring
   */
  startMonitoring(): void {
    // Check failure rates every 5 minutes
    setInterval(() => {
      this.checkFailureRates().catch(console.error);
    }, 5 * 60 * 1000);

    console.log('[AlertingService] Monitoring started');
  }
}

export const createAlertingService = (connection: Connection) => {
  return AlertingService.getInstance(connection);
};