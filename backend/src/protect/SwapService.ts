import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { createJupiterApiClient, QuoteGetRequest, SwapRequest } from '@jup-ag/api';
import supabase from '../utils/supabaseClient';
import bs58 from 'bs58';

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
  private readonly SOL_MINT = 'So11111111111111111111111111111111111112';
  private readonly WSOL_MINT = 'So11111111111111111111111111111111111112';

  private constructor(connection: Connection) {
    this.connection = connection;
    this.jupiterApi = createJupiterApiClient();
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
        request.tokenAmount,
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
          success: true,
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
    amount: number,
    slippageBps: number
  ) {
    try {
      const quoteRequest: QuoteGetRequest = {
        inputMint,
        outputMint,
        amount: Math.floor(amount),
        slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false
      };

      const quote = await this.jupiterApi.quoteGet(quoteRequest);
      return quote;
    } catch (error) {
      console.error('Error getting quote:', error);
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

      const swapRequest: SwapRequest = {
        quoteResponse: quote,
        userPublicKey: walletAddress,
        dynamicSlippage: true, // Enable dynamic slippage
        computeUnitPriceMicroLamports: priorityFeeLamports * 1000, // Convert to micro-lamports
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: priorityFeeLamports,
            priorityLevel: "high" as any
          }
        }
      };

      const swapResult = await this.jupiterApi.swapPost({
        swapRequest
      });

      return swapResult;
    } catch (error) {
      console.error('Error getting swap transaction:', error);
      return { swapTransaction: null };
    }
  }

  // Execute the transaction
  private async executeTransaction(
    swapTransaction: string,
    privateKeyString: string
  ): Promise<string | null> {
    try {
      // Decode private key
      const privateKeyBytes = bs58.decode(privateKeyString);
      const keypair = Keypair.fromSecretKey(privateKeyBytes);

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
        request.tokenAmount,
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
      // Get wallet balance
      const { data: walletToken } = await supabase
        .from('wallet_tokens')
        .select('balance')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (!walletToken || !walletToken.balance) {
        return { success: false, error: 'No balance found' };
      }

      // Execute swap with max slippage for emergency
      const result = await this.executeSwapToSol({
        walletAddress,
        tokenMint,
        tokenAmount: walletToken.balance,
        tokenDecimals: 9, // Default to 9 decimals for emergency
        slippageBps: 5000, // 50% slippage for emergency
        priorityFeeMultiplier: 5, // Max priority
        walletPrivateKey: '' // This would need to be retrieved securely
      });

      return {
        success: result.success,
        signature: result.signature,
        error: result.error
      };
    } catch (error) {
      console.error('Emergency sell error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const createSwapService = (connection: Connection) => {
  return SwapService.getInstance(connection);
};