import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import supabase from '../utils/supabaseClient';
import { broadcastService } from './SupabaseBroadcastService';

interface BondingCurveData {
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realTokenReserves: number;
  realSolReserves: number;
  tokenTotalSupply: number;
  complete: boolean;
}

interface HolderData {
  address: string;
  balance: number;
  percentage: number;
  isDevWallet?: boolean;
}

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  bondingCurve: string;
  associatedBondingCurve: string;
}

export class PumpFunRugDetector {
  private connection: Connection;
  private readonly PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'; // Correct program ID!
  private readonly PUMP_GLOBAL = '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf';
  private readonly PUMP_EVENT_AUTHORITY = 'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1';
  private readonly PUMP_FEE = 'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM';
  
  // Rug detection thresholds
  private readonly DEV_WALLET_THRESHOLD = 0.15; // 15% ownership is suspicious
  private readonly TOP_HOLDER_THRESHOLD = 0.30; // 30% in one wallet is dangerous
  private readonly SUDDEN_SELL_THRESHOLD = 0.10; // 10% of supply sold at once
  private readonly BONDING_CURVE_DROP_THRESHOLD = 0.20; // 20% drop in reserves

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Monitor a pump.fun token for rug pull indicators
   */
  async monitorPumpFunToken(tokenMint: string): Promise<any> {
    try {
      console.log(`[PumpFunRugDetector] Starting monitoring for ${tokenMint}`);
      
      // 1. Get token data and bonding curve
      const tokenData = await this.getTokenData(tokenMint);
      if (!tokenData) {
        console.log(`[PumpFunRugDetector] Not a pump.fun token: ${tokenMint}`);
        return null;
      }

      // 2. Get bonding curve state
      const bondingCurveData = await this.getBondingCurveData(tokenData.bondingCurve);
      
      // 3. Analyze holder distribution
      const holderAnalysis = await this.analyzeHolders(tokenMint, tokenData.creator);
      
      // 4. Calculate risk score
      const riskScore = this.calculateRiskScore(bondingCurveData, holderAnalysis);
      
      // 5. Store monitoring data
      await this.storeMonitoringData(tokenMint, {
        tokenData,
        bondingCurveData,
        holderAnalysis,
        riskScore
      });

      return {
        mint: tokenMint,
        name: tokenData.name,
        symbol: tokenData.symbol,
        creator: tokenData.creator,
        bondingCurve: {
          solReserves: bondingCurveData.realSolReserves,
          tokenReserves: bondingCurveData.realTokenReserves,
          complete: bondingCurveData.complete
        },
        holders: holderAnalysis,
        riskScore,
        warnings: this.generateWarnings(bondingCurveData, holderAnalysis, riskScore)
      };

    } catch (error) {
      console.error(`[PumpFunRugDetector] Error monitoring token:`, error);
      return null;
    }
  }

