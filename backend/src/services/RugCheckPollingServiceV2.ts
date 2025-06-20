import supabase from '../utils/supabaseClient';
import { helius } from '../utils/heliusClient';
import { Connection, PublicKey } from '@solana/web3.js';
import config from '../config';
import axios from 'axios';
import { pumpFunRugDetector } from './PumpFunRugDetector';
import { withRateLimitRetry, BatchProcessor, SimpleCache } from '../utils/rateLimitWrapper';
import { rugcheckConfig, isAuthorityBurned, getRiskLevel } from '../config/rugcheckConfig';

interface TokenBatch {
  mint: string;
  symbol: string;
  platform?: string;
}

interface RugCheckData {
  tokenMint: string;
  riskScore: number;
  riskLevel: string;
  holderCount: number;
  creatorBalance: number;
  creatorBalancePercent: number;
  lpLocked: number;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  bundlerCount: number;
  topHolders: any[];
  warnings: string[];
  lastChecked: number;
  launchTime?: string | null;
  // New fields
  devActivityPct: number;
  devActivityTime: string | null;
  honeypotStatus: 'unknown' | 'safe' | 'warning';
  liquidityCurrent: number;
  liquidityChange1h: number;
  liquidityChange24h: number;
}

interface LiquiditySnapshot {
  timestamp: number;
  liquidity: number;
}

export class RugCheckPollingServiceV2 {
  private batchProcessor: BatchProcessor<TokenBatch, RugCheckData>;
  private holderCountCache: SimpleCache<number>;
  private creatorBalanceCache: SimpleCache<number>;
  private lpLockedCache: SimpleCache<number>;
  private bundlerCountCache: SimpleCache<number>;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pendingUpdates: Map<string, RugCheckData> = new Map();
  private bulkUpdateInterval: NodeJS.Timeout | null = null;
  
  // New caches for additional features
  private devActivityCache: SimpleCache<{ pct: number; time: string | null }>;
  private honeypotCache: SimpleCache<'unknown' | 'safe' | 'warning'>;
  private liquidityHistoryCache: SimpleCache<LiquiditySnapshot[]>;

  // Rate-limited API methods
  private rateLimitedGetTokenAccounts: typeof this.getRealHolderCount;
  private rateLimitedGetCreatorBalance: typeof this.getCreatorBalancePercent;
  private rateLimitedGetBundlerCount: typeof this.getBundlerCount;
  private rateLimitedGetDevActivity: typeof this.getDevWalletActivity;
  private rateLimitedCheckHoneypot: typeof this.checkHoneypotStatus;

  constructor() {
    // Initialize caches with TTL from config
    this.holderCountCache = new SimpleCache(rugcheckConfig.cache.holderCountTTL);
    this.creatorBalanceCache = new SimpleCache(rugcheckConfig.cache.creatorBalanceTTL);
    this.lpLockedCache = new SimpleCache(rugcheckConfig.cache.lpLockedTTL);
    this.bundlerCountCache = new SimpleCache(rugcheckConfig.cache.bundlerCountTTL);
    
    // Initialize new caches
    this.devActivityCache = new SimpleCache(300000); // 5 minutes TTL
    this.honeypotCache = new SimpleCache(600000); // 10 minutes TTL
    this.liquidityHistoryCache = new SimpleCache(86400000); // 24 hours TTL

    // Wrap methods with rate limit retry
    this.rateLimitedGetTokenAccounts = withRateLimitRetry(
      this.getRealHolderCount.bind(this)
    );
    this.rateLimitedGetCreatorBalance = withRateLimitRetry(
      this.getCreatorBalancePercent.bind(this)
    );
    this.rateLimitedGetBundlerCount = withRateLimitRetry(
      this.getBundlerCount.bind(this)
    );
    this.rateLimitedGetDevActivity = withRateLimitRetry(
      this.getDevWalletActivity.bind(this)
    );
    this.rateLimitedCheckHoneypot = withRateLimitRetry(
      this.checkHoneypotStatus.bind(this)
    );

    // Initialize batch processor
    this.batchProcessor = new BatchProcessor({
      batchSize: rugcheckConfig.polling.batchSize,
      batchDelayMs: rugcheckConfig.polling.batchDelayMs,
      processor: this.processBatch.bind(this),
    });

    console.log(`RugCheckPollingServiceV2 initialized - batch size: ${rugcheckConfig.polling.batchSize}, delay: ${rugcheckConfig.polling.batchDelayMs}ms`);
  }

