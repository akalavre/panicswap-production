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
  // Add other environment variables as needed
};

export default config;
