import { Router, Request, Response } from 'express';
import supabase from '../utils/supabaseClient';
import { priceDiscoveryService } from '../services/PriceDiscoveryService';

const router = Router();

// Test endpoint to verify connectivity
router.get('/api/dashboard/test', async (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Dashboard API is working',
    timestamp: new Date().toISOString()
  });
});

// Endpoint to register dashboard tokens for price polling
router.post('/api/dashboard/register-tokens', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMints } = req.body;
    
    if (!walletAddress || !tokenMints || !Array.isArray(tokenMints)) {
      return res.status(400).json({ 
        error: 'walletAddress and tokenMints array required' 
      });
    }

    console.log(`[Dashboard] Registering ${tokenMints.length} tokens for wallet ${walletAddress}`);
    console.log(`[Dashboard] Token mints:`, tokenMints);
    console.log(`[Dashboard] Request origin:`, req.headers.origin || 'no origin');
    console.log(`[Dashboard] User-Agent:`, req.headers['user-agent'] || 'no user-agent');
    console.log(`[Dashboard] Referer:`, req.headers.referer || 'no referer');
    
    // Add stack trace to see if it's being called internally
    console.log(`[Dashboard] Stack trace:`, new Error().stack);
    
    // TEMPORARY: Block registration of more than 5 tokens to prevent the bug
    if (tokenMints.length > 5) {
      console.error(`[Dashboard] BLOCKED: Attempted to register ${tokenMints.length} tokens - this is likely a bug!`);
      return res.status(400).json({ 
        error: 'Too many tokens - registration blocked to prevent bug',
        details: `Attempted to register ${tokenMints.length} tokens, max allowed is 5`
      });
    }

    // Mark these tokens for immediate price fetching
    let addedCount = 0;
    const validMints: string[] = [];
    
    for (const mint of tokenMints) {
      if (mint && mint.length > 0) {
        validMints.push(mint);
        addedCount++;
      }
    }
    
    // Price polling service removed - tokens are tracked in database
    console.log(`[Dashboard] Registered ${addedCount} tokens`);

    // Also ensure these tokens exist in token_metadata
    let { data: existingTokens } = await supabase
      .from('token_metadata')
      .select('mint, symbol')
      .in('mint', validMints);

    const existingMints = new Set(existingTokens?.map(t => t.mint) || []);
    const newMints = validMints.filter(mint => !existingMints.has(mint));

    // For new tokens, create minimal metadata so they can be polled
    if (newMints.length > 0) {
      console.log(`[Dashboard] Creating metadata for ${newMints.length} new tokens`);
      
      // Create minimal metadata entries for tokens we don't know about yet
      await supabase
        .from('token_metadata')
        .upsert(
          newMints.map(mint => ({
            mint,
            symbol: 'UNKNOWN', // Will be updated when price is fetched
            name: 'Unknown Token',
            is_active: true,
            last_active_at: new Date().toISOString()
          })),
          { onConflict: 'mint' }
        );
        
      // Now query to get all tokens including newly created ones
      const { data: allTokens } = await supabase
        .from('token_metadata')
        .select('mint, symbol')
        .in('mint', validMints);
        
      existingTokens = allTokens || [];
    }
    
    // Price polling service removed - prices now updated on-demand
    if (existingTokens && existingTokens.length > 0) {
      console.log(`[Dashboard] ${existingTokens.length} tokens ready for price updates`);

      // NEW: trigger immediate price discovery for these tokens (max 20 to avoid overload)
      const mintsToFetch = validMints.slice(0, 20);
      console.log(`[Dashboard] Fetching prices for first ${mintsToFetch.length} tokens...`);
      try {
        await priceDiscoveryService.getTokenPrices(mintsToFetch);
        console.log('[Dashboard] Price discovery complete');
      } catch (e) {
        console.error('[Dashboard] Error fetching prices immediately:', e);
      }
      
      // Trigger comprehensive data population for new tokens
      if (newMints.length > 0) {
        const { tokenDataPopulator } = await import('../services/TokenDataPopulator');
        for (const mint of newMints) {
          console.log(`[Dashboard] Triggering data population for new token: ${mint}`);
          tokenDataPopulator.populateTokenData(mint, walletAddress)
            .catch(error => {
              console.error(`[Dashboard] Failed to populate data for ${mint}:`, error);
            });
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Registered ${validMints.length} tokens for price updates`,
      registered: addedCount,
      immediatelyFetched: Math.min(existingTokens?.length || 0, 5)
    });

  } catch (error) {
    console.error('[Dashboard] Error registering tokens:', error);
    res.status(500).json({ error: 'Failed to register tokens' });
  }
});

// Endpoint to populate data for a specific token
router.post('/api/tokens/populate-data', async (req: Request, res: Response) => {
  try {
    const { tokenMint, walletAddress } = req.body;
    
    if (!tokenMint || !walletAddress) {
      return res.status(400).json({ 
        error: 'tokenMint and walletAddress required' 
      });
    }
    
    console.log(`[Dashboard] Triggering data population for ${tokenMint}`);
    
    // Import and use tokenDataPopulator
    const { tokenDataPopulator } = await import('../services/TokenDataPopulator');
    
    // Start data population asynchronously
    tokenDataPopulator.populateTokenData(tokenMint, walletAddress)
      .then(() => {
        console.log(`[Dashboard] Data population completed for ${tokenMint}`);
      })
      .catch(error => {
        console.error(`[Dashboard] Data population failed for ${tokenMint}:`, error);
      });
    
    res.json({ 
      success: true, 
      message: 'Data population started',
      tokenMint
    });
    
  } catch (error) {
    console.error('[Dashboard] Error starting data population:', error);
    res.status(500).json({ error: 'Failed to start data population' });
  }
});

// Get active dashboard sessions (for monitoring)
router.get('/api/dashboard/active-tokens', async (req: Request, res: Response) => {
  try {
    // Get recently active tokens from database
    const { data: activeTokens } = await supabase
      .from('token_metadata')
      .select('mint')
      .eq('is_active', true)
      .gte('last_active_at', new Date(Date.now() - 300000).toISOString()) // Active in last 5 minutes
      .limit(100);
    
    const tokenMints = activeTokens?.map(t => t.mint) || [];
    
    res.json({ 
      success: true, 
      count: tokenMints.length,
      tokens: tokenMints
    });
  } catch (error) {
    console.error('[Dashboard] Error getting active tokens:', error);
    res.status(500).json({ error: 'Failed to get active tokens' });
  }
});

// Test endpoint to check token prices in database
router.get('/api/dashboard/check-prices', async (req: Request, res: Response) => {
  try {
    // Get some token prices from database
    const { data: prices } = await supabase
      .from('token_prices')
      .select('token_mint, symbol, price, updated_at')
      .limit(10)
      .order('updated_at', { ascending: false });
      
    res.json({ 
      success: true, 
      count: prices?.length || 0,
      prices: prices || []
    });
  } catch (error) {
    console.error('[Dashboard] Error checking prices:', error);
    res.status(500).json({ error: 'Failed to check prices' });
  }
});

export default router;