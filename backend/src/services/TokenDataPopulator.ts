import supabase from '../utils/supabaseClient';
import { Connection, PublicKey } from '@solana/web3.js';

const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

export class TokenDataPopulator {
  private connection: Connection;
  private priceDiscoveryService: any;
  private liquidityVelocityTracker: any;
  private monitoringStatsService: any;
  private heliusTokenDiscoveryService: any;

  constructor() {
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  private async initializeServices() {
    if (!this.priceDiscoveryService) {
      const { priceDiscoveryService } = await import('./PriceDiscoveryService');
      this.priceDiscoveryService = priceDiscoveryService;
    }
    if (!this.liquidityVelocityTracker) {
      const { liquidityVelocityTracker } = await import('./LiquidityVelocityTracker');
      this.liquidityVelocityTracker = liquidityVelocityTracker;
    }
    if (!this.monitoringStatsService) {
      const { monitoringStatsService } = await import('./MonitoringStatsService');
      this.monitoringStatsService = monitoringStatsService;
    }
    if (!this.heliusTokenDiscoveryService) {
      const { heliusTokenDiscoveryService } = await import('./HeliusTokenDiscoveryService');
      this.heliusTokenDiscoveryService = heliusTokenDiscoveryService;
    }
  }

  async populateTokenData(tokenMint: string, walletAddress: string): Promise<void> {
    console.log(`[TokenDataPopulator] Starting data population for ${tokenMint}`);
    
    // Initialize services
    await this.initializeServices();
    
    try {
      // 1. Discover pool address first
      const poolAddress = await this.discoverPoolAddress(tokenMint);
      
      // 2. Fetch token metadata
      await this.fetchAndStoreMetadata(tokenMint);
      
      // 3. Fetch current price
      const priceData = await this.fetchAndStorePrice(tokenMint);
      
      // 4. Create price history for velocity calculations
      await this.createPriceHistory(tokenMint, priceData.price);
      
      // 5. Initialize pool liquidity data
      if (poolAddress) {
        await this.initializePoolLiquidity(poolAddress, tokenMint, priceData.liquidity);
      }
      
      // 6. Initialize liquidity velocity tracking
      await this.initializeLiquidityVelocity(tokenMint, priceData.liquidity);
      
      // 7. Initialize monitoring stats
      await this.initializeMonitoringStats(tokenMint, walletAddress);
      
      // 8. Update protected token with pool address if found
      if (poolAddress) {
        await this.updateProtectedTokenPool(tokenMint, walletAddress, poolAddress);
      }
      
      // 9. Start active monitoring
      await this.liquidityVelocityTracker.trackToken(tokenMint);
      await this.monitoringStatsService.forceUpdate(tokenMint, walletAddress);
      
      // 10. Clear the is_newly_added flag now that data is populated
      await supabase
        .from('wallet_tokens')
        .update({ 
          is_newly_added: false,
          updated_at: new Date().toISOString()
        })
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress);
      
      console.log(`[TokenDataPopulator] ✅ Data population complete for ${tokenMint}`);
    } catch (error) {
      console.error(`[TokenDataPopulator] Error populating data for ${tokenMint}:`, error);
    }
  }

  private async discoverPoolAddress(tokenMint: string): Promise<string | null> {
    try {
      // Try pump.fun pool discovery first
      const pumpFunPool = await this.findPumpFunPool(tokenMint);
      if (pumpFunPool) {
        console.log(`[TokenDataPopulator] Found pump.fun pool: ${pumpFunPool}`);
        return pumpFunPool;
      }

      // Try Raydium pool discovery
      const raydiumPool = await this.findRaydiumPool(tokenMint);
      if (raydiumPool) {
        console.log(`[TokenDataPopulator] Found Raydium pool: ${raydiumPool}`);
        return raydiumPool;
      }

      console.log(`[TokenDataPopulator] No pool found for ${tokenMint}`);
      return null;
    } catch (error) {
      console.error('[TokenDataPopulator] Error discovering pool:', error);
      return null;
    }
  }

