import { Connection, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import supabase from '../utils/supabaseClient';
import config from '../config';
import { RaydiumPoolDiscoveryService } from './RaydiumPoolDiscoveryService';
import { PumpFunPoolDiscoveryService } from './PumpFunPoolDiscoveryService';
import { poolMonitoringService } from './PoolMonitoringService';
import { broadcastService } from './SupabaseBroadcastService';

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

interface EnrichedToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  uiBalance: number;
  logoUri?: string;
  price?: number;
  value?: number;
  poolAddress?: string;
  liquidity?: {
    usd: number;
    sol: number;
    baseReserve: number;
    quoteReserve: number;
    lastChecked: Date;
  };
  platform?: 'raydium' | 'pump.fun' | 'unknown';
}

export class WalletTokenService {
  private helius: Helius;
  private connection: Connection;
  private raydiumService: RaydiumPoolDiscoveryService;
  private pumpFunService: PumpFunPoolDiscoveryService;

  constructor() {
    if (!config.heliusRpcUrl || !config.heliusApiKey) {
      throw new Error('Helius RPC URL and API key are required');
    }
    this.connection = new Connection(config.heliusRpcUrl);
    this.helius = new Helius(config.heliusApiKey);
    this.raydiumService = new RaydiumPoolDiscoveryService();
    this.pumpFunService = new PumpFunPoolDiscoveryService();
  }

  /**
   * Sync all tokens from a wallet with enriched metadata and liquidity
   */
  async syncWallet(walletAddress: string): Promise<EnrichedToken[]> {
    console.log(`[WalletTokenService] Starting sync for wallet: ${walletAddress}`);
    
    try {
      // 1. Fetch token balances from wallet
      const tokens = await this.getWalletTokens(walletAddress);
      console.log(`[WalletTokenService] Found ${tokens.length} tokens in wallet`);

      // 2. Enrich tokens with metadata and liquidity
      const enrichedTokens = await this.enrichTokens(tokens, walletAddress);
      console.log(`[WalletTokenService] Enriched ${enrichedTokens.length} tokens`);

      // 3. Save to database
      await this.saveUserTokens(walletAddress, enrichedTokens);

      // 4. Setup monitoring for tokens with liquidity
      await this.setupMonitoring(walletAddress, enrichedTokens);

      // 5. Mark wallet as synced
      await this.markWalletSynced(walletAddress, enrichedTokens.length);

      return enrichedTokens;
    } catch (error) {
      console.error('[WalletTokenService] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get all SPL tokens from a wallet
   */
  private async getWalletTokens(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const tokens: TokenBalance[] = [];
      
      // Method 1: Try standard Solana RPC method first
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      
      try {
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          new PublicKey(walletAddress),
          { programId: TOKEN_PROGRAM_ID }
        );
        
        for (const account of tokenAccounts.value) {
          const accountData = account.account.data.parsed.info;
          const balance = accountData.tokenAmount.uiAmount;
          if (balance > 0) {
            tokens.push({
              mint: accountData.mint,
              amount: parseInt(accountData.tokenAmount.amount),
              decimals: accountData.tokenAmount.decimals,
              uiAmount: balance
            });
          }
        }
      } catch (rpcError) {
        console.log('[WalletTokenService] Standard RPC failed, trying Helius DAS API...');
        
        // Method 2: Fallback to Helius DAS API
        const response = await this.helius.rpc.getAssetsByOwner({
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: true
          }
        });

        // Process fungible tokens from DAS API
        if (response.items && response.items.length > 0) {
          for (const asset of response.items) {
            if (asset.interface === 'FungibleToken' || asset.interface === 'FungibleAsset') {
              const tokenBalance = asset.token_info;
              if (tokenBalance && tokenBalance.balance && tokenBalance.balance > 0) {
                const balance = tokenBalance.balance;
                const decimals = tokenBalance.decimals || 9;
                tokens.push({
                  mint: asset.id,
                  amount: balance,
                  decimals: decimals,
                  uiAmount: balance / Math.pow(10, decimals)
                });
              }
            }
          }
        }
      }

      // Always include SOL
      const solBalance = await this.connection.getBalance(new PublicKey(walletAddress));
      if (solBalance > 0) {
        tokens.push({
          mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
          amount: solBalance,
          decimals: 9,
          uiAmount: solBalance / 1e9
        });
      }

      return tokens;
    } catch (error) {
      console.error('[WalletTokenService] Error fetching wallet tokens:', error);
      throw error;
    }
  }

