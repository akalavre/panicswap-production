/**
 * FrontrunnerService Test Suite
 */

import { FrontrunnerService } from '../../src/services/FrontrunnerService';
import { Connection } from '@solana/web3.js';
import { eventBus } from '../../src/services/EventBus';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456
    })
  })),
  Transaction: jest.fn(),
  VersionedTransaction: jest.fn()
}));

jest.mock('../../src/services/TransactionCache');
jest.mock('../../src/services/PrioritySender');
jest.mock('../../src/services/BlockhashRefreshService');
jest.mock('../../src/utils/supabaseClient', () => ({
  default: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}));

describe('FrontrunnerService', () => {
  let service: FrontrunnerService;
  let mockConnection: jest.Mocked<Connection>;
  let mockTransactionCache: any;
  let mockPrioritySender: any;
  let mockBlockhashService: any;

  beforeEach(() => {
    // Create mocks
    mockConnection = new Connection('') as jest.Mocked<Connection>;
    mockTransactionCache = {
      getTransaction: jest.fn(),
      getPriorityVariants: jest.fn()
    };
    mockPrioritySender = {
      sendTransaction: jest.fn(),
      sendBundle: jest.fn()
    };
    mockBlockhashService = {
      getValidBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 123456
      })
    };
    
    // Create service
    service = new FrontrunnerService(
      mockConnection,
      mockTransactionCache,
      mockPrioritySender,
      mockBlockhashService
    );
  });

  afterEach(() => {
    service.stop();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
      expect((service as any).isRunning).toBe(false);
      expect((service as any).executionQueue.size).toBe(0);
    });

    it('should start when start() is called', () => {
      service.start();
      expect((service as any).isRunning).toBe(true);
    });

    it('should stop when stop() is called', () => {
      service.start();
      service.stop();
      expect((service as any).isRunning).toBe(false);
    });
  });

  describe('Threat Handling', () => {
    it('should queue threats for execution', () => {
      service.start();

      const threat = {
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      };

      service.handleThreat(threat);

      expect((service as any).executionQueue.size).toBe(1);
      expect((service as any).executionQueue.has('wallet-123:token-123')).toBe(true);
    });

    it('should calculate priority fee based on risk level', () => {
      const baseFee = (service as any).config.baseFeeMicroLamports;
      
      const criticalFee = (service as any).calculatePriorityFee('CRITICAL', 1.5);
      expect(criticalFee).toBe(baseFee * 3 * 1.5);
      
      const highFee = (service as any).calculatePriorityFee('HIGH', 1.5);
      expect(highFee).toBe(baseFee * 2 * 1.5);
      
      const mediumFee = (service as any).calculatePriorityFee('MEDIUM', 1.5);
      expect(mediumFee).toBe(baseFee * 1.5 * 1.5);
    });

    it('should respect max priority fee limit', () => {
      const maxFee = (service as any).config.maxPriorityFeeMicroLamports;
      
      const fee = (service as any).calculatePriorityFee('CRITICAL', 100);
      expect(fee).toBeLessThanOrEqual(maxFee);
    });
  });

  describe('Transaction Execution', () => {
    it('should execute cached transactions', async () => {
      service.start();

      // Mock cached transaction
      const mockTx = { serialize: jest.fn().mockReturnValue(Buffer.from('mock-tx')) };
      mockTransactionCache.getTransaction.mockResolvedValue({
        transaction: mockTx,
        metadata: {
          priorityFee: 10000,
          computeUnits: 200000
        }
      });

      // Mock successful send
      mockPrioritySender.sendTransaction.mockResolvedValue({
        signature: 'mock-sig-123',
        confirmationTime: 150
      });

      // Add threat to queue
      (service as any).executionQueue.set('wallet-123:token-123', {
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      // Execute
      const result = await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(result.success).toBe(true);
      expect(result.signature).toBe('mock-sig-123');
      expect(mockTransactionCache.getTransaction).toHaveBeenCalled();
      expect(mockPrioritySender.sendTransaction).toHaveBeenCalled();
    });

    it('should handle missing cached transactions', async () => {
      service.start();

      // No cached transaction
      mockTransactionCache.getTransaction.mockResolvedValue(null);

      const result = await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No cached transaction');
      expect(mockPrioritySender.sendTransaction).not.toHaveBeenCalled();
    });

    it('should retry with escalating fees on failure', async () => {
      service.start();

      const mockTx = { serialize: jest.fn().mockReturnValue(Buffer.from('mock-tx')) };
      mockTransactionCache.getTransaction.mockResolvedValue({
        transaction: mockTx,
        metadata: {
          priorityFee: 10000,
          computeUnits: 200000
        }
      });

      // Mock failures then success
      mockPrioritySender.sendTransaction
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValueOnce({
          signature: 'success-123',
          confirmationTime: 200
        });

      const result = await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(result.success).toBe(true);
      expect(mockPrioritySender.sendTransaction).toHaveBeenCalledTimes(3);
      expect(result.attemptsMade).toBe(3);
    });
  });

  describe('Circuit Breaker', () => {
    it('should track execution failures', async () => {
      service.start();

      // Mock consistent failures
      mockTransactionCache.getTransaction.mockResolvedValue({
        transaction: { serialize: jest.fn().mockReturnValue(Buffer.from('mock-tx')) },
        metadata: { priorityFee: 10000, computeUnits: 200000 }
      });
      mockPrioritySender.sendTransaction.mockRejectedValue(new Error('Failed'));

      // Execute multiple times
      for (let i = 0; i < 6; i++) {
        await (service as any).executeThreatResponse({
          tokenMint: 'token-123',
          walletAddress: 'wallet-123',
          analysis: {
            type: 'LIQUIDITY_REMOVAL',
            riskLevel: 'CRITICAL',
            confidence: 0.95
          },
          priorityFeeMultiplier: 2.0
        });
      }

      // Check if circuit breaker is triggered
      const isTripped = (service as any).isCircuitBreakerTripped();
      expect(isTripped).toBe(true);
    });

    it('should prevent execution when circuit breaker is tripped', async () => {
      service.start();

      // Trip the circuit breaker
      (service as any).recentExecutions = Array(6).fill({
        timestamp: Date.now(),
        success: false
      });

      const result = await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker');
      expect(mockTransactionCache.getTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit execution-success event on success', async () => {
      service.start();

      const successListener = jest.fn();
      service.on('execution-success', successListener);

      mockTransactionCache.getTransaction.mockResolvedValue({
        transaction: { serialize: jest.fn().mockReturnValue(Buffer.from('mock-tx')) },
        metadata: { priorityFee: 10000, computeUnits: 200000 }
      });
      mockPrioritySender.sendTransaction.mockResolvedValue({
        signature: 'success-123',
        confirmationTime: 150
      });

      await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(successListener).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenMint: 'token-123',
          walletAddress: 'wallet-123',
          signature: 'success-123'
        })
      );
    });

    it('should emit execution-failed event on failure', async () => {
      service.start();

      const failedListener = jest.fn();
      service.on('execution-failed', failedListener);

      mockTransactionCache.getTransaction.mockResolvedValue(null);

      await (service as any).executeThreatResponse({
        tokenMint: 'token-123',
        walletAddress: 'wallet-123',
        analysis: {
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          confidence: 0.95
        },
        priorityFeeMultiplier: 2.0
      });

      expect(failedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenMint: 'token-123',
          walletAddress: 'wallet-123',
          error: expect.any(String)
        })
      );
    });
  });

  describe('Performance', () => {
    it('should provide execution statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('recentExecutions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('circuitBreakerStatus');
    });
  });
});