import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testDirectQuery() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test the data flow for a specific wallet
  const walletAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
  
  // 1. Get wallet tokens
  const { data: walletTokens, error: walletError } = await supabase
    .from('wallet_tokens')
    .select('token_mint')
    .eq('wallet_address', walletAddress);
    
  if (walletError) {
    console.error('Error fetching wallet tokens:', walletError);
    return;
  }
  
  console.log(`Found ${walletTokens?.length || 0} tokens for wallet`);
  
  if (!walletTokens || walletTokens.length === 0) {
    return;
  }
  
  const tokenMints = walletTokens.map(wt => wt.token_mint);
  
  // 2. Test the SQL function directly
  const { data: changes, error: changesError } = await supabase
    .rpc('calculate_multiple_token_changes', { p_token_mints: tokenMints });
    
  if (changesError) {
    console.error('Error calculating changes:', changesError);
    return;
  }
  
  console.log('\nLiquidity changes from SQL function:');
  changes?.forEach((change: any) => {
    console.log(`${change.token_mint.slice(0, 8)}...`);
    console.log(`  1h liquidity change: ${change.liquidity_change_1h?.toFixed(2) || '0.00'}%`);
    console.log(`  24h liquidity change: ${change.liquidity_change_24h?.toFixed(2) || '0.00'}%`);
    console.log(`  Current liquidity: $${change.current_liquidity || 0}`);
  });
  
  // 3. Check token_price_history table
  console.log('\nChecking price history entries...');
  const { data: history, error: historyError } = await supabase
    .from('token_price_history')
    .select('token_mint, recorded_at, price, liquidity')
    .in('token_mint', tokenMints.slice(0, 2)) // Just check first 2 tokens
    .order('recorded_at', { ascending: false })
    .limit(10);
    
  if (historyError) {
    console.error('Error fetching history:', historyError);
  } else {
    console.log(`\nFound ${history?.length || 0} recent history entries`);
    history?.forEach((entry: any) => {
      console.log(`${entry.token_mint.slice(0, 8)}... at ${new Date(entry.recorded_at).toISOString()}`);
      console.log(`  Price: $${entry.price}, Liquidity: $${entry.liquidity}`);
    });
  }
}

testDirectQuery().catch(console.error);