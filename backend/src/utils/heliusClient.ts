// heliusClient.ts

import { Helius } from 'helius-sdk';
import config from '../config';
import { limiter } from './rpcGate';

if (!config.heliusRpcUrl) {
  // The Helius SDK typically derives the API key from the RPC URL if it's in the format https://<region>.helius-rpc.com/?api-key=<your-api-key>
  // Or, it might require the API key to be passed separately depending on the SDK version and initialization method.
  // For now, we assume the heliusRpcUrl contains the API key or the SDK handles it.
  // If the SDK requires a separate apiKey parameter, we'll need to adjust config.
  console.warn('Helius RPC URL not found in config. Helius client might not work.');
  // throw new Error('Helius RPC URL is not defined in environment variables.');
}

// Initialize Helius client
// The Helius SDK constructor usually takes the API key directly or the full RPC URL containing the key.
// Based on the helius-sdk documentation, it's typically new Helius("YOUR_API_KEY_HERE", "devnet_or_mainnet-beta");
// Or if using the RPC URL directly which includes the key:
// For Helius, the RPC URL itself often contains the API key, e.g., https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
// The SDK might be smart enough to parse it, or it might need the key extracted.
// Let's assume for now the SDK can take the full RPC URL if it includes the API key.
// If your HELIUS_RPC_URL is just the base URL without the API key, you'd need a separate HELIUS_API_KEY env var.

// Let's assume config.heliusRpcUrl is the full URL with the API key embedded.
// The Helius SDK constructor takes the API key as the first argument.
// We need to extract the API key from the heliusRpcUrl.

let apiKey = '';

// First try to extract from RPC URL
if (config.heliusRpcUrl) {
  try {
    const url = new URL(config.heliusRpcUrl);
    apiKey = url.searchParams.get('api-key') || '';
  } catch (e) {
    console.error('Invalid Helius RPC URL format. Could not extract API key.', e);
  }
}

// Fallback to environment variable
if (!apiKey && process.env.HELIUS_API_KEY) {
  apiKey = process.env.HELIUS_API_KEY;
  console.log('Using HELIUS_API_KEY from environment variable');
}

// Fallback to config
if (!apiKey && config.heliusApiKey) {
  apiKey = config.heliusApiKey;
  console.log('Using API key from config');
}

if (!apiKey) {
  console.error('Helius API key not found. Please set HELIUS_RPC_URL with ?api-key= or HELIUS_API_KEY env var');
  throw new Error('Helius API key is required');
}

// Create and export singleton Helius client
const heliusClient = new Helius(apiKey);

// Create a rate-limited wrapper for Helius
export const helius = {
  rpc: {
    getAsset: async (params: { id: string }) => {
      return limiter.schedule(async () => {
        try {
          const result = await heliusClient.rpc.getAsset(params);
          return result;
        } catch (error: any) {
          if (error.response?.status === 429) {
            console.error('[Helius] Rate limit hit, waiting before retry...');
            // Wait extra time on rate limit
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          throw error;
        }
      });
    },
    // Add other methods as needed
    getAssetBatch: async (params: { ids: string[] }) => {
      return limiter.schedule(async () => {
        try {
          const result = await heliusClient.rpc.getAssetBatch(params);
          return result;
        } catch (error: any) {
          if (error.response?.status === 429) {
            console.error('[Helius] Rate limit hit, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          throw error;
        }
      });
    }
  },
  // Expose the original client if needed
  _client: heliusClient
};
