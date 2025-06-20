import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkTestTokenAges() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get test tokens with their metadata
  const { data: testTokens, error } = await supabase
    .from('wallet_tokens')
    .select(`
      token_mint,
      is_test_token,
      added_at,
      token_metadata!inner(symbol, name)
    `)
    .eq('is_test_token', true)
    .limit(10);
    
  if (error) {
    console.error('Error fetching test tokens:', error);
    return;
  }
  
  console.log(`\nFound ${testTokens?.length || 0} test tokens:\n`);
  
  // Check each test token for launch time in rugcheck_reports
  for (const token of testTokens || []) {
    const { data: rugcheck, error: rugcheckError } = await supabase
      .from('rugcheck_reports')
      .select('launch_time, risk_score')
      .eq('token_mint', token.token_mint)
      .single();
      
    if (rugcheckError && rugcheckError.code !== 'PGRST116') {
      console.error(`Error checking rugcheck for ${token.token_mint}:`, rugcheckError);
      continue;
    }
    
    const metadata = (token as any).token_metadata;
    console.log(`Token: ${metadata?.symbol || 'UNKNOWN'} (${metadata?.name || 'Unknown'})`);
    console.log(`  Mint: ${token.token_mint}`);
    console.log(`  Added: ${token.added_at}`);
    
    if (rugcheck?.launch_time) {
      const launchDate = new Date(rugcheck.launch_time);
      const ageMs = Date.now() - launchDate.getTime();
      const ageMinutes = Math.floor(ageMs / (1000 * 60));
      const ageHours = Math.floor(ageMinutes / 60);
      const ageDays = Math.floor(ageHours / 24);
      
      let ageStr = '';
      if (ageDays > 0) {
        ageStr = `${ageDays}d ${ageHours % 24}h`;
      } else if (ageHours > 0) {
        ageStr = `${ageHours}h ${ageMinutes % 60}m`;
      } else if (ageMinutes > 0) {
        ageStr = `${ageMinutes}m`;
      } else {
        ageStr = 'NEW';
      }
      
      console.log(`  Launch Time: ${rugcheck.launch_time}`);
      console.log(`  Age: ${ageStr}`);
      console.log(`  Risk Score: ${rugcheck.risk_score || 'N/A'}`);
    } else {
      console.log(`  Launch Time: NOT SET - Creating now...`);
      
      // Create rugcheck report with launch time for test tokens
      const { error: createError } = await supabase
        .from('rugcheck_reports')
        .upsert({
          token_mint: token.token_mint,
          launch_time: token.added_at || new Date().toISOString(),
          risk_score: 50,
          honeypot_status: 'safe',
          last_checked: Date.now()
        }, {
          onConflict: 'token_mint'
        });
        
      if (createError) {
        console.error(`  Error creating rugcheck report:`, createError);
      } else {
        console.log(`  ✓ Created rugcheck report with launch time`);
      }
    }
    
    console.log('');
  }
}

checkTestTokenAges().catch(console.error);