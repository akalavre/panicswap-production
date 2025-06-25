// config/index.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the root of the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  heliusRpcUrl: process.env.HELIUS_RPC_URL || '',
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  solanaStreamingApiKey: process.env.SOLANA_STREAMING_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY, // Ensure this is the SERVICE_ROLE_KEY
  
  // Pool monitoring configuration
  maxRpcConcurrent: parseInt(process.env.MAX_RPC_CONCURRENT || '4', 10),
  rpcRetryDelay: parseInt(process.env.RPC_RETRY_DELAY || '250', 10),
  enableGlobalProgramMonitoring: process.env.ENABLE_GLOBAL_PROGRAM_MONITORING === 'true',
  analyzedSignatureExpiry: parseInt(process.env.ANALYZED_SIGNATURE_EXPIRY_MS || '900000', 10), // 15 minutes
  analyzedSignatureMaxSize: parseInt(process.env.ANALYZED_SIGNATURE_MAX_SIZE || '1000', 10),
  
  // Enhanced Monitoring for Memecoin Trading
  velocityPollInterval: parseInt(process.env.VELOCITY_POLL_INTERVAL || '3000'), // 3s for memecoins
  socialMonitoringInterval: parseInt(process.env.SOCIAL_MONITORING_INTERVAL || '10000'), // 10s for memecoins
  patternCheckInterval: parseInt(process.env.PATTERN_CHECK_INTERVAL || '5000'), // 5s for memecoins
  monitoringStatsInterval: parseInt(process.env.MONITORING_STATS_INTERVAL || '5000'), // 5s for memecoins
  
  // Memecoin-specific intervals
  priceCheckInterval: parseInt(process.env.PRICE_CHECK_INTERVAL || '2000'), // 2s price checks
  liquidityCheckInterval: parseInt(process.env.LIQUIDITY_CHECK_INTERVAL || '5000'), // 5s liquidity checks
  riskPatternInterval: parseInt(process.env.RISK_PATTERN_INTERVAL || '10000'), // 10s risk analysis
  
  // Adaptive intervals based on risk level
  highRiskPollInterval: parseInt(process.env.HIGH_RISK_POLL_INTERVAL || '1000'), // 1s for high-risk tokens
  mediumRiskPollInterval: parseInt(process.env.MEDIUM_RISK_POLL_INTERVAL || '3000'), // 3s for medium-risk
  lowRiskPollInterval: parseInt(process.env.LOW_RISK_POLL_INTERVAL || '10000'), // 10s for low-risk
  
  // Mempool monitoring
  mempoolEnabled: process.env.MEMPOOL_ENABLED !== 'false', // Enable by default for memecoin trading
};

export default config;
