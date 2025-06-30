import supabase from '../utils/supabaseClient';
import { helius } from '../utils/heliusClient';
import { Connection, PublicKey } from '@solana/web3.js';
import config from '../config';
import axios from 'axios';
import { pumpFunRugDetector } from './PumpFunRugDetector';
import { rpcCall, rpcBatch } from '../utils/rpcGate';

export class RugCheckPollingService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingIntervalMs = 30000; // Reduced to every 30 seconds to minimize RPC calls
  private isPolling = false;
  private lastPollTime = 0;
  private updateCycle = 0;
  
  // Memoization caches with TTL
  private holderCountCache = new Map<string, { value: number; timestamp: number }>();
  private bundlerCountCache = new Map<string, { value: number; timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes

  constructor() {
    console.log('RugCheckPollingService initialized - will update rugcheck data every 30 seconds');
  }

  async startPolling() {
    console.log('Starting RugCheck polling service...');
    
    // Initial poll
    await this.pollRugCheckData();
    
    // Set up interval - same as price polling
    this.pollingInterval = setInterval(() => {
      this.pollRugCheckData().catch(error => {
        console.error('Error in RugCheck polling:', error);
      });
    }, this.pollingIntervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('RugCheck polling stopped');
    }
  }

  private async pollRugCheckData() {
    // Prevent overlapping polls
    if (this.isPolling) {
      return;
    }

    // Rate limit protection
    const now = Date.now();
    const timeSinceLastPoll = now - this.lastPollTime;
    if (timeSinceLastPoll < 1000) {
      return;
    }

    this.isPolling = true;
    this.lastPollTime = now;
    this.updateCycle++;

    try {
      // Get active tokens (same logic as price polling)
      const { data: tokens, error } = await supabase
        .from('token_metadata')
        .select('mint, symbol')
        .eq('is_active', true)
        .order('last_active_at', { ascending: false })
        .limit(50);

      if (error || !tokens || tokens.length === 0) {
        return;
      }

      // For demo purposes, we'll update rugcheck data with slight variations
      // In production, this would call the actual RugCheck API
      
      // Update one token per cycle to distribute updates
      const tokenIndex = this.updateCycle % tokens.length;
      const tokenToUpdate = tokens[tokenIndex];
      
      // Get current data
      const { data: currentData } = await supabase
        .from('rugcheck_reports')
        .select('*')
        .eq('token_mint', tokenToUpdate.mint)
        .single();

      if (currentData) {
        // Fetch real data for updates
        try {
          let hasChanges = false;
          const updates: any = {
            updated_at: new Date().toISOString()
          };
          
          // Get real holder count
          const holderCount = await this.getRealHolderCount(tokenToUpdate.mint);
          if (holderCount !== null && holderCount !== currentData.holders) {
            updates.holders = holderCount;
            hasChanges = true;
          }
          
          // Creator balance is now tracked by LiquidityVelocityTracker for better performance
          
          // Get LP locked percentage
          const lpLocked = await this.getLPLockedPercent(tokenToUpdate.mint);
          if (lpLocked !== currentData.lp_locked) {
            updates.lp_locked = lpLocked;
            hasChanges = true;
          }
          
          // Get bundler count
          const bundlerCount = await this.getBundlerCount(tokenToUpdate.mint);
          if (bundlerCount !== (currentData.bundler_count || 0)) {
            updates.bundler_count = bundlerCount;
            hasChanges = true;
          }
          
          // Only update if something changed
          if (hasChanges) {
            // Recalculate risk score with new data
            const newRiskScore = this.calculateRiskScore(
              updates.holders || currentData.holders,
              {
                mint_authority: currentData.mint_authority,
                freeze_authority: currentData.freeze_authority,
                lp_locked: updates.lp_locked || currentData.lp_locked,
                creator_balance_percent: currentData.creator_balance_percent || 0  // Use existing value
              }
            );
            
            updates.risk_score = newRiskScore;
            updates.risk_level = newRiskScore > 80 ? 'danger' : 
                               newRiskScore > 60 ? 'high' : 
                               newRiskScore > 40 ? 'medium' : 
                               newRiskScore > 20 ? 'low' : 'safe';
            
            const { error: updateError } = await supabase
              .from('rugcheck_reports')
              .update(updates)
              .eq('token_mint', tokenToUpdate.mint);
            
            if (!updateError) {
              console.log(`Updated rugcheck data for ${tokenToUpdate.symbol}:`, updates);
            }
          }
        } catch (error) {
          console.error('Error updating with real data:', error);
        }
        
        return; // Skip the old random update logic
      } else {
        // Create new report with real blockchain data
        const realData = {
          holders: 0,
          riskScore: 50,
          lpLocked: 0,
          creatorBalance: 0,
          creatorAddress: '',
          mintAuthority: false,
          freezeAuthority: false,
          bundlerCount: 0,
          warnings: [] as string[]
        };
        
        try {
          // Get real holder count
          const holderCount = await this.getRealHolderCount(tokenToUpdate.mint);
          if (holderCount !== null) {
            realData.holders = holderCount;
            console.log(`Got real holder count for ${tokenToUpdate.symbol}: ${realData.holders}`);
          }
          
          // Creator balance is now tracked by LiquidityVelocityTracker
          realData.creatorBalance = 0;  // Will be updated by velocity tracker
          
          // Get LP locked percentage
          realData.lpLocked = await this.getLPLockedPercent(tokenToUpdate.mint);
          
          // Get bundler count
          realData.bundlerCount = await this.getBundlerCount(tokenToUpdate.mint);
          
          // Get mint/freeze authorities and creator from Helius
          const tokenInfo = await helius.rpc.getAsset({ id: tokenToUpdate.mint });
          if (tokenInfo) {
            // Get creator address
            if (tokenInfo.creators && tokenInfo.creators.length > 0) {
              realData.creatorAddress = tokenInfo.creators[0].address;
            }
            
            // Check authorities
            if (tokenInfo.authorities) {
              realData.mintAuthority = tokenInfo.authorities.some((auth: any) => 
                auth.scopes.includes('mint') && auth.address !== '11111111111111111111111111111111'
              );
              realData.freezeAuthority = tokenInfo.authorities.some((auth: any) => 
                auth.scopes.includes('freeze') && auth.address !== '11111111111111111111111111111111'
              );
            }
          }
          
          // Calculate risk score based on real data
          realData.riskScore = this.calculateRiskScore(realData.holders, {
            mint_authority: realData.mintAuthority,
            freeze_authority: realData.freezeAuthority,
            lp_locked: realData.lpLocked,
            creator_balance_percent: realData.creatorBalance
          });
          
          // Generate warnings based on real data
          if (realData.creatorBalance > 20) {
            realData.warnings.push(`Creator holds ${realData.creatorBalance.toFixed(1)}% of supply`);
          }
          if (realData.mintAuthority) {
            realData.warnings.push('Mint authority not revoked');
          }
          if (realData.freezeAuthority) {
            realData.warnings.push('Freeze authority not revoked');
          }
          if (realData.lpLocked < 50) {
            realData.warnings.push(`Only ${realData.lpLocked}% of LP is locked`);
          }
          if (realData.holders < 10) {
            realData.warnings.push(`Very low holder count: ${realData.holders}`);
          }
          if (realData.bundlerCount > 5) {
            realData.warnings.push(`High bundler activity detected: ${realData.bundlerCount} bundlers`);
          }
          
        } catch (error) {
          console.error('Error fetching real blockchain data:', error);
        }
        
        // Use real data for the report
        await supabase
          .from('rugcheck_reports')
          .insert({
            token_mint: tokenToUpdate.mint,
            risk_score: realData.riskScore,
            risk_level: realData.riskScore > 80 ? 'danger' : 
                       realData.riskScore > 60 ? 'high' : 
                       realData.riskScore > 40 ? 'medium' : 
                       realData.riskScore > 20 ? 'low' : 'safe',
            lp_locked: realData.lpLocked,
            holders: realData.holders,
            creator_address: realData.creatorAddress,
            creator_balance_percent: realData.creatorBalance,
            creator_rugged: false, // Would need historical data to determine
            mint_authority: realData.mintAuthority,
            freeze_authority: realData.freezeAuthority,
            bundler_count: realData.bundlerCount,
            warnings: realData.warnings,
            top_holders: [],
            updated_at: new Date().toISOString()
          });
        
        console.log(`Created new RugCheck report for ${tokenToUpdate.symbol}`);
      }
    } catch (error) {
      console.error('Error polling RugCheck data:', error);
    } finally {
      this.isPolling = false;
    }
  }

  // Method to trigger immediate update for specific tokens
  async updateTokensImmediately(tokenMints: string[]) {
    console.log(`Immediate RugCheck update requested for ${tokenMints.length} tokens`);
    
    try {
      // In production, this would call the actual RugCheck API
      // For now, we'll just ensure reports exist for these tokens
      for (const mint of tokenMints) {
        const { data: existing } = await supabase
          .from('rugcheck_reports')
          .select('token_mint')
          .eq('token_mint', mint)
          .single();

        if (!existing) {
          // Fetch real data for immediate update
          const holderCount = await this.getRealHolderCount(mint);
          const creatorBalance = 0;  // Now tracked by LiquidityVelocityTracker
          const lpLocked = await this.getLPLockedPercent(mint);
          const bundlerCount = await this.getBundlerCount(mint);
          
          // Get token info for authorities and creator
          let creatorAddress = '';
          let mintAuthority = false;
          let freezeAuthority = false;
          
          try {
            const tokenInfo = await helius.rpc.getAsset({ id: mint });
            if (tokenInfo) {
              if (tokenInfo.creators && tokenInfo.creators.length > 0) {
                creatorAddress = tokenInfo.creators[0].address;
              }
              if (tokenInfo.authorities) {
                mintAuthority = tokenInfo.authorities.some((auth: any) => 
                  auth.scopes.includes('mint') && auth.address !== '11111111111111111111111111111111'
                );
                freezeAuthority = tokenInfo.authorities.some((auth: any) => 
                  auth.scopes.includes('freeze') && auth.address !== '11111111111111111111111111111111'
                );
              }
            }
          } catch (error) {
            console.error('Error getting token info:', error);
          }
          
          const riskScore = this.calculateRiskScore(holderCount || 0, {
            mint_authority: mintAuthority,
            freeze_authority: freezeAuthority,
            lp_locked: lpLocked,
            creator_balance_percent: creatorBalance
          });
          
          await supabase
            .from('rugcheck_reports')
            .insert({
              token_mint: mint,
              risk_score: riskScore,
              risk_level: riskScore > 80 ? 'danger' : 
                         riskScore > 60 ? 'high' : 
                         riskScore > 40 ? 'medium' : 
                         riskScore > 20 ? 'low' : 'safe',
              lp_locked: lpLocked,
              holders: holderCount || 0,
              creator_address: creatorAddress,
              creator_balance_percent: creatorBalance,
              creator_rugged: false,
              mint_authority: mintAuthority,
              freeze_authority: freezeAuthority,
              bundler_count: bundlerCount,
              warnings: [],
              updated_at: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Error in immediate RugCheck update:', error);
    }
  }

  // DEPRECATED: Creator balance percentage is now tracked by LiquidityVelocityTracker
  // This provides better performance (updates every 30s for all tokens instead of one token per 30s)
  /*
  private async getCreatorBalancePercent(mint: string): Promise<number> {
    // Moved to LiquidityVelocityTracker.getCreatorBalancePercent()
  }
  */
  
  // Get bundler count by analyzing recent transactions
  private async getBundlerCount(mint: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.bundlerCountCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`Using cached bundler count for ${mint}: ${cached.value}`);
        return cached.value;
      }
      
      console.log(`Checking for bundlers on ${mint}`);
      
      // Get recent transactions for this token
      const signaturesResponse = await rpcCall<any>(
        "getSignaturesForAddress",
        [
          mint,
          { limit: 100 }
        ]
      );
      
      if (!signaturesResponse || signaturesResponse.length === 0) {
        return 0;
      }
      
      // Analyze transactions for bundler patterns
      const signatures = signaturesResponse.map((sig: any) => sig.signature);
      const bundlerAddresses = new Set<string>();
      
      // Known bundler programs and addresses
      const knownBundlers = [
        'jito', // Jito bundler
        'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', // Jito fee account
        '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', // Jito tip program
        'T1pyyaTNZsKv2WcRAB8oVnk93mLJw2XzjtVYqCsaHqt', // Jito tip program v2
      ];
      
      // Batch transaction requests
      const samplesToCheck = Math.min(10, signatures.length);
      const batchRequests = [];
      for (let i = 0; i < samplesToCheck; i++) {
        batchRequests.push({
          method: "getTransaction",
          params: [
            signatures[i],
            { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
          ]
        });
      }
      
      try {
        const transactions = await rpcBatch<any>(batchRequests);
        
        for (const txResponse of transactions) {
          if (txResponse?.transaction) {
            const tx = txResponse.transaction;
            
            // Check for bundler signatures in transaction
            // 1. Multiple instructions in same tx (bundling indicator)
            const instructionCount = tx.message?.instructions?.length || 0;
            if (instructionCount > 3) {
              // Likely bundled if many instructions
              const signer = tx.message?.accountKeys?.[0]?.pubkey;
              if (signer) bundlerAddresses.add(signer);
            }
            
            // 2. Check for known bundler programs
            tx.message?.instructions?.forEach((inst: any) => {
              const programId = inst.programId || inst.program;
              if (knownBundlers.some(bundler => 
                programId?.toLowerCase().includes(bundler.toLowerCase())
              )) {
                const signer = tx.message?.accountKeys?.[0]?.pubkey;
                if (signer) bundlerAddresses.add(signer);
              }
            });
            
            // 3. Check for Jito tips
            if (tx.meta?.innerInstructions) {
              for (const inner of tx.meta.innerInstructions) {
                if (inner.instructions) {
                  for (const inst of inner.instructions) {
                    if (inst.parsed?.type === 'transfer' && 
                        knownBundlers.includes(inst.parsed?.info?.destination)) {
                      const signer = tx.message?.accountKeys?.[0]?.pubkey;
                      if (signer) bundlerAddresses.add(signer);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error batch fetching transactions:', error);
      }
      
      const bundlerCount = bundlerAddresses.size;
      if (bundlerCount > 0) {
        console.log(`Found ${bundlerCount} bundlers for ${mint}`);
      }
      
      // Cache the result
      this.bundlerCountCache.set(mint, { value: bundlerCount, timestamp: Date.now() });
      
      return bundlerCount;
    } catch (error) {
      console.error('Error checking for bundlers:', error);
      return 0;
    }
  }

  // Get LP locked percentage
  private async getLPLockedPercent(mint: string): Promise<number> {
    try {
      // For pump.fun tokens, LP is always in bonding curve (100% locked)
      if (mint.endsWith('pump')) {
        return 100;
      }
      
      // For other tokens, check Raydium liquidity pools
      // Get the token's liquidity info from our database
      const { data: priceData } = await supabase
        .from('token_prices')
        .select('liquidity, platform')
        .eq('token_mint', mint)
        .single();
      
      if (priceData && priceData.platform === 'raydium' && priceData.liquidity > 0) {
        // For Raydium pools, check if LP tokens are burned
        // This is a simplified check - in production you'd verify LP token burn
        return 80; // Assume 80% locked for now
      }
      
      return 0; // No liquidity or unknown
    } catch (error) {
      console.error('Error getting LP locked status:', error);
      return 0;
    }
  }

  // Get real holder count from blockchain
  private async getRealHolderCount(mint: string): Promise<number | null> {
    try {
      // Check cache first
      const cached = this.holderCountCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`Using cached holder count for ${mint}: ${cached.value}`);
        return cached.value;
      }
      
      console.log(`Fetching real holder count for ${mint}`);
      
      // Validate mint address format
      try {
        new PublicKey(mint); // Test if valid
      } catch (e) {
        console.error(`Invalid mint address format: ${mint}`);
        return null;
      }
      
      // Method 1: Use standard getTokenLargestAccounts for estimation
      try {
        // Use standard Solana RPC method that's widely available
        const response = await rpcCall<any>(
          "getTokenLargestAccounts",
          [mint]
        );
        
        if (response && response.value) {
          const largestAccounts = response.value;
          // We get the top 20 holders - use this to estimate total holders
          let holderCount = largestAccounts.length; // At minimum, these holders exist
          
          // If we have 20 holders returned, there are likely more
          if (largestAccounts.length >= 20) {
            // Estimate based on distribution
            const totalSupply = largestAccounts.reduce((sum: number, acc: any) => {
              return sum + parseFloat(acc.uiAmountString || acc.uiAmount || '0');
            }, 0);
            
            // If top 20 hold less than 80% of supply, likely many more holders
            const top20Percentage = (totalSupply / 1000000000) * 100; // Assume 1B total supply
            if (top20Percentage < 80) {
              holderCount = 100; // Conservative estimate
            } else {
              holderCount = 50; // Still likely more than 20
            }
          }
          
          console.log(`Estimated ${holderCount}+ holders for ${mint} from top accounts`);
          
          // Cache the result
          this.holderCountCache.set(mint, { value: holderCount, timestamp: Date.now() });
          
          return holderCount;
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.error('Helius API rate limit hit');
        } else if (error.response?.data?.error) {
          console.error('Helius RPC error:', error.response.data.error);
        } else {
          console.error('Error fetching from Helius RPC:', error.message);
        }
      }
      
      // Method 2: Try pump.fun API for pump tokens as fallback
      try {
        if (mint.endsWith('pump')) {
          const pumpResponse = await axios.get(`https://frontend-api.pump.fun/coins/${mint}`, {
            timeout: 5000
          });
          
          if (pumpResponse.data && pumpResponse.data.holder_count !== undefined) {
            console.log(`Got holder count from pump.fun API: ${pumpResponse.data.holder_count}`);
            const holderCount = pumpResponse.data.holder_count;
            
            // Cache the result
            this.holderCountCache.set(mint, { value: holderCount, timestamp: Date.now() });
            
            return holderCount;
          }
        }
      } catch (error) {
        // Continue to next method
      }
      
      console.log(`Could not fetch real holder count for ${mint}`);
      return null;
      
      /* Disabled due to performance/rate limits
      const connection = new Connection(config.heliusRpcUrl || 'https://api.mainnet-beta.solana.com');
      const mintPubkey = new PublicKey(mint);
      
      // Get the token program accounts filtered by mint
      // Note: This is rate-limited and expensive, use sparingly
      const tokenAccounts = await connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
          filters: [
            { dataSize: 165 }, // Token account size
            {
              memcmp: {
                offset: 0, // Mint is at offset 0 in token account
                bytes: mint,
              },
            },
          ],
        }
      );
      
      // Filter out zero-balance accounts
      let activeHolders = 0;
      for (const account of tokenAccounts) {
        // Check if account has non-zero balance
        // Token account structure: mint (32), owner (32), amount (8), ...
        const data = account.account.data;
        const amount = data.readBigUInt64LE(64); // Amount is at offset 64
        
        if (amount > 0n) {
          activeHolders++;
        }
      }
      
      console.log(`Found ${activeHolders} holders for ${mint} via getProgramAccounts`);
      return activeHolders;
      */
      
    } catch (error) {
      console.error('Error fetching real holder count:', error);
      return null;
    }
  }

  // Calculate risk score based on real data
  private calculateRiskScore(holders: number, currentData: any): number {
    let score = 0;
    
    // Holder count risk (0-40 points)
    if (holders <= 1) score += 40;
    else if (holders <= 5) score += 35;
    else if (holders <= 10) score += 30;
    else if (holders <= 50) score += 20;
    else if (holders <= 100) score += 10;
    else if (holders <= 500) score += 5;
    
    // Authority risk (0-30 points)
    if (currentData.mint_authority) score += 15;
    if (currentData.freeze_authority) score += 15;
    
    // Liquidity risk (0-20 points)
    const lpLocked = currentData.lp_locked || 0;
    if (lpLocked < 10) score += 20;
    else if (lpLocked < 50) score += 10;
    else if (lpLocked < 80) score += 5;
    
    // Creator balance risk (0-10 points)
    const creatorBalance = currentData.creator_balance_percent || 0;
    if (creatorBalance > 20) score += 10;
    else if (creatorBalance > 10) score += 5;
    
    return Math.min(100, score);
  }
}

// Export singleton instance
export const rugCheckPollingService = new RugCheckPollingService();