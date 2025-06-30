/**
 * TokenDataManager Smoke Tests
 * Tests the getMultipleTokensData functionality with mocked fetch responses
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock the saved API response from step 1
const mockBatchApiResponse = {
  "tokens": [
    {
      "tokenMint": "TOKEN_MINT_1",
      "walletAddress": "DEMO_WALLET",
      "symbol": "UNKNOWN",
      "name": "Unknown Token",
      "logoUrl": null,
      "balance": 0,
      "decimals": 9,
      "userBalance": 0,
      "price": 0,
      "userValue": 0,
      "liquidity": 0,
      "monitoring": {
        "active": false,
        "alerts": {
          "flashRug": false,
          "rapidDrain": false
        }
      },
      "protection": {
        "isActive": false
      },
      "risk": {
        "score": 0,
        "level": "UNKNOWN"
      }
    },
    {
      "tokenMint": "TOKEN_MINT_2", 
      "walletAddress": "DEMO_WALLET",
      "symbol": "UNKNOWN",
      "name": "Unknown Token",
      "logoUrl": null,
      "balance": 0,
      "decimals": 9,
      "userBalance": 0,
      "price": 0,
      "userValue": 0,
      "liquidity": 0,
      "monitoring": {
        "active": false,
        "alerts": {
          "flashRug": false,
          "rapidDrain": false
        }
      },
      "protection": {
        "isActive": false
      },
      "risk": {
        "score": 0,
        "level": "UNKNOWN"
      }
    }
  ]
};

// Enhanced mock response with more realistic data for comprehensive testing
const mockEnhancedApiResponse = {
  "tokens": [
    {
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "symbol": "USDC",
      "name": "USD Coin",
      "logoUrl": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
      "balance": 1000000000,
      "decimals": 6,
      "userBalance": 1000000000,
      "price": 0.9999,
      "userValue": 999.9,
      "liquidity": 50000000,
      "priceChange24h": 0.01,
      "priceChange5m": 0.001,
      "volume24h": 1000000,
      "marketCap": 32000000000,
      "holders": 500000,
      "createdAt": "2021-06-01T00:00:00Z",
      "monitoring": {
        "active": true,
        "alerts": {
          "flashRug": false,
          "rapidDrain": false
        }
      },
      "protection": {
        "isActive": true
      },
      "risk": {
        "score": 1,
        "level": "LOW"
      },
      "developerActivity": {
        "percentage": 0,
        "creatorBalance": 0
      },
      "badgeState": "verified",
      "isTestToken": false
    },
    {
      "tokenMint": "So11111111111111111111111111111111111111112",
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "symbol": "SOL",
      "name": "Wrapped SOL",
      "logoUrl": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      "balance": 2000000000,
      "decimals": 9,
      "userBalance": 2000000000,
      "price": 185.50,
      "userValue": 371.0,
      "liquidity": 25000000,
      "priceChange24h": 5.25,
      "priceChange5m": 0.15,
      "volume24h": 5000000,
      "marketCap": 85000000000,
      "holders": 1000000,
      "createdAt": "2020-04-01T00:00:00Z",
      "monitoring": {
        "active": true,
        "alerts": {
          "flashRug": false,
          "rapidDrain": false
        }
      },
      "protection": {
        "isActive": false
      },
      "risk": {
        "score": 2,
        "level": "LOW"
      },
      "developerActivity": {
        "percentage": 5,
        "creatorBalance": 2
      },
      "badgeState": "verified",
      "isTestToken": false
    }
  ]
};

describe('TokenDataManager Smoke Tests', () => {
  let TokenDataManager;

  beforeAll(() => {
    // Setup global window object
    global.window = global.window || {};
    
    // Load TokenDataManager
    require('../services/TokenDataManager.js');
    TokenDataManager = global.window.TokenDataManager;
  });

  beforeEach(() => {
    // Reset fetch mock before each test
    fetch.mockClear();
    
    // Clear any existing active requests
    if (TokenDataManager) {
      TokenDataManager.activeRequests.clear();
    }
  });

  afterEach(() => {
    // Clean up any timers or resources
    jest.clearAllTimers();
  });

  describe('getMultipleTokensData', () => {
    it('should fetch and return token data with correct field names and types (basic response)', async () => {
      // Mock successful API responses for individual calls (≤3 tokens use individual calls)
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[0]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[1]
        });

      const tokenMints = ['TOKEN_MINT_1', 'TOKEN_MINT_2'];
      const walletAddress = 'DEMO_WALLET';

      const result = await TokenDataManager.getMultipleTokensData(tokenMints, walletAddress);

      // Verify individual API calls were made (≤3 tokens use individual fetches)
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        'api/v2/tokens/TOKEN_MINT_1?wallet=DEMO_WALLET',
        expect.objectContaining({ method: 'GET' })
      );
      expect(fetch).toHaveBeenCalledWith(
        'api/v2/tokens/TOKEN_MINT_2?wallet=DEMO_WALLET',
        expect.objectContaining({ method: 'GET' })
      );

      // Verify result is an array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Verify each token has expected field names and types
      result.forEach((token, index) => {
        // Core identifiers
        expect(token).toHaveProperty('token_mint');
        expect(typeof token.token_mint).toBe('string');
        expect(token).toHaveProperty('wallet_address');
        expect(typeof token.wallet_address).toBe('string');

        // Token metadata
        expect(token).toHaveProperty('symbol');
        expect(typeof token.symbol).toBe('string');
        expect(token).toHaveProperty('name');
        expect(typeof token.name).toBe('string');

        // Image/logo fields (can be null)
        expect(token).toHaveProperty('image');
        expect(token).toHaveProperty('logo_uri');
        expect(token).toHaveProperty('logo_url');

        // Price data
        expect(token).toHaveProperty('price');
        expect(typeof token.price).toBe('number');
        expect(token).toHaveProperty('price_change_24h');
        expect(typeof token.price_change_24h).toBe('number');
        expect(token).toHaveProperty('price_change_5m');
        expect(typeof token.price_change_5m).toBe('number');
        expect(token).toHaveProperty('price_change_1m');
        expect(typeof token.price_change_1m).toBe('number');

        // Balance and value
        expect(token).toHaveProperty('balance');
        expect(typeof token.balance).toBe('number');
        expect(token).toHaveProperty('balance_ui');
        expect(typeof token.balance_ui).toBe('number');
        expect(token).toHaveProperty('decimals');
        expect(typeof token.decimals).toBe('number');
        expect(token).toHaveProperty('value');
        expect(typeof token.value).toBe('number');
        expect(token).toHaveProperty('userValue');
        expect(typeof token.userValue).toBe('number');

        // Market data
        expect(token).toHaveProperty('liquidity');
        expect(typeof token.liquidity).toBe('number');
        expect(token).toHaveProperty('liquidity_usd');
        expect(typeof token.liquidity_usd).toBe('number');
        expect(token).toHaveProperty('volume_24h');
        expect(typeof token.volume_24h).toBe('number');
        expect(token).toHaveProperty('market_cap');
        expect(typeof token.market_cap).toBe('number');
        expect(token).toHaveProperty('holder_count');
        expect(typeof token.holder_count).toBe('number');

        // Monitoring and protection (flattened from nested structure)
        expect(token).toHaveProperty('monitoring_active');
        expect(typeof token.monitoring_active).toBe('boolean');
        expect(token).toHaveProperty('protected');
        expect(typeof token.protected).toBe('boolean');

        // Risk data (flattened from nested structure)
        expect(token).toHaveProperty('risk_score');
        expect(typeof token.risk_score).toBe('number');
        expect(token).toHaveProperty('risk_level');
        expect(typeof token.risk_level).toBe('string');

        // Developer activity
        expect(token).toHaveProperty('dev_activity_pct');
        expect(typeof token.dev_activity_pct).toBe('number');
        expect(token).toHaveProperty('creator_balance_pct');
        expect(typeof token.creator_balance_pct).toBe('number');

        // Age and timestamps
        expect(token).toHaveProperty('age');
        expect(token).toHaveProperty('created_at');
        expect(token).toHaveProperty('last_update');
        expect(typeof token.last_update).toBe('string');

        // Status and flags
        expect(token).toHaveProperty('badge_state');
        expect(token).toHaveProperty('sell_signal');
        expect(token).toHaveProperty('status');
        expect(typeof token.status).toBe('string');
        expect(token).toHaveProperty('is_test_token');
        expect(typeof token.is_test_token).toBe('boolean');
        expect(token).toHaveProperty('is_newly_added');
        expect(typeof token.is_newly_added).toBe('boolean');
        expect(token).toHaveProperty('added_at');
      });
    });

    it('should fetch and return token data with correct field names and types (enhanced response)', async () => {
      // Mock successful API responses for individual calls (≤3 tokens use individual calls)
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnhancedApiResponse.tokens[0]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnhancedApiResponse.tokens[1]
        });

      const tokenMints = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'So11111111111111111111111111111111111111112'];
      const walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

      const result = await TokenDataManager.getMultipleTokensData(tokenMints, walletAddress);

      // Verify result structure
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Test specific values for enhanced data
      const usdcToken = result.find(t => t.symbol === 'USDC');
      const solToken = result.find(t => t.symbol === 'SOL');

      expect(usdcToken).toBeDefined();
      expect(solToken).toBeDefined();

      // Verify calculated fields work correctly
      expect(usdcToken.balance_ui).toBeCloseTo(1000); // 1000000000 / 10^6
      expect(usdcToken.value).toBeCloseTo(999.9); // 1000 * 0.9999
      expect(solToken.balance_ui).toBeCloseTo(2); // 2000000000 / 10^9
      expect(solToken.value).toBeCloseTo(371.0); // 2 * 185.50

      // Verify age calculation exists and has correct structure when created_at is provided
      if (usdcToken.age) {
        expect(usdcToken.age).toHaveProperty('value');
        expect(usdcToken.age).toHaveProperty('unit');
        expect(usdcToken.age).toHaveProperty('raw_days');
        expect(typeof usdcToken.age.value).toBe('number');
        expect(typeof usdcToken.age.unit).toBe('string');
        expect(typeof usdcToken.age.raw_days).toBe('number');
      }

      // Verify nested field flattening works correctly
      expect(usdcToken.monitoring_active).toBe(true); // from monitoring.active
      expect(usdcToken.protected).toBe(true); // from protection.isActive
      expect(usdcToken.risk_score).toBe(1); // from risk.score
      expect(usdcToken.risk_level).toBe('LOW'); // from risk.level
      expect(usdcToken.dev_activity_pct).toBe(0); // from developerActivity.percentage
      expect(usdcToken.creator_balance_pct).toBe(0); // from developerActivity.creatorBalance
    });

    it('should handle empty token array', async () => {
      const result = await TokenDataManager.getMultipleTokensData([], 'DEMO_WALLET');
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle missing wallet address', async () => {
      const result = await TokenDataManager.getMultipleTokensData(['TOKEN_MINT_1'], null);
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API error gracefully', async () => {
      // Mock API error
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await TokenDataManager.getMultipleTokensData(['TOKEN_MINT_1'], 'DEMO_WALLET');
      expect(result).toEqual([]);
    });

    it('should handle network error gracefully', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await TokenDataManager.getMultipleTokensData(['TOKEN_MINT_1'], 'DEMO_WALLET');
      expect(result).toEqual([]);
    });

    it('should filter out null tokens from response', async () => {
      // Mock individual responses with one null/invalid response
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[0]
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[1]
        });

      const result = await TokenDataManager.getMultipleTokensData(['TOKEN_MINT_1', 'INVALID', 'TOKEN_MINT_2'], 'DEMO_WALLET');
      
      // Should filter out the failed/null token
      expect(result).toHaveLength(2);
      expect(result.every(token => token !== null)).toBe(true);
    });

    it('should use individual fetches for small batches (≤3 tokens)', async () => {
      // Mock individual token responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[0]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchApiResponse.tokens[1]
        });

      const tokenMints = ['TOKEN_MINT_1', 'TOKEN_MINT_2'];
      const walletAddress = 'DEMO_WALLET';

      const result = await TokenDataManager.getMultipleTokensData(tokenMints, walletAddress);

      // Should make individual API calls, not batch
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        'api/v2/tokens/TOKEN_MINT_1?wallet=DEMO_WALLET',
        expect.objectContaining({ method: 'GET' })
      );
      expect(fetch).toHaveBeenCalledWith(
        'api/v2/tokens/TOKEN_MINT_2?wallet=DEMO_WALLET', 
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toHaveLength(2);
    });

    it('should use batch endpoint for larger batches (>3 tokens)', async () => {
      // Mock batch response
      const largeBatchResponse = {
        tokens: [
          ...mockBatchApiResponse.tokens,
          { ...mockBatchApiResponse.tokens[0], tokenMint: 'TOKEN_MINT_3' },
          { ...mockBatchApiResponse.tokens[0], tokenMint: 'TOKEN_MINT_4' }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeBatchResponse
      });

      const tokenMints = ['TOKEN_MINT_1', 'TOKEN_MINT_2', 'TOKEN_MINT_3', 'TOKEN_MINT_4'];
      const walletAddress = 'DEMO_WALLET';

      const result = await TokenDataManager.getMultipleTokensData(tokenMints, walletAddress);

      // Should make batch API call
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'api/v2/batch-simple.php',
        expect.objectContaining({ 
          method: 'POST',
          body: JSON.stringify({
            tokens: tokenMints,
            wallet: walletAddress
          })
        })
      );

      expect(result).toHaveLength(4);
    });
  });

  describe('Field Mapping Validation', () => {
    it('should correctly map all API response fields to expected frontend format', async () => {
      // Mock single token API response with various field name formats
      const apiTokenWithVariousFields = {
        // Test various field name formats that should be normalized
        mint: 'TEST_MINT',
        walletAddress: 'TEST_WALLET',
        symbol: 'TEST',
        name: 'Test Token',
        logo_uri: 'https://example.com/logo.png',
        price_usd: 1.50,
        priceChange24h: 5.0,
        priceChange5m: 0.5,
        priceChange1m: 0.1,
        balance: 1000000000,
        userBalance: 1000000000,
        decimals: 9,
        liquidity_usd: 500000,
        volume24h: 100000,
        marketCap: 1000000,
        holders: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        monitoring: { active: true },
        protection: { isActive: false },
        risk: { score: 3, level: 'MEDIUM' },
        developerActivity: { percentage: 10, creatorBalance: 5 },
        badgeState: 'warning',
        isTestToken: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiTokenWithVariousFields
      });

      const result = await TokenDataManager.getMultipleTokensData(['TEST_MINT'], 'TEST_WALLET');
      
      expect(result).toHaveLength(1);
      const token = result[0];

      // Verify field mapping worked correctly
      expect(token.token_mint).toBe('TEST_MINT'); // from mint
      expect(token.wallet_address).toBe('TEST_WALLET'); // from walletAddress
      expect(token.price).toBe(1.50); // from price_usd
      expect(token.price_change_24h).toBe(5.0); // from priceChange24h
      expect(token.price_change_5m).toBe(0.5); // from priceChange5m
      expect(token.price_change_1m).toBe(0.1); // from priceChange1m
      expect(token.logo_uri).toBe('https://example.com/logo.png'); // from logo_uri
      expect(token.liquidity_usd).toBe(500000); // from liquidity_usd
      expect(token.volume_24h).toBe(100000); // from volume24h
      expect(token.market_cap).toBe(1000000); // from marketCap
      expect(token.holder_count).toBe(1000); // from holders
      expect(token.monitoring_active).toBe(true); // from monitoring.active
      expect(token.protected).toBe(false); // from protection.isActive
      expect(token.risk_score).toBe(3); // from risk.score
      expect(token.risk_level).toBe('MEDIUM'); // from risk.level
      expect(token.dev_activity_pct).toBe(10); // from developerActivity.percentage
      expect(token.creator_balance_pct).toBe(5); // from developerActivity.creatorBalance
      expect(token.badge_state).toBe('warning'); // from badgeState
      expect(token.is_test_token).toBe(true); // from isTestToken
    });
  });
});
