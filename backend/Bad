Proposed Badge System for Memecoin Traders

  Instead of risk levels, let's show trading states:

  1. Badge States (in priority order)

  🔴 SELL NOW - Exit immediately (liquidity collapsing)
  🟠 SELL - Exit soon (negative signals detected)
  🟢 PUMPING - Price/liquidity increasing rapidly
  ⚡ VOLATILE - High activity, watch closely
  👀 WATCHING - Monitoring active, no signals
  ⚫ RUGGED - Game over, liquidity gone
  🔵 NEW - Recently added, gathering data

  2. What Traders Actually Care About

  - Is it pumping? → Show pump percentage
  - Should I sell? → Clear exit signal
  - Is it volatile? → Activity indicator
  - Is monitoring on? → Protection status

  3. Simplified Implementation

  // Badge states that matter
  const BADGE_STATES = {
    SELL_NOW: {
      color: 'red',
      text: 'SELL NOW',
      icon: '🚨',
      pulse: true
    },
    SELL: {
      color: 'orange',
      text: 'SELL',
      icon: '⚠️',
      pulse: false
    },
    PUMPING: {
      color: 'green',
      text: 'PUMPING',
      icon: '🚀',
      pulse: false
    },
    VOLATILE: {
      color: 'yellow',
      text: 'VOLATILE',
      icon: '⚡',
      pulse: false
    },
    WATCHING: {
      color: 'blue',
      text: 'WATCHING',
      icon: '👀',
      pulse: false
    },
    RUGGED: {
      color: 'gray',
      text: 'RUGGED',
      icon: '💀',
      pulse: false
    },
    NEW: {
      color: 'purple',
      text: 'NEW',
      icon: '🆕',
      pulse: false
    }
  };

  4. State Calculation Logic

  function calculateBadgeState(data) {
    // Priority order - first match wins

    // 1. Sell signals (highest priority)
    if (data.sellSignal?.action === 'PANIC_SELL') return 'SELL_NOW';
    if (data.sellSignal?.action === 'SELL') return 'SELL';

    // 2. Rugged check
    if (data.liquidity < 100 || data.status === 'RUGGED') return
  'RUGGED';

    // 3. Pumping check (>20% in 5m)
    if (data.velocities?.price5m > 4) return 'PUMPING'; // >20% in 5
  min

    // 4. Volatility check
    if (Math.abs(data.velocities?.price5m || 0) > 2) return 'VOLATILE';

    // 5. New token check
    if (data.isNewlyAdded || data.dataAge < 300000) return 'NEW'; // <5
   min old

    // 6. Default monitoring state
    return data.monitoring?.active ? 'WATCHING' : null;
  }