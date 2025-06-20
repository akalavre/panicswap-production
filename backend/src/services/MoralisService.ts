import axios from 'axios';

interface MoralisTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export class MoralisService {
  private apiKey: string;
  private baseUrl = 'https://solana-gateway.moralis.io';

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Moralis API key not found in environment variables');
    }
  }

  /**
   * Fetch token metadata from Moralis
   * @param tokenAddress The token mint address
   * @returns Token metadata or null if not found
   */
  async getTokenMetadata(tokenAddress: string): Promise<MoralisTokenMetadata | null> {
    if (!this.apiKey) {
      console.error('Moralis API key not configured');
      return null;
    }

    try {
      console.log(`📊 Fetching metadata from Moralis for token: ${tokenAddress}`);
      
      const response = await axios.get(
        `${this.baseUrl}/token/${tokenAddress}/metadata`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'accept': 'application/json'
          }
        }
      );

      if (response.data) {
        const metadata: MoralisTokenMetadata = {
          name: response.data.name || 'Unknown Token',
          symbol: response.data.symbol || 'UNKNOWN',
          decimals: response.data.decimals || 9,
          logo: response.data.logo || undefined
        };

        console.log(`✅ Moralis metadata fetched:`, {
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals
        });

        return metadata;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Token ${tokenAddress} not found in Moralis`);
      } else {
        console.error('Error fetching metadata from Moralis:', error.message);
      }
      return null;
    }
  }

  /**
   * Validate if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const moralisService = new MoralisService();