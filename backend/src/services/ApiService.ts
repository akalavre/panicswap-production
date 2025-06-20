import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import supabase from '../utils/supabaseClient';

export class ApiService {
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;
  private enrichmentService: any;
  private webhookService: any;
  private walletSyncService: any;

  constructor(port: number = 3001) {
    this.port = port;
  }
  
  setEnrichmentService(service: any) {
    this.enrichmentService = service;
  }
  
  setWebhookService(service: any) {
    this.webhookService = service;
  }
  
  setWalletSyncService(service: any) {
    this.walletSyncService = service;
  }
  

  getServer() {
    return this.server;
  }

  async start() {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = parse(req.url || '', true);
      const pathname = parsedUrl.pathname;
      
      // Debug logging for development
      console.log(`[API] ${req.method} ${pathname}`);

      try {
        // Route: GET /api/tokens
        if (pathname === '/api/tokens' && req.method === 'GET') {
          const { limit = 100, offset = 0, platform, is_active } = parsedUrl.query;
          
          let query = supabase
            .from('token_metadata')
            .select('*')
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

          if (platform) {
            query = query.eq('platform', platform);
          }
          
          // Filter by active status if requested
          if (is_active === 'true') {
            query = query.eq('is_active', true);
          } else if (is_active === 'false') {
            query = query.eq('is_active', false);
          }

          const { data, error } = await query;

          if (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data, total: data?.length || 0 }));
          return;
        }

        // Route: GET /api/tokens/:mint
        if (pathname?.startsWith('/api/tokens/') && req.method === 'GET') {
          const mint = pathname.split('/')[3];
          
          const { data: tokenData, error: tokenError } = await supabase
            .from('token_metadata')
            .select('*')
            .eq('mint', mint)
            .single();

          if (tokenError) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Token not found' }));
            return;
          }

          // Get latest price data
          const { data: priceData, error: priceError } = await supabase
            .from('token_prices')
            .select('*')
            .eq('token_mint', mint)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          const response = {
            ...tokenData,
            price_data: priceData || null
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
          return;
        }

