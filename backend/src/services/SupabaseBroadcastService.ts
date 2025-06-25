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
  private listeners: Map<string, Set<Function>> = new Map();
  private isInitialized = false;

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
    if (this.isInitialized) return;
    
    console.log('[SupabaseBroadcast] Initializing broadcast channels...');
    
    // Main alert channel for critical events
    const alertChannel = supabase.channel('protection-alerts');
    
    // Set up event handlers once
    alertChannel.on('broadcast', { event: 'rugpull:detected' }, ({ payload }) => {
      this.notifyListeners('rugpull', payload);
    });
    
    alertChannel.on('broadcast', { event: 'protection:executed' }, ({ payload }) => {
      this.notifyListeners('protection', payload);
    });
    
    alertChannel.on('broadcast', { event: 'price:alert' }, ({ payload }) => {
      this.notifyListeners('price', payload);
    });
    
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
    
    this.isInitialized = true;
  }

  private notifyListeners(eventType: string, payload: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[SupabaseBroadcast] Error in ${eventType} listener:`, error);
        }
      });
    }
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
    if (!this.listeners.has('rugpull')) {
      this.listeners.set('rugpull', new Set());
    }
    this.listeners.get('rugpull')!.add(callback);
  }

  /**
   * Subscribe to protection execution alerts
   */
  onProtectionExecution(callback: (alert: BroadcastAlert) => void) {
    if (!this.listeners.has('protection')) {
      this.listeners.set('protection', new Set());
    }
    this.listeners.get('protection')!.add(callback);
  }

  /**
   * Subscribe to price alerts
   */
  onPriceAlert(callback: (alert: BroadcastAlert) => void) {
    if (!this.listeners.has('price')) {
      this.listeners.set('price', new Set());
    }
    this.listeners.get('price')!.add(callback);
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
      await this.presenceChannel.untrack();
    }
  }

  /**
   * Cleanup and unsubscribe from all channels
   */
  async cleanup() {
    console.log('[SupabaseBroadcast] Cleaning up channels...');
    
    for (const [name, channel] of this.channels) {
      await channel.unsubscribe();
    }
    
    if (this.presenceChannel) {
      await this.presenceChannel.unsubscribe();
    }
    
    this.channels.clear();
    this.listeners.clear();
    this.presenceChannel = null;
    this.isInitialized = false;
  }
}

// Export singleton
export const broadcastService = SupabaseBroadcastService.getInstance();