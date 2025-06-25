import { Connection, PublicKey, Logs, Context, KeyedAccountInfo } from '@solana/web3.js';
import WebSocket from 'ws';
import config from '../config';
import { EventEmitter } from 'events';
import { safeParsePublicKey, validateWebSocketMessage, ThrottledLogger } from '../utils/validators';

export interface WebSocketConfig {
  endpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface LogFilter {
  programId?: PublicKey;
  mentions?: PublicKey[];
}

export interface PoolChangeEvent {
  slot: number;
  blockTime?: number;
  logs: string[];
  signature: string;
  programId?: string;
}

export class SolanaWebsocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private endpoint: string;
  private subscriptions: Map<number, string> = new Map();
  private activeSubscriptions: Set<string> = new Set(); // For deduplication
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;
  private isConnecting = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private connection: Connection;
  private throttledLogger: ThrottledLogger;
  private endpoints: string[];
  private currentEndpointIndex = 0;

  constructor(config?: WebSocketConfig) {
    super();
    
    // Try multiple WebSocket endpoints in order of preference
    this.endpoints = [
      // Free public endpoints (no API key required)
      'wss://api.mainnet-beta.solana.com',
      'wss://solana-api.projectserum.com',
      'wss://rpc.ankr.com/solana_ws',
      // Fallback to Helius if available
      process.env.HELIUS_RPC_URL?.replace('https://', 'wss://') + (process.env.HELIUS_API_KEY ? '?api-key=' + process.env.HELIUS_API_KEY : '')
    ].filter(Boolean) as string[];
    
    this.endpoint = config?.endpoint || this.endpoints[0];
    this.maxReconnectAttempts = config?.maxReconnectAttempts || 10;
    this.reconnectInterval = config?.reconnectInterval || 5000;
    
    // Also create a regular connection for RPC calls
    this.connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY,
      config?.commitment || 'confirmed'
    );
    
    // Initialize throttled logger
    this.throttledLogger = new ThrottledLogger(60000, 10); // 10 logs per minute max
    
