import { Router, Request, Response } from 'express';
import supabase from '../utils/supabaseClient';
import { poolMonitoringService } from '../services/PoolMonitoringService';
import { protectionServiceFacade } from '../services/ProtectionServiceFacade';
import { liquidityVelocityTracker } from '../services/LiquidityVelocityTracker';

const router = Router();

/**
 * POST /api/protected-tokens
 * Create or update protection settings for a token
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      tokenMint, 
      walletAddress, 
      settings,
      poolAddress 
    } = req.body;

    if (!tokenMint || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token mint and wallet address are required',
      });
    }

    // Extract settings with proper defaults
    const {
      priceThreshold = 15,
      liquidityThreshold = 30,
      devWalletEnabled = true,
      gasBoost = 1
    } = settings || {};

    console.log(`[ProtectedTokens] Saving protection settings for ${tokenMint}:`, {
      priceThreshold,
      liquidityThreshold,
      devWalletEnabled,
      gasBoost
    });

    // Save protection settings to database
    const { data, error } = await supabase
      .from('protected_tokens')
      .upsert({
        token_mint: tokenMint,
        wallet_address: walletAddress,
        is_active: true,
        pool_address: poolAddress,
        price_threshold: priceThreshold,
        liquidity_threshold: liquidityThreshold,
        dev_wallet_monitoring: devWalletEnabled,
        gas_boost: gasBoost,
        monitoring_active: true,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'token_mint,wallet_address' 
      })
      .select()
      .single();

    if (error) {
      console.error('[ProtectedTokens] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save protection settings',
        error: error.message
      });
    }

    // Start pool monitoring if not already active
    // Use facade to handle demo vs real protection
    const useDemo = req.query.demo === 'true' || req.body.isDemo === true;
    
    if (useDemo || process.env.IS_DEMO_MODE === 'true') {
      console.log(`[ProtectedTokens] Using demo protection for ${tokenMint}`);
      await protectionServiceFacade.protectToken(tokenMint, walletAddress, poolAddress);
    } else {
      console.log(`[ProtectedTokens] Using real protection for ${tokenMint}`);
      if (poolAddress) {
        console.log(`[ProtectedTokens] Starting pool monitoring for ${poolAddress}`);
        await poolMonitoringService.protectTokenWithPool(tokenMint, walletAddress, poolAddress);
      } else {
        console.log(`[ProtectedTokens] Attempting to find pool for ${tokenMint}`);
        await poolMonitoringService.protectToken(tokenMint, walletAddress);
      }
    }
    
    // Start velocity tracking for enhanced rug detection
    await liquidityVelocityTracker.trackToken(tokenMint);
    console.log(`[ProtectedTokens] Started velocity tracking for ${tokenMint}`);

    res.json({
      success: true,
      message: 'Protection settings saved successfully',
      data
    });

  } catch (error) {
    console.error('[ProtectedTokens] Error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/protected-tokens/:walletAddress
 * Get all protected tokens for a wallet
 */
router.get('/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { data, error } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true);

    if (error) {
      console.error('[ProtectedTokens] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch protected tokens',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[ProtectedTokens] Error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/protected-tokens/settings/:mint
 * Get protection settings for a specific token
 */
router.get('/settings/:mint', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }

    const { data, error } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('token_mint', mint)
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[ProtectedTokens] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch protection settings',
        error: error.message
      });
    }

    // Return default settings if no data found
    const settings = data || {
      price_threshold: 15,
      liquidity_threshold: 30,
      dev_wallet_monitoring: true,
      gas_boost: 1.0,
      is_active: false
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('[ProtectedTokens] Error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * DELETE /api/protected-tokens
 * Remove protection from a token
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { tokenMint, walletAddress } = req.body;

    if (!tokenMint || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token mint and wallet address are required',
      });
    }

    // Update database
    const { error } = await supabase
      .from('protected_tokens')
      .update({ 
        is_active: false,
        monitoring_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('token_mint', tokenMint)
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('[ProtectedTokens] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove protection',
        error: error.message
      });
    }

    // Stop pool monitoring
    // Use facade to handle demo vs real protection
    const useDemo = req.query.demo === 'true' || req.body.isDemo === true;
    
    if (useDemo || process.env.IS_DEMO_MODE === 'true') {
      console.log(`[ProtectedTokens] Stopping demo protection for ${tokenMint}`);
      await protectionServiceFacade.unprotectToken(tokenMint, walletAddress);
    } else {
      console.log(`[ProtectedTokens] Stopping real protection for ${tokenMint}`);
      await poolMonitoringService.unprotectToken(tokenMint, walletAddress);
    }

    res.json({
      success: true,
      message: 'Protection removed successfully'
    });

  } catch (error) {
    console.error('[ProtectedTokens] Error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;