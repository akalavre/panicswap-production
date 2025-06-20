import { Router, Request, Response } from 'express';
import protectedTokensRouter from './protectedTokensRoutes';

const router = Router();

/**
 * Alias routes for cleaner frontend API calls
 * These routes forward to the existing protected-tokens endpoints
 */

/**
 * POST /api/protection/enable
 * Alias for POST /api/protected-tokens
 */
router.post('/enable', (req: Request, res: Response, next) => {
  // Forward to the protected-tokens POST handler
  req.url = '/';
  protectedTokensRouter(req, res, next);
});

/**
 * POST /api/protection/disable
 * Alias for DELETE /api/protected-tokens
 */
router.post('/disable', (req: Request, res: Response, next) => {
  // Convert to DELETE method and forward
  req.method = 'DELETE';
  req.url = '/';
  protectedTokensRouter(req, res, next);
});

/**
 * GET /api/protection/status/:walletAddress
 * Alias for GET /api/protected-tokens/:walletAddress
 */
router.get('/status/:walletAddress', (req: Request, res: Response, next) => {
  // Forward to the protected-tokens GET handler
  req.url = `/${req.params.walletAddress}`;
  protectedTokensRouter(req, res, next);
});

/**
 * GET /api/protection/settings/:mint
 * Alias for GET /api/protected-tokens/settings/:mint
 */
router.get('/settings/:mint', (req: Request, res: Response, next) => {
  // Forward to the protected-tokens settings handler
  req.url = `/settings/${req.params.mint}`;
  protectedTokensRouter(req, res, next);
});

export default router;