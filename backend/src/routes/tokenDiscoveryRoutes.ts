import { Router, Request, Response } from 'express';
import { heliusTokenDiscoveryService } from '../services/HeliusTokenDiscoveryService';

const router = Router();

/**
 * POST /api/webhook/token-mint
 * Handle token mint events from Helius webhook
 */
router.post('/webhook/token-mint', async (req: Request, res: Response) => {
  try {
    console.log('Received token mint webhook from Helius');
    
    // Process the webhook data
    await heliusTokenDiscoveryService.processTokenMintWebhook(req.body);
    
    // Acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing token mint webhook:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/webhook/pump-token
 * Handle pump.fun specific token events
 */
router.post('/webhook/pump-token', async (req: Request, res: Response) => {
  try {
    console.log('Received pump.fun token webhook from Helius');
    
    // Check if this is a token creation transaction
    const isPumpTokenCreation = req.body.instructions?.some((instruction: any) => 
      instruction.programId === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwzK1P' &&
      instruction.data // Contains encoded instruction data
    );
    
    if (isPumpTokenCreation) {
      await heliusTokenDiscoveryService.processTokenMintWebhook(req.body);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing pump token webhook:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/token-discovery/register-webhooks
 * Register Helius webhooks for token discovery
 */
router.post('/register-webhooks', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'webhookUrl is required'
      });
    }
    
    await heliusTokenDiscoveryService.registerWebhooks(webhookUrl);
    
    res.json({
      success: true,
      message: 'Webhooks registered successfully'
    });
  } catch (error) {
    console.error('Error registering webhooks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;