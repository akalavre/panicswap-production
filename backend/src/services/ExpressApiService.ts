import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { PublicKey } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';
import protectionRoutes from '../protect/protectionRoutes';
import autoProtectionRoutes from '../protect/autoProtectionRoutes';
import poolProtectionRoutes from '../routes/poolProtectionRoutes';
// import tokenDiscoveryRoutes from '../routes/tokenDiscoveryRoutes'; // REMOVED: Using wallet-first discovery
import protectedTokensRoutes from '../routes/protectedTokensRoutes';
import protectionAliasRoutes from '../routes/protectionAliasRoutes';
import testTokenRoutes from '../routes/testTokenRoutes';
import dashboardTokensRoutes from '../routes/dashboardTokensRoutes';
import { poolMonitoringService } from './PoolMonitoringService';
import { moralisService } from './MoralisService';
import { pumpFunService } from './PumpFunService';
import { rugCheckPollingService } from './RugCheckPollingService';

export class ExpressApiService {
  private app: express.Application;
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;
  // private enrichmentService: any; // REMOVED: No longer needed with Helius token discovery
  private webhookService: any;
  private walletTokenService: any;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Configure CORS with specific options
    this.app.use(cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost on any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        // Log rejected origins for debugging
        console.log('CORS rejected origin:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    }));
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'panicswap-backend' 
      });
    });

    // Enhanced health check
    this.app.get('/api/enhanced/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(), 
        service: 'panicswap-enhanced',
        protectionActive: true,
        monitoringActive: true
      });
    });

    // Token endpoints with query parameter support
    this.app.get('/api/tokens', async (req: Request, res: Response) => {
      try {
        const { 
          limit = 100, 
          offset = 0, 
          platform,
          is_active 
        } = req.query;
        
        let query = supabase
          .from('token_metadata')
          .select('*');
        
        // Apply filters
        if (platform) {
          query = query.eq('platform', platform);
        }
        if (is_active !== undefined) {
          query = query.eq('is_active', is_active === 'true');
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) throw error;

        res.json({
          tokens: data || [],
          total: data?.length || 0,
          limit: Number(limit),
          offset: Number(offset)
        });
      } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Failed to fetch tokens' });
      }
    });

    this.app.get('/api/tokens/:mint', async (req: Request, res: Response) => {
      try {
        const { mint } = req.params;
        
        const { data, error } = await supabase
          .from('token_metadata')
          .select('*')
          .eq('mint', mint)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Token not found' });
          }
          throw error;
        }

        // Get price data
        const { data: priceData } = await supabase
          .from('token_prices')
          .select('*')
          .eq('token_mint', mint)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        res.json({
          ...data,
          price: priceData
        });
      } catch (error) {
        console.error('Error fetching token:', error);
        res.status(500).json({ error: 'Failed to fetch token' });
      }
    });

    // DEPRECATED: Single token price endpoint - Frontend now uses Supabase Realtime
    this.app.get('/api/price/:mint', async (req: Request, res: Response) => {
      // Return empty response for backward compatibility
      res.json({
        success: true,
        data: {},
        message: 'This endpoint is deprecated. Use Supabase Realtime for price updates.'
      });
    });

    // Legacy price endpoint handler to avoid errors
    this.app.get('/api/price/:mint/legacy', async (req: Request, res: Response) => {
      try {
        const { mint } = req.params;
        
        const { data: priceData, error } = await supabase
          .from('token_prices')
          .select('*')
          .eq('token_mint', mint)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No price data found, return zero values
            return res.json({
              success: true,
              data: {
                [mint]: {
                  price: 0,
                  price_usd: 0,
                  change_24h: 0,
                  volume_24h: 0,
                  liquidity: 0,
                  platform: 'unknown',
                  updated_at: new Date().toISOString()
                }
              }
            });
          }
          throw error;
        }

        const responseData: any = {};
        responseData[mint] = {
          price: priceData?.price || 0,
          price_usd: priceData?.price_usd || 0,
          change_24h: priceData?.price_change_24h || 0,
          volume_24h: priceData?.volume_24h || 0,
          liquidity: priceData?.liquidity || 0,
          platform: priceData?.platform || 'unknown',
          updated_at: priceData?.updated_at || new Date().toISOString()
        };
        
        res.json({
          success: true,
          data: responseData
        });
      } catch (error) {
        console.error('Error fetching price:', error);
        res.status(500).json({ error: 'Failed to fetch price' });
      }
    });

    // Batch price endpoint
    this.app.post('/api/prices', async (req: Request, res: Response) => {
      try {
        const { mints } = req.body;
        
        if (!Array.isArray(mints) || mints.length === 0) {
          return res.status(400).json({ error: 'Mints array required' });
        }

        const { data: prices, error } = await supabase
          .from('token_prices')
          .select('*')
          .in('token_mint', mints);

        if (error) throw error;

        // Create price map
        const priceMap: any = {};
        mints.forEach(mint => {
          const priceData = prices?.find(p => p.token_mint === mint);
          priceMap[mint] = {
            price: priceData?.price || 0,
            price_usd: priceData?.price_usd || 0,
            change_24h: priceData?.price_change_24h || 0,
            volume_24h: priceData?.volume_24h || 0,
            liquidity: priceData?.liquidity || 0,
            platform: priceData?.platform || 'unknown',
            updated_at: priceData?.updated_at || new Date().toISOString()
          };
        });

        res.json({
          success: true,
          data: priceMap
        });
      } catch (error) {
        console.error('Error fetching batch prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
      }
    });

    // Price endpoints list
    this.app.get('/api/prices', async (req: Request, res: Response) => {
      try {
        const { limit = 100, offset = 0 } = req.query;
        
        const { data, error } = await supabase
          .from('token_prices')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) throw error;

        res.json({
          prices: data || [],
          total: data?.length || 0,
          limit: Number(limit),
          offset: Number(offset)
        });
      } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
      }
    });

    // Token metadata endpoint with price validation
    this.app.get('/api/tokens/metadata/:mint', async (req: Request, res: Response) => {
      try {
        const { mint } = req.params;
        const { priority = 'true', waitForPrice = 'true', maxWait = '5000' } = req.query;
        
        const isPriority = priority === 'true';
        const shouldWaitForPrice = waitForPrice === 'true';
        const maxWaitTime = parseInt(maxWait as string) || 5000;
        
        // First, check if token exists in database
        let { data: tokenData, error: tokenError } = await supabase
          .from('token_metadata')
          .select('*')
          .eq('mint', mint)
          .single();

        let needsEnrichment = false;
        
        if (tokenError || !tokenData) {
          needsEnrichment = true;
        } else if (!tokenData.symbol || tokenData.symbol === 'UNKNOWN') {
          needsEnrichment = true;
        }

        // If token doesn't exist or has incomplete data, log it
        if (needsEnrichment) {
          console.log(`Token ${mint} needs enrichment but enrichment service removed`);
          
          // If we should wait for price, give it some time
          if (shouldWaitForPrice) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if token is now available
              const { data: checkData } = await supabase
                .from('token_metadata')
                .select('*')
                .eq('mint', mint)
                .single();
                
              if (checkData && checkData.symbol && checkData.symbol !== 'UNKNOWN') {
                tokenData = checkData;
                break;
              }
            }
          }
        }

        // Fetch price data
        const { data: priceData } = await supabase
          .from('token_prices')
          .select('*')
          .eq('token_mint', mint)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        // Check if price is stale
        let isPriceStale = true;
        let lastPriceUpdate = null;
        
        if (priceData) {
          lastPriceUpdate = priceData.updated_at;
          const updateTime = new Date(lastPriceUpdate).getTime();
          const now = Date.now();
          isPriceStale = (now - updateTime) > (5 * 60 * 1000); // 5 minutes
          
          // Price polling service removed - prices now updated on-demand
        }

        // Ensure token is marked as active if it exists
        if (tokenData && !tokenData.is_active) {
          await supabase
            .from('token_metadata')
            .update({ 
              is_active: true,
              last_active_at: new Date().toISOString()
            })
            .eq('mint', mint);
        }

        const metadata = {
          mint,
          symbol: tokenData?.symbol || 'UNKNOWN',
          name: tokenData?.name || 'Unknown Token',
          decimals: tokenData?.decimals || 9,
          logo: tokenData?.logo_uri,
          price: priceData?.price || 0,
          priceUsd: priceData?.price_usd || 0,
          liquidity: priceData?.liquidity || 0,
          marketCap: priceData?.market_cap || 0,
          change24h: priceData?.change_24h || 0,
          volume24h: priceData?.volume_24h || 0,
          platform: tokenData?.platform || priceData?.platform || 'unknown',
          lastPriceUpdate,
          isPriceStale,
          isActive: tokenData?.is_active || false
        };

        res.json({
          success: true,
          data: metadata
        });
      } catch (error) {
        console.error('Error fetching token metadata:', error);
        res.status(500).json({ error: 'Failed to fetch token metadata' });
      }
    });

    // Token price status endpoint
    this.app.get('/api/tokens/price-status/:mint', async (req: Request, res: Response) => {
      try {
        const { mint } = req.params;
        
        // Check if token is active
        const { data: tokenData } = await supabase
          .from('token_metadata')
          .select('is_active, symbol')
          .eq('mint', mint)
          .single();

        // Get recent price updates
        const { data: priceHistory } = await supabase
          .from('token_prices')
          .select('updated_at, price, platform')
          .eq('token_mint', mint)
          .order('updated_at', { ascending: false })
          .limit(10);

        const recentUpdates = priceHistory?.map(p => ({
          timestamp: p.updated_at,
          price: p.price,
          source: p.platform || 'unknown'
        })) || [];

        const lastUpdate = recentUpdates[0]?.timestamp || null;
        const isActive = tokenData?.is_active || false;

        res.json({
          success: true,
          data: {
            mint,
            symbol: tokenData?.symbol,
            isActive,
            lastUpdate,
            updateCount: recentUpdates.length,
            recentUpdates
          }
        });
      } catch (error) {
        console.error('Error fetching price status:', error);
        res.status(500).json({ error: 'Failed to fetch price status' });
      }
    });

    // Token enrichment endpoint
    this.app.post('/api/tokens/enrich', async (req: Request, res: Response) => {
      try {
        const { mint, priority = false, platform = 'raydium' } = req.body;
        
        if (!mint) {
          return res.status(400).json({ error: 'Token mint required' });
        }

        // Enrichment service removed, just trigger price discovery
        // Validate platform
        const validPlatform = platform === 'pump.fun' ? 'pump.fun' : 'raydium';
        
        console.log(`Price discovery requested for ${mint} (platform: ${validPlatform}, priority: ${priority})`);

        // Price polling service removed - prices now updated on-demand

        res.json({ 
          success: true, 
          message: 'Token enrichment started',
          mint 
        });
      } catch (error) {
        console.error('Error enriching token:', error);
        res.status(500).json({ error: 'Failed to enrich token' });
      }
    });

    // Wallet sync endpoint (without 's')
    this.app.post('/api/wallet/sync', async (req: Request, res: Response) => {
      try {
        const { walletAddress, specificTokens } = req.body;
        
        if (!walletAddress) {
          return res.status(400).json({ error: 'Wallet address required' });
        }

        if (!this.walletTokenService) {
          return res.status(503).json({ error: 'Wallet token service not available' });
        }

        let result;
        if (specificTokens && Array.isArray(specificTokens) && specificTokens.length > 0) {
          // If specific tokens provided, mark them as active
          // For specific tokens, we still sync the whole wallet but can filter later
          const allTokens = await this.walletTokenService.syncWallet(walletAddress);
          result = allTokens.filter((t: any) => specificTokens.includes(t.mint));
          
          // Price polling service removed - prices now updated on-demand
          
          // Trigger immediate RugCheck updates
          await rugCheckPollingService.updateTokensImmediately(specificTokens);
          console.log(`Triggered immediate RugCheck updates for ${specificTokens.length} synced tokens`);
        } else {
          // Otherwise, sync all wallet tokens
          result = await this.walletTokenService.syncWallet(walletAddress);
        }
        
        res.json({ success: true, tokens: result });
      } catch (error) {
        console.error('Error syncing wallet:', error);
        res.status(500).json({ error: 'Failed to sync wallet' });
      }
    });

    // Legacy wallet sync endpoint (with 's') for backward compatibility
    this.app.post('/api/wallets/sync', async (req: Request, res: Response) => {
      try {
        const { walletAddress, specificTokens } = req.body;
        
        if (!walletAddress) {
          return res.status(400).json({ error: 'Wallet address required' });
        }

        if (!this.walletTokenService) {
          return res.status(503).json({ error: 'Wallet token service not available' });
        }

        let result;
        if (specificTokens && Array.isArray(specificTokens) && specificTokens.length > 0) {
          // If specific tokens provided, mark them as active
          // For specific tokens, we still sync the whole wallet but can filter later
          const allTokens = await this.walletTokenService.syncWallet(walletAddress);
          result = allTokens.filter((t: any) => specificTokens.includes(t.mint));
          
          // Price polling service removed - prices now updated on-demand
          
          // Trigger immediate RugCheck updates
          await rugCheckPollingService.updateTokensImmediately(specificTokens);
          console.log(`Triggered immediate RugCheck updates for ${specificTokens.length} synced tokens`);
        } else {
          // Otherwise, sync all wallet tokens
          result = await this.walletTokenService.syncWallet(walletAddress);
        }
        
        res.json({ success: true, tokens: result });
      } catch (error) {
        console.error('Error syncing wallet:', error);
        res.status(500).json({ error: 'Failed to sync wallet' });
      }
    });

    // Manual token addition
    this.app.post('/api/tokens/add', async (req: Request, res: Response) => {
      try {
        const { mint, symbol, walletAddress } = req.body;
        
        if (!mint || !symbol) {
          return res.status(400).json({ error: 'Token mint and symbol required' });
        }

        // Mark token as active
        await supabase
          .from('token_metadata')
          .update({
            is_active: true,
            last_active_at: new Date().toISOString()
          })
          .eq('mint', mint);

        // If wallet address provided, add to wallet_tokens
        if (walletAddress) {
          await supabase
            .from('wallet_tokens')
            .upsert({
              wallet_address: walletAddress,
              token_mint: mint,
              balance: 0,
              is_test_token: true,
              last_seen_at: new Date().toISOString()
            }, {
              onConflict: 'wallet_address,token_mint'
            });
        }

        // Add launch time to rugcheck_reports for manually added tokens
        await supabase
          .from('rugcheck_reports')
          .upsert({
            token_mint: mint,
            launch_time: new Date().toISOString(), // Set current time as launch time
            risk_score: 50, // Medium risk score for manually added tokens
            honeypot_status: 'unknown',
            last_update: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });

        // Price polling service removed - prices now updated on-demand

        res.json({ success: true, mint, symbol });
      } catch (error) {
        console.error('Error adding token:', error);
        res.status(500).json({ error: 'Failed to add token' });
      }
    });

    // Test protected tokens endpoint (for test mode)
    this.app.post('/api/test/protected-tokens', async (req: Request, res: Response) => {
      try {
        const { tokenMint, tokenSymbol, tokenName, walletAddress } = req.body;
        
        if (!tokenMint || !walletAddress) {
          return res.status(400).json({ error: 'Token mint and wallet address are required' });
        }

        // In test mode, just acknowledge the protection request
        console.log(`Test protected token added: ${tokenMint} for wallet ${walletAddress}`);
        
        // Price polling service removed - prices now updated on-demand
        
        res.json({ 
          success: true, 
          message: 'Test token protected',
          tokenMint,
          tokenSymbol,
          tokenName,
          walletAddress
        });
      } catch (error: any) {
        console.error('Error in test protected tokens:', error);
        res.status(400).json({ error: error.message });
      }
    });

    // Test add token endpoint
    this.app.post('/api/test/add-token', async (req: Request, res: Response) => {
      try {
        const { tokenMint, walletAddress } = req.body;
        
        if (!tokenMint || !walletAddress) {
          return res.status(400).json({ error: 'Token mint and wallet address are required' });
        }

        console.log(`[Test] Adding test token ${tokenMint} to wallet ${walletAddress}`);

        // 1. Check if token metadata already exists in database
        const { data: existingToken } = await supabase
          .from('token_metadata')
          .select('*')
          .eq('mint', tokenMint)
          .single();

        let tokenMetadata;
        
        if (existingToken && existingToken.symbol !== 'UNKNOWN' && existingToken.symbol !== 'TEST') {
          // Token already exists with real metadata, use it
          console.log(`[Test] Using existing token metadata for ${existingToken.symbol}`);
          tokenMetadata = existingToken;
        } else {
          // Token doesn't exist or has placeholder data, fetch from Moralis first, then Helius as fallback
          console.log(`[Test] Fetching token metadata...`);
          let tokenInfo = null;
          
          // Try Moralis first
          const moralisData = await moralisService.getTokenMetadata(tokenMint);
          
          if (moralisData) {
            tokenInfo = moralisData;
          } else {
            // Try pump.fun API
            console.log(`[Test] Moralis failed, trying pump.fun API...`);
            const pumpData = await pumpFunService.getTokenMetadata(tokenMint);
            
            if (pumpData) {
              tokenInfo = pumpData;
            } else {
              // Final fallback to Helius
              console.log(`[Test] Pump.fun failed, trying Helius API...`);
              try {
                const { Helius } = await import('helius-sdk');
                const helius = new Helius(process.env.HELIUS_API_KEY || '');
                const asset = await helius.rpc.getAsset({ id: tokenMint });
                
                if (asset?.content?.metadata) {
                  tokenInfo = {
                    name: asset.content.metadata.name || 'Unknown Token',
                    symbol: asset.content.metadata.symbol || 'UNKNOWN',
                    decimals: 9, // Default for SPL tokens
                    logo: asset.content.files?.[0]?.uri || asset.content.json_uri
                  };
                  console.log(`✅ Token metadata fetched from Helius:`, tokenInfo);
                }
              } catch (heliusError) {
                console.error(`[Test] Helius fetch error:`, heliusError);
              }
            }
          }
          
          if (!tokenInfo) {
            console.error(`[Test] Failed to fetch metadata from all sources for ${tokenMint}`);
            return res.status(400).json({ error: 'Unable to fetch token metadata. Please verify the token address.' });
          }

          // Store the fetched metadata in database
          const { data: tokenData, error: tokenError } = await supabase
            .from('token_metadata')
            .upsert({
              mint: tokenMint,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              decimals: tokenInfo.decimals,
              logo_uri: tokenInfo.logo,
              platform: 'test',
              is_active: true,
              last_active_at: new Date().toISOString()
            }, {
              onConflict: 'mint'
            })
            .select()
            .single();

          if (tokenError) {
            console.error('[Test] Error creating token metadata:', tokenError);
            return res.status(500).json({ error: 'Failed to create token metadata' });
          }
          
          tokenMetadata = tokenData;
        }

        // 2. Add token to wallet_tokens table with test balance
        const testBalance = 1000000; // 1 million tokens for testing
        const { error: walletTokenError } = await supabase
          .from('wallet_tokens')
          .upsert({
            wallet_address: walletAddress,
            token_mint: tokenMint,
            balance: testBalance,
            is_test_token: true,
            last_seen_at: new Date().toISOString(),
            added_at: new Date().toISOString()
          }, {
            onConflict: 'wallet_address,token_mint'
          });

        if (walletTokenError) {
          console.error('[Test] Error adding token to wallet:', walletTokenError);
          return res.status(500).json({ error: 'Failed to add token to wallet' });
        }

        // 3. Create test price data
        const { error: priceError } = await supabase
          .from('token_prices')
          .upsert({
            token_mint: tokenMint,
            price: 0.001, // Test price
            price_usd: 0.001,
            liquidity: 50000, // $50k test liquidity
            market_cap: 1000000, // $1M test market cap
            volume_24h: 10000, // $10k test volume
            price_change_24h: 0,
            platform: 'test',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });

        if (priceError) {
          console.error('[Test] Error creating price data:', priceError);
          // Don't fail the request, price data is optional
        }

        // 4. Add to protected_tokens with automatic protection enabled
        const { data: protectedData, error: protectedError } = await supabase
          .from('protected_tokens')
          .upsert({
            token_mint: tokenMint,
            wallet_address: walletAddress,
            is_active: true,
            monitoring_active: true,
            price_threshold: 15, // Default 15% drop threshold
            liquidity_threshold: 30, // Default 30% liquidity drop
            dev_wallet_monitoring: true,
            gas_boost: 1,
            auto_protection_enabled: true, // Enable automatic protection
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'token_mint,wallet_address'
          })
          .select()
          .single();

        if (protectedError) {
          console.error('[Test] Error adding protected token:', protectedError);
          return res.status(500).json({ error: 'Failed to add protected token' });
        }

        // 5. Price polling service removed - prices now updated on-demand

        // 5a. Trigger immediate RugCheck update
        await rugCheckPollingService.updateTokensImmediately([tokenMint]);
        console.log(`[Test] Triggered immediate RugCheck update for ${tokenMint}`);

        // 6. Start pool monitoring for the token
        try {
          console.log(`[Test] Starting pool monitoring for test token ${tokenMint}`);
          await poolMonitoringService.protectToken(tokenMint, walletAddress);
        } catch (monitoringError) {
          console.error('[Test] Error starting pool monitoring:', monitoringError);
          // Don't fail the request, monitoring is optional
        }

        console.log(`[Test] Successfully added test token ${tokenMint} with protection enabled`);

        res.json({ 
          success: true, 
          message: 'Test token added successfully',
          data: {
            tokenMint,
            walletAddress,
            balance: testBalance,
            symbol: tokenMetadata.symbol,
            name: tokenMetadata.name,
            decimals: tokenMetadata.decimals,
            logo: tokenMetadata.logo_uri,
            protectionSettings: protectedData
          }
        });
      } catch (error: any) {
        console.error('[Test] Error adding test token:', error);
        res.status(500).json({ error: error.message || 'Failed to add test token' });
      }
    });

    // Rugcheck batch endpoint
    this.app.post('/api/rugcheck/batch-check', async (req: Request, res: Response) => {
      try {
        const { tokenMints, walletAddress } = req.body;
        
        console.log('[RugCheck] Batch check request:', { 
          tokenCount: tokenMints?.length || 0, 
          walletAddress,
          tokenMints: tokenMints?.slice(0, 3) // Log first 3 for debugging
        });
        
        if (!Array.isArray(tokenMints) || tokenMints.length === 0) {
          return res.status(400).json({ error: 'Token mints array required' });
        }

        // Generate rugcheck reports and store in Supabase
        const reports: { [mint: string]: any } = {};
        const upsertData: any[] = [];
        
        for (const mint of tokenMints) {
          // Validate mint address format
          try {
            new PublicKey(mint); // Test if valid
          } catch (e) {
            console.error(`[RugCheck] Invalid mint address format: ${mint}`);
            // Skip invalid mints
            reports[mint] = {
              tokenMint: mint,
              riskScore: 100,
              riskLevel: 'danger',
              creatorRugged: false,
              creatorHistory: { ruggedTokens: 0, totalTokens: 0, tokens: [] },
              tokenOverview: {
                supply: '0',
                creator: 'INVALID',
                creatorBalance: 0,
                creatorBalancePercent: 0,
                marketCap: 0,
                holders: 0,
                mintAuthority: false,
                freezeAuthority: false,
                lpLocked: 0
              },
              markets: [],
              insiderNetworks: false,
              topHolders: [],
              warnings: ['Invalid token mint address'],
              lastChecked: Date.now()
            };
            continue;
          }
          
          // Check if we have a recent report in the database (less than 5 minutes old)
          const { data: existingReport } = await supabase
            .from('rugcheck_reports')
            .select('*')
            .eq('token_mint', mint)
            .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
            .single();
          
          if (existingReport) {
            // Use existing report
            reports[mint] = {
              tokenMint: mint,
              riskScore: existingReport.risk_score,
              riskLevel: existingReport.risk_level,
              creatorRugged: existingReport.creator_rugged,
              creatorHistory: existingReport.creator_history || {
                ruggedTokens: 0,
                totalTokens: 1,
                tokens: []
              },
              tokenOverview: {
                supply: existingReport.token_supply || '1000000000',
                creator: existingReport.creator_address || 'UNKNOWN',
                creatorBalance: existingReport.creator_balance || 0,
                creatorBalancePercent: existingReport.creator_balance_percent || 0,
                marketCap: existingReport.market_cap || 0,
                holders: existingReport.holders || 0,
                mintAuthority: existingReport.mint_authority || false,
                freezeAuthority: existingReport.freeze_authority || false,
                lpLocked: existingReport.lp_locked || 0,
                bundlerCount: existingReport.bundler_count || 0
              },
              // New UI fields
              launchTime: existingReport.launch_time || null,
              devActivityPct: existingReport.dev_activity_pct || 0,
              devActivityTime: existingReport.dev_activity_time || null,
              honeypotStatus: existingReport.honeypot_status || 'unknown',
              liquidityCurrent: existingReport.liquidity_current || 0,
              liquidityChange1h: existingReport.liquidity_change_1h_pct || 0,
              liquidityChange24h: existingReport.liquidity_change_24h_pct || 0,
              markets: existingReport.markets || [],
              insiderNetworks: existingReport.insider_networks || false,
              topHolders: existingReport.top_holders || [],
              warnings: existingReport.warnings || [],
              lastChecked: new Date(existingReport.updated_at).getTime()
            };
          } else {
            // No existing report - return minimal response
            // Real data will be populated by RugCheckPollingService
            console.log(`No rugcheck report found for ${mint} - will be created by polling service`);
            
            const rugcheckData = {
              token_mint: mint,
              risk_score: 50, // Default medium risk until real data is fetched
              risk_level: 'medium',
              creator_rugged: false,
              creator_history: {
                ruggedTokens: 0,
                totalTokens: 0,
                tokens: []
              },
              token_supply: '0',
              creator_address: '',
              creator_balance: 0,
              creator_balance_percent: 0,
              market_cap: 0,
              holders: 0,
              mint_authority: false,
              freeze_authority: false,
              lp_locked: 0,
              markets: [],
              insider_networks: false,
              top_holders: [],
              warnings: ['Data pending - real blockchain data being fetched'],
              updated_at: new Date().toISOString()
            };
            
            upsertData.push(rugcheckData);
            
            reports[mint] = {
              tokenMint: mint,
              riskScore: rugcheckData.risk_score,
              riskLevel: rugcheckData.risk_level as 'safe' | 'low' | 'medium' | 'high' | 'danger',
              creatorRugged: rugcheckData.creator_rugged,
              creatorHistory: rugcheckData.creator_history,
              tokenOverview: {
                supply: rugcheckData.token_supply,
                creator: rugcheckData.creator_address,
                creatorBalance: rugcheckData.creator_balance,
                creatorBalancePercent: rugcheckData.creator_balance_percent,
                marketCap: rugcheckData.market_cap,
                holders: rugcheckData.holders,
                mintAuthority: rugcheckData.mint_authority,
                freezeAuthority: rugcheckData.freeze_authority,
                lpLocked: rugcheckData.lp_locked,
                bundlerCount: (rugcheckData as any).bundler_count || 0
              },
              // New UI fields (will be populated by RugCheckPollingServiceV2)
              launchTime: null,
              devActivityPct: 0,
              devActivityTime: null,
              honeypotStatus: 'unknown',
              liquidityCurrent: 0,
              liquidityChange1h: 0,
              liquidityChange24h: 0,
              markets: rugcheckData.markets,
              insiderNetworks: rugcheckData.insider_networks,
              topHolders: rugcheckData.top_holders,
              warnings: rugcheckData.warnings,
              lastChecked: Date.now()
            };
          }
        }
        
        // Batch upsert new data to Supabase
        if (upsertData.length > 0) {
          const { error: upsertError } = await supabase
            .from('rugcheck_reports')
            .upsert(upsertData, {
              onConflict: 'token_mint'
            });
          
          if (upsertError) {
            console.error('[RugCheck] Error upserting to Supabase:', upsertError);
            // Continue anyway, we have the data to return
          } else {
            console.log('[RugCheck] Stored', upsertData.length, 'new reports to Supabase');
          }
        }

        console.log('[RugCheck] Returning reports for', Object.keys(reports).length, 'tokens');
        
        res.json({
          success: true,
          reports
        });
      } catch (error) {
        console.error('[RugCheck] Error in batch check:', error);
        res.status(500).json({ error: 'Failed to check tokens' });
      }
    });

    // Session tracking endpoint
    this.app.post('/api/sessions/track', async (req: Request, res: Response) => {
      try {
        const { walletAddress, action, metadata } = req.body;
        
        console.log(`Session tracked: ${walletAddress} - ${action}`, metadata);
        
        // In production, this would track user sessions
        res.json({ success: true });
      } catch (error) {
        console.error('Error tracking session:', error);
        res.status(500).json({ error: 'Failed to track session' });
      }
    });

    // Helius webhook endpoint (new path)
    this.app.post('/api/webhook/helius', async (req: Request, res: Response) => {
      try {
        if (!this.webhookService) {
          return res.status(503).json({ error: 'Webhook service not available' });
        }

        await this.webhookService.handleWebhook(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
      }
    });

    // Legacy webhook endpoint for backward compatibility
    this.app.post('/webhooks/helius', async (req: Request, res: Response) => {
      try {
        if (!this.webhookService) {
          return res.status(503).json({ error: 'Webhook service not available' });
        }

        await this.webhookService.handleWebhook(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
      }
    });

    // Get wallet tokens endpoint
    this.app.get('/api/wallet/tokens/:address', async (req: Request, res: Response) => {
      try {
        const walletAddress = req.params.address;
        
        if (!walletAddress) {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        // Get wallet-specific tokens from wallet_tokens table
        const { data: walletTokens, error: walletError } = await supabase
          .from('wallet_tokens')
          .select(`
            *,
            token_metadata!inner(*)
          `)
          .eq('wallet_address', walletAddress)
          .order('last_seen_at', { ascending: false });

        if (walletError) {
          throw walletError;
        }

        // Get prices for these tokens
        const tokenMints = walletTokens?.map((wt: any) => wt.token_mint) || [];
        const { data: prices, error: pricesError } = await supabase
          .from('token_prices')
          .select('*')
          .in('token_mint', tokenMints);

        if (pricesError) {
          console.error('Error fetching prices:', pricesError);
        }

        // Get rugcheck reports for these tokens
        const { data: rugcheckReports, error: rugcheckError } = await supabase
          .from('rugcheck_reports')
          .select('token_mint, launch_time, honeypot_status, risk_score, lp_locked')
          .in('token_mint', tokenMints);

        if (rugcheckError) {
          console.error('Error fetching rugcheck reports:', rugcheckError);
        }

        // Get price and liquidity changes using SQL function (try lenient version first)
        let { data: priceChanges, error: changesError } = await supabase
          .rpc('calculate_multiple_token_changes_lenient', { p_token_mints: tokenMints });
        
        // Fallback to original function if lenient doesn't exist
        if (changesError && changesError.message?.includes('function')) {
          const { data: fallbackChanges, error: fallbackError } = await supabase
            .rpc('calculate_multiple_token_changes', { p_token_mints: tokenMints });
          priceChanges = fallbackChanges;
          changesError = fallbackError;
        }

        if (changesError) {
          console.error('Error fetching price changes:', changesError);
        }

        // Create maps for prices, rugcheck data, and changes
        const priceMap = new Map();
        prices?.forEach(p => {
          priceMap.set(p.token_mint, p);
        });

        const rugcheckMap = new Map();
        rugcheckReports?.forEach(r => {
          rugcheckMap.set(r.token_mint, r);
        });

        const changesMap = new Map();
        priceChanges?.forEach((c: any) => {
          changesMap.set(c.token_mint, c);
        });

        // Merge wallet tokens with prices, metadata, rugcheck data, and changes
        const tokensWithPrices = walletTokens?.map((wt: any) => {
          const priceData = priceMap.get(wt.token_mint) || null;
          const changes = changesMap.get(wt.token_mint) || {};
          
          return {
            ...wt.token_metadata,
            balance: wt.balance,
            is_test_token: wt.is_test_token,
            added_at: wt.added_at,
            last_seen_at: wt.last_seen_at,
            token_prices: priceData ? {
              ...priceData,
              price_change_1h: changes.price_change_1h || 0,
              price_change_24h: changes.price_change_24h || 0,
              liquidity_change_1h: changes.liquidity_change_1h || 0,
              liquidity_change_24h: changes.liquidity_change_24h || 0
            } : null,
            launch_time: rugcheckMap.get(wt.token_mint)?.launch_time || null,
            honeypot_status: rugcheckMap.get(wt.token_mint)?.honeypot_status || 'unknown',
            risk_score: rugcheckMap.get(wt.token_mint)?.risk_score || null,
            lp_locked: rugcheckMap.get(wt.token_mint)?.lp_locked ?? null
          };
        }) || [];

        res.json({ 
          success: true, 
          walletAddress,
          tokens: tokensWithPrices
        });
      } catch (error: any) {
        console.error('Error fetching wallet tokens:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Protection routes - mount under /api/protection
    this.app.use('/api/protection', protectionRoutes);
    
    // Auto-protection routes - mount under /api/auto-protection
    this.app.use('/api/auto-protection', autoProtectionRoutes);
    
    // Pool protection routes - mount under /api/pool-protection
    this.app.use('/api/pool-protection', poolProtectionRoutes);
    
    // Token discovery routes - REMOVED: Using wallet-first discovery
    // this.app.use('/api/token-discovery', tokenDiscoveryRoutes);
    
    // Protected tokens routes - for protection settings
    this.app.use('/api/protected-tokens', protectedTokensRoutes);
    
    // Protection alias routes - cleaner API for frontend
    this.app.use('/api/protection', protectionAliasRoutes);
    
    // Test token routes
    this.app.use(testTokenRoutes);
    
    // Dashboard token routes - for tracking active dashboard tokens
    this.app.use(dashboardTokensRoutes);
    
    // Debug endpoint for rugcheck data
    this.app.get('/api/v1/debug/rugcheck/:mint', async (req: Request, res: Response) => {
      try {
        const { mint } = req.params;
        
        // Validate mint address
        try {
          new PublicKey(mint);
        } catch {
          return res.status(400).json({ error: 'Invalid mint address' });
        }
        
        // Get raw data from various sources
        const [dbData, realtimeData] = await Promise.all([
          // Database data
          supabase
            .from('rugcheck_reports')
            .select('*')
            .eq('token_mint', mint)
            .single(),
          
          // Real-time data from rugcheck service (removed getDebugData call)
          Promise.resolve(null)
        ]);
        
        // Get token metadata
        const { data: tokenData } = await supabase
          .from('token_metadata')
          .select('*')
          .eq('mint', mint)
          .single();
        
        // Get price data
        const { data: priceData } = await supabase
          .from('token_prices')
          .select('*')
          .eq('token_mint', mint)
          .order('timestamp', { ascending: false })
          .limit(10);
        
        res.json({
          mint,
          timestamp: new Date().toISOString(),
          database: {
            rugcheck_report: dbData.data,
            token_metadata: tokenData,
            recent_prices: priceData
          },
          realtime: realtimeData || 'Not available',
          config: {
            polling_interval: process.env.RUGCHECK_POLL_INTERVAL || '1000',
            batch_size: process.env.RUGCHECK_BATCH_SIZE || '20',
            batch_delay: process.env.RUGCHECK_BATCH_DELAY || '30000'
          }
        });
      } catch (error: any) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });
    
    // Automated protection compatibility routes
    // These routes redirect to the auto-protection routes for backward compatibility
    this.app.use((req: Request, res: Response, next: express.NextFunction) => {
      if (req.path.startsWith('/api/automated-protection')) {
        req.url = req.url.replace('/automated-protection', '/auto-protection');
      }
      next();
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  // REMOVED: setEnrichmentService - no longer needed with Helius token discovery
  
  setWebhookService(service: any) {
    this.webhookService = service;
  }
  
  setWalletTokenService(service: any) {
    this.walletTokenService = service;
  }
  

  getServer() {
    return this.server;
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(this.port, () => {
        console.log(`Express API server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('Express API server stopped');
    }
  }
}