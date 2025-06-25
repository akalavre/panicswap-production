/**
 * TransactionAnalyzer Test Suite
 */

import { TransactionAnalyzer } from '../../src/services/TransactionAnalyzer';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';

// Mock Solana web3
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({})),
  PublicKey: jest.fn().mockImplementation((key) => ({ toString: () => key }))
}));

describe('TransactionAnalyzer', () => {
  let analyzer: TransactionAnalyzer;
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = new Connection('') as jest.Mocked<Connection>;
    analyzer = new TransactionAnalyzer(mockConnection);
  });

  describe('Transaction Analysis', () => {
    it('should detect liquidity removal patterns', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
                parsed: {
                  type: 'removeLiquidity',
                  info: {
                    amount: 1000000
                  }
                }
              }
            ],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: null,
          logMessages: [
            'Program log: Instruction: RemoveLiquidity',
            'Program log: Liquidity removed successfully'
          ]
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeDefined();
      expect(result?.isDangerous).toBe(true);
      expect(result?.type).toBe('LIQUIDITY_REMOVAL');
      expect(result?.riskLevel).toBe('CRITICAL');
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect authority change patterns', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'setAuthority',
                  info: {
                    authorityType: 'mintTokens',
                    newAuthority: 'malicious-wallet'
                  }
                }
              }
            ],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: null,
          logMessages: [
            'Program log: Instruction: SetAuthority',
            'Program log: Authority changed'
          ]
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeDefined();
      expect(result?.isDangerous).toBe(true);
      expect(result?.type).toBe('AUTHORITY_CHANGE');
      expect(result?.riskLevel).toBe('HIGH');
    });

    it('should detect large sell patterns', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
                parsed: {
                  type: 'swap',
                  info: {
                    amountIn: 100000000000, // 100B tokens
                    amountOut: 1000000
                  }
                }
              }
            ],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: null,
          logMessages: [
            'Program log: Instruction: Swap',
            'Program log: Large swap executed'
          ],
          preBalances: [1000000000, 500000000],
          postBalances: [900000000, 600000000]
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeDefined();
      expect(result?.isDangerous).toBe(true);
      expect(result?.type).toBe('LARGE_SELL');
      expect(result?.riskLevel).toBe('MEDIUM');
    });

    it('should detect freeze operations', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'freezeAccount',
                  info: {
                    account: 'victim-wallet',
                    mint: 'token-mint'
                  }
                }
              }
            ],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: null,
          logMessages: [
            'Program log: Instruction: FreezeAccount',
            'Program log: Account frozen'
          ]
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeDefined();
      expect(result?.isDangerous).toBe(true);
      expect(result?.type).toBe('FREEZE_OPERATION');
      expect(result?.riskLevel).toBe('CRITICAL');
    });

    it('should handle safe transactions', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'transfer',
                  info: {
                    amount: 100,
                    source: 'wallet1',
                    destination: 'wallet2'
                  }
                }
              }
            ],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: null,
          logMessages: [
            'Program log: Instruction: Transfer',
            'Program log: Transfer completed'
          ]
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeDefined();
      expect(result?.isDangerous).toBe(false);
      expect(result?.type).toBe('UNKNOWN');
      expect(result?.riskLevel).toBe('LOW');
    });

    it('should handle failed transactions', async () => {
      const mockTx: Partial<ParsedTransactionWithMeta> = {
        transaction: {
          message: {
            instructions: [],
            accountKeys: []
          },
          signatures: ['test-sig']
        },
        meta: {
          err: { InstructionError: [0, 'Custom(1)'] },
          logMessages: ['Program log: Error processing transaction']
        }
      };

      const result = await analyzer.analyzeTransaction(
        mockTx as ParsedTransactionWithMeta,
        'test-sig'
      );

      expect(result).toBeNull();
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns from log messages', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      
      const liquidityLogs = [
        'Program log: Instruction: RemoveLiquidity',
        'Program log: Withdrawing 1000000 tokens'
      ];
      
      const pattern = (analyzer as any).detectPatternFromLogs(liquidityLogs);
      expect(pattern).toBe('LIQUIDITY_REMOVAL');
    });

    it('should calculate risk scores correctly', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      
      expect((analyzer as any).calculateRiskScore('LIQUIDITY_REMOVAL')).toBe(100);
      expect((analyzer as any).calculateRiskScore('AUTHORITY_CHANGE')).toBe(80);
      expect((analyzer as any).calculateRiskScore('LARGE_SELL')).toBe(60);
      expect((analyzer as any).calculateRiskScore('FREEZE_OPERATION')).toBe(90);
      expect((analyzer as any).calculateRiskScore('UNKNOWN')).toBe(10);
    });

    it('should determine risk levels based on scores', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      
      expect((analyzer as any).getRiskLevel(100)).toBe('CRITICAL');
      expect((analyzer as any).getRiskLevel(75)).toBe('HIGH');
      expect((analyzer as any).getRiskLevel(50)).toBe('MEDIUM');
      expect((analyzer as any).getRiskLevel(25)).toBe('LOW');
    });
  });

  describe('Balance Change Analysis', () => {
    it('should analyze balance changes correctly', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      
      const result = (analyzer as any).analyzeBalanceChanges(
        [1000000, 500000, 250000],
        [900000, 600000, 250000]
      );
      
      expect(result.totalChange).toBe(0); // -100000 + 100000 + 0
      expect(result.maxDecrease).toBe(100000);
      expect(result.maxIncrease).toBe(100000);
    });

    it('should handle null balance arrays', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      
      const result = (analyzer as any).analyzeBalanceChanges(null, null);
      
      expect(result.totalChange).toBe(0);
      expect(result.maxDecrease).toBe(0);
      expect(result.maxIncrease).toBe(0);
    });
  });

  describe('DEX Support', () => {
    it('should support multiple DEX programs', () => {
      const analyzer = new TransactionAnalyzer(mockConnection);
      const supportedDexes = (analyzer as any).dexPrograms;
      
      expect(supportedDexes).toHaveProperty('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'); // Raydium
      expect(supportedDexes).toHaveProperty('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'); // Pump.fun
      expect(supportedDexes).toHaveProperty('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'); // Orca
      expect(supportedDexes).toHaveProperty('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'); // Jupiter
    });
  });
});