import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { RugCheckPollingServiceV2 } from './src/services/RugCheckPollingServiceV2';

async function testRugcheckLaunchTime() {
  console.log('Testing RugCheck launch time population...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get all tokens without launch_time
  const { data: tokensWithoutLaunchTime, error } = await supabase
    .from('rugcheck_reports')
    .select('token_mint')
    .is('launch_time', null)
    .limit(10);
    
  if (error) {
    console.error('Error fetching tokens:', error);
    return;
  }
  
  console.log(`Found ${tokensWithoutLaunchTime?.length || 0} tokens without launch_time`);
  
  if (!tokensWithoutLaunchTime || tokensWithoutLaunchTime.length === 0) {
    // Get all tokens to check
    const { data: allTokens } = await supabase
      .from('wallet_tokens')
      .select('token_mint')
      .limit(10);
      
    if (allTokens && allTokens.length > 0) {
      console.log('\nChecking wallet tokens for missing rugcheck reports...');
      for (const token of allTokens) {
        const { data: rugcheckData } = await supabase
          .from('rugcheck_reports')
          .select('launch_time')
          .eq('token_mint', token.token_mint)
          .single();
          
        if (!rugcheckData) {
          console.log(`Token ${token.token_mint} has no rugcheck report`);
        } else if (!rugcheckData.launch_time) {
          console.log(`Token ${token.token_mint} has rugcheck report but no launch_time`);
        }
      }
    }
  }
  
  // Initialize the service
  console.log('\nInitializing RugCheck service to populate launch times...');
  const service = new RugCheckPollingServiceV2(supabase);
  
  // Get token mints that need updates
  const tokenMints = tokensWithoutLaunchTime?.map(t => t.token_mint) || [];
  
  if (tokenMints.length > 0) {
    console.log(`Updating ${tokenMints.length} tokens immediately...`);
    await service.updateTokensImmediately(tokenMints);
  }
  
  // Check results
  console.log('\nChecking results...');
  for (const mint of tokenMints.slice(0, 5)) {
    const { data: updated } = await supabase
      .from('rugcheck_reports')
      .select('token_mint, launch_time')
      .eq('token_mint', mint)
      .single();
      
    if (updated?.launch_time) {
      const launchDate = new Date(updated.launch_time);
      const ageMs = Date.now() - launchDate.getTime();
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);
      
      console.log(`✓ ${mint}: ${ageDays}d ${ageHours % 24}h old`);
    } else {
      console.log(`✗ ${mint}: Still no launch_time`);
    }
  }
}

// Run the test
testRugcheckLaunchTime().catch(console.error);