import { EventEmitter } from 'events';
import supabase from '../utils/supabaseClient';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { SimpleCache } from '../utils/rateLimitWrapper';
import { rugCheckPollingServiceV2 } from './RugCheckPollingServiceV2';
import { AlertingService } from './AlertingService';
import { Connection } from '@solana/web3.js';
import config from '../config';

interface RugPattern {
  type: 'flash_rug' | 'slow_bleed' | 'honeypot_evolution' | 'coordinated_dump' | 'dev_preparation';
  confidence: number; // 0-1
  indicators: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  estimatedTimeToRug?: number; // in minutes
}

interface TokenAnalysis {
  tokenMint: string;
  patterns: RugPattern[];
  overallRisk: number; // 0-100
  recommendation: 'exit_now' | 'exit_soon' | 'monitor_closely' | 'low_risk';
  timestamp: number;
}

interface TransactionPattern {
  tokenMint: string;
  walletAddress: string;
  action: 'buy' | 'sell' | 'transfer';
  amount: number;
  timestamp: number;
}

export class RugPatternDetector extends EventEmitter {
  private analysisCache: SimpleCache<TokenAnalysis>;
  private transactionHistoryCache: SimpleCache<TransactionPattern[]>;
  private honeypotEvolutionCache: SimpleCache<{ failureRate: number; timestamp: number }[]>;
  private devWalletCache: SimpleCache<string[]>;
  private readonly ANALYSIS_INTERVAL = config.patternCheckInterval || 60000; // 1 minute default
  private analysisTimer: NodeJS.Timeout | null = null;
  private alertingService: AlertingService;

  constructor() {
    super();
    this.analysisCache = new SimpleCache(300000); // 5 minute cache
    this.transactionHistoryCache = new SimpleCache(3600000); // 1 hour cache
    this.honeypotEvolutionCache = new SimpleCache(3600000); // 1 hour cache
    this.devWalletCache = new SimpleCache(86400000); // 24 hour cache
    
    // Initialize alerting service
    const connection = new Connection(config.heliusRpcUrl);
    this.alertingService = AlertingService.getInstance(connection);
    
    console.log('[RugPatternDetector] Initialized');
  }

  /**
   * Start pattern detection
   */
  public start(): void {
    if (this.analysisTimer) {
      console.warn('[RugPatternDetector] Already running');
      return;
    }

    console.log('[RugPatternDetector] Starting pattern detection...');
    
    // Subscribe to velocity tracker events
    liquidityVelocityTracker.on('flash-rug', this.handleFlashRug.bind(this));
    liquidityVelocityTracker.on('rapid-drain', this.handleRapidDrain.bind(this));
    liquidityVelocityTracker.on('slow-bleed', this.handleSlowBleed.bind(this));

    // Start periodic analysis
    this.analysisTimer = setInterval(() => {
      this.analyzeTrackedTokens().catch(error => {
        console.error('[RugPatternDetector] Analysis error:', error);
      });
    }, this.ANALYSIS_INTERVAL);

    // Initial analysis
    this.analyzeTrackedTokens();
  }

  /**
   * Stop pattern detection
   */
  public stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    // Unsubscribe from events
    liquidityVelocityTracker.removeAllListeners('flash-rug');
    liquidityVelocityTracker.removeAllListeners('rapid-drain');
    liquidityVelocityTracker.removeAllListeners('slow-bleed');
    
