import { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

interface TransactionAnalysis {
  isDangerous: boolean;
  type: 'LIQUIDITY_REMOVAL' | 'AUTHORITY_CHANGE' | 'LARGE_SELL' | 'FREEZE_ENABLE' | 'UNKNOWN';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedTokens: string[];
  details: {
    program: string;
    instruction: string;
    accounts?: string[];
    amount?: string;
    percentage?: number;
  };
  confidence: number;
  riskScore: number;
}

interface TokenInfo {
  mint: string;
  decimals: number;
  supply?: string;
}

export class TransactionAnalyzer {
  private connection: Connection;
  private knownRugPatterns = new Map<string, RegExp>();
  private dexPrograms = {
    RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    JUPITER: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
  };

  constructor(connection: Connection) {
    this.connection = connection;
    this.initializePatterns();
  }

  private initializePatterns() {
    // Raydium liquidity removal patterns
    this.knownRugPatterns.set('raydium_remove_liquidity', /removeLiquidity|withdraw/i);
    
    // Pump.fun specific patterns
    this.knownRugPatterns.set('pump_fun_sell', /sell|swap.*SOL/i);
    
    // Authority change patterns
    this.knownRugPatterns.set('authority_change', /setAuthority|updateAuthority|transferOwnership/i);
    
    // Freeze patterns
    this.knownRugPatterns.set('freeze_account', /freezeAccount|freeze/i);
  }

  /**
   * Analyze a transaction for potential rug patterns
   */
  async analyzeTransaction(
    tx: ParsedTransactionWithMeta, 
    signature: string
  ): Promise<TransactionAnalysis | null> {
    if (!tx || !tx.transaction) {
      return null;
    }

    try {
      const instructions = tx.transaction.message.instructions;
      const accountKeys = tx.transaction.message.accountKeys;
      
      // Check each instruction
      for (const instruction of instructions) {
        const analysis = await this.analyzeInstruction(instruction, accountKeys, tx);
        
        if (analysis && analysis.isDangerous) {
          console.log(`[TransactionAnalyzer] Dangerous pattern detected in ${signature}`);
          return analysis;
        }
      }

      // Check for suspicious patterns in logs
      if (tx.meta?.logMessages) {
        const logAnalysis = this.analyzeTransactionLogs(tx.meta.logMessages);
        if (logAnalysis && logAnalysis.isDangerous) {
          return logAnalysis;
        }
      }

      // Check for large balance changes
      if (tx.meta?.preBalances && tx.meta?.postBalances) {
        const balanceAnalysis = this.analyzeBalanceChanges(
          tx.meta.preBalances,
          tx.meta.postBalances,
          accountKeys
        );
        if (balanceAnalysis && balanceAnalysis.isDangerous) {
          return balanceAnalysis;
        }
      }

      return null;
    } catch (error) {
      console.error('[TransactionAnalyzer] Error analyzing transaction:', error);
      return null;
    }
  }

  /**
   * Analyze a single instruction
   */
  private async analyzeInstruction(
    instruction: any,
    accountKeys: any[],
    tx: ParsedTransactionWithMeta
  ): Promise<TransactionAnalysis | null> {
    // Get program ID
    const programId = instruction.programId?.toString() || 
                     accountKeys[instruction.programIdIndex]?.pubkey?.toString();

    if (!programId) return null;

    // Check if it's a DEX program
    const isDexProgram = Object.values(this.dexPrograms).includes(programId);
    
    if (isDexProgram) {
      // Analyze DEX-specific patterns
      return this.analyzeDexInstruction(instruction, programId, accountKeys, tx);
    }

    // Check for authority changes in SPL Token program
    if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
      return this.analyzeTokenProgramInstruction(instruction, accountKeys);
    }

    return null;
  }

  /**
   * Analyze DEX-specific instructions
   */
  private analyzeDexInstruction(
    instruction: any,
    programId: string,
    accountKeys: any[],
    tx: ParsedTransactionWithMeta
  ): TransactionAnalysis | null {
    // Check for Pump.fun sells
    if (programId === this.dexPrograms.PUMP_FUN) {
      return this.analyzePumpFunInstruction(instruction, accountKeys, tx);
    }

    // Check for Raydium liquidity removal
    if (programId === this.dexPrograms.RAYDIUM) {
      return this.analyzeRaydiumInstruction(instruction, accountKeys, tx);
    }

    // Generic DEX analysis
    const instructionType = instruction.parsed?.type || instruction.data;
    
    // Check for large swaps
    if (instructionType?.includes('swap') || instructionType?.includes('Swap')) {
      const amount = instruction.parsed?.info?.amount || 
                    instruction.parsed?.info?.amountIn ||
                    instruction.parsed?.info?.tokenAmount?.amount;
      
      if (amount && this.isLargeAmount(amount)) {
        return {
          isDangerous: true,
          type: 'LARGE_SELL',
          riskLevel: 'HIGH',
          affectedTokens: this.extractTokensFromInstruction(instruction, accountKeys),
          details: {
            program: programId,
            instruction: 'swap',
            amount: amount.toString()
          },
          confidence: 0.8,
          riskScore: 80
        };
      }
    }

    return null;
  }

  /**
   * Analyze Pump.fun specific instructions
   */
  private analyzePumpFunInstruction(
    instruction: any,
    accountKeys: any[],
    tx: ParsedTransactionWithMeta
  ): TransactionAnalysis | null {
    // Pump.fun uses custom instruction encoding
    // Look for sell patterns in instruction data
    const instructionData = instruction.data;
    
    // Check if it's a sell instruction (usually involves SOL output)
    const accounts = instruction.accounts || [];
    const hasSOLOutput = accounts.some((accountIndex: number) => {
      const account = accountKeys[accountIndex];
      return account?.pubkey?.toString() === '11111111111111111111111111111111'; // System program
    });

    if (hasSOLOutput) {
      // Extract token mint from accounts (usually first account in Pump.fun)
      const tokenMint = accounts[0] ? accountKeys[accounts[0]]?.pubkey?.toString() : null;
      
      return {
        isDangerous: true,
        type: 'LARGE_SELL',
        riskLevel: 'HIGH',
        affectedTokens: tokenMint ? [tokenMint] : [],
        details: {
          program: this.dexPrograms.PUMP_FUN,
          instruction: 'sell',
          accounts: accounts.map((idx: number) => accountKeys[idx]?.pubkey?.toString()).filter(Boolean)
        },
        confidence: 0.9,
        riskScore: 85
      };
    }

    return null;
  }

  /**
   * Analyze Raydium instructions
   */
  private analyzeRaydiumInstruction(
    instruction: any,
    accountKeys: any[],
    tx: ParsedTransactionWithMeta
  ): TransactionAnalysis | null {
    const instructionType = instruction.parsed?.type || '';
    
    // Check for liquidity removal
    if (instructionType.includes('removeLiquidity') || 
        instructionType.includes('withdraw')) {
      
      // Extract pool info
      const poolAccount = instruction.accounts?.[0];
      const lpAmount = instruction.parsed?.info?.amount;
      
      // High risk if removing significant liquidity
      if (lpAmount && this.isLargeAmount(lpAmount)) {
        return {
          isDangerous: true,
          type: 'LIQUIDITY_REMOVAL',
          riskLevel: 'CRITICAL',
          affectedTokens: this.extractTokensFromInstruction(instruction, accountKeys),
          details: {
            program: this.dexPrograms.RAYDIUM,
            instruction: 'removeLiquidity',
            amount: lpAmount.toString(),
            percentage: 100 // Calculate actual percentage if pool info available
          },
          confidence: 0.95,
          riskScore: 95
        };
      }
    }

    return null;
  }

  /**
   * Analyze SPL Token program instructions
   */
  private analyzeTokenProgramInstruction(
    instruction: any,
    accountKeys: any[]
  ): TransactionAnalysis | null {
    const instructionType = instruction.parsed?.type || '';
    
    // Check for authority changes
    if (instructionType.includes('setAuthority') || 
        instructionType.includes('Authority')) {
      
      const authorityType = instruction.parsed?.info?.authorityType;
      const newAuthority = instruction.parsed?.info?.newAuthority;
      
      // Critical if removing mint/freeze authority (setting to null)
      if (!newAuthority || newAuthority === '11111111111111111111111111111111') {
        return {
          isDangerous: true,
          type: 'AUTHORITY_CHANGE',
          riskLevel: 'CRITICAL',
          affectedTokens: [instruction.parsed?.info?.mint || ''],
          details: {
            program: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            instruction: 'setAuthority',
            accounts: [authorityType, newAuthority]
          },
          confidence: 0.9,
          riskScore: 90
        };
      }
    }

    // Check for freeze
    if (instructionType.includes('freeze')) {
      return {
        isDangerous: true,
        type: 'FREEZE_ENABLE',
        riskLevel: 'CRITICAL',
        affectedTokens: [instruction.parsed?.info?.account || ''],
        details: {
          program: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          instruction: 'freezeAccount'
        },
        confidence: 0.95,
        riskScore: 100
      };
    }

    return null;
  }

  /**
   * Analyze transaction logs for patterns
   */
  private analyzeTransactionLogs(logs: string[]): TransactionAnalysis | null {
    const logText = logs.join(' ').toLowerCase();
    
    // Check for known rug patterns in logs
    for (const [patternName, pattern] of this.knownRugPatterns) {
      if (pattern.test(logText)) {
        // Extract relevant details based on pattern
        if (patternName.includes('liquidity')) {
          return {
            isDangerous: true,
            type: 'LIQUIDITY_REMOVAL',
            riskLevel: 'HIGH',
            affectedTokens: [],
            details: {
              program: 'unknown',
              instruction: patternName
            },
            confidence: 0.7,
            riskScore: 75
          };
        }
      }
    }

    // Check for error patterns that might indicate malicious behavior
    if (logText.includes('insufficient funds') && logText.includes('withdraw')) {
      return {
        isDangerous: true,
        type: 'LIQUIDITY_REMOVAL',
        riskLevel: 'HIGH',
        affectedTokens: [],
        details: {
          program: 'unknown',
          instruction: 'suspected_drain'
        },
        confidence: 0.6,
        riskScore: 70
      };
    }

    return null;
  }

  /**
   * Analyze balance changes for suspicious patterns
   */
  private analyzeBalanceChanges(
    preBalances: number[],
    postBalances: number[],
    accountKeys: any[]
  ): TransactionAnalysis | null {
    // Look for large SOL movements
    for (let i = 0; i < preBalances.length; i++) {
      const preBalance = preBalances[i];
      const postBalance = postBalances[i];
      const change = postBalance - preBalance;
      
      // Check for large outflows (negative change)
      if (change < -1000000000) { // More than 1 SOL
        const account = accountKeys[i]?.pubkey?.toString();
        
        // Check if it's from a known pool or liquidity account
        if (account && this.isLikelyPoolAccount(account)) {
          return {
            isDangerous: true,
            type: 'LIQUIDITY_REMOVAL',
            riskLevel: 'HIGH',
            affectedTokens: [],
            details: {
              program: 'unknown',
              instruction: 'balance_drain',
              amount: Math.abs(change).toString(),
              accounts: [account]
            },
            confidence: 0.7,
            riskScore: 80
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract token mints from instruction
   */
  private extractTokensFromInstruction(instruction: any, accountKeys: any[]): string[] {
    const tokens = new Set<string>();
    
    // Check parsed info
    if (instruction.parsed?.info) {
      const info = instruction.parsed.info;
      if (info.mint) tokens.add(info.mint);
      if (info.tokenA) tokens.add(info.tokenA);
      if (info.tokenB) tokens.add(info.tokenB);
      if (info.source) tokens.add(info.source);
      if (info.destination) tokens.add(info.destination);
    }

    // Check accounts for token mints
    if (instruction.accounts) {
      for (const accountIndex of instruction.accounts) {
        const account = accountKeys[accountIndex];
        if (account?.pubkey) {
          const pubkey = account.pubkey.toString();
          // Basic heuristic - token mints are often in first few accounts
          if (accountIndex < 5 && pubkey.length === 44) {
            tokens.add(pubkey);
          }
        }
      }
    }

    return Array.from(tokens);
  }

  /**
   * Check if amount is considered large
   */
  private isLargeAmount(amount: string | number | BN): boolean {
    const value = typeof amount === 'string' ? 
      parseInt(amount) : 
      amount instanceof BN ? amount.toNumber() : amount;
    
    // Consider amounts over 1M tokens as large
    // This should be adjusted based on token decimals
    return value > 1000000;
  }

  /**
   * Check if account is likely a liquidity pool
   */
  private isLikelyPoolAccount(account: string): boolean {
    // Simple heuristic - could be enhanced with actual pool detection
    return account.length === 44 && !account.startsWith('11111');
  }
}