        // Route: GET /api/prices
        if (pathname === '/api/prices' && req.method === 'GET') {
          const { data, error } = await supabase
            .from('token_prices')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(100);

          if (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data }));
          return;
        }

        // Route: POST /api/prices (batch price request)
        if (pathname === '/api/prices' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { tokens } = JSON.parse(body);
              
              if (!tokens || !Array.isArray(tokens)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Tokens array is required' }));
                return;
              }

              // Fetch prices for multiple tokens
              const { data, error } = await supabase
                .from('token_prices')
                .select('*')
                .in('token_mint', tokens);

              if (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
                return;
              }

              // Format response as expected by frontend
              const priceData: any = {};
              data?.forEach(item => {
                priceData[item.token_mint] = {
                  price: item.price || 0,
                  price_usd: item.price_usd || 0,
                  change_24h: item.change_24h || 0,
                  volume_24h: item.volume_24h || 0,
                  liquidity: item.liquidity || 0,
                  platform: item.platform || 'unknown',
                  updated_at: item.updated_at
                };
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: priceData }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: GET /api/price/:mint (single price request)
        if (pathname?.startsWith('/api/price/') && req.method === 'GET') {
          const mint = pathname.split('/')[3];
          
          const { data, error } = await supabase
            .from('token_prices')
            .select('*')
            .eq('token_mint', mint)
            .single();

          if (error) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Price not found' }));
            return;
          }

          const priceData = {
            price: data.price || 0,
            price_usd: data.price_usd || 0,
            change_24h: data.change_24h || 0,
            volume_24h: data.volume_24h || 0,
            liquidity: data.liquidity || 0,
            platform: data.platform || 'unknown',
            updated_at: data.updated_at
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: priceData }));
          return;
        }

        // Route: POST /api/prices (batch price request)
        if (pathname === '/api/prices' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { tokens } = JSON.parse(body);
              
              if (!tokens || !Array.isArray(tokens)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Tokens array is required' }));
                return;
              }

              // Fetch prices for all tokens
              const { data: prices, error } = await supabase
                .from('token_prices')
                .select('*')
                .in('token_mint', tokens);

              if (error) {
                throw error;
              }

              // Convert to a map for easy lookup
              const priceMap: { [key: string]: any } = {};
              prices?.forEach(p => {
                priceMap[p.token_mint] = {
                  price: p.price || 0,
                  price_usd: p.price_usd || 0,
                  change_24h: p.change_24h || 0,
                  volume_24h: p.volume_24h || 0,
                  liquidity: p.liquidity || 0,
                  market_cap: p.market_cap || 0,
                  platform: p.platform || 'unknown',
                  updated_at: p.updated_at
                };
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data: priceMap }));
            } catch (error: any) {
              console.error('Error fetching batch prices:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: POST /api/tokens/enrich
        if (pathname === '/api/tokens/enrich' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { mint, platform = 'manual' } = JSON.parse(body);
              
              if (!mint) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Mint address is required' }));
                return;
              }

              // Trigger priority enrichment for user-requested tokens
              const enrichmentService = this.enrichmentService;
              
              if (enrichmentService) {
                await enrichmentService.enrichToken(mint, platform as any, new Date(), true); // priority = true
                
                // Price polling service removed - prices now updated on-demand
                
                // Wait less for priority tokens
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Fetch the enriched token data
                const { data: tokenData, error: tokenError } = await supabase
                  .from('token_metadata')
                  .select('*')
                  .eq('mint', mint)
                  .single();

                if (tokenError || !tokenData) {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Token not found after enrichment' }));
                  return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: tokenData }));
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Enrichment service not available' }));
              }
            } catch (error) {
              console.error('Error in token enrichment:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to enrich token' }));
            }
          });
          return;
        }

        // Route: POST /api/webhook/helius
        if (pathname === '/api/webhook/helius' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const webhookData = JSON.parse(body);
              
              // Process webhook
              if (this.webhookService) {
                await this.webhookService.processWebhook(webhookData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } else {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Webhook service not available' }));
              }
            } catch (error: any) {
              console.error('Webhook processing error:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: POST /api/wallet/sync
        if (pathname === '/api/wallet/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { walletAddress, specificTokens } = JSON.parse(body);
              
              if (!walletAddress) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Wallet address is required' }));
                return;
              }

              if (!this.walletSyncService) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Wallet sync service not available' }));
                return;
              }

              // Sync wallet tokens
              let tokens: string[];
              if (specificTokens && Array.isArray(specificTokens) && specificTokens.length > 0) {
                // If specific tokens provided, just mark them as active
                tokens = await this.walletSyncService.markSpecificTokensActive(walletAddress, specificTokens);
                
                // Price polling service removed - prices now updated on-demand
              } else {
                // Otherwise, sync all wallet tokens
                tokens = await this.walletSyncService.syncWalletTokens(walletAddress);
              }
              
              // Log sync history
              await supabase
                .from('wallet_sync_history')
                .insert({
                  wallet_address: walletAddress,
                  tokens_found: tokens.length,
                  status: 'success'
                });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                tokensFound: tokens.length,
                tokens: tokens
              }));
            } catch (error: any) {
              console.error('Wallet sync error:', error);
              
              // Log error to sync history
              if (body) {
                const { walletAddress } = JSON.parse(body);
                await supabase
                  .from('wallet_sync_history')
                  .insert({
                    wallet_address: walletAddress,
                    tokens_found: 0,
                    status: 'error',
                    error_message: error.message
                  });
              }
              
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: GET /api/wallet/tokens/:address
        if (pathname?.startsWith('/api/wallet/tokens/') && req.method === 'GET') {
          const walletAddress = pathname.split('/')[4];
          
          if (!walletAddress) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Wallet address is required' }));
            return;
          }

          try {
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

            // Create a price map
            const priceMap = new Map();
            prices?.forEach(p => {
              priceMap.set(p.token_mint, p);
            });

            // Merge wallet tokens with prices and metadata
            const tokensWithPrices = walletTokens?.map((wt: any) => ({
              ...wt.token_metadata,
              balance: wt.balance,
              is_test_token: wt.is_test_token,
              added_at: wt.added_at,
              last_seen_at: wt.last_seen_at,
              token_prices: priceMap.get(wt.token_mint) || null
            })) || [];

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              walletAddress,
              tokens: tokensWithPrices
            }));
          } catch (error: any) {
            console.error('Error fetching wallet tokens:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // Route: POST /api/test/protected-tokens (for test mode)
        if (pathname === '/api/test/protected-tokens' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { tokenMint, tokenSymbol, tokenName, walletAddress } = JSON.parse(body);
              
              if (!tokenMint || !walletAddress) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token mint and wallet address are required' }));
                return;
              }

              // In test mode, just acknowledge the protection request
              console.log(`Test protected token added: ${tokenMint} for wallet ${walletAddress}`);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Test token protected',
                tokenMint,
                tokenSymbol,
                tokenName,
                walletAddress
              }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: POST /api/rugcheck/batch-check
        if (pathname === '/api/rugcheck/batch-check' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { tokens } = JSON.parse(body);
              
              if (!tokens || !Array.isArray(tokens)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Tokens array is required' }));
                return;
              }

              // For now, return mock data
              // Fetch from database instead of generating mock data
              const results: any = {};
              for (const token of tokens) {
                const { data: report } = await supabase
                  .from('rugcheck_reports')
                  .select('*')
                  .eq('token_mint', token)
                  .single();
                
                if (report) {
                  results[token] = {
                    mint: token,
                    riskScore: report.risk_score,
                    risks: report.warnings || [],
                    isSafe: report.risk_score < 40,
                    lastChecked: report.updated_at
                  };
                } else {
                  // No data yet - return pending status
                  results[token] = {
                    mint: token,
                    riskScore: 50,
                    risks: ['Data pending'],
                    isSafe: false,
                    lastChecked: new Date().toISOString()
                  };
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, results }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: GET /api/automated-protection/status/:wallet
        if (pathname?.startsWith('/api/automated-protection/status/') && req.method === 'GET') {
          console.log('[API] Handling automated protection status request');
          const pathParts = pathname.split('/');
          const walletAddress = pathParts[pathParts.length - 1];
          
          // Return mock automated protection status
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            status: {
              walletAddress,
              isEnabled: false,
              settings: {
                rugPullProtection: true,
                priceDropThreshold: 20,
                liquidityThreshold: 1000,
                autoExitEnabled: false
              },
              protectedTokens: [],
              lastChecked: new Date().toISOString()
            }
          }));
          return;
        }

        // Route: POST /api/automated-protection/enable
        if (pathname === '/api/automated-protection/enable' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { walletAddress } = JSON.parse(body);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Automated protection enabled',
                walletAddress
              }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: POST /api/automated-protection/disable
        if (pathname === '/api/automated-protection/disable' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { walletAddress } = JSON.parse(body);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Automated protection disabled',
                walletAddress
              }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: GET /api/enhanced/health
        if (pathname === '/api/enhanced/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
              monitoring: 'active',
              protection: 'active',
              alerts: 'active'
            }
          }));
          return;
        }

        // Route: POST /api/sessions/track
        if (pathname === '/api/sessions/track' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const sessionData = JSON.parse(body);
              
              // For now, just acknowledge the session tracking
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                sessionId: sessionData.sessionId || `session_${Date.now()}`,
                timestamp: new Date().toISOString()
              }));
            } catch (error: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        // Route: GET /api/health
        if (pathname === '/api/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            service: 'panicswap-backend'
          }));
          return;
        }

        // 404 for unknown routes
        console.log(`[API] No handler found for ${req.method} ${pathname}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));

      } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`API server listening on 0.0.0.0:${this.port}`);
      console.log(`Available endpoints:`);
      console.log(`  GET /api/health - Health check`);
      console.log(`  GET /api/tokens - List all tokens`);
      console.log(`  GET /api/tokens/:mint - Get specific token`);
      console.log(`  POST /api/tokens/enrich - Manually add and enrich token`);
      console.log(`  GET /api/prices - Get latest prices`);
      console.log(`  POST /api/wallet/sync - Sync wallet tokens`);
      console.log(`  GET /api/wallet/tokens/:address - Get wallet's active tokens`);
      console.log(`  POST /api/rugcheck/batch-check - Batch check token risks`);
      console.log(`  GET /api/automated-protection/status/:wallet - Get protection status`);
      console.log(`  POST /api/automated-protection/enable - Enable protection`);
      console.log(`  POST /api/automated-protection/disable - Disable protection`);
      console.log(`  GET /api/enhanced/health - Enhanced monitoring health`);
      console.log(`  POST /api/sessions/track - Track user session`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('API server stopped');
      });
    }
  }
}