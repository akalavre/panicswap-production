import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { createJupiterApiClient, QuoteGetRequest, SwapRequest } from '@jup-ag/api';
import supabase from '../utils/supabaseClient';
import bs58 from 'bs58';
import { transactionCache } from '../services/TransactionCache';
import { prioritySender } from '../services/PrioritySender';
import { keyManagementService } from '../services/KeyManagementService';
import { createAlertingService } from '../services/AlertingService';

export interface SwapExecutionRequest {
  walletAddress: string;
  walletPrivateKey?: string; // For auto-execution (stored securely)
  tokenMint: string;
  tokenAmount: number; // Raw amount with decimals
  tokenDecimals: number;
  slippageBps?: number; // Default 500 (5%)
  priorityFeeMultiplier?: number; // Default 1.5
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  outputAmount?: number;
  error?: string;
}

export class SwapService {
  private static instance: SwapService;
  private connection: Connection;
  private jupiterApi: ReturnType<typeof createJupiterApiClient>;
  private alertingService: ReturnType<typeof createAlertingService>;
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly WSOL_MINT = 'So11111111111111111111111111111111111111112';

  private constructor(connection: Connection) {
    this.connection = connection;
    this.jupiterApi = createJupiterApiClient();
    this.alertingService = createAlertingService(connection);
  }

