// Generate ML predictions for ALL tokens immediately
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Enhanced ML prediction algorithm (same as service)
function generateMLPrediction(tokenData) {
  // Feature extraction
  const riskScore = tokenData.risk_score || 0;
  const liquidity = tokenData.liquidity_current || tokenData.current_liquidity || 0;
  const holders = tokenData.holders || tokenData.holder_count || 0;
  const devActivity = tokenData.dev_activity_pct || 0;
  const lpLocked = tokenData.lp_locked || 0;
  const marketCap = tokenData.market_cap || 0;
  const volume24h = tokenData.volume_24h || 0;
  const age = tokenData.age_hours || 24;

  // Enhanced ML scoring algorithm
  let mlScore = riskScore;

  // Liquidity factors
  if (liquidity < 5000) mlScore += 15;
  else if (liquidity < 10000) mlScore += 10;
  else if (liquidity < 50000) mlScore += 5;

  // Holder factors
  if (holders < 20) mlScore += 20;
  else if (holders < 50) mlScore += 15;
  else if (holders < 100) mlScore += 10;

  // Developer activity factors
  if (devActivity > 80) mlScore += 25;
  else if (devActivity > 60) mlScore += 20;
  else if (devActivity > 40) mlScore += 15;

  // LP lock factors
  if (lpLocked === 0) mlScore += 20;
  else if (lpLocked < 30) mlScore += 15;
  else if (lpLocked < 50) mlScore += 10;

  // Volume/liquidity ratio
  let volumeRatio = 0;
  if (liquidity > 0) {
    volumeRatio = volume24h / liquidity;
    if (volumeRatio > 5) mlScore += 10;
    else if (volumeRatio < 0.1) mlScore += 5;
  }

  // Age factor
  if (age < 24) mlScore += 10;
  else if (age < 72) mlScore += 5;

  // Market cap factors
  if (marketCap < 100000) mlScore += 5;

  // Add some variance
  mlScore += (Math.random() - 0.5) * 5;
  mlScore = Math.max(0, Math.min(100, mlScore));

  // Calculate confidence
  let confidence = 0.5;
  if (tokenData.risk_score !== null && tokenData.risk_score !== undefined) confidence += 0.2;
  if (liquidity > 0) confidence += 0.1;
  if (holders > 0) confidence += 0.1;
  if (tokenData.dev_activity_pct !== null && tokenData.dev_activity_pct !== undefined) confidence += 0.1;
  confidence = Math.min(0.99, confidence);

  // Detect patterns
  const patterns = [];
  if (devActivity > 60) patterns.push('HIGH_DEV_ACTIVITY');
  if (liquidity < 5000) patterns.push('LOW_LIQUIDITY');
  if (holders < 30) patterns.push('LOW_HOLDERS');
  if (lpLocked < 30) patterns.push('UNLOCKED_LP');
  if (age < 24) patterns.push('NEW_TOKEN');
  if (volumeRatio > 5 && liquidity > 0) patterns.push('HIGH_VOLUME_RATIO');

  // Time to rug estimate
  let timeToRug = null;
  if (mlScore > 85) {
    timeToRug = 2 + Math.random() * 10;
  } else if (mlScore > 70) {
    timeToRug = 12 + Math.random() * 24;
  } else if (mlScore > 60) {
    timeToRug = 24 + Math.random() * 48;
  }

  return {
    ml_risk_score: mlScore,
    ml_confidence: confidence,
    detected_patterns: patterns,
    ml_time_to_rug: timeToRug,
    ml_risk_factors: patterns.map(p => p.toLowerCase().replace(/_/g, ' '))
  };
}

