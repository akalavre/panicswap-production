import { Connection, PublicKey } from '@solana/web3.js';
import { decodePumpFunBondingCurve, calculateTokenPrice } from './PumpFunBondingCurveDecoder';
import supabase from '../utils/supabaseClient';
import { broadcastService } from './SupabaseBroadcastService';

interface GraduationCandidate {
  tokenMint: string;
  symbol: string;
  name: string;
  marketCap: number;
  progressToGraduation: number; // 0-100%
  estimatedTimeToGraduation?: string;
  bondingCurveAddress: string;
  solReserves: number;
  priceUsd: number;
  momentum: 'accelerating' | 'steady' | 'slowing';
  riskFactors: string[];
}

export class GraduationMonitor {
  private connection: Connection;
  private readonly PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  private readonly GRADUATION_MARKET_CAP = 69000; // $69k USD
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private monitoringTokens: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Start monitoring a token for graduation
   */
  async monitorTokenGraduation(tokenMint: string): Promise<GraduationCandidate | null> {
    try {
      console.log(`[GraduationMonitor] Analyzing token ${tokenMint} for graduation potential`);
      
      const mintPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.PUMP_PROGRAM_ID);
      
      // Get bonding curve
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
        programId
      );
      
      const bondingAccount = await this.connection.getAccountInfo(bondingCurve);
      if (!bondingAccount || !bondingAccount.owner.equals(programId)) {
        console.log('[GraduationMonitor] Not a pump.fun token or already graduated');
        return null;
      }
      
      // Decode bonding curve data
      const curveData = decodePumpFunBondingCurve(bondingAccount.data);
      if (!curveData || curveData.complete) {
        console.log('[GraduationMonitor] Token already completed bonding curve');
        return null;
      }
      
      // Calculate current metrics
      const priceUsd = calculateTokenPrice(curveData);
      const circulatingSupply = curveData.tokenTotalSupplyNumber - curveData.realTokenReservesNumber;
      const marketCap = priceUsd * circulatingSupply;
      const progressToGraduation = (marketCap / this.GRADUATION_MARKET_CAP) * 100;
      
      // Get token metadata
      const tokenInfo = await this.getTokenMetadata(tokenMint);
      
      // Analyze momentum
      const momentum = await this.analyzeMomentum(tokenMint, marketCap);
      
      // Estimate time to graduation
      const estimatedTime = this.estimateTimeToGraduation(marketCap, momentum);
      
      // Check risk factors
      const riskFactors = await this.analyzeRiskFactors(tokenMint, curveData);
      
      const candidate: GraduationCandidate = {
        tokenMint,
        symbol: tokenInfo.symbol || 'UNKNOWN',
        name: tokenInfo.name || 'Unknown Token',
        marketCap,
        progressToGraduation: Math.min(progressToGraduation, 100),
        estimatedTimeToGraduation: estimatedTime,
        bondingCurveAddress: bondingCurve.toString(),
        solReserves: curveData.realSolReservesNumber,
        priceUsd,
        momentum,
        riskFactors
      };
      
      // Store in database
      await this.storeGraduationCandidate(candidate);
      
      // Start continuous monitoring if close to graduation
      if (progressToGraduation > 50 && !this.monitoringTokens.has(tokenMint)) {
        this.startContinuousMonitoring(tokenMint);
      }
      
