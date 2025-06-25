/**
 * Jest Test Setup
 * Configure test environment and global mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.HELIUS_RPC_URL = 'https://test-rpc.example.com';
process.env.HELIUS_API_KEY = 'test-api-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.MEMPOOL_ENABLED = 'true';
process.env.JITO_ENABLED = 'false';

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock timers for performance testing
jest.useFakeTimers();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Restore real timers after all tests
afterAll(() => {
  jest.useRealTimers();
});