import { Connection, PublicKey } from '@solana/web3.js';
import { PumpFunBondingCurve } from './PumpFunBondingCurveDecoder';

interface PriceHistory {
  timestamp: number;
  price: number;
  liquidity: number;
  volume?: number;
}

interface MarketContext {
  tokenAge: number; // minutes since creation
  volatility: number; // price volatility percentage
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number; // positive = buying pressure, negative = selling
  volumeProfile: 'increasing' | 'decreasing' | 'stable';
}

interface RugIndicators {
  isRug: boolean;
  confidence: number; // 0-100
  type?: 'liquidity_removal' | 'dev_dump' | 'slow_rug' | 'honeypot';
  reasons: string[];
  falsePositiveChecks: string[];
}

export class SmartRugDetector {
  private priceHistory: Map<string, PriceHistory[]> = new Map();
  private readonly HISTORY_WINDOW = 300; // 5 minutes of history
  private readonly MIN_HISTORY_POINTS = 10; // Need at least 10 data points
  
  constructor(private connection: Connection) {}

  /**
   * Smart analysis that avoids false positives
   */
  async analyzeRugProbability(
    tokenMint: string,
    currentPrice: number,
    currentLiquidity: number,
    bondingCurveData?: PumpFunBondingCurve,
    holderData?: any
  ): Promise<RugIndicators> {
    console.log(`[SmartRugDetector] Analyzing ${tokenMint}`);
    
    // Update price history
    this.updatePriceHistory(tokenMint, currentPrice, currentLiquidity);
    
    // Get market context
    const context = await this.getMarketContext(tokenMint);
    
    // Check for false positive indicators first
    const falsePositiveChecks: string[] = [];
    
    // 1. Bullish momentum check
    if (context.momentum > 20 && context.trend === 'bullish') {
      falsePositiveChecks.push('Strong buying pressure detected');
    }
    
    // 2. Natural volatility for new tokens
    if (context.tokenAge < 60 && context.volatility < 50) {
      falsePositiveChecks.push('Normal volatility for new token');
    }
    
    // 3. Volume analysis
    if (context.volumeProfile === 'increasing') {
      falsePositiveChecks.push('Increasing volume indicates healthy trading');
    }
    
    // Now check for rug indicators
    const rugReasons: string[] = [];
    let rugConfidence = 0;
    let rugType: 'liquidity_removal' | 'dev_dump' | 'slow_rug' | 'honeypot' | undefined;
    
    // 1. Liquidity removal detection
    const liqDrop = this.calculateLiquidityDrop(tokenMint);
    if (liqDrop > 50) {
      // But check if it's just migration or natural movement
      if (context.momentum < -10) {
        rugReasons.push(`Liquidity dropped ${liqDrop}% with selling pressure`);
        rugConfidence += 40;
        rugType = 'liquidity_removal';
      } else {
        falsePositiveChecks.push('Liquidity movement might be migration');
      }
    }
    
    // 2. Price crash detection with context
    const priceDrop = this.calculatePriceDrop(tokenMint);
    if (priceDrop > 30) {
      // Check if it's a natural correction after pump
      const recentPump = this.checkRecentPump(tokenMint);
      if (recentPump && priceDrop < 50) {
        falsePositiveChecks.push('Natural correction after ${recentPump}% pump');
      } else if (liqDrop > 30) {
        rugReasons.push(`Price crashed ${priceDrop}% with liquidity removal`);
        rugConfidence += 30;
      }
    }
    
    // 3. Dev wallet activity (if available)
    if (holderData && holderData.devWalletPercentage < 5) {
      // Dev sold most tokens
      rugReasons.push('Dev wallet dumped holdings');
      rugConfidence += 30;
      rugType = rugType || 'dev_dump';
    }
    
    // 4. Suspicious patterns
    const suspiciousPattern = this.detectSuspiciousPatterns(tokenMint);
    if (suspiciousPattern) {
      rugReasons.push(suspiciousPattern);
      rugConfidence += 20;
    }
    
    // 5. Honeypot detection
    if (await this.checkHoneypot(tokenMint)) {
      rugReasons.push('Honeypot detected - sells blocked');
      rugConfidence = 100;
      rugType = 'honeypot';
    }
    
    // Adjust confidence based on false positive checks
    if (falsePositiveChecks.length > 0) {
      rugConfidence = Math.max(0, rugConfidence - (falsePositiveChecks.length * 10));
    }
    
    // Final decision
    const isRug = rugConfidence > 60 && rugReasons.length > falsePositiveChecks.length;
    
    return {
      isRug,
      confidence: rugConfidence,
      type: isRug ? rugType : undefined,
      reasons: rugReasons,
      falsePositiveChecks
    };
  }
  
  /**
   * Update price history for analysis
   */
  private updatePriceHistory(tokenMint: string, price: number, liquidity: number) {
    const history = this.priceHistory.get(tokenMint) || [];
    const now = Date.now();
    
    history.push({
      timestamp: now,
      price,
      liquidity
    });
    
    // Keep only recent history
    const cutoff = now - (this.HISTORY_WINDOW * 1000);
    const recentHistory = history.filter(h => h.timestamp > cutoff);
    
    this.priceHistory.set(tokenMint, recentHistory);
  }
  
