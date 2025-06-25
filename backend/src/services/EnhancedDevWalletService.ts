import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import supabase from '../utils/supabaseClient';

interface DevWalletActivity {
  pct_total: number | null;
  pct_24h: number | null;
  pct_1h: number | null;
  last_tx: string | null;
  dev_wallets: string[];
}

interface TransferInfo {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
}

export class EnhancedDevWalletService {
  private supabase;
  private connection: Connection;
  private addressClassifications = new Map<string, string>();
  private devWalletCache = new Map<string, Set<string>>();

  constructor() {
    this.supabase = supabase;
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae');
    this.loadAddressClassifications();
  }

  private async loadAddressClassifications() {
    try {
      const { data, error } = await this.supabase
        .from('address_classifications')
        .select('address, classification');

      if (!error && data) {
        data.forEach(item => {
          this.addressClassifications.set(item.address, item.classification);
        });
      }
    } catch (error) {
      console.error('Error loading address classifications:', error);
    }
  }

  /**
   * Identify developer wallets using heuristics
   */
  async identifyDevWallets(tokenMint: string, creatorAddress: string): Promise<string[]> {
    // Check cache
    const cached = this.devWalletCache.get(tokenMint);
    if (cached) {
      return Array.from(cached);
    }

    const devWallets = new Set<string>();
    devWallets.add(creatorAddress);

    try {
      // Get token launch time
      const launchTime = await this.getTokenLaunchTime(tokenMint, creatorAddress);
      if (!launchTime) return Array.from(devWallets);

      const launchTimestamp = new Date(launchTime).getTime();
      const fiveMinutesAfterLaunch = launchTimestamp + (5 * 60 * 1000);
      const oneHourAfterLaunch = launchTimestamp + (60 * 60 * 1000);

      // Get early transactions
      const earlyTransfers = await this.getEarlyTokenTransfers(
        tokenMint, 
        creatorAddress, 
        launchTimestamp,
        oneHourAfterLaunch
      );

      // Analyze early transfers to identify dev wallets
      for (const transfer of earlyTransfers) {
        // Early receivers (within 5 minutes)
        if (transfer.timestamp <= fiveMinutesAfterLaunch && transfer.to !== creatorAddress) {
          const percentageReceived = (transfer.amount / 1000000000) * 100; // Assuming 1B supply
          
          if (percentageReceived > 1) { // Received more than 1%
            devWallets.add(transfer.to);
            
            // Store in database
            await this.storeDevWallet(tokenMint, transfer.to, 'early_receiver', {
              percentage_received: percentageReceived,
              received_within_minutes: Math.floor((transfer.timestamp - launchTimestamp) / 60000)
            });
          }
        }

        // Large holders in first hour
        if (transfer.timestamp <= oneHourAfterLaunch && transfer.to !== creatorAddress) {
          const percentageReceived = (transfer.amount / 1000000000) * 100;
          
          if (percentageReceived > 5) { // Received more than 5%
            devWallets.add(transfer.to);
            
            await this.storeDevWallet(tokenMint, transfer.to, 'large_holder', {
              percentage_received: percentageReceived,
              received_within_minutes: Math.floor((transfer.timestamp - launchTimestamp) / 60000)
            });
          }
        }
      }

      // Identify proxy wallets by pattern analysis
      const proxyWallets = await this.identifyProxyWallets(tokenMint, Array.from(devWallets));
      proxyWallets.forEach(wallet => devWallets.add(wallet));

      // Cache the result
      this.devWalletCache.set(tokenMint, devWallets);

      return Array.from(devWallets);
    } catch (error) {
      console.error('Error identifying dev wallets:', error);
      return Array.from(devWallets);
    }
  }

