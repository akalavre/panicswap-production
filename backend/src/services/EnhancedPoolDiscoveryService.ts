import { Connection, PublicKey } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';
import { heliusPoolDiscoveryService } from './HeliusPoolDiscoveryService';
import { fetchWithFallback } from '../utils/fetchWithFallback';
import { getJupiterQuoteUrl, getJupiterFetchOptions } from '../utils/jupiterEndpoints';

interface PoolInfo {
  address: string;
  type: 'pump.fun' | 'raydium' | 'orca' | 'meteora' | 'jupiter' | 'unknown';
  baseToken: string;
  quoteToken: string;
  source: 'database' | 'onchain' | 'jupiter' | 'dexscreener';
}

class EnhancedPoolDiscoveryService {
  private connection: Connection;
  private poolCache: Map<string, PoolInfo> = new Map();
  
  // Known program IDs
  private readonly PROGRAMS = {
    PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwzK1P',
    RAYDIUM_AMM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
    ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    METEORA_DLMM: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
  };
  
  // Common quote tokens
  private readonly QUOTE_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  };

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Main method to discover pool for a token
   */
  async discoverPool(tokenMint: string): Promise<PoolInfo | null> {
    console.log(`🔍 Discovering pool for token: ${tokenMint}`);
    
    // Validate token mint is a valid base58 string
    try {
      new PublicKey(tokenMint);
    } catch (error) {
      console.error(`Invalid token mint address: ${tokenMint}`);
      return null;
    }
    
    // Check cache first
    const cached = this.poolCache.get(tokenMint);
    if (cached) {
      console.log(`✅ Found pool in cache: ${cached.address}`);
      return cached;
    }

    // Strategy 1: Check database
    const dbPool = await this.checkDatabase(tokenMint);
    if (dbPool) {
      this.poolCache.set(tokenMint, dbPool);
      return dbPool;
    }

    // Strategy 2: Check on-chain (Pump.fun PDA)
    const pumpFunPool = await this.checkPumpFunPDA(tokenMint);
    if (pumpFunPool) {
      this.poolCache.set(tokenMint, pumpFunPool);
      await this.saveToDatabase(tokenMint, pumpFunPool);
      return pumpFunPool;
    }

    // Strategy 3: Query Jupiter API
    const jupiterPool = await this.queryJupiterAPI(tokenMint);
    if (jupiterPool) {
      this.poolCache.set(tokenMint, jupiterPool);
      await this.saveToDatabase(tokenMint, jupiterPool);
      return jupiterPool;
    }

    // Strategy 4: Use Helius RPC for pool discovery (no external API dependencies)
    const heliusPool = await this.queryHeliusRPC(tokenMint);
    if (heliusPool) {
      this.poolCache.set(tokenMint, heliusPool);
      await this.saveToDatabase(tokenMint, heliusPool);
      return heliusPool;
    }

    // Strategy 5: Query DexScreener API (fallback)
    const dexScreenerPool = await this.queryDexScreenerAPI(tokenMint);
    if (dexScreenerPool) {
      this.poolCache.set(tokenMint, dexScreenerPool);
      await this.saveToDatabase(tokenMint, dexScreenerPool);
      return dexScreenerPool;
    }

    // Strategy 6: Scan Raydium pools on-chain (last resort)
    const raydiumPool = await this.scanRaydiumPools(tokenMint);
    if (raydiumPool) {
      this.poolCache.set(tokenMint, raydiumPool);
      await this.saveToDatabase(tokenMint, raydiumPool);
      return raydiumPool;
    }

    console.log(`❌ No pool found for token ${tokenMint}`);
    return null;
  }

  /**
   * Check database for known pool
   */
  private async checkDatabase(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const { data } = await supabase
        .from('token_metadata')
        .select('pool_address, platform')
        .eq('mint', tokenMint)
        .single();

      if (data?.pool_address) {
        console.log(`✅ Found pool in database: ${data.pool_address}`);
        return {
          address: data.pool_address,
          type: this.getPlatformType(data.platform),
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL, // Default assumption
          source: 'database'
        };
      }
    } catch (error) {
      console.error('Database check error:', error);
    }
    return null;
  }

  /**
   * Check Pump.fun PDA
   */
  private async checkPumpFunPDA(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const [bondingCurve] = await PublicKey.findProgramAddress(
        [Buffer.from('bonding-curve'), new PublicKey(tokenMint).toBuffer()],
        new PublicKey(this.PROGRAMS.PUMP_FUN)
      );

      // Verify the account exists
      const account = await this.connection.getAccountInfo(bondingCurve);
      if (account && account.owner.equals(new PublicKey(this.PROGRAMS.PUMP_FUN))) {
        console.log(`✅ Found pump.fun bonding curve: ${bondingCurve.toString()}`);
        return {
          address: bondingCurve.toString(),
          type: 'pump.fun',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL,
          source: 'onchain'
        };
      }
    } catch (error) {
      console.error('Pump.fun PDA check error:', error);
    }
    return null;
  }

  /**
   * Query Helius RPC for pool information (no external API dependencies)
   */
  private async queryHeliusRPC(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const pool = await heliusPoolDiscoveryService.discoverPool(tokenMint);
      if (pool && pool.type !== 'unknown') {
        // Map Helius pool types to our simplified types
        let mappedType: PoolInfo['type'] = 'unknown';
        switch (pool.type) {
          case 'pump.fun':
            mappedType = 'pump.fun';
            break;
          case 'raydium-amm':
            mappedType = 'raydium';
            break;
          case 'orca-whirlpool':
            mappedType = 'orca';
            break;
          case 'meteora-dlmm':
            mappedType = 'meteora';
            break;
          case 'fluxbeam':
          case 'jupiter':
            mappedType = 'jupiter'; // Group other DEXes under jupiter
            break;
        }
        
        return {
          address: pool.address,
          type: mappedType,
          baseToken: pool.baseToken,
          quoteToken: pool.quoteToken,
          source: 'onchain' as const
        };
      }
    } catch (error) {
      console.error('Helius RPC pool discovery error:', error);
    }
    return null;
  }

  /**
   * Query Jupiter API for pool information
   */
  private async queryJupiterAPI(tokenMint: string): Promise<PoolInfo | null> {
    try {
      // Use the new Jupiter free tier endpoint
      // Get a quote to check if the token is tradeable
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const quoteUrl = getJupiterQuoteUrl({
        inputMint: tokenMint,
        outputMint: SOL_MINT,
        amount: 1000000
      });
      
      const fetchOptions = getJupiterFetchOptions({
        timeout: 10000, // 10 seconds
        maxRetries: 3
      });
      
      const quoteData = await fetchWithFallback(
        quoteUrl,
        {
          ...fetchOptions,
          cacheKey: `jupiter:quote:${tokenMint}`,
          cacheTTL: 300, // 5 minutes
          serviceName: 'jupiter-api',
          fallbackData: null,
        }
      ).catch((error) => {
        // Handle network errors gracefully
        console.log(`Jupiter API error for token ${tokenMint}:`, error.message);
        return null;
      });
      
      if (!quoteData) {
        return null; // Network error already logged
      }
      
      // If we get a valid quote, the token has liquidity
      if (!quoteData || quoteData.error) {
        console.log(`No Jupiter quote available for token ${tokenMint}`);
        return null;
      }

      // Extract route information from the quote
      if (quoteData.routePlan && quoteData.routePlan.length > 0) {
        const firstRoute = quoteData.routePlan[0];
        const swapInfo = firstRoute.swapInfo;
        
        if (swapInfo && swapInfo.ammKey) {
          console.log(`✅ Found pool via Jupiter: ${swapInfo.ammKey}`);
          return {
            address: swapInfo.ammKey,
            type: this.getPoolTypeFromLabel(swapInfo.label || 'unknown'),
            baseToken: tokenMint,
            quoteToken: SOL_MINT,
            source: 'jupiter'
          };
        }
      }
      
      // If no route plan, but we got a quote, return a generic pool info
      if (quoteData.inAmount && quoteData.outAmount) {
        console.log(`✅ Token ${tokenMint} is tradeable on Jupiter`);
        return {
          address: 'jupiter-aggregated', // Placeholder for aggregated pools
          type: 'jupiter',
          baseToken: tokenMint,
          quoteToken: SOL_MINT,
          source: 'jupiter'
        };
      }
    } catch (error) {
      console.error('Jupiter API error:', error);
    }
    return null;
  }

  /**
   * Query DexScreener API
   */
  private async queryDexScreenerAPI(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const data = await fetchWithFallback(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
        {
          serviceName: 'dexscreener-api',
          timeout: 10000,
          fallbackData: null,
        }
      );
      if (data.pairs && data.pairs.length > 0) {
        // Get the most liquid pair
        const bestPair = data.pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        console.log(`✅ Found pool via DexScreener: ${bestPair.pairAddress}`);
        return {
          address: bestPair.pairAddress,
          type: this.getDexType(bestPair.dexId),
          baseToken: tokenMint,
          quoteToken: bestPair.quoteToken?.address || this.QUOTE_TOKENS.SOL,
          source: 'dexscreener'
        };
      }
    } catch (error) {
      console.error('DexScreener API error:', error);
    }
    return null;
  }

  /**
   * Scan Raydium pools on-chain
   */
  private async scanRaydiumPools(tokenMint: string): Promise<PoolInfo | null> {
    try {
      // This is a simplified version - in production you'd use getProgramAccounts
      // with proper filters or an indexer
      console.log('Scanning Raydium pools on-chain...');
      
      // For now, return null as full implementation would be complex
      // In production, you'd:
      // 1. Use getProgramAccounts with memcmp filters
      // 2. Or use a specialized indexer service
      // 3. Or maintain a local database of all pools
      
      return null;
    } catch (error) {
      console.error('Raydium scan error:', error);
      return null;
    }
  }

  /**
   * Save discovered pool to database
   */
  private async saveToDatabase(tokenMint: string, poolInfo: PoolInfo): Promise<void> {
    try {
      await supabase
        .from('token_metadata')
        .update({ 
          pool_address: poolInfo.address,
          pool_type: poolInfo.type,
          pool_discovery_source: poolInfo.source,
          updated_at: new Date().toISOString()
        })
        .eq('mint', tokenMint);
      
      console.log(`💾 Saved pool to database for ${tokenMint}`);
    } catch (error) {
      console.error('Error saving pool to database:', error);
    }
  }

  /**
   * Helper methods
   */
  private getPlatformType(platform: string): PoolInfo['type'] {
    switch (platform?.toLowerCase()) {
      case 'pump.fun':
      case 'pump':
        return 'pump.fun';
      case 'raydium':
        return 'raydium';
      case 'orca':
        return 'orca';
      case 'meteora':
        return 'meteora';
      default:
        return 'unknown';
    }
  }

  private getPoolTypeFromLabel(label: string): PoolInfo['type'] {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('raydium')) return 'raydium';
    if (lowerLabel.includes('orca')) return 'orca';
    if (lowerLabel.includes('meteora')) return 'meteora';
    if (lowerLabel.includes('pump')) return 'pump.fun';
    return 'unknown';
  }

  private getDexType(dexId: string): PoolInfo['type'] {
    switch (dexId?.toLowerCase()) {
      case 'raydium':
        return 'raydium';
      case 'orca':
        return 'orca';
      case 'meteora':
        return 'meteora';
      case 'pumpfun':
      case 'pump.fun':
        return 'pump.fun';
      default:
        return 'unknown';
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.poolCache.clear();
    console.log('Pool cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; pools: string[] } {
    return {
      size: this.poolCache.size,
      pools: Array.from(this.poolCache.keys())
    };
  }
}

// Note: This will be initialized in PoolMonitoringService with proper connection
export { EnhancedPoolDiscoveryService };