  static getInstance(connection: Connection): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService(connection);
    }
    return SwapService.instance;
  }

  // Execute swap from token to SOL
  async executeSwapToSol(request: SwapExecutionRequest): Promise<SwapResult> {
    try {
      console.log(`🔄 Executing swap: ${request.tokenAmount} tokens to SOL`);

      // Step 1: Get quote from Jupiter
      const quote = await this.getQuote(
        request.tokenMint,
        this.SOL_MINT,
        request.tokenAmount.toString(), // Convert to string for Jupiter API
        request.slippageBps || 500
      );

      if (!quote) {
        return { success: false, error: 'Failed to get swap quote' };
      }

      console.log(`📊 Quote received: ${quote.outAmount} SOL (${quote.priceImpactPct}% impact)`);

      // Step 2: Get swap transaction
      const swapResult = await this.getSwapTransaction(
        quote,
        request.walletAddress,
        request.slippageBps || 500,
        request.priorityFeeMultiplier || 1.5
      );

      if (!swapResult.swapTransaction) {
        return { success: false, error: 'Failed to create swap transaction' };
      }

      // Step 3: Execute transaction (if private key provided)
      if (request.walletPrivateKey) {
        const signature = await this.executeTransaction(
          swapResult.swapTransaction,
          request.walletPrivateKey
        );

        if (signature) {
          // Log successful swap
          await this.logSwapExecution(
            request.walletAddress,
            request.tokenMint,
            request.tokenAmount,
            Number(quote.outAmount),
            signature,
            'confirmed'
          );

          return {
            success: true,
            signature,
            outputAmount: Number(quote.outAmount) / 1e9 // Convert lamports to SOL
          };
        } else {
          return { success: false, error: 'Failed to execute transaction' };
        }
      } else {
        // Return transaction for manual signing
        console.log('⚠️ No private key provided, returning transaction for manual signing');
        
        // Log pending swap
        await this.logSwapExecution(
          request.walletAddress,
          request.tokenMint,
          request.tokenAmount,
          Number(quote.outAmount),
          '',
          'pending'
        );

        return {
          success: false,
          error: 'Transaction requires manual signing - no private key provided',
          outputAmount: Number(quote.outAmount) / 1e9
        };
      }
    } catch (error) {
      console.error('Swap execution error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get swap quote from Jupiter
  private async getQuote(
    inputMint: string,
    outputMint: string,
    amount: string | number,
    slippageBps: number
  ) {
    try {
      // Ensure amount is a valid integer string
      const amountStr = typeof amount === 'string' ? amount : Math.floor(amount).toString();
      
      const quoteRequest: any = {
        inputMint,
        outputMint,
        amount: amountStr, // Jupiter v6 expects string
        slippageBps,
        // Remove fields that might cause issues
        // onlyDirectRoutes: false,
        // asLegacyTransaction: false,
        // platformFeeBps: 0,
        // restrictIntermediateTokens: false,
        // maxAccounts: 64
      };

      console.log(`[SwapService] Requesting Jupiter quote:`, {
        inputMint,
        outputMint,
        amount: amountStr,
        slippageBps
      });

      const quote = await this.jupiterApi.quoteGet(quoteRequest);
      
      if (!quote) {
        console.error('[SwapService] No quote returned from Jupiter');
        return null;
      }
      
      console.log(`[SwapService] Quote received: ${quote.outAmount} output tokens`);
      return quote;
    } catch (error: any) {
      console.error('[SwapService] Jupiter API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Log specific 400 errors
      if (error.response?.status === 400) {
        console.error('[SwapService] Bad Request - Invalid parameters:', error.response.data);
      }
      
      return null;
    }
  }

  // Get swap transaction from Jupiter
  private async getSwapTransaction(
    quote: any,
    walletAddress: string,
    slippageBps: number,
    priorityFeeMultiplier: number
  ) {
    try {
      // Calculate dynamic priority fee based on network congestion
      const priorityFeeLamports = await this.calculatePriorityFee(priorityFeeMultiplier);

      const swapRequest: any = {
        quoteResponse: quote,
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
        // Use simpler priority fee configuration
        prioritizationFeeLamports: 'auto',
        // Add dynamic slippage with max cap
        dynamicSlippage: {
          maxBps: 300 // 3% max slippage
        }
      };

      console.log(`[SwapService] Requesting swap transaction with priority fee: ${priorityFeeLamports}`);
      
      const swapResult = await this.jupiterApi.swapPost({
        swapRequest
      });

      if (!swapResult || !swapResult.swapTransaction) {
        console.error('[SwapService] No swap transaction returned from Jupiter');
        return { swapTransaction: null };
      }

      return swapResult;
    } catch (error: any) {
      console.error('[SwapService] Jupiter swap transaction error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Log specific 400 errors
      if (error.response?.status === 400) {
        console.error('[SwapService] Bad Request - Invalid swap parameters:', error.response.data);
      }
      
      return { swapTransaction: null };
    }
  }

  // Execute the transaction
  private async executeTransaction(
    swapTransaction: string,
    privateKeyString: string
  ): Promise<string | null> {
    try {
      // Validate and create keypair
      const keypair = keyManagementService.validateAndCreateKeypair(privateKeyString);
      if (!keypair) {
        console.error('[SwapService] Invalid private key - cannot execute transaction');
        return null;
      }

      // Deserialize transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      // Sign transaction
      transaction.sign([keypair]);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        console.error('Transaction failed:', confirmation.value.err);
        return null;
      }

      console.log(`✅ Swap executed successfully: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Transaction execution error:', error);
      return null;
    }
  }

  // Calculate dynamic priority fee
  private async calculatePriorityFee(multiplier: number): Promise<number> {
    try {
      // Get recent priority fees
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees.length > 0) {
        // Calculate average fee
        const avgFee = recentFees.reduce((sum, fee) => sum + fee.prioritizationFee, 0) / recentFees.length;
        // Apply multiplier for urgency
        return Math.floor(avgFee * multiplier);
      }

      // Default fee if no recent data
      return 100000; // 0.0001 SOL
    } catch (error) {
      console.error('Error calculating priority fee:', error);
      return 100000; // Default fallback
    }
  }

  // Log swap execution to database
  private async logSwapExecution(
    walletAddress: string,
    tokenMint: string,
    inputAmount: number,
    outputAmount: number,
    signature: string,
    status: string
  ) {
    try {
      await supabase
        .from('protection_swaps')
        .insert({
          wallet_address: walletAddress,
          token_mint: tokenMint,
          input_amount: inputAmount,
          output_amount: outputAmount,
          transaction_signature: signature,
          status,
          trigger_type: 'rug_pull_detected',
          created_at: new Date().toISOString(),
          submitted_at: status === 'confirmed' ? new Date().toISOString() : null,
          confirmed_at: status === 'confirmed' ? new Date().toISOString() : null
        });
    } catch (error) {
      console.error('Error logging swap execution:', error);
    }
  }

  // Simulate swap without executing
  async simulateSwap(request: SwapExecutionRequest): Promise<{
    estimatedOutput: number;
    priceImpact: number;
    route: string[];
  } | null> {
    try {
      const quote = await this.getQuote(
        request.tokenMint,
        this.SOL_MINT,
        request.tokenAmount.toString(),
        request.slippageBps || 500
      );

      if (!quote) {
        return null;
      }

      return {
        estimatedOutput: Number(quote.outAmount) / 1e9,
        priceImpact: Number(quote.priceImpactPct),
        route: quote.routePlan?.map((r: any) => r.swapInfo?.label || 'Unknown') || []
      };
    } catch (error) {
      console.error('Simulation error:', error);
      return null;
    }
  }

  // Execute emergency sell for rugpull protection
  async executeEmergencySell(
    tokenMint: string,
    walletAddress: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Get wallet balance and token metadata
      const [walletTokenResult, tokenMetadataResult] = await Promise.all([
        supabase
          .from('wallet_tokens')
          .select('balance')
          .eq('wallet_address', walletAddress)
          .eq('token_mint', tokenMint)
          .single(),
        supabase
          .from('token_metadata')
          .select('decimals')
          .eq('mint', tokenMint)
          .single()
      ]);

      const walletToken = walletTokenResult.data;
      const tokenMetadata = tokenMetadataResult.data;

      if (!walletToken || !walletToken.balance) {
        return { success: false, error: 'No balance found' };
      }

      // Retrieve private key securely
      const privateKey = await keyManagementService.getPrivateKey(walletAddress);
      if (!privateKey) {
        console.error(`[SwapService] No private key found for wallet ${walletAddress}`);
        await this.alertingService.alertMissingKey(walletAddress, tokenMint);
        return { success: false, error: 'No private key available for auto-execution' };
      }

      // Use actual token decimals or default to 9 for pump.fun tokens
      const tokenDecimals = tokenMetadata?.decimals || 9;

      // Execute swap with max slippage for emergency
      const startTime = Date.now();
      const result = await this.executeSwapToSol({
        walletAddress,
        tokenMint,
        tokenAmount: walletToken.balance,
        tokenDecimals,
        slippageBps: 5000, // 50% slippage for emergency
        priorityFeeMultiplier: 5, // Max priority
        walletPrivateKey: privateKey
      });

      // Monitor swap execution
      if (result.signature) {
        await this.alertingService.monitorSwapExecution(
          tokenMint,
          walletAddress,
          result.signature,
          startTime
        );
      } else if (!result.success) {
        await this.alertingService.sendAlert({
          type: 'swap_failed',
          severity: 'high',
          wallet_address: walletAddress,
          token_mint: tokenMint,
          message: result.error || 'Unknown error during emergency sell',
          metadata: { execution_time: Date.now() - startTime }
        });
      }

      return {
        success: result.success,
        signature: result.signature,
        error: result.error
      };
    } catch (error) {
      console.error('Emergency sell error:', error);
      
      await this.alertingService.sendAlert({
        type: 'protection_failed',
        severity: 'critical',
        wallet_address: walletAddress,
        token_mint: tokenMint,
        message: 'Emergency sell threw exception',
        error_details: error instanceof Error ? error.stack : error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Pre-compute emergency swap transactions for instant execution
   * NOTE: This method now retrieves and uses the private key to pre-sign transactions
   */
  async precomputeEmergencySwap(
    walletAddress: string,
    tokenMint: string,
    tokenAmount: number,
    tokenDecimals: number
  ): Promise<boolean> {
    try {
      console.log(`[SwapService] Pre-computing emergency swap for ${tokenMint}`);
      
      // Retrieve private key for signing
      const privateKey = await keyManagementService.getPrivateKey(walletAddress);
      if (!privateKey) {
        console.warn(`[SwapService] Cannot pre-compute without private key for ${walletAddress}`);
        return false;
      }

      // Validate and create keypair for signing
      const keypair = keyManagementService.validateAndCreateKeypair(privateKey);
      if (!keypair) {
        console.warn(`[SwapService] Cannot pre-compute - invalid private key for ${walletAddress}`);
        return false;
      }
      
      // Get multiple quotes with different slippage levels
      const slippageLevels = [1000, 2000, 5000]; // 10%, 20%, 50%
      const priorityLevels = [100000, 500000, 1000000]; // Different priority fees
      
      for (const slippageBps of slippageLevels) {
        // Get quote
        const quote = await this.getQuote(
          tokenMint,
          this.SOL_MINT,
          tokenAmount,
          slippageBps
        );
        
        if (!quote) continue;
        
        // Pre-compute transactions with different priority levels
        const variants = [];
        
        for (const priorityFee of priorityLevels) {
          try {
            // Get swap transaction
            const swapResult = await this.getSwapTransaction(
              quote,
              walletAddress,
              slippageBps,
              1 // Normal multiplier, we'll add priority separately
            );
            
            if (!swapResult.swapTransaction) continue;
            
            // Deserialize and modify transaction
            const transactionBuf = Buffer.from(swapResult.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(transactionBuf);
            
            // Sign the transaction
            transaction.sign([keypair]);
            
            // Add compute budget instructions for priority
            const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: priorityFee
            });
            
            // Note: In a more sophisticated implementation, we would reconstruct
            // the message with the compute budget instruction included
            
            variants.push({
              transaction,
              priorityFee,
              metadata: {
                route: quote.routePlan?.map((r: any) => r.swapInfo?.label || 'Unknown') || [],
                estimatedOutput: Number(quote.outAmount) / 1e9,
                priceImpact: Number(quote.priceImpactPct),
                slippage: slippageBps,
                computeUnits: 200000, // Default
                presigned: true,
                blockhash: transaction.message.recentBlockhash
              }
            });
          } catch (error) {
            console.error(`[SwapService] Error creating variant with priority ${priorityFee}:`, error);
          }
        }
        
        // Store all variants
        if (variants.length > 0) {
          await transactionCache.storePriorityVariants(
            {
              tokenMint,
              walletAddress,
              tokenAmount,
              outputMint: this.SOL_MINT,
              slippageBps
            },
            variants
          );
          
          // Also store the best one as emergency transaction
          const bestVariant = variants[variants.length - 1]; // Highest priority
          await transactionCache.storeTransaction(
            {
              tokenMint,
              walletAddress,
              tokenAmount,
              outputMint: this.SOL_MINT,
              slippageBps
            },
            bestVariant.transaction,
            {
              ...bestVariant.metadata,
              priorityFee: bestVariant.priorityFee,
              presigned: true
            },
            true // emergency
          );
          
          console.log(`[SwapService] ✅ Pre-computed and signed ${variants.length} emergency swap variants for ${tokenMint}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[SwapService] Error pre-computing emergency swap:', error);
      return false;
    }
  }

  /**
   * Execute emergency sell with pre-computed transaction
   */
  async executeEmergencySellOptimized(
    tokenMint: string,
    walletAddress: string,
    walletPrivateKey?: string
  ): Promise<{ success: boolean; signature?: string; error?: string; executionTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Try to get pre-computed transaction first
      const cached = await transactionCache.getTransaction(
        tokenMint,
        walletAddress,
        true // emergency
      );
      
      if (cached) {
        console.log(`[SwapService] Using pre-computed emergency transaction`);
        
        // Check if transaction is pre-signed
        if (cached.metadata?.presigned) {
          console.log(`[SwapService] Transaction is pre-signed, sending directly`);
          
          try {
            // Send pre-signed transaction directly
            const signature = await this.connection.sendRawTransaction(
              cached.transaction.serialize(),
              {
                skipPreflight: true,
                maxRetries: 3,
                preflightCommitment: 'processed'
              }
            );
            
            // Wait for confirmation
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
            
            const executionTime = Date.now() - startTime;
            
            if (confirmation.value.err) {
              console.error('Pre-signed transaction failed:', confirmation.value.err);
              return {
                success: false,
                error: 'Pre-signed transaction failed',
                executionTime
              };
            }
            
            console.log(`✅ Pre-signed swap executed successfully: ${signature}`);
            return {
              success: true,
              signature,
              executionTime
            };
          } catch (error) {
            console.error('Error sending pre-signed transaction:', error);
            // Fall through to re-sign if pre-signed tx fails
          }
        }
        
        // If not pre-signed or pre-signed failed, sign now
        let privateKeyToUse = walletPrivateKey;
        if (!privateKeyToUse) {
          // Try to get private key from key management
          const retrievedKey = await keyManagementService.getPrivateKey(walletAddress);
          if (!retrievedKey) {
            return {
              success: false,
              error: 'No private key available for emergency execution'
            };
          }
          privateKeyToUse = retrievedKey;
        }
        
        // Validate and create keypair
        const keypair = keyManagementService.validateAndCreateKeypair(privateKeyToUse);
        if (!keypair) {
          return {
            success: false,
            error: 'Invalid private key format - cannot sign transaction'
          };
        }
        
        // Sign transaction
        cached.transaction.sign([keypair]);
        
        // Send via priority sender for MEV protection
        const result = await prioritySender.sendEmergencyTransaction(
          cached.transaction,
          keypair,
          {
            jitoTipAmount: 100000, // 0.0001 SOL
            priorityFeeMicroLamports: cached.metadata.priorityFee || 500000
          }
        );
        
        const executionTime = Date.now() - startTime;
        
        return {
          success: result.success,
          signature: result.signature,
          error: result.error,
          executionTime
        };
      }
      
      // Fallback to standard execution
      console.log(`[SwapService] No pre-computed transaction, falling back to standard execution`);
      return this.executeEmergencySell(tokenMint, walletAddress);
      
    } catch (error) {
      console.error('[SwapService] Optimized emergency sell error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Pre-compute transactions for all protected tokens
   */
  async precomputeAllProtectedTokens(): Promise<void> {
    try {
      const { data: protectedTokens } = await supabase
        .from('protected_tokens')
        .select('*')
        .eq('is_active', true)
        .eq('monitoring_enabled', true);
      
      if (!protectedTokens) return;
      
      console.log(`[SwapService] Pre-computing transactions for ${protectedTokens.length} protected tokens`);
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < protectedTokens.length; i += batchSize) {
        const batch = protectedTokens.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (token) => {
            // Get token balance
            const { data: walletToken } = await supabase
              .from('wallet_tokens')
              .select('balance, decimals')
              .eq('wallet_address', token.wallet_address)
              .eq('token_mint', token.token_mint)
              .single();
            
            if (walletToken?.balance) {
              await this.precomputeEmergencySwap(
                token.wallet_address,
                token.token_mint,
                walletToken.balance,
                walletToken.decimals || 9
              );
            }
          })
        );
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`[SwapService] ✅ Pre-computation complete`);
    } catch (error) {
      console.error('[SwapService] Error pre-computing all tokens:', error);
    }
  }
}

export const createSwapService = (connection: Connection) => {
  return SwapService.getInstance(connection);
};