    console.log(`[WebSocket] Initialized with Helius endpoint: ${this.endpoint.replace(/api-key=.*/, 'api-key=***')}`);
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      this.tryConnectToEndpoint(resolve, reject);
    });
  }

  private tryConnectToEndpoint(resolve: () => void, reject: (error: any) => void) {
    try {
      console.log(`[WebSocket] Trying endpoint ${this.currentEndpointIndex + 1}/${this.endpoints.length}: ${this.endpoint.replace(/api-key=.*/, 'api-key=***')}`);
      this.ws = new WebSocket(this.endpoint);
        
        this.ws.on('open', () => {
          console.log('[WebSocket] ✅ Connected to Helius WebSocket');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Validate message structure
            if (!validateWebSocketMessage(message)) {
              this.throttledLogger.log(
                'invalid-ws-message',
                '[WebSocket] Invalid message structure received'
              );
              return;
            }
            
            this.handleMessage(message);
          } catch (error) {
            this.throttledLogger.log(
              'ws-parse-error',
              '[WebSocket] Error parsing message: ' + error,
              'error'
            );
          }
        });

        this.ws.on('error', (error) => {
          console.error(`[WebSocket] Error on endpoint ${this.endpoint.replace(/api-key=.*/, 'api-key=***')}:`, error);
          
          // Try next endpoint if available
          if (this.currentEndpointIndex < this.endpoints.length - 1) {
            this.currentEndpointIndex++;
            this.endpoint = this.endpoints[this.currentEndpointIndex];
            console.log(`[WebSocket] Switching to next endpoint...`);
            setTimeout(() => this.tryConnectToEndpoint(resolve, reject), 1000);
            return;
          }
          
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[WebSocket] Disconnected: ${code} - ${reason}`);
          this.cleanup();
          this.handleReconnect();
        });

      } catch (error) {
        // Try next endpoint if available
        if (this.currentEndpointIndex < this.endpoints.length - 1) {
          this.currentEndpointIndex++;
          this.endpoint = this.endpoints[this.currentEndpointIndex];
          console.log(`[WebSocket] Error connecting, trying next endpoint...`);
          setTimeout(() => this.tryConnectToEndpoint(resolve, reject), 1000);
          return;
        }
        
        this.isConnecting = false;
        reject(error);
      }
  }

  /**
   * Subscribe to logs for specific programs (ultra-low latency)
   */
  async subscribeToLogs(filter: LogFilter): Promise<number> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // Validate that only one filter type is provided
    if (filter.mentions?.length && filter.programId) {
      throw new Error('Cannot specify both mentions and programId - Solana requires a single-key map');
    }

    const id = this.generateId();
    
    // Build spec-compliant filter parameter
    // Solana 1.17+ expects { filter: "all" | "allWithVotes" | { mentions: [...] } }
    let filterParam: any;
    
    if (filter.mentions?.length) {
      filterParam = {
        filter: {
          mentions: filter.mentions.map(pk => pk.toString())
        }
      };
    } else if (filter.programId) {
      // For program-specific logs, use mentions with the program ID
      filterParam = {
        filter: {
          mentions: [filter.programId.toString()]
        }
      };
    } else {
      // Default to "all" if no filter specified
      filterParam = {
        filter: 'all'
      };
    }
    
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'logsSubscribe',
      params: [
        filterParam.filter, // Pass just the filter value, not wrapped in object
        {
          commitment: 'confirmed'
        }
      ]
    };

    return new Promise((resolve, reject) => {
      const handler = (data: any) => {
        if (data.id === id) {
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            const subId = data.result;
            this.subscriptions.set(subId, 'logs');
            console.log(`[WebSocket] ✅ Subscribed to logs (ID: ${subId})`);
            resolve(subId);
          }
          this.removeListener('rpc-response', handler);
        }
      };
      
      this.on('rpc-response', handler);
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Subscribe to account changes (for pool monitoring)
   */
  async subscribeToAccount(
    account: PublicKey,
    callback: (accountInfo: KeyedAccountInfo, context: Context) => void
  ): Promise<number> {
    const accountKey = account.toString();
    
    // Check for duplicate subscription
    if (this.activeSubscriptions.has(`account:${accountKey}`)) {
      console.log(`[WebSocket] Already subscribed to account ${accountKey}`);
      // Find existing subscription ID
      for (const [subId, subType] of this.subscriptions) {
        if (subType === `account:${accountKey}`) {
          return subId;
        }
      }
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = this.generateId();
    
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'accountSubscribe',
      params: [
        account.toString(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd' // Compressed for faster transmission
        }
      ]
    };

    return new Promise((resolve, reject) => {
      const handler = (data: any) => {
        if (data.id === id) {
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            const subId = data.result;
            this.subscriptions.set(subId, `account:${accountKey}`);
            this.activeSubscriptions.add(`account:${accountKey}`);
            
            // Register callback
            this.on(`account:${subId}`, callback);
            
            console.log(`[WebSocket] ✅ Subscribed to account ${accountKey} (ID: ${subId})`);
            resolve(subId);
          }
          this.removeListener('rpc-response', handler);
        }
      };
      
      this.on('rpc-response', handler);
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Subscribe to program account changes (monitor all pools)
   */
  async subscribeToProgramAccounts(
    programId: PublicKey,
    filters?: Array<{ memcmp?: { offset: number; bytes: string }; dataSize?: number }>
  ): Promise<number> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = this.generateId();
    
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'programSubscribe',
      params: [
        programId.toString(),
        {
          commitment: 'confirmed',
          encoding: 'base64+zstd',
          filters: filters || []
        }
      ]
    };

    return new Promise((resolve, reject) => {
      const handler = (data: any) => {
        if (data.id === id) {
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            const subId = data.result;
            this.subscriptions.set(subId, `program:${programId.toString()}`);
            console.log(`[WebSocket] ✅ Subscribed to program ${programId.toString()} (ID: ${subId})`);
            resolve(subId);
          }
          this.removeListener('rpc-response', handler);
        }
      };
      
      this.on('rpc-response', handler);
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Unsubscribe from logs subscription
   */
  async unsubscribeFromLogs(subscriptionId: number): Promise<void> {
    return this.unsubscribe(subscriptionId);
  }

  /**
   * Unsubscribe from a subscription
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscriptionType = this.subscriptions.get(subscriptionId);
    if (!subscriptionType) {
      return;
    }

    const method = subscriptionType === 'logs' || subscriptionType.startsWith('logs') ? 'logsUnsubscribe' :
                   subscriptionType.startsWith('account') ? 'accountUnsubscribe' :
                   subscriptionType.startsWith('program') ? 'programUnsubscribe' :
                   'unsubscribe';

    const request = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method,
      params: [subscriptionId]
    };

    this.ws.send(JSON.stringify(request));
    this.subscriptions.delete(subscriptionId);
    
    // Clean up active subscriptions tracking
    if (subscriptionType.startsWith('account:')) {
      this.activeSubscriptions.delete(subscriptionType);
      this.removeAllListeners(`account:${subscriptionId}`);
    }
    
    console.log(`[WebSocket] Unsubscribed from ${subscriptionType} (ID: ${subscriptionId})`);
  }

  private handleMessage(message: any) {
    // RPC responses
    if (message.id !== undefined) {
      this.emit('rpc-response', message);
      return;
    }

    // Subscription notifications
    if (message.method === 'logsNotification') {
      const { subscription, result } = message.params;
      const { value, context } = result;
      
      this.emit('logs', {
        slot: context.slot,
        logs: value.logs,
        signature: value.signature,
        err: value.err
      });
      
    } else if (message.method === 'accountNotification') {
      const { subscription, result } = message.params;
      const { value, context } = result;
      
      // Safely parse pubkey
      const pk = this.safeParsePubkey(value?.pubkey);
      if (!pk) {
        return; // Already logged by safeParsePubkey
      }
      
      // Emit to specific account listeners
      this.emit(`account:${subscription}`, {
        accountId: pk,
        accountInfo: value.account,
        slot: context.slot
      }, context);
      
    } else if (message.method === 'programNotification') {
      const { subscription, result } = message.params;
      const { value, context } = result;
      
      this.emit('program', {
        subscription,
        pubkey: value.pubkey,
        account: value.account,
        slot: context.slot
      });
    }
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30s
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.subscriptions.clear();
    this.activeSubscriptions.clear();
    this.removeAllListeners();
  }

  private safeParsePubkey(input: any): PublicKey | null {
    const pubkey = safeParsePublicKey(input);
    if (!pubkey) {
      this.throttledLogger.log(
        'invalid-pubkey',
        `[WebSocket] Invalid public key: ${typeof input === 'string' ? input.substring(0, 10) + '...' : typeof input}`
      );
    }
    return pubkey;
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('max-reconnects');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, this.reconnectInterval);
  }

  private generateId(): number {
    return Math.floor(Math.random() * 100000);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

// Export singleton instance
export const wsClient = new SolanaWebsocketClient();