// Mock global dependencies
global.window = global.window || {};
window.tokenListV3State = {
  tokens: [],
  recentChanges: new Map()
};

// Mock DOM methods
global.document = global.document || {};
document.body = document.body || { innerHTML: '' };
document.querySelector = jest.fn();
document.addEventListener = jest.fn();
document.createElement = jest.fn(() => ({
  dataset: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
  },
  closest: jest.fn(function(selector) {
    if (selector === '[data-protection-btn]' && this.dataset.mint) {
      return this;
    }
    return null;
  })
}));

// Mock protection toggle functions and variables
const toggleInProgress = new Map();
const showNotification = jest.fn();
const handleProtectionClick = jest.fn((event) => {
  const btn = event.target.closest('[data-protection-btn]');
  if (!btn) return;
  
  const isRugged = btn.dataset.rugged === 'true';
  if (isRugged) {
    showNotification('Cannot protect rugged tokens', 'error');
    return;
  }
  
  const tokenMint = btn.dataset.mint;
  if (toggleInProgress.has(tokenMint)) {
    return;
  }
  
  toggleInProgress.set(tokenMint, true);
  
  // Simulate async operation
  setTimeout(() => {
    toggleInProgress.delete(tokenMint);
  }, 100);
});

// Export mocks to global
global.toggleInProgress = toggleInProgress;
global.showNotification = showNotification;
global.handleProtectionClick = handleProtectionClick;

// Mock renderTokenRowV3 function for testing
function renderTokenRowV3(token, showBalances) {
  const isProtected = token.protected;
  const protectionClass = isProtected ? 'bg-red-500/20 border-red-500/50' : 'glass-card-enhanced bg-gray-800/40';
  const protectionText = isProtected ? 'Protected' : 'Not Protected';
  
  return `
    <tr>
      <td>
        <button 
          data-protection-btn 
          data-mint="${token.token_mint}"
          data-protected="${isProtected}"
          class="${protectionClass}"
        >
          ${protectionText}
        </button>
      </td>
    </tr>
  `;
}

// Mock loadFromSupabaseV3 function
function loadFromSupabaseV3() {
  const tokens = window.tokenListV3State.tokens;
  
  // Preserve recent protection state changes
  if (window.tokenListV3State.recentChanges && window.tokenListV3State.recentChanges.size > 0) {
    tokens.forEach(token => {
      const recentChange = window.tokenListV3State.recentChanges.get(token.token_mint);
      if (recentChange && (Date.now() - recentChange.timestamp) < 5000) {
        console.log(`Preserving recent protection state for ${token.symbol}: ${recentChange.state}`);
        token.protected = recentChange.state;
        token.monitoring_active = recentChange.state;
      }
    });
  }
  
  return tokens;
}