  /**
   * Calculate comprehensive dev wallet activity with rolling metrics
   */
  async calculateDevWalletActivity(tokenMint: string, devWallets: string[]): Promise<DevWalletActivity> {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    let totalMoved = 0;
    let moved24h = 0;
    let moved1h = 0;
    let lastTxTime: number | null = null;
    
    const totalSupply = 1000000000; // Assuming 1B supply, should fetch actual

    try {
      // Analyze each dev wallet
      for (const wallet of devWallets) {
        const transfers = await this.getWalletTokenTransfers(tokenMint, wallet, oneDayAgo);
        
        for (const transfer of transfers) {
          // Skip transfers to classified addresses (DEX, burn, etc)
          const toClassification = this.addressClassifications.get(transfer.to);
          if (toClassification && ['dex_vault', 'lp_pool', 'burn'].includes(toClassification)) {
            continue;
          }

          // Count as dev sell/transfer
          totalMoved += transfer.amount;
          
          if (transfer.timestamp >= oneDayAgo) {
            moved24h += transfer.amount;
          }
          
          if (transfer.timestamp >= oneHourAgo) {
            moved1h += transfer.amount;
          }
          
          if (!lastTxTime || transfer.timestamp > lastTxTime) {
            lastTxTime = transfer.timestamp;
          }
        }
      }

      return {
        pct_total: Math.min((totalMoved / totalSupply) * 100, 100),
        pct_24h: Math.min((moved24h / totalSupply) * 100, 100),
        pct_1h: Math.min((moved1h / totalSupply) * 100, 100),
        last_tx: lastTxTime ? new Date(lastTxTime).toISOString() : null,
        dev_wallets: devWallets
      };
    } catch (error) {
      console.error('Error calculating dev wallet activity:', error);
      return {
        pct_total: 0,
        pct_24h: 0,
        pct_1h: 0,
        last_tx: null,
        dev_wallets: devWallets
      };
    }
  }

  /**
   * Get token transfers for a wallet within a time range
   */
  private async getWalletTokenTransfers(
    tokenMint: string, 
    wallet: string, 
    fromTimestamp: number
  ): Promise<TransferInfo[]> {
    const transfers: TransferInfo[] = [];
    
    try {
      const url = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae';
      let before: string | undefined = undefined;
      
      while (true) {
        const signaturesResponse: any = await axios.post(url, {
          jsonrpc: "2.0",
          id: "get-signatures",
          method: "getSignaturesForAddress",
          params: [wallet, { limit: 100, before }]
        });

        const signatures: any[] = signaturesResponse.data?.result || [];
        if (signatures.length === 0) break;

        for (const sig of signatures) {
          if (sig.blockTime && sig.blockTime * 1000 < fromTimestamp) {
            return transfers; // We've gone too far back
          }

          const txData = await this.getTransactionTransfers(sig.signature, tokenMint, wallet);
          transfers.push(...txData);
        }

        before = signatures[signatures.length - 1].signature;
        if (signatures.length < 100) break;
      }
    } catch (error) {
      console.error('Error getting wallet transfers:', error);
    }

    return transfers;
  }

  /**
   * Parse transaction for token transfers
   */
  private async getTransactionTransfers(
    signature: string, 
    tokenMint: string,
    fromWallet: string
  ): Promise<TransferInfo[]> {
    const transfers: TransferInfo[] = [];
    
    try {
      const url = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae';
      const txResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-tx",
        method: "getTransaction",
        params: [
          signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
        ]
      });

      const tx = txResponse.data?.result;
      if (!tx) return transfers;

      const timestamp = (tx.blockTime || 0) * 1000;
      const instructions = tx.transaction?.message?.instructions || [];

