/**
 * Configuration for RugCheck risk scoring and polling
 */

export const rugcheckConfig = {
  // Polling configuration
  polling: {
    batchSize: parseInt(process.env.RUGCHECK_BATCH_SIZE || '20'),
    batchDelayMs: parseInt(process.env.RUGCHECK_BATCH_DELAY || '30000'), // 30 seconds
    pollIntervalMs: parseInt(process.env.RUGCHECK_POLL_INTERVAL || '1000'),
    maxConcurrentRequests: parseInt(process.env.RUGCHECK_MAX_CONCURRENT || '5'),
  },

  // Cache configuration
  cache: {
    holderCountTTL: 30, // seconds - pump.fun already rounds to nearest second
    creatorBalanceTTL: 60, // seconds
    lpLockedTTL: 120, // seconds
    bundlerCountTTL: 60, // seconds
  },

  // Risk scoring weights
  riskScoring: {
    weights: {
      creatorBalance: 25,         // Weight for creator holding percentage
      holderCount: 15,            // Weight for number of holders
      liquidityUSD: 30,           // Weight for actual USD liquidity (NEW)
      lpLocked: 10,               // Weight for LP locked percentage (reduced)
      topHolders: 10,             // Weight for top holder concentration
      mintAuthority: 5,           // Weight for mint authority status
      freezeAuthority: 5,         // Weight for freeze authority status
      // Velocity weights (NEW)
      liquidityVelocity: 20,      // Weight for liquidity change rate
      priceVelocity: 15,          // Weight for price change rate
      holderVelocity: 10,         // Weight for holder distribution changes
    },
    
    // Minimum risk scores for known exploits
    minimumScores: {
      activeMintAuthority: 70,    // If mint authority is not null/burned
      activeFreezeAuthority: 70,  // If freeze authority is not null/burned
      creatorMajority: 85,        // If creator holds >50%
      noLiquidity: 95,            // If no liquidity pools exist
      lowLiquidity: 80,           // If liquidity < $500 (NEW)
      zeroHolders: 90,            // If holder count is 0 (NEW)
      rapidLiquidityDrop: 90,     // If liquidity drops >30% in 5min (NEW)
      highVelocity: 75,           // If any velocity metric is critical (NEW)
    },

    // Thresholds for risk levels (more strict)
    thresholds: {
      danger: 75,     // Lowered from 80
      high: 50,       // Lowered from 60
      medium: 30,     // Lowered from 40
      low: 15,        // Lowered from 20
      safe: 0,
    },

    // Critical value thresholds (NEW)
    criticalThresholds: {
      minLiquidityUSD: 500,       // Minimum $500 liquidity
      minHolders: 10,             // Minimum 10 holders
      maxCreatorPercent: 40,      // Max 40% creator holding
      velocityWindow: 300000,     // 5 minute window for velocity
      criticalVelocityPercent: 30, // 30% change in velocity window
    },
  },

  // Known bundler program IDs
  bundlers: {
    programIds: [
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jito
      'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', // Helium
      'TRiToN1111111111111111111111111111111111111',  // Triton (example)
      'GeyserReplayerByDRAFQLbCg6MWc7gwJa8eCZf4SgF',  // Geyser
      // Add more as discovered
    ],
    
    // Known bundler transaction patterns
    patterns: [
      'metaTx',
      'bundle',
      'jitoBundle',
      'flashLoan',
    ],
  },

  // API endpoints
  endpoints: {
    heliusRpc: process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    pumpFunApi: 'https://api.pump.fun/api/v1',
  },

  // Burn addresses to check against
  burnAddresses: [
    '11111111111111111111111111111111', // System program
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
    'BurnAcct1111111111111111111111111111111111', // Common burn address
  ],
};

/**
 * Helper to check if an authority is effectively burned
 */
export function isAuthorityBurned(authority: string | null): boolean {
  if (!authority) return true;
  return rugcheckConfig.burnAddresses.includes(authority);
}

/**
 * Get risk level from score with dynamic adjustments
 */
export function getRiskLevel(score: number, metadata?: {
  liquidityUSD?: number;
  holderCount?: number;
  tokenAge?: number; // in milliseconds
}): string {
  const { thresholds, criticalThresholds } = rugcheckConfig.riskScoring;
  
  // Apply critical overrides first
  if (metadata) {
    // Zero or very low liquidity = automatic danger
    if (metadata.liquidityUSD !== undefined && metadata.liquidityUSD < criticalThresholds.minLiquidityUSD) {
      return metadata.liquidityUSD === 0 ? 'critical' : 'danger';
    }
    
    // Zero or very few holders = automatic high/danger
    if (metadata.holderCount !== undefined && metadata.holderCount < criticalThresholds.minHolders) {
      return metadata.holderCount === 0 ? 'danger' : 'high';
    }
    
    // Very new tokens (< 1 hour) get stricter thresholds
    if (metadata.tokenAge !== undefined && metadata.tokenAge < 3600000) {
      // Add 10 points to score for very new tokens
      score = Math.min(100, score + 10);
    }
  }
  
  // Return risk level based on adjusted score
  if (score >= thresholds.danger) return 'critical';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  if (score >= thresholds.low) return 'low';
  return 'safe';
}