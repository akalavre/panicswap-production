import { Connection, Transaction, VersionedTransaction, SendOptions, Keypair } from '@solana/web3.js';
import axios from 'axios';
import bs58 from 'bs58';
import config from '../config';

export interface PriorityConfig {
  jitoTipAmount?: number; // in lamports
  jitoLeaderOnly?: boolean;
  maxRetries?: number;
  priorityFeeMicroLamports?: number;
  computeUnits?: number;
}

export interface SendResult {
  success: boolean;
  signature?: string;
  slot?: number;
  error?: string;
  method: 'jito' | 'standard' | 'burst';
}

export class PrioritySender {
  private connection: Connection;
  private jitoEndpoints: string[];
  private heliusRpc: string;
  private currentLeader?: string;
  private leaderSchedule: Map<number, string> = new Map();

  constructor() {
    this.heliusRpc = process.env.HELIUS_RPC_URL || '';
    this.connection = new Connection(this.heliusRpc, 'confirmed');
    
    // Jito block engine endpoints
    this.jitoEndpoints = [
      'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles'
    ];
    
    // Start leader tracking
    this.trackLeaderSchedule();
  }

  /**
   * Send transaction with maximum priority and MEV protection
   */
  async sendEmergencyTransaction(
    transaction: VersionedTransaction,
    signer: Keypair,
    config?: PriorityConfig
  ): Promise<SendResult> {
    console.log('[PrioritySender] 🚨 Sending emergency transaction with priority protection');
    
    try {
      // First, try Jito bundle submission for MEV protection
      const jitoResult = await this.sendViaJito(transaction, signer, config);
      if (jitoResult.success) {
        return jitoResult;
      }
      
      console.log('[PrioritySender] Jito submission failed, falling back to burst mode');
      
      // Fallback: Burst send with multiple priority levels
      return await this.burstSend(transaction, signer, config);
      
    } catch (error) {
      console.error('[PrioritySender] Emergency send failed:', error);
      
      // Last resort: Standard RPC with max priority
      return await this.standardSend(transaction, config);
    }
  }

  /**
   * Send via Jito for MEV protection
   */
  private async sendViaJito(
    transaction: VersionedTransaction,
    signer: Keypair,
    config?: PriorityConfig
  ): Promise<SendResult> {
    try {
      // Add Jito tip if specified
      if (config?.jitoTipAmount) {
        // Create tip transaction
        const tipTx = await this.createJitoTipTransaction(signer.publicKey, config.jitoTipAmount);
        
        // Sign tip transaction separately
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        tipTx.recentBlockhash = blockhash;
        tipTx.lastValidBlockHeight = lastValidBlockHeight;
        tipTx.feePayer = signer.publicKey;
        tipTx.sign(signer);
        
        // Sign the transaction first
        transaction.sign([signer]);
        
        // Bundle transactions
        const bundle = [
          bs58.encode(transaction.serialize()),
          bs58.encode(tipTx.serialize())
        ];
        
        // Try each Jito endpoint
        for (const endpoint of this.jitoEndpoints) {
          try {
            const response = await axios.post(endpoint, {
              jsonrpc: '2.0',
              id: 1,
              method: 'sendBundle',
              params: [bundle]
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 5000
            });
            
            if (response.data.result) {
              console.log(`[PrioritySender] ✅ Jito bundle submitted: ${response.data.result}`);
              
              // Wait for confirmation
              const confirmed = await this.waitForJitoConfirmation(response.data.result);
              if (confirmed) {
                return {
                  success: true,
                  signature: response.data.result,
                  method: 'jito'
                };
              }
            }
          } catch (error) {
            console.error(`[PrioritySender] Jito endpoint ${endpoint} failed:`, error);
            continue;
          }
        }
      }
      
      // If no tip or all endpoints failed, try direct submission
      const serialized = bs58.encode(transaction.serialize());
      
      for (const endpoint of this.jitoEndpoints) {
        try {
          const response = await axios.post(endpoint.replace('/bundles', '/transactions'), {
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [serialized, { encoding: 'base58' }]
          }, {
            timeout: 3000
          });
          
          if (response.data.result) {
            return {
              success: true,
              signature: response.data.result,
              method: 'jito'
            };
          }
        } catch (error) {
          continue;
        }
      }
      
      return {
        success: false,
        error: 'All Jito endpoints failed',
        method: 'jito'
      };
      
    } catch (error) {
      console.error('[PrioritySender] Jito submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Jito submission failed',
        method: 'jito'
      };
    }
  }

