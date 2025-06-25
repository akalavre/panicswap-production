import axios from 'axios';
import { object, string, number, array, any, Struct } from 'superstruct';
import { limiter } from './rpcGate';

// RPC parameter schemas for validation and type conversion
const rpcSchemas: Record<string, any> = {
  getTokenAccounts: object({
    mint: string(),
    programId: string(),
    page: number(), // Must be number for Helius API
    limit: number(), // Must be number for Helius API
  }),
  getTokenLargestAccounts: 'skip', // Skip validation
  getTransaction: 'skip', // Skip validation
  getAccountInfo: 'skip', // Skip validation
  getMultipleAccounts: 'skip', // Skip validation
};

/**
 * Convert parameters to match RPC expectations
 */
function convertParams(method: string, params: any[]): any[] {
  // Special handling for getTokenAccounts - keep numbers as is
  if (method === 'getTokenAccounts' && params[0]) {
    // Return params as-is for getTokenAccounts since Helius expects integers
    return params;
  }
  
  // Handle other methods that might need conversion
  return params.map((param) => {
    // Convert BigInt to string
    if (typeof param === 'bigint') {
      return param.toString();
    }
    
    // Recursively handle objects
    if (param && typeof param === 'object' && !Array.isArray(param)) {
      const converted: any = {};
      for (const [key, value] of Object.entries(param)) {
        if (typeof value === 'bigint') {
          converted[key] = value.toString();
        } else {
          converted[key] = value;
        }
      }
      return converted;
    }
    
    return param;
  });
}

/**
 * Validate parameters against schema if available
 */
function validateParams(method: string, params: any[]): void {
  const schema = rpcSchemas[method];
  if (!schema || schema === 'skip') {
    return; // No schema defined or skip validation
  }
  
  try {
    // For methods that take a single object parameter
    if (method === 'getTokenAccounts' && params[0]) {
      const { assert } = schema as any;
      if (assert) {
        assert(params[0]);
      }
    }
  } catch (error: any) {
    throw new Error(`Invalid RPC parameters for ${method}: ${error.message}`);
  }
}

/**
 * Type-safe RPC call wrapper
 */
export async function sendRpc<T = any>(
  method: string,
  params: any[] = [],
  rpcUrl?: string
): Promise<T> {
  // Convert parameters to match RPC expectations
  const convertedParams = convertParams(method, params);
  
  // Validate if schema exists
  try {
    validateParams(method, convertedParams);
  } catch (error: any) {
    console.error(`[RPC] Parameter validation failed for ${method}:`, error.message);
    throw error;
  }
  
  // Use rate limiter
  return limiter.schedule(async () => {
    try {
      const url = rpcUrl || process.env.HELIUS_RPC_URL || 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      
      const requestBody = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(7),
        method,
        params: convertedParams,
      };
      
      console.log(`[RPC] Calling ${method} with params:`, JSON.stringify(convertedParams));
      
      const response = await axios.post(url, requestBody, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data.error) {
        const error = response.data.error;
        console.error(`[RPC] Error response for ${method}:`, error);
        throw new Error(`RPC Error: ${error.message} (code: ${error.code})`);
      }
      
      return response.data.result;
    } catch (error: any) {
      // Handle specific errors
      if (error.response?.status === 429) {
        console.error(`[RPC] Rate limited on ${method}`);
        throw new Error('Rate limited - please retry');
      }
      
      console.error(`[RPC] Call failed for ${method}:`, error.message);
      throw error;
    }
  });
}

/**
 * Batch RPC calls with type conversion
 */
export async function sendBatchRpc<T = any>(
  requests: Array<{ method: string; params: any[] }>,
  rpcUrl?: string
): Promise<T[]> {
  if (requests.length === 0) return [];
  
  // Convert all parameters
  const convertedRequests = requests.map((req) => ({
    ...req,
    params: convertParams(req.method, req.params),
  }));
  
  // Validate all requests
  for (const req of convertedRequests) {
    try {
      validateParams(req.method, req.params);
    } catch (error: any) {
      console.error(`[RPC] Batch validation failed for ${req.method}:`, error.message);
      throw error;
    }
  }
  
  return limiter.schedule(async () => {
    try {
      const url = rpcUrl || process.env.HELIUS_RPC_URL || 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      
      const batchRequests = convertedRequests.map((req, index) => ({
        jsonrpc: '2.0',
        id: index,
        method: req.method,
        params: req.params,
      }));
      
      const response = await axios.post(url, batchRequests, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Sort responses by ID to match request order
      const sortedResponses = response.data.sort((a: any, b: any) => a.id - b.id);
      
      // Extract results, throwing for any errors
      return sortedResponses.map((res: any, index: number) => {
        if (res.error) {
          const error = res.error;
          console.error(`[RPC] Batch error at index ${index} for ${convertedRequests[index].method}:`, error);
          throw new Error(`Batch RPC Error at index ${index}: ${error.message} (code: ${error.code})`);
        }
        return res.result;
      });
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('[RPC] Batch request rate limited');
        throw new Error('Rate limited - please retry');
      }
      
      console.error('[RPC] Batch call failed:', error.message);
      throw error;
    }
  });
}