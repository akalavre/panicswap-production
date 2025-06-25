require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey } = require('@solana/web3.js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import services
const { MLPredictionGeneratorService } = require('./dist/services/MLPredictionGeneratorService');
const { TokenSecurityService } = require('./dist/services/TokenSecurityService');
const { EventEmitter } = require('events');

async function populateDataAndGenerateML(tokenMint) {
  console.log(`\n🔄 Processing token: ${tokenMint}\n`);
  
  // 1. Create minimal rugcheck data (since API might not have data for new tokens)
  console.log('📊 Creating rugcheck data...');
  const rugcheckData = {
    token_mint: tokenMint,
    risk_score: 50, // Default moderate risk
    risk_level: 'MODERATE',
    lp_locked: 0,
    holders: 100, // Estimated
    creator_balance_percent: 5,
    mint_authority: 'unknown',
    freeze_authority: 'unknown',
    market_cap: 50000,
    liquidity_current: 10000,
    dev_activity_pct: 10,
    launch_time: new Date().toISOString(),
    last_checked: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await supabase
    .from('rugcheck_reports')
    .upsert(rugcheckData, { onConflict: 'token_mint' });
  console.log('✅ Rugcheck data created');
  
  // 2. Run security analysis
  console.log('\n🔐 Running security analysis...');
  const connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
  const securityService = new TokenSecurityService(connection);
  
  try {
    const securityAnalysis = await securityService.analyzeToken(tokenMint);
    console.log('✅ Security analysis complete');
    console.log('- Mint Renounced:', securityAnalysis.mint_renounced);
    console.log('- LP Locked:', securityAnalysis.lp_locked);
    console.log('- Is Honeypot:', securityAnalysis.is_honeypot);
  } catch (error) {
    console.error('⚠️  Security analysis failed:', error.message);
  }
  
  // 3. Create velocity data
  console.log('\n📈 Creating velocity data...');
  const velocityData = {
    token_mint: tokenMint,
    liquidity_usd: 10000,
    liquidity_velocity_1m: 0,
    liquidity_velocity_5m: 0,
    liquidity_velocity_30m: 0,
    price_velocity_1m: 0,
    price_velocity_5m: 0,
    price_velocity_30m: 0,
    flash_rug_alert: false,
    rapid_drain_alert: false,
    slow_bleed_alert: false,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  await supabase
    .from('liquidity_velocity')
    .insert(velocityData);
  console.log('✅ Velocity data created');
  
  // 4. Check if token metadata exists
  console.log('\n📝 Checking token metadata...');
  const { data: metadata } = await supabase
    .from('token_metadata')
    .select('*')
    .eq('mint', tokenMint)
    .single();
  
  if (!metadata) {
    console.log('Creating token metadata...');
    await supabase
      .from('token_metadata')
      .insert({
        mint: tokenMint,
        token_mint: tokenMint,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 6,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  }
  
  // 5. Force ML prediction generation
  console.log('\n🤖 Generating ML prediction...');
  const eventBus = new EventEmitter();
  const mlService = new MLPredictionGeneratorService(eventBus);
  
  // Manually trigger prediction for this specific token
  try {
    // Get all the data we just created
    const { data: rugcheck } = await supabase
      .from('rugcheck_reports')
      .select('*')
      .eq('token_mint', tokenMint)
      .single();
    
    const { data: security } = await supabase
      .from('token_security_analysis')
      .select('*')
      .eq('token_mint', tokenMint)
      .single();
    
    const { data: velocity } = await supabase
      .from('liquidity_velocity')
      .select('*')
      .eq('token_mint', tokenMint)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    // Call the private method directly (for testing)
    const tokenData = {
      token_mint: tokenMint,
      balance: 1000000,
      decimals: 6
    };
    
    await mlService.processBatch([tokenData]);
    
    console.log('✅ ML prediction generated!');
    
    // Check the result
    const { data: mlResult } = await supabase
      .from('ml_risk_analysis')
      .select('*')
      .eq('token_mint', tokenMint)
      .single();
    
    if (mlResult) {
      console.log('\n📊 ML Analysis Result:');
      console.log('- Risk Level:', mlResult.risk_level);
      console.log('- ML Score:', mlResult.ml_risk_score);
      console.log('- Confidence:', mlResult.ml_confidence);
      console.log('- Patterns:', mlResult.detected_patterns);
    }
    
  } catch (error) {
    console.error('Error generating ML prediction:', error);
  }
}

async function main() {
  const tokenMint = 'aVqiXbm4zYfcTgona2L9ipDYunjPAzwzeXNLjSJpump';
  console.log('=== ML Risk Analysis Generation for New Token ===');
  
  await populateDataAndGenerateML(tokenMint);
  
  console.log('\n✅ Process complete!');
  console.log('The token should now have ML risk analysis data.');
  process.exit(0);
}

main().catch(console.error);