  /**
   * Enrich tokens with metadata and liquidity data
   */
  private async enrichTokens(tokens: TokenBalance[], walletAddress: string): Promise<EnrichedToken[]> {
    const enrichmentPromises = tokens.map(async (token) => {
      try {
        // Get metadata from Helius
        const metadata = await this.getTokenMetadata(token.mint);
        
        // Get liquidity data
        const liquidityData = await this.getTokenLiquidity(token.mint);
        
        // Get current price
        const price = await this.getTokenPrice(token.mint);

        const enriched: EnrichedToken = {
          mint: token.mint,
          symbol: metadata.symbol || 'UNKNOWN',
          name: metadata.name || 'Unknown Token',
          decimals: token.decimals,
          balance: token.amount,
          uiBalance: token.uiAmount,
          logoUri: metadata.logoUri,
          price: price,
          value: price ? price * token.uiAmount : undefined,
          poolAddress: liquidityData?.poolAddress,
          liquidity: liquidityData?.liquidity,
          platform: liquidityData?.platform || 'unknown'
        };

        return enriched;
      } catch (error) {
        console.error(`[WalletTokenService] Error enriching token ${token.mint}:`, error);
        
        // Return basic info even if enrichment fails
        return {
          mint: token.mint,
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          decimals: token.decimals,
          balance: token.amount,
          uiBalance: token.uiAmount,
          platform: 'unknown' as const
        };
      }
    });

    const enrichedTokens = await Promise.all(enrichmentPromises);
    
    // Filter out tokens with very low value
    return enrichedTokens.filter(token => {
      // Keep all tokens worth > $1 or without price data
      return !token.value || token.value > 1;
    });
  }

