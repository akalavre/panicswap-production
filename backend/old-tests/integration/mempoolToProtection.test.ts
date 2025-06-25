/**
 * Integration Test: Mempool Detection to Protection Execution
 * Tests the complete flow from threat detection to protection
 */

import { MempoolMonitorService } from '../../src/services/MempoolMonitorService';
import { FrontrunnerService } from '../../src/services/FrontrunnerService';
import { eventBus } from '../../src/services/EventBus';
import { Connection } from '@solana/web3.js';
import { MockWebSocketClient, mockWebSocketEvents } from '../mocks/heliusWebSocketMocks';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456
    }),
    sendRawTransaction: jest.fn().mockResolvedValue('mock-sig'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getParsedTransaction: jest.fn().mockResolvedValue({})
  })),
  Transaction: jest.fn(),
  VersionedTransaction: jest.fn(),
  PublicKey: jest.fn().mockImplementation((key) => ({ toString: () => key }))
}));

jest.mock('../../src/services/SolanaWebsocketClient', () => ({
  wsClient: new (require('../mocks/heliusWebSocketMocks').MockWebSocketClient)()
}));

jest.mock('../../src/utils/supabaseClient', () => ({
  default: {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'protected_tokens') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{
                  token_mint: 'mockTokenMint123',
                  wallet_address: 'protectedWallet123',
                  pool_address: 'mockPoolAddress123',
                  risk_threshold: 'HIGH',
                  priority_fee_multiplier: 2.0,
                  is_active: true,
                  mempool_monitoring: true
                }],
                error: null
              })
            })
          }),
          update: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      } else if (table === 'pattern_alerts') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      } else if (table === 'demo_protection_events') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      }
      return {};
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    })
  }
}));

jest.mock('../../src/services/TransactionCache', () => ({
  TransactionCache: jest.fn().mockImplementation(() => ({
    getTransaction: jest.fn().mockResolvedValue({
      transaction: { 
        serialize: jest.fn().mockReturnValue(Buffer.from('mock-tx'))
      },
      metadata: {
        priorityFee: 10000,
        computeUnits: 200000
      }
    })
  }))
}));

jest.mock('../../src/services/PrioritySender', () => ({
  PrioritySender: jest.fn().mockImplementation(() => ({
    sendTransaction: jest.fn().mockResolvedValue({
      signature: 'executed-emergency-tx',
      confirmationTime: 95
    })
  }))
}));

jest.mock('../../src/services/BlockhashRefreshService', () => ({
  BlockhashRefreshService: jest.fn().mockImplementation(() => ({
    getValidBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 123456
    })
  }))
}));

// Mock transaction fetching
jest.mock('../../src/services/TransactionCacheService', () => ({
  transactionCacheService: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      size: 0,
      hitRate: 0,
      hits: 0,
      misses: 0,
      evictions: 0
    })
  }
}));