  async startPolling() {
    console.log('Starting RugCheck polling service V2...');
    
    // Start bulk update interval (write to Supabase every 5 seconds)
    this.bulkUpdateInterval = setInterval(() => {
      this.flushPendingUpdates().catch(error => {
        console.error('Error flushing updates:', error);
      });
    }, 5000);

    // Start polling interval
    this.pollingInterval = setInterval(() => {
      this.pollActiveTokens().catch(error => {
        console.error('Error polling tokens:', error);
      });
    }, rugcheckConfig.polling.pollIntervalMs);

    // Initial poll
    await this.pollActiveTokens();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.bulkUpdateInterval) {
      clearInterval(this.bulkUpdateInterval);
      this.bulkUpdateInterval = null;
    }
    // Flush any remaining updates
    this.flushPendingUpdates().catch(console.error);
    console.log('RugCheck polling stopped');
  }

  private async pollActiveTokens() {
    try {
      // Get active tokens
      const { data: activeTokens, error } = await supabase
        .from('token_metadata')
        .select('mint, symbol, platform')
        .eq('is_active', true)
        .limit(100);

      if (error) {
        console.error('Error fetching active tokens:', error);
        return;
      }

      if (!activeTokens || activeTokens.length === 0) {
        return;
      }

      // Add tokens to batch processor
      this.batchProcessor.add(activeTokens);
      
    } catch (error) {
      console.error('Error in poll cycle:', error);
    }
  }

  private async processBatch(batch: TokenBatch[]): Promise<RugCheckData[]> {
    console.log(`Processing batch of ${batch.length} tokens`);
    
    const results = await Promise.allSettled(
      batch.map(token => this.fetchRugCheckData(token))
    );

    const successfulResults: RugCheckData[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
        // Add to pending updates instead of writing immediately
        this.pendingUpdates.set(result.value.tokenMint, result.value);
      } else {
        console.error(`Failed to process ${batch[index].mint}:`, result.reason);
      }
    });

    return successfulResults;
  }

  private async fetchRugCheckData(token: TokenBatch): Promise<RugCheckData> {
    const { mint, symbol, platform } = token;

    // Validate mint address
    try {
      new PublicKey(mint);
    } catch {
      throw new Error(`Invalid mint address: ${mint}`);
    }

    // First get token metadata to get creator address
    const tokenMetadata = await this.getTokenMetadata(mint);
    
    // Fetch all other data in parallel
    const [
      holderCount,
      creatorBalancePercent,
      lpLocked,
      bundlerCount,
      launchTime,
      devActivity,
      honeypotStatus,
      liquidityData
    ] = await Promise.all([
      this.rateLimitedGetTokenAccounts(mint),
      this.rateLimitedGetCreatorBalance(mint),
      this.getLPLockedPercent(mint),
      this.rateLimitedGetBundlerCount(mint),
      this.getTokenLaunchTime(mint),
      this.rateLimitedGetDevActivity(mint, tokenMetadata.creator),
      this.rateLimitedCheckHoneypot(mint),
      this.getLiquidityMetrics(mint)
    ]);

    // Calculate risk score
    const riskScore = this.calculateRiskScore({
      holderCount,
      creatorBalancePercent,
      lpLocked,
      mintAuthority: tokenMetadata.mintAuthority,
      freezeAuthority: tokenMetadata.freezeAuthority,
      topHolders: tokenMetadata.topHolders,
      devActivityPct: devActivity.pct,
      honeypotStatus
    });

    // Generate warnings
    const warnings = this.generateWarnings({
      holderCount,
      creatorBalancePercent,
      lpLocked,
      mintAuthority: tokenMetadata.mintAuthority,
      freezeAuthority: tokenMetadata.freezeAuthority,
      bundlerCount,
      devActivityPct: devActivity.pct,
      honeypotStatus
    });

    return {
      tokenMint: mint,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      holderCount,
      creatorBalance: tokenMetadata.creatorBalance,
      creatorBalancePercent,
      lpLocked,
      mintAuthority: !isAuthorityBurned(tokenMetadata.mintAuthority),
      freezeAuthority: !isAuthorityBurned(tokenMetadata.freezeAuthority),
      bundlerCount,
      topHolders: tokenMetadata.topHolders,
      warnings,
      lastChecked: Date.now(),
      launchTime,
      devActivityPct: devActivity.pct,
      devActivityTime: devActivity.time,
      honeypotStatus,
      liquidityCurrent: liquidityData.current,
      liquidityChange1h: liquidityData.change1h,
      liquidityChange24h: liquidityData.change24h
    };
  }

  private async getRealHolderCount(mint: string): Promise<number> {
    // Check cache first
    const cached = this.holderCountCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      const url = rugcheckConfig.endpoints.heliusRpc;
      
      // Use getTokenAccountsByMint for better performance
      const response = await axios.post(url, {
        jsonrpc: "2.0",
        id: "helius-rugcheck",
        method: "getTokenAccountsByMint",
        params: [mint]
      });

      if (response.data?.result) {
        const accounts = response.data.result;
        const uniqueHolders = new Set(
          accounts
            .filter((acc: any) => acc.amount > 0)
            .map((acc: any) => acc.owner)
        );
        
        const holderCount = uniqueHolders.size;
        
        // Cache the result
        this.holderCountCache.set(mint, holderCount);
        
        return holderCount;
      }

      return 0;
    } catch (error: any) {
      console.error(`Error fetching holder count for ${mint}:`, error.message);

      // --- Pump.fun fallback (tokens whose mint ends with 'pump') ---
      try {
        if (mint.endsWith('pump')) {
          const pumpResponse = await axios.get(`https://frontend-api.pump.fun/coins/${mint}`, {
            timeout: 5000
          });

          if (pumpResponse.data && pumpResponse.data.holder_count !== undefined) {
            console.log(`Got holder count from pump.fun API: ${pumpResponse.data.holder_count}`);
            // Cache the result to avoid repeated pump.fun calls
            this.holderCountCache.set(mint, pumpResponse.data.holder_count);
            return pumpResponse.data.holder_count;
          }
        }
      } catch (pumpError: any) {
        // swallow – fallback failed, will return 0 below
      }

      return 0;
    }
  }

  private async getCreatorBalancePercent(mint: string): Promise<number> {
    // Check cache first
    const cached = this.creatorBalanceCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      // Get token metadata first
      const asset = await helius.rpc.getAsset({ id: mint });
      if (!asset?.creators?.[0]) {
        return 0;
      }

      const creator = asset.creators[0].address;
      const url = rugcheckConfig.endpoints.heliusRpc;

      // Get creator's token accounts
      const accountsResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-creator-accounts",
        method: "getTokenAccountsByOwner",
        params: [
          creator,
          { mint: mint },
          { encoding: "jsonParsed" }
        ]
      });

      if (!accountsResponse.data?.result?.value || accountsResponse.data.result.value.length === 0) {
        this.creatorBalanceCache.set(mint, 0);
        return 0;
      }

      // Get token supply
      const supplyResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-supply",
        method: "getTokenSupply",
        params: [mint]
      });

      const supply = supplyResponse.data?.result?.value?.amount || 0;
      if (supply === 0) {
        this.creatorBalanceCache.set(mint, 0);
        return 0;
      }

      // Calculate creator balance
      let creatorBalance = 0;
      for (const account of accountsResponse.data.result.value) {
        const amount = account.account?.data?.parsed?.info?.tokenAmount?.amount || 0;
        creatorBalance += parseInt(amount);
      }

      const percentage = (creatorBalance / parseInt(supply)) * 100;
      
      // Cache the result
      this.creatorBalanceCache.set(mint, percentage);
      
      return percentage;
    } catch (error) {
      console.error('Error getting creator balance:', error);
      return 0;
    }
  }

  private async getLPLockedPercent(mint: string): Promise<number> {
    // Check cache first
    const cached = this.lpLockedCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      // This would need to check various DEX LP tokens
      // For now, return a simplified version
      const lpLocked = 0; // TODO: Implement actual LP checking
      
      // Cache the result
      this.lpLockedCache.set(mint, lpLocked);
      
      return lpLocked;
    } catch (error) {
      console.error('Error getting LP locked:', error);
      return 0;
    }
  }

  private async getBundlerCount(mint: string): Promise<number> {
    // Check cache first
    const cached = this.bundlerCountCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      const url = rugcheckConfig.endpoints.heliusRpc;
      
      // Get recent signatures
      const signaturesResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-signatures",
        method: "getSignaturesForAddress",
        params: [mint, { limit: 50 }]
      });
      
      if (!signaturesResponse.data?.result || signaturesResponse.data.result.length === 0) {
        this.bundlerCountCache.set(mint, 0);
        return 0;
      }
      
      const signatures = signaturesResponse.data.result.map((sig: any) => sig.signature);
      const bundlerAddresses = new Set<string>();
      
      // Check a sample of transactions
      const samplesToCheck = Math.min(10, signatures.length);
      for (let i = 0; i < samplesToCheck; i++) {
        try {
          const txResponse = await axios.post(url, {
            jsonrpc: "2.0",
            id: "get-transaction",
            method: "getTransaction",
            params: [
              signatures[i],
              { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
            ]
          });
          
          if (txResponse.data?.result?.transaction) {
            const tx = txResponse.data.result.transaction;
            
            // Check for bundler programs
            tx.message?.instructions?.forEach((inst: any) => {
              const programId = inst.programId || inst.program;
              if (rugcheckConfig.bundlers.programIds.includes(programId)) {
                const signer = tx.message?.accountKeys?.[0]?.pubkey;
                if (signer) bundlerAddresses.add(signer);
              }
            });
            
            // Check for bundler patterns
            const txString = JSON.stringify(tx).toLowerCase();
            if (rugcheckConfig.bundlers.patterns.some(pattern => 
              txString.includes(pattern.toLowerCase())
            )) {
              const signer = tx.message?.accountKeys?.[0]?.pubkey;
              if (signer) bundlerAddresses.add(signer);
            }
          }
        } catch (error) {
          // Continue checking other transactions
        }
      }
      
      const bundlerCount = bundlerAddresses.size;
      
      // Cache the result
      this.bundlerCountCache.set(mint, bundlerCount);
      
      return bundlerCount;
    } catch (error) {
      console.error('Error checking for bundlers:', error);
      return 0;
    }
  }

  private async getTokenMetadata(mint: string): Promise<any> {
    try {
      const asset = await helius.rpc.getAsset({ id: mint });
      
      // Get creator address
      const creator = asset?.creators?.[0]?.address || null;
      
      // Get top holders
      const url = rugcheckConfig.endpoints.heliusRpc;
      const largestAccountsResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-largest-accounts",
        method: "getTokenLargestAccounts",
        params: [mint]
      });

      const topHolders = largestAccountsResponse.data?.result?.value || [];
      const totalSupply = topHolders.reduce((sum: number, holder: any) => 
        sum + parseInt(holder.amount), 0
      );

      return {
        creator,
        mintAuthority: asset?.authorities?.find((a: any) => a.type === 'mint')?.address || null,
        freezeAuthority: asset?.authorities?.find((a: any) => a.type === 'freeze')?.address || null,
        creatorBalance: 0, // Will be set by getCreatorBalancePercent
        topHolders: topHolders.slice(0, 10).map((holder: any) => ({
          address: holder.address,
          amount: holder.amount,
          percentage: totalSupply > 0 ? (parseInt(holder.amount) / totalSupply) * 100 : 0
        }))
      };
    } catch (error) {
      console.error('Error getting token metadata:', error);
      return {
        creator: null,
        mintAuthority: null,
        freezeAuthority: null,
        creatorBalance: 0,
        topHolders: []
      };
    }
  }

  private async getTokenLaunchTime(mint: string): Promise<string | null> {
    try {
      // First check if we already have launch_time in the database
      const { data: existingData, error } = await supabase
        .from('rugcheck_reports')
        .select('launch_time')
        .eq('token_mint', mint)
        .single();

      // If we already have a launch_time, return it (never overwrite)
      if (!error && existingData?.launch_time) {
        return existingData.launch_time;
      }

      // Try to get launch time from Helius asset data
      try {
        const asset = await helius.rpc.getAsset({ id: mint });
        
        // Check if the asset has a creation timestamp in metadata
        if (asset && 'mint' in asset) {
          const mintData = (asset as any).mint;
          if (mintData?.extensions?.metadata?.createdAt) {
            return new Date(mintData.extensions.metadata.createdAt).toISOString();
          }
        }
      } catch (assetError) {
        console.log(`Could not get asset data for ${mint}, trying transaction history`);
      }

      // If not available from asset, get the oldest transaction
      const url = rugcheckConfig.endpoints.heliusRpc;
      let oldestSignature = null;
      let oldestBlockTime = null;
      let before = null;
      
      // Keep fetching until we find the oldest transaction
      while (true) {
        const signaturesResponse: any = await axios.post(url, {
          jsonrpc: "2.0",
          id: "get-signatures",
          method: "getSignaturesForAddress",
          params: before ? [
            mint,
            {
              limit: 1000,
              before: before
            }
          ] : [
            mint,
            {
              limit: 1000
            }
          ]
        });

        const signatures: any[] = signaturesResponse.data?.result || [];
        
        if (signatures.length === 0) {
          break;
        }

        // The last signature in the array should be the oldest in this batch
        const lastSig: any = signatures[signatures.length - 1];
        if (lastSig.blockTime) {
          oldestSignature = lastSig.signature;
          oldestBlockTime = lastSig.blockTime;
          before = lastSig.signature;
        }

        // If we got less than 1000 results, we've reached the end
        if (signatures.length < 1000) {
          break;
        }
      }

      if (oldestBlockTime) {
        return new Date(oldestBlockTime * 1000).toISOString();
      }

      return null;
    } catch (error) {
      console.error('Error getting token launch time:', error);
      return null;
    }
  }

  private async getDevWalletActivity(mint: string, creator: string | null): Promise<{ pct: number; time: string | null }> {
    // Check cache first
    const cached = this.devActivityCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      if (!creator) {
        const result = { pct: 0, time: null };
        this.devActivityCache.set(mint, result);
        return result;
      }

      const url = rugcheckConfig.endpoints.heliusRpc;
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      // Get recent signatures for the creator wallet
      const signaturesResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-dev-signatures",
        method: "getSignaturesForAddress",
        params: [creator, { limit: 100 }]
      });

      if (!signaturesResponse.data?.result || signaturesResponse.data.result.length === 0) {
        const result = { pct: 0, time: null };
        this.devActivityCache.set(mint, result);
        return result;
      }

      const signatures = signaturesResponse.data.result;
      let tokenMovements = 0;
      let lastActivityTime: string | null = null;

      // Check transactions for token movements
      for (const sig of signatures) {
        // Skip if older than 24 hours
        if (sig.blockTime && sig.blockTime * 1000 < oneDayAgo) {
          break;
        }

        try {
          const txResponse = await axios.post(url, {
            jsonrpc: "2.0",
            id: "get-dev-tx",
            method: "getTransaction",
            params: [
              sig.signature,
              { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
            ]
          });

          if (txResponse.data?.result?.transaction) {
            const tx = txResponse.data.result.transaction;
            const instructions = tx.message?.instructions || [];

            // Check for token transfers involving the mint
            for (const inst of instructions) {
              if (inst.program === 'spl-token' && 
                  (inst.parsed?.type === 'transfer' || inst.parsed?.type === 'transferChecked')) {
                const info = inst.parsed?.info;
                if (info && (info.mint === mint || info.tokenAccount?.includes(mint))) {
                  tokenMovements++;
                  if (!lastActivityTime && sig.blockTime) {
                    lastActivityTime = new Date(sig.blockTime * 1000).toISOString();
                  }
                }
              }
            }
          }
        } catch (error) {
          // Continue checking other transactions
        }
      }

      // Calculate percentage of recent transactions that moved tokens
      const totalRecentTxs = signatures.filter((sig: any) => 
        sig.blockTime && sig.blockTime * 1000 >= oneDayAgo
      ).length;
      
      const activityPct = totalRecentTxs > 0 ? (tokenMovements / totalRecentTxs) * 100 : 0;

      const result = { pct: activityPct, time: lastActivityTime };
      this.devActivityCache.set(mint, result);
      return result;

    } catch (error) {
      console.error('Error checking dev wallet activity:', error);
      const result = { pct: 0, time: null };
      this.devActivityCache.set(mint, result);
      return result;
    }
  }

  private async checkHoneypotStatus(mint: string): Promise<'unknown' | 'safe' | 'warning'> {
    // Check cache first
    const cached = this.honeypotCache.get(mint);
    if (cached !== null) {
      return cached;
    }

    try {
      const url = rugcheckConfig.endpoints.heliusRpc;
      
      // Get recent signatures
      const signaturesResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "check-honeypot",
        method: "getSignaturesForAddress",
        params: [mint, { limit: 100 }]
      });

      if (!signaturesResponse.data?.result || signaturesResponse.data.result.length === 0) {
        this.honeypotCache.set(mint, 'unknown');
        return 'unknown';
      }

      const signatures = signaturesResponse.data.result;
      let sellCount = 0;
      let buyCount = 0;
      let hasHighFees = false;

      // Sample transactions to check for sells
      const samplesToCheck = Math.min(20, signatures.length);
      
      for (let i = 0; i < samplesToCheck; i++) {
        try {
          const txResponse = await axios.post(url, {
            jsonrpc: "2.0",
            id: "get-honeypot-tx",
            method: "getTransaction",
            params: [
              signatures[i].signature,
              { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
            ]
          });

          if (txResponse.data?.result?.transaction) {
            const tx = txResponse.data.result.transaction;
            const instructions = tx.message?.instructions || [];
            
            // Look for swap instructions
            for (const inst of instructions) {
              const programId = inst.programId || inst.program;
              
              // Check if it's a DEX swap
              if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' || // Jupiter
                  programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' || // Raydium AMM
                  programId === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') { // Pump.fun
                
                // Try to determine if it's a buy or sell
                // This is simplified - in reality you'd need to parse the instruction data
                const logs = txResponse.data.result.meta?.logMessages || [];
                const hasTokenTransferOut = logs.some((log: any) => 
                  log.includes('Transfer') && log.includes(mint)
                );
                
                if (hasTokenTransferOut) {
                  sellCount++;
                } else {
                  buyCount++;
                }
              }

              // Check for unusually high fees
              if (inst.parsed?.type === 'transfer' && inst.parsed?.info?.fee) {
                const fee = parseInt(inst.parsed.info.fee);
                if (fee > 1000000) { // More than 1% fee
                  hasHighFees = true;
                }
              }
            }
          }
        } catch (error) {
          // Continue checking other transactions
        }
      }

      // Determine honeypot status
      let status: 'unknown' | 'safe' | 'warning' = 'unknown';
      
      if (sellCount > 0) {
        status = 'safe';
      } else if (buyCount > 5 && sellCount === 0) {
        status = 'warning';
      } else if (hasHighFees) {
        status = 'warning';
      }

      this.honeypotCache.set(mint, status);
      return status;

    } catch (error) {
      console.error('Error checking honeypot status:', error);
      this.honeypotCache.set(mint, 'unknown');
      return 'unknown';
    }
  }

  private async getLiquidityMetrics(mint: string): Promise<{ current: number; change1h: number; change24h: number }> {
    try {
      // Get or initialize liquidity history
      let history = this.liquidityHistoryCache.get(mint) || [];
      const now = Date.now();
      
      // Get current liquidity from various sources
      const currentLiquidity = await this.getCurrentLiquidity(mint);
      
      // Add new snapshot
      history.push({ timestamp: now, liquidity: currentLiquidity });
      
      // Keep only last 24 hours of data
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      history = history.filter(snap => snap.timestamp > oneDayAgo);
      
      // Sort by timestamp
      history.sort((a, b) => a.timestamp - b.timestamp);
      
      // Calculate changes
      let change1h = 0;
      let change24h = 0;
      
      if (history.length > 1) {
        // Find snapshot from 1 hour ago
        const oneHourAgo = now - (60 * 60 * 1000);
        const snapshot1h = history.find(snap => snap.timestamp >= oneHourAgo);
        if (snapshot1h && snapshot1h.liquidity > 0) {
          change1h = ((currentLiquidity - snapshot1h.liquidity) / snapshot1h.liquidity) * 100;
        }
        
        // Use oldest snapshot for 24h change
        const oldest = history[0];
        if (oldest.liquidity > 0) {
          change24h = ((currentLiquidity - oldest.liquidity) / oldest.liquidity) * 100;
        }
      }
      
      // Update cache
      this.liquidityHistoryCache.set(mint, history);
      
      return {
        current: currentLiquidity,
        change1h: Math.round(change1h * 100) / 100,
        change24h: Math.round(change24h * 100) / 100
      };
      
    } catch (error) {
      console.error('Error getting liquidity metrics:', error);
      return { current: 0, change1h: 0, change24h: 0 };
    }
  }

  private async getCurrentLiquidity(mint: string): Promise<number> {
    try {
      // This is a simplified version - in production you'd check multiple DEXes
      // For now, we'll get it from the database if available
      const { data } = await supabase
        .from('token_prices')
        .select('liquidity_usd')
        .eq('token_mint', mint)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      return data?.liquidity_usd || 0;
    } catch (error) {
      return 0;
    }
  }

  private calculateRiskScore(data: any): number {
    const { weights, minimumScores } = rugcheckConfig.riskScoring;
    let score = 0;

    // Holder count risk (inverse - fewer holders = higher risk)
    const holderRisk = data.holderCount > 0 ? 
      Math.max(0, 100 - Math.min(100, data.holderCount)) : 100;
    score += (holderRisk * weights.holderCount) / 100;

    // Creator balance risk
    const creatorRisk = Math.min(100, data.creatorBalancePercent * 2);
    score += (creatorRisk * weights.creatorBalance) / 100;

    // LP locked risk (inverse - more locked = lower risk)
    const lpRisk = 100 - data.lpLocked;
    score += (lpRisk * weights.lpLocked) / 100;

    // Top holder concentration
    const topHolderRisk = data.topHolders.length > 0 ?
      Math.min(100, data.topHolders[0]?.percentage || 0) : 0;
    score += (topHolderRisk * weights.topHolders) / 100;

    // Authority risks
    if (!isAuthorityBurned(data.mintAuthority)) {
      score += weights.mintAuthority;
      score = Math.max(score, minimumScores.activeMintAuthority);
    }

    if (!isAuthorityBurned(data.freezeAuthority)) {
      score += weights.freezeAuthority;
      score = Math.max(score, minimumScores.activeFreezeAuthority);
    }

    // Dev activity risk (high activity = higher risk)
    if (data.devActivityPct > 50) {
      score += 10; // Add 10 points for high dev activity
    }

    // Honeypot risk
    if (data.honeypotStatus === 'warning') {
      score += 15; // Add 15 points for honeypot warning
      score = Math.max(score, 70); // Minimum 70 score for honeypot warning
    }

    // Apply minimum scores for known exploits
    if (data.creatorBalancePercent > 50) {
      score = Math.max(score, minimumScores.creatorMajority);
    }

    if (data.lpLocked === 0) {
      score = Math.max(score, minimumScores.noLiquidity);
    }

    return Math.min(100, Math.round(score));
  }

  private generateWarnings(data: any): string[] {
    const warnings: string[] = [];

    if (data.holderCount < 10) {
      warnings.push(`Only ${data.holderCount} holders detected`);
    }

    if (data.creatorBalancePercent > 20) {
      warnings.push(`Creator holds ${data.creatorBalancePercent.toFixed(1)}% of supply`);
    }

    if (data.lpLocked < 50) {
      warnings.push(`Only ${data.lpLocked}% of LP is locked`);
    }

    if (!isAuthorityBurned(data.mintAuthority)) {
      warnings.push('Mint authority is active');
    }

    if (!isAuthorityBurned(data.freezeAuthority)) {
      warnings.push('Freeze authority is active');
    }

    if (data.bundlerCount >= 5) {
      warnings.push(`High bundler activity detected (${data.bundlerCount} bundlers)`);
    }

    // New warnings for additional data points
    if (data.devActivityPct > 30) {
      warnings.push(`Developer wallet shows ${data.devActivityPct.toFixed(1)}% token movement activity`);
    }

    if (data.honeypotStatus === 'warning') {
      warnings.push('Potential honeypot detected - no successful sells found');
    }

    return warnings;
  }

  private async flushPendingUpdates() {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    const updates = Array.from(this.pendingUpdates.values());
    this.pendingUpdates.clear();

    console.log(`Flushing ${updates.length} rugcheck updates to database`);

    try {
      // Prepare batch update data
      const batchData = updates.map(update => {
        const data: any = {
          token_mint: update.tokenMint,
          risk_score: update.riskScore,
          risk_level: update.riskLevel,
          holders: update.holderCount, // Database uses 'holders' not 'holder_count'
          creator_balance: update.creatorBalance,
          creator_balance_percent: update.creatorBalancePercent,
          lp_locked: update.lpLocked,
          mint_authority: update.mintAuthority,
          freeze_authority: update.freezeAuthority,
          bundler_count: update.bundlerCount,
          top_holders: update.topHolders,
          warnings: update.warnings,
          last_checked: new Date(update.lastChecked).toISOString(),
          updated_at: new Date().toISOString(),
          // New fields
          dev_activity_pct: update.devActivityPct,
          dev_activity_time: update.devActivityTime ? new Date(update.devActivityTime).toISOString() : null,
          honeypot_status: update.honeypotStatus,
          liquidity_current: update.liquidityCurrent,
          liquidity_change_1h_pct: update.liquidityChange1h, // Database uses _pct suffix
          liquidity_change_24h_pct: update.liquidityChange24h // Database uses _pct suffix
        };

        // Only include launch_time if it's provided and we want to set it
        if (update.launchTime) {
          data.launch_time = update.launchTime;
        }

        return data;
      });

      // Bulk upsert
      const { error } = await supabase
        .from('rugcheck_reports')
        .upsert(batchData, { 
          onConflict: 'token_mint',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error bulk updating rugcheck data:', error);
        // Re-add failed updates to pending
        updates.forEach(update => {
          this.pendingUpdates.set(update.tokenMint, update);
        });
      } else {
        console.log(`Successfully updated ${updates.length} rugcheck reports`);
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      // Re-add failed updates to pending
      updates.forEach(update => {
        this.pendingUpdates.set(update.tokenMint, update);
      });
    }
  }
}

// Export singleton instance
export const rugCheckPollingServiceV2 = new RugCheckPollingServiceV2();