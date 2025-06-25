import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.CI = 'true';

// Global test timeout for E2E tests
jest.setTimeout(60000);

// Custom matchers for balance and UI state assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
      toHaveValidTokenData(): R;
      toShowProtectionStatus(status: 'protected' | 'unprotected'): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
  
  toHaveValidTokenData(received: any) {
    const hasRequiredFields = received?.symbol && received?.mint && received?.price !== undefined;
    return {
      message: () =>
        hasRequiredFields
          ? `expected token data to be invalid`
          : `expected token data to have symbol, mint, and price fields`,
      pass: hasRequiredFields,
    };
  },
  
  toShowProtectionStatus(received: any, expectedStatus: 'protected' | 'unprotected') {
    const hasStatus = received?.protectionEnabled === (expectedStatus === 'protected');
    return {
      message: () =>
        hasStatus
          ? `expected protection status not to be ${expectedStatus}`
          : `expected protection status to be ${expectedStatus}`,
      pass: hasStatus,
    };
  },
});

// Mock console for cleaner test output
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error, // Keep errors visible
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
