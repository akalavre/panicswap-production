import { helius } from '../utils/heliusClient';
import supabase from '../utils/supabaseClient';
import config from '../config';

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

export class HeliusTokenDiscoveryService {
  private static instance: HeliusTokenDiscoveryService;
  private webhookId: string | null = null;

  private constructor() {
    console.log('HeliusTokenDiscoveryService initialized');
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