import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function addTestTokenLaunchTimes() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get all test tokens
  const { data: testTokens, error } = await supabase
    .from('wallet_tokens')
    .select('token_mint, added_at')
    .eq('is_test_token', true);
    
  if (error) {
    console.error('Error fetching test tokens:', error);
    return;
  }
  
  console.log(`Found ${testTokens?.length || 0} test tokens`);
  
  // Add launch time for each test token
  for (const token of testTokens || []) {
    console.log(`\nProcessing token ${token.token_mint}`);
    
    // Use the token's added_at time as the launch time
    const launchTime = token.added_at || new Date().toISOString();
    
    const { error: upsertError } = await supabase
      .from('rugcheck_reports')
      .upsert({
        token_mint: token.token_mint,
        launch_time: launchTime,
        risk_score: 50,
        honeypot_status: 'safe'
      }, {
        onConflict: 'token_mint',
        ignoreDuplicates: false
      });
      
    if (upsertError) {
      console.error(`  Error:`, upsertError);
    } else {
      console.log(`  ✓ Set launch time to ${launchTime}`);
    }
  }
  
  console.log('\nDone!');
}

addTestTokenLaunchTimes().catch(console.error);