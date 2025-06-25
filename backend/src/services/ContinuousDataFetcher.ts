import supabase from '../utils/supabaseClient';
import { priceDiscoveryService } from './PriceDiscoveryService';
import { tokenDataPopulator } from './TokenDataPopulator';
import axios from 'axios';

export class ContinuousDataFetcher {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private FETCH_INTERVAL = 30000; // 30 seconds
  private batchSize = 10; // Process 10 tokens at a time

  constructor() {
    console.log('[ContinuousDataFetcher] Initialized');
  }

  async start() {
    if (this.isRunning) {
      console.log('[ContinuousDataFetcher] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[ContinuousDataFetcher] Starting continuous data fetching...');

    // Initial fetch
    await this.fetchDataForActiveTokens();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.fetchDataForActiveTokens();
    }, this.FETCH_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[ContinuousDataFetcher] Stopped');
  }

  private async fetchDataForActiveTokens() {
    try {
      // Get all active protected tokens
      const { data: protectedTokens, error } = await supabase
        .from('protected_tokens')
        .select('token_mint, wallet_address')
        .eq('is_active', true)
        .eq('monitoring_active', true);

      if (error) {
        console.error('[ContinuousDataFetcher] Error fetching protected tokens:', error);
        return;
      }

      if (!protectedTokens || protectedTokens.length === 0) {
        console.log('[ContinuousDataFetcher] No active protected tokens to fetch data for');
        return;
      }

      console.log(`[ContinuousDataFetcher] Fetching data for ${protectedTokens.length} active tokens`);

      // Get unique token mints
      const uniqueMints = [...new Set(protectedTokens.map(t => t.token_mint))];

      // Process in batches
      for (let i = 0; i < uniqueMints.length; i += this.batchSize) {
        const batch = uniqueMints.slice(i, i + this.batchSize);
        
        await Promise.all(batch.map(async (tokenMint) => {
          try {
            await this.fetchTokenData(tokenMint);
          } catch (error) {
            console.error(`[ContinuousDataFetcher] Error fetching data for ${tokenMint}:`, error);
          }
        }));

        // Small delay between batches to avoid rate limits
        if (i + this.batchSize < uniqueMints.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('[ContinuousDataFetcher] Data fetch cycle completed');
    } catch (error) {
      console.error('[ContinuousDataFetcher] Error in fetch cycle:', error);
    }
  }

  private async fetchTokenData(tokenMint: string) {
    try {
      console.log(`[ContinuousDataFetcher] Fetching data for ${tokenMint}`);

      // Fetch data from multiple sources in parallel
      const [dexScreenerData, jupiterData] = await Promise.allSettled([
        this.fetchFromDexScreener(tokenMint),
        this.fetchFromJupiter(tokenMint)
      ]);

      let bestData = {
        price: 0,
        liquidity: 0,
        volume24h: 0,
        change24h: 0,
        marketCap: 0,
        holders: 0,
        source: 'none'
      };

      // Merge data from successful sources
      if (dexScreenerData.status === 'fulfilled' && dexScreenerData.value) {
        const data = dexScreenerData.value;
        if (data.price > 0) bestData.price = data.price;
        if (data.liquidity > 0) bestData.liquidity = data.liquidity;
        if (data.volume24h > 0) bestData.volume24h = data.volume24h;
        if (data.change24h !== 0) bestData.change24h = data.change24h;
        if (data.marketCap > 0) bestData.marketCap = data.marketCap;
        bestData.source = 'dexscreener';
      }

      if (jupiterData.status === 'fulfilled' && jupiterData.value) {
        const data = jupiterData.value;
        if (data.price > 0 && bestData.price === 0) {
          bestData.price = data.price;
          if (bestData.source === 'none') bestData.source = 'jupiter';
        }
      }

      // Update database if we got any data
      if (bestData.price > 0 || bestData.liquidity > 0) {
        // Update token_prices
        await supabase
          .from('token_prices')
          .upsert({
            token_mint: tokenMint,
            price: bestData.price,
            price_usd: bestData.price,
            liquidity: bestData.liquidity,
            volume_24h: bestData.volume24h,
            change_24h: bestData.change24h,
            market_cap: bestData.marketCap,
            holders: bestData.holders,
            platform: bestData.source,
            updated_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });

        // Add to price history for velocity calculations
        if (bestData.price > 0) {
          await supabase
            .from('token_price_history')
            .insert({
              token_mint: tokenMint,
              price: bestData.price,
              liquidity: bestData.liquidity,
              volume_24h: bestData.volume24h,
              market_cap: bestData.marketCap,
              recorded_at: new Date().toISOString(),
              source: 'continuous_fetcher'
            });
        }

        // Update liquidity data if available
        if (bestData.liquidity > 0) {
          await supabase
            .from('liquidity_velocity')
            .upsert({
              token_mint: tokenMint,
              liquidity_usd: bestData.liquidity,
              volume_24h: bestData.volume24h,
              timestamp: new Date().toISOString()
            }, {
              onConflict: 'token_mint,timestamp',
              ignoreDuplicates: false
            });
        }

        console.log(`[ContinuousDataFetcher] Updated data for ${tokenMint}: Price: $${bestData.price}, Liquidity: $${bestData.liquidity}`);
      }
    } catch (error) {
      console.error(`[ContinuousDataFetcher] Error fetching data for ${tokenMint}:`, error);
    }
  }

  private async fetchFromDexScreener(tokenMint: string): Promise<any> {
    try {
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

        return {
          price: parseFloat(bestPair.priceUsd) || 0,
          // Handle missing liquidity - use marketCap as fallback
          liquidity: parseFloat(bestPair.liquidity?.usd || bestPair.marketCap || bestPair.fdv || '0'),
          volume24h: parseFloat(bestPair.volume?.h24 || '0'),
          change24h: parseFloat(bestPair.priceChange?.h24 || '0'),
          marketCap: parseFloat(bestPair.fdv || bestPair.marketCap || '0'),
          source: 'dexscreener'
        };
      }
    } catch (error: any) {
      if (!error.message?.includes('429')) {
        console.error(`[ContinuousDataFetcher] DexScreener error for ${tokenMint}:`, error.message);
      }
    }
    return null;
  }

  private async fetchFromJupiter(tokenMint: string): Promise<any> {
    try {
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PanicSwap/1.0'
        }
      });

      if (response.data?.data?.[tokenMint]) {
        return {
          price: response.data.data[tokenMint].price || 0,
          source: 'jupiter'
        };
      }
    } catch (error: any) {
      if (!error.message?.includes('429')) {
        console.error(`[ContinuousDataFetcher] Jupiter error for ${tokenMint}:`, error.message);
      }
    }
    return null;
  }
}

// Export singleton instance
export const continuousDataFetcher = new ContinuousDataFetcher();