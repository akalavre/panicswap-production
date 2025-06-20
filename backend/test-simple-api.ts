import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testSimpleApi() {
  const walletAddress = 'B63rTBZeCp8vYvgM5Zu53VtXJNS1k1jjsaxHnJcz8xKm';
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get wallet tokens
  const { data: walletTokens } = await supabase
    .from('wallet_tokens')
    .select('token_mint')
    .eq('wallet_address', walletAddress)
    .limit(3);
    
  if (!walletTokens || walletTokens.length === 0) {
    console.log('No tokens found for wallet');
    return;
  }
  
  const tokenMints = walletTokens.map(t => t.token_mint);
  console.log('Testing with tokens:', tokenMints);
  
  // Test the RPC function
  const { data: changes, error } = await supabase
    .rpc('calculate_multiple_token_changes', { p_token_mints: tokenMints });
    
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('\nRPC Results:');
    console.log(JSON.stringify(changes, null, 2));
  }
}

testSimpleApi().catch(console.error);