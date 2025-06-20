import { RealtimeChannel } from '@supabase/supabase-js';
import supabase from '../utils/supabaseClient';

export interface BroadcastAlert {
  type: 'rugpull' | 'protection' | 'price' | 'execution';
  severity: 'critical' | 'warning' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'; // Support both database and app formats
  data: any;
  timestamp: Date;
}

export class SupabaseBroadcastService {
  private static instance: SupabaseBroadcastService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceChannel: RealtimeChannel | null = null;

  private constructor() {
    this.initializeChannels();
  }

  static getInstance(): SupabaseBroadcastService {
    if (!SupabaseBroadcastService.instance) {
      SupabaseBroadcastService.instance = new SupabaseBroadcastService();
    }
    return SupabaseBroadcastService.instance;
  }

  private async initializeChannels() {
    console.log('[SupabaseBroadcast] Initializing broadcast channels...');
    
    // Main alert channel for critical events
    const alertChannel = supabase.channel('protection-alerts');
    
    // Subscribe to the channel
    await alertChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[SupabaseBroadcast] ✅ Alert channel subscribed');
      }
    });
    
    this.channels.set('alerts', alertChannel);

    // Initialize presence channel for monitoring status
    this.presenceChannel = supabase.channel('monitoring-presence');
    await this.presenceChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[SupabaseBroadcast] ✅ Presence channel subscribed');
      }
    });
  }

  /**
   * Broadcast a rugpull alert
   */
  async broadcastRugpullAlert(data: {
    tokenMint: string;
    poolAddress: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    liquidityChange: number;
    type: string;
  }) {
    const alert: BroadcastAlert = {
      type: 'rugpull',
      severity: data.severity,
      data,
      timestamp: new Date()
    };

    console.log(`[SupabaseBroadcast] 🚨 Broadcasting rugpull alert:`, {
      tokenMint: data.tokenMint,
      severity: data.severity,
      liquidityChange: `${data.liquidityChange}%`
    });

    const channel = this.channels.get('alerts');
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'rugpull:detected',
        payload: alert
      });
    }

    // Also write to database for persistence
    try {
      await supabase
        .from('rugpull_alerts')
        .insert({
          token_mint: data.tokenMint,
          pool_address: data.poolAddress,
          severity: data.severity,
          liquidity_change: data.liquidityChange,
          alert_type: data.type,
          detected_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('[SupabaseBroadcast] Error writing alert to database:', error);
    }
  }

  /**
   * Broadcast a protection execution alert
   */
  async broadcastProtectionExecution(data: {
    tokenMint: string;
    walletAddress: string;
    action: 'emergency_sell' | 'executed' | 'failed';
    reason?: string;
    signature?: string;
  }) {
    const alert: BroadcastAlert = {
      type: 'execution',
      severity: 'HIGH',
      data,
      timestamp: new Date()
    };

    console.log(`[SupabaseBroadcast] 💊 Broadcasting protection execution:`, {
      tokenMint: data.tokenMint,
      action: data.action
    });

    const channel = this.channels.get('alerts');
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'protection:executed',
        payload: alert
      });
    }
  }

  /**
   * Broadcast a price alert
   */
  async broadcastPriceAlert(data: {
    tokenMint: string;
    priceChange: number;
    currentPrice: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }) {
    const alert: BroadcastAlert = {
      type: 'price',
      severity: data.severity,
      data,
      timestamp: new Date()
    };

    const channel = this.channels.get('alerts');
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'price:alert',
        payload: alert
      });
    }
  }

  /**
   * Subscribe to rugpull alerts
   */
  onRugpullAlert(callback: (alert: BroadcastAlert) => void) {
    const channel = this.channels.get('alerts');
    if (channel) {
      channel.on('broadcast', { event: 'rugpull:detected' }, ({ payload }) => {
        callback(payload);
      });
    }
  }

  /**
   * Subscribe to protection execution alerts
   */
  onProtectionExecution(callback: (alert: BroadcastAlert) => void) {
    const channel = this.channels.get('alerts');
    if (channel) {
      channel.on('broadcast', { event: 'protection:executed' }, ({ payload }) => {
        callback(payload);
      });
    }
  }

  /**
   * Track monitoring presence
   */
  async trackMonitoring(tokenMint: string, poolAddress: string) {
    if (this.presenceChannel) {
      await this.presenceChannel.track({
        tokenMint,
        poolAddress,
        monitoring_since: new Date().toISOString(),
        server_id: process.env.SERVER_ID || 'main'
      });
    }
  }

  /**
   * Stop tracking monitoring
   */
  async untrackMonitoring(tokenMint: string) {
    if (this.presenceChannel) {
      const presenceState = await this.presenceChannel.presenceState();
      const myPresence = Object.values(presenceState).find(
        (p: any) => p.tokenMint === tokenMint
      );
      if (myPresence) {
        await this.presenceChannel.untrack();
      }
    }
  }

  /**
   * Get active monitoring list
   */
  async getActiveMonitoring(): Promise<any[]> {
    if (this.presenceChannel) {
      const presenceState = await this.presenceChannel.presenceState();
      return Object.values(presenceState);
    }
    return [];
  }

  /**
   * Cleanup channels
   */
  async cleanup() {
    for (const [name, channel] of this.channels) {
      await channel.unsubscribe();
      console.log(`[SupabaseBroadcast] Unsubscribed from ${name} channel`);
    }
    
    if (this.presenceChannel) {
      await this.presenceChannel.unsubscribe();
    }
    
    this.channels.clear();
  }
}

// Export singleton instance
export const broadcastService = SupabaseBroadcastService.getInstance();