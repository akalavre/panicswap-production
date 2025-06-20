import { helius } from '../utils/heliusClient';
// import { WebSocketService } from './WebSocketService'; // REMOVED: Using Supabase Realtime
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import supabase from '../utils/supabaseClient';

// Simple in-memory price cache
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds (increased to reduce API calls)

export class HeliusWebhookService {
  private solPrice = 150; // Default SOL price, update periodically
  
  constructor() {
    console.log('HeliusWebhookService initialized - writing to Supabase for realtime');
    
    // Update SOL price every 5 minutes
    this.updateSolPrice();
    setInterval(() => this.updateSolPrice(), 5 * 60 * 1000);
  }
  
  /**
   * Handle incoming webhook request
   */
  async handleWebhook(data: any) {
    return this.processWebhook(data);
  }

  /**
   * Process incoming webhook from Helius
   */
  async processWebhook(data: any) {
    try {
      // Helius webhook sends an array of transactions
      const transactions = Array.isArray(data) ? data : [data];
      
      for (const tx of transactions) {
        // Check if it's a swap transaction
        if (tx.type !== 'SWAP') continue;
        
        // Extract price from swap
        const priceData = this.extractPriceFromSwap(tx.tokenTransfers, tx.nativeTransfers);
        if (!priceData) continue;
        
        const { tokenMint, price } = priceData;
        
        // Update cache
        priceCache.set(tokenMint, { price, timestamp: Date.now() });
        
        // Update database (includes writing to pool_updates for Supabase Realtime)
        await this.updateDatabase(tokenMint, price);
        
        // REMOVED: WebSocket broadcast - Supabase Realtime handles this now
        // Real-time updates are automatically sent when we write to the database
        
        console.log(`Updated price for ${tokenMint}: $${price.toFixed(6)} (from webhook)`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }
  
  /**
   * Extract price from swap transaction
   */
  private extractPriceFromSwap(tokenTransfers: any[], nativeTransfers: any[]) {
    if (!tokenTransfers?.length || !nativeTransfers?.length) return null;
    
    // Find the main token being swapped
    // In a swap, one token goes in and another goes out
    const tokenIn = tokenTransfers.find(t => t.fromUserAccount && t.toUserAccount);
    const tokenOut = tokenTransfers.find(t => t.fromUserAccount !== t.toUserAccount && t !== tokenIn);
    
    // Handle SOL <-> Token swaps
    const solTransfer = nativeTransfers.find(t => t.amount > 0);
    
    if (tokenIn && solTransfer) {
      // Token -> SOL swap
      const solAmount = Math.abs(solTransfer.amount) / LAMPORTS_PER_SOL;
      const tokenAmount = Math.abs(tokenIn.tokenAmount);
      
      if (tokenAmount === 0) return null;
      
      const priceInSol = solAmount / tokenAmount;
      const priceInUsd = priceInSol * this.solPrice;
      
      return {
        tokenMint: tokenIn.mint,
        price: priceInUsd
      };
    } else if (tokenOut && solTransfer) {
      // SOL -> Token swap
      const solAmount = Math.abs(solTransfer.amount) / LAMPORTS_PER_SOL;
      const tokenAmount = Math.abs(tokenOut.tokenAmount);
      
      if (tokenAmount === 0) return null;
      
      const priceInSol = solAmount / tokenAmount;
      const priceInUsd = priceInSol * this.solPrice;
      
      return {
        tokenMint: tokenOut.mint,
        price: priceInUsd
      };
    }
    
    // Token <-> Token swaps (more complex, skip for now)
    return null;
  }
  
  /**
   * Get cached price
   */
  getCachedPrice(tokenMint: string): number | null {
    const cached = priceCache.get(tokenMint);
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      priceCache.delete(tokenMint);
      return null;
    }
    
    return cached.price;
  }
  
  /**
   * Update database with new price
   */
  private async updateDatabase(tokenMint: string, price: number) {
    try {
      // Update token_prices table
      await supabase
        .from('token_prices')
        .upsert({
          token_mint: tokenMint,
          price: price,
          price_usd: price,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token_mint' });

      // NEW: Also record the price in token_price_history for dashboard charts
      await supabase
        .from('token_price_history')
        .insert({
          token_mint: tokenMint,
          price: price,
          liquidity: null, // Unknown at webhook time
          volume_24h: null,
          market_cap: null,
          recorded_at: new Date().toISOString(),
          source: 'helius_webhook'
        });

      // Also write to pool_updates for Supabase Realtime
      await supabase
        .from('pool_updates')
        .insert({
          pool_address: `webhook-${tokenMint}`,
          token_mint: tokenMint,
          update_type: 'price',
          new_value: price,
          change_percentage: 0,
          metadata: {
            source: 'helius_webhook',
            realtime: true,
            timestamp: Date.now()
          }
        });
    } catch (error) {
      console.error('Error updating price in database:', error);
    }
  }
  
  /**
   * Update SOL price from reliable source
   */
  private async updateSolPrice() {
    try {
      // Use Jupiter API for SOL price
      const response = await fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
      const data = await response.json();
      
      if (data?.data?.So11111111111111111111111111111111111111112?.price) {
        this.solPrice = data.data.So11111111111111111111111111111111111111112.price;
        console.log(`Updated SOL price: $${this.solPrice}`);
      }
    } catch (error) {
      console.error('Error updating SOL price:', error);
    }
  }
}