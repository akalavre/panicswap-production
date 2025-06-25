import { Connection } from '@solana/web3.js';
import { createSwapService } from '../protect/SwapService';
import supabase from '../utils/supabaseClient';
import { transactionCache } from './TransactionCache';

export class BlockhashRefreshService {
  private static instance: BlockhashRefreshService;
  private connection: Connection;
  private swapService: ReturnType<typeof createSwapService>;
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 60_000; // 60 seconds
  private readonly BLOCKHASH_VALIDITY = 150; // ~150 slots before expiry

  private constructor(connection: Connection) {
    this.connection = connection;
    this.swapService = createSwapService(connection);
  }

  static getInstance(connection: Connection): BlockhashRefreshService {
    if (!BlockhashRefreshService.instance) {
      BlockhashRefreshService.instance = new BlockhashRefreshService(connection);
    }
    return BlockhashRefreshService.instance;
  }

  /**
   * Start the blockhash refresh service
   */
  start(): void {
    if (this.refreshInterval) {
      console.log('[BlockhashRefresh] Service already running');
      return;
    }

    console.log('[BlockhashRefresh] Starting blockhash refresh service');
    
    // Initial refresh
    this.refreshPreSignedTransactions();
    
    // Set up periodic refresh
    this.refreshInterval = setInterval(() => {
      this.refreshPreSignedTransactions();
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Stop the blockhash refresh service
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[BlockhashRefresh] Service stopped');
    }
  }

  /**
   * Refresh all pre-signed transactions with new blockhashes
   */
  private async refreshPreSignedTransactions(): Promise<void> {
    try {
      console.log('[BlockhashRefresh] Starting refresh cycle');
      
      // Get all active protected tokens
      const { data: protectedTokens } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('is_active', true)
        .eq('monitoring_enabled', true)
        .neq('status', 'RUGGED');
      
      if (!protectedTokens || protectedTokens.length === 0) {
        console.log('[BlockhashRefresh] No active protected tokens');
        return;
      }
      
      console.log(`[BlockhashRefresh] Refreshing ${protectedTokens.length} protected tokens`);
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 5;
      let refreshed = 0;
      let failed = 0;
      
      for (let i = 0; i < protectedTokens.length; i += batchSize) {
        const batch = protectedTokens.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (token) => {
            try {
              // Get current balance for the token
              const { data: walletToken } = await supabase
                .from('wallet_tokens')
                .select('balance, decimals')
                .eq('wallet_address', token.wallet_address)
                .eq('token_mint', token.token_mint)
                .single();
              
              if (!walletToken?.balance) {
                return false;
              }
              
              // Check if existing cached transaction is still valid
              const cached = await transactionCache.getTransaction(
                token.token_mint,
                token.wallet_address,
                true // emergency
              );
              
              if (cached && cached.metadata.blockhash) {
                // Check if blockhash is still valid
                try {
                  const { value } = await this.connection.getLatestBlockhashAndContext();
                  
                  // If blockhash is recent enough, skip refresh
                  if (cached.metadata.createdAt && 
                      Date.now() - cached.metadata.createdAt < 30_000) { // 30 seconds
                    return true; // Still fresh
                  }
                } catch (err) {
                  // If we can't check, assume it needs refresh
                }
              }
              
              // Re-compute the emergency swap transaction
              const success = await this.swapService.precomputeEmergencySwap(
                token.wallet_address,
                token.token_mint,
                walletToken.balance,
                walletToken.decimals || 9
              );
              
              return success;
            } catch (error) {
              console.error(`[BlockhashRefresh] Error refreshing ${token.token_mint}:`, error);
              return false;
            }
          })
        );
        
        // Count results
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            refreshed++;
          } else {
            failed++;
          }
        });
        
        // Small delay between batches
        if (i + batchSize < protectedTokens.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`[BlockhashRefresh] Refresh complete: ${refreshed} successful, ${failed} failed`);
      
      // Alert if too many failures
      if (failed > refreshed && failed > 5) {
        console.error(`[BlockhashRefresh] High failure rate: ${failed}/${protectedTokens.length} failed`);
        
        // Could integrate with AlertingService here
        // await this.alertingService.sendAlert({
        //   type: 'blockhash_refresh_failed',
        //   severity: 'medium',
        //   wallet_address: 'SYSTEM',
        //   token_mint: 'SYSTEM',
        //   message: `Blockhash refresh failed for ${failed} tokens`,
        //   metadata: { total: protectedTokens.length, failed, refreshed }
        // });
      }
    } catch (error) {
      console.error('[BlockhashRefresh] Error in refresh cycle:', error);
    }
  }

  /**
   * Force refresh for a specific token
   */
  async refreshToken(tokenMint: string, walletAddress: string): Promise<boolean> {
    try {
      const { data: walletToken } = await supabase
        .from('wallet_tokens')
        .select('balance, decimals')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();
      
      if (!walletToken?.balance) {
        return false;
      }
      
      return await this.swapService.precomputeEmergencySwap(
        walletAddress,
        tokenMint,
        walletToken.balance,
        walletToken.decimals || 9
      );
    } catch (error) {
      console.error(`[BlockhashRefresh] Error refreshing token ${tokenMint}:`, error);
      return false;
    }
  }
}

export const createBlockhashRefreshService = (connection: Connection) => {
  return BlockhashRefreshService.getInstance(connection);
};