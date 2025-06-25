import { Router, Request, Response } from 'express';
import { poolMonitoringService } from '../services/PoolMonitoringService';
import { simpleAutoProtectionService } from '../protect/SimpleAutoProtectionService';

const router = Router();

/**
 * POST /api/pool-protection/protect
 * Protect a token using pool monitoring
 */
router.post('/protect', async (req: Request, res: Response) => {
  try {
    const { tokenMint, walletAddress, poolAddress } = req.body;

    if (!tokenMint || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token mint and wallet address are required',
      });
    }

    // If poolAddress is provided, use a different method
    let success = false;
    let finalPoolAddress = poolAddress;

    console.log('Pool protection request:', { tokenMint, walletAddress, poolAddress });

    if (poolAddress) {
      // Direct pool monitoring with provided address
      console.log('Using provided pool address:', poolAddress);
      success = await poolMonitoringService.protectTokenWithPool(tokenMint, walletAddress, poolAddress);
    } else {
      // Try to find pool automatically
      console.log('Attempting to find pool automatically for token:', tokenMint);
      success = await poolMonitoringService.protectToken(tokenMint, walletAddress);
      if (success) {
        finalPoolAddress = await poolMonitoringService['findMainPool'](tokenMint);
      }
    }

    if (success) {
      res.json({
        success: true,
        message: 'Token protected successfully',
        poolAddress: finalPoolAddress,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to protect token. Pool address might be required.',
      });
    }
  } catch (error) {
    console.error('Error protecting token:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/pool-protection/unprotect
 * Remove protection from a token
 */
router.post('/unprotect', async (req: Request, res: Response) => {
  try {
    const { tokenMint, walletAddress } = req.body;

    if (!tokenMint || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token mint and wallet address are required',
      });
    }

    const success = await poolMonitoringService.unprotectToken(tokenMint, walletAddress);

    if (success) {
      res.json({
        success: true,
        message: 'Token unprotected successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to unprotect token',
      });
    }
  } catch (error) {
    console.error('Error unprotecting token:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/pool-protection/status/:tokenMint
 * Get protection status for a token
 */
router.get('/status/:tokenMint', async (req: Request, res: Response) => {
  try {
    const { tokenMint } = req.params;

    const isProtected = poolMonitoringService.isTokenProtected(tokenMint);
    
    if (isProtected) {
      // Get pool info
      const poolAddress = await poolMonitoringService['findMainPool'](tokenMint);
      
      res.json({
        isProtected: true,
        poolAddress,
        lastUpdate: new Date().toISOString(),
      });
    } else {
      res.json({
        isProtected: false,
      });
    }
  } catch (error) {
    console.error('Error getting protection status:', error);
    res.status(500).json({
      isProtected: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/pool-protection/auto-protect
 * Enable auto-protection for a wallet
 */
router.post('/auto-protect', async (req: Request, res: Response) => {
  try {
    const { walletAddress, settings } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }

    const success = await simpleAutoProtectionService.enableAutoProtection(
      walletAddress,
      settings
    );

    if (success) {
      res.json({
        success: true,
        message: 'Auto-protection enabled successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to enable auto-protection',
      });
    }
  } catch (error) {
    console.error('Error enabling auto-protection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * DELETE /api/pool-protection/auto-protect
 * Disable auto-protection for a wallet
 */
router.delete('/auto-protect', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }

    const success = await simpleAutoProtectionService.disableAutoProtection(walletAddress);

    if (success) {
      res.json({
        success: true,
        message: 'Auto-protection disabled successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to disable auto-protection',
      });
    }
  } catch (error) {
    console.error('Error disabling auto-protection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/pool-protection/auto-protect/status/:walletAddress
 * Get auto-protection status for a wallet
 */
router.get('/auto-protect/status/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const status = await simpleAutoProtectionService.getStatus(walletAddress);
    
    res.json(status);
  } catch (error) {
    console.error('Error getting auto-protection status:', error);
    res.status(500).json({
      enabled: false,
      settings: null,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/pool-protection/test
 * Test endpoint to verify service is working
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const isServiceReady = poolMonitoringService !== null;
    const protectedCount = poolMonitoringService?.getProtectedTokens().length || 0;
    
    res.json({
      success: true,
      message: 'Pool protection service is running',
      serviceReady: isServiceReady,
      protectedTokens: protectedCount
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Service check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pool-protection/test-protect
 * Test protection with hardcoded values
 */
router.post('/test-protect', async (req: Request, res: Response) => {
  try {
    const testToken = 'So11111111111111111111111111111111111111112'; // SOL
    const testWallet = '11111111111111111111111111111111'; // Test wallet
    const testPool = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'; // SOL/USDC pool
    
    console.log('TEST: Protecting token with hardcoded values');
    
    const success = await poolMonitoringService.protectTokenWithPool(
      testToken,
      testWallet,
      testPool
    );
    
    res.json({
      success,
      message: success ? 'Test protection successful' : 'Test protection failed',
      details: {
        token: testToken,
        wallet: testWallet,
        pool: testPool
      }
    });
  } catch (error) {
    console.error('Test protect error:', error);
    res.status(500).json({
      success: false,
      message: 'Test protection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pool-protection/simulate-rugpull
 * Simulate a rugpull for testing
 */
router.post('/simulate-rugpull', async (req: Request, res: Response) => {
  try {
    const { tokenMint, liquidityDrop = 80 } = req.body;
    
    if (!tokenMint) {
      return res.status(400).json({
        success: false,
        message: 'Token mint is required'
      });
    }
    
    console.log(`SIMULATING RUGPULL: Token ${tokenMint}, liquidity drop ${liquidityDrop}%`);
    
    // Get pool monitoring service instance
    const monitoringService = poolMonitoringService as any;
    
    // Find the pool data
    const monitoredPools = monitoringService.monitoredPools;
    let poolData = null;
    let poolAddress = null;
    
    for (const [addr, data] of monitoredPools) {
      if (data.tokenMint === tokenMint) {
        poolData = data;
        poolAddress = addr;
        break;
      }
    }
    
    if (!poolData) {
      return res.status(404).json({
        success: false,
        message: 'Token is not being monitored'
      });
    }
    
    // Simulate liquidity drop
    const oldLiquidity = poolData.currentLiquidity;
    const newLiquidity = oldLiquidity * (1 - liquidityDrop / 100);
    
    // Emit rugpull alert through monitoring service
    monitoringService.emit('rugpull:detected', {
      tokenMint,
      poolAddress,
      type: 'LIQUIDITY_REMOVAL',
      severity: 'HIGH',
      liquidityChange: liquidityDrop,
      timestamp: new Date()
    });
    
    // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
    // Rugpull alerts are automatically broadcast when written to database
    
    // Write rugpull alert to database for Supabase Realtime
    const supabase = require('../utils/supabaseClient').default;
    await supabase
      .from('rugpull_alerts')
      .insert({
        token_mint: tokenMint,
        wallet_address: '*',
        severity: 'HIGH',
        liquidity_drop: liquidityDrop,
        message: `SIMULATION: Liquidity dropped ${liquidityDrop}% - LIQUIDITY_REMOVAL`
      });
    
    // Also write to pool_updates for realtime liquidity change
    await supabase
      .from('pool_updates')
      .insert({
        pool_address: poolAddress,
        token_mint: tokenMint,
        update_type: 'liquidity',
        old_value: oldLiquidity,
        new_value: newLiquidity,
        change_percentage: -liquidityDrop,
        metadata: {
          source: 'rugpull_simulation',
          timestamp: Date.now()
        }
      });
    
    res.json({
      success: true,
      message: 'Rugpull simulation triggered',
      details: {
        tokenMint,
        poolAddress,
        oldLiquidity,
        newLiquidity,
        liquidityDrop: `${liquidityDrop}%`
      }
    });
  } catch (error) {
    console.error('Simulate rugpull error:', error);
    res.status(500).json({
      success: false,
      message: 'Simulation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pool-protection/discover
 * Discover pools for a token without enabling protection
 */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { tokenMint, walletAddress } = req.body;

    if (!tokenMint || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token mint and wallet address are required',
      });
    }

    console.log('Pool discovery request:', { tokenMint, walletAddress });

    // Import and create pool discovery service
    const { EnhancedPoolDiscoveryService } = await import('../services/EnhancedPoolDiscoveryService');
    const { Connection } = await import('@solana/web3.js');
    const config = await import('../config');
    
    const connection = new Connection(config.default.heliusRpcUrl);
    const poolDiscoveryService = new EnhancedPoolDiscoveryService(connection);
    
    // Discover pool for the token
    const pool = await poolDiscoveryService.discoverPool(tokenMint);
    console.log(`Pool discovery result for token ${tokenMint}:`, pool);
    
    const pools = pool ? [pool] : [];
    
    if (pools.length > 0) {
      // Store pool information in database
      const supabase = require('../utils/supabaseClient').default;
      const mainPool = pools[0]; // Use the first pool as the main pool
      
      // Update wallet_tokens with pool information
      await supabase
        .from('wallet_tokens')
        .update({
          pool_address: mainPool.address,
          dex_name: mainPool.type,
          updated_at: new Date().toISOString()
        })
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress);
      
      // Also update protected_tokens if it exists
      await supabase
        .from('protected_tokens')
        .update({
          pool_address: mainPool.address,
          updated_at: new Date().toISOString()
        })
        .eq('token_mint', tokenMint)
        .eq('wallet_address', walletAddress);
      
      res.json({
        success: true,
        message: 'Pool discovered successfully',
        poolAddress: mainPool.address,
        dex: mainPool.type,
        poolCount: pools.length
      });
    } else {
      res.json({
        success: false,
        message: 'No pools found for token',
        poolCount: 0
      });
    }
  } catch (error) {
    console.error('Error discovering pools:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * WebSocket endpoint for real-time pool monitoring events
 * WS /api/pool-protection/stream/:tokenMint
 */
// This would be handled separately in the WebSocket service

export default router;