    console.log('[RugPatternDetector] Stopped');
  }

  /**
   * Analyze a specific token for rug patterns
   */
  public async analyzeToken(tokenMint: string): Promise<TokenAnalysis> {
    // Check cache first
    const cached = this.analysisCache.get(tokenMint);
    if (cached) return cached;

    console.log(`[RugPatternDetector] Analyzing ${tokenMint}`);
    
    const patterns: RugPattern[] = [];
    
    // 1. Check velocity data for flash rug / rapid drain
    const velocityPattern = await this.checkVelocityPatterns(tokenMint);
    if (velocityPattern) patterns.push(velocityPattern);
    
    // 2. Check honeypot evolution
    const honeypotPattern = await this.checkHoneypotEvolution(tokenMint);
    if (honeypotPattern) patterns.push(honeypotPattern);
    
    // 3. Check for coordinated dumps
    const coordinatedPattern = await this.checkCoordinatedDumps(tokenMint);
    if (coordinatedPattern) patterns.push(coordinatedPattern);
    
    // 4. Check dev preparation patterns
    const devPattern = await this.checkDevPreparation(tokenMint);
    if (devPattern) patterns.push(devPattern);
    
    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(patterns);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(overallRisk, patterns);
    
    const analysis: TokenAnalysis = {
      tokenMint,
      patterns,
      overallRisk,
      recommendation,
      timestamp: Date.now()
    };
    
    // Cache the analysis
    this.analysisCache.set(tokenMint, analysis);
    
    // Emit high-risk patterns
    if (overallRisk >= 80) {
      this.emit('high-risk-pattern', analysis);
      
      // Trigger immediate risk score update
      await rugCheckPollingServiceV2.checkSingleToken(tokenMint, {
        forceUpdate: true,
        source: 'pattern_detection'
      });
      
      // Send alerts to all users holding this token
      await this.sendAlertsToTokenHolders(tokenMint, analysis);
    }
    // Send warnings for medium-high risk patterns
    else if (overallRisk >= 50) {
      await this.sendAlertsToTokenHolders(tokenMint, analysis);
    }
    
    return analysis;
  }

  /**
   * Check velocity-based patterns
   */
  private async checkVelocityPatterns(tokenMint: string): Promise<RugPattern | null> {
    const velocityData = await liquidityVelocityTracker.getVelocityData(tokenMint);
    if (!velocityData) return null;
    
    const indicators: string[] = [];
    let confidence = 0;
    let type: 'flash_rug' | 'slow_bleed' = 'flash_rug';
    
    // Flash rug detection
    if (velocityData.alerts.flashRug) {
      indicators.push(`Liquidity dropping ${Math.abs(velocityData.velocities.liquidity5m)}% per minute`);
      confidence = 0.95;
      type = 'flash_rug';
    }
    // Rapid drain
    else if (velocityData.alerts.rapidDrain) {
      indicators.push(`Sustained liquidity drain: ${Math.abs(velocityData.velocities.liquidity30m)}% per minute`);
      confidence = 0.8;
      type = 'flash_rug';
    }
    // Slow bleed
    else if (velocityData.alerts.slowBleed) {
      indicators.push('Consistent 5-10% hourly liquidity reduction detected');
      confidence = 0.7;
      type = 'slow_bleed';
    }
    
    // Check for accompanying price drop
    if (velocityData.velocities.price5m < -5) {
      indicators.push(`Price dropping ${Math.abs(velocityData.velocities.price5m)}% per minute`);
      confidence = Math.min(1, confidence + 0.1);
    }
    
    // Check for volume spike (panic selling)
    if (velocityData.alerts.volumeSpike) {
      indicators.push('Abnormal volume spike detected');
      confidence = Math.min(1, confidence + 0.05);
    }
    
    if (indicators.length === 0) return null;
    
    return {
      type,
      confidence,
      indicators,
      severity: confidence >= 0.9 ? 'critical' : confidence >= 0.7 ? 'high' : 'medium',
      estimatedTimeToRug: type === 'flash_rug' ? 5 : type === 'slow_bleed' ? 120 : 30
    };
  }

  /**
   * Check for honeypot evolution pattern
   */
  private async checkHoneypotEvolution(tokenMint: string): Promise<RugPattern | null> {
    try {
      // Get recent sell transactions
      const { data: recentSells } = await supabase
        .from('token_transactions')
        .select('success, timestamp')
        .eq('token_mint', tokenMint)
        .eq('type', 'sell')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (!recentSells || recentSells.length < 10) return null;
      
      // Calculate failure rate over time windows
      const now = Date.now();
      const hourAgo = now - 3600000;
      const dayAgo = now - 86400000;
      
      const recentHourSells = recentSells.filter(s => new Date(s.timestamp).getTime() > hourAgo);
      const pastDaySells = recentSells.filter(s => new Date(s.timestamp).getTime() > dayAgo);
      
      const recentFailureRate = recentHourSells.length > 0 
        ? recentHourSells.filter(s => !s.success).length / recentHourSells.length
        : 0;
        
      const overallFailureRate = pastDaySells.length > 0
        ? pastDaySells.filter(s => !s.success).length / pastDaySells.length
        : 0;
      
      // Store evolution data
      const evolutionData = this.honeypotEvolutionCache.get(tokenMint) || [];
      evolutionData.push({ failureRate: recentFailureRate, timestamp: now });
      if (evolutionData.length > 24) evolutionData.shift(); // Keep 24 data points
      this.honeypotEvolutionCache.set(tokenMint, evolutionData);
      
      // Detect evolution pattern
      if (evolutionData.length >= 3) {
        const trend = this.calculateTrend(evolutionData.map(d => d.failureRate));
        
        if (trend > 0.1 && recentFailureRate > 0.3) {
          const indicators = [
            `Sell failure rate increasing: ${(recentFailureRate * 100).toFixed(1)}%`,
            `Trend: ${(trend * 100).toFixed(1)}% increase per hour`
          ];
          
          if (recentFailureRate > 0.7) {
            indicators.push('CRITICAL: Most sells are failing');
          }
          
          return {
            type: 'honeypot_evolution',
            confidence: Math.min(0.95, 0.5 + recentFailureRate),
            indicators,
            severity: recentFailureRate > 0.7 ? 'critical' : recentFailureRate > 0.5 ? 'high' : 'medium'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('[RugPatternDetector] Error checking honeypot evolution:', error);
      return null;
    }
  }

  /**
   * Check for coordinated dump pattern
   */
  private async checkCoordinatedDumps(tokenMint: string): Promise<RugPattern | null> {
    try {
      // Get recent large sells
      const { data: largeSells } = await supabase
        .from('token_transactions')
        .select('wallet_address, amount_usd, timestamp')
        .eq('token_mint', tokenMint)
        .eq('type', 'sell')
        .gte('amount_usd', 1000) // Only large sells
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (!largeSells || largeSells.length < 3) return null;
      
      // Group sells by time window (5 minutes)
      const timeWindows = new Map<number, typeof largeSells>();
      
      largeSells.forEach(sell => {
        const window = Math.floor(new Date(sell.timestamp).getTime() / 300000); // 5 min windows
        if (!timeWindows.has(window)) {
          timeWindows.set(window, []);
        }
        timeWindows.get(window)!.push(sell);
      });
      
      // Check for coordinated activity
      for (const [window, sells] of timeWindows) {
        if (sells.length >= 3) {
          const uniqueWallets = new Set(sells.map(s => s.wallet_address));
          const totalVolume = sells.reduce((sum, s) => sum + s.amount_usd, 0);
          
          if (uniqueWallets.size >= 3) {
            const indicators = [
              `${uniqueWallets.size} wallets sold within 5 minutes`,
              `Total volume: $${totalVolume.toFixed(0)}`,
              `Average per wallet: $${(totalVolume / uniqueWallets.size).toFixed(0)}`
            ];
            
            // Check if these wallets have common funding source
            const isRelated = await this.checkWalletRelations(Array.from(uniqueWallets));
            if (isRelated) {
              indicators.push('Wallets appear to be related (common funding)');
            }
            
            return {
              type: 'coordinated_dump',
              confidence: isRelated ? 0.9 : 0.7,
              indicators,
              severity: totalVolume > 10000 ? 'critical' : 'high',
              estimatedTimeToRug: 15
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('[RugPatternDetector] Error checking coordinated dumps:', error);
      return null;
    }
  }

  /**
   * Check for dev preparation patterns
   */
  private async checkDevPreparation(tokenMint: string): Promise<RugPattern | null> {
    try {
      // Get dev wallets
      const { data: rugcheckData } = await supabase
        .from('rugcheck_reports')
        .select('dev_activity_1h_pct, dev_activity_24h_pct, creator_balance_percent')
        .eq('token_mint', tokenMint)
        .single();
      
      if (!rugcheckData) return null;
      
      const indicators: string[] = [];
      let confidence = 0;
      
      // High recent dev activity
      if (rugcheckData.dev_activity_1h_pct > 20) {
        indicators.push(`High dev activity: ${rugcheckData.dev_activity_1h_pct.toFixed(1)}% in last hour`);
        confidence += 0.3;
      }
      
      // Increasing dev activity
      if (rugcheckData.dev_activity_1h_pct > rugcheckData.dev_activity_24h_pct * 2) {
        indicators.push('Dev activity accelerating');
        confidence += 0.2;
      }
      
      // Check for new wallet creation
      const newWallets = await this.checkNewWalletCreation(tokenMint);
      if (newWallets > 0) {
        indicators.push(`${newWallets} new wallets created by dev`);
        confidence += 0.2;
      }
      
      // Check for token movements to CEX
      const cexMovement = await this.checkCEXMovement(tokenMint);
      if (cexMovement) {
        indicators.push('Tokens moved to centralized exchange');
        confidence += 0.3;
      }
      
      if (indicators.length === 0) return null;
      
      return {
        type: 'dev_preparation',
        confidence: Math.min(0.9, confidence),
        indicators,
        severity: confidence >= 0.7 ? 'high' : 'medium',
        estimatedTimeToRug: 60 // Usually takes time to execute
      };
    } catch (error) {
      console.error('[RugPatternDetector] Error checking dev preparation:', error);
      return null;
    }
  }

  /**
   * Check if wallets are related
   */
  private async checkWalletRelations(wallets: string[]): Promise<boolean> {
    // Simplified check - in production would analyze funding sources
    // For now, check if wallets have transacted with each other
    try {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('from_wallet, to_wallet')
        .or(wallets.map(w => `from_wallet.eq.${w}`).join(','))
        .or(wallets.map(w => `to_wallet.eq.${w}`).join(','))
        .limit(100);
      
      if (!data) return false;
      
      // Build connection graph
      const connections = new Set<string>();
      data.forEach(tx => {
        if (wallets.includes(tx.from_wallet) && wallets.includes(tx.to_wallet)) {
          connections.add(`${tx.from_wallet}-${tx.to_wallet}`);
        }
      });
      
      // If more than 30% are connected, they're likely related
      const possibleConnections = (wallets.length * (wallets.length - 1)) / 2;
      return connections.size / possibleConnections > 0.3;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for new wallet creation by dev
   */
  private async checkNewWalletCreation(tokenMint: string): Promise<number> {
    // This would check blockchain for new wallets created by dev
    // Simplified for now
    return 0;
  }

  /**
   * Check for CEX movement
   */
  private async checkCEXMovement(tokenMint: string): Promise<boolean> {
    // Known CEX addresses (simplified list)
    const cexAddresses = [
      '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance
      '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Coinbase
      // Add more CEX addresses
    ];
    
    try {
      const { data } = await supabase
        .from('token_transactions')
        .select('to_wallet')
        .eq('token_mint', tokenMint)
        .in('to_wallet', cexAddresses)
        .gte('timestamp', new Date(Date.now() - 86400000).toISOString()) // Last 24h
        .limit(1);
      
      return !!(data && data.length > 0);
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate overall risk from patterns
   */
  private calculateOverallRisk(patterns: RugPattern[]): number {
    if (patterns.length === 0) return 0;
    
    // Weight patterns by severity and confidence
    const weights = {
      critical: 1.0,
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };
    
    let totalRisk = 0;
    let totalWeight = 0;
    
    patterns.forEach(pattern => {
      const weight = weights[pattern.severity];
      totalRisk += pattern.confidence * weight * 100;
      totalWeight += weight;
    });
    
    return Math.min(100, totalWeight > 0 ? totalRisk / totalWeight : 0);
  }

  /**
   * Generate recommendation based on risk and patterns
   */
  private generateRecommendation(risk: number, patterns: RugPattern[]): TokenAnalysis['recommendation'] {
    // Check for critical patterns first
    const hasCriticalPattern = patterns.some(p => p.severity === 'critical');
    const hasFlashRug = patterns.some(p => p.type === 'flash_rug');
    
    if (hasFlashRug || risk >= 90) {
      return 'exit_now';
    } else if (hasCriticalPattern || risk >= 70) {
      return 'exit_soon';
    } else if (risk >= 50) {
      return 'monitor_closely';
    } else {
      return 'low_risk';
    }
  }

  /**
   * Analyze all tracked tokens
   */
  private async analyzeTrackedTokens(): Promise<void> {
    const trackedTokens = liquidityVelocityTracker.getTrackedTokens();
    
    for (const token of trackedTokens) {
      try {
        await this.analyzeToken(token);
      } catch (error) {
        console.error(`[RugPatternDetector] Error analyzing ${token}:`, error);
      }
    }
  }

  /**
   * Handle flash rug event from velocity tracker
   */
  private async handleFlashRug(data: any): Promise<void> {
    console.error(`[RugPatternDetector] Flash rug event: ${data.tokenMint}`);
    await this.analyzeToken(data.tokenMint);
  }

  /**
   * Handle rapid drain event
   */
  private async handleRapidDrain(data: any): Promise<void> {
    console.warn(`[RugPatternDetector] Rapid drain event: ${data.tokenMint}`);
    await this.analyzeToken(data.tokenMint);
  }

  /**
   * Handle slow bleed event
   */
  private async handleSlowBleed(data: any): Promise<void> {
    console.warn(`[RugPatternDetector] Slow bleed event: ${data.tokenMint}`);
    await this.analyzeToken(data.tokenMint);
  }

  /**
   * Get current analysis for a token
   */
  public getAnalysis(tokenMint: string): TokenAnalysis | null {
    return this.analysisCache.get(tokenMint);
  }

  /**
   * Get active patterns for a token (used by MonitoringStatsService)
   */
  public async getActivePatterns(tokenMint: string): Promise<any[]> {
    const analysis = this.analysisCache.get(tokenMint);
    if (!analysis || !analysis.patterns) return [];
    
    // Return only patterns with significant confidence
    return analysis.patterns.filter(p => p.confidence > 0.5);
  }
  
  /**
   * Send alerts to all token holders
   */
  private async sendAlertsToTokenHolders(tokenMint: string, analysis: TokenAnalysis): Promise<void> {
    try {
      // Get all wallets holding this token with protection enabled
      const { data: protectedHolders } = await supabase
        .from('protected_tokens')
        .select('wallet_address')
        .eq('token_mint', tokenMint)
        .eq('is_active', true);
      
      if (!protectedHolders || protectedHolders.length === 0) return;
      
      // Send alert to each protected holder
      for (const holder of protectedHolders) {
        await this.alertingService.sendPatternAlert(
          tokenMint,
          holder.wallet_address,
          analysis
        );
      }
      
      console.log(`[RugPatternDetector] Sent alerts to ${protectedHolders.length} token holders`);
    } catch (error) {
      console.error('[RugPatternDetector] Error sending alerts:', error);
    }
  }
}

// Export singleton instance
export const rugPatternDetector = new RugPatternDetector();