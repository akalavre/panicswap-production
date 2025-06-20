import Bottleneck from 'bottleneck';
import axios from 'axios';

// Rate limiter: 10 requests per second max for Helius
const limiter = new Bottleneck({
  reservoir: 10, // initial available tokens
  reservoirRefreshAmount: 10, // refill to 10
  reservoirRefreshInterval: 1000, // every 1 second
  maxConcurrent: 5, // max 5 parallel requests
  minTime: 100, // min 100ms between requests (10 per second max)
});

// Helper to make rate-limited RPC calls
export async function rpcCall<T = any>(
  method: string,
  params: any[] = [],
  rpcUrl?: string
): Promise<T> {
  return limiter.schedule(async () => {
    try {
      const url = rpcUrl || process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(7),
        method,
        params,
      });
      
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error(`RPC call failed for ${method}:`, error.message);
      throw error;
    }
  });
}

// Batch multiple RPC calls into a single request
export async function rpcBatch<T = any>(
  requests: Array<{ method: string; params: any[] }>,
  rpcUrl?: string
): Promise<T[]> {
  if (requests.length === 0) return [];
  
  return limiter.schedule(async () => {
    try {
      const url = rpcUrl || process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      const batchRequests = requests.map((req, index) => ({
        jsonrpc: '2.0',
        id: index,
        method: req.method,
        params: req.params,
      }));
      
      const response = await axios.post(url, batchRequests);
      
      // Sort responses by ID to match request order
      const sortedResponses = response.data.sort((a: any, b: any) => a.id - b.id);
      
      // Extract results, throwing for any errors
      return sortedResponses.map((res: any, index: number) => {
        if (res.error) {
          throw new Error(`Batch RPC Error at index ${index}: ${res.error.message}`);
        }
        return res.result;
      });
    } catch (error: any) {
      console.error('Batch RPC call failed:', error.message);
      throw error;
    }
  });
}

// Export the limiter for monitoring/stats if needed
export { limiter };