      return candidate;
      
    } catch (error) {
      console.error('[GraduationMonitor] Error analyzing token:', error);
      return null;
    }
  }

  /**
   * Get token metadata
   */
  private async getTokenMetadata(tokenMint: string): Promise<any> {
    try {
      // Check database first
      const { data } = await supabase
        .from('token_metadata')
        .select('symbol, name')
        .eq('mint', tokenMint)
        .single();
      
      if (data) return data;
      
      // Fallback to parsing mint account
      const mintInfo = await this.connection.getParsedAccountInfo(new PublicKey(tokenMint));
      if (mintInfo.value && 'parsed' in mintInfo.value.data) {
        return {
          symbol: 'PUMP',
          name: 'Pump.fun Token'
        };
      }
      
      return { symbol: 'UNKNOWN', name: 'Unknown' };
    } catch (error) {
      return { symbol: 'UNKNOWN', name: 'Unknown' };
    }
  }

  /**
   * Analyze token momentum
   */
  private async analyzeMomentum(tokenMint: string, currentMarketCap: number): Promise<'accelerating' | 'steady' | 'slowing'> {
    try {
      // Get historical market cap data
      const { data } = await supabase
        .from('graduation_tracking')
        .select('market_cap, created_at')
        .eq('token_mint', tokenMint)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!data || data.length < 2) return 'steady';
      
      // Calculate growth rate
      const oldestData = data[data.length - 1];
      const timeDiff = Date.now() - new Date(oldestData.created_at).getTime();
      const mcapDiff = currentMarketCap - oldestData.market_cap;
      const growthRate = (mcapDiff / oldestData.market_cap) / (timeDiff / 3600000); // % per hour
      
      if (growthRate > 20) return 'accelerating';
      if (growthRate < 5) return 'slowing';
      return 'steady';
      
    } catch (error) {
      return 'steady';
    }
  }

  /**
   * Estimate time to graduation
   */
  private estimateTimeToGraduation(currentMarketCap: number, momentum: string): string {
    const remaining = this.GRADUATION_MARKET_CAP - currentMarketCap;
    if (remaining <= 0) return 'Ready now!';
    
    // Estimate based on momentum
    let hourlyGrowth: number;
    switch (momentum) {
      case 'accelerating':
        hourlyGrowth = currentMarketCap * 0.25; // 25% per hour
        break;
      case 'steady':
        hourlyGrowth = currentMarketCap * 0.1; // 10% per hour
        break;
      case 'slowing':
        hourlyGrowth = currentMarketCap * 0.05; // 5% per hour
        break;
      default:
        hourlyGrowth = currentMarketCap * 0.1; // Default to 10% per hour
        break;
    }
    
    const hoursToGraduation = remaining / hourlyGrowth;
    
    if (hoursToGraduation < 1) return `~${Math.round(hoursToGraduation * 60)} minutes`;
    if (hoursToGraduation < 24) return `~${Math.round(hoursToGraduation)} hours`;
    return `~${Math.round(hoursToGraduation / 24)} days`;
  }

  /**
   * Analyze risk factors
   */
  private async analyzeRiskFactors(tokenMint: string, curveData: any): Promise<string[]> {
    const risks: string[] = [];
    
    // Check SOL reserves
    if (curveData.realSolReservesNumber < 1) {
      risks.push('Low liquidity (< 1 SOL)');
    }
    
    // Check holder concentration (would need holder data)
    const { data: holderData } = await supabase
      .from('pump_fun_monitoring')
      .select('dev_wallet_percentage, concentration_risk')
      .eq('token_mint', tokenMint)
      .single();
    
    if (holderData) {
      if (holderData.dev_wallet_percentage > 20) {
        risks.push(`High dev ownership (${holderData.dev_wallet_percentage}%)`);
      }
      if (holderData.concentration_risk === 'HIGH' || holderData.concentration_risk === 'CRITICAL') {
        risks.push('High holder concentration');
      }
    }
    
    // Check for recent dumps
    const recentActivity = await this.checkRecentDumps(tokenMint);
    if (recentActivity.hasDumps) {
      risks.push('Recent large sells detected');
    }
    
    return risks;
  }

  /**
   * Check for recent dumps
   */
  private async checkRecentDumps(tokenMint: string): Promise<{ hasDumps: boolean }> {
    // In production, analyze recent transactions
    // For now, return no dumps
    return { hasDumps: false };
  }

  /**
   * Store graduation candidate in database
   */
  private async storeGraduationCandidate(candidate: GraduationCandidate): Promise<void> {
    try {
      await supabase.from('graduation_tracking').upsert({
        token_mint: candidate.tokenMint,
        symbol: candidate.symbol,
        name: candidate.name,
        market_cap: candidate.marketCap,
        progress_percentage: candidate.progressToGraduation,
        estimated_time: candidate.estimatedTimeToGraduation,
        sol_reserves: candidate.solReserves,
        price_usd: candidate.priceUsd,
        momentum: candidate.momentum,
        risk_factors: candidate.riskFactors,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[GraduationMonitor] Error storing candidate:', error);
    }
  }

  /**
   * Start continuous monitoring for tokens close to graduation
   */
  private startContinuousMonitoring(tokenMint: string): void {
    console.log(`[GraduationMonitor] Starting continuous monitoring for ${tokenMint}`);
    
    const interval = setInterval(async () => {
      const update = await this.monitorTokenGraduation(tokenMint);
      
      if (!update) {
        // Token graduated or error
        clearInterval(interval);
        this.monitoringTokens.delete(tokenMint);
        return;
      }
      
      // Alert if very close to graduation
      if (update.progressToGraduation > 90) {
        await broadcastService.broadcastPriceAlert({
          tokenMint,
          priceChange: 0,
          currentPrice: 0,
          severity: 'HIGH'
        });
      }
      
      // Check if graduated
      if (update.progressToGraduation >= 100) {
        console.log(`[GraduationMonitor] 🎉 Token ${update.symbol} has graduated!`);
        await this.handleGraduation(update);
        clearInterval(interval);
        this.monitoringTokens.delete(tokenMint);
      }
      
    }, this.CHECK_INTERVAL);
    
    this.monitoringTokens.set(tokenMint, interval);
  }

  /**
   * Handle token graduation
   */
  private async handleGraduation(token: GraduationCandidate): Promise<void> {
    // Send celebration alert
    await broadcastService.broadcastPriceAlert({
      tokenMint: token.tokenMint,
      priceChange: 0,
      currentPrice: 0,
      severity: 'HIGH'
    });
    
    // Update protection settings
    await supabase
      .from('protected_tokens')
      .update({ 
        platform: 'raydium',
        notes: 'Graduated from pump.fun'
      })
      .eq('token_mint', token.tokenMint);
  }

  /**
   * Get all tokens approaching graduation
   */
  async getGraduationCandidates(minProgress: number = 50): Promise<GraduationCandidate[]> {
    try {
      const { data } = await supabase
        .from('graduation_tracking')
        .select('*')
        .gte('progress_percentage', minProgress)
        .order('progress_percentage', { ascending: false });
      
      return data || [];
    } catch (error) {
      console.error('[GraduationMonitor] Error fetching candidates:', error);
      return [];
    }
  }

  /**
   * Stop monitoring a token
   */
  stopMonitoring(tokenMint: string): void {
    const interval = this.monitoringTokens.get(tokenMint);
    if (interval) {
      clearInterval(interval);
      this.monitoringTokens.delete(tokenMint);
      console.log(`[GraduationMonitor] Stopped monitoring ${tokenMint}`);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    this.monitoringTokens.forEach((interval, token) => {
      clearInterval(interval);
    });
    this.monitoringTokens.clear();
    console.log('[GraduationMonitor] Stopped all monitoring');
  }
}

// Export singleton
export const graduationMonitor = new GraduationMonitor(
  new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com')
);