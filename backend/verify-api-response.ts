import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Import the ExpressApiService to test the actual API logic
import { ExpressApiService } from './src/services/ExpressApiService';

async function verifyApiResponse() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test wallet
  const walletAddress = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
  
  console.log('Testing API response for wallet:', walletAddress);
  console.log('');
  
  // 1. Get wallet tokens with all the joins like the API does
  const { data: walletTokens, error: walletError } = await supabase
    .from('wallet_tokens')
    .select(`
      token_mint,
      balance,
      token_metadata!inner (
        mint,
        symbol,
        name,
        logo_uri,
        decimals,
        platform
      )
    `)
    .eq('wallet_address', walletAddress);
    
  if (walletError) {
    console.error('Error fetching wallet tokens:', walletError);
    return;
  }
  
  console.log(`Found ${walletTokens?.length || 0} active wallet tokens`);
  
  if (!walletTokens || walletTokens.length === 0) {
    return;
  }
  
  // Get token mints
  const tokenMints = walletTokens.map(wt => wt.token_mint);
  
  // 2. Get price changes using the SQL function
  const { data: priceChanges, error: changesError } = await supabase
    .rpc('calculate_multiple_token_changes', { p_token_mints: tokenMints });
    
  if (changesError) {
    console.error('Error calculating changes:', changesError);
    return;
  }
  
  // Create a map for easy lookup
  const changesMap = new Map<string, any>();
  priceChanges?.forEach((change: any) => {
    changesMap.set(change.token_mint, change);
  });
  
  // 3. Get rugcheck reports for launch times
  const { data: rugcheckReports, error: rugcheckError } = await supabase
    .from('rugcheck_reports')
    .select('token_mint, launch_time')
    .in('token_mint', tokenMints);
    
  if (rugcheckError) {
    console.error('Error fetching rugcheck reports:', rugcheckError);
  }
  
  const rugcheckMap = new Map<string, string>();
  rugcheckReports?.forEach((report: any) => {
    if (report.launch_time) {
      rugcheckMap.set(report.token_mint, report.launch_time);
    }
  });
  
  // 4. Display the final token data as it would appear in the API
  console.log('\nFinal token data with liquidity changes:');
  console.log('==========================================');
  
  walletTokens.forEach((walletToken: any) => {
    const mint = walletToken.token_mint;
    const metadata = walletToken.token_metadata;
    const changes = changesMap.get(mint) || {};
    const launchTime = rugcheckMap.get(mint) || null;
    
    console.log(`\nToken: ${metadata.symbol} (${metadata.name})`);
    console.log(`  Mint: ${mint.slice(0, 20)}...`);
    console.log(`  Price: $${changes.current_price || 0}`);
    console.log(`  Liquidity: $${changes.current_liquidity || 0}`);
    console.log(`  1h Liquidity Change: ${(changes.liquidity_change_1h || 0).toFixed(2)}%`);
    console.log(`  24h Liquidity Change: ${(changes.liquidity_change_24h || 0).toFixed(2)}%`);
    console.log(`  24h Price Change: ${(changes.price_change_24h || 0).toFixed(2)}%`);
    console.log(`  Launch Time: ${launchTime || 'N/A'}`);
  });
}

verifyApiResponse().catch(console.error);