  /**
   * Get token metadata from Helius
   */
  private async getTokenMetadata(mint: string): Promise<any> {
    try {
      const asset = await this.helius.rpc.getAsset(mint);
      
      return {
        symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        name: asset.content?.metadata?.name || 'Unknown Token',
        logoUri: asset.content?.links?.image || asset.content?.files?.[0]?.uri
      };
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching metadata for ${mint}:`, error);
      return {};
    }
  }

  /**
   * Get token liquidity data from DEX pools
   */
  private async getTokenLiquidity(mint: string): Promise<{
    poolAddress: string;
    liquidity: EnrichedToken['liquidity'];
    platform: 'raydium' | 'pump.fun';
  } | null> {
    try {
      // Check Raydium first
      const raydiumPool = await this.raydiumService.findPoolForToken(mint);
      if (raydiumPool) {
        return {
          poolAddress: raydiumPool.poolAddress,
          liquidity: {
            usd: raydiumPool.liquidity.usd,
            sol: raydiumPool.liquidity.sol,
            baseReserve: raydiumPool.liquidity.baseReserve,
            quoteReserve: raydiumPool.liquidity.quoteReserve,
            lastChecked: new Date()
          },
          platform: 'raydium'
        };
      }

      // Check Pump.fun
      const pumpFunPool = await this.pumpFunService.findPoolForToken(mint);
      if (pumpFunPool) {
        return {
          poolAddress: pumpFunPool.poolAddress,
          liquidity: {
            usd: pumpFunPool.liquidity.usd,
            sol: pumpFunPool.liquidity.sol,
            baseReserve: pumpFunPool.liquidity.baseReserve,
            quoteReserve: pumpFunPool.liquidity.quoteReserve,
            lastChecked: new Date()
          },
          platform: 'pump.fun'
        };
      }

      return null;
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching liquidity for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Get token price from Jupiter
   */
  private async getTokenPrice(mint: string): Promise<number | undefined> {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`);
      const data = await response.json();
      return data.data[mint]?.price;
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching price for ${mint}:`, error);
      return undefined;
    }
  }

  /**
   * Save enriched tokens to database
   */
  private async saveUserTokens(walletAddress: string, tokens: EnrichedToken[]) {
    try {
      // Upsert token metadata
      const tokenMetadataPromises = tokens.map(token => 
        supabase
          .from('token_metadata')
          .upsert({
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logo_uri: token.logoUri,
            platform: token.platform,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'mint' })
      );

      // Save wallet tokens
      const walletTokensData = tokens.map(token => ({
        wallet_address: walletAddress,
        token_mint: token.mint,
        balance: token.balance.toString(),
        ui_balance: token.uiBalance,
        value_usd: token.value,
        last_synced_at: new Date().toISOString()
      }));

      const walletTokensPromise = supabase
        .from('wallet_tokens')
        .upsert(walletTokensData, { 
          onConflict: 'wallet_address,token_mint' 
        });

      // Save liquidity data
      const liquidityPromises = tokens
        .filter(token => token.liquidity && token.poolAddress)
        .map(token => 
          supabase
            .from('liquidity_monitoring')
            .upsert({
              pool_address: token.poolAddress,
              token_mint: token.mint,
              baseline_liquidity_usd: token.liquidity!.usd,
              baseline_liquidity_sol: token.liquidity!.sol,
              current_liquidity_usd: token.liquidity!.usd,
              current_liquidity_sol: token.liquidity!.sol,
              monitoring_active: false, // Will be activated when protection is enabled
              last_update: new Date().toISOString()
            }, { onConflict: 'pool_address' })
        );

      // Execute all database operations
      await Promise.all([
        ...tokenMetadataPromises,
        walletTokensPromise,
        ...liquidityPromises
      ]);

      console.log(`[WalletTokenService] Saved ${tokens.length} tokens to database`);
    } catch (error) {
      console.error('[WalletTokenService] Error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Setup monitoring for tokens with liquidity pools
   */
  private async setupMonitoring(walletAddress: string, tokens: EnrichedToken[]) {
    const tokensWithPools = tokens.filter(t => t.poolAddress && t.liquidity);
    
    for (const token of tokensWithPools) {
      // Check if protection is enabled for this token
      const { data: protection } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', token.mint)
        .eq('is_active', true)
        .single();

      if (protection) {
        // Start monitoring if protection is active
        console.log(`[WalletTokenService] Setting up monitoring for ${token.symbol}`);
        await poolMonitoringService.protectTokenWithPool(
          token.mint,
          walletAddress,
          token.poolAddress!
        );
      }
    }
  }

  /**
   * Mark wallet as synced
   */
  private async markWalletSynced(walletAddress: string, tokenCount: number) {
    await supabase
      .from('wallet_sync_history')
      .insert({
        wallet_address: walletAddress,
        tokens_found: tokenCount,
        sync_status: 'completed',
        synced_at: new Date().toISOString()
      });
  }

  /**
   * Get user's tokens from database
   */
  async getUserTokens(walletAddress: string): Promise<EnrichedToken[]> {
    const { data: walletTokens } = await supabase
      .from('wallet_tokens')
      .select(`
        *,
        token_metadata!inner(*)
      `)
      .eq('wallet_address', walletAddress)
      .order('value_usd', { ascending: false });

    if (!walletTokens) return [];

    return walletTokens.map(wt => ({
      mint: wt.token_mint,
      symbol: wt.token_metadata.symbol,
      name: wt.token_metadata.name,
      decimals: wt.token_metadata.decimals,
      balance: parseFloat(wt.balance),
      uiBalance: wt.ui_balance,
      logoUri: wt.token_metadata.logo_uri,
      price: wt.value_usd ? wt.value_usd / wt.ui_balance : undefined,
      value: wt.value_usd,
      platform: wt.token_metadata.platform
    }));
  }
}

// Export singleton instance
export const walletTokenService = new WalletTokenService();