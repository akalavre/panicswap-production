import { helius } from '../utils/heliusClient';
import supabase from '../utils/supabaseClient';
import config from '../config';
import { heliusTokenHolderService } from './HeliusTokenHolderService';
import { Connection, PublicKey } from '@solana/web3.js';
import { SimpleCache } from '../utils/rateLimitWrapper';

interface TokenMintWebhookData {
  accountData: Array<{
    account: string;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        decimals: number;
        tokenAmount: string;
      };
      userAccount: string;
    }>;
  }>;
  events?: {
    nft?: {
      metadata?: {
        name?: string;
        symbol?: string;
        uri?: string;
      };
    };
  };
  instructions: Array<{
    programId: string;
    data?: string;
  }>;
}

export interface WalletCluster {
  mainWallet: string;
  relatedWallets: string[];
  clusterSize: number;
  commonFundingSource?: string;
  rugHistory: number;
  lastActivity: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class HeliusTokenDiscoveryService {
  private static instance: HeliusTokenDiscoveryService;
  private webhookId: string | null = null;
  private connection: Connection;
  private walletClusterCache: SimpleCache<WalletCluster>;
  
  // Known exchange wallets
  private readonly EXCHANGE_WALLETS = new Set([
    '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Coinbase
    'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', // OKX
    'AobVSwdW9BbpMdJvTqeCN8hCgKEDEWKmqGkpJReAcKaU', // Bybit
    '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', // Gate.io
    'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE', // KuCoin
    // Add more exchange addresses as needed
  ]);

  private constructor() {
    console.log('HeliusTokenDiscoveryService initialized');
    this.connection = new Connection(config.heliusRpcUrl);
    this.walletClusterCache = new SimpleCache(3600000); // 1 hour cache
  }

  static getInstance(): HeliusTokenDiscoveryService {
    if (!HeliusTokenDiscoveryService.instance) {
      HeliusTokenDiscoveryService.instance = new HeliusTokenDiscoveryService();
    }
    return HeliusTokenDiscoveryService.instance;
  }

  /**
   * Register webhooks for token discovery
   */
  async registerWebhooks(webhookUrl: string): Promise<void> {
    try {
      console.log('Registering Helius webhooks for token discovery...');
      
      // Create webhook for token mints
      // TODO: Fix webhook registration - webhooks property doesn't exist on Helius SDK
      const webhook = await (helius as any).webhooks?.create({
        webhookUrl: `${webhookUrl}/api/webhook/token-mint`,
        transactionTypes: ['TOKEN_MINT'],
        accountAddresses: [
          '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // pump.fun program
          '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM V4
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
        ],
        webhookType: 'enhanced',
        encoding: 'jsonParsed'
      });
      
      this.webhookId = webhook.webhookID;
      console.log('Token discovery webhook created:', webhook.webhookID);
      
      // Also create a webhook for new pump.fun tokens specifically
      const pumpWebhook = await (helius as any).webhooks?.create({
        webhookUrl: `${webhookUrl}/api/webhook/pump-token`,
        transactionTypes: ['ANY'], // pump.fun uses custom instructions
        accountAddresses: ['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwzK1P'], // pump.fun program
        webhookType: 'enhanced',
        encoding: 'jsonParsed'
      });
      
      console.log('Pump.fun webhook created:', pumpWebhook.webhookID);
      
    } catch (error) {
      console.error('Error registering webhooks:', error);
      throw error;
    }
  }

  /**
   * Process token mint webhook - single step discovery + enrichment!
   */
  async processTokenMintWebhook(data: TokenMintWebhookData): Promise<void> {
    try {
      // Extract token mint from the transaction
      const tokenMint = this.extractTokenMint(data);
      if (!tokenMint) {
        console.log('No token mint found in webhook data');
        return;
      }

      // Determine platform based on program ID
      const platform = this.determinePlatform(data.instructions);
      
      // Extract metadata from webhook data - no additional API call needed!
      const metadata = data.events?.nft?.metadata || {};
      const decimals = data.accountData[0]?.tokenBalanceChanges?.[0]?.rawTokenAmount?.decimals || 6;
      const creator = data.accountData[0]?.tokenBalanceChanges?.[0]?.userAccount;
      
      console.log(`New ${platform} token discovered via Helius webhook: ${tokenMint}`);
      console.log(`Metadata already available: ${metadata.name} (${metadata.symbol})`);

      // Single database write with all the data
      await this.saveTokenData({
        mint: tokenMint,
        name: metadata.name || `New ${platform} Token`,
        symbol: metadata.symbol || 'UNKNOWN',
        decimals,
        platform,
        creator,
        uri: metadata.uri,
        discoveredAt: new Date()
      });

      // If it's a pump.fun token, derive the bonding curve
      if (platform === 'pump.fun') {
        await this.savePumpFunPoolData(tokenMint);
      }

      // Fetch holder count asynchronously (don't block the webhook response)
      this.fetchAndUpdateHolderCount(tokenMint).catch(error => {
        console.error(`Error fetching holder count for ${tokenMint}:`, error);
      });

    } catch (error) {
      console.error('Error processing token mint webhook:', error);
    }
  }

  /**
   * Extract token mint address from webhook data
   */
  private extractTokenMint(data: TokenMintWebhookData): string | null {
    // Check token balance changes first
    const tokenChange = data.accountData[0]?.tokenBalanceChanges?.[0];
    if (tokenChange?.mint) {
      return tokenChange.mint;
    }

    // Fallback: check account data
    const account = data.accountData.find(a => 
      a.account && a.account.length === 44 // Likely a mint address
    );
    
    return account?.account || null;
  }

  /**
   * Determine platform from program IDs in instructions
   */
  private determinePlatform(instructions: Array<{ programId: string }>): string {
    const programIds = instructions.map(i => i.programId);
    
    if (programIds.includes('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')) {
      return 'pump.fun';
    }
    if (programIds.includes('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')) {
      return 'raydium';
    }
    
    return 'unknown';
  }

  /**
   * Save token data to database - single write with all data!
   */
  private async saveTokenData(tokenData: {
    mint: string;
    name: string;
    symbol: string;
    decimals: number;
    platform: string;
    creator?: string;
    uri?: string;
    discoveredAt: Date;
  }): Promise<void> {
    try {
      // Upsert to token_metadata
      const { error: metadataError } = await supabase
        .from('token_metadata')
        .upsert({
          mint: tokenData.mint,
          symbol: tokenData.symbol,
          name: tokenData.name,
          decimals: tokenData.decimals,
          platform: tokenData.platform,
          logo_uri: tokenData.uri,
          is_active: false, // Will be activated when found in wallets
          created_at: tokenData.discoveredAt.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'mint' });

      if (metadataError) {
        console.error('Error saving token metadata:', metadataError);
        return;
      }

      // If it's a potential memecoin, add to memecoin_details
      if (tokenData.platform === 'pump.fun') {
        await supabase
          .from('memecoin_details')
          .upsert({
            token_mint: tokenData.mint,
            creator_address: tokenData.creator,
            launch_timestamp: tokenData.discoveredAt.toISOString(),
            platform: tokenData.platform,
            metadata_uri: tokenData.uri
          }, { onConflict: 'token_mint' });
      }

      console.log(`✅ Token ${tokenData.symbol} saved to database with full metadata`);
      
    } catch (error) {
      console.error('Error saving token data:', error);
    }
  }

  /**
   * Save pump.fun bonding curve data
   */
  private async savePumpFunPoolData(tokenMint: string): Promise<void> {
    try {
      const { PublicKey } = await import('@solana/web3.js');
      const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwzK1P');
      
      // Derive bonding curve PDA
      const [bondingCurve] = await PublicKey.findProgramAddress(
        [Buffer.from('bonding-curve'), new PublicKey(tokenMint).toBuffer()],
        PUMP_FUN_PROGRAM
      );
      
      const poolAddress = bondingCurve.toString();
      
      // Update token_metadata with pool address
      await supabase
        .from('token_metadata')
        .update({ pool_address: poolAddress })
        .eq('mint', tokenMint);
        
      console.log(`✅ Pump.fun bonding curve saved: ${poolAddress}`);
      
    } catch (error) {
      console.error('Error saving pump.fun pool data:', error);
    }
  }

  /**
   * Fetch and update holder count for a token
   */
  private async fetchAndUpdateHolderCount(tokenMint: string): Promise<void> {
    try {
      console.log(`Fetching holder count for token ${tokenMint}...`);
      const holderCount = await heliusTokenHolderService.getTokenHolderCount(tokenMint);
      
      if (holderCount > 0) {
        // Update token metadata with holder count
        const { error } = await supabase
          .from('token_metadata')
          .update({ 
            holder_count: holderCount,
            updated_at: new Date().toISOString()
          })
          .eq('mint', tokenMint);

        if (error) {
          console.error(`Error updating holder count for ${tokenMint}:`, error);
        } else {
          console.log(`✅ Updated holder count for ${tokenMint}: ${holderCount} holders`);
        }
      }
    } catch (error) {
      console.error(`Error fetching holder count for ${tokenMint}:`, error);
    }
  }

  /**
   * Update holder counts for existing tokens
   */
  async updateAllHolderCounts(limit: number = 50): Promise<void> {
    try {
      console.log(`Updating holder counts for up to ${limit} tokens...`);
      
      // Get tokens that need holder count updates (no holder_count or old data)
      const { data: tokens, error } = await supabase
        .from('token_metadata')
        .select('mint, symbol')
        .or('holder_count.is.null,updated_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(limit);

      if (error) {
        console.error('Error fetching tokens for holder count update:', error);
        return;
      }

      if (!tokens || tokens.length === 0) {
        console.log('No tokens need holder count updates');
        return;
      }

      console.log(`Found ${tokens.length} tokens to update holder counts for`);

      // Process tokens in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(token => this.fetchAndUpdateHolderCount(token.mint))
        );

        // Small delay between batches to respect API limits
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Finished updating holder counts for ${tokens.length} tokens`);
    } catch (error) {
      console.error('Error updating all holder counts:', error);
    }
  }

  /**
   * Analyze wallet cluster for a given address
   */
  async analyzeWalletCluster(walletAddress: string): Promise<WalletCluster> {
    // Check cache first
    const cached = this.walletClusterCache.get(walletAddress);
    if (cached) return cached;
    
    console.log(`[WalletClustering] Analyzing cluster for ${walletAddress}`);
    
    try {
      // Get transaction history
      const transactions = await this.getWalletTransactions(walletAddress);
      
      // Find related wallets
      const relatedWallets = await this.findRelatedWallets(walletAddress, transactions);
      
      // Find common funding source
      const fundingSource = await this.findCommonFundingSource(walletAddress, relatedWallets);
      
      // Check rug history
      const rugHistory = await this.checkRugHistory([walletAddress, ...relatedWallets]);
      
      // Determine risk level
      const riskLevel = this.calculateClusterRisk(relatedWallets.length, rugHistory, fundingSource);
      
      const cluster: WalletCluster = {
        mainWallet: walletAddress,
        relatedWallets,
        clusterSize: relatedWallets.length + 1,
        commonFundingSource: fundingSource,
        rugHistory,
        lastActivity: new Date(),
        riskLevel
      };
      
      // Cache result
      this.walletClusterCache.set(walletAddress, cluster);
      
      // Store in database
      await this.storeWalletCluster(cluster);
      
      return cluster;
      
    } catch (error) {
      console.error(`[WalletClustering] Error analyzing ${walletAddress}:`, error);
      
      // Return minimal cluster on error
      return {
        mainWallet: walletAddress,
        relatedWallets: [],
        clusterSize: 1,
        rugHistory: 0,
        lastActivity: new Date(),
        riskLevel: 'medium'
      };
    }
  }
  
  /**
   * Get wallet transaction history
   */
  private async getWalletTransactions(walletAddress: string): Promise<any[]> {
    try {
      // Use Helius enhanced transactions API
      const transactions = await (helius as any).getEnhancedTransactions({
        address: walletAddress,
        limit: 100,
        type: ['TRANSFER', 'SWAP', 'TOKEN_MINT']
      });
      
      return transactions || [];
    } catch (error) {
      console.error(`[WalletClustering] Error fetching transactions:`, error);
      return [];
    }
  }
  
  /**
   * Find wallets related to the main wallet
   */
  private async findRelatedWallets(mainWallet: string, transactions: any[]): Promise<string[]> {
    const relatedWallets = new Set<string>();
    const interactionCounts = new Map<string, number>();
    
    for (const tx of transactions) {
      // Look for SOL transfers
      if (tx.type === 'TRANSFER') {
        const counterparty = tx.from === mainWallet ? tx.to : tx.from;
        
        // Skip exchange wallets
        if (this.EXCHANGE_WALLETS.has(counterparty)) continue;
        
        // Count interactions
        const count = interactionCounts.get(counterparty) || 0;
        interactionCounts.set(counterparty, count + 1);
        
        // Consider related if multiple interactions or large transfers
        if (count >= 3 || (tx.amount && tx.amount > 1000000000)) { // > 1 SOL
          relatedWallets.add(counterparty);
        }
      }
      
      // Look for token transfers with same patterns
      if (tx.tokenTransfers) {
        for (const transfer of tx.tokenTransfers) {
          if (transfer.fromUserAccount === mainWallet || transfer.toUserAccount === mainWallet) {
            const counterparty = transfer.fromUserAccount === mainWallet 
              ? transfer.toUserAccount 
              : transfer.fromUserAccount;
              
            const count = interactionCounts.get(counterparty) || 0;
            interactionCounts.set(counterparty, count + 1);
            
            if (count >= 2) {
              relatedWallets.add(counterparty);
            }
          }
        }
      }
    }
    
    // Also check for wallets created by the same source
    const createdWallets = await this.findWalletsCreatedBySame(mainWallet);
    createdWallets.forEach(w => relatedWallets.add(w));
    
    return Array.from(relatedWallets);
  }
  
  /**
   * Find wallets created by the same source
   */
  private async findWalletsCreatedBySame(wallet: string): Promise<string[]> {
    try {
      // Get wallet creation transaction
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(wallet),
        { limit: 1000 }
      );
      
      if (signatures.length === 0) return [];
      
      // Find the oldest transaction (likely creation)
      const oldestSig = signatures[signatures.length - 1];
      const creationTx = await this.connection.getTransaction(oldestSig.signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!creationTx || !creationTx.transaction.message) return [];
      
      // Get account keys from message
      const accountKeys = creationTx.transaction.message.getAccountKeys();
      if (!accountKeys || accountKeys.staticAccountKeys.length === 0) return [];
      
      // Find the funding source
      const fundingSource = accountKeys.staticAccountKeys[0].toString();
      
      // Query database for other wallets created by same source
      const { data } = await supabase
        .from('wallet_clusters')
        .select('related_wallets')
        .eq('funding_source', fundingSource)
        .limit(10);
        
      if (data && data.length > 0) {
        return data.flatMap(d => d.related_wallets || []);
      }
      
      return [];
    } catch (error) {
      console.error('[WalletClustering] Error finding created wallets:', error);
      return [];
    }
  }
  
  /**
   * Find common funding source
   */
  private async findCommonFundingSource(mainWallet: string, relatedWallets: string[]): Promise<string | undefined> {
    const fundingSources = new Map<string, number>();
    
    // Check funding for main wallet and related wallets
    const walletsToCheck = [mainWallet, ...relatedWallets.slice(0, 5)];
    
    for (const wallet of walletsToCheck) {
      try {
        const signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(wallet),
          { limit: 100 }
        );
        
        // Look for early SOL deposits
        for (const sig of signatures.reverse()) {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.meta && !tx.meta.err) {
            // Find SOL deposits
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            
            for (let i = 0; i < preBalances.length; i++) {
              if (postBalances[i] > preBalances[i] + 5000) { // Significant deposit
                const accountKeys = tx.transaction.message.getAccountKeys();
                if (accountKeys && accountKeys.staticAccountKeys[i]) {
                  const funder = accountKeys.staticAccountKeys[i].toString();
                
                  if (!this.EXCHANGE_WALLETS.has(funder)) {
                    const count = fundingSources.get(funder) || 0;
                    fundingSources.set(funder, count + 1);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Continue with other wallets
      }
    }
    
    // Find most common funding source
    let maxCount = 0;
    let commonSource: string | undefined;
    
    for (const [source, count] of fundingSources) {
      if (count > maxCount && count >= 2) {
        maxCount = count;
        commonSource = source;
      }
    }
    
    return commonSource;
  }
  
  /**
   * Check rug history for wallets
   */
  private async checkRugHistory(wallets: string[]): Promise<number> {
    try {
      const { data, count } = await supabase
        .from('historical_rugs')
        .select('token_mint', { count: 'exact' })
        .in('dev_address', wallets);
        
      return count || 0;
    } catch (error) {
      console.error('[WalletClustering] Error checking rug history:', error);
      return 0;
    }
  }
  
  /**
   * Calculate cluster risk level
   */
  private calculateClusterRisk(
    clusterSize: number, 
    rugHistory: number,
    fundingSource?: string
  ): WalletCluster['riskLevel'] {
    let riskScore = 0;
    
    // Cluster size risk
    if (clusterSize > 10) riskScore += 30;
    else if (clusterSize > 5) riskScore += 20;
    else if (clusterSize > 2) riskScore += 10;
    
    // Rug history risk
    if (rugHistory > 5) riskScore += 50;
    else if (rugHistory > 2) riskScore += 30;
    else if (rugHistory > 0) riskScore += 20;
    
    // Funding source risk
    if (fundingSource) {
      if (this.EXCHANGE_WALLETS.has(fundingSource)) {
        riskScore -= 10; // Lower risk if funded by exchange
      } else {
        riskScore += 10; // Higher risk if funded by unknown source
      }
    }
    
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }
  
  /**
   * Store wallet cluster in database
   */
  private async storeWalletCluster(cluster: WalletCluster): Promise<void> {
    try {
      await supabase
        .from('wallet_clusters')
        .upsert({
          main_wallet: cluster.mainWallet,
          related_wallets: cluster.relatedWallets,
          cluster_size: cluster.clusterSize,
          funding_source: cluster.commonFundingSource,
          rug_history: cluster.rugHistory,
          risk_level: cluster.riskLevel,
          last_activity: cluster.lastActivity,
          updated_at: new Date()
        }, {
          onConflict: 'main_wallet'
        });
        
      // Also update rugcheck reports if this is a dev wallet
      if (cluster.rugHistory > 0 || cluster.riskLevel === 'high' || cluster.riskLevel === 'critical') {
        await supabase
          .from('rugcheck_reports')
          .update({
            dev_wallet_cluster: {
              main_wallet: cluster.mainWallet,
              related_wallets: cluster.relatedWallets,
              cluster_size: cluster.clusterSize
            }
          })
          .eq('creator_address', cluster.mainWallet);
      }
    } catch (error) {
      console.error('[WalletClustering] Error storing cluster:', error);
    }
  }
  
  /**
   * Check if wallet has CEX interaction
   */
  async checkCEXInteraction(walletAddress: string): Promise<boolean> {
    try {
      const transactions = await this.getWalletTransactions(walletAddress);
      
      for (const tx of transactions) {
        // Check for direct transfers to/from exchanges
        if (tx.type === 'TRANSFER') {
          if (this.EXCHANGE_WALLETS.has(tx.to) || this.EXCHANGE_WALLETS.has(tx.from)) {
            return true;
          }
        }
        
        // Check token transfers
        if (tx.tokenTransfers) {
          for (const transfer of tx.tokenTransfers) {
            if (this.EXCHANGE_WALLETS.has(transfer.toUserAccount) || 
                this.EXCHANGE_WALLETS.has(transfer.fromUserAccount)) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('[WalletClustering] Error checking CEX interaction:', error);
      return false;
    }
  }
  
  /**
   * Get cluster for a wallet
   */
  async getWalletCluster(walletAddress: string): Promise<WalletCluster | null> {
    // Check cache
    const cached = this.walletClusterCache.get(walletAddress);
    if (cached) return cached;
    
    // Check database
    const { data } = await supabase
      .from('wallet_clusters')
      .select('*')
      .eq('main_wallet', walletAddress)
      .single();
      
    if (data) {
      const cluster: WalletCluster = {
        mainWallet: data.main_wallet,
        relatedWallets: data.related_wallets || [],
        clusterSize: data.cluster_size,
        commonFundingSource: data.funding_source,
        rugHistory: data.rug_history,
        lastActivity: new Date(data.last_activity),
        riskLevel: data.risk_level
      };
      
      this.walletClusterCache.set(walletAddress, cluster);
      return cluster;
    }
    
    // Analyze if not found
    return await this.analyzeWalletCluster(walletAddress);
  }

  /**
   * Cleanup webhooks
   */
  async cleanup(): Promise<void> {
    if (this.webhookId) {
      try {
        await (helius as any).webhooks?.delete(this.webhookId);
        console.log('Webhook deleted successfully');
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }
  }
}

export const heliusTokenDiscoveryService = HeliusTokenDiscoveryService.getInstance();