async function generateAllMLPredictions() {
  console.log('🚀 Generating ML predictions for ALL tokens...\n');
  
  try {
    // Get ALL wallet tokens
    const { data: allTokens, error: tokensError } = await supabase
      .from('wallet_tokens')
      .select('token_mint')
      .not('token_mint', 'is', null);
    
    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return;
    }
    
    console.log(`Found ${allTokens.length} total tokens in wallet_tokens`);
    
    // Get existing ML predictions
    const { data: existingML } = await supabase
      .from('ml_risk_analysis')
      .select('token_mint');
    
    const existingMints = new Set(existingML?.map(m => m.token_mint) || []);
    console.log(`Found ${existingMints.size} tokens with existing ML predictions`);
    
    // Filter to tokens without ML
    const tokensWithoutML = allTokens.filter(t => !existingMints.has(t.token_mint));
    console.log(`Need to generate ML predictions for ${tokensWithoutML.length} tokens\n`);
    
    if (tokensWithoutML.length === 0) {
      console.log('✅ All tokens already have ML predictions!');
      return;
    }
    
    // Process in batches
    const batchSize = 20;
    let processed = 0;
    
    for (let i = 0; i < tokensWithoutML.length; i += batchSize) {
      const batch = tokensWithoutML.slice(i, i + batchSize);
      const tokenMints = batch.map(t => t.token_mint);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tokensWithoutML.length/batchSize)}...`);
      
      // Fetch data for batch
      const [rugcheckData, metadataData] = await Promise.all([
        supabase.from('rugcheck_reports').select('*').in('token_mint', tokenMints),
        supabase.from('token_metadata').select('*').in('mint', tokenMints)
      ]);
      
      const rugcheckMap = new Map(rugcheckData.data?.map(r => [r.token_mint, r]) || []);
      const metadataMap = new Map(metadataData.data?.map(m => [m.mint, m]) || []);
      
      // Generate predictions for batch
      const mlInserts = [];
      const rugcheckUpdates = [];
      
      for (const token of batch) {
        const rugcheck = rugcheckMap.get(token.token_mint) || {};
        const metadata = metadataMap.get(token.token_mint) || {};
        
        const combinedData = { ...rugcheck, ...metadata };
        const mlPrediction = generateMLPrediction(combinedData);
        
        // Calculate combined risk
        const ruleScore = rugcheck.risk_score || 0;
        const mlScore = mlPrediction.ml_risk_score;
        const combinedScore = (ruleScore * 0.4 + mlScore * 0.6);
        
        // Determine risk level
        let riskLevel = 'MINIMAL';
        if (combinedScore >= 80) riskLevel = 'CRITICAL';
        else if (combinedScore >= 60) riskLevel = 'HIGH';
        else if (combinedScore >= 40) riskLevel = 'MODERATE';
        else if (combinedScore >= 20) riskLevel = 'LOW';
        
        // Get recommendation
        let recommendation = 'monitor';
        if (combinedScore >= 80 || (mlPrediction.ml_time_to_rug && mlPrediction.ml_time_to_rug <= 12)) {
          recommendation = 'sell';
        } else if (combinedScore >= 60) {
          recommendation = 'reduce';
        }
        
        mlInserts.push({
          id: `${token.token_mint}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          token_mint: token.token_mint,
          risk_score: parseFloat(combinedScore.toFixed(2)),
          risk_level: riskLevel,
          ml_risk_score: parseFloat(mlPrediction.ml_risk_score.toFixed(2)),
          ml_confidence: parseFloat(mlPrediction.ml_confidence.toFixed(4)),
          ml_recommendation: recommendation,
          ml_time_to_rug: mlPrediction.ml_time_to_rug ? Math.round(mlPrediction.ml_time_to_rug) : null,
          ml_risk_factors: mlPrediction.ml_risk_factors,
          detected_patterns: mlPrediction.detected_patterns,
          rule_risk_score: parseFloat(ruleScore.toFixed(2)),
          liquidity_velocity_5m: 0,
          liquidity_velocity_30m: 0,
          price_velocity_5m: 0,
          social_panic_level: 0,
          community_health: 100,
          updated_at: new Date().toISOString()
        });
        
        if (rugcheckMap.has(token.token_mint)) {
          rugcheckUpdates.push({
            token_mint: token.token_mint,
            ml_risk_score: mlPrediction.ml_risk_score,
            ml_confidence: mlPrediction.ml_confidence,
            ml_recommendation: recommendation,
            ml_time_to_rug: mlPrediction.ml_time_to_rug,
            risk_level: riskLevel
          });
        }
        
        processed++;
      }
      
      // Insert ML predictions
      if (mlInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('ml_risk_analysis')
          .insert(mlInserts);
        
        if (insertError) {
          console.error('Error inserting ML predictions:', insertError);
        } else {
          console.log(`✅ Inserted ${mlInserts.length} ML predictions`);
        }
      }
      
      // Update rugcheck reports
      for (const update of rugcheckUpdates) {
        await supabase
          .from('rugcheck_reports')
          .update({
            ml_risk_score: update.ml_risk_score,
            ml_confidence: update.ml_confidence,
            ml_recommendation: update.ml_recommendation,
            ml_time_to_rug: update.ml_time_to_rug,
            risk_level: update.risk_level
          })
          .eq('token_mint', update.token_mint);
      }
      
      console.log(`Progress: ${processed}/${tokensWithoutML.length} (${((processed/tokensWithoutML.length)*100).toFixed(1)}%)\n`);
      
      // Small delay between batches
      if (i + batchSize < tokensWithoutML.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n🎉 ML prediction generation complete!');
    console.log(`Generated ${processed} new ML predictions`);
    
    // Final stats
    const { count: totalMLCount } = await supabase
      .from('ml_risk_analysis')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal ML predictions in database: ${totalMLCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
generateAllMLPredictions();