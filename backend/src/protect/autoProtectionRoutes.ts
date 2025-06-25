import { Router, Request, Response } from 'express';
import { simpleAutoProtectionService } from './SimpleAutoProtectionService';

const router = Router();

// Enable auto-protection for a wallet
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const { walletAddress, settings } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const success = await simpleAutoProtectionService.enableAutoProtection(walletAddress, settings);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Auto-protection enabled',
        walletAddress 
      });
    } else {
      res.status(500).json({ error: 'Failed to enable auto-protection' });
    }
  } catch (error) {
    console.error('Error enabling auto-protection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable auto-protection for a wallet
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const success = await simpleAutoProtectionService.disableAutoProtection(walletAddress);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Auto-protection disabled',
        walletAddress 
      });
    } else {
      res.status(500).json({ error: 'Failed to disable auto-protection' });
    }
  } catch (error) {
    console.error('Error disabling auto-protection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get auto-protection status
router.get('/status/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const status = await simpleAutoProtectionService.getStatus(walletAddress);

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting auto-protection status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update auto-protection settings
router.put('/settings/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Settings required' });
    }

    // SimpleAutoProtectionService doesn't have updateSettings yet, 
    // for now just enable with new settings
    const success = await simpleAutoProtectionService.enableAutoProtection(walletAddress, settings);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Settings updated' 
      });
    } else {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually sync auto-protection for a wallet
router.post('/sync/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Trigger re-protection of wallet tokens
    await simpleAutoProtectionService.enableAutoProtection(walletAddress);
    const status = await simpleAutoProtectionService.getStatus(walletAddress);
    const protectedCount = status.protectedTokensCount || 0;

    res.json({
      success: true,
      protectedCount,
      message: `Protected ${protectedCount} tokens`
    });
  } catch (error) {
    console.error('Error syncing auto-protection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk toggle protection for all tokens
router.post('/bulk-toggle/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled parameter must be boolean' });
    }

    let success = false;
    let protectedCount = 0;

    if (enabled) {
      // Enable auto-protection (will protect all wallet tokens)
      success = await simpleAutoProtectionService.enableAutoProtection(walletAddress);
      if (success) {
        const status = await simpleAutoProtectionService.getStatus(walletAddress);
        protectedCount = status.protectedTokensCount || 0;
      }
    } else {
      // Disable auto-protection (will unprotect all tokens)
      success = await simpleAutoProtectionService.disableAutoProtection(walletAddress);
    }

    if (success) {
      res.json({
        success: true,
        enabled,
        protectedCount,
        message: enabled 
          ? `Auto-protection enabled. Protected ${protectedCount} tokens.`
          : 'Auto-protection disabled. All tokens unprotected.'
      });
    } else {
      res.status(500).json({ 
        error: `Failed to ${enabled ? 'enable' : 'disable'} auto-protection` 
      });
    }
  } catch (error) {
    console.error('Error in bulk toggle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;