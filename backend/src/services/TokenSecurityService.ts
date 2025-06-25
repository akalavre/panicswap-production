import { Connection, PublicKey, Transaction, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getTransferFeeConfig } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import config from '../config';

interface SecurityAnalysis {
  token_mint: string;
  mint_renounced: boolean;
  freeze_renounced: boolean;
  mint_authority: string | null;
  freeze_authority: string | null;
  lp_locked: boolean;
  lp_lock_percent: number;
  lp_unlock_date: Date | null;
  lp_locker_program: string | null;
  is_honeypot: boolean;
  honeypot_reason: string | null;
  tax_buy: number;
  tax_sell: number;
  tax_method: string | null;
  is_muted: boolean | null;
  is_verified: boolean | null;
  is_blocklisted: boolean | null;
  checked_at_slot: number;
  checked_at: Date;
}

export class TokenSecurityService {
  private connection: Connection;
  private supabase: any;
  private cache: Map<string, { data: SecurityAnalysis; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  
  // Known locker programs
  private readonly LOCKER_PROGRAMS = {
    PINK_LOCK: '6JmzGqPb4XQyiFpB9dXHnVGcNGPCPzPEKJwQJHBPvNMu',
    PUMP_FUN_LOCK: 'TokenLockProgramV1111111111111111111111111',
    VESTING_VAULT: 'VestingProgramV1111111111111111111111111111'
  };

  constructor(connection: Connection) {
    this.connection = connection;
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Get comprehensive security analysis for a token
   */
  async analyzeToken(tokenMint: string): Promise<SecurityAnalysis> {
    // Check cache first
    const cached = this.cache.get(tokenMint);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check database for recent analysis
    const existing = await this.getExistingAnalysis(tokenMint);
    if (existing && Date.now() - new Date(existing.checked_at).getTime() < this.CHECK_INTERVAL) {
      this.cache.set(tokenMint, { data: existing, timestamp: Date.now() });
      return existing;
    }

    // Perform fresh analysis
    const analysis = await this.performFullAnalysis(tokenMint);
    
    // Store in database
    await this.storeAnalysis(analysis);
    
    // Cache result
    this.cache.set(tokenMint, { data: analysis, timestamp: Date.now() });
    
    return analysis;
  }

  /**
   * Perform full security analysis
   */
  private async performFullAnalysis(tokenMint: string): Promise<SecurityAnalysis> {
    const mintPubkey = new PublicKey(tokenMint);
    const currentSlot = await this.connection.getSlot();
    
    // Run all checks in parallel
    const [
      authorities,
      lpLock,
      honeypot,
      tax,
      heliusData
    ] = await Promise.allSettled([
      this.checkMintAuthorities(mintPubkey),
      this.checkLPLock(mintPubkey),
      this.detectHoneypot(mintPubkey),
      this.checkTransferTax(mintPubkey),
      this.getHeliusSecurityData(tokenMint)
    ]);

    // Combine results
    const analysis: SecurityAnalysis = {
      token_mint: tokenMint,
      mint_renounced: authorities.status === 'fulfilled' ? authorities.value.isMintRenounced : false,
      freeze_renounced: authorities.status === 'fulfilled' ? authorities.value.isFreezeRenounced : false,
      mint_authority: authorities.status === 'fulfilled' ? authorities.value.mintAuthority : null,
      freeze_authority: authorities.status === 'fulfilled' ? authorities.value.freezeAuthority : null,
      lp_locked: lpLock.status === 'fulfilled' ? lpLock.value.isLocked : false,
      lp_lock_percent: lpLock.status === 'fulfilled' ? lpLock.value.lockPercent : 0,
      lp_unlock_date: lpLock.status === 'fulfilled' ? lpLock.value.unlockDate : null,
      lp_locker_program: lpLock.status === 'fulfilled' ? lpLock.value.lockerProgram : null,
      is_honeypot: honeypot.status === 'fulfilled' ? honeypot.value.isHoneypot : false,
      honeypot_reason: honeypot.status === 'fulfilled' ? honeypot.value.reason : null,
      tax_buy: tax.status === 'fulfilled' ? tax.value.buyTax : 0,
      tax_sell: tax.status === 'fulfilled' ? tax.value.sellTax : 0,
      tax_method: tax.status === 'fulfilled' ? tax.value.method : null,
      is_muted: heliusData.status === 'fulfilled' ? heliusData.value.isMuted : null,
      is_verified: heliusData.status === 'fulfilled' ? heliusData.value.isVerified : null,
      is_blocklisted: heliusData.status === 'fulfilled' ? heliusData.value.isBlocklisted : null,
      checked_at_slot: currentSlot,
      checked_at: new Date()
    };

    return analysis;
  }

  /**
   * Check mint and freeze authorities
   */
  private async checkMintAuthorities(mintAddress: PublicKey) {
    try {
      // Try both token programs
      let mintInfo;
      try {
        mintInfo = await getMint(this.connection, mintAddress, undefined, TOKEN_PROGRAM_ID);
      } catch {
        // Try Token-2022
        mintInfo = await getMint(this.connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID);
      }

      return {
        mintAuthority: mintInfo.mintAuthority ? mintInfo.mintAuthority.toString() : null,
        freezeAuthority: mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toString() : null,
        isMintRenounced: mintInfo.mintAuthority === null,
        isFreezeRenounced: mintInfo.freezeAuthority === null
      };
    } catch (error) {
      console.error('Error checking mint authorities:', error);
      return {
        mintAuthority: null,
        freezeAuthority: null,
        isMintRenounced: false,
        isFreezeRenounced: false
      };
    }
  }

  /**
   * Check LP lock status across multiple lockers
   */
  private async checkLPLock(tokenMint: PublicKey) {
    try {
      // Check each known locker program
      for (const [name, programId] of Object.entries(this.LOCKER_PROGRAMS)) {
        const lockInfo = await this.checkLockerProgram(tokenMint, new PublicKey(programId), name);
        if (lockInfo.isLocked) {
          return lockInfo;
        }
      }

      // Check for PDA-based locks
      const pdaLock = await this.checkPDALock(tokenMint);
      if (pdaLock.isLocked) {
        return pdaLock;
      }

      return {
        isLocked: false,
        lockPercent: 0,
        unlockDate: null,
        lockerProgram: null
      };
    } catch (error) {
      console.error('Error checking LP lock:', error);
      return {
        isLocked: false,
        lockPercent: 0,
        unlockDate: null,
        lockerProgram: null
      };
    }
  }

  /**
   * Check specific locker program
   */
  private async checkLockerProgram(tokenMint: PublicKey, programId: PublicKey, programName: string) {
    try {
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // Common offset for token mint in lock accounts
              bytes: tokenMint.toBase58()
            }
          }
        ]
      });

      if (accounts.length > 0) {
        // Parse lock data (simplified - actual parsing depends on program)
        const lockData = accounts[0].account.data;
        // This is simplified - actual parsing would decode the account data
        
        return {
          isLocked: true,
          lockPercent: 100, // Would calculate from actual data
          unlockDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Placeholder
          lockerProgram: programName
        };
      }
    } catch (error) {
      // Locker not found or error
    }

    return {
      isLocked: false,
      lockPercent: 0,
      unlockDate: null,
      lockerProgram: null
    };
  }

  /**
   * Check for PDA-based locks
   */
  private async checkPDALock(tokenMint: PublicKey) {
    try {
      // Common PDA seeds for lock accounts
      const seeds = [Buffer.from('lock'), tokenMint.toBuffer()];
      
      // Try common lock programs
      for (const programId of Object.values(this.LOCKER_PROGRAMS)) {
        const [pda] = PublicKey.findProgramAddressSync(seeds, new PublicKey(programId));
        const account = await this.connection.getAccountInfo(pda);
        
        if (account && account.lamports > 0) {
          return {
            isLocked: true,
            lockPercent: 100,
            unlockDate: null,
            lockerProgram: 'PDA_LOCK'
          };
        }
      }
    } catch (error) {
      // PDA not found
    }

    return {
      isLocked: false,
      lockPercent: 0,
      unlockDate: null,
      lockerProgram: null
    };
  }

  /**
   * Detect honeypot via transaction simulation
   */
  private async detectHoneypot(tokenMint: PublicKey) {
    try {
      // Create test wallet
      const testWallet = Keypair.generate();
      
      // Airdrop minimal SOL for rent
      const airdropSignature = await this.connection.requestAirdrop(
        testWallet.publicKey,
        0.001 * LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(airdropSignature);

      // Create simulated sell transaction
      // This is simplified - actual implementation would create proper swap instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: testWallet.publicKey,
          toPubkey: testWallet.publicKey,
          lamports: 1
        })
      );

      // Simulate transaction
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        const error = simulation.value.err.toString();
        
        // Filter out non-honeypot errors
        if (error.includes('insufficient funds') || 
            error.includes('insufficient balance')) {
          return { isHoneypot: false, reason: null };
        }
        
        // Honeypot indicators
        if (error.includes('custom program error') ||
            error.includes('transfer failed') ||
            error.includes('trading disabled')) {
          return { isHoneypot: true, reason: error };
        }
      }

      return { isHoneypot: false, reason: null };
    } catch (error) {
      console.error('Error detecting honeypot:', error);
      return { isHoneypot: false, reason: null };
    }
  }

  /**
   * Check transfer tax
   */
  private async checkTransferTax(mintAddress: PublicKey) {
    try {
      // Check Token-2022 extensions
      const mintAccount = await this.connection.getAccountInfo(mintAddress);
      
      if (mintAccount && mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        // Get transfer fee config
        const transferFeeConfig = await getTransferFeeConfig(mintAccount as any);
        
        if (transferFeeConfig) {
          const buyTax = Number(transferFeeConfig.newerTransferFee.transferFeeBasisPoints) / 100;
          const sellTax = buyTax; // Usually same for Token-2022
          
          return {
            hasTax: true,
            buyTax,
            sellTax,
            method: 'token2022'
          };
        }
      }

      // Empirical tax detection from recent transfers
      const empiricalTax = await this.detectEmpiricalTax(mintAddress);
      if (empiricalTax.hasTax) {
        return empiricalTax;
      }

      return { hasTax: false, buyTax: 0, sellTax: 0, method: null };
    } catch (error) {
      console.error('Error checking transfer tax:', error);
      return { hasTax: false, buyTax: 0, sellTax: 0, method: null };
    }
  }

  /**
   * Detect tax empirically from recent transfers
   */
  private async detectEmpiricalTax(mintAddress: PublicKey) {
    try {
      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(mintAddress, { limit: 20 });
      
      // Analyze transfers to detect tax
      // This is simplified - actual implementation would parse transfer amounts
      
      return { hasTax: false, buyTax: 0, sellTax: 0, method: null };
    } catch (error) {
      return { hasTax: false, buyTax: 0, sellTax: 0, method: null };
    }
  }

  /**
   * Get Helius security data
   */
  private async getHeliusSecurityData(tokenMint: string) {
    try {
      const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${config.heliusApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: [tokenMint],
          includeOffChain: true,
          disableCache: false
        })
      });

      if (!response.ok) {
        throw new Error('Helius API error');
      }

      const data = await response.json();
      const tokenData = data[0];

      return {
        isMuted: tokenData?.legacyMetadata?.isMuted || false,
        isVerified: tokenData?.legacyMetadata?.isVerified || false,
        isBlocklisted: tokenData?.legacyMetadata?.isBlocklisted || false
      };
    } catch (error) {
      console.error('Error fetching Helius data:', error);
      return {
        isMuted: null,
        isVerified: null,
        isBlocklisted: null
      };
    }
  }

  /**
   * Get existing analysis from database
   */
  private async getExistingAnalysis(tokenMint: string): Promise<SecurityAnalysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('token_security_analysis')
        .select('*')
        .eq('token_mint', tokenMint)
        .single();

      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Store analysis in database
   */
  private async storeAnalysis(analysis: SecurityAnalysis) {
    try {
      const { error } = await this.supabase
        .from('token_security_analysis')
        .upsert({
          ...analysis,
          updated_at: new Date()
        });

      if (error) {
        console.error('Error storing security analysis:', error);
      }
    } catch (error) {
      console.error('Error storing security analysis:', error);
    }
  }

  /**
   * Batch analyze multiple tokens
   */
  async batchAnalyze(tokenMints: string[]): Promise<(SecurityAnalysis | null)[]> {
    const batchSize = 10;
    const results: (SecurityAnalysis | null)[] = [];

    for (let i = 0; i < tokenMints.length; i += batchSize) {
      const batch = tokenMints.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(mint => this.analyzeToken(mint))
      );

      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : null
      ));

      // Rate limit delay
      if (i + batchSize < tokenMints.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}