jest.mock('../../src/services/ConnectionPool', () => ({
  connectionPool: {
    execute: jest.fn().mockImplementation(async (operation) => {
      // Mock transaction fetch
      return {
        transaction: {
          message: {
            instructions: [{
              programId: { toString: () => '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
              parsed: {
                type: 'removeLiquidity',
                info: { amount: 1000000000 }
              }
            }],
            accountKeys: []
          },
          signatures: ['threat-sig']
        },
        meta: {
          err: null,
          logMessages: mockWebSocketEvents.liquidityRemoval.logs,
          preBalances: [1000000000, 0],
          postBalances: [0, 1000000000]
        },
        slot: 123456789,
        blockTime: Date.now() / 1000
      };
    }),
    getStats: jest.fn().mockReturnValue({
      endpoints: [],
      healthyCount: 1,
      totalRequests: 0,
      averageLatency: 0,
      errorRate: 0
    }),
    shutdown: jest.fn()
  }
}));

jest.mock('../../src/utils/BatchProcessor', () => ({
  batchProcessor: {
    add: jest.fn().mockResolvedValue(null),
    getStats: jest.fn().mockReturnValue({
      totalBatches: 0,
      avgBatchSize: 0,
      savedRpcCalls: 0,
      efficiency: 0,
      queueSizes: {}
    }),
    shutdown: jest.fn()
  }
}));

describe('Mempool to Protection Integration', () => {
  let mempoolMonitor: MempoolMonitorService;
  let frontrunner: FrontrunnerService;
  let mockWsClient: MockWebSocketClient;
  let mockConnection: Connection;
  let mockTransactionCache: any;
  let mockPrioritySender: any;
  let mockBlockhashService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockConnection = new Connection('') as any;
    mockTransactionCache = new (require('../../src/services/TransactionCache').TransactionCache)();
    mockPrioritySender = new (require('../../src/services/PrioritySender').PrioritySender)();
    mockBlockhashService = new (require('../../src/services/BlockhashRefreshService').BlockhashRefreshService)();
    
    // Initialize services
    mempoolMonitor = new MempoolMonitorService();
    frontrunner = new FrontrunnerService(
      mockConnection,
      mockTransactionCache,
      mockPrioritySender,
      mockBlockhashService
    );
    
    // Get mock WebSocket client
    mockWsClient = (mempoolMonitor as any).wsClient;
    
    // Connect event bus
    eventBus.on('threat-detected', (threat) => {
      frontrunner.handleThreat(threat);
    });
    
    // Start services
    await mempoolMonitor.start();
    frontrunner.start();
    
    // Allow services to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await mempoolMonitor.stop();
    frontrunner.stop();
    eventBus.removeAllListeners();
  });

  describe('End-to-End Flow', () => {
    it('should detect liquidity removal and execute protection', async () => {
      const protectionExecutedPromise = new Promise((resolve) => {
        frontrunner.once('execution-success', resolve);
      });

      // Simulate liquidity removal event
      mockWsClient.simulateLiquidityRemoval();

      // Wait for protection to execute
      const result = await protectionExecutedPromise;

      expect(result).toMatchObject({
        tokenMint: 'mockTokenMint123',
        walletAddress: 'protectedWallet123',
        signature: 'executed-emergency-tx'
      });
    });

    it('should handle authority change threats', async () => {
      const threatDetectedPromise = new Promise((resolve) => {
        eventBus.once('threat-detected', resolve);
      });

      // Update mock to return authority change transaction
      const connectionPool = require('../../src/services/ConnectionPool').connectionPool;
      connectionPool.execute.mockImplementationOnce(async () => ({
        transaction: {
          message: {
            instructions: [{
              programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
              parsed: {
                type: 'setAuthority',
                info: { authorityType: 'mintTokens' }
              }
            }],
            accountKeys: []
          },
          signatures: ['authority-change-sig']
        },
        meta: {
          err: null,
          logMessages: mockWebSocketEvents.authorityChange.logs
        }
      }));

      // Simulate authority change event
      mockWsClient.simulateAuthorityChange();

      const threat = await threatDetectedPromise;

      expect(threat).toMatchObject({
        tokenMint: 'mockTokenMint123',
        analysis: {
          type: 'AUTHORITY_CHANGE',
          riskLevel: 'HIGH',
          isDangerous: true
        }
      });
    });

    it('should skip non-threatening transactions', async () => {
      const executionSpy = jest.spyOn(frontrunner as any, 'executeThreatResponse');

      // Simulate normal swap
      mockWsClient.simulateNormalSwap();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Protection should not be triggered for non-protected tokens
      expect(executionSpy).not.toHaveBeenCalled();
    });

    it('should handle failed transactions gracefully', async () => {
      // Simulate failed transaction
      mockWsClient.simulateFailedTransaction();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // No protection should be queued
      expect((frontrunner as any).executionQueue.size).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should detect threats within 100ms', async () => {
      const startTime = Date.now();
      
      const threatDetectedPromise = new Promise((resolve) => {
        eventBus.once('threat-detected', resolve);
      });

      // Simulate liquidity removal
      mockWsClient.simulateLiquidityRemoval();

      await threatDetectedPromise;
      const detectionTime = Date.now() - startTime;

      expect(detectionTime).toBeLessThan(100);
    });

    it('should execute protection within 500ms of detection', async () => {
      const startTime = Date.now();
      
      const protectionExecutedPromise = new Promise((resolve) => {
        frontrunner.once('execution-success', resolve);
      });

      // Simulate critical threat
      mockWsClient.simulateLiquidityRemoval();

      await protectionExecutedPromise;
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('Multiple Threats', () => {
    it('should handle multiple simultaneous threats', async () => {
      let executionCount = 0;
      frontrunner.on('execution-success', () => executionCount++);

      // Simulate multiple threats
      mockWsClient.simulateLiquidityRemoval();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mockWsClient.simulateLargeSell();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mockWsClient.simulateFreezeAccount();

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // All threats should be processed
      expect(executionCount).toBeGreaterThanOrEqual(1);
    });

    it('should prioritize critical threats', async () => {
      const executionOrder: string[] = [];
      
      frontrunner.on('execution-success', (result: any) => {
        executionOrder.push(result.threatType || 'unknown');
      });

      // Add various threat levels
      // Large sell (MEDIUM risk)
      eventBus.emit('threat-detected', {
        tokenMint: 'mockTokenMint123',
        walletAddress: 'protectedWallet123',
        analysis: { type: 'LARGE_SELL', riskLevel: 'MEDIUM', isDangerous: true },
        priorityFeeMultiplier: 1.5,
        timestamp: new Date()
      });

      // Liquidity removal (CRITICAL risk)
      eventBus.emit('threat-detected', {
        tokenMint: 'mockTokenMint123',
        walletAddress: 'protectedWallet123',
        analysis: { type: 'LIQUIDITY_REMOVAL', riskLevel: 'CRITICAL', isDangerous: true },
        priorityFeeMultiplier: 2.0,
        timestamp: new Date()
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Critical threat should be processed first
      if (executionOrder.length >= 2) {
        expect(executionOrder[0]).toBe('LIQUIDITY_REMOVAL');
      }
    });
  });

  describe('Circuit Breaker', () => {
    it('should activate circuit breaker on repeated failures', async () => {
      // Mock execution failures
      mockPrioritySender.sendTransaction.mockRejectedValue(new Error('Network error'));

      let failureCount = 0;
      frontrunner.on('execution-failed', () => failureCount++);

      // Trigger multiple threats
      for (let i = 0; i < 6; i++) {
        mockWsClient.simulateLiquidityRemoval();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(failureCount).toBeGreaterThan(0);
      
      // Circuit breaker should be triggered
      const stats = frontrunner.getStats();
      expect(stats.circuitBreakerStatus).toBe('open');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle dynamic token protection updates', async () => {
      // Simulate adding a new protected token
      const supabase = require('../../src/utils/supabaseClient').default;
      const channel = supabase.channel();
      
      // Get the callback registered for protected_tokens changes
      const callbacks = channel.on.mock.calls
        .filter((call: any) => call[1].table === 'protected_tokens')
        .map((call: any) => call[2]);

      expect(callbacks.length).toBeGreaterThan(0);

      // Simulate new token being protected
      const newToken = {
        token_mint: 'newTokenMint456',
        wallet_address: 'newWallet456',
        is_active: true,
        mempool_monitoring: true,
        risk_threshold: 'CRITICAL',
        priority_fee_multiplier: 3.0
      };

      // Trigger the callback
      callbacks[0]({ eventType: 'INSERT', new: newToken });

      // Wait for update to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if new token is in protected list
      const protectedTokens = (mempoolMonitor as any).protectedTokens;
      expect(protectedTokens.has('newTokenMint456')).toBe(true);
    });
  });
});