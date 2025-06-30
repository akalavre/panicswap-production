import supabase from '../utils/supabaseClient';
import axios from 'axios';

export class TokenMetadataEnricher {
  private isRunning = false;
  
  /**
   * Fix tokens with "Unknown Token" names by fetching from multiple sources
   */
  async fixUnknownTokens(limit: number = 50): Promise<void> {
    if (this.isRunning) {
      console.log('[TokenMetadataEnricher] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('[TokenMetadataEnricher] Starting to fix unknown tokens...');
      
      // Find tokens with "Unknown Token" name
      const { data: unknownTokens, error } = await supabase
        .from('token_metadata')
        .select('mint, symbol, name, platform')
        .or('name.eq.Unknown Token,name.is.null')
        .limit(limit);

      if (error) {
        console.error('[TokenMetadataEnricher] Error fetching unknown tokens:', error);
        return;
      }

      if (!unknownTokens || unknownTokens.length === 0) {
        console.log('[TokenMetadataEnricher] No unknown tokens found');
        return;
      }

      console.log(`[TokenMetadataEnricher] Found ${unknownTokens.length} tokens to fix`);

      // Process in batches
      const batchSize = 5;
      for (let i = 0; i < unknownTokens.length; i += batchSize) {
        const batch = unknownTokens.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(token => this.enrichTokenMetadata(token.mint))
        );

        // Rate limit between batches
        if (i + batchSize < unknownTokens.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('[TokenMetadataEnricher] Finished fixing unknown tokens');
    } catch (error) {
      console.error('[TokenMetadataEnricher] Error in fixUnknownTokens:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async enrichTokenMetadata(mint: string): Promise<void> {
    try {
      console.log(`[TokenMetadataEnricher] Enriching metadata for ${mint}`);
      
      let metadata: any = null;
      
      // Try PumpFun API first for pump.fun tokens
      if (mint.endsWith('pump')) {
        metadata = await this.fetchFromPumpFun(mint);
      }
      
      // Try DexScreener if no good metadata yet
      if (!metadata || metadata.name === 'Unknown Token') {
        metadata = await this.fetchFromDexScreener(mint);
      }
      
      // Try direct pump.fun API endpoint
      if (!metadata || metadata.name === 'Unknown Token') {
        metadata = await this.fetchFromPumpFunDirect(mint);
      }
      
      // Update database if we found better metadata
      if (metadata && metadata.name && metadata.name !== 'Unknown Token') {
        console.log(`[TokenMetadataEnricher] Found metadata for ${mint}: ${metadata.name}`);
        
        const updateData: any = {
          mint,
          name: metadata.name,
          symbol: metadata.symbol || 'UNKNOWN',
          decimals: metadata.decimals || 9, // Default to 9 if not provided
          updated_at: new Date().toISOString()
        };
        
        if (metadata.imageUrl) {
          updateData.image = metadata.imageUrl; // Column is 'image' not 'image_url'
        }
        
        if (metadata.platform) {
          updateData.platform = metadata.platform;
        }
        
        const { error } = await supabase
          .from('token_metadata')
          .upsert(updateData, { onConflict: 'mint' });
          
        if (error) {
          console.error(`[TokenMetadataEnricher] Error updating metadata for ${mint}:`, error);
        } else {
          console.log(`[TokenMetadataEnricher] Updated metadata for ${mint}`);
        }
      }
    } catch (error) {
      console.error(`[TokenMetadataEnricher] Error enriching ${mint}:`, error);
    }
  }

  private async fetchFromPumpFun(mint: string): Promise<any> {
    try {
      const response = await axios.get('https://pumpfun-scraper-api.p.rapidapi.com/search_tokens', {
        params: { term: mint },
        headers: {
          'x-rapidapi-host': 'pumpfun-scraper-api.p.rapidapi.com',
          'x-rapidapi-key': '569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22'
        },
        timeout: 5000
      });
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        const tokenData = response.data.data.find((t: any) => 
          t.coinMint === mint || t.mint === mint
        );
        
        if (tokenData) {
          return {
            symbol: tokenData.ticker || tokenData.symbol || 'UNKNOWN',
            name: tokenData.name || 'Unknown Token',
            imageUrl: tokenData.imageUrl || null,
            platform: 'pump.fun'
          };
        }
      }
    } catch (error) {
      console.error('[TokenMetadataEnricher] PumpFun API error:', error);
    }
    return null;
  }

  private async fetchFromDexScreener(mint: string): Promise<any> {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        timeout: 5000,
        headers: { 'User-Agent': 'PanicSwap/1.0' }
      });
      
      if (response.data?.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];
        let tokenInfo = null;
        
        if (pair.baseToken?.address === mint) {
          tokenInfo = pair.baseToken;
        } else if (pair.quoteToken?.address === mint) {
          tokenInfo = pair.quoteToken;
        }
        
        if (tokenInfo && tokenInfo.name && tokenInfo.name !== 'Unknown Token') {
          return {
            symbol: tokenInfo.symbol || 'UNKNOWN',
            name: tokenInfo.name || 'Unknown Token',
            platform: 'dexscreener'
          };
        }
      }
    } catch (error) {
      console.error('[TokenMetadataEnricher] DexScreener error:', error);
    }
    return null;
  }

  private async fetchFromPumpFunDirect(mint: string): Promise<any> {
    try {
      const response = await axios.get(`https://frontend-api.pump.fun/coins/${mint}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.data) {
        return {
          symbol: response.data.symbol || 'UNKNOWN',
          name: response.data.name || 'Unknown Token',
          imageUrl: response.data.image_uri || null,
          platform: 'pump.fun'
        };
      }
    } catch (error) {
      // This endpoint might 404 for non-pump.fun tokens
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        console.error('[TokenMetadataEnricher] PumpFun direct API error:', error);
      }
    }
    return null;
  }
}

// Export singleton instance
export const tokenMetadataEnricher = new TokenMetadataEnricher();