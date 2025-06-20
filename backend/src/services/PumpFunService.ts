import axios from 'axios';

interface PumpFunTokenData {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website: string;
  show_name: boolean;
  king_of_the_hill_timestamp: number | null;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string | null;
  inverted: boolean | null;
  is_currently_live: boolean;
  username: string;
  profile_image: string;
  usd_market_cap: number;
}

export class PumpFunService {
  private baseUrl = 'https://frontend-api.pump.fun';

  /**
   * Fetch token data from pump.fun API
   * @param tokenAddress The token mint address
   * @returns Token data or null if not found
   */
  async getTokenData(tokenAddress: string): Promise<PumpFunTokenData | null> {
    try {
      console.log(`🎰 Fetching data from pump.fun for token: ${tokenAddress}`);
      
      const response = await axios.get(
        `${this.baseUrl}/coins/${tokenAddress}`,
        {
          headers: {
            'accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 5000
        }
      );

      if (response.data) {
        console.log(`✅ Pump.fun data fetched:`, {
          name: response.data.name,
          symbol: response.data.symbol,
          complete: response.data.complete,
          market_cap: response.data.usd_market_cap
        });

        return response.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Token ${tokenAddress} not found on pump.fun`);
      } else {
        console.error('Error fetching data from pump.fun:', error.message);
      }
      return null;
    }
  }

  /**
   * Get simplified metadata for a token
   */
  async getTokenMetadata(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    logo: string;
  } | null> {
    const data = await this.getTokenData(tokenAddress);
    
    if (!data) return null;
    
    return {
      name: data.name,
      symbol: data.symbol,
      decimals: 6, // Pump.fun tokens use 6 decimals
      logo: data.image_uri
    };
  }
}

// Export singleton instance
export const pumpFunService = new PumpFunService();