  private async findPumpFunPool(tokenMint: string): Promise<string | null> {
    try {
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey(PUMP_FUN_PROGRAM_ID),
        {
          filters: [
            { dataSize: 264 }, // Pump.fun bonding curve size
            {
              memcmp: {
                offset: 8, // Skip discriminator
                bytes: tokenMint
              }
            }
          ]
        }
      );

      if (accounts.length > 0) {
        return accounts[0].pubkey.toBase58();
      }
    } catch (error) {
      console.error('[TokenDataPopulator] Error finding pump.fun pool:', error);
    }
    return null;
  }

  private async findRaydiumPool(tokenMint: string): Promise<string | null> {
    // Simplified - would need full Raydium pool discovery logic
    try {
      const { data } = await supabase
        .from('raydium_pools')
        .select('pool_address')
        .eq('token_mint', tokenMint)
        .single();
      
      return data?.pool_address || null;
    } catch {
      return null;
    }
  }

  private async fetchAndStoreMetadata(tokenMint: string): Promise<void> {
    try {
      // Try to fetch metadata from Helius if service is available
      let metadata: any = null;
      if (this.heliusTokenDiscoveryService && typeof this.heliusTokenDiscoveryService.getTokenMetadata === 'function') {
        metadata = await this.heliusTokenDiscoveryService.getTokenMetadata(tokenMint);
      }
      
      // For pump.fun tokens, try PumpFun Scraper API first as it has the best data
      if (tokenMint.endsWith('pump')) {
        console.log(`[TokenDataPopulator] Trying PumpFun Scraper API first for ${tokenMint}`);
        const pumpFunMetadata = await this.fetchFromPumpFunMetadata(tokenMint);
        if (pumpFunMetadata && pumpFunMetadata.name && pumpFunMetadata.name !== 'Unknown Token') {
          metadata = pumpFunMetadata;
          console.log(`[TokenDataPopulator] Got metadata from PumpFun: ${metadata.symbol} - ${metadata.name}`);
        }
      }
      
      // If still no metadata and Helius has bad data, continue to other sources
      if ((!metadata || !metadata.name || metadata.name === 'Unknown Token') && this.heliusTokenDiscoveryService) {
        // Helius already tried above
      }
      
      // If still no good metadata, try DexScreener
      if (!metadata || !metadata.name || metadata.name === 'Unknown Token') {
        console.log(`[TokenDataPopulator] Trying DexScreener for metadata ${tokenMint}`);
        const dexScreenerMetadata = await this.fetchMetadataFromDexScreener(tokenMint);
        if (dexScreenerMetadata && dexScreenerMetadata.name && dexScreenerMetadata.name !== 'Unknown Token') {
          metadata = dexScreenerMetadata;
        }
      }
      
      // Store metadata if we have it
      if (metadata) {
        // Add intelligent fallback for name
        let finalName = metadata.name || 'Unknown Token';
        if (!metadata.name || metadata.name === 'Unknown Token') {
          if (metadata.symbol && metadata.symbol !== 'UNKNOWN') {
            finalName = metadata.symbol;
            console.log(`[TokenDataPopulator] Using symbol as name: ${finalName}`);
          }
        }
        
        await supabase
          .from('token_metadata')
          .upsert({
            mint: tokenMint,
            symbol: metadata.symbol || 'UNKNOWN',
            name: finalName,
            uri: metadata.uri,
            image_url: metadata.image || metadata.imageUrl || metadata.image_url,
            decimals: metadata.decimals || 9,
            is_active: true,
            platform: metadata.platform || 'pump.fun'
          }, {
            onConflict: 'mint'
          });
        return;
      }
      
      // Fallback: Don't update name/symbol if they're already set
      const { data: existing } = await supabase
        .from('token_metadata')
        .select('symbol, name')
        .eq('mint', tokenMint)
        .single();
      
      // Only update if the existing data is also unknown
      if (!existing || existing.symbol === 'UNKNOWN' || existing.name === 'Unknown Token') {
        await supabase
          .from('token_metadata')
          .upsert({
            mint: tokenMint,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 9,
            is_active: true,
            platform: 'pump.fun'
          }, {
            onConflict: 'mint'
          });
      }
        
    } catch (error) {
      console.error('[TokenDataPopulator] Error fetching metadata:', error);
    }
  }

  private async fetchAndStorePrice(tokenMint: string): Promise<any> {
    try {
      // Fetch REAL price data from multiple sources
      console.log(`[TokenDataPopulator] Fetching real price data for ${tokenMint}`);
      
      let bestPriceData = {
        price: 0,
        liquidity: 0,
        volume24h: 0,
        change24h: 0,
        marketCap: 0,
        holders: 0,
        source: 'none'
      };
      
      // Try all sources in parallel for better performance
      const [priceServiceData, dexScreenerData, jupiterData, heliusData] = await Promise.allSettled([
        this.fetchFromPriceService(tokenMint),
        this.fetchFromDexScreener(tokenMint),
        this.fetchFromJupiter(tokenMint),
        this.fetchFromHelius(tokenMint)
      ]);
      
      // Merge data from all successful sources
      if (priceServiceData.status === 'fulfilled' && priceServiceData.value) {
        const data = priceServiceData.value;
        if (data.price > 0) bestPriceData.price = data.price;
        if (data.liquidity > 0) bestPriceData.liquidity = data.liquidity;
        bestPriceData.source = 'price_service';
      }
      
      if (dexScreenerData.status === 'fulfilled' && dexScreenerData.value) {
        const data = dexScreenerData.value;
        if (data.price > 0) bestPriceData.price = data.price;
        if (data.liquidity > 0) bestPriceData.liquidity = data.liquidity;
        if (data.volume24h > 0) bestPriceData.volume24h = data.volume24h;
        if (data.change24h !== 0) bestPriceData.change24h = data.change24h;
        if (data.marketCap > 0) bestPriceData.marketCap = data.marketCap;
        if (data.holders > 0) bestPriceData.holders = data.holders;
        if (bestPriceData.source === 'none') bestPriceData.source = 'dexscreener';
      }
      
      if (jupiterData.status === 'fulfilled' && jupiterData.value) {
        const data = jupiterData.value;
        if (data.price > 0 && bestPriceData.price === 0) {
          bestPriceData.price = data.price;
          if (bestPriceData.source === 'none') bestPriceData.source = 'jupiter';
        }
      }
      
      if (heliusData.status === 'fulfilled' && heliusData.value) {
        const data = heliusData.value;
        if (data.holders > 0) bestPriceData.holders = data.holders;
      }
      
      console.log(`[TokenDataPopulator] Best data for ${tokenMint}:`, bestPriceData);
      
      // Store in token_prices table with all available data
      if (bestPriceData.price > 0 || bestPriceData.liquidity > 0) {
        await supabase
          .from('token_prices')
          .upsert({
            token_mint: tokenMint,
            price: bestPriceData.price,
            price_usd: bestPriceData.price,
            liquidity: bestPriceData.liquidity,
            volume_24h: bestPriceData.volume24h,
            change_24h: bestPriceData.change24h,
            market_cap: bestPriceData.marketCap,
            holders: bestPriceData.holders,
            platform: bestPriceData.source,
            updated_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });
      }

      return bestPriceData;
    } catch (error) {
      console.error('[TokenDataPopulator] Error fetching price:', error);
      return { price: 0, liquidity: 0, source: 'error' };
    }
  }
  
  private async fetchFromPriceService(tokenMint: string): Promise<any> {
    try {
      const price = await this.priceDiscoveryService.getTokenPrice(tokenMint);
      const liquidity = await this.priceDiscoveryService.getTokenLiquidity(tokenMint);
      
      if (price > 0 || (liquidity !== null && liquidity > 0)) {
        console.log(`[TokenDataPopulator] Got data from PriceDiscoveryService - Price: $${price}, Liquidity: $${liquidity}`);
        return {
          price: price || 0,
          liquidity: liquidity || 0,
          source: 'price_discovery'
        };
      }
      return null;
    } catch (error) {
      console.error('[TokenDataPopulator] Error from price service:', error);
      return null;
    }
  }
  
  private async fetchFromDexScreener(tokenMint: string): Promise<any> {
    try {
      const axios = require('axios');
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PanicSwap/1.0'
        }
      });
      
      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        // Get the pair with highest liquidity
        const bestPair = response.data.pairs.reduce((best: any, current: any) => {
          const bestLiq = parseFloat(best.liquidity?.usd || '0');
          const currentLiq = parseFloat(current.liquidity?.usd || '0');
          return currentLiq > bestLiq ? current : best;
        });
        
        const priceData = {
          price: parseFloat(bestPair.priceUsd) || 0,
          // Handle missing liquidity - use marketCap as fallback
          liquidity: parseFloat(bestPair.liquidity?.usd || bestPair.marketCap || bestPair.fdv || '0'),
          volume24h: parseFloat(bestPair.volume?.h24 || '0'),
          change24h: parseFloat(bestPair.priceChange?.h24 || '0'),
          marketCap: parseFloat(bestPair.fdv || bestPair.marketCap || '0'),
          holders: 0, // DexScreener doesn't provide holder count
          source: 'dexscreener'
        };
        
        console.log(`[TokenDataPopulator] Got comprehensive data from DexScreener:`, priceData);
        
        return priceData;
      }
    } catch (error: any) {
      if (!error.message?.includes('429')) {
        console.error('[TokenDataPopulator] Error fetching from DexScreener:', error.message || error);
      }
    }
    return null;
  }
  
  private async fetchFromJupiter(tokenMint: string): Promise<any> {
    try {
      const axios = require('axios');
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PanicSwap/1.0'
        }
      });
      
      if (response.data && response.data.data && response.data.data[tokenMint]) {
        const tokenData = response.data.data[tokenMint];
        const priceData = {
          price: tokenData.price || 0,
          liquidity: 0, // Jupiter doesn't provide liquidity
          volume24h: 0,
          change24h: 0,
          source: 'jupiter'
        };
        
        console.log(`[TokenDataPopulator] Got real price from Jupiter:`, priceData);
        
        // Store in database
        await supabase
          .from('token_prices')
          .upsert({
            token_mint: tokenMint,
            price: priceData.price,
            price_usd: priceData.price,
            liquidity: 0,
            volume_24h: 0,
            change_24h: 0,
            platform: 'jupiter',
            updated_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });
          
        return priceData;
      }
    } catch (error: any) {
      console.error('[TokenDataPopulator] Error fetching from Jupiter:', error.message || error);
    }
    return null;
  }
  
  private async fetchFromHelius(tokenMint: string): Promise<any> {
    try {
      // Import helius client if not already imported
      const { helius } = await import('../utils/heliusClient');
      
      // Get asset data which includes holder information
      const asset = await helius.rpc.getAsset({ id: tokenMint });
      
      if (asset) {
        const holderData = {
          holders: 0,
          supply: asset.token_info?.supply || 0,
          decimals: asset.token_info?.decimals || 9
        };
        
        // Try to get holder count from ownership data
        if (asset.ownership) {
          // For now, we'll need to use a different approach for holder count
          // Helius getAsset doesn't directly provide holder count
          console.log(`[TokenDataPopulator] Got Helius asset data for ${tokenMint}`);
        }
        
        return holderData;
      }
    } catch (error: any) {
      console.error('[TokenDataPopulator] Error fetching from Helius:', error.message || error);
    }
    return null;
  }

  private async createPriceHistory(tokenMint: string, currentPrice: number): Promise<void> {
    try {
      // Only create a single current price entry - historical data will be populated by monitoring
      const now = new Date();
      const priceEntry = {
        id: crypto.randomUUID(),
        token_mint: tokenMint,
        price: currentPrice,
        liquidity: 0, // Will be updated with real data
        recorded_at: now.toISOString(),
        source: 'initial_fetch'
      };

      await supabase
        .from('token_price_history')
        .insert(priceEntry);
        
      console.log(`[TokenDataPopulator] Created initial price history entry for ${tokenMint}`);
    } catch (error) {
      console.error('[TokenDataPopulator] Error creating price history:', error);
    }
  }

  private async initializePoolLiquidity(poolAddress: string, tokenMint: string, liquidity: number): Promise<void> {
    try {
      const liquiditySol = liquidity / 145; // Assuming SOL price ~$145
      
      await supabase
        .from('pool_liquidity')
        .insert({
          pool_address: poolAddress,
          token_mint: tokenMint,
          liquidity_sol: liquiditySol,
          liquidity_usd: liquidity,
          reserve_sol: liquiditySol,
          reserve_token: liquidity * 1000000, // Estimate
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('[TokenDataPopulator] Error initializing pool liquidity:', error);
    }
  }

  private async initializeLiquidityVelocity(tokenMint: string, currentLiquidity: number): Promise<void> {
    try {
      // Initialize with zero velocities - real values will be calculated by LiquidityVelocityTracker
      await supabase
        .from('liquidity_velocity')
        .insert({
          token_mint: tokenMint,
          liquidity_usd: currentLiquidity,
          liquidity_velocity_1m: 0,  // Will be calculated from real data
          liquidity_velocity_5m: 0,
          liquidity_velocity_30m: 0,
          price_velocity_1m: 0,
          price_velocity_5m: 0,
          price_velocity_30m: 0,
          flash_rug_alert: false,
          rapid_drain_alert: false,
          slow_bleed_alert: false,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
      console.log(`[TokenDataPopulator] Initialized liquidity velocity for ${tokenMint} with current liquidity: $${currentLiquidity}`);
    } catch (error) {
      console.error('[TokenDataPopulator] Error initializing liquidity velocity:', error);
    }
  }

  private async initializeMonitoringStats(tokenMint: string, walletAddress: string): Promise<void> {
    try {
      // Get current real data
      const { data: tokenPrice } = await supabase
        .from('token_prices')
        .select('liquidity')
        .eq('token_mint', tokenMint)
        .single();
        
      const currentLiquidity = tokenPrice?.liquidity || 0;
      
      await supabase
        .from('monitoring_stats')
        .upsert({
          id: crypto.randomUUID(),
          token_mint: tokenMint,
          wallet_address: walletAddress,
          active_monitors: 1,
          websocket_connected: true,
          last_check_at: new Date().toISOString(),
          monitoring_active: true,
          current_liquidity: currentLiquidity,
          liquidity_change_1m: 0,  // Will be calculated from real data
          liquidity_change_5m: 0,
          liquidity_change_30m: 0,
          price_change_1m: 0,
          price_change_5m: 0,
          volume_spike: false,
          flash_rug_alert: false,
          rapid_drain_alert: false,
          slow_bleed_alert: false,
          active_patterns: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'token_mint,wallet_address'
        });
        
      console.log(`[TokenDataPopulator] Initialized monitoring stats for ${tokenMint} with liquidity: $${currentLiquidity}`);
    } catch (error) {
      console.error('[TokenDataPopulator] Error initializing monitoring stats:', error);
    }
  }

  private async updateProtectedTokenPool(tokenMint: string, walletAddress: string, poolAddress: string): Promise<void> {
    try {
      await supabase
        .from('protected_tokens')
        .update({
          pool_address: poolAddress,
          updated_at: new Date().toISOString()
        })
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress);
    } catch (error) {
      console.error('[TokenDataPopulator] Error updating protected token pool:', error);
    }
  }

  private async fetchFromPumpFunMetadata(tokenMint: string): Promise<any> {
    try {
      const axios = require('axios');
      
      // Use the same RapidAPI key as in PHP
      const response = await axios.get('https://pumpfun-scraper-api.p.rapidapi.com/search_tokens', {
        params: { term: tokenMint },
        headers: {
          'x-rapidapi-host': 'pumpfun-scraper-api.p.rapidapi.com',
          'x-rapidapi-key': '569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22'
        },
        timeout: 5000
      });
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        // Search for exact match
        const tokenData = response.data.data.find((t: any) => 
          t.coinMint === tokenMint || t.mint === tokenMint
        );
        
        if (tokenData) {
          console.log(`[TokenDataPopulator] Found PumpFun metadata for ${tokenMint}: ${tokenData.name}`);
          return {
            symbol: tokenData.ticker || tokenData.symbol || 'UNKNOWN',
            name: tokenData.name || 'Unknown Token',
            image: tokenData.imageUrl || tokenData.image || null,
            imageUrl: tokenData.imageUrl || tokenData.image || null,
            uri: tokenData.imageUrl || null,
            decimals: 6, // pump.fun tokens use 6 decimals
            platform: 'pump.fun'
          };
        }
      }
    } catch (error: any) {
      console.error('[TokenDataPopulator] Error fetching from PumpFun API:', error.message || error);
    }
    return null;
  }

  private async fetchMetadataFromDexScreener(tokenMint: string): Promise<any> {
    try {
      const axios = require('axios');
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PanicSwap/1.0'
        }
      });
      
      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Get the first pair (usually highest liquidity)
        const pair = response.data.pairs[0];
        
        // Check if our token is the base or quote token
        let tokenInfo = null;
        if (pair.baseToken?.address === tokenMint) {
          tokenInfo = pair.baseToken;
        } else if (pair.quoteToken?.address === tokenMint) {
          tokenInfo = pair.quoteToken;
        }
        
        if (tokenInfo && tokenInfo.name && tokenInfo.name !== 'Unknown Token') {
          console.log(`[TokenDataPopulator] Found DexScreener metadata for ${tokenMint}: ${tokenInfo.name}`);
          return {
            symbol: tokenInfo.symbol || 'UNKNOWN',
            name: tokenInfo.name || 'Unknown Token',
            // DexScreener doesn't provide image URLs in token data
            platform: 'dexscreener'
          };
        }
      }
    } catch (error: any) {
      console.error('[TokenDataPopulator] Error fetching metadata from DexScreener:', error.message || error);
    }
    return null;
  }
}

// Export singleton instance
export const tokenDataPopulator = new TokenDataPopulator();