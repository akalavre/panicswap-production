import { Router, Request, Response } from 'express';
import supabase from '../utils/supabaseClient';
import { RaydiumPoolDiscoveryService } from '../services/RaydiumPoolDiscoveryService';
import { PumpFunPoolDiscoveryService } from '../services/PumpFunPoolDiscoveryService';
import { walletTokenService } from '../services/WalletTokenService';
import { pumpFunRugDetector } from '../services/PumpFunRugDetector';
// Price polling service removed - prices now updated on-demand
import { Connection } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { safeParsePubkey, validatePublicKey } from '../utils/publicKeyUtils';
import { helius } from '../utils/heliusClient';

const router = Router();

// Initialize services
const raydiumPoolDiscoveryService = new RaydiumPoolDiscoveryService();
const pumpFunPoolDiscoveryService = new PumpFunPoolDiscoveryService();

// Get real token data with liquidity pools for test tokens
router.post('/api/tokens/enrich-test', async (req: Request, res: Response) => {
  try {
    const { mint } = req.body;
    
    if (!mint) {
      return res.status(400).json({ error: 'Token mint required' });
    }

    console.log(`[TestToken] Fetching real data for token ${mint}`);

    // 1. Use Helius getAsset to get comprehensive token data
    let heliusAssetData: any = null;
    let tokenMetadata: any = null;
    let heliusPrice: number | null = null;
    
    try {
      console.log(`[TestToken] Calling Helius getAsset for ${mint}`);
      const asset = await helius.rpc.getAsset({ 
        id: mint
      });
      
      heliusAssetData = asset;
      console.log(`[TestToken] Helius asset data:`, JSON.stringify(asset, null, 2));
      
      // Extract price from Helius response
      if (asset?.token_info?.price_info) {
        heliusPrice = asset.token_info.price_info.price_per_token || null;
        console.log(`[TestToken] Helius price for ${mint}: $${heliusPrice}`);
      }
      
      // Extract metadata from Helius response
      if (asset) {
        tokenMetadata = {
          decimals: asset.token_info?.decimals || 9,
          supply: asset.token_info?.supply || '0',
          symbol: asset.token_info?.symbol || asset.content?.metadata?.symbol || 'UNKNOWN',
          name: asset.content?.metadata?.name || 'Unknown Token',
          description: asset.content?.metadata?.description || '',
          logoUri: asset.content?.links?.image || asset.content?.files?.[0]?.uri || null,
          // Additional Helius data
          price_info: asset.token_info?.price_info || null,
          associated_token_address: asset.token_info?.associated_token_address || null,
          token_program: asset.token_info?.token_program || null,
        };
        
        // If Helius doesn't have symbol/name, try getting from on-chain
        if (tokenMetadata.symbol === 'UNKNOWN' || !tokenMetadata.symbol) {
          const rpcUrl = process.env.HELIUS_RPC_URL || '';
          const connection = new Connection(rpcUrl);
          const mintPubkey = validatePublicKey(mint, 'mint address');
          const tokenInfo = await connection.getParsedAccountInfo(mintPubkey);
          
          if (tokenInfo.value && 'parsed' in tokenInfo.value.data) {
            const parsed = tokenInfo.value.data.parsed;
            tokenMetadata.decimals = parsed.info.decimals;
            tokenMetadata.supply = parsed.info.supply;
          }
        }
      }
    } catch (error) {
      console.error('[TestToken] Error fetching from Helius getAsset:', error);
      
      // Fallback to basic RPC call
      try {
        const rpcUrl = process.env.HELIUS_RPC_URL || '';
        const connection = new Connection(rpcUrl);
        const mintPubkey = validatePublicKey(mint, 'mint address');
        const tokenInfo = await connection.getParsedAccountInfo(mintPubkey);
        
        if (tokenInfo.value && 'parsed' in tokenInfo.value.data) {
          const parsed = tokenInfo.value.data.parsed;
          tokenMetadata = {
            decimals: parsed.info.decimals,
            supply: parsed.info.supply,
            symbol: 'UNKNOWN',
            name: 'Unknown Token'
          };
        }
      } catch (fallbackError) {
        console.error('[TestToken] Fallback RPC also failed:', fallbackError);
      }
    }

    // 2. Store/update token metadata in database
    if (tokenMetadata && heliusAssetData) {
      try {
        // Prepare metadata for database
        const dbMetadata = {
          mint,
          symbol: tokenMetadata.symbol,
          name: tokenMetadata.name,
          decimals: tokenMetadata.decimals,
          logo_uri: tokenMetadata.logoUri,
          description: tokenMetadata.description,
          // Store key Helius data in existing columns
          website: heliusAssetData?.content?.links?.external_url || null,
          twitter: heliusAssetData?.content?.links?.twitter || null,
          telegram: heliusAssetData?.content?.links?.telegram || null,
          discord: heliusAssetData?.content?.links?.discord || null,
          // Store full Helius data as JSONB (if column exists)
          helius_data: heliusAssetData,
          is_active: true, // Mark as active since it's being added to a wallet
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: upsertedMetadata, error } = await supabase
          .from('token_metadata')
          .upsert(dbMetadata, {
            onConflict: 'mint'
          })
          .select()
          .single();

        if (error) {
          // If helius_data column doesn't exist, retry without it
          if (error.message.includes('helius_data')) {
            delete dbMetadata.helius_data;
            const { data: retryMetadata } = await supabase
              .from('token_metadata')
              .upsert(dbMetadata, {
                onConflict: 'mint'
              })
              .select()
              .single();
            if (retryMetadata) {
              tokenMetadata = { ...tokenMetadata, ...retryMetadata };
            }
          } else {
            console.error('[TestToken] Error upserting metadata:', error);
          }
        } else if (upsertedMetadata) {
          tokenMetadata = { ...tokenMetadata, ...upsertedMetadata };
          console.log('[TestToken] Stored token metadata in database');
        }
      } catch (error) {
        console.error('[TestToken] Error storing metadata in database:', error);
      }
    }

    // 3. Get metadata from database if we didn't just store it
    if (!heliusAssetData) {
      try {
        const { data: existingMetadata } = await supabase
          .from('token_metadata')
          .select('*')
          .eq('mint', mint)
          .single();

        if (existingMetadata) {
          tokenMetadata = { ...tokenMetadata, ...existingMetadata };
        }
      } catch (error) {
        console.error('[TestToken] Error fetching metadata from database:', error);
      }
    }

    // 4. Check if it's a pump.fun token and get advanced analytics
    let pumpFunAnalysis = null;
    try {
      pumpFunAnalysis = await pumpFunRugDetector.monitorPumpFunToken(mint);
      if (pumpFunAnalysis) {
        console.log(`[TestToken] Pump.fun token analysis:`, pumpFunAnalysis);
      }
    } catch (error) {
      console.error('[TestToken] Error analyzing pump.fun token:', error);
    }

    // 5. Discover liquidity pools
    let poolData = null;
    let platform = 'unknown';

    // If it's a pump.fun token, use bonding curve data
    if (pumpFunAnalysis) {
      platform = 'pump.fun';
      poolData = {
        poolAddress: pumpFunAnalysis.bondingCurve.bondingCurve,
        liquidity: pumpFunAnalysis.bondingCurve.solReserves * 50, // Estimate USD value (SOL at ~$50)
        price: pumpFunAnalysis.bondingCurve.solReserves > 0 
          ? (pumpFunAnalysis.bondingCurve.solReserves * 50) / (pumpFunAnalysis.bondingCurve.tokenReserves / 1e6)
          : 0,
        volume24h: 0, // Would need transaction history
        marketCap: 0, // Calculate from circulating supply
        feeTier: 0.01 // Pump.fun fee
      };
    } else {
      // Try Raydium for non-pump.fun tokens
      try {
        const raydiumPool = await raydiumPoolDiscoveryService.findPoolForToken(mint);
        if (raydiumPool) {
          poolData = raydiumPool;
          platform = 'raydium';
          console.log(`[TestToken] Found Raydium pool for ${mint}:`, poolData);
        }
      } catch (error) {
        console.error('[TestToken] Error checking Raydium pools:', error);
      }
    }

    // 6. Get current price data and store it
    let priceData = null;
    let currentPrice = heliusPrice; // Start with Helius price if available
    
    // Get price from pool data if available
    if (poolData && 'price' in poolData) {
      currentPrice = currentPrice || poolData.price;
    }
    
    // Store the price in database if we have it
    if (currentPrice !== null && currentPrice > 0) {
      try {
        const priceUpdate = {
          token_mint: mint,
          symbol: tokenMetadata?.symbol || 'UNKNOWN',
          price: currentPrice,
          price_usd: currentPrice,
          platform: platform,
          market_cap: poolData && 'marketCap' in poolData ? poolData.marketCap : 0,
          liquidity: poolData && 'liquidity' in poolData ? 
            (typeof poolData.liquidity === 'number' ? poolData.liquidity : poolData.liquidity?.usd || 0) : 0,
          volume_24h: poolData && 'volume24h' in poolData ? poolData.volume24h : 0,
          price_change_24h: 0, // Would need historical data
          updated_at: new Date().toISOString()
        };
        
        const { data: upsertedPrice } = await supabase
          .from('token_prices')
          .upsert(priceUpdate, {
            onConflict: 'token_mint'
          })
          .select()
          .single();
          
        if (upsertedPrice) {
          priceData = upsertedPrice;
          console.log(`[TestToken] Stored price for ${mint}: $${currentPrice}`);
        }
        
        // Also log to price history
        await supabase
          .from('token_price_history')
          .insert({
            token_mint: mint,
            price: currentPrice,
            liquidity: priceUpdate.liquidity,
            volume_24h: priceUpdate.volume_24h,
            market_cap: priceUpdate.market_cap,
            recorded_at: new Date().toISOString(),
            source: 'test_token_enrich'
          });
          
      } catch (error) {
        console.error('[TestToken] Error storing price data:', error);
      }
    }
    
    // Get latest price from database if we don't have it yet
    if (!priceData && !currentPrice) {
      const { data: existingPrice } = await supabase
        .from('token_prices')
        .select('*')
        .eq('token_mint', mint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      priceData = existingPrice;
    }

    // 7. Construct response with real data
    const response = {
      success: true,
      mint,
      symbol: tokenMetadata?.symbol || pumpFunAnalysis?.symbol || 'UNKNOWN',
      name: tokenMetadata?.name || pumpFunAnalysis?.name || 'Unknown Token',
      decimals: tokenMetadata?.decimals || 9,
      logoUri: tokenMetadata?.logoUri || null,
      description: tokenMetadata?.description || '',
      platform,
      price: currentPrice || priceData?.price_usd || 0,
      liquidity: poolData && 'liquidity' in poolData ? (typeof poolData.liquidity === 'number' ? poolData.liquidity : poolData.liquidity.usd) : 0,
      volume24h: poolData && 'volume24h' in poolData ? poolData.volume24h : 0,
      marketCap: poolData && 'marketCap' in poolData ? poolData.marketCap : 0,
      priceChange24h: priceData?.price_change_24h || 0,
      poolAddress: poolData?.poolAddress || null,
      feeTier: poolData && 'feeTier' in poolData ? poolData.feeTier : 0.003,
      // Add Helius asset data
      heliusAsset: heliusAssetData ? {
        interface: heliusAssetData.interface,
        ownership: heliusAssetData.ownership,
        supply: heliusAssetData.supply,
        mutable: heliusAssetData.mutable,
        burnt: heliusAssetData.burnt,
        token_info: heliusAssetData.token_info,
        content: heliusAssetData.content,
        authorities: heliusAssetData.authorities,
        compression: heliusAssetData.compression,
        grouping: heliusAssetData.grouping,
        royalty: heliusAssetData.royalty,
        creators: heliusAssetData.creators,
        uses: heliusAssetData.uses,
        inscriptions: heliusAssetData.inscriptions,
        spl20: heliusAssetData.spl20
      } : null,
      // Add pump.fun specific data
      pumpFunAnalysis: pumpFunAnalysis ? {
        creator: pumpFunAnalysis.creator,
        bondingCurve: pumpFunAnalysis.bondingCurve,
        holders: pumpFunAnalysis.holders,
        riskScore: pumpFunAnalysis.riskScore,
        warnings: pumpFunAnalysis.warnings
      } : null
    };

    console.log(`[TestToken] Enriched data for ${mint}:`, response);
    
    // 8. Price polling service removed - prices now updated on-demand
    
    res.json(response);

  } catch (error) {
    console.error('[TestToken] Error enriching test token:', error);
    res.status(500).json({ error: 'Failed to enrich token data' });
  }
});

export default router;