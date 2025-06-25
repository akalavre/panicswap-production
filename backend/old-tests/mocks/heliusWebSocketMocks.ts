/**
 * Helius WebSocket Mock Responses
 * Simulates real WebSocket events for testing
 */

export const mockWebSocketEvents = {
  // Liquidity removal event
  liquidityRemoval: {
    signature: 'mock-liquidity-removal-sig-123',
    logs: [
      'Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 invoke [1]',
      'Program log: Instruction: RemoveLiquidity',
      'Program log: Removing 1000000000 tokens from pool',
      'Program log: Pool address: mockPoolAddress123',
      'Program log: Token mint: mockTokenMint123',
      'Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 consumed 12345 compute units',
      'Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 success'
    ],
    err: null,
    slot: 123456789,
    blockTime: Date.now() / 1000
  },

  // Authority change event
  authorityChange: {
    signature: 'mock-authority-change-sig-456',
    logs: [
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
      'Program log: Instruction: SetAuthority',
      'Program log: Authority type: MintTokens',
      'Program log: New authority: evilWalletAddress789',
      'Program log: Token mint: mockTokenMint123',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 5678 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
    ],
    err: null,
    slot: 123456790,
    blockTime: Date.now() / 1000
  },

  // Large sell event
  largeSell: {
    signature: 'mock-large-sell-sig-789',
    logs: [
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]',
      'Program log: Instruction: Swap',
      'Program log: Amount in: 100000000000',
      'Program log: Amount out: 50000',
      'Program log: Token mint: mockTokenMint123',
      'Program log: Slippage: 98%',
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P consumed 23456 compute units',
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success'
    ],
    err: null,
    slot: 123456791,
    blockTime: Date.now() / 1000
  },

  // Freeze account event
  freezeAccount: {
    signature: 'mock-freeze-account-sig-012',
    logs: [
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
      'Program log: Instruction: FreezeAccount',
      'Program log: Account: victimWalletAddress345',
      'Program log: Token mint: mockTokenMint123',
      'Program log: Freeze authority: freezeAuthorityWallet678',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3456 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
    ],
    err: null,
    slot: 123456792,
    blockTime: Date.now() / 1000
  },

  // Normal swap event (safe)
  normalSwap: {
    signature: 'mock-normal-swap-sig-345',
    logs: [
      'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]',
      'Program log: Instruction: Swap',
      'Program log: Amount in: 1000',
      'Program log: Amount out: 950',
      'Program log: Token mint in: differentTokenMint456',
      'Program log: Token mint out: anotherTokenMint789',
      'Program log: Slippage: 5%',
      'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 15678 compute units',
      'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success'
    ],
    err: null,
    slot: 123456793,
    blockTime: Date.now() / 1000
  },

  // Failed transaction
  failedTransaction: {
    signature: 'mock-failed-tx-sig-678',
    logs: [
      'Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 invoke [1]',
      'Program log: Instruction: Swap',
      'Program log: Error: Insufficient liquidity',
      'Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 failed: custom program error: 0x1'
    ],
    err: { InstructionError: [0, { Custom: 1 }] },
    slot: 123456794,
    blockTime: Date.now() / 1000
  },

  // Pump.fun graduation event
  pumpFunGraduation: {
    signature: 'mock-graduation-sig-901',
    logs: [
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]',
      'Program log: Instruction: Graduate',
      'Program log: Token mint: mockTokenMint123',
      'Program log: Market cap: 69420',
      'Program log: Graduating to Raydium',
      'Program log: New pool: newRaydiumPool234',
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P consumed 34567 compute units',
      'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success'
    ],
    err: null,
    slot: 123456795,
    blockTime: Date.now() / 1000
  }
};

/**
 * Mock WebSocket client for testing
 */
export class MockWebSocketClient {
  private listeners: Map<string, Function[]> = new Map();
  private connected: boolean = false;
  private subscriptions: Map<number, any> = new Map();
  private nextSubId: number = 1;

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.listeners.clear();
    this.subscriptions.clear();
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  async subscribeToLogs(params: any): Promise<number> {
    const subId = this.nextSubId++;
    this.subscriptions.set(subId, params);
    return subId;
  }

  unsubscribe(subId: number): void {
    this.subscriptions.delete(subId);
  }

  // Test helper methods
  simulateLiquidityRemoval(): void {
    this.emit('logs', mockWebSocketEvents.liquidityRemoval);
  }

  simulateAuthorityChange(): void {
    this.emit('logs', mockWebSocketEvents.authorityChange);
  }

  simulateLargeSell(): void {
    this.emit('logs', mockWebSocketEvents.largeSell);
  }

  simulateFreezeAccount(): void {
    this.emit('logs', mockWebSocketEvents.freezeAccount);
  }

  simulateNormalSwap(): void {
    this.emit('logs', mockWebSocketEvents.normalSwap);
  }

  simulateFailedTransaction(): void {
    this.emit('logs', mockWebSocketEvents.failedTransaction);
  }

  simulatePumpFunGraduation(): void {
    this.emit('logs', mockWebSocketEvents.pumpFunGraduation);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Mock transaction data for testing
 */
export const mockTransactions = {
  liquidityRemovalTx: {
    transaction: {
      message: {
        instructions: [
          {
            programId: { toString: () => '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
            parsed: {
              type: 'removeLiquidity',
              info: {
                amount: 1000000000,
                poolAccount: 'mockPoolAddress123',
                tokenMint: 'mockTokenMint123'
              }
            }
          }
        ],
        accountKeys: [
          { pubkey: { toString: () => 'mockPoolAddress123' }, signer: false, writable: true },
          { pubkey: { toString: () => 'mockTokenMint123' }, signer: false, writable: false },
          { pubkey: { toString: () => 'liquidityProvider123' }, signer: true, writable: true }
        ]
      },
      signatures: ['mock-liquidity-removal-sig-123']
    },
    meta: {
      err: null,
      logMessages: mockWebSocketEvents.liquidityRemoval.logs,
      preBalances: [1000000000, 500000000, 250000000],
      postBalances: [0, 1500000000, 250000000],
      preTokenBalances: [],
      postTokenBalances: []
    },
    slot: 123456789,
    blockTime: Math.floor(Date.now() / 1000)
  },

  largeSellTx: {
    transaction: {
      message: {
        instructions: [
          {
            programId: { toString: () => '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' },
            parsed: {
              type: 'swap',
              info: {
                amountIn: 100000000000,
                amountOut: 50000,
                tokenMintIn: 'mockTokenMint123',
                tokenMintOut: 'So11111111111111111111111111111111111111112'
              }
            }
          }
        ],
        accountKeys: []
      },
      signatures: ['mock-large-sell-sig-789']
    },
    meta: {
      err: null,
      logMessages: mockWebSocketEvents.largeSell.logs,
      preBalances: [100000000000, 50000],
      postBalances: [0, 100050000]
    },
    slot: 123456791,
    blockTime: Math.floor(Date.now() / 1000)
  }
};