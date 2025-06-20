const { Connection, PublicKey } = require('@solana/web3.js');
const readline = require('readline');

class LiveMonitorDemo {
  constructor(tokenMint) {
    this.tokenMint = tokenMint;
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.monitoring = false;
    this.basePrice = 0.0024;
    this.baseLiquidity = 8.14;
    this.currentPrice = this.basePrice;
    this.currentLiquidity = this.baseLiquidity;
  }

  async start() {
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   🔴 LIVE MONITORING DASHBOARD 🔴                     ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

    console.log(`Token: ${this.tokenMint}`);
    console.log(`Status: PROTECTED ✅\n`);

    this.monitoring = true;
    let seconds = 0;
    let rugTriggered = false;

    const updateInterval = setInterval(async () => {
      if (!this.monitoring) {
        clearInterval(updateInterval);
        return;
      }

      // Normal monitoring for first 8 seconds
      if (seconds < 8) {
        this.displayNormalStatus(seconds);
      } 
      // Simulate rug pull detection
      else if (seconds === 8) {
        rugTriggered = true;
        this.simulateRugPull();
      }
      // Show protection execution
      else if (seconds > 8 && seconds < 12) {
        this.showProtectionExecution(seconds - 8);
      }
      // Show results
      else if (seconds === 12) {
        this.showProtectionResults();
        this.monitoring = false;
      }

      seconds++;
    }, 1000);
  }

  displayNormalStatus(time) {
    // Add small random fluctuations
    const priceVariation = (Math.random() - 0.5) * 0.0001;
    const liqVariation = (Math.random() - 0.5) * 0.05;
    
    this.currentPrice = this.basePrice + priceVariation;
    this.currentLiquidity = this.baseLiquidity + liqVariation;

    console.log('\x1b[2J\x1b[0f'); // Clear screen
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   🟢 LIVE MONITORING DASHBOARD 🟢                     ║
╚═══════════════════════════════════════════════════════════════════════╝

⏱️  Monitoring Duration: ${time}s

📊 MARKET DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💵 Price:      $${this.currentPrice.toFixed(6)} ${this.getPriceIndicator(0)}
  💧 Liquidity:  ${this.currentLiquidity.toFixed(2)} SOL
  📈 24h Volume: $45,231
  👥 Holders:    42

🛡️ PROTECTION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Price Monitor:     ACTIVE
  ✅ Liquidity Monitor: ACTIVE  
  ✅ Dev Wallet Track:  ACTIVE
  ✅ Auto-Swap:         ARMED

📡 REAL-TIME EVENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [${this.getTimestamp()}] System monitoring...
  [${this.getTimestamp()}] All metrics normal
  [${this.getTimestamp()}] No suspicious activity detected
`);
  }

  simulateRugPull() {
    console.log('\x1b[2J\x1b[0f'); // Clear screen
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   🔴 RUG PULL DETECTED! 🔴                            ║
╚═══════════════════════════════════════════════════════════════════════╝

⚠️  CRITICAL ALERT - ${this.getTimestamp()}

🚨 DETECTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💥 Event Type:    LIQUIDITY REMOVAL
  📉 Price Impact:  -85%
  💧 Liquidity:     8.14 → 0.82 SOL (-90%)
  👤 Source:        Dev Wallet

⚡ EXECUTING EMERGENCY PROTECTION...
`);

    // Play alert sound (if available)
    process.stdout.write('\x07');
  }

  showProtectionExecution(step) {
    const steps = [
      '🔍 Analyzing best exit route...',
      '💰 Preparing emergency swap...',
      '✍️  Signing transaction...',
      '🚀 Broadcasting to network...'
    ];

    console.log('\x1b[2J\x1b[0f'); // Clear screen
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   ⚡ PROTECTION EXECUTING ⚡                          ║
╚═══════════════════════════════════════════════════════════════════════╝

🛡️ EMERGENCY SWAP IN PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    for (let i = 0; i <= Math.min(step, steps.length - 1); i++) {
      console.log(`  ${i < step ? '✅' : '⏳'} ${steps[i]}`);
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: [${'█'.repeat(step * 5)}${' '.repeat(20 - step * 5)}] ${step * 25}%
`);
  }

  showProtectionResults() {
    console.log('\x1b[2J\x1b[0f'); // Clear screen
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   ✅ PROTECTION SUCCESSFUL ✅                         ║
╚═══════════════════════════════════════════════════════════════════════╝

💰 FUNDS SAVED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📊 EXECUTION SUMMARY
  ─────────────────────────────────
  Token Amount:    1,000,000 DEMO
  Exit Price:      $0.000324
  Received:        0.118 SOL
  Saved Value:     $324
  Execution Time:  1.2 seconds
  
  📈 WHAT WOULD HAVE HAPPENED
  ─────────────────────────────────
  Without Protection: -$2,076 loss (-85%)
  With PanicSwap:     -$216 loss (-8.8%)
  
  ✅ You saved $1,860!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Your SOL has been deposited to your wallet
🛡️ Protection complete - Token removed from monitoring
`);
  }

  getPriceIndicator(change) {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '→';
  }

  getTimestamp() {
    return new Date().toLocaleTimeString();
  }
}

// Main execution
async function runLiveDemo() {
  const tokenMint = process.argv[2] || 'Ad2Xa9XHvxR4yiWyTpXJywAFr8KNAj8KFxHPmvf7pump';
  
  console.log('\n🚀 Starting Live Monitoring Demo...\n');
  console.log('This demo will simulate:');
  console.log('1. Normal monitoring (8 seconds)');
  console.log('2. Rug pull detection');
  console.log('3. Emergency protection execution');
  console.log('4. Results\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise(resolve => {
    rl.question('Press Enter to start monitoring...', () => {
      rl.close();
      resolve();
    });
  });

  const monitor = new LiveMonitorDemo(tokenMint);
  await monitor.start();
}

// Load env and run
require('dotenv').config();
runLiveDemo();