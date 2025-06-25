const { Connection, clusterApiUrl } = require('@solana/web3.js');
const axios = require('axios');

// Load compiled TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

// Import services
const { SmartRugDetector } = require('./src/services/SmartRugDetector');
const { GoPlusSecurityService } = require('./src/services/GoPlusSecurityService');

async function analyzeToken(tokenMint) {
  console.log(`\n🔍 Analyzing Token: ${tokenMint}\n`);
  console.log('=' .repeat(80));
  
  // 1. GoPlus Security Analysis
  console.log('\n📊 GoPlus Security Analysis:');
  console.log('-'.repeat(40));
  
  const goPlusService = new GoPlusSecurityService();
  
  try {
    const assessment = await goPlusService.checkTokenSecurity(tokenMint);
    
    if (assessment) {
      console.log(`✅ Risk Level: ${assessment.riskLevel}`);
      console.log(`📈 Risk Score: ${assessment.riskScore}/100`);
      console.log(`🍯 Is Honeypot: ${assessment.isHoneypot ? '⚠️ YES' : '✅ NO'}`);
      console.log(`🏭 Is Mintable: ${assessment.isMintable ? '⚠️ YES' : '✅ NO'}`);
      console.log(`❄️  Is Freezable: ${assessment.isFreezable ? '⚠️ YES' : '✅ NO'}`);
      console.log(`👥 Holder Count: ${assessment.holderCount.toLocaleString()}`);
      console.log(`📊 Top Holder Concentration: ${assessment.topHolderConcentration.toFixed(2)}%`);
      console.log(`💰 Liquidity: $${assessment.liquidityUSD.toFixed(2)}`);
      console.log(`🏪 DEX Count: ${assessment.dexCount}`);
      console.log(`🔒 Has Transfer Fee: ${assessment.hasTransferFee ? '⚠️ YES' : '✅ NO'}`);
      console.log(`🚫 Non-Transferable: ${assessment.isNonTransferable ? '⚠️ YES' : '✅ NO'}`);
      console.log(`🔐 Balance Mutable Authority: ${assessment.hasBalanceMutableAuthority ? '⚠️ YES' : '✅ NO'}`);
      console.log(`📝 Is Closable: ${assessment.isClosable ? '⚠️ YES' : '✅ NO'}`);
      console.log(`⭐ Is Trusted Token: ${assessment.isTrustedToken ? '✅ YES' : '❌ NO'}`);
      
      if (assessment.risks.length > 0) {
        console.log(`\n⚠️  Identified Risks:`);
        assessment.risks.forEach(risk => console.log(`   - ${risk}`));
      } else {
        console.log(`\n✅ No significant risks identified`);
      }
    } else {
      console.log('❌ No security data available from GoPlus');
    }
  } catch (error) {
    console.error('❌ GoPlus API error:', error.message);
  }
  
  // 2. Get additional token info from pump.fun if available
  console.log('\n\n🪙 Token Information:');
  console.log('-'.repeat(40));
  
  try {
    // Try to get pump.fun specific data
    const pumpFunResponse = await axios.get(`https://frontend-api.pump.fun/coins/${tokenMint}`, {
      timeout: 5000
    });
    
    if (pumpFunResponse.data) {
      const data = pumpFunResponse.data;
      console.log(`📛 Name: ${data.name || 'Unknown'}`);
      console.log(`🔤 Symbol: ${data.symbol || 'Unknown'}`);
      console.log(`📝 Description: ${data.description || 'No description'}`);
      console.log(`🖼️  Image: ${data.image_uri || 'No image'}`);
      console.log(`💵 Market Cap: $${(data.usd_market_cap || 0).toLocaleString()}`);
      console.log(`📈 Price (SOL): ${data.price || 'Unknown'}`);
      console.log(`🔄 Total Supply: ${(data.total_supply || 0).toLocaleString()}`);
      console.log(`👤 Creator: ${data.creator || 'Unknown'}`);
      console.log(`🕐 Created: ${data.created_timestamp ? new Date(data.created_timestamp * 1000).toLocaleString() : 'Unknown'}`);
      
      if (data.twitter) console.log(`🐦 Twitter: ${data.twitter}`);
      if (data.telegram) console.log(`💬 Telegram: ${data.telegram}`);
      if (data.website) console.log(`🌐 Website: ${data.website}`);
    }
  } catch (error) {
    console.log('ℹ️  Could not fetch pump.fun data - token might not be a pump.fun token');
  }
  
  // 3. Smart Rug Detection Analysis
  console.log('\n\n🛡️ Smart Rug Detection Analysis:');
  console.log('-'.repeat(40));
  
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  const rugDetector = new SmartRugDetector(connection);
  
  try {
    // Simulate some market activity for analysis
    const basePrice = 0.0001;
    const baseLiquidity = 50000;
    
    // Add some price history
    for (let i = 0; i < 10; i++) {
      await rugDetector.analyzeRugProbability(
        tokenMint,
        basePrice * (1 + (Math.random() - 0.5) * 0.1),
        baseLiquidity * (1 + (Math.random() - 0.5) * 0.05)
      );
    }
    
    // Final analysis with current state
    const analysis = await rugDetector.analyzeRugProbability(
      tokenMint,
      basePrice,
      baseLiquidity
    );
    
    console.log(`🎯 Is Rug: ${analysis.isRug ? '⚠️ YES' : '✅ NO'}`);
    console.log(`📊 Confidence: ${analysis.confidence}%`);
    if (analysis.type) console.log(`🏷️  Type: ${analysis.type}`);
    
    if (analysis.reasons.length > 0) {
      console.log(`\n⚠️  Risk Factors:`);
      analysis.reasons.forEach(reason => console.log(`   - ${reason}`));
    }
    
    if (analysis.falsePositiveChecks.length > 0) {
      console.log(`\n✅ Positive Indicators:`);
      analysis.falsePositiveChecks.forEach(check => console.log(`   - ${check}`));
    }
    
    // Get protection recommendation
    const action = rugDetector.getProtectionAction(analysis);
    console.log(`\n🚨 Recommendation: ${action.action.toUpperCase()} (${action.urgency} urgency)`);
    console.log(`💬 ${action.message}`);
    
  } catch (error) {
    console.error('❌ Rug detection error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis complete!\n');
}

// Get token from command line or use the provided one
const tokenMint = process.argv[2] || 'JAneXWCid3JJLxUYCPeEgAL5VRbfF2HdSnXowGuhpump';
analyzeToken(tokenMint).catch(console.error);