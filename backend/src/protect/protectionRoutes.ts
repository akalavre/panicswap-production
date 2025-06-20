import { Router, Request, Response } from 'express';
import { protectionService } from './ProtectionService';
import { createSwapService } from './SwapService';
import { Connection } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';
import config from '../config';

const router = Router();
const connection = new Connection(config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com');
const swapService = createSwapService(connection);

// Add protection for a token
router.post('/protect', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint, settings, tokenInfo } = req.body;

    if (!walletAddress || !tokenMint || !settings) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate settings
    const requiredSettings = ['priceDropThreshold', 'liquidityDropThreshold', 'gasBoost', 'slippageTolerance', 'autoSell'];
    for (const field of requiredSettings) {
      if (settings[field] === undefined) {
        return res.status(400).json({ error: `Missing required setting: ${field}` });
      }
    }

    // Get token info if not provided
    let finalTokenInfo = tokenInfo;
    if (!finalTokenInfo || !finalTokenInfo.symbol) {
      const { data: tokenData } = await supabase
        .from('token_metadata')
        .select('symbol, name')
        .eq('mint', tokenMint)
        .single();

      if (tokenData) {
        finalTokenInfo = {
          ...finalTokenInfo,
          symbol: tokenData.symbol,
          name: tokenData.name
        };
      }
    }

    // Get current price if not provided
    if (!finalTokenInfo?.currentPrice) {
      const { data: priceData } = await supabase
        .from('token_prices')
        .select('price_usd')
        .eq('token_mint', tokenMint)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (priceData) {
        finalTokenInfo = {
          ...finalTokenInfo,
          currentPrice: priceData.price_usd
        };
      }
    }

    const protection = await protectionService.addProtection(
      walletAddress,
      tokenMint,
      settings,
      finalTokenInfo
    );

    if (!protection) {
      return res.status(500).json({ error: 'Failed to add protection' });
    }

    res.json({ success: true, protection });
  } catch (error) {
    console.error('Error in /protect endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update protection settings
router.put('/protect/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Missing settings' });
    }

    const success = await protectionService.updateProtection(walletAddress, tokenMint, settings);

    if (!success) {
      return res.status(404).json({ error: 'Protection not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in update protection endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove protection
router.delete('/protect/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;

    const success = await protectionService.removeProtection(walletAddress, tokenMint);

    if (!success) {
      return res.status(404).json({ error: 'Protection not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in remove protection endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all protections for a wallet
router.get('/protect/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const protections = await protectionService.getWalletProtections(walletAddress);

    // Enrich with current prices
    const enrichedProtections = await Promise.all(
      protections.map(async (protection) => {
        const { data: priceData } = await supabase
          .from('token_prices')
          .select('price_usd, last_updated')
          .eq('token_mint', protection.token_mint)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();

        return {
          ...protection,
          current_price: priceData?.price_usd || 0,
          price_last_updated: priceData?.last_updated
        };
      })
    );

    res.json({ protections: enrichedProtections });
  } catch (error) {
    console.error('Error in get protections endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if a token is protected
router.get('/protect/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;

    const isProtected = await protectionService.isTokenProtected(walletAddress, tokenMint);

    if (!isProtected) {
      return res.json({ protected: false });
    }

    // Get full protection details
    const { data: protection } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('token_mint', tokenMint)
      .single();

    res.json({ protected: true, protection });
  } catch (error) {
    console.error('Error in check protection endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get protection alerts for a wallet
router.get('/alerts/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data: alerts, error } = await supabase
      .from('protection_alerts')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Error in get alerts endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Acknowledge an alert
router.put('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    const { error } = await supabase
      .from('protection_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in acknowledge alert endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get protection events for a token
router.get('/events/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data: events, error } = await supabase
      .from('protection_events')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('token_mint', tokenMint)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({ events: events || [] });
  } catch (error) {
    console.error('Error in get events endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute manual swap for protected token
router.post('/swap/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;
    const { amount, slippageBps, priorityFeeMultiplier } = req.body;

    // Verify token is protected
    const isProtected = await protectionService.isTokenProtected(walletAddress, tokenMint);
    if (!isProtected) {
      return res.status(403).json({ error: 'Token is not protected' });
    }

    // Get token details
    const { data: tokenData } = await supabase
      .from('token_metadata')
      .select('decimals, symbol')
      .eq('mint', tokenMint)
      .single();

    const decimals = tokenData?.decimals || 9;

    // If no amount specified, get wallet balance
    let swapAmount = amount;
    if (!swapAmount) {
      const { data: walletToken } = await supabase
        .from('wallet_tokens')
        .select('balance')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (!walletToken || !walletToken.balance) {
        return res.status(400).json({ error: 'No token balance found' });
      }

      swapAmount = Math.floor(walletToken.balance * Math.pow(10, decimals));
    }

    // Execute swap (without private key - for manual signing)
    const swapResult = await swapService.executeSwapToSol({
      walletAddress,
      tokenMint,
      tokenAmount: swapAmount,
      tokenDecimals: decimals,
      slippageBps: slippageBps || 500,
      priorityFeeMultiplier: priorityFeeMultiplier || 1.5
    });

    if (swapResult.success) {
      // Log manual swap event
      await supabase
        .from('protection_events')
        .insert({
          wallet_address: walletAddress,
          token_mint: tokenMint,
          event_type: 'manual_swap',
          event_data: {
            amount: swapAmount,
            outputAmount: swapResult.outputAmount,
            signature: swapResult.signature
          }
        });

      res.json({
        success: true,
        outputAmount: swapResult.outputAmount,
        signature: swapResult.signature
      });
    } else {
      res.status(400).json({
        success: false,
        error: swapResult.error
      });
    }
  } catch (error) {
    console.error('Error in manual swap endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulate swap for protected token
router.post('/swap/simulate/:walletAddress/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenMint } = req.params;
    const { amount, slippageBps } = req.body;

    // Get token details
    const { data: tokenData } = await supabase
      .from('token_metadata')
      .select('decimals, symbol')
      .eq('mint', tokenMint)
      .single();

    const decimals = tokenData?.decimals || 9;

    // If no amount specified, get wallet balance
    let swapAmount = amount;
    if (!swapAmount) {
      const { data: walletToken } = await supabase
        .from('wallet_tokens')
        .select('balance')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (!walletToken || !walletToken.balance) {
        return res.status(400).json({ error: 'No token balance found' });
      }

      swapAmount = Math.floor(walletToken.balance * Math.pow(10, decimals));
    }

    // Simulate swap
    const simulation = await swapService.simulateSwap({
      walletAddress,
      tokenMint,
      tokenAmount: swapAmount,
      tokenDecimals: decimals,
      slippageBps: slippageBps || 500
    });

    if (simulation) {
      res.json({
        success: true,
        simulation
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to simulate swap'
      });
    }
  } catch (error) {
    console.error('Error in swap simulation endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;