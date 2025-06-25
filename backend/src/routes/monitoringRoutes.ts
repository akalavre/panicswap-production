import { Router } from 'express';
import supabase from '../utils/supabaseClient';
import { monitoringStatsService } from '../services/MonitoringStatsService';
import { liquidityVelocityTracker } from '../services/LiquidityVelocityTracker';

const router = Router();

// Start monitoring for a wallet
router.post('/start', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if monitoring already exists
    const { data: existing, error: checkError } = await supabase
      .from('wallet_monitoring')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking monitoring status:', checkError);
      return res.status(500).json({ error: 'Failed to check monitoring status' });
    }

    if (existing) {
      // Update existing monitoring
      const { error: updateError } = await supabase
        .from('wallet_monitoring')
        .update({
          is_active: true,
          last_checked: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        console.error('Error updating monitoring:', updateError);
        return res.status(500).json({ error: 'Failed to update monitoring' });
      }
    } else {
      // Create new monitoring
      const { error: insertError } = await supabase
        .from('wallet_monitoring')
        .insert({
          wallet_address: walletAddress,
          is_active: true,
          last_checked: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating monitoring:', insertError);
        return res.status(500).json({ error: 'Failed to create monitoring' });
      }
    }

    res.json({ 
      success: true, 
      message: 'Monitoring started successfully',
      walletAddress 
    });
  } catch (error) {
    console.error('Error in /api/monitoring/start:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop monitoring for a wallet
router.post('/stop', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const { error } = await supabase
      .from('wallet_monitoring')
      .update({ is_active: false })
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error stopping monitoring:', error);
      return res.status(500).json({ error: 'Failed to stop monitoring' });
    }

    res.json({ 
      success: true, 
      message: 'Monitoring stopped successfully',
      walletAddress 
    });
  } catch (error) {
    console.error('Error in /api/monitoring/stop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monitoring status
router.get('/status/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const { data, error } = await supabase
      .from('wallet_monitoring')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching monitoring status:', error);
      return res.status(500).json({ error: 'Failed to fetch monitoring status' });
    }

    res.json({
      isActive: data?.is_active || false,
      lastChecked: data?.last_checked || null,
      walletAddress
    });
  } catch (error) {
    console.error('Error in /api/monitoring/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Force update monitoring stats for a token (URL params version)
router.post('/force-update/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    const { wallet } = req.query;
    
    if (!tokenMint || !wallet) {
      return res.status(400).json({ error: 'Token mint and wallet address are required' });
    }
    
    console.log(`[MonitoringRoutes] Force updating stats for ${tokenMint} / ${wallet}`);
    
    // Ensure token is being tracked
    await liquidityVelocityTracker.trackToken(tokenMint);
    
    // Force update the stats
    await monitoringStatsService.forceUpdate(tokenMint, wallet as string);
    
    res.json({ 
      success: true, 
      message: 'Monitoring stats update triggered',
      tokenMint,
      walletAddress: wallet
    });
  } catch (error) {
    console.error('Error in force update:', error);
    res.status(500).json({ error: 'Failed to force update monitoring stats' });
  }
});

// Force update monitoring stats for a token (body params version)
router.post('/force-update', async (req, res) => {
  try {
    const { tokenMint, walletAddress } = req.body;
    
    if (!tokenMint || !walletAddress) {
      return res.status(400).json({ error: 'Token mint and wallet address are required' });
    }
    
    console.log(`[MonitoringRoutes] Force updating stats for ${tokenMint} / ${walletAddress}`);
    
    // First, ensure the token is in the protected_tokens table
    const { data: protectedToken } = await supabase
      .from('protected_tokens')
      .select('*')
      .eq('token_mint', tokenMint)
      .eq('wallet_address', walletAddress)
      .single();
      
    if (!protectedToken) {
      console.log(`[MonitoringRoutes] Token ${tokenMint} not found in protected_tokens, cannot track`);
      return res.status(404).json({ error: 'Token not found in protected tokens' });
    }
    
    // Ensure it's active and has mempool monitoring enabled
    if (!protectedToken.is_active || !protectedToken.mempool_monitoring) {
      console.log(`[MonitoringRoutes] Updating token to be active with mempool monitoring`);
      await supabase
        .from('protected_tokens')
        .update({
          is_active: true,
          mempool_monitoring: true
        })
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress);
    }
    
    // Start tracking in liquidity velocity tracker
    await liquidityVelocityTracker.trackToken(tokenMint);
    
    // Start pool monitoring if we have a pool address
    if (protectedToken.pool_address) {
      const { poolMonitoringService } = await import('../services/PoolMonitoringService');
      await poolMonitoringService.protectTokenWithPool(
        tokenMint,
        walletAddress,
        protectedToken.pool_address
      );
    }
    
    // Force update the stats
    await monitoringStatsService.forceUpdate(tokenMint, walletAddress);
    
    res.json({ 
      success: true, 
      message: 'Token tracking initialized and stats updated',
      tokenMint,
      walletAddress,
      details: {
        isActive: true,
        mempoolMonitoring: true,
        hasPoolAddress: !!protectedToken.pool_address
      }
    });
  } catch (error) {
    console.error('Error in force update:', error);
    res.status(500).json({ error: 'Failed to force update monitoring stats' });
  }
});

// Get velocity data for a token
router.get('/velocity/:tokenMint', async (req, res) => {
  try {
    const { tokenMint } = req.params;
    
    const velocityData = await liquidityVelocityTracker.getVelocityData(tokenMint);
    
    if (!velocityData) {
      return res.status(404).json({ error: 'No velocity data found for token' });
    }
    
    res.json(velocityData);
  } catch (error) {
    console.error('Error fetching velocity data:', error);
    res.status(500).json({ error: 'Failed to fetch velocity data' });
  }
});

export default router;