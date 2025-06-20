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
      creatorBalance: 30,     // Weight for creator holding percentage
      holderCount: 25,        // Weight for number of holders
      lpLocked: 20,           // Weight for LP locked percentage
      topHolders: 15,         // Weight for top holder concentration
      mintAuthority: 5,       // Weight for mint authority status
      freezeAuthority: 5,     // Weight for freeze authority status
    },
    
    // Minimum risk scores for known exploits
    minimumScores: {
      activeMintAuthority: 60,    // If mint authority is not null/burned
      activeFreezeAuthority: 60,  // If freeze authority is not null/burned
      creatorMajority: 80,        // If creator holds >50%
      noLiquidity: 90,            // If no liquidity pools exist
    },

    // Thresholds for risk levels
    thresholds: {
      danger: 80,
      high: 60,
      medium: 40,
      low: 20,
      safe: 0,
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
 * Get risk level from score
 */
export function getRiskLevel(score: number): string {
  const { thresholds } = rugcheckConfig.riskScoring;
  
  if (score >= thresholds.danger) return 'danger';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  if (score >= thresholds.low) return 'low';
  return 'safe';
}