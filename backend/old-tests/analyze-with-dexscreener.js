const axios = require('axios');

async function analyzeWithDexScreener(tokenMint) {
  console.log(`\n🔍 Analyzing Token: ${tokenMint}\n`);
  console.log('=' .repeat(80));
  
  try {
    // 1. DexScreener API
    console.log('\n📈 DexScreener Market Data:');
    console.log('-'.repeat(40));
    
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
    const response = await axios.get(dexScreenerUrl, { timeout: 10000 });
    
    if (response.data && response.data.pairs && response.data.pairs.length > 0) {
      // Sort pairs by liquidity to get the main pair
      const pairs = response.data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const mainPair = pairs[0];
      
      // Basic token info
      console.log(`\n🪙 Token Information:`);
      console.log(`Name: ${mainPair.baseToken.name}`);
      console.log(`Symbol: ${mainPair.baseToken.symbol}`);
      console.log(`Address: ${mainPair.baseToken.address}`);
      
      // Market metrics
      console.log(`\n💰 Market Metrics:`);
      console.log(`Price USD: $${mainPair.priceUsd || '0'}`);
      console.log(`Price SOL: ${mainPair.priceNative || '0'} SOL`);
      console.log(`Market Cap: $${(mainPair.fdv || 0).toLocaleString()}`);
      console.log(`Liquidity: $${(mainPair.liquidity?.usd || 0).toLocaleString()}`);
      
      // Price changes
      console.log(`\n📊 Price Performance:`);
      console.log(`5min: ${mainPair.priceChange?.m5 || 0}%`);
      console.log(`1hr: ${mainPair.priceChange?.h1 || 0}%`);
      console.log(`6hr: ${mainPair.priceChange?.h6 || 0}%`);
      console.log(`24hr: ${mainPair.priceChange?.h24 || 0}%`);
      
      // Volume
      console.log(`\n📈 Volume:`);
      console.log(`5min: $${(mainPair.volume?.m5 || 0).toLocaleString()}`);
      console.log(`1hr: $${(mainPair.volume?.h1 || 0).toLocaleString()}`);
      console.log(`6hr: $${(mainPair.volume?.h6 || 0).toLocaleString()}`);
      console.log(`24hr: $${(mainPair.volume?.h24 || 0).toLocaleString()}`);
      
      // Transactions
      console.log(`\n🔄 Transactions (24hr):`);
      console.log(`Buys: ${mainPair.txns?.h24?.buys || 0}`);
      console.log(`Sells: ${mainPair.txns?.h24?.sells || 0}`);
      console.log(`Total: ${(mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0)}`);
      const buyRatio = mainPair.txns?.h24?.buys && mainPair.txns?.h24?.sells 
        ? ((mainPair.txns.h24.buys / (mainPair.txns.h24.buys + mainPair.txns.h24.sells)) * 100).toFixed(1)
        : 0;
      console.log(`Buy/Sell Ratio: ${buyRatio}% buys`);
      
      // DEX info
      console.log(`\n🏪 Trading Venue:`);
      console.log(`DEX: ${mainPair.dexId}`);
      console.log(`Pair: ${mainPair.pairAddress}`);
      console.log(`Chain: ${mainPair.chainId}`);
      
      // Pump.fun specific info
      if (mainPair.dexId === 'pumpswap') {
        console.log(`\n🚀 Pump.fun Status:`);
        console.log(`Trading on Pump.fun DEX`);
        
        // Calculate bonding curve progress
        const bondingCurveTarget = 69420; // Typical pump.fun graduation threshold
        const progress = ((mainPair.liquidity?.usd || 0) / bondingCurveTarget * 100).toFixed(1);
        console.log(`Bonding Curve Progress: ${progress}% ($${(mainPair.liquidity?.usd || 0).toLocaleString()} / $69,420)`);
        
        if (progress >= 100) {
          console.log(`✅ Graduated to Raydium!`);
        } else {
          console.log(`📈 ${100 - progress}% to graduation`);
        }
      }
      
      // Social links
      if (mainPair.info) {
        console.log(`\n🌐 Links:`);
        if (mainPair.info.websites) console.log(`Website: ${mainPair.info.websites.join(', ')}`);
        if (mainPair.info.socials) {
          mainPair.info.socials.forEach(social => {
            console.log(`${social.type}: ${social.url}`);
          });
        }
      }
      
      // Risk assessment based on DexScreener data
      console.log(`\n⚠️  Risk Assessment:`);
      const risks = [];
      const positives = [];
      
      // Check liquidity
      if ((mainPair.liquidity?.usd || 0) < 5000) {
        risks.push('❌ Very low liquidity (< $5k)');
      } else if ((mainPair.liquidity?.usd || 0) < 20000) {
        risks.push('⚠️  Low liquidity (< $20k)');
      } else {
        positives.push('✅ Healthy liquidity');
      }
      
      // Check volume
      if ((mainPair.volume?.h24 || 0) < 1000) {
        risks.push('❌ Very low 24h volume (< $1k)');
      } else if ((mainPair.volume?.h24 || 0) > 100000) {
        positives.push('✅ High trading volume');
      }
      
      // Check buy/sell ratio
      if (buyRatio < 30) {
        risks.push('⚠️  Heavy selling pressure');
      } else if (buyRatio > 70) {
        positives.push('✅ Strong buying pressure');
      }
      
      // Check price action
      if ((mainPair.priceChange?.h24 || 0) < -50) {
        risks.push('❌ Major price dump (-50% in 24h)');
      } else if ((mainPair.priceChange?.h24 || 0) > 100) {
        positives.push('🚀 Strong price momentum');
      }
      
      // Print assessment
      if (risks.length > 0) {
        console.log('\nRisk Factors:');
        risks.forEach(risk => console.log(`  ${risk}`));
      }
      
      if (positives.length > 0) {
        console.log('\nPositive Indicators:');
        positives.forEach(positive => console.log(`  ${positive}`));
      }
      
      // All trading pairs
      if (pairs.length > 1) {
        console.log(`\n📊 All Trading Pairs (${pairs.length}):`);
        pairs.forEach((pair, i) => {
          console.log(`${i + 1}. ${pair.dexId} - Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
        });
      }
      
    } else {
      console.log('❌ No trading data found on DexScreener');
      console.log('This token may be:');
      console.log('  - Not yet listed on any DEX');
      console.log('  - Too new to be indexed');
      console.log('  - Delisted or rugged');
    }
    
  } catch (error) {
    console.error('Error fetching DexScreener data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis complete!\n');
}

const tokenMint = process.argv[2] || 'FAd6YyPSFQT2oosg8rLPAeWbC8uy3gQDgdLsmHvbpump';
analyzeWithDexScreener(tokenMint).catch(console.error);