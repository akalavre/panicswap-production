import { helius } from '../utils/heliusClient';
import supabase from '../utils/supabaseClient';
import { Connection, PublicKey } from '@solana/web3.js';
import config from '../config';
import axios from 'axios';

interface TokenCreationSignature {
  signature: string;
  timestamp: number;
  tokenMint?: string;
  platform?: string;
}

export class HeliusAutomaticTokenDiscoveryService {
  private static instance: HeliusAutomaticTokenDiscoveryService;
  private connection: Connection;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private lastProcessedSignature: string | null = null;
  private discoveredTokens = new Set<string>();
  private transactionCache = new Map<string, any>();
  private lastApiCall = 0;
  private readonly API_RATE_LIMIT_MS = 100; // 10 requests per second max
  
  // Program IDs to monitor
  private readonly PROGRAMS_TO_MONITOR = {
    'pump.fun': '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    'raydium': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    'token': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  };

  private constructor() {
    if (!config.heliusRpcUrl) {
      throw new Error('Helius RPC URL is required for automatic token discovery');
    }
    this.connection = new Connection(config.heliusRpcUrl);
    console.log('HeliusAutomaticTokenDiscoveryService initialized');
  }

  static getInstance(): HeliusAutomaticTokenDiscoveryService {
    if (!HeliusAutomaticTokenDiscoveryService.instance) {
      HeliusAutomaticTokenDiscoveryService.instance = new HeliusAutomaticTokenDiscoveryService();
    }
    return HeliusAutomaticTokenDiscoveryService.instance;
  }

  /**
   * Start automatic token discovery
   */
  async startDiscovery(intervalMs: number = 10000) { // Poll every 10 seconds by default
    console.log(`Starting automatic token discovery (polling every ${intervalMs}ms)...`);
    
    // Load last processed signature from database
    await this.loadLastProcessedSignature();
    
    // Initial poll
    await this.pollForNewTokens();
    
    // Set up interval
    this.pollingInterval = setInterval(() => {
      if (!this.isPolling) {
        this.pollForNewTokens().catch(error => {
          console.error('Error in token discovery poll:', error);
        });
      }
    }, intervalMs);
  }

  /**
   * Stop automatic discovery
   */
  stopDiscovery() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Automatic token discovery stopped');
    }
  }

  /**
   * Load last processed signature from database
   */
  private async loadLastProcessedSignature() {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'last_processed_token_signature')
        .single();
      
      if (data?.value) {
        this.lastProcessedSignature = data.value;
        console.log(`Resuming from signature: ${this.lastProcessedSignature}`);
      }
    } catch (error) {
      console.log('No previous signature found, starting fresh');
    }
  }

  /**
   * Save last processed signature to database
   */
  private async saveLastProcessedSignature(signature: string) {
    try {
      await supabase
        .from('system_config')
        .upsert({
          key: 'last_processed_token_signature',
          value: signature,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      this.lastProcessedSignature = signature;
    } catch (error) {
      console.error('Error saving last processed signature:', error);
    }
  }

  /**
   * Poll for new tokens using Helius enhanced transactions
   */
  private async pollForNewTokens() {
    if (this.isPolling) {
      console.log('Previous poll still running, skipping...');
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      console.log('Polling for new tokens...');
      
      // Check pump.fun program for new tokens
      const pumpFunTokens = await this.checkProgramForTokens(
        this.PROGRAMS_TO_MONITOR['pump.fun'],
        'pump.fun'
      );
      
      // Check Raydium for new pools/tokens
      const raydiumTokens = await this.checkProgramForTokens(
        this.PROGRAMS_TO_MONITOR['raydium'],
        'raydium'
      );
      
      const totalFound = pumpFunTokens + raydiumTokens;
      const pollTime = Date.now() - startTime;
      
      if (totalFound > 0) {
        console.log(`✅ Found ${totalFound} new tokens in ${pollTime}ms`);
      } else {
        console.log(`No new tokens found (${pollTime}ms)`);
      }
      
    } catch (error) {
      console.error('Error polling for tokens:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Check a specific program for new token creations
   */
  private async checkProgramForTokens(programId: string, platform: string): Promise<number> {
    try {
      // Get recent transactions for the program
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(programId),
        {
          limit: 20, // Reduced to avoid rate limits
          until: this.lastProcessedSignature || undefined
        }
      );

      if (signatures.length === 0) {
        return 0;
      }

      console.log(`Found ${signatures.length} recent ${platform} transactions`);
      
      let newTokenCount = 0;
      
      // Process transactions in reverse order (oldest first)
      for (let i = signatures.length - 1; i >= 0; i--) {
        const sig = signatures[i];
        
        try {
          // Use Helius enhanced transactions API for rich data
          const enhancedTx = await this.getEnhancedTransaction(sig.signature);
          
          if (!enhancedTx) continue;
          
          // Check if this is a token creation transaction
          const tokenMint = this.extractTokenMintFromEnhancedTx(enhancedTx, platform);
          
          if (tokenMint && !this.discoveredTokens.has(tokenMint)) {
            this.discoveredTokens.add(tokenMint);
            
            // Extract metadata directly from enhanced transaction - no second call needed!
            const tokenData = this.extractTokenDataFromEnhancedTx(enhancedTx, tokenMint, platform);
            
            // Save to database
            await this.saveTokenData({
              mint: tokenMint,
              ...tokenData,
              platform,
              discoveredAt: new Date(sig.blockTime! * 1000)
            });
            
            newTokenCount++;
            console.log(`🎉 New ${platform} token discovered: ${tokenData.symbol} (${tokenMint})`);
          }
          
        } catch (txError) {
          console.error(`Error processing transaction ${sig.signature}:`, txError);
        }
      }
      
      // Update last processed signature
      if (signatures.length > 0) {
        await this.saveLastProcessedSignature(signatures[0].signature);
      }
      
      return newTokenCount;
      
    } catch (error) {
      console.error(`Error checking ${platform} program:`, error);
      return 0;
    }
  }

  /**
   * Get enhanced transaction from Helius with rate limiting
   */
  private async getEnhancedTransaction(signature: string): Promise<any> {
    // Check cache first
    if (this.transactionCache.has(signature)) {
      return this.transactionCache.get(signature);
    }
    
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.API_RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.API_RATE_LIMIT_MS - timeSinceLastCall));
    }
    this.lastApiCall = Date.now();
    try {
      // Extract API key from RPC URL
      if (!config.heliusRpcUrl) {
        throw new Error('Helius RPC URL is not configured');
      }
      
      const apiKey = new URL(config.heliusRpcUrl).searchParams.get('api-key');
      if (!apiKey) {
        throw new Error('API key not found in Helius RPC URL');
      }
      
      // Use Helius enhanced transactions API
      const response = await axios.get(
        `https://api.helius.xyz/v0/transactions/${signature}?api-key=${apiKey}`,
        { timeout: 10000 }
      );
      
      // Cache the result
      this.transactionCache.set(signature, response.data);
      
      // Clean cache if too large
      if (this.transactionCache.size > 1000) {
        const keysToDelete = Array.from(this.transactionCache.keys()).slice(0, 500);
        keysToDelete.forEach(key => this.transactionCache.delete(key));
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`Rate limit hit for transaction ${signature}, skipping...`);
      } else if (error.response?.status === 400) {
        console.warn(`Invalid transaction ${signature}, skipping...`);
      } else {
        console.error(`Error fetching enhanced transaction ${signature}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Extract token mint from enhanced transaction data
   */
  private extractTokenMintFromEnhancedTx(tx: any, platform: string): string | null {
    try {
      if (platform === 'pump.fun') {
        // Check token transfers for new mints
        const tokenTransfers = tx.tokenTransfers || [];
        for (const transfer of tokenTransfers) {
          if (transfer.fromUserAccount === null && transfer.mint) {
            return transfer.mint;
          }
        }
        
        // Check account data for token balance changes
        const accountData = tx.accountData || [];
        for (const account of accountData) {
          const tokenChanges = account.tokenBalanceChanges || [];
          for (const change of tokenChanges) {
            if (change.mint && change.rawTokenAmount?.tokenAmount !== '0') {
              return change.mint;
            }
          }
        }
      }
      
      if (platform === 'raydium') {
        // Look for new liquidity pool creation
        const tokenTransfers = tx.tokenTransfers || [];
        const uniqueMints = new Set<string>();
        
        for (const transfer of tokenTransfers) {
          if (transfer.mint && transfer.mint !== 'So11111111111111111111111111111111111111112') {
            uniqueMints.add(transfer.mint);
          }
        }
        
        // Return first non-SOL token mint
        return Array.from(uniqueMints)[0] || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting token mint:', error);
      return null;
    }
  }

  /**
   * Extract token data directly from enhanced transaction
   */
  private extractTokenDataFromEnhancedTx(tx: any, tokenMint: string, platform: string): any {
    try {
      // Extract metadata from events if available
      const events = tx.events || {};
      const nftEvent = events.nft || {};
      const metadata = nftEvent.metadata || {};
      
      // Get decimals from token balance changes
      let decimals = 6;
      const accountData = tx.accountData || [];
      for (const account of accountData) {
        const tokenChanges = account.tokenBalanceChanges || [];
        for (const change of tokenChanges) {
          if (change.mint === tokenMint && change.rawTokenAmount?.decimals) {
            decimals = change.rawTokenAmount.decimals;
            break;
          }
        }
      }
      
      // Extract creator from token transfers
      let creator = null;
      const tokenTransfers = tx.tokenTransfers || [];
      for (const transfer of tokenTransfers) {
        if (transfer.mint === tokenMint && transfer.fromUserAccount === null) {
          creator = transfer.toUserAccount;
          break;
        }
      }
      
      return {
        name: metadata.name || `New ${platform} Token`,
        symbol: metadata.symbol || 'UNKNOWN',
        decimals,
        logo_uri: metadata.uri || metadata.image,
        description: metadata.description,
        creator,
        supply: null // Will be fetched later if needed
      };
    } catch (error) {
      console.error(`Error extracting token data:`, error);
      return {
        name: `New ${platform} Token`,
        symbol: 'UNKNOWN',
        decimals: 6
      };
    }
  }

  /**
   * Save token data to database
   */
  private async saveTokenData(tokenData: any): Promise<void> {
    try {
      // First, fetch current row to preserve existing non-placeholder values
      const { data: existing } = await supabase.from('token_metadata').select('*').eq('mint', tokenData.mint).single();
      
      // Build upsert data preserving existing good values
      const upsertData: any = {
        mint: tokenData.mint,
        symbol: this.preserveExistingValue(tokenData.symbol, existing?.symbol, 'UNKNOWN'),
        name: this.preserveExistingValue(tokenData.name, existing?.name, 'Unknown Token'),
        decimals: tokenData.decimals || existing?.decimals || 6,
        platform: existing?.platform || tokenData.platform,
        is_active: existing?.is_active ?? false,
        updated_at: new Date().toISOString()
      };
      
      // Only set created_at if this is a new record
      if (!existing) {
        upsertData.created_at = tokenData.discoveredAt.toISOString();
      }
      
      // Preserve other fields if they exist and are not placeholders
      if (tokenData.logo_uri) {
        upsertData.logo_uri = tokenData.logo_uri;
      } else if (existing?.logo_uri && !this.isPlaceholderValue(existing.logo_uri)) {
        upsertData.logo_uri = existing.logo_uri;
      }
      
      if (tokenData.description) {
        upsertData.description = tokenData.description;
      } else if (existing?.description && !this.isPlaceholderValue(existing.description)) {
        upsertData.description = existing.description;
      }
      
      // Save to token_metadata
      const { error: metadataError } = await supabase
        .from('token_metadata')
        .upsert(upsertData, { onConflict: 'mint' });

      if (metadataError) {
        console.error('Error saving token metadata:', metadataError);
        return;
      }

      // If pump.fun token, save additional details
      if (tokenData.platform === 'pump.fun') {
        await supabase
          .from('memecoin_details')
          .upsert({
            token_mint: tokenData.mint,
            launch_timestamp: tokenData.discoveredAt.toISOString(),
            platform: tokenData.platform,
            metadata_uri: tokenData.logo_uri,
            initial_supply: tokenData.supply
          }, { onConflict: 'token_mint' });
        
        // Also derive and save bonding curve
        await this.savePumpFunBondingCurve(tokenData.mint);
      }

      // Write to pool_updates for Supabase Realtime notification
      await supabase
        .from('pool_updates')
        .insert({
          pool_address: `discovery-${tokenData.mint}`,
          token_mint: tokenData.mint,
          update_type: 'discovery',
          new_value: 1,
          metadata: {
            platform: tokenData.platform,
            symbol: tokenData.symbol,
            name: tokenData.name,
            source: 'automatic_discovery',
            timestamp: Date.now()
          }
        });

      console.log(`✅ Token ${tokenData.symbol} saved to database`);
      
    } catch (error) {
      console.error('Error saving token data:', error);
    }
  }

  /**
   * Save pump.fun bonding curve address
   */
  private async savePumpFunBondingCurve(tokenMint: string): Promise<void> {
    try {
      const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
      
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
        
      console.log(`Bonding curve saved for ${tokenMint}: ${poolAddress}`);
      
    } catch (error) {
      console.error('Error saving bonding curve:', error);
    }
  }

  /**
   * Helper method to preserve existing non-placeholder values
   * If the new value is empty/null but existing has a non-placeholder value, reuse existing
   * Otherwise use the new value or fallback
   */
  private preserveExistingValue(newValue: any, existingValue: any, ...placeholders: string[]): any {
    // If new value is valid (not null/undefined/empty), use it
    if (newValue !== null && newValue !== undefined && newValue !== '') {
      return newValue;
    }
    
    // If existing value exists and is not a placeholder, preserve it
    if (existingValue && !this.isPlaceholderValue(existingValue, ...placeholders)) {
      return existingValue;
    }
    
    // Otherwise use the first placeholder as fallback
    return placeholders[0] || null;
  }

  /**
   * Helper method to check if a value is a placeholder
   */
  private isPlaceholderValue(value: any, ...placeholders: string[]): boolean {
    if (!value) return true;
    
    const stringValue = String(value).toLowerCase();
    return placeholders.some(placeholder => 
      stringValue === placeholder.toLowerCase() ||
      stringValue.includes('unknown') ||
      stringValue.includes('test') ||
      stringValue.includes('demo') ||
      stringValue === 'null' ||
      stringValue === 'undefined'
    );
  }

  /**
   * Get discovery statistics
   */
  async getStats(): Promise<any> {
    const { data: todayTokens } = await supabase
      .from('token_metadata')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return {
      isRunning: this.pollingInterval !== null,
      discoveredToday: todayTokens?.length || 0,
      totalDiscovered: this.discoveredTokens.size,
      lastProcessedSignature: this.lastProcessedSignature
    };
  }
}

export const heliusAutomaticTokenDiscoveryService = HeliusAutomaticTokenDiscoveryService.getInstance();