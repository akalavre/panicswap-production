import config from '../config';

interface TokenAccount {
  owner: string;
  amount: string;
  token_account: string;
}

interface HeliusTokenAccountsResponse {
  total: number;
  limit: number;
  page: number;
  token_accounts: TokenAccount[];
}

export class HeliusTokenHolderService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.apiKey = config.heliusApiKey || '';
    
    // Use the base URL without API key for manual construction
    if (config.heliusRpcUrl && config.heliusRpcUrl.includes('api-key=')) {
      // Extract base URL from the full RPC URL
      this.baseUrl = config.heliusRpcUrl.split('?')[0];
    } else {
      this.baseUrl = 'https://mainnet.helius-rpc.com';
    }
    
    if (!this.apiKey) {
      console.warn('HeliusTokenHolderService: No API key provided');
    }
    
    console.log(`HeliusTokenHolderService: Using base URL: ${this.baseUrl}, API key: ${this.apiKey ? 'configured' : 'missing'}`);
  }

  /**
   * Get the total number of unique holders for a token
   * @param tokenMint - The token mint address
   * @param maxPages - Maximum number of pages to fetch (default: 50 for performance)
   */
  async getTokenHolderCount(tokenMint: string, maxPages: number = 50): Promise<number> {
    try {
      const allOwners = new Set<string>();
      let page = 1;
      const limit = 1000;

      console.log(`Getting holder count for ${tokenMint} (max ${maxPages} pages = ~${maxPages * limit} accounts)`);

      while (page <= maxPages) {
        const response = await this.fetchTokenAccounts(tokenMint, page, limit);
        
        if (!response || !response.token_accounts || response.token_accounts.length === 0) {
          break;
        }

        // Add unique owners to the set
        response.token_accounts.forEach((account) => {
          if (account.owner && account.amount !== "0") {
            allOwners.add(account.owner);
          }
        });

        // Check if we've reached the end
        if (response.token_accounts.length < limit) {
          console.log(`Reached end of token accounts at page ${page}`);
          break;
        }

        page++;
      }

      const holderCount = allOwners.size;
      
      if (page > maxPages) {
        console.log(`Found ${holderCount}+ unique holders for token ${tokenMint} (stopped at ${maxPages} pages limit)`);
      } else {
        console.log(`Found ${holderCount} unique holders for token ${tokenMint} (complete count)`);
      }
      
      return holderCount;
    } catch (error) {
      console.error(`Error getting holder count for token ${tokenMint}:`, error);
      return 0;
    }
  }

  /**
   * Fetch token accounts from Helius API
   */
  private async fetchTokenAccounts(
    tokenMint: string, 
    page: number = 1, 
    limit: number = 1000
  ): Promise<HeliusTokenAccountsResponse | null> {
    try {
      const url = `${this.baseUrl}/?api-key=${this.apiKey}`;
      
      const requestBody = {
        jsonrpc: '2.0',
        method: 'getTokenAccounts',
        id: 'helius-holder-count',
        params: {
          page: page, // Keep as integer
          limit: limit, // Keep as integer
          displayOptions: {},
          mint: tokenMint,
        },
      };
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Helius API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.error) {
        console.error(`Helius API error:`, data.error);
        return null;
      }

      return data.result;
    } catch (error) {
      console.error(`Error fetching token accounts from Helius:`, error);
      return null;
    }
  }

  /**
   * Get detailed holder information (top holders, etc.)
   */
  async getDetailedHolderInfo(tokenMint: string, maxPages: number = 5) {
    try {
      const holders: Array<{ owner: string; amount: string; percentage?: number }> = [];
      let totalSupply = 0;
      let page = 1;

      // First, get token accounts to calculate holder distribution
      while (page <= maxPages) {
        const response = await this.fetchTokenAccounts(tokenMint, page, 1000); // fetchTokenAccounts handles conversion
        
        if (!response || !response.token_accounts || response.token_accounts.length === 0) {
          break;
        }

        response.token_accounts.forEach((account) => {
          if (account.amount !== "0") {
            const amount = parseFloat(account.amount);
            totalSupply += amount;
            holders.push({
              owner: account.owner,
              amount: account.amount
            });
          }
        });

        if (response.token_accounts.length < 1000) {
          break;
        }

        page++;
      }

      // Calculate percentages
      holders.forEach(holder => {
        const amount = parseFloat(holder.amount);
        holder.percentage = (amount / totalSupply) * 100;
      });

      // Sort by amount (descending)
      holders.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

      return {
        totalHolders: holders.length,
        totalSupply,
        topHolders: holders.slice(0, 20), // Top 20 holders
        holderDistribution: this.analyzeHolderDistribution(holders)
      };
    } catch (error) {
      console.error(`Error getting detailed holder info for token ${tokenMint}:`, error);
      return null;
    }
  }

  /**
   * Analyze holder distribution to identify concentration risk
   */
  private analyzeHolderDistribution(holders: Array<{ owner: string; amount: string; percentage?: number }>) {
    const top1 = holders.slice(0, 1).reduce((sum, h) => sum + (h.percentage || 0), 0);
    const top5 = holders.slice(0, 5).reduce((sum, h) => sum + (h.percentage || 0), 0);
    const top10 = holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0);
    const top20 = holders.slice(0, 20).reduce((sum, h) => sum + (h.percentage || 0), 0);

    return {
      top1Percentage: top1,
      top5Percentage: top5,
      top10Percentage: top10,
      top20Percentage: top20,
      concentrationRisk: top10 > 50 ? 'HIGH' : top10 > 30 ? 'MEDIUM' : 'LOW'
    };
  }
}

// Export singleton instance
export const heliusTokenHolderService = new HeliusTokenHolderService();