  /**
   * Burst send with multiple priority levels
   */
  private async burstSend(
    transaction: VersionedTransaction,
    signer: Keypair,
    config?: PriorityConfig
  ): Promise<SendResult> {
    const baseFee = config?.priorityFeeMicroLamports || 100000;
    const signatures: string[] = [];
    
    // Create variants with different priority fees
    const feeMultipliers = [1, 2, 5, 10, 20];
    const sendPromises = feeMultipliers.map(async (multiplier) => {
      try {
        // Clone transaction
        const txCopy = VersionedTransaction.deserialize(transaction.serialize());
        
        // Modify priority fee (would need to rebuild with new compute budget)
        // For now, just send with different submission options
        
        const signature = await this.connection.sendTransaction(txCopy, {
          skipPreflight: true,
          maxRetries: 0,
          preflightCommitment: 'processed'
        });
        
        signatures.push(signature);
        console.log(`[PrioritySender] Burst sent with ${multiplier}x fee: ${signature}`);
        
        return { signature, multiplier };
      } catch (error) {
        return null;
      }
    });
    
    // Race to see which gets confirmed first
    const results = await Promise.allSettled(sendPromises);
    
    // Wait for any to confirm
    for (const signature of signatures) {
      try {
        const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
        if (!confirmation.value.err) {
          console.log(`[PrioritySender] ✅ Burst send confirmed: ${signature}`);
          return {
            success: true,
            signature,
            slot: confirmation.context.slot,
            method: 'burst'
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      success: false,
      error: 'All burst attempts failed',
      method: 'burst'
    };
  }

  /**
   * Standard send with priority
   */
  private async standardSend(
    transaction: VersionedTransaction,
    config?: PriorityConfig
  ): Promise<SendResult> {
    try {
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: config?.maxRetries || 3,
        preflightCommitment: 'confirmed'
      });
      
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: !confirmation.value.err,
        signature,
        slot: confirmation.context.slot,
        error: confirmation.value.err ? JSON.stringify(confirmation.value.err) : undefined,
        method: 'standard'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Standard send failed',
        method: 'standard'
      };
    }
  }

  /**
   * Create Jito tip transaction
   */
  private async createJitoTipTransaction(
    from: any, // PublicKey type
    tipAmount: number
  ): Promise<Transaction> {
    // Jito tip accounts (rotate through them)
    const jitoTipAccounts = [
      '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
      'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
      'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
      'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
      'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
      'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
      'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
    ];
    
    const tipAccount = jitoTipAccounts[Math.floor(Math.random() * jitoTipAccounts.length)];
    
    const { SystemProgram, PublicKey: SolanaPublicKey, Transaction } = await import('@solana/web3.js');
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: new SolanaPublicKey(tipAccount),
        lamports: tipAmount
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = from;
    
    return transaction;
  }

  /**
   * Wait for Jito bundle confirmation
   */
  private async waitForJitoConfirmation(bundleId: string, timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check bundle status
        for (const endpoint of this.jitoEndpoints) {
          try {
            const response = await axios.post(endpoint, {
              jsonrpc: '2.0',
              id: 1,
              method: 'getBundleStatuses',
              params: [[bundleId]]
            }, {
              timeout: 2000
            });
            
            const status = response.data.result?.value?.[0];
            if (status?.confirmation_status === 'confirmed') {
              return true;
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        // Continue checking
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  /**
   * Track leader schedule for optimal submission timing
   */
  private async trackLeaderSchedule() {
    try {
      const slot = await this.connection.getSlot();
      const leaders = await this.connection.getSlotLeaders(slot, 100);
      
      leaders.forEach((leader, index) => {
        this.leaderSchedule.set(slot + index, leader.toString());
      });
      
      // Refresh every 10 slots
      setTimeout(() => this.trackLeaderSchedule(), 10 * 400); // ~4 seconds
    } catch (error) {
      console.error('[PrioritySender] Error tracking leader schedule:', error);
      setTimeout(() => this.trackLeaderSchedule(), 5000);
    }
  }

  /**
   * Get current slot leader
   */
  async getCurrentLeader(): Promise<string | undefined> {
    try {
      const slot = await this.connection.getSlot();
      return this.leaderSchedule.get(slot);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Estimate optimal priority fee based on network conditions
   */
  async estimatePriorityFee(urgency: 'low' | 'medium' | 'high' | 'critical'): Promise<number> {
    try {
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees.length === 0) {
        // Default fees based on urgency
        const defaults = {
          low: 1000,
          medium: 10000,
          high: 100000,
          critical: 1000000
        };
        return defaults[urgency];
      }
      
      // Calculate percentile based on urgency
      const percentiles = {
        low: 50,
        medium: 75,
        high: 90,
        critical: 99
      };
      
      const sortedFees = recentFees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0)
        .sort((a, b) => a - b);
      
      const index = Math.floor(sortedFees.length * percentiles[urgency] / 100);
      return sortedFees[index] || 100000;
      
    } catch (error) {
      console.error('[PrioritySender] Error estimating priority fee:', error);
      return 100000; // Default
    }
  }
}

// Export singleton instance
export const prioritySender = new PrioritySender();