  /**
   * Get pump.fun token data from bonding curve
   */
  private async getTokenData(tokenMint: string): Promise<PumpFunToken | null> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.PUMP_PROGRAM_ID);
      
      // Find bonding curve PDA
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
        programId
      );

      const account = await this.connection.getAccountInfo(bondingCurve);
      if (!account || !account.owner.equals(programId)) {
        return null;
      }

      // Decode bonding curve data to get token info
      // First 8 bytes are discriminator, then comes the data
      const data = account.data;
      
      // Extract creator (32 bytes at offset 8)
      const creator = new PublicKey(data.slice(8, 40)).toString();
      
      // For pump.fun tokens, we'll fetch metadata from the URI
      // This is a simplified version - in production you'd parse the full account data
      return {
        mint: tokenMint,
        name: 'Pump.fun Token',
        symbol: 'PUMP',
        uri: '',
        creator,
        bondingCurve: bondingCurve.toString(),
        associatedBondingCurve: bondingCurve.toString()
      };
    } catch (error) {
      console.error('[PumpFunRugDetector] Error getting token data:', error);
      return null;
    }
  }

  /**
   * Get bonding curve state and reserves
   */
  private async getBondingCurveData(bondingCurveAddress: string): Promise<BondingCurveData> {
    try {
      const bondingCurve = new PublicKey(bondingCurveAddress);
      const account = await this.connection.getAccountInfo(bondingCurve);
      
      if (!account) {
        throw new Error('Bonding curve account not found');
      }

      // Parse bonding curve data (simplified - full implementation would decode all fields)
      const data = account.data;
      
      // These offsets are approximations - real implementation needs exact layout
      const virtualSolReserves = data.readBigUInt64LE(40) / BigInt(LAMPORTS_PER_SOL);
      const virtualTokenReserves = data.readBigUInt64LE(48);
      const realTokenReserves = data.readBigUInt64LE(56);
      const realSolReserves = data.readBigUInt64LE(64) / BigInt(LAMPORTS_PER_SOL);
      const complete = data[72] === 1;

      return {
        virtualSolReserves: Number(virtualSolReserves),
        virtualTokenReserves: Number(virtualTokenReserves),
        realTokenReserves: Number(realTokenReserves),
        realSolReserves: Number(realSolReserves),
        tokenTotalSupply: Number(virtualTokenReserves),
        complete
      };
    } catch (error) {
      console.error('[PumpFunRugDetector] Error getting bonding curve data:', error);
      // Return safe defaults
      return {
        virtualSolReserves: 0,
        virtualTokenReserves: 0,
        realTokenReserves: 0,
        realSolReserves: 0,
        tokenTotalSupply: 0,
        complete: false
      };
    }
  }

  /**
   * Analyze token holder distribution
   */
  private async analyzeHolders(tokenMint: string, creator: string): Promise<{
    totalHolders: number;
    topHolders: HolderData[];
    devWalletPercentage: number;
    concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    try {
      const mint = new PublicKey(tokenMint);
      
      // Get all token accounts
      const tokenAccounts = await this.connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 },
            {
              memcmp: {
                offset: 0,
                bytes: mint.toBase58()
              }
            }
          ]
        }
      );

      // Calculate total supply from all accounts
      let totalSupply = 0;
      const holders: HolderData[] = [];

      for (const account of tokenAccounts) {
        const data = account.account.data;
        const owner = new PublicKey(data.slice(32, 64));
        const amount = data.readBigUInt64LE(64);
        const balance = Number(amount) / 1e6; // Assuming 6 decimals

        totalSupply += balance;
        holders.push({
          address: owner.toString(),
          balance,
          percentage: 0, // Will calculate after
          isDevWallet: owner.toString() === creator
        });
      }

      // Calculate percentages and sort by balance
      holders.forEach(holder => {
        holder.percentage = (holder.balance / totalSupply) * 100;
      });
      holders.sort((a, b) => b.balance - a.balance);

      // Get top 10 holders
      const topHolders = holders.slice(0, 10);
      
      // Calculate dev wallet percentage
      const devWallet = holders.find(h => h.isDevWallet);
      const devWalletPercentage = devWallet ? devWallet.percentage : 0;

      // Calculate concentration risk
      const topHolderPercentage = topHolders[0]?.percentage || 0;
      const top5Percentage = topHolders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);

      let concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (topHolderPercentage > 50 || top5Percentage > 80) {
        concentrationRisk = 'CRITICAL';
      } else if (topHolderPercentage > 30 || top5Percentage > 60) {
        concentrationRisk = 'HIGH';
      } else if (topHolderPercentage > 20 || top5Percentage > 40) {
        concentrationRisk = 'MEDIUM';
      } else {
        concentrationRisk = 'LOW';
      }

      return {
        totalHolders: holders.length,
        topHolders: topHolders.slice(0, 5), // Return top 5 for display
        devWalletPercentage,
        concentrationRisk
      };
    } catch (error) {
      console.error('[PumpFunRugDetector] Error analyzing holders:', error);
      return {
        totalHolders: 0,
        topHolders: [],
        devWalletPercentage: 0,
        concentrationRisk: 'HIGH' // Default to high risk if we can't analyze
      };
    }
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    bondingCurve: BondingCurveData,
    holderAnalysis: any
  ): number {
    let riskScore = 0;

    // Bonding curve risks
    if (bondingCurve.realSolReserves < 1) {
      riskScore += 20; // Very low liquidity
    }
    if (bondingCurve.complete) {
      riskScore -= 10; // Graduated to Raydium (more legitimate)
    }

    // Holder concentration risks
    if (holderAnalysis.concentrationRisk === 'CRITICAL') {
      riskScore += 40;
    } else if (holderAnalysis.concentrationRisk === 'HIGH') {
      riskScore += 30;
    } else if (holderAnalysis.concentrationRisk === 'MEDIUM') {
      riskScore += 15;
    }

    // Dev wallet risks
    if (holderAnalysis.devWalletPercentage > this.DEV_WALLET_THRESHOLD * 100) {
      riskScore += 25;
    }

    // Few holders risk
    if (holderAnalysis.totalHolders < 10) {
      riskScore += 20;
    } else if (holderAnalysis.totalHolders < 50) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Generate human-readable warnings
   */
  private generateWarnings(
    bondingCurve: BondingCurveData,
    holderAnalysis: any,
    riskScore: number
  ): string[] {
    const warnings: string[] = [];

    if (riskScore > 70) {
      warnings.push('⚠️ EXTREME RISK: Multiple red flags detected');
    }

    if (holderAnalysis.concentrationRisk === 'CRITICAL') {
      warnings.push('🚨 Token supply is heavily concentrated in few wallets');
    }

    if (holderAnalysis.devWalletPercentage > this.DEV_WALLET_THRESHOLD * 100) {
      warnings.push(`⚠️ Dev wallet holds ${holderAnalysis.devWalletPercentage.toFixed(1)}% of supply`);
    }

    if (bondingCurve.realSolReserves < 1) {
      warnings.push('💧 Very low liquidity - high slippage risk');
    }

    if (holderAnalysis.totalHolders < 10) {
      warnings.push('👥 Very few holders - potential manipulation risk');
    }

    if (holderAnalysis.topHolders[0]?.percentage > this.TOP_HOLDER_THRESHOLD * 100) {
      warnings.push(`🐋 Top holder owns ${holderAnalysis.topHolders[0].percentage.toFixed(1)}% of supply`);
    }

    return warnings;
  }

  /**
   * Store monitoring data in Supabase
   */
  private async storeMonitoringData(tokenMint: string, data: any): Promise<void> {
    try {
      await supabase.from('pump_fun_monitoring').upsert({
        token_mint: tokenMint,
        creator: data.tokenData.creator,
        bonding_curve_address: data.tokenData.bondingCurve,
        sol_reserves: data.bondingCurveData.realSolReserves,
        token_reserves: data.bondingCurveData.realTokenReserves,
        is_complete: data.bondingCurveData.complete,
        total_holders: data.holderAnalysis.totalHolders,
        dev_wallet_percentage: data.holderAnalysis.devWalletPercentage,
        concentration_risk: data.holderAnalysis.concentrationRisk,
        risk_score: data.riskScore,
        top_holders: data.holderAnalysis.topHolders,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[PumpFunRugDetector] Error storing monitoring data:', error);
    }
  }

  /**
   * Monitor bonding curve transactions for sudden changes
   */
  async monitorBondingCurveTransactions(bondingCurveAddress: string): Promise<void> {
    try {
      const bondingCurve = new PublicKey(bondingCurveAddress);
      
      // Subscribe to account changes
      this.connection.onAccountChange(bondingCurve, async (accountInfo) => {
        // Parse the new bonding curve state
        const newData = await this.getBondingCurveData(bondingCurveAddress);
        
        // Get previous state from database
        const { data: prevData } = await supabase
          .from('pump_fun_monitoring')
          .select('sol_reserves, token_reserves')
          .eq('bonding_curve_address', bondingCurveAddress)
          .single();

        if (prevData) {
          // Check for sudden liquidity removal
          const solDrop = (prevData.sol_reserves - newData.realSolReserves) / prevData.sol_reserves;
          
          if (solDrop > this.BONDING_CURVE_DROP_THRESHOLD) {
            // Broadcast rugpull alert
            await broadcastService.broadcastRugpullAlert({
              tokenMint: '', // Need to get from DB
              poolAddress: bondingCurveAddress,
              severity: solDrop > 0.5 ? 'CRITICAL' : 'HIGH',
              liquidityChange: -solDrop * 100,
              type: 'LIQUIDITY_REMOVAL'
            });
          }
        }
      });
    } catch (error) {
      console.error('[PumpFunRugDetector] Error monitoring transactions:', error);
    }
  }
}

// Create singleton instance
let pumpFunRugDetectorInstance: PumpFunRugDetector | null = null;

export function getPumpFunRugDetector(): PumpFunRugDetector {
  if (!pumpFunRugDetectorInstance) {
    const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    pumpFunRugDetectorInstance = new PumpFunRugDetector(new Connection(rpcUrl));
  }
  return pumpFunRugDetectorInstance;
}

export const pumpFunRugDetector = getPumpFunRugDetector();