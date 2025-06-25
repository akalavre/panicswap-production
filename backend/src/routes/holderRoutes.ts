import { Router } from 'express';
import { heliusTokenHolderService } from '../services/HeliusTokenHolderService';
import { heliusTokenDiscoveryService } from '../services/HeliusTokenDiscoveryService';
import supabase from '../utils/supabaseClient';

const router = Router();

/**
 * Get holder count for a specific token
 */
router.get('/count/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    
    if (!tokenMint) {
      return res.status(400).json({ error: 'Token mint is required' });
    }

    console.log(`Fetching holder count for token: ${tokenMint}`);
    const holderCount = await heliusTokenHolderService.getTokenHolderCount(tokenMint);
    
    // Update database with fresh count
    if (holderCount > 0) {
      await supabase
        .from('token_metadata')
        .update({ 
          holder_count: holderCount,
          updated_at: new Date().toISOString()
        })
        .eq('mint', tokenMint);
    }

    res.json({
      tokenMint,
      holderCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting holder count:', error);
    res.status(500).json({ error: 'Failed to get holder count' });
  }
});

/**
 * Get detailed holder information for a token
 */
router.get('/details/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    const maxPages = parseInt(req.query.maxPages as string) || 5;
    
    if (!tokenMint) {
      return res.status(400).json({ error: 'Token mint is required' });
    }

    console.log(`Fetching detailed holder info for token: ${tokenMint}`);
    const holderDetails = await heliusTokenHolderService.getDetailedHolderInfo(tokenMint, maxPages);
    
    if (!holderDetails) {
      return res.status(404).json({ error: 'Unable to fetch holder details' });
    }

    res.json({
      tokenMint,
      ...holderDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting holder details:', error);
    res.status(500).json({ error: 'Failed to get holder details' });
  }
});

/**
 * Update holder counts for all tokens (or a specific batch)
 */
router.post('/update-all', async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    
    console.log(`Triggering holder count update for up to ${limit} tokens`);
    
    // Run in background - don't wait for completion
    heliusTokenDiscoveryService.updateAllHolderCounts(limit).catch(error => {
      console.error('Error in background holder count update:', error);
    });

    res.json({
      message: `Holder count update started for up to ${limit} tokens`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting holder count update:', error);
    res.status(500).json({ error: 'Failed to start holder count update' });
  }
});

/**
 * Update holder count for a specific token
 */
router.post('/update/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    
    if (!tokenMint) {
      return res.status(400).json({ error: 'Token mint is required' });
    }

    console.log(`Updating holder count for specific token: ${tokenMint}`);
    const holderCount = await heliusTokenHolderService.getTokenHolderCount(tokenMint);
    
    if (holderCount > 0) {
      const { error } = await supabase
        .from('token_metadata')
        .update({ 
          holder_count: holderCount,
          updated_at: new Date().toISOString()
        })
        .eq('mint', tokenMint);

      if (error) {
        throw error;
      }
    }

    res.json({
      tokenMint,
      holderCount,
      updated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating holder count:', error);
    res.status(500).json({ error: 'Failed to update holder count' });
  }
});

export default router;