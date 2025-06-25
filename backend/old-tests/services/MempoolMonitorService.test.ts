/**
 * MempoolMonitorService Test Suite
 */

import { MempoolMonitorService } from '../../src/services/MempoolMonitorService';
import { SolanaWebsocketClient } from '../../src/services/SolanaWebsocketClient';
import { TransactionAnalyzer } from '../../src/services/TransactionAnalyzer';
import { EventEmitter } from 'events';
import { PublicKey } from '@solana/web3.js';

// Mock dependencies
jest.mock('../../src/services/SolanaWebsocketClient');
jest.mock('../../src/services/TransactionAnalyzer');
jest.mock('../../src/services/TransactionCacheService');
jest.mock('../../src/services/ConnectionPool');
jest.mock('../../src/utils/BatchProcessor');
jest.mock('../../src/utils/supabaseClient', () => ({
  default: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    })
  }
}));

describe('MempoolMonitorService', () => {
  let service: MempoolMonitorService;
  let mockWsClient: jest.Mocked<SolanaWebsocketClient>;
  let mockAnalyzer: jest.Mocked<TransactionAnalyzer>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new MempoolMonitorService();
    
    // Get mock instances
    mockWsClient = (service as any).wsClient;
    mockAnalyzer = (service as any).analyzer;
  });

  afterEach(async () => {
    // Stop service if running
    await service.stop();
  });

  describe('Initialization', () => {
    it('should initialize with correct monitored programs', () => {
      const programs = (service as any).monitoredPrograms;
      expect(programs).toContain('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'); // Raydium
      expect(programs).toContain('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'); // Pump.fun
      expect(programs).toContain('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'); // Orca
      expect(programs).toContain('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'); // Jupiter
    });

    it('should initialize bloom filters', () => {
      expect((service as any).tokenBloomFilter).toBeDefined();
      expect((service as any).walletBloomFilter).toBeDefined();
      expect((service as any).poolBloomFilter).toBeDefined();
    });

    it('should initialize message processor', () => {
      expect((service as any).messageProcessor).toBeDefined();
    });
  });

  describe('Start/Stop', () => {
    it('should start monitoring when start() is called', async () => {
      mockWsClient.connect = jest.fn().mockResolvedValue(undefined);
      mockWsClient.subscribeToLogs = jest.fn().mockResolvedValue(1);

      await service.start();

      expect(mockWsClient.connect).toHaveBeenCalled();
      expect(mockWsClient.subscribeToLogs).toHaveBeenCalledTimes(4); // For each program
      expect((service as any).isRunning).toBe(true);
    });

    it('should stop monitoring when stop() is called', async () => {
      mockWsClient.disconnect = jest.fn();
      const messageProcessor = (service as any).messageProcessor;
      messageProcessor.shutdown = jest.fn().mockResolvedValue(undefined);

      await service.start();
      await service.stop();

      expect(mockWsClient.disconnect).toHaveBeenCalled();
      expect(messageProcessor.shutdown).toHaveBeenCalled();
      expect((service as any).isRunning).toBe(false);
    });

    it('should handle start errors gracefully', async () => {
      mockWsClient.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(service.start()).rejects.toThrow('Connection failed');
      expect((service as any).isRunning).toBe(false);
    });
  });

  describe('Protected Token Management', () => {
    it('should load protected tokens from database', async () => {
      const mockTokens = [
        {
          token_mint: 'token1',
          wallet_address: 'wallet1',
          pool_address: 'pool1',
          risk_threshold: 'HIGH',
          priority_fee_multiplier: 1.5
        },
        {
          token_mint: 'token2',
          wallet_address: 'wallet2',
          pool_address: null,
          risk_threshold: 'CRITICAL',
          priority_fee_multiplier: 2.0
        }
      ];

      const supabase = require('../../src/utils/supabaseClient').default;
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockTokens, error: null })
          })
        })
      });

      await (service as any).loadProtectedTokens();

      expect((service as any).protectedTokens.size).toBe(2);
      expect((service as any).protectedTokens.has('token1')).toBe(true);
      expect((service as any).protectedTokens.has('token2')).toBe(true);
    });

    it('should add tokens to bloom filters', async () => {
      const mockTokens = [
        {
          token_mint: 'token1',
          wallet_address: 'wallet1',
          pool_address: 'pool1',
          risk_threshold: 'HIGH',
          priority_fee_multiplier: 1.5
        }
      ];

      const supabase = require('../../src/utils/supabaseClient').default;
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockTokens, error: null })
          })
        })
      });

      const tokenBloomFilter = (service as any).tokenBloomFilter;
      const walletBloomFilter = (service as any).walletBloomFilter;
      const poolBloomFilter = (service as any).poolBloomFilter;

      await (service as any).loadProtectedTokens();

      expect(tokenBloomFilter.contains('token1')).toBe(true);
      expect(walletBloomFilter.contains('wallet1')).toBe(true);
      expect(poolBloomFilter.contains('pool1')).toBe(true);
    });
  });

  describe('Transaction Processing', () => {
    it('should process pending transactions for protected tokens', async () => {
      // Setup protected tokens
      (service as any).protectedTokens.set('token1', [{
        tokenMint: 'token1',
        walletAddress: 'wallet1',
        poolAddress: 'pool1',
        riskThreshold: 'HIGH',
        priorityFeeMultiplier: 1.5
      }]);
      (service as any).tokenBloomFilter.add('token1');

      // Mock log event
      const mockEvent = {
        signature: 'test-sig-123',
        logs: ['Program log: token1', 'removeLiquidity']
      };

      // Mock message processor
      const messageProcessor = (service as any).messageProcessor;
      messageProcessor.processMessage = jest.fn().mockResolvedValue(undefined);

      await (service as any).handlePendingTransaction(mockEvent);

      expect(messageProcessor.processMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          signature: 'test-sig-123',
          logs: mockEvent.logs,
          involvedTokens: expect.arrayContaining(['token1'])
        }),
        expect.any(String)
      );
    });

    it('should skip transactions for non-protected tokens', async () => {
      const mockEvent = {
        signature: 'test-sig-456',
        logs: ['Program log: unknown-token', 'swap']
      };

      const messageProcessor = (service as any).messageProcessor;
      messageProcessor.processMessage = jest.fn();

      await (service as any).handlePendingTransaction(mockEvent);

      expect(messageProcessor.processMessage).not.toHaveBeenCalled();
    });

    it('should determine priority based on log patterns', () => {
      const service = new MempoolMonitorService();
      
      const criticalLogs = ['removeLiquidity detected'];
      const highLogs = ['swap amount 10000000'];
      const normalLogs = ['swap amount 100'];
      const lowLogs = ['balance inquiry'];

      expect((service as any).determinePriority(criticalLogs)).toBe('critical');
      expect((service as any).determinePriority(highLogs)).toBe('high');
      expect((service as any).determinePriority(normalLogs)).toBe('normal');
      expect((service as any).determinePriority(lowLogs)).toBe('low');
    });
  });

  describe('Threat Detection', () => {
    it('should emit threat-detected event for confirmed threats', async () => {
      const threatListener = jest.fn();
      service.on('threat-detected', threatListener);

      // Setup protected tokens
      (service as any).protectedTokens.set('token1', [{
        tokenMint: 'token1',
        walletAddress: 'wallet1',
        poolAddress: 'pool1',
        riskThreshold: 'HIGH',
        priorityFeeMultiplier: 1.5
      }]);

      // Mock threat from message processor
      const mockThreat = {
        signature: 'threat-sig-123',
        threat: {
          type: 'LIQUIDITY_REMOVAL',
          riskScore: 100,
          confidence: 0.95
        },
        timestamp: Date.now()
      };

      // Mock transaction analyzer
      mockAnalyzer.analyzeTransaction = jest.fn().mockResolvedValue({
        isDangerous: true,
        type: 'LIQUIDITY_REMOVAL',
        riskLevel: 'CRITICAL',
        affectedTokens: ['token1']
      });

      // Mock transaction fetch
      const mockTx = { slot: 123, blockTime: Date.now() };
      jest.spyOn(service as any, 'fetchTransactionWithRetry')
        .mockResolvedValue(mockTx);

      await (service as any).handleProcessedThreat(mockThreat);

      expect(threatListener).toHaveBeenCalledWith(
        expect.objectContaining({
          signature: 'threat-sig-123',
          tokenMint: 'token1',
          analysis: expect.objectContaining({
            isDangerous: true,
            type: 'LIQUIDITY_REMOVAL'
          })
        })
      );
    });

    it('should store threats in database', async () => {
      const supabase = require('../../src/utils/supabaseClient').default;
      const updateMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'protected_tokens') {
          return { update: updateMock };
        } else if (table === 'pattern_alerts') {
          return { insert: insertMock };
        }
        return {};
      });

      await (service as any).storeThreat('token1', 'sig123', {
        type: 'LIQUIDITY_REMOVAL',
        confidence: 0.95,
        riskScore: 100
      });

      expect(updateMock).toHaveBeenCalledWith({
        last_threat_detected: expect.any(String)
      });
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          token_mint: 'token1',
          pattern_type: 'LIQUIDITY_REMOVAL',
          confidence: 0.95,
          risk_score: 100,
          recommendation: 'IMMEDIATE_EXIT'
        })
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track detection times', () => {
      const service = new MempoolMonitorService();
      
      // Add some detection times
      (service as any).trackDetectionTime(50);
      (service as any).trackDetectionTime(75);
      (service as any).trackDetectionTime(100);
      (service as any).trackDetectionTime(125);
      (service as any).trackDetectionTime(150);

      expect((service as any).getAvgDetectionTime()).toBe(100);
      expect((service as any).getP95DetectionTime()).toBeGreaterThanOrEqual(125);
      expect((service as any).getP99DetectionTime()).toBeGreaterThanOrEqual(150);
    });

    it('should report comprehensive performance stats', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      (service as any).reportPerformanceStats();

      // Check that all major stats categories are reported
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Stats'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Protected Tokens'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Transaction Cache'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Bloom Filters'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Message Processor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Connection Pool'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Batch Processor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Detection Times'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Memory Usage'));
    });
  });

  describe('Real-time Updates', () => {
    it('should handle token insert updates', async () => {
      const newToken = {
        token_mint: 'new-token',
        wallet_address: 'new-wallet',
        pool_address: 'new-pool',
        is_active: true,
        mempool_monitoring: true,
        risk_threshold: 'HIGH',
        priority_fee_multiplier: 1.5
      };

      await (service as any).handleTokenInsert(newToken);

      expect((service as any).protectedTokens.has('new-token')).toBe(true);
      expect((service as any).tokenBloomFilter.contains('new-token')).toBe(true);
      expect((service as any).walletBloomFilter.contains('new-wallet')).toBe(true);
      expect((service as any).poolBloomFilter.contains('new-pool')).toBe(true);
    });

    it('should handle token delete updates', async () => {
      // Setup existing token
      (service as any).protectedTokens.set('token1', [{
        tokenMint: 'token1',
        walletAddress: 'wallet1',
        poolAddress: 'pool1',
        riskThreshold: 'HIGH',
        priorityFeeMultiplier: 1.5
      }]);
      (service as any).walletBloomFilter.add('wallet1');

      const deletedToken = {
        token_mint: 'token1',
        wallet_address: 'wallet1'
      };

      await (service as any).handleTokenDelete(deletedToken);

      expect((service as any).protectedTokens.has('token1')).toBe(false);
      // Note: Regular bloom filters can't remove, only counting bloom filter
      expect((service as any).walletBloomFilter.contains('wallet1')).toBe(false);
    });
  });
});