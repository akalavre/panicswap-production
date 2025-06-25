import { PublicKey } from '@solana/web3.js';

/**
 * Validate if a string is a valid Solana public key
 */
export function isValidPublicKey(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  // Basic format check - base58 characters, 32-44 chars
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    return false;
  }
  
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if a string is a valid transaction signature
 */
export function isValidSignature(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  // Signatures are typically 87-88 characters in base58
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(value);
}

/**
 * Safely parse a public key with validation
 */
export function safeParsePublicKey(value: any): PublicKey | null {
  if (!isValidPublicKey(value)) {
    return null;
  }
  
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/**
 * Validate WebSocket message structure
 */
export function validateWebSocketMessage(message: any): boolean {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  // Check for required fields based on message type
  if (message.method) {
    // Subscription notification
    if (!message.params || typeof message.params !== 'object') {
      return false;
    }
    
    const { subscription, result } = message.params;
    if (typeof subscription !== 'number' || !result) {
      return false;
    }
    
    return true;
  } else if (message.id !== undefined) {
    // RPC response
    return true;
  }
  
  return false;
}

/**
 * Throttled logger for validation errors
 */
export class ThrottledLogger {
  private lastLogTimes: Map<string, number> = new Map();
  private logCounts: Map<string, number> = new Map();
  
  constructor(
    private intervalMs: number = 60000, // 1 minute default
    private maxLogsPerInterval: number = 5
  ) {}
  
  log(key: string, message: string, level: 'warn' | 'error' = 'warn'): void {
    const now = Date.now();
    const lastLogTime = this.lastLogTimes.get(key) || 0;
    const logCount = this.logCounts.get(key) || 0;
    
    // Reset counter if interval has passed
    if (now - lastLogTime > this.intervalMs) {
      this.logCounts.set(key, 0);
      this.lastLogTimes.set(key, now);
    }
    
    // Only log if under the limit
    if (this.logCounts.get(key)! < this.maxLogsPerInterval) {
      if (level === 'error') {
        console.error(message);
      } else {
        console.warn(message);
      }
      
      this.logCounts.set(key, (this.logCounts.get(key) || 0) + 1);
      
      // Add suppression notice on last allowed log
      if (this.logCounts.get(key) === this.maxLogsPerInterval) {
        console.warn(`[ThrottledLogger] Suppressing further "${key}" messages for ${this.intervalMs}ms`);
      }
    }
  }
  
  getStats(): Record<string, { count: number; lastLog: Date | null }> {
    const stats: Record<string, { count: number; lastLog: Date | null }> = {};
    
    this.logCounts.forEach((count, key) => {
      stats[key] = {
        count,
        lastLog: this.lastLogTimes.has(key) 
          ? new Date(this.lastLogTimes.get(key)!) 
          : null,
      };
    });
    
    return stats;
  }
}