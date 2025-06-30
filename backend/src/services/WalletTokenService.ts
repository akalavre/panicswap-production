import { Connection, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import { safeParsePubkey, validatePublicKey } from '../utils/publicKeyUtils';
import supabase from '../utils/supabaseClient';
import config from '../config';
import { RaydiumPoolDiscoveryService } from './RaydiumPoolDiscoveryService';
import { PumpFunPoolDiscoveryService } from './PumpFunPoolDiscoveryService';
import { poolMonitoringService } from './PoolMonitoringService';
import { broadcastService } from './SupabaseBroadcastService';
import { liquidityVelocityTracker } from './LiquidityVelocityTracker';
import { EventEmitter } from 'events';

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
  private eventBus: EventEmitter | null = null;

  constructor(eventBus?: EventEmitter) {
    this.eventBus = eventBus || null;
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
        const walletPubkey = validatePublicKey(walletAddress, 'wallet address');
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          walletPubkey,
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
      const walletPubkeyForSol = safeParsePubkey(walletAddress);
      if (!walletPubkeyForSol) {
        throw new Error('Invalid wallet address');
      }
      const solBalance = await this.connection.getBalance(walletPubkeyForSol);
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
   * Get token metadata from Helius with fallbacks
   */
  private async getTokenMetadata(mint: string): Promise<any> {
    try {
      // First try Helius
      const asset = await this.helius.rpc.getAsset(mint);
      
      let metadata = {
        symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        name: asset.content?.metadata?.name || 'Unknown Token',
        logoUri: asset.content?.links?.image || asset.content?.files?.[0]?.uri
      };
      
      // Add intelligent fallback for name
      if (!metadata.name || metadata.name === 'Unknown Token') {
        if (metadata.symbol && metadata.symbol !== 'UNKNOWN') {
          metadata.name = metadata.symbol;
          console.log(`[WalletTokenService] Using symbol as name: ${metadata.name}`);
        }
      }
      
      // If Helius doesn't have good metadata, try PumpFun API for pump.fun tokens
      if ((metadata.name === 'Unknown Token' || !metadata.name || metadata.name === metadata.symbol) && mint.endsWith('pump')) {
        console.log(`[WalletTokenService] Helius metadata missing for ${mint}, trying PumpFun API`);
        const pumpFunMetadata = await this.fetchFromPumpFunAPI(mint);
        if (pumpFunMetadata && pumpFunMetadata.name && pumpFunMetadata.name !== 'Unknown Token') {
          metadata = {
            symbol: pumpFunMetadata.symbol || metadata.symbol,
            name: pumpFunMetadata.name,
            logoUri: pumpFunMetadata.imageUrl || metadata.logoUri
          };
        }
      }
      
      // If still no good metadata, try DexScreener
      if (metadata.name === 'Unknown Token' || !metadata.name || metadata.name === metadata.symbol) {
        console.log(`[WalletTokenService] Trying DexScreener for metadata ${mint}`);
        const dexScreenerMetadata = await this.fetchFromDexScreenerAPI(mint);
        if (dexScreenerMetadata && dexScreenerMetadata.name && dexScreenerMetadata.name !== 'Unknown Token') {
          metadata = {
            symbol: dexScreenerMetadata.symbol || metadata.symbol,
            name: dexScreenerMetadata.name,
            logoUri: metadata.logoUri // DexScreener doesn't provide images
          };
        }
      }
      
      return metadata;
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching metadata for ${mint}:`, error);
      return {};
    }
  }

  private async fetchFromPumpFunAPI(mint: string): Promise<any> {
    try {
      const axios = require('axios');
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
            symbol: tokenData.ticker || tokenData.symbol,
            name: tokenData.name,
            imageUrl: tokenData.imageUrl
          };
        }
      }
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching from PumpFun:`, error);
    }
    return null;
  }

  private async fetchFromDexScreenerAPI(mint: string): Promise<any> {
    try {
      const axios = require('axios');
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
        
        if (tokenInfo) {
          return {
            symbol: tokenInfo.symbol,
            name: tokenInfo.name
          };
        }
      }
    } catch (error) {
      console.error(`[WalletTokenService] Error fetching from DexScreener:`, error);
    }
    return null;
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

      // Save wallet tokens - only use columns that exist in the table
      const walletTokensData = tokens.map(token => ({
        wallet_address: walletAddress,
        token_mint: token.mint,
        balance: token.balance.toString(),
        decimals: token.decimals,
        is_test_token: false,
        last_seen_at: new Date().toISOString()
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
      
      // Check for tokens that need ML analysis
      await this.triggerMLAnalysisForNewTokens(tokens);
    } catch (error) {
      console.error('[WalletTokenService] Error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Trigger ML analysis for tokens that don't have it yet
   */
  private async triggerMLAnalysisForNewTokens(tokens: EnrichedToken[]) {
    try {
      // Get token mints
      const tokenMints = tokens.map(t => t.mint);
      
      // Check which tokens already have ML analysis
      const { data: existingML } = await supabase
        .from('ml_risk_analysis')
        .select('token_mint')
        .in('token_mint', tokenMints);
      
      const existingMints = new Set(existingML?.map(m => m.token_mint) || []);
      const newTokenMints = tokenMints.filter(mint => !existingMints.has(mint));
      
      if (newTokenMints.length > 0) {
        console.log(`[WalletTokenService] Found ${newTokenMints.length} tokens without ML analysis`);
        
        // Emit event for ML generation if eventBus is available
        if (this.eventBus) {
          this.eventBus.emit('new-tokens-discovered', {
            tokenMints: newTokenMints,
            source: 'wallet_sync'
          });
        }
        
        // Also insert placeholder entries to ensure they get picked up
        const placeholderData = newTokenMints.map(mint => ({
          token_mint: mint,
          needs_ml_generation: true,
          created_at: new Date().toISOString()
        }));
        
        await supabase
          .from('ml_generation_queue')
          .upsert(placeholderData, { onConflict: 'token_mint' });
      }
    } catch (error) {
      console.error('[WalletTokenService] Error triggering ML analysis:', error);
      // Don't throw - this shouldn't break the sync process
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
        
        // Also start velocity tracking for enhanced detection
        await liquidityVelocityTracker.trackToken(token.mint);
        console.log(`[WalletTokenService] Started velocity tracking for ${token.symbol}`);
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
      .order('balance', { ascending: false });

    if (!walletTokens) return [];

    return walletTokens.map(wt => ({
      mint: wt.token_mint,
      symbol: wt.token_metadata.symbol,
      name: wt.token_metadata.name,
      decimals: wt.decimals || wt.token_metadata.decimals || 9,
      balance: parseFloat(wt.balance),
      uiBalance: parseFloat(wt.balance) / Math.pow(10, wt.decimals || wt.token_metadata.decimals || 9),
      logoUri: wt.token_metadata.logo_uri,
      price: undefined, // Price data would need to come from elsewhere
      value: undefined, // Value would need to be calculated
      platform: wt.token_metadata.platform
    }));
  }
}

// Export factory function instead of singleton to allow event bus injection
export function createWalletTokenService(eventBus?: EventEmitter) {
  return new WalletTokenService(eventBus);
}

// Export singleton for backward compatibility
export const walletTokenService = new WalletTokenService();