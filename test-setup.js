// Test setup for Jest
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock browser globals
global.window = global.window || {};
global.document = global.document || {};

// Mock notification system
global.showNotification = jest.fn();

// Mock protection toggle functions
global.handleProtectionClick = jest.fn();
global.toggleInProgress = new Map();

// Setup DOM mocks
if (typeof document !== 'undefined') {
  document.createElement = jest.fn(() => ({
    dataset: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
    }
  }));
}