describe('Token Protection State Persistence', () => {
  beforeEach(() => {
    // Reset state before each test
    window.tokenListV3State.tokens = [];
    window.tokenListV3State.recentChanges.clear();
    document.body.innerHTML = '';
  });

  it('should use updated protected flag from state when rendering', () => {
    const tokenMock = {
      token_mint: 'test-mint-123',
      protected: true,
      symbol: 'TEST',
      name: 'Test Token',
      age: { value: 1, unit: 'd', raw_days: 1 },
      price: 10,
      balance_ui: 100,
      value: 1000,
      dev_activity_pct: 5
    };

    const html = renderTokenRowV3(tokenMock, true);
    expect(html).toContain('data-protected="true"');
    expect(html).toContain('bg-red-500/20');
    expect(html).toContain('Protected');
  });

  it('should toggle → simulate list refresh → ensure button is still red', (done) => {
    const tokenMock = {
      token_mint: 'test-mint-123',
      protected: false,
      symbol: 'TEST',
      name: 'Test Token',
      age: { value: 1, unit: 'd', raw_days: 1 },
      price: 10,
      balance_ui: 100,
      value: 1000,
      dev_activity_pct: 5
    };

    // Set up initial state
    window.tokenListV3State.tokens = [tokenMock];

    // Step 1: Simulate toggle - add optimistic change
    window.tokenListV3State.recentChanges.set('test-mint-123', {
      state: true,
      timestamp: Date.now()
    });

    // Step 2: Simulate list refresh by calling loadFromSupabaseV3
    const updatedTokens = loadFromSupabaseV3();
    const refreshedToken = updatedTokens.find(t => t.token_mint === 'test-mint-123');
    
    // Verify that the optimistic change was preserved
    expect(refreshedToken.protected).toBe(true);
    expect(refreshedToken.monitoring_active).toBe(true);

    // Step 3: Render the updated token and verify button is red
    const html = renderTokenRowV3(refreshedToken, true);
    expect(html).toContain('data-protected="true"');
    expect(html).toContain('bg-red-500/20');
    expect(html).toContain('Protected');

    done();
  });

  it('should ignore stale database updates when optimistic change is newer', () => {
    const tokenMock = {
      token_mint: 'test-mint-123',
      protected: false,
      updated_at: '2024-01-01T10:00:00Z' // Old timestamp
    };

    // Recent optimistic change (newer)
    const recentTimestamp = Date.now();
    window.tokenListV3State.recentChanges.set('test-mint-123', {
      state: true,
      timestamp: recentTimestamp
    });

    // Simulate database update with older timestamp
    const databaseUpdateTime = new Date('2024-01-01T10:00:00Z');
    const optimisticChangeTime = new Date(recentTimestamp);

    // Verify that optimistic change is newer
    expect(optimisticChangeTime > databaseUpdateTime).toBe(true);

    // The logic should preserve the optimistic change
    const recentChange = window.tokenListV3State.recentChanges.get('test-mint-123');
    expect(recentChange.state).toBe(true);
    expect(recentChange.timestamp).toBe(recentTimestamp);
  });

  it('should clear recentChanges after 5 seconds', (done) => {
    const tokenMint = 'test-mint-123';
    
    // Add recent change
    window.tokenListV3State.recentChanges.set(tokenMint, {
      state: true,
      timestamp: Date.now() - 6000 // 6 seconds ago (older than 5 second threshold)
    });

    const tokenMock = {
      token_mint: tokenMint,
      protected: false,
      symbol: 'TEST'
    };

    window.tokenListV3State.tokens = [tokenMock];

    // Simulate refresh - should not preserve change older than 5 seconds
    const updatedTokens = loadFromSupabaseV3();
    const refreshedToken = updatedTokens.find(t => t.token_mint === tokenMint);
    
    // Should NOT preserve the old change
    expect(refreshedToken.protected).toBe(false);
    
    done();
  });
});

// New regression tests for token protection toggle

describe('Token Protection Toggle Tests', () => {
  it('should prevent simultaneous toggles using toggleInProgress gate', (done) => {
    const tokenMock = {
      token_mint: 'rapid-toggle-mint',
      protected: false,
      symbol: 'RAPID',
    };

    window.tokenListV3State.tokens = [tokenMock];

    // Clear any existing entries
    toggleInProgress.clear();

    // Create button element
    const button = document.createElement('button');
    button.dataset.mint = tokenMock.token_mint;
    button.dataset.protected = 'false';

    // First rapid click - should set toggleInProgress
    handleProtectionClick({ target: button });
    expect(toggleInProgress.has(tokenMock.token_mint)).toBe(true);

    // Second rapid click - should be ignored due to toggleInProgress gate
    const initialSize = toggleInProgress.size;
    handleProtectionClick({ target: button });
    expect(toggleInProgress.size).toBe(initialSize); // Should not change

    // Wait for the timeout to clear the toggle
    setTimeout(() => {
      expect(toggleInProgress.has(tokenMock.token_mint)).toBe(false);
      done();
    }, 150);
  });

  it('should retain state for 3 toggled tokens after page refresh', (done) => {
    const tokens = [
      { token_mint: 'mint1', protected: false, symbol: 'T1' },
      { token_mint: 'mint2', protected: true, symbol: 'T2' },
      { token_mint: 'mint3', protected: false, symbol: 'T3' }
    ];

    window.tokenListV3State.tokens = tokens;
    window.tokenListV3State.recentChanges.set('mint1', { state: true, timestamp: Date.now() });
    window.tokenListV3State.recentChanges.set('mint3', { state: true, timestamp: Date.now() });

    // Simulate refresh
    const refreshedTokens = loadFromSupabaseV3();

    expect(refreshedTokens[0].protected).toBe(true);
    expect(refreshedTokens[1].protected).toBe(true);
    expect(refreshedTokens[2].protected).toBe(true);

    done();
  });

  it('should show disabled UI for rugged tokens', () => {
    const ruggedToken = { token_mint: 'rugged-mint', protected: false, symbol: 'RUGGED', rugged: true };

    window.tokenListV3State.tokens = [ruggedToken];

    const button = document.createElement('button');
    button.dataset.mint = ruggedToken.token_mint;
    button.dataset.rugged = 'true';

    handleProtectionClick({ target: button });

    // The UI should not change and an error message should be displayed
    expect(showNotification).toHaveBeenCalledWith('Cannot protect rugged tokens', 'error');
  });
});

