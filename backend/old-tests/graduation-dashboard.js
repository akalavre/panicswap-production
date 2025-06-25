const { Connection, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');

class GraduationDashboard {
  constructor() {
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  }

  async displayDashboard(tokens) {
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                    🎓 GRADUATION DASHBOARD 🎓                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Live tracking of pump.fun tokens approaching Raydium migration      ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

    console.log(`Updated: ${new Date().toLocaleTimeString()}\n`);
    
    console.log('TOKENS APPROACHING GRADUATION ($69k market cap):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const candidates = [];
    
    for (const token of tokens) {
      try {
        const analysis = await this.analyzeToken(token);
        if (analysis && analysis.progress > 25) {
          candidates.push(analysis);
        }
      } catch (e) {
        // Skip errored tokens
      }
    }
    
    // Sort by progress
    candidates.sort((a, b) => b.progress - a.progress);
    
    // Display top candidates
    for (let i = 0; i < Math.min(10, candidates.length); i++) {
      const c = candidates[i];
      this.displayCandidate(c, i + 1);
    }
    
    if (candidates.length === 0) {
      console.log('No tokens currently approaching graduation (>25% progress)\n');
    }
    
    // Show legend
    console.log('\n📊 PROGRESS INDICATORS:');
    console.log('   🟢 25-50%  - Building momentum');
    console.log('   🟡 50-75%  - Approaching target');
    console.log('   🟠 75-90%  - Close to graduation');
    console.log('   🔴 90-100% - Imminent graduation!\n');
    
    // Trading tips
    console.log('💡 TRADING TIPS:');
    console.log('   • Graduation often leads to 2-10x price surge');
    console.log('   • Watch for increased volume as approach 90%');
    console.log('   • Set alerts for key milestones (50%, 75%, 90%)');
    console.log('   • Consider partial profits before migration\n');
  }

  async analyzeToken(tokenMint) {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const programId = new PublicKey(this.PUMP_PROGRAM_ID);
      
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
        programId
      );
      
      const account = await this.connection.getAccountInfo(bondingCurve);
      if (!account || !account.owner.equals(programId)) return null;
      
      // Decode reserves
      const solReserves = Number(account.data.readBigUInt64LE(32)) / 1e9;
      
      // Estimate market cap
      const estimatedPrice = solReserves > 0 ? (solReserves * 50) / 500000 : 0;
      const estimatedMcap = estimatedPrice * 1_000_000_000 * 0.8;
      const progress = Math.min((estimatedMcap / 69000) * 100, 100);
      
      return {
        mint: tokenMint,
        symbol: tokenMint.slice(0, 4) + '...',
        solReserves,
        marketCap: estimatedMcap,
        progress,
        emoji: this.getProgressEmoji(progress),
        timeEstimate: this.estimateTime(progress, estimatedMcap)
      };
    } catch (e) {
      return null;
    }
  }

  displayCandidate(candidate, rank) {
    const progressBar = this.createProgressBar(candidate.progress);
    
    console.log(`${rank}. ${candidate.emoji} ${candidate.symbol}`);
    console.log(`   Market Cap: $${candidate.marketCap.toLocaleString()} | Progress: ${candidate.progress.toFixed(1)}%`);
    console.log(`   ${progressBar}`);
    console.log(`   Liquidity: ${candidate.solReserves.toFixed(1)} SOL | ETA: ${candidate.timeEstimate}`);
    console.log('');
  }

  createProgressBar(progress) {
    const filled = Math.floor(progress / 5);
    const empty = 20 - filled;
    return `[${'\x1b[32m█\x1b[0m'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  getProgressEmoji(progress) {
    if (progress >= 90) return '🔴';
    if (progress >= 75) return '🟠';
    if (progress >= 50) return '🟡';
    return '🟢';
  }

  estimateTime(progress, marketCap) {
    if (progress >= 95) return 'Any moment!';
    if (progress >= 90) return '< 1 hour';
    if (progress >= 75) return '1-3 hours';
    if (progress >= 50) return '3-12 hours';
    return '12+ hours';
  }
}

// Run dashboard
async function runDashboard() {
  console.log('Enter token addresses to monitor (one per line, empty line to finish):');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const tokens = [];
  
  const getToken = () => {
    rl.question('Token address: ', (token) => {
      if (token) {
        tokens.push(token);
        getToken();
      } else {
        rl.close();
        startDashboard(tokens);
      }
    });
  };
  
  getToken();
}

async function startDashboard(tokens) {
  if (tokens.length === 0) {
    console.log('No tokens to monitor.');
    return;
  }
  
  const dashboard = new GraduationDashboard();
  
  // Initial display
  await dashboard.displayDashboard(tokens);
  
  // Refresh every 30 seconds
  setInterval(async () => {
    await dashboard.displayDashboard(tokens);
  }, 30000);
  
  console.log('\n🔄 Dashboard refreshes every 30 seconds. Press Ctrl+C to exit.\n');
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Graduation monitor stopped.\n');
  process.exit();
});

// Run
require('dotenv').config();
runDashboard();