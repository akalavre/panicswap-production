const fetch = require('node-fetch');
const { Connection, PublicKey } = require('@solana/web3.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function completeDemo() {
  console.clear();
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                    🚀 PANICSWAP COMPLETE DEMO 🚀                     ║
║                                                                       ║
║          Emergency Exit Protection for Solana Traders                 ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  await question('\nPress Enter to begin the demo...');

  // Step 1: Token Discovery
  console.log('\n\n📋 STEP 1: TOKEN DISCOVERY AND ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const tokenMint = await question('Enter a pump.fun token address (or press Enter for default): ');
  const token = tokenMint || 'Ad2Xa9XHvxR4yiWyTpXJywAFr8KNAj8KFxHPmvf7pump';
  
  console.log(`\n🔍 Analyzing token: ${token}`);
  console.log('⏳ Fetching real-time data from blockchain...\n');

  // Simulate loading
  await sleep(1000);

  try {
    // Fetch real token data
    const response = await fetch('http://localhost:3001/api/tokens/enrich-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mint: token }),
    });

    const tokenData = await response.json();
    
    if (!tokenData.success && !tokenData.pumpFunAnalysis) {
      // Use demo data if API fails
      tokenData.pumpFunAnalysis = {
        symbol: 'DEMO',
        name: 'Demo Token',
        bondingCurve: { solReserves: 8.14, tokenReserves: 500000, complete: false },
        holders: {
          totalHolders: 42,
          devWalletPercentage: 15,
          concentrationRisk: 'MEDIUM',
          topHolders: [
            { address: 'Dev123...xyz', percentage: 15, isDevWallet: true },
            { address: 'Whale1...abc', percentage: 12 },
            { address: 'Whale2...def', percentage: 8 }
          ]
        },
        riskScore: 45,
        warnings: ['⚠️ Dev wallet holds 15% of supply', '🐋 Top holder owns 12% of supply']
      };
    }

    const analysis = tokenData.pumpFunAnalysis || tokenData;

    // Display token info
    console.log('✅ TOKEN IDENTIFIED!\n');
    console.log(`🪙 Token: ${analysis.symbol || 'UNKNOWN'}`);
    console.log(`📝 Name: ${analysis.name || 'Unknown Token'}`);
    console.log(`💧 Liquidity: ${analysis.bondingCurve?.solReserves || 0} SOL`);
    console.log(`👥 Holders: ${analysis.holders?.totalHolders || 0}`);
    console.log(`🎯 Platform: Pump.fun\n`);

    await question('Press Enter to continue...');

    // Step 2: Risk Analysis
    console.log('\n\n🔍 STEP 2: RISK ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Running deep analysis...\n');
    await sleep(1500);

    console.log('📊 HOLDER DISTRIBUTION:');
    if (analysis.holders?.topHolders) {
      analysis.holders.topHolders.slice(0, 3).forEach((holder, i) => {
        const icon = holder.isDevWallet ? '👨‍💻' : '🐋';
        console.log(`   ${icon} #${i + 1}: ${holder.percentage}%${holder.isDevWallet ? ' (Developer)' : ''}`);
      });
    }

    console.log(`\n🚨 RISK ASSESSMENT:`);
    console.log(`   Overall Risk Score: ${analysis.riskScore || 0}/100`);
    console.log(`   Concentration Risk: ${analysis.holders?.concentrationRisk || 'UNKNOWN'}`);
    console.log(`   Dev Holdings: ${analysis.holders?.devWalletPercentage || 0}%`);

    if (analysis.warnings?.length > 0) {
      console.log(`\n⚠️  WARNINGS DETECTED:`);
      analysis.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    await question('\nPress Enter to continue...');

    // Step 3: Protection Setup
    console.log('\n\n🛡️ STEP 3: PROTECTION CONFIGURATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Choose your protection level:\n');
    console.log('1. 🟢 Conservative (30% drop trigger)');
    console.log('2. 🟡 Balanced (20% drop trigger)');
    console.log('3. 🔴 Aggressive (10% drop trigger)\n');

    const choice = await question('Select (1-3): ');
    const triggers = { '1': 30, '2': 20, '3': 10 };
    const trigger = triggers[choice] || 20;

    console.log(`\n✅ Protection configured with ${trigger}% drop trigger`);
    console.log('\n📋 Your Protection Settings:');
    console.log(`   • Price Drop Trigger: -${trigger}%`);
    console.log(`   • Liquidity Drop Trigger: -50%`);
    console.log(`   • Dev Dump Detection: ENABLED`);
    console.log(`   • Auto-Swap on Trigger: ENABLED`);

    await question('\nPress Enter to start monitoring...');

    // Step 4: Live Monitoring
    console.log('\n\n📡 STEP 4: LIVE MONITORING ACTIVE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🟢 PanicSwap Protection is now ACTIVE!\n');
    console.log('Monitoring in real-time for:');
    console.log('   • Sudden price drops');
    console.log('   • Liquidity removal');
    console.log('   • Dev wallet movements');
    console.log('   • Whale dumps\n');

    // Simulate monitoring
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frame = 0;
    let monitoring = true;
    let seconds = 0;

    const monitoringInterval = setInterval(() => {
      process.stdout.write(`\r${frames[frame]} Monitoring... [${seconds}s] | Price: $0.0024 | Liquidity: 8.14 SOL`);
      frame = (frame + 1) % frames.length;
      seconds++;
      
      if (seconds >= 5) {
        monitoring = false;
        clearInterval(monitoringInterval);
      }
    }, 200);

    await sleep(5000);

    // Step 5: Rug Detection
    console.log('\n\n\n🚨 STEP 5: RUG PULL DETECTED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⚠️  CRITICAL ALERT at ' + new Date().toLocaleTimeString());
    console.log('\n🔴 LIQUIDITY REMOVAL DETECTED!');
    console.log('   • Bonding curve SOL: 8.14 → 0.82 (-90%)');
    console.log('   • Dev wallet sold 80% of holdings');
    console.log('   • Price impact: -85%\n');

    await sleep(1000);

    console.log('⚡ EXECUTING EMERGENCY PROTECTION...\n');

    // Step 6: Protection Execution
    console.log('🎮 DEMO MODE: Simulating protection execution...\n');
    
    const protectionSteps = [
      '✅ Rug pull confirmed',
      '✅ Preparing emergency swap',
      '✅ Calculating optimal route',
      '✅ Signing transaction (SIMULATED)',
      '⏳ Executing swap (SIMULATED)...'
    ];

    for (const step of protectionSteps) {
      console.log(step);
      await sleep(500);
    }

    console.log('\n💰 SWAP SIMULATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate realistic results based on real data
    const demoBalance = 1000000;
    const realPrice = analysis.bondingCurve?.solReserves > 0 
      ? (analysis.bondingCurve.solReserves * 50) / (analysis.bondingCurve.tokenReserves / 1e6)
      : 0.0024;
    
    // In a rug, you might save 10-20% if you're fast
    const savePercentage = 0.15;
    const savedValue = (demoBalance * realPrice * savePercentage).toFixed(2);
    const lostValue = (demoBalance * realPrice * (1 - savePercentage)).toFixed(2);

    console.log('📊 SIMULATED PROTECTION RESULTS:');
    console.log(`   Token Balance: ${demoBalance.toLocaleString()} ${analysis.symbol || 'TOKENS'}`);
    console.log(`   Current Price: $${realPrice.toFixed(6)}`);
    console.log(`   Original Value: $${(demoBalance * realPrice).toFixed(2)}`);
    console.log(`   Saved Value: $${savedValue} (15% recovered)`);
    console.log(`   Protection Speed: 1.2 seconds`);
    console.log(`   Slippage: 3%\n`);

    console.log('📌 IN A REAL SCENARIO:');
    console.log('   ✅ Real swap would execute on-chain');
    console.log('   ✅ SOL would be deposited to your wallet');
    console.log('   ✅ You would exit before -85% crash');
    console.log(`   ✅ You would save $${savedValue} from total loss\n`);
    
    console.log('⚠️  This was a SIMULATION - no real swap occurred');

    await question('Press Enter to see summary...');

    // Step 7: Summary
    console.log('\n\n📈 DEMO SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('What just happened:');
    console.log('1. ✅ Token analyzed and risks identified');
    console.log('2. ✅ Protection configured to your preferences');
    console.log('3. ✅ Live monitoring detected the rug pull');
    console.log('4. ✅ Emergency swap executed in 1.2 seconds');
    console.log('5. ✅ Funds saved before 85% crash\n');

    console.log('🛡️ With PanicSwap, you would have:');
    console.log('   • Saved $' + savedValue + ' from this rug');
    console.log('   • Avoided 85% loss');
    console.log('   • Exited automatically without manual intervention\n');

    console.log('📱 In production, you also get:');
    console.log('   • Telegram alerts');
    console.log('   • Real wallet integration');
    console.log('   • 24/7 monitoring');
    console.log('   • Multi-token protection\n');

    console.log('🚀 Ready to protect your trades?\n');

  } catch (error) {
    console.error('Demo error:', error.message);
  } finally {
    rl.close();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add startup message
console.log('\n🚀 Starting PanicSwap Demo...\n');
console.log('Make sure the backend is running (npm run dev:backend)\n');

// Run the demo
completeDemo();