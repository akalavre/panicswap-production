import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testActiveTokens() {
  console.log('Testing active tokens and price polling...\n');

  try {
    // 1. Check active tokens
    console.log('1. Checking active tokens in token_metadata:');
    const { data: activeTokens, error: activeError } = await supabase
      .from('token_metadata')
      .select('mint, symbol, is_active, last_active_at')
      .eq('is_active', true)
      .order('last_active_at', { ascending: false })
      .limit(10);

    if (activeError) {
      console.error('Error fetching active tokens:', activeError);
    } else {
      console.log(`Found ${activeTokens?.length || 0} active tokens`);
      if (activeTokens && activeTokens.length > 0) {
        console.log('\nActive tokens:');
        activeTokens.forEach(token => {
          const lastActive = token.last_active_at ? new Date(token.last_active_at) : null;
          const minutesAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 60000) : 'Never';
          console.log(`- ${token.symbol}: ${token.mint.substring(0, 8)}... (last active: ${minutesAgo} minutes ago)`);
        });
      }
    }

    // 2. Check if any tokens have been marked active recently
    console.log('\n2. Checking recently activated tokens:');
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentActive, error: recentActiveError } = await supabase
      .from('token_metadata')
      .select('mint, symbol, last_active_at')
      .gte('last_active_at', oneHourAgo)
      .order('last_active_at', { ascending: false });

    if (recentActiveError) {
      console.error('Error fetching recent active tokens:', recentActiveError);
    } else {
      console.log(`Found ${recentActive?.length || 0} tokens activated in the last hour`);
    }

    // 3. Check wallet_tokens for recent activity
    console.log('\n3. Checking recent wallet token activity:');
    const { data: recentWalletTokens, error: walletError } = await supabase
      .from('wallet_tokens')
      .select('token_mint, wallet_address, last_seen_at')
      .gte('last_seen_at', oneHourAgo)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    if (walletError) {
      console.error('Error fetching recent wallet tokens:', walletError);
    } else {
      console.log(`Found ${recentWalletTokens?.length || 0} wallet tokens seen in the last hour`);
      if (recentWalletTokens && recentWalletTokens.length > 0) {
        console.log('\nRecent wallet tokens:');
        recentWalletTokens.forEach(wt => {
          console.log(`- ${wt.token_mint.substring(0, 8)}... from wallet ${wt.wallet_address.substring(0, 8)}...`);
        });
      }
    }

    // 4. Manual test: Mark a token as active to see if price polling picks it up
    console.log('\n4. Testing price polling trigger:');
    const testMint = 'So11111111111111111111111111111111111111112'; // SOL
    
    // First, ensure SOL is in token_metadata
    const { error: upsertError } = await supabase
      .from('token_metadata')
      .upsert({
        mint: testMint,
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        is_active: true,
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'mint'
      });

    if (upsertError) {
      console.error('Error marking SOL as active:', upsertError);
    } else {
      console.log('Successfully marked SOL as active for price polling');
      
      // Wait a few seconds and check if price was updated
      console.log('Waiting 5 seconds for price polling...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { data: solPrice, error: priceError } = await supabase
        .from('token_prices')
        .select('*')
        .eq('token_mint', testMint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (priceError) {
        console.error('Error fetching SOL price:', priceError);
      } else if (solPrice) {
        const updateTime = new Date(solPrice.updated_at);
        const secondsAgo = Math.floor((Date.now() - updateTime.getTime()) / 1000);
        console.log(`SOL price: $${solPrice.price || solPrice.price_usd}, last updated ${secondsAgo} seconds ago`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testActiveTokens().then(() => {
  console.log('\nTest completed');
  process.exit(0);
});