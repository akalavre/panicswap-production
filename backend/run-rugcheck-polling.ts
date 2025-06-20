import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { RugCheckPollingServiceV2 } from './src/services/RugCheckPollingServiceV2';

async function runRugcheckPolling() {
  console.log('Starting RugCheck polling for launch times...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check tokens that need launch time
  const { data: tokensNeedingLaunchTime } = await supabase
    .from('wallet_tokens')
    .select(`
      token_mint,
      token_metadata!inner(symbol, name)
    `)
    .limit(20);
    
  console.log(`Found ${tokensNeedingLaunchTime?.length || 0} wallet tokens`);
  
  // Check which ones are missing launch_time in rugcheck_reports
  for (const token of tokensNeedingLaunchTime || []) {
    const { data: rugcheckData } = await supabase
      .from('rugcheck_reports')
      .select('launch_time')
      .eq('token_mint', token.token_mint)
      .single();
      
    if (!rugcheckData || !rugcheckData.launch_time) {
      console.log(`Token ${token.token_metadata.symbol} (${token.token_mint}) needs launch_time`);
    }
  }
  
  // Initialize and run the service
  console.log('\nStarting RugCheck polling service...');
  const service = new RugCheckPollingServiceV2(supabase);
  
  // Start polling (it will automatically process active tokens)
  await service.startPolling();
  
  console.log('RugCheck polling service is running. Press Ctrl+C to stop.');
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nStopping RugCheck polling service...');
    process.exit(0);
  });
}

// Run the service
runRugcheckPolling().catch(console.error);