      for (const inst of instructions) {
        if (inst.program === 'spl-token' && inst.parsed) {
          const parsed = inst.parsed;
          
          if ((parsed.type === 'transfer' || parsed.type === 'transferChecked') && 
              parsed.info?.mint === tokenMint) {
            const info = parsed.info;
            
            if (info.source === fromWallet || info.authority === fromWallet) {
              transfers.push({
                from: fromWallet,
                to: info.destination,
                amount: parseFloat(info.amount || info.tokenAmount?.amount || '0'),
                timestamp,
                signature
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing transaction:', error);
    }

    return transfers;
  }

  /**
   * Get early token transfers after launch
   */
  private async getEarlyTokenTransfers(
    tokenMint: string,
    creatorAddress: string,
    launchTimestamp: number,
    untilTimestamp: number
  ): Promise<TransferInfo[]> {
    const transfers: TransferInfo[] = [];
    
    try {
      // Get creator's early transactions
      const creatorTransfers = await this.getWalletTokenTransfers(
        tokenMint, 
        creatorAddress, 
        launchTimestamp
      );

      // Filter to only early transfers
      return creatorTransfers.filter(t => t.timestamp <= untilTimestamp);
    } catch (error) {
      console.error('Error getting early transfers:', error);
      return transfers;
    }
  }

  /**
   * Identify proxy wallets through pattern analysis
   */
  private async identifyProxyWallets(tokenMint: string, knownDevWallets: string[]): Promise<string[]> {
    const proxyWallets: string[] = [];
    
    // TODO: Implement pattern analysis
    // - Check for wallets that receive from dev wallets and immediately sell
    // - Check for wallets created around the same time as token launch
    // - Check for wallets with similar transaction patterns
    
    return proxyWallets;
  }

  /**
   * Store identified dev wallet in database
   */
  private async storeDevWallet(
    tokenMint: string, 
    wallet: string, 
    type: string,
    metadata: any
  ) {
    try {
      await this.supabase
        .from('dev_wallets')
        .upsert({
          token_mint: tokenMint,
          wallet_address: wallet,
          wallet_type: type,
          percentage_received: metadata.percentage_received,
          received_within_minutes: metadata.received_within_minutes,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'token_mint,wallet_address'
        });
    } catch (error) {
      console.error('Error storing dev wallet:', error);
    }
  }

  /**
   * Get token launch time
   */
  private async getTokenLaunchTime(tokenMint: string, creator: string): Promise<string | null> {
    try {
      const url = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae';
      
      // Get oldest signature for the creator
      const signaturesResponse = await axios.post(url, {
        jsonrpc: "2.0",
        id: "get-launch-time",
        method: "getSignaturesForAddress",
        params: [creator, { limit: 1000 }]
      });

      const signatures = signaturesResponse.data?.result || [];
      if (signatures.length === 0) return null;

      // Find the oldest transaction
      let oldestTime = Date.now();
      
      for (const sig of signatures) {
        if (sig.blockTime && sig.blockTime * 1000 < oldestTime) {
          oldestTime = sig.blockTime * 1000;
        }
      }

      return new Date(oldestTime).toISOString();
    } catch (error) {
      console.error('Error getting launch time:', error);
      return null;
    }
  }

  /**
   * Update rugcheck report with enhanced dev activity
   */
  async updateRugcheckReport(tokenMint: string) {
    try {
      // Get creator address from existing report
      const { data: report } = await this.supabase
        .from('rugcheck_reports')
        .select('creator_address')
        .eq('token_mint', tokenMint)
        .single();

      if (!report?.creator_address) {
        console.error('No creator address found for token:', tokenMint);
        return;
      }

      // Identify dev wallets
      const devWallets = await this.identifyDevWallets(tokenMint, report.creator_address);
      console.log(`Identified ${devWallets.length} dev wallets for ${tokenMint}`);

      // Calculate activity metrics
      const activity = await this.calculateDevWalletActivity(tokenMint, devWallets);

      // Update database
      await this.supabase
        .from('rugcheck_reports')
        .update({
          dev_activity_pct: activity.pct_24h, // Keep backward compatibility
          dev_activity_pct_total: activity.pct_total,
          dev_activity_24h_pct: activity.pct_24h,
          dev_activity_1h_pct: activity.pct_1h,
          last_dev_tx: activity.last_tx,
          dev_wallets: activity.dev_wallets,
          dev_activity_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('token_mint', tokenMint);

      console.log(`Updated dev activity for ${tokenMint}:`, {
        total: (activity.pct_total || 0).toFixed(2) + '%',
        '24h': (activity.pct_24h || 0).toFixed(2) + '%',
        '1h': (activity.pct_1h || 0).toFixed(2) + '%',
        wallets: activity.dev_wallets.length
      });

    } catch (error) {
      console.error('Error updating rugcheck report:', error);
    }
  }
}