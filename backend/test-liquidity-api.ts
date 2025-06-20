import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Extend process.env type
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_SERVICE_KEY: string;
    }
  }
}

async function testLiquidityAPI() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test the SQL function directly
  console.log('Testing liquidity change calculations...\n');
  
  // Get a few test tokens
  const testTokens = [
    '3ckPwKXo8gtWCWpskGmCCowU1uoZC3PjQ2yjce5Apump', // omw
    '2whpuPtYRhxzvHBzfJPTxNdkebYZeZBeuF7ZZPn5pump', // LSD25
  ];
  
  for (const mint of testTokens) {
    const { data: changes, error } = await supabase
      .rpc('calculate_token_changes', { p_token_mint: mint });
      
    if (error) {
      console.error(`Error calculating changes for ${mint}:`, error);
    } else if (changes && changes.length > 0) {
      const result = changes[0];
      console.log(`Token: ${mint}`);
      console.log(`  Current Price: $${result.current_price}`);
      console.log(`  Current Liquidity: $${result.current_liquidity}`);
      console.log(`  1h Price Change: ${result.price_change_1h?.toFixed(2) || '0.00'}%`);
      console.log(`  24h Price Change: ${result.price_change_24h?.toFixed(2) || 'N/A'}%`);
      console.log(`  1h Liquidity Change: ${result.liquidity_change_1h?.toFixed(2) || '0.00'}%`);
      console.log(`  24h Liquidity Change: ${result.liquidity_change_24h?.toFixed(2) || 'N/A'}%`);
      console.log('');
    } else {
      console.log(`No data for ${mint}\n`);
    }
  }
  
  // Now test the multiple token function
  console.log('\nTesting batch calculation...');
  const { data: batchChanges, error: batchError } = await supabase
    .rpc('calculate_multiple_token_changes', { p_token_mints: testTokens });
    
  if (batchError) {
    console.error('Batch calculation error:', batchError);
  } else {
    console.log(`Got changes for ${batchChanges?.length || 0} tokens`);
    batchChanges?.forEach((change: any) => {
      console.log(`  ${change.token_mint}: 1h liq change = ${change.liquidity_change_1h?.toFixed(2) || '0.00'}%`);
    });
  }
}

testLiquidityAPI().catch(console.error);