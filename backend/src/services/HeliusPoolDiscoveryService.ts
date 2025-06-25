import { Connection, PublicKey } from '@solana/web3.js';
import { helius } from '../utils/heliusClient';
import config from '../config';

interface PoolInfo {
  address: string;
  type: 'pump.fun' | 'raydium-amm' | 'orca-whirlpool' | 'meteora-dlmm' | 'fluxbeam' | 'jupiter' | 'unknown';
  baseToken: string;
  quoteToken: string;
  source: string;
  liquidity?: number;
}

/**
 * Helius-based pool discovery service
 * Uses Helius RPC to find pools without external API dependencies
 */
export class HeliusPoolDiscoveryService {
  private connection: Connection;
  
  // Known DEX program IDs
  private readonly DEX_PROGRAMS = {
    RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    METEORA: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    FLUXBEAM: 'FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X'
  };
  
  private readonly QUOTE_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  };

  constructor() {
    this.connection = new Connection(config.heliusRpcUrl);
  }

  /**
   * Discover pools for a token using Helius RPC
   */
  async discoverPool(tokenMint: string): Promise<PoolInfo | null> {
    console.log(`🔍 Discovering pool for token: ${tokenMint}`);
    
    try {
      // Try multiple discovery methods in order of preference
      // Check pump.fun first if token ends with "pump"
      const isPumpToken = tokenMint.toLowerCase().endsWith('pump');
      
      const methods = isPumpToken ? [
        () => this.findPumpFunPool(tokenMint),
        () => this.findRaydiumPool(tokenMint),
        () => this.findOrcaPool(tokenMint),
        () => this.findMeteoraPool(tokenMint),
        () => this.findFluxbeamPool(tokenMint)
      ] : [
        () => this.findRaydiumPool(tokenMint),
        () => this.findPumpFunPool(tokenMint),
        () => this.findOrcaPool(tokenMint),
        () => this.findMeteoraPool(tokenMint),
        () => this.findFluxbeamPool(tokenMint)
      ];
      
      for (const method of methods) {
        const pool = await method();
        if (pool) {
          console.log(`✅ Found pool: ${pool.address} (${pool.type})`);
          return pool;
        }
      }
      
      console.log(`❌ No pool found for token: ${tokenMint}`);
      return null;
    } catch (error) {
      console.error('Error discovering pool:', error);
      return null;
    }
  }

  /**
   * Find Raydium AMM pools
   */
  private async findRaydiumPool(tokenMint: string): Promise<PoolInfo | null> {
    try {
      // First try Raydium's pre-built pool list (lightweight HTTPS)
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const pools = await response.json();
          
          // Search through all pools
          for (const [poolId, poolData] of Object.entries(pools)) {
            const pool = poolData as any;
            if (pool.baseMint === tokenMint) {
              console.log('Found pool in Raydium API (as base token)');
              return {
                address: pool.id,
                type: 'raydium-amm',
                baseToken: tokenMint,
                quoteToken: pool.quoteMint,
                source: 'raydium-api'
              };
            } else if (pool.quoteMint === tokenMint) {
              console.log('Found pool in Raydium API (as quote token)');
              return {
                address: pool.id,
                type: 'raydium-amm',
                baseToken: pool.baseMint,
                quoteToken: tokenMint,
                source: 'raydium-api'
              };
            }
          }
        }
      } catch (apiError) {
        console.log('Raydium API query failed, falling back to on-chain scan:', (apiError as Error).message);
      }
      
      // Fallback to on-chain scanning if API fails or returns no results
      const tokenPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.DEX_PROGRAMS.RAYDIUM_V4);
      
      // Get all accounts owned by Raydium AMM program (only pubkeys to avoid deprioritization)
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          { dataSize: 752 }, // Raydium AMM V4 account size
          {
            memcmp: {
              offset: 400, // Offset for baseMint in Raydium AMM
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (accounts.length > 0) {
        const poolAccount = accounts[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'raydium-amm',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL, // Most pools pair with SOL
          source: 'helius-rpc'
        };
      }
      
      // Try checking if token is quote mint
      const quoteAccounts = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          { dataSize: 752 },
          {
            memcmp: {
              offset: 432, // Offset for quoteMint in Raydium AMM
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (quoteAccounts.length > 0) {
        const poolAccount = quoteAccounts[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'raydium-amm',
          baseToken: this.QUOTE_TOKENS.SOL,
          quoteToken: tokenMint,
          source: 'helius-rpc'
        };
      }
    } catch (error) {
      console.log('Raydium pool search error:', error);
    }
    return null;
  }

  /**
   * Find pump.fun pools
   */
  private async findPumpFunPool(tokenMint: string): Promise<PoolInfo | null> {
    try {
      // For pump.fun, we use a deterministic PDA
      const programId = new PublicKey(this.DEX_PROGRAMS.PUMP_FUN);
      const tokenPubkey = new PublicKey(tokenMint);
      
      // Pump.fun uses PDAs for bonding curves
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), tokenPubkey.toBuffer()],
        programId
      );
      
      // Check if the account exists
      const accountInfo = await this.connection.getAccountInfo(bondingCurve);
      if (accountInfo && accountInfo.owner.equals(programId)) {
        return {
          address: bondingCurve.toBase58(),
          type: 'pump.fun',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL,
          source: 'helius-rpc'
        };
      }
    } catch (error) {
      console.log('Pump.fun pool search error:', error);
    }
    return null;
  }

  /**
   * Find Orca Whirlpool pools
   */
  private async findOrcaPool(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const tokenPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.DEX_PROGRAMS.ORCA_WHIRLPOOL);
      
      // Get all Whirlpool accounts
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          { dataSize: 653 }, // Whirlpool account size
          {
            memcmp: {
              offset: 101, // Offset for tokenMintA
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (accounts.length > 0) {
        const poolAccount = accounts[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'orca-whirlpool',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL,
          source: 'helius-rpc'
        };
      }
      
      // Check if token is tokenMintB
      const accountsB = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          { dataSize: 653 },
          {
            memcmp: {
              offset: 181, // Offset for tokenMintB
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (accountsB.length > 0) {
        const poolAccount = accountsB[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'orca-whirlpool',
          baseToken: this.QUOTE_TOKENS.SOL,
          quoteToken: tokenMint,
          source: 'helius-rpc'
        };
      }
    } catch (error) {
      console.log('Orca pool search error:', error);
    }
    return null;
  }

  /**
   * Find Meteora pools
   */
  private async findMeteoraPool(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const tokenPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.DEX_PROGRAMS.METEORA);
      
      // Get Meteora DLMM pools
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (accounts.length > 0) {
        const poolAccount = accounts[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'meteora-dlmm',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL,
          source: 'helius-rpc'
        };
      }
    } catch (error) {
      console.log('Meteora pool search error:', error);
    }
    return null;
  }

  /**
   * Find Fluxbeam pools
   */
  private async findFluxbeamPool(tokenMint: string): Promise<PoolInfo | null> {
    try {
      const tokenPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.DEX_PROGRAMS.FLUXBEAM);
      
      // Get Fluxbeam pools
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: 'processed',
        dataSlice: { offset: 0, length: 0 }, // Return only addresses, not full data
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: tokenPubkey.toBase58()
            }
          }
        ]
      });
      
      if (accounts.length > 0) {
        const poolAccount = accounts[0];
        return {
          address: poolAccount.pubkey.toBase58(),
          type: 'fluxbeam',
          baseToken: tokenMint,
          quoteToken: this.QUOTE_TOKENS.SOL,
          source: 'helius-rpc'
        };
      }
    } catch (error) {
      console.log('Fluxbeam pool search error:', error);
    }
    return null;
  }

  /**
   * Get pool liquidity using Helius
   */
  async getPoolLiquidity(poolAddress: string): Promise<number> {
    try {
      // Use Helius enhanced API to get pool data
      const asset = await helius.rpc.getAsset({ id: poolAddress });
      
      // For now, return 0 as liquidity calculation requires pool-specific logic
      // This would need to be implemented based on each DEX's pool structure
      return 0;
    } catch (error) {
      console.error('Error getting pool liquidity:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const heliusPoolDiscoveryService = new HeliusPoolDiscoveryService();