import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testPriceLoading() {
  console.log('Testing price loading from Supabase...\n');

  try {
    // 1. Test token_prices table
    console.log('1. Checking token_prices table:');
    const { data: prices, error: pricesError } = await supabase
      .from('token_prices')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
    } else {
      console.log(`Found ${prices?.length || 0} price records`);
      if (prices && prices.length > 0) {
        console.log('Sample price record:', {
          token_mint: prices[0].token_mint,
          price: prices[0].price,
          price_usd: prices[0].price_usd,
          liquidity: prices[0].liquidity,
          updated_at: prices[0].updated_at
        });
        
        // Check if prices are recent
        const latestUpdate = new Date(prices[0].updated_at);
        const now = new Date();
        const minutesAgo = Math.floor((now.getTime() - latestUpdate.getTime()) / 60000);
        console.log(`Latest price update was ${minutesAgo} minutes ago`);
      }
    }

    // 2. Test wallet_tokens table
    console.log('\n2. Checking wallet_tokens table:');
    const { data: walletTokens, error: walletError } = await supabase
      .from('wallet_tokens')
      .select('*')
      .limit(5);

    if (walletError) {
      console.error('Error fetching wallet tokens:', walletError);
    } else {
      console.log(`Found ${walletTokens?.length || 0} wallet token records`);
    }

    // 3. Test token_metadata table
    console.log('\n3. Checking token_metadata table:');
    const { data: metadata, error: metadataError } = await supabase
      .from('token_metadata')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (metadataError) {
      console.error('Error fetching token metadata:', metadataError);
    } else {
      console.log(`Found ${metadata?.length || 0} active tokens`);
    }

    // 4. Test joining wallet_tokens with prices
    console.log('\n4. Testing wallet tokens with prices join:');
    const testWallet = '8TuBmuUU5LDo6yoRHpuLBo4dBAkjgPRcT8jQKD6cgN2r'; // Example wallet
    
    const { data: walletData, error: joinError } = await supabase
      .from('wallet_tokens')
      .select(`
        *,
        token_metadata!inner(*)
      `)
      .eq('wallet_address', testWallet)
      .limit(5);

    if (joinError) {
      console.error('Error fetching wallet data:', joinError);
    } else {
      console.log(`Found ${walletData?.length || 0} tokens for wallet ${testWallet}`);
      
      if (walletData && walletData.length > 0) {
        // Check if we can get prices for these tokens
        const tokenMints = walletData.map(wt => wt.token_mint);
        const { data: tokenPrices, error: tokenPricesError } = await supabase
          .from('token_prices')
          .select('*')
          .in('token_mint', tokenMints);
        
        if (tokenPricesError) {
          console.error('Error fetching prices for wallet tokens:', tokenPricesError);
        } else {
          console.log(`Found prices for ${tokenPrices?.length || 0} out of ${tokenMints.length} wallet tokens`);
        }
      }
    }

    // 5. Check if price polling service is updating prices
    console.log('\n5. Checking recent price updates:');
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentUpdates, error: recentError } = await supabase
      .from('token_prices')
      .select('token_mint, updated_at')
      .gte('updated_at', oneMinuteAgo);

    if (recentError) {
      console.error('Error checking recent updates:', recentError);
    } else {
      console.log(`Found ${recentUpdates?.length || 0} tokens updated in the last minute`);
    }

    // 6. Check pool_updates table (new price source)
    console.log('\n6. Checking pool_updates table:');
    const { data: poolUpdates, error: poolError } = await supabase
      .from('pool_updates')
      .select('*')
      .eq('update_type', 'price')
      .order('created_at', { ascending: false })
      .limit(5);

    if (poolError) {
      console.error('Error fetching pool updates:', poolError);
    } else {
      console.log(`Found ${poolUpdates?.length || 0} recent price updates in pool_updates`);
      if (poolUpdates && poolUpdates.length > 0) {
        console.log('Sample pool update:', {
          token_mint: poolUpdates[0].token_mint,
          new_value: poolUpdates[0].new_value,
          created_at: poolUpdates[0].created_at
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testPriceLoading().then(() => {
  console.log('\nTest completed');
  process.exit(0);
});