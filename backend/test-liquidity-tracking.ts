import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testLiquidityTracking() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Testing liquidity tracking...\n');
  
  // Check if token_price_history has any data
  const { count: historyCount } = await supabase
    .from('token_price_history')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total records in token_price_history: ${historyCount || 0}`);
  
  // Get a sample of recent price history
  const { data: recentHistory, error: historyError } = await supabase
    .from('token_price_history')
    .select('token_mint, price, liquidity, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(5);
    
  if (historyError) {
    console.error('Error fetching history:', historyError);
  } else if (recentHistory && recentHistory.length > 0) {
    console.log('\nRecent price history entries:');
    recentHistory.forEach(entry => {
      console.log(`  ${entry.token_mint}: $${entry.price} | Liq: $${entry.liquidity || 0} | ${entry.recorded_at}`);
    });
  }
  
  // Test the SQL function with a known token
  const testTokenMint = '8QtinubBxnsg1v8VX1cs1eeEVMZPztW4DLosouJUpump'; // One of your test tokens
  
  console.log(`\nTesting price/liquidity changes for token: ${testTokenMint}`);
  
  const { data: changes, error: changesError } = await supabase
    .rpc('calculate_token_changes', { p_token_mint: testTokenMint });
    
  if (changesError) {
    console.error('Error calculating changes:', changesError);
  } else if (changes && changes.length > 0) {
    const change = changes[0];
    console.log(`  Current Price: $${change.current_price || 0}`);
    console.log(`  Current Liquidity: $${change.current_liquidity || 0}`);
    console.log(`  1h Price Change: ${change.price_change_1h?.toFixed(2) || 'N/A'}%`);
    console.log(`  24h Price Change: ${change.price_change_24h?.toFixed(2) || 'N/A'}%`);
    console.log(`  1h Liquidity Change: ${change.liquidity_change_1h?.toFixed(2) || 'N/A'}%`);
    console.log(`  24h Liquidity Change: ${change.liquidity_change_24h?.toFixed(2) || 'N/A'}%`);
  }
  
  // Test batch function
  console.log('\nTesting batch calculation for multiple tokens...');
  
  const { data: testTokens } = await supabase
    .from('wallet_tokens')
    .select('token_mint')
    .eq('is_test_token', true)
    .limit(3);
    
  if (testTokens && testTokens.length > 0) {
    const tokenMints = testTokens.map(t => t.token_mint);
    
    const { data: batchChanges, error: batchError } = await supabase
      .rpc('calculate_multiple_token_changes', { p_token_mints: tokenMints });
      
    if (batchError) {
      console.error('Error in batch calculation:', batchError);
    } else if (batchChanges) {
      console.log(`\nCalculated changes for ${batchChanges.length} tokens:`);
      batchChanges.forEach((change: any) => {
        console.log(`\n  Token: ${change.token_mint}`);
        console.log(`    1h Liquidity Change: ${change.liquidity_change_1h?.toFixed(2) || 'N/A'}%`);
        console.log(`    24h Price Change: ${change.price_change_24h?.toFixed(2) || 'N/A'}%`);
      });
    }
  }
}

testLiquidityTracking().catch(console.error);