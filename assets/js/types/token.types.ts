/**
 * Token Data Types for PanicSwap
 */

export interface TokenData {
  tokenMint: string;
  walletAddress: string;
  lastUpdate: string;
  
  // Token Identity
  symbol: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  createdAt: string | null;
  
  // User Holdings
  balance: number;
  decimals: number;
  userBalance: number;
  userValue: number;
  
  // Market Data
  price: number;
  priceChange24h: number;
  liquidity: number;
  volume24h: number;
  marketCap: number;
  
  // Monitoring Data
  monitoring: {
    active: boolean;
    priceChange1m: number;
    priceChange5m: number;
    liquidityChange1m: number;
    liquidityChange5m: number;
    alerts: {
      flashRug: boolean;
      rapidDrain: boolean;
    };
  };
  
  // Protection Status
  protection: {
    isActive: boolean;
    monitoringActive: boolean;
    alertsCount: number;
    lastThreatDetected: string | null;
  };
  
  // Risk Assessment
  risk: {
    score: number;
    level: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    factors: string[];
  };
  
  // ML Analysis
  mlAnalysis: {
    rugProbability: number;
    confidence: number;
  } | null;
  
  // UI State
  badgeState: BadgeState | null;
  isTestToken?: boolean;
  isNewlyAdded?: boolean;
  addedAt?: string | null;
}

export type BadgeState = 
  | 'RUGGED'
  | 'SELL_NOW'
  | 'SELL'
  | 'PUMPING'
  | 'VOLATILE'
  | 'NEW'
  | 'WATCHING'
  | null;

export interface BatchTokenRequest {
  tokens: string[];
  wallet: string;
}

export interface BatchTokenResponse {
  tokens: TokenData[];
}

export interface TokenError {
  error: string;
  message?: string;
}

// Legacy format compatibility (to be removed after migration)
export interface LegacyTokenData {
  token_mint: string;
  wallet_address: string;
  symbol: string;
  name: string;
  image: string;
  balance: number;
  balance_ui: number;
  decimals: number;
  price: number;
  value: number;
  price_change_24h: number;
  liquidity_usd: number;
  volume_24h: number;
  market_cap: number;
  risk_score: number;
  risk_level: string;
  protected: boolean;
  monitoring_active: boolean;
  // ... many more fields
}