/**
 * Centralized Jupiter API Configuration
 * Manages all Jupiter endpoints and settings in one place
 */

export interface JupiterConfig {
  liteApiUrl: string;
  priceApiUrl: string;
  quoteApiUrl: string;
  defaultTimeout: number;
  defaultMaxRetries: number;
}

// Load configuration from environment with defaults
export const JUPITER_CONFIG: JupiterConfig = {
  liteApiUrl: process.env.JUPITER_LITE_URL || 'https://lite-api.jup.ag',
  priceApiUrl: process.env.JUPITER_LITE_URL || 'https://lite-api.jup.ag',
  quoteApiUrl: process.env.JUPITER_LITE_URL || 'https://lite-api.jup.ag',
  defaultTimeout: parseInt(process.env.JUPITER_API_TIMEOUT || '10000'),
  defaultMaxRetries: parseInt(process.env.JUPITER_MAX_RETRIES || '3')
};

/**
 * Get Jupiter price endpoint
 */
export function getJupiterPriceUrl(tokenMints: string | string[]): string {
  const mints = Array.isArray(tokenMints) ? tokenMints.join(',') : tokenMints;
  return `${JUPITER_CONFIG.priceApiUrl}/price/v2?ids=${mints}`;
}

/**
 * Get Jupiter quote endpoint
 */
export function getJupiterQuoteUrl(params: {
  inputMint: string;
  outputMint: string;
  amount: string | number;
  slippageBps?: number;
}): string {
  const baseUrl = `${JUPITER_CONFIG.quoteApiUrl}/swap/v1/quote`;
  const queryParams = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount.toString(),
    ...(params.slippageBps && { slippageBps: params.slippageBps.toString() })
  });
  
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Get default fetch options for Jupiter API calls
 */
export function getJupiterFetchOptions(overrides?: {
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}): any {
  return {
    timeout: overrides?.timeout || JUPITER_CONFIG.defaultTimeout,
    maxRetries: overrides?.maxRetries || JUPITER_CONFIG.defaultMaxRetries,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PanicSwap/1.0',
      ...overrides?.headers
    },
    ...overrides
  };
}

/**
 * Common Jupiter API response types
 */
export interface JupiterPriceResponse {
  data: {
    [mint: string]: {
      price: number;
      id: string;
      mintSymbol?: string;
      vsToken?: string;
      vsTokenSymbol?: string;
      confidence?: number;
      extraInfo?: {
        lastSwappedPrice?: {
          at: number;
          price: number;
        };
        quotedPrice?: {
          buyPrice: number;
          sellPrice: number;
        };
      };
    };
  };
  timeTaken: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label?: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

/**
 * Jupiter health check configuration
 */
export const JUPITER_HEALTH_CHECK = {
  enabled: process.env.JUPITER_HEALTH_CHECK_ENABLED !== 'false',
  interval: parseInt(process.env.JUPITER_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
  testMint: 'So11111111111111111111111111111111111111112' // SOL
};

/**
 * Jupiter API health status tracking
 */
let jupiterHealthStatus = {
  isHealthy: true,
  lastCheck: Date.now(),
  lastError: null as string | null,
  successCount: 0,
  errorCount: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[]
};

/**
 * Perform Jupiter health check
 */
export async function checkJupiterHealth(): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const priceUrl = getJupiterPriceUrl(JUPITER_HEALTH_CHECK.testMint);
    const response = await fetch(priceUrl, {
      ...getJupiterFetchOptions({ timeout: 5000 }),
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Update health status
    jupiterHealthStatus.isHealthy = true;
    jupiterHealthStatus.lastCheck = Date.now();
    jupiterHealthStatus.lastError = null;
    jupiterHealthStatus.successCount++;
    
    // Track response times (keep last 10)
    jupiterHealthStatus.responseTimes.push(responseTime);
    if (jupiterHealthStatus.responseTimes.length > 10) {
      jupiterHealthStatus.responseTimes.shift();
    }
    
    // Calculate average response time
    jupiterHealthStatus.avgResponseTime = 
      jupiterHealthStatus.responseTimes.reduce((a, b) => a + b, 0) / 
      jupiterHealthStatus.responseTimes.length;
    
    return true;
  } catch (error: any) {
    // Update health status
    jupiterHealthStatus.isHealthy = false;
    jupiterHealthStatus.lastCheck = Date.now();
    jupiterHealthStatus.lastError = error.message;
    jupiterHealthStatus.errorCount++;
    
    console.error('[Jupiter Health] Check failed:', error.message);
    return false;
  }
}

/**
 * Get Jupiter health status
 */
export function getJupiterHealthStatus() {
  return {
    ...jupiterHealthStatus,
    uptime: jupiterHealthStatus.successCount / 
      (jupiterHealthStatus.successCount + jupiterHealthStatus.errorCount) || 0
  };
}

// Start periodic health checks if enabled
if (JUPITER_HEALTH_CHECK.enabled) {
  setInterval(() => {
    checkJupiterHealth().catch(console.error);
  }, JUPITER_HEALTH_CHECK.interval);
  
  // Initial check
  checkJupiterHealth().catch(console.error);
}