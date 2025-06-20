import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTestTokens() {
  console.log('🔍 Checking test tokens in database...\n');

  try {
    // Check wallet_tokens for test tokens
    const { data: testTokens, error } = await supabase
      .from('wallet_tokens')
      .select(`
        *,
        token_metadata!inner(*)
      `)
      .eq('is_test_token', true);

    if (error) {
      console.error('Error fetching test tokens:', error);
      return;
    }

    console.log(`Found ${testTokens?.length || 0} test tokens in database:\n`);

    if (testTokens && testTokens.length > 0) {
      testTokens.forEach((token: any) => {
        console.log(`📌 ${token.token_metadata.symbol} (${token.token_mint})`);
        console.log(`   Wallet: ${token.wallet_address}`);
        console.log(`   Balance: ${token.balance} (UI: ${token.ui_balance})`);
        console.log(`   Added: ${token.added_at}\n`);
      });
    } else {
      console.log('No test tokens found. Use the frontend to add some test tokens.');
    }

    // Also check if wallet exists
    const testWallet = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
    const { data: walletTokens, error: walletError } = await supabase
      .from('wallet_tokens')
      .select('*')
      .eq('wallet_address', testWallet);

    console.log(`\n🔍 Checking tokens for wallet ${testWallet}:`);
    console.log(`Found ${walletTokens?.length || 0} tokens total`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTestTokens();