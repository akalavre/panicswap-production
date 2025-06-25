// Verify monitoring is working
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_TOKEN = '2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function verifyMonitoring() {
  console.log('🔍 Verifying monitoring setup...\n');
  
  try {
    // Check monitoring stats
    const { data: stats, error } = await supabase
      .from('monitoring_stats')
      .select('*')
      .eq('token_mint', TEST_TOKEN)
      .eq('wallet_address', TEST_WALLET)
      .single();
      
    if (error) {
      console.error('❌ Error fetching monitoring stats:', error);
      return;
    }
    
    if (!stats) {
      console.error('❌ No monitoring stats found');
      return;
    }
    
    console.log('✅ Monitoring Stats Found:');
    console.log('   - Active monitors:', stats.active_monitors);
    console.log('   - Current liquidity:', stats.current_liquidity);
    console.log('   - Liquidity change (5m):', stats.liquidity_change_5m + '%');
    console.log('   - Price change (5m):', stats.price_change_5m + '%');
    console.log('   - Pattern detected:', stats.highest_risk_pattern || 'None');
    console.log('   - Pattern confidence:', stats.pattern_confidence || 0);
    console.log('   - Last check:', stats.last_check_at);
    
    if (stats.active_patterns && stats.active_patterns.length > 0) {
      console.log('\n📊 Active Patterns:');
      stats.active_patterns.forEach(pattern => {
        console.log(`   - ${pattern.type}: ${pattern.description} (${pattern.confidence * 100}% confidence)`);
      });
    }
    
    console.log('\n✨ Monitoring is working! The API should show this data.');
    console.log('\n📝 To see in browser:');
    console.log('   1. Go to: http://localhost/PanicSwap-php/test-monitoring-api.html');
    console.log('   2. Click "Test Monitoring Status API"');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

verifyMonitoring();