  /**
   * Get market context for better decision making
   */
  private async getMarketContext(tokenMint: string): Promise<MarketContext> {
    const history = this.priceHistory.get(tokenMint) || [];
    
    if (history.length < 2) {
      return {
        tokenAge: 0,
        volatility: 0,
        trend: 'neutral',
        momentum: 0,
        volumeProfile: 'stable'
      };
    }
    
    // Calculate token age (simplified - in production, get from creation tx)
    const tokenAge = (Date.now() - history[0].timestamp) / 60000; // minutes
    
    // Calculate volatility
    const prices = history.map(h => h.price);
    const volatility = this.calculateVolatility(prices);
    
    // Determine trend
    const recentPrices = prices.slice(-10);
    const oldPrice = recentPrices[0];
    const newPrice = recentPrices[recentPrices.length - 1];
    const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
    
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (priceChange > 5) trend = 'bullish';
    else if (priceChange < -5) trend = 'bearish';
    else trend = 'neutral';
    
    // Calculate momentum (rate of change)
    const momentum = this.calculateMomentum(history);
    
    // Volume profile (would need real volume data)
    const volumeProfile = 'stable'; // Simplified
    
    return {
      tokenAge,
      volatility,
      trend,
      momentum,
      volumeProfile
    };
  }
  
  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev * 100; // Convert to percentage
  }
  
  /**
   * Calculate price momentum
   */
  private calculateMomentum(history: PriceHistory[]): number {
    if (history.length < 3) return 0;
    
    // Get recent price changes
    const recent = history.slice(-5);
    let buyPressure = 0;
    let sellPressure = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].price - recent[i-1].price;
      if (change > 0) buyPressure += change;
      else sellPressure += Math.abs(change);
    }
    
    // Return normalized momentum (-100 to 100)
    const total = buyPressure + sellPressure;
    if (total === 0) return 0;
    
    return ((buyPressure - sellPressure) / total) * 100;
  }
  
  /**
   * Calculate liquidity drop percentage
   */
  private calculateLiquidityDrop(tokenMint: string): number {
    const history = this.priceHistory.get(tokenMint) || [];
    if (history.length < 2) return 0;
    
    const maxLiquidity = Math.max(...history.map(h => h.liquidity));
    const currentLiquidity = history[history.length - 1].liquidity;
    
    return ((maxLiquidity - currentLiquidity) / maxLiquidity) * 100;
  }
  
  /**
   * Calculate price drop from recent high
   */
  private calculatePriceDrop(tokenMint: string): number {
    const history = this.priceHistory.get(tokenMint) || [];
    if (history.length < 2) return 0;
    
    // Look at last 2 minutes
    const recentHistory = history.slice(-24); // ~2 min at 5s intervals
    const maxPrice = Math.max(...recentHistory.map(h => h.price));
    const currentPrice = history[history.length - 1].price;
    
    return ((maxPrice - currentPrice) / maxPrice) * 100;
  }
  
  /**
   * Check if there was a recent pump
   */
  private checkRecentPump(tokenMint: string): number {
    const history = this.priceHistory.get(tokenMint) || [];
    if (history.length < 10) return 0;
    
    // Look for price increase in last 5 minutes
    const fiveMinAgo = history[Math.max(0, history.length - 60)];
    const twoMinAgo = history[Math.max(0, history.length - 24)];
    
    if (!fiveMinAgo || !twoMinAgo) return 0;
    
    const pumpSize = ((twoMinAgo.price - fiveMinAgo.price) / fiveMinAgo.price) * 100;
    return pumpSize > 50 ? pumpSize : 0;
  }
  
  /**
   * Detect suspicious trading patterns
   */
  private detectSuspiciousPatterns(tokenMint: string): string | null {
    const history = this.priceHistory.get(tokenMint) || [];
    if (history.length < this.MIN_HISTORY_POINTS) return null;
    
    // Pattern 1: Steady decline with no bounces (slow rug)
    const prices = history.slice(-20).map(h => h.price);
    let decliningCount = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i-1]) decliningCount++;
    }
    
    if (decliningCount > 15) {
      return 'Steady price decline pattern detected (slow rug)';
    }
    
    // Pattern 2: Liquidity decreasing while price stable (preparation)
    const avgPriceChange = Math.abs(prices[prices.length-1] - prices[0]) / prices[0];
    const liqChange = Math.abs(history[history.length-1].liquidity - history[0].liquidity) / history[0].liquidity;
    
    if (avgPriceChange < 0.05 && liqChange > 0.3) {
      return 'Liquidity draining while price stable (rug preparation)';
    }
    
    return null;
  }
  
  /**
   * Check if token is a honeypot
   */
  private async checkHoneypot(tokenMint: string): Promise<boolean> {
    // In production, this would:
    // 1. Check if sells are blocked in smart contract
    // 2. Analyze successful sell transactions
    // 3. Check for extremely high sell tax
    
    // For now, return false (not a honeypot)
    return false;
  }
  
  /**
   * Get protection recommendation
   */
  getProtectionAction(analysis: RugIndicators): {
    action: 'none' | 'alert' | 'protect';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  } {
    if (!analysis.isRug) {
      return {
        action: 'none',
        urgency: 'low',
        message: 'Normal market activity detected'
      };
    }
    
    if (analysis.confidence > 80) {
      return {
        action: 'protect',
        urgency: 'critical',
        message: `${analysis.type} detected with ${analysis.confidence}% confidence`
      };
    }
    
    if (analysis.confidence > 60) {
      return {
        action: 'alert',
        urgency: 'high',
        message: `Suspicious activity: ${analysis.reasons[0]}`
      };
    }
    
    return {
      action: 'alert',
      urgency: 'medium',
      message: 'Monitoring suspicious patterns'
    };
  }
}