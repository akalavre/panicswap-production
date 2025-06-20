// types/index.ts

export interface BackendTokenData {
  mint: string;
  symbol: string;
  name?: string;
  decimals: number;
  price?: number;
  priceChange24h?: number;
  liquidity?: number;
  marketCap?: number;
  logoURI?: string;
  platform?: 'pump.fun' | 'raydium' | 'other_dex' | 'unknown';
  isMemecoin?: boolean;
  riskData?: {
    riskScore: number;
    riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    factors?: object;
    lastChecked: number; // timestamp
  };
  graduation?: { // Specific to pump.fun tokens
    targetSOL?: number;
    currentSOL?: number;
    graduated?: boolean;
  };
  // Note: Frontend merges wallet balance and protection status locally
}
