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