import { helius } from '../utils/heliusClient';
import axios from 'axios';
import { PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { Raydium } from '@raydium-io/raydium-sdk-v2';
import config from '../config';
import { rpcCall } from '../utils/rpcGate';
import supabase from '../utils/supabaseClient';
import { pumpFunService } from './PumpFunService';
import { getJupiterPriceUrl, getJupiterFetchOptions, JupiterPriceResponse } from '../utils/jupiterEndpoints';

interface PriceCache {
  price: number;
  timestamp: number;
  platform?: string;
  marketCap?: number;
  liquidity?: number;
}

interface SwapInfo {
  signature: string;
  timestamp: number;
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
}

export class PriceDiscoveryService {
  private priceCache: Map<string, PriceCache> = new Map();
  private CACHE_DURATION_MS = 30000; // 30 seconds (increased from 5 seconds)
  private connection: Connection;
  private raydiumClient: Raydium | null = null;
  private supplyCache: Map<string, { supply: number; timestamp: number }> = new Map();
  private SUPPLY_CACHE_DURATION_MS = 300000; // 5 minutes for supply data
  private lastHeliusCall = 0;
  private heliusRateLimit = 200; // 200ms between Helius calls

  constructor() {
    console.log('PriceDiscoveryService initialized');
    // Use Helius RPC with proper authentication
    const rpcUrl = config.heliusRpcUrl || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    console.log(`[PriceDiscovery] Using RPC URL: ${rpcUrl.includes('helius') ? 'Helius RPC' : 'Default RPC'}`);
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    });
    this.initializeRaydium();
  }

  private async initializeRaydium() {
    try {
      this.raydiumClient = await Raydium.load({
        connection: this.connection,
        // cluster: 'mainnet', // Raydium v2 automatically detects from connection
      });
      console.log('Raydium SDK initialized for price discovery');
    } catch (error) {
      console.error('Failed to initialize Raydium SDK:', error);
    }
  }

  /**
   * Get token price with multiple sources and smart fallbacks
   */
  async getTokenPrice(mint: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.getCachedPrice(mint);
      if (cached !== null) {
        return cached;
      }

      let price = 0;
      let source = 'unknown';

      // Determine token platform for optimized price discovery
      const platform = await this.getTokenPlatform(mint);
      console.log(`Getting price for ${mint} (platform: ${platform})`);

      // Priority 1: Platform-specific APIs (most accurate for new tokens)
      if (platform === 'pump.fun' || mint.endsWith('pump')) {
        price = await this.getPriceFromPumpFun(mint);
        if (price > 0) source = 'pump.fun';
      }

      // Priority 2: Recent transaction analysis (real trading data)
      if (price === 0) {
        price = await this.getPriceFromHeliusSwaps(mint);
        if (price > 0) source = 'helius_txn';
      }

      // Priority 3: DEX pool reserves (real-time liquidity)
      if (price === 0) {
        price = await this.getPriceFromRaydiumPool(mint);
        if (price > 0) source = 'raydium';
      }

      // Priority 4: Jupiter aggregator (covers many tokens)
      if (price === 0) {
        price = await this.getPriceFromJupiter(mint);
        if (price > 0) source = 'jupiter';
      }

      // Priority 5: DexScreener (comprehensive but may have delay)
      if (price === 0) {
        price = await this.getPriceFromDexScreener(mint);
        if (price > 0) source = 'dexscreener';
      }

      // Cache and persist the result
      if (price > 0) {
        console.log(`✅ Found price for ${mint}: $${price.toFixed(8)} (source: ${source})`);
        this.cachePrice(mint, price, platform);
        await this.persistPrice(mint, price, source);
      } else {
        console.log(`❌ No price found for ${mint}`);
      }

      return price;
    } catch (error) {
      console.error(`Error getting price for ${mint}:`, error);
      return 0;
    }
  }

  /**
   * Get price from recent swap transactions using Helius
   */
  private async getPriceFromHeliusSwaps(mint: string): Promise<number> {
    try {
      // Skip if no API key configured
      if (!config.heliusApiKey) {
        console.log('[PriceDiscovery] Helius API key not configured, skipping swap price check');
        return 0;
      }

      // Rate limiting for Helius
      const now = Date.now();
      if (now - this.lastHeliusCall < this.heliusRateLimit) {
        return 0;
      }
      this.lastHeliusCall = now;

      // Use the connection object which already has Helius RPC configured
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mint),
        { limit: 10 }
      );

      if (!signatures || signatures.length === 0) {
        console.log(`[PriceDiscovery] No transactions found for ${mint}`);
        return 0;
      }

      // Get transaction details for the signatures (limit to 5 for rate limiting)
      const sigStrings = signatures.slice(0, 5).map(sig => sig.signature);
      
      for (const sig of sigStrings) {
        try {
          const tx = await this.connection.getTransaction(sig, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          });
          
          if (!tx) continue;
          
          const price = await this.extractPriceFromTransaction(tx, mint);
          if (price > 0) {
            console.log(`Found price for ${mint} from recent transaction: $${price.toFixed(8)}`);
            return price;
          }
        } catch (txError: any) {
          console.log(`[PriceDiscovery] Error fetching transaction ${sig}:`, txError.message);
          continue;
        }
      }

      return 0;
    } catch (error: any) {
      if (error.toString().includes('429') || error.toString().includes('rate')) {
        console.error('[PriceDiscovery] Helius rate limit hit, increasing delay');
        this.heliusRateLimit = Math.min(this.heliusRateLimit * 2, 5000);
      } else if (error.toString().includes('401') || error.toString().includes('unauthorized')) {
        console.error('[PriceDiscovery] Helius authentication error - check API key configuration');
        console.error('Current RPC URL:', config.heliusRpcUrl?.replace(/api-key=.*/, 'api-key=***'));
        // Try fallback RPC
        if (config.heliusRpcUrl && config.heliusRpcUrl.includes('helius')) {
          console.log('[PriceDiscovery] Switching to fallback Alchemy RPC');
          this.connection = new Connection(process.env.ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com');
        }
      } else {
        console.error(`[PriceDiscovery] Error getting Helius swap price for ${mint}:`, error.message);
      }
      return 0;
    }
  }

  /**
   * Extract price from regular RPC transaction
   */
  private async extractPriceFromTransaction(tx: any, targetMint: string): Promise<number> {
    try {
      if (!tx?.meta || !tx?.transaction) {
        return 0;
      }

      const { meta, transaction } = tx;
      
      // Check if transaction was successful
      if (meta.err !== null) {
        return 0;
      }

      // Look for token transfers involving our target mint
      const preTokenBalances = meta.preTokenBalances || [];
      const postTokenBalances = meta.postTokenBalances || [];
      
      let tokenDelta = 0;
      let solDelta = 0;
      
      // Calculate token change
      for (const postBalance of postTokenBalances) {
        if (postBalance.mint === targetMint) {
          const preBalance = preTokenBalances.find(
            (pre: any) => pre.accountIndex === postBalance.accountIndex && pre.mint === targetMint
          );
          
          if (preBalance && postBalance) {
            const preBal = parseFloat(preBalance.uiTokenAmount.uiAmountString || '0');
            const postBal = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0');
            const delta = Math.abs(postBal - preBal);
            
            if (delta > tokenDelta) {
              tokenDelta = delta;
            }
          }
        }
      }
      
      // Calculate SOL change - look for the largest SOL transfer
      const preBalances = meta.preBalances || [];
      const postBalances = meta.postBalances || [];
      
      // Check each account for SOL changes
      for (let i = 0; i < preBalances.length && i < postBalances.length; i++) {
        const delta = Math.abs(postBalances[i] - preBalances[i]) / LAMPORTS_PER_SOL;
        if (delta > solDelta) {
          solDelta = delta;
        }
      }
      
      // If we have both token and SOL changes, calculate price
      if (tokenDelta > 0 && solDelta > 0) {
        const priceInSol = solDelta / tokenDelta;
        const solPrice = await this.getSolPrice();
        const usdPrice = priceInSol * solPrice;
        
        // Sanity check - price should be reasonable
        if (usdPrice > 0 && usdPrice < 1000000) {
          return usdPrice;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Error extracting price from transaction:', error);
      return 0;
    }
  }

  /**
   * Extract price from Helius enhanced transaction
   */
  private async extractPriceFromHeliusTransaction(tx: any, targetMint: string): Promise<number> {
    try {
      // Helius enhanced transactions have a specific structure
      if (tx.type !== 'SWAP' || !tx.tokenTransfers) {
        return 0;
      }

      let tokenAmount = 0;
      let solAmount = 0;
      
      // Find token transfers involving our target mint
      for (const transfer of tx.tokenTransfers) {
        if (transfer.mint === targetMint) {
          tokenAmount = Math.abs(transfer.tokenAmount);
        }
      }

      // Find SOL transfers (native transfers)
      if (tx.nativeTransfers) {
        for (const transfer of tx.nativeTransfers) {
          // Consider transfers involving known DEX programs
          if (this.isDexProgram(transfer.fromUserAccount) || this.isDexProgram(transfer.toUserAccount)) {
            solAmount += Math.abs(transfer.amount) / LAMPORTS_PER_SOL;
          }
        }
      }

      // Calculate price if we have both amounts
      if (tokenAmount > 0 && solAmount > 0) {
        const priceInSol = solAmount / tokenAmount;
        
        // Get current SOL price
        const solPrice = await this.getSolPrice();
        const usdPrice = priceInSol * solPrice;
        
        return usdPrice;
      }

      // Fallback to parsing the raw transaction
      return this.parseSwapTransaction(tx, targetMint);
    } catch (error) {
      console.error('Error extracting price from Helius transaction:', error);
      return 0;
    }
  }

  /**
   * Check if address is a known DEX program
   */
  private isDexProgram(address: string): boolean {
    const dexPrograms = [
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
      'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CPMM
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca v2
      '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',  // Pump.fun
    ];
    return dexPrograms.includes(address);
  }

  /**
   * Get price from Raydium pool reserves
   */
  private async getPriceFromRaydiumPool(mint: string): Promise<number> {
    try {
      if (!this.raydiumClient) {
        await this.initializeRaydium();
        if (!this.raydiumClient) return 0;
      }

      // Get pools for this token
      const poolList = await this.raydiumClient.api.getPoolList({
        poolType: 'All',
        poolSortField: 'liquidity',
        sortType: 'desc',
        pageSize: 5
      } as any);

      if (!poolList.data || poolList.data.length === 0) {
        return 0;
      }

      // Find pool with SOL pair
      const solMint = 'So11111111111111111111111111111111111111112';
      const solPool = poolList.data.find(pool => {
        const poolMintA = pool.mintA.address || pool.mintA;
        const poolMintB = pool.mintB.address || pool.mintB;
        return (
          (poolMintA === mint && poolMintB === solMint) ||
          (poolMintB === mint && poolMintA === solMint)
        );
      });

      if (!solPool) {
        return 0;
      }

      // Calculate price from reserves
      let priceInSol = 0;
      const poolMintA = solPool.mintA.address || solPool.mintA;
      const poolMintB = solPool.mintB.address || solPool.mintB;
      
      if (poolMintA === mint) {
        // Token is mintA, SOL is mintB
        priceInSol = solPool.mintAmountB / solPool.mintAmountA;
      } else {
        // SOL is mintA, Token is mintB
        priceInSol = solPool.mintAmountA / solPool.mintAmountB;
      }

      // Convert to USD
      const solPrice = await this.getSolPrice();
      const usdPrice = priceInSol * solPrice;

      const liquidity = (solPool as any).tvl || 0;
      console.log(`Found Raydium pool price for ${mint}: $${usdPrice.toFixed(6)} (Liquidity: $${liquidity})`);
      return usdPrice;
    } catch (error) {
      console.error(`Error getting Raydium pool price for ${mint}:`, error);
      return 0;
    }
  }

  /**
   * Get price from pump.fun bonding curve
   */
  private async getPriceFromPumpFun(mint: string): Promise<number> {
    try {
      // Try pump.fun API directly first for most accurate price
      const response = await axios.get(`https://frontend-api.pump.fun/coins/${mint}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0' // Some APIs require a user agent
        }
      });

      if (response.data) {
        const data = response.data;
        
        // Method 1: Direct price if available
        if (data.price) {
          console.log(`Pump.fun direct price for ${mint}: $${data.price}`);
          return data.price;
        }
        
        // Method 2: Calculate from market cap and supply
        if (data.usd_market_cap > 0 && data.total_supply > 0) {
          const price = data.usd_market_cap / data.total_supply;
          console.log(`Pump.fun calculated price for ${mint}: $${price.toFixed(8)} (MC: $${data.usd_market_cap})`);
          return price;
        }
        
        // Method 3: Calculate from bonding curve reserves
        if (data.virtual_sol_reserves && data.virtual_token_reserves) {
          const solPrice = await this.getSolPrice();
          const solInPool = data.virtual_sol_reserves / LAMPORTS_PER_SOL;
          const tokensInPool = data.virtual_token_reserves / 1e6; // pump tokens have 6 decimals
          
          if (tokensInPool > 0) {
            const priceInSol = solInPool / tokensInPool;
            const priceInUsd = priceInSol * solPrice;
            console.log(`Pump.fun bonding curve price for ${mint}: $${priceInUsd.toFixed(8)} (${priceInSol.toFixed(8)} SOL)`);
            return priceInUsd;
          }
        }
      }

      // Fallback to pump service
      const serviceData = await pumpFunService.getTokenData(mint);
      if (serviceData) {
        if (serviceData.usd_market_cap > 0 && serviceData.total_supply > 0) {
          const calculatedPrice = serviceData.usd_market_cap / serviceData.total_supply;
          console.log(`Pump service calculated price for ${mint}: $${calculatedPrice.toFixed(8)}`);
          return calculatedPrice;
        }
      }

      return 0;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Token ${mint} not found on pump.fun`);
      } else {
        console.error(`Error getting pump.fun price for ${mint}:`, error.message);
      }
      return 0;
    }
  }

  /**
   * Get current SOL price in USD
   */
  private solPriceCache: { price: number; timestamp: number } | null = null;
  private async getSolPrice(): Promise<number> {
    // Check cache first (5 minute cache)
    if (this.solPriceCache && Date.now() - this.solPriceCache.timestamp < 300000) {
      return this.solPriceCache.price;
    }

    try {
      // Try to get SOL price from Jupiter
      const solMint = 'So11111111111111111111111111111111111111112';
      const priceUrl = getJupiterPriceUrl(solMint);
      const fetchOptions = getJupiterFetchOptions({
        timeout: 10000, // 10 seconds
        maxRetries: 3
      });
      
      const response = await axios.get(priceUrl, {
        ...fetchOptions,
        params: { showExtraInfo: false }
      });

      if (response.data?.data?.['So11111111111111111111111111111111111111112']) {
        const price = response.data.data['So11111111111111111111111111111111111111112'].price || 150;
        this.solPriceCache = { price, timestamp: Date.now() };
        return price;
      }
    } catch (error) {
      console.error('Error fetching SOL price:', error);
    }

    // Fallback to default
    return 150;
  }

  /**
   * Parse swap transaction to extract price (simplified version)
   */
  private parseSwapTransaction(tx: any, targetMint: string): number {
    try {
      // Look for token balance changes in the transaction
      const preBalances = tx.meta?.preTokenBalances || [];
      const postBalances = tx.meta?.postTokenBalances || [];
      
      // Find SOL changes (simplified - looks for SOL transfers)
      const preSol = tx.meta?.preBalances || [];
      const postSol = tx.meta?.postBalances || [];
      
      let solChange = 0;
      let tokenChange = 0;

      // Calculate SOL change (usually index 0 is the signer)
      if (preSol.length > 0 && postSol.length > 0) {
        solChange = Math.abs(postSol[0] - preSol[0]) / LAMPORTS_PER_SOL;
      }

      // Find token changes for our target mint
      for (let i = 0; i < postBalances.length; i++) {
        const postBal = postBalances[i];
        if (postBal.mint === targetMint) {
          const preBal = preBalances.find((p: any) => p.accountIndex === postBal.accountIndex);
          if (preBal) {
            tokenChange = Math.abs(
              parseFloat(postBal.uiTokenAmount.uiAmountString) - 
              parseFloat(preBal.uiTokenAmount.uiAmountString)
            );
            break;
          }
        }
      }

      // Calculate price if we have both SOL and token changes
      if (solChange > 0 && tokenChange > 0) {
        const price = solChange / tokenChange;
        // Assuming SOL price ~$150 (you could fetch real SOL price)
        const usdPrice = price * 150; 
        return usdPrice;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get price from Jupiter API (fallback)
   * Rate limited to prevent 429 errors
   */
  private lastJupiterCall = 0;
  private jupiterCallDelay = 200; // Minimum 200ms between calls for faster discovery
  
  private async getPriceFromJupiter(mint: string): Promise<number> {
    try {
      // Rate limit check
      const now = Date.now();
      const timeSinceLastCall = now - this.lastJupiterCall;
      
      if (timeSinceLastCall < this.jupiterCallDelay) {
        // Skip if called too soon
        console.log(`Skipping Jupiter call for ${mint} (rate limit protection)`);
        return 0;
      }
      
      this.lastJupiterCall = now;
      
      const priceUrl = getJupiterPriceUrl(mint);
      const fetchOptions = getJupiterFetchOptions({
        timeout: 10000, // 10 seconds
        maxRetries: 3
      });
      
      const response = await axios.get(priceUrl, {
        ...fetchOptions,
        params: { showExtraInfo: false }
      });

      if (response.data?.data?.[mint]) {
        return response.data.data[mint].price || 0;
      }
      return 0;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error(`Jupiter rate limit hit for ${mint}. Increasing delay.`);
        // Increase delay if we hit rate limit
        this.jupiterCallDelay = Math.min(this.jupiterCallDelay * 2, 10000);
      } else if (error.code === 'ENOTFOUND' || error.cause?.code === 'ENOTFOUND') {
        console.error(`DNS/Network error accessing Jupiter API: ${error.cause?.message || error.message}`);
        console.log('Jupiter API may be temporarily unavailable or blocked');
      } else {
        console.error(`Jupiter price fetch error for ${mint}:`, error.message);
      }
      return 0;
    }
  }

  /**
   * Get price from DexScreener API as fallback
   */
  private async getPriceFromDexScreener(mint: string): Promise<number> {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Get the pair with highest liquidity
        const bestPair = response.data.pairs.reduce((best: any, current: any) => {
          const bestLiq = parseFloat(best.liquidity?.usd || '0');
          const currentLiq = parseFloat(current.liquidity?.usd || '0');
          return currentLiq > bestLiq ? current : best;
        });

        const price = parseFloat(bestPair.priceUsd || '0');
        if (price > 0) {
          console.log(`DexScreener price for ${mint}: $${price}`);
          
          // Also save token metadata if available
          let tokenInfo = null;
          if (bestPair.baseToken?.address === mint) {
            tokenInfo = bestPair.baseToken;
          } else if (bestPair.quoteToken?.address === mint) {
            tokenInfo = bestPair.quoteToken;
          }
          
          if (tokenInfo && tokenInfo.name && tokenInfo.name !== 'Unknown Token') {
            console.log(`DexScreener also has metadata for ${mint}: ${tokenInfo.name}`);
            // Update token metadata in database
            supabase
              .from('token_metadata')
              .upsert({
                mint: mint,
                symbol: tokenInfo.symbol || 'UNKNOWN',
                name: tokenInfo.name || 'Unknown Token',
                platform: 'dexscreener',
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'mint' })
              .then(result => {
                if (result.error) {
                  console.error('Error saving DexScreener metadata:', result.error);
                } else {
                  console.log('Saved DexScreener metadata to database');
                }
              });
          }
          
          return price;
        }
      }
      
      return 0;
    } catch (error: any) {
      if (!error.message?.includes('429')) {
        console.error(`DexScreener price fetch error for ${mint}:`, error.message);
      }
      return 0;
    }
  }

  /**
   * Get token platform (pump.fun, raydium, etc.) using Helius metadata
   */
  async getTokenPlatform(mint: string): Promise<string> {
    try {
      // Check cache for platform info
      const cached = this.priceCache.get(mint);
      if (cached?.platform) {
        return cached.platform;
      }

      // Get asset metadata from Helius
      const asset = await helius.rpc.getAsset({ id: mint });
      
      if (!asset) {
        return 'unknown';
      }

      // Check metadata for platform indicators
      const metadata = asset.content?.metadata;
      const name = metadata?.name?.toLowerCase() || '';
      const symbol = metadata?.symbol?.toLowerCase() || '';
      const uri = (metadata as any)?.uri?.toLowerCase() || '';

      // Platform detection logic
      let platform = 'unknown';
      
      if (uri.includes('pump.fun') || name.includes('pump')) {
        platform = 'pump.fun';
      } else if (asset.creators?.some(c => c.address === 'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM')) {
        platform = 'pump.fun'; // Pump.fun creator address
      } else if (uri.includes('raydium')) {
        platform = 'raydium';
      } else if (uri.includes('moonshot')) {
        platform = 'moonshot';
      }

      // Update cache with platform info
      const currentCache = this.priceCache.get(mint);
      if (currentCache) {
        currentCache.platform = platform;
      }

      return platform;
    } catch (error) {
      console.error(`Error getting platform for ${mint}:`, error);
      return 'unknown';
    }
  }

  /**
   * Get cached price if still valid
   */
  private getCachedPrice(mint: string): number | null {
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.price;
    }
    return null;
  }

  /**
   * Cache price for a token
   */
  private cachePrice(mint: string, price: number, platform?: string): void {
    this.priceCache.set(mint, {
      price,
      timestamp: Date.now(),
      platform
    });
  }

  /**
   * Cache liquidity for a token
   */
  private cacheLiquidity(mint: string, liquidity: number): void {
    const cached = this.priceCache.get(mint);
    if (cached) {
      cached.liquidity = liquidity;
      cached.timestamp = Date.now();
    } else {
      this.priceCache.set(mint, {
        price: 0,
        liquidity,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get token liquidity from DEX pools
   */
  async getTokenLiquidity(mint: string): Promise<number | null> {
    try {
      console.log(`Fetching liquidity for ${mint}`);
      
      // Check cache first
      const cached = this.priceCache.get(mint);
      if (cached && cached.liquidity !== undefined && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
        console.log(`Liquidity from cache for ${mint}: $${cached.liquidity}`);
        return cached.liquidity;
      }
      
      // Try Raydium first
      const raydiumLiquidity = await this.getLiquidityFromRaydium(mint);
      if (raydiumLiquidity !== null) {
        console.log(`Raydium liquidity for ${mint}: $${raydiumLiquidity}`);
        this.cacheLiquidity(mint, raydiumLiquidity);
        return raydiumLiquidity;
      }

      // Try pump.fun bonding curve
      const platform = await this.getTokenPlatform(mint);
      if (platform === 'pump.fun') {
        const pumpLiquidity = await this.getLiquidityFromPumpFun(mint);
        if (pumpLiquidity !== null) {
          this.cacheLiquidity(mint, pumpLiquidity);
          return pumpLiquidity;
        }
      }

      // Try Jupiter API as fallback
      const jupiterLiquidity = await this.getLiquidityFromJupiter(mint);
      if (jupiterLiquidity !== null) {
        this.cacheLiquidity(mint, jupiterLiquidity);
        return jupiterLiquidity;
      }

      // Don't estimate - return null if no real liquidity found
      // This ensures we only show real data

      // Cache the liquidity result
      if (cached) {
        cached.liquidity = undefined;
      }
      
      console.log(`No liquidity found for ${mint}`);
      return null;
    } catch (error) {
      console.error(`Error fetching liquidity for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Get liquidity from Raydium pools
   */
  private async getLiquidityFromRaydium(mint: string): Promise<number | null> {
    try {
      // Use Raydium V3 API directly for better pool data
      const response = await axios.get(`https://api-v3.raydium.io/pools/info/mint?mint1=${mint}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data?.success && response.data?.data) {
        let totalLiquidity = 0;
        
        // Sum liquidity from all pools
        for (const pool of response.data.data) {
          // TVL is in USD
          if (pool.tvl) {
            totalLiquidity += Number(pool.tvl);
          }
        }
        
        if (totalLiquidity > 0) {
          console.log(`Found Raydium liquidity for ${mint}: $${totalLiquidity.toLocaleString()}`);
          return totalLiquidity;
        }
      }
      
      return null;
    } catch (error: any) {
      // Don't log rate limit errors
      if (!error.message?.includes('429')) {
        console.error(`Error getting Raydium liquidity for ${mint}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get liquidity from pump.fun bonding curve
   */
  private async getLiquidityFromPumpFun(mint: string): Promise<number | null> {
    try {
      // First try the RapidAPI PumpFun scraper for better data
      const rapidApiResponse = await this.getPumpFunDataFromRapidAPI(mint);
      if (rapidApiResponse) {
        return rapidApiResponse;
      }

      // Fallback to frontend API
      const response = await axios.get(`https://frontend-api.pump.fun/coins/${mint}`, {
        timeout: 5000
      });

      if (response.data) {
        // Pump.fun provides total_supply, price, and market_cap
        // For liquidity, we can use the bonding curve SOL reserve
        if (response.data.virtual_sol_reserves) {
          const solReserves = response.data.virtual_sol_reserves / LAMPORTS_PER_SOL;
          const solPrice = await this.getSolPrice();
          return solReserves * solPrice;
        }
        // Fallback to using a percentage of market cap as estimated liquidity
        return response.data.usd_market_cap ? response.data.usd_market_cap * 0.15 : null;
      }

      return null;
    } catch (error) {
      console.error(`Error getting pump.fun liquidity for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Get pump.fun data from RapidAPI scraper
   */
  private async getPumpFunDataFromRapidAPI(mint: string): Promise<number | null> {
    try {
      const rapidApiKey = process.env.RAPIDAPI_KEY || '569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22';
      
      const response = await axios.get(`https://pumpfun-scraper-api.p.rapidapi.com/search_tokens?term=${mint}`, {
        timeout: 5000,
        headers: {
          'x-rapidapi-host': 'pumpfun-scraper-api.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey
        }
      });

      if (response.data?.data && response.data.data.length > 0) {
        const tokenData = response.data.data[0];
        const bondingProgress = parseFloat(tokenData.bondingCurveProgress || '0');
        const marketCap = parseFloat(tokenData.marketCap || '0');
        
        console.log(`PumpFun data for ${mint}: progress=${bondingProgress}, marketCap=${marketCap}`);
        
        if (marketCap > 0 && bondingProgress > 0) {
          // Calculate liquidity based on bonding curve mechanics:
          // - Bonding curve starts with 30 SOL virtual liquidity
          // - At 100% progress, there's 85 SOL in the curve
          // - Current SOL = 30 + (progress * 55)
          // NOTE: bondingProgress is in percentage format (e.g., 14.32), not decimal (0.1432)
          const normalizedProgress = bondingProgress > 1 ? bondingProgress / 100 : bondingProgress;
          const solInCurve = 30 + (normalizedProgress * 55);
          
          // Convert SOL to USD (approximate)
          const solPriceUSD = 240; // Current approximate SOL price
          const liquidityUSD = solInCurve * solPriceUSD;
          
          console.log(`Calculated pump.fun liquidity: $${liquidityUSD} USD (${solInCurve} SOL)`);
          return liquidityUSD;
        } else if (marketCap > 0) {
          // Fallback: estimate liquidity as percentage of market cap
          const estimatedLiquidity = marketCap * 0.20; // 20% estimate for early stage
          console.log(`Estimated pump.fun liquidity from market cap: $${estimatedLiquidity} USD`);
          return estimatedLiquidity;
        }
      }
      
      return null;
    } catch (error: any) {
      if (!error.message?.includes('429')) {
        console.error(`RapidAPI PumpFun error for ${mint}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get liquidity from Jupiter API
   */
  private async getLiquidityFromJupiter(mint: string): Promise<number | null> {
    try {
      // Use Jupiter's token list API which includes some liquidity data
      const response = await axios.get(`https://token.jup.ag/all`, {
        timeout: 5000
      });
      
      if (response.data) {
        const token = response.data.find((t: any) => t.address === mint);
        if (token && token.daily_volume) {
          // Use daily volume as a proxy for liquidity if available
          const estimatedLiquidity = Number(token.daily_volume) * 2; // Rough estimate
          if (estimatedLiquidity > 0) {
            console.log(`Estimated liquidity from Jupiter volume for ${mint}: $${estimatedLiquidity.toLocaleString()}`);
            return estimatedLiquidity;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting Jupiter liquidity for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Get token supply and calculate market cap
   */
  async getTokenSupplyAndMarketCap(mint: string, price: number): Promise<{ supply: number | null; marketCap: number | null }> {
    try {
      // Check supply cache first
      const cached = this.supplyCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.SUPPLY_CACHE_DURATION_MS) {
        const marketCap = price * cached.supply;
        return { supply: cached.supply, marketCap };
      }

      // Rate limit Helius calls
      const now = Date.now();
      const timeSinceLastCall = now - this.lastHeliusCall;
      if (timeSinceLastCall < this.heliusRateLimit) {
        // Skip Helius, use fallback
        return this.getSupplyFromRPC(mint, price);
      }

      try {
        // Try Helius first for enriched data
        this.lastHeliusCall = now;
        const asset = await helius.rpc.getAsset({ id: mint });
        
        if (asset && asset.token_info && asset.token_info.supply) {
          const supply = asset.token_info.supply;
          const decimals = asset.token_info.decimals || 9;
          
          // Convert from raw units to actual supply
          const actualSupply = supply / Math.pow(10, decimals);
          
          // Cache the supply
          this.supplyCache.set(mint, { supply: actualSupply, timestamp: Date.now() });
          
          const marketCap = price * actualSupply;
          return { supply: actualSupply, marketCap };
        }
      } catch (heliusError: any) {
        if (heliusError.message?.includes('429')) {
          console.log(`Helius rate limit hit for ${mint}, using RPC fallback`);
          // Increase rate limit delay
          this.heliusRateLimit = Math.min(this.heliusRateLimit * 2, 5000);
        }
      }

      // Fallback to direct RPC call
      return this.getSupplyFromRPC(mint, price);
    } catch (error) {
      console.error(`Error fetching token supply for ${mint}:`, error);
      return { supply: null, marketCap: null };
    }
  }

  /**
   * Get supply from RPC as fallback
   */
  private async getSupplyFromRPC(mint: string, price: number): Promise<{ supply: number | null; marketCap: number | null }> {
    try {
      const mintPubkey = new PublicKey(mint);
      const supplyInfo = await rpcCall<any>('getTokenSupply', [mintPubkey.toBase58()]);
      
      if (supplyInfo.value) {
        const supply = Number(supplyInfo.value.amount);
        const decimals = supplyInfo.value.decimals;
        const actualSupply = supply / Math.pow(10, decimals);
        
        // Cache the supply
        this.supplyCache.set(mint, { supply: actualSupply, timestamp: Date.now() });
        
        const marketCap = price * actualSupply;
        return { supply: actualSupply, marketCap };
      }

      return { supply: null, marketCap: null };
    } catch (error) {
      console.error(`RPC error fetching supply for ${mint}:`, error);
      return { supply: null, marketCap: null };
    }
  }

  /**
   * Batch get prices for multiple tokens (more efficient)
   */
  async getTokenPrices(mints: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    
    // First, check cache for all tokens
    const uncachedMints: string[] = [];
    for (const mint of mints) {
      const cached = this.getCachedPrice(mint);
      if (cached !== null) {
        prices.set(mint, cached);
      } else {
        uncachedMints.push(mint);
      }
    }
    
    // If all prices are cached, return early
    if (uncachedMints.length === 0) {
      return prices;
    }
    
    // Try to get all uncached prices from Jupiter in one call (more efficient)
    if (uncachedMints.length > 0 && uncachedMints.length <= 100) {
      try {
        const now = Date.now();
        if (now - this.lastJupiterCall >= this.jupiterCallDelay) {
          this.lastJupiterCall = now;
          
          const priceUrl = getJupiterPriceUrl(uncachedMints);
          const fetchOptions = getJupiterFetchOptions({
            timeout: 15000, // 15 seconds for batch
            maxRetries: 3
          });
          
          const response = await axios.get(priceUrl, fetchOptions);
          
          if (response.data?.data) {
            for (const mint of uncachedMints) {
              const price = response.data.data[mint]?.price || 0;
              if (price > 0) {
                prices.set(mint, price);
                this.cachePrice(mint, price);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.error('Jupiter batch rate limit hit. Increasing delay.');
          this.jupiterCallDelay = Math.min(this.jupiterCallDelay * 2, 10000);
        } else if (error.code === 'ENOTFOUND' || error.cause?.code === 'ENOTFOUND') {
          console.error(`DNS/Network error accessing Jupiter API: ${error.cause?.message || error.message}`);
          console.log('Jupiter API may be temporarily unavailable or blocked');
          
          // Try to use cached prices from database as fallback
          await this.getCachedPricesFromDB(uncachedMints, prices);
        } else {
          console.error('Jupiter batch error:', error.message);
        }
      }
    }
    
    // For any remaining tokens without prices, try individual methods
    // Process in smaller batches to avoid rate limits
    const remainingMints = uncachedMints.filter(mint => !prices.has(mint));
    
    if (remainingMints.length > 0) {
      console.log(`Fetching individual prices for ${remainingMints.length} tokens...`);
      
      // Process in parallel but with a limit
      const batchSize = 5;
      for (let i = 0; i < remainingMints.length; i += batchSize) {
        const batch = remainingMints.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (mint) => {
            try {
              const price = await this.getTokenPrice(mint);
              if (price > 0) {
                prices.set(mint, price);
              }
            } catch (error) {
              console.error(`Error fetching price for ${mint}:`, error);
            }
          })
        );
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < remainingMints.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    return prices;
  }

  /**
   * Get cached prices from database as fallback
   */
  private async getCachedPricesFromDB(mints: string[], prices: Map<string, number>): Promise<void> {
    try {
      const { data: cached } = await supabase
        .from('token_prices')
        .select('token_mint, price')
        .in('token_mint', mints)
        .not('price', 'is', null)
        .gt('price', 0);
        
      if (cached && cached.length > 0) {
        for (const item of cached) {
          if (!prices.has(item.token_mint)) {
            prices.set(item.token_mint, item.price);
            // Also update local cache
            this.cachePrice(item.token_mint, item.price);
          }
        }
        console.log(`Using ${cached.length} cached prices from database due to API unavailability`);
      }
    } catch (error) {
      console.error('Error fetching cached prices from DB:', error);
    }
  }

  /**
   * Persist price to Supabase (current & history)
   */
  private async persistPrice(mint: string, price: number, source: string = 'price_discovery'): Promise<void> {
    try {
      await supabase
        .from('token_prices')
        .upsert({
          token_mint: mint,
          price: price,
          price_usd: price,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token_mint' });

      await supabase
        .from('token_price_history')
        .insert({
          token_mint: mint,
          price: price,
          liquidity: null,
          volume_24h: null,
          market_cap: null,
          recorded_at: new Date().toISOString(),
          source: source
        });
    } catch (error) {
      console.error('Error persisting price for', mint, error);
    }
  }
}

// Export singleton instance
export const priceDiscoveryService = new PriceDiscoveryService();