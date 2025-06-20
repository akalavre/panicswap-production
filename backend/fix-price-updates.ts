import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Jupiter API for price data
const jupiterApiUrl = 'https://api.jup.ag/price/v2';

async function fixPriceUpdates() {
  console.log('Fixing price update system...\n');

  try {
    // 1. First ensure common tokens exist in token_metadata
    console.log('1. Ensuring common tokens exist in metadata...');
    const commonTokens = [
      { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
    ];

    for (const token of commonTokens) {
      const { error } = await supabase
        .from('token_metadata')
        .upsert({
          ...token,
          is_active: true,
          last_active_at: new Date().toISOString()
        }, {
          onConflict: 'mint'
        });
      
      if (error) {
        console.error(`Error upserting ${token.symbol}:`, error);
      } else {
        console.log(`✓ Ensured ${token.symbol} exists in metadata`);
      }
    }

    // 2. Get all tokens that need price updates
    console.log('\n2. Getting tokens that need price updates...');
    const { data: tokensNeedingPrices } = await supabase
      .from('token_metadata')
      .select('mint, symbol')
      .eq('is_active', true);

    if (!tokensNeedingPrices || tokensNeedingPrices.length === 0) {
      console.log('No active tokens found');
      return;
    }

    console.log(`Found ${tokensNeedingPrices.length} active tokens`);

    // 3. Fetch prices from Jupiter for active tokens
    const mints = tokensNeedingPrices.map(t => t.mint);
    const priceIds = mints.join(',');
    
    console.log('\n3. Fetching prices from Jupiter...');
    const jupiterResponse = await axios.get(jupiterApiUrl, {
      params: { ids: priceIds }
    });

    const jupiterPrices = jupiterResponse.data.data || {};
    console.log(`Received prices for ${Object.keys(jupiterPrices).length} tokens`);

    // 4. Update prices in database
    console.log('\n4. Updating prices in database...');
    let successCount = 0;
    
    for (const token of tokensNeedingPrices) {
      const priceData = jupiterPrices[token.mint];
      if (priceData && priceData.price) {
        const { error } = await supabase
          .from('token_prices')
          .upsert({
            token_mint: token.mint,
            price: priceData.price,
            price_usd: priceData.price,
            liquidity: 0,
            platform: 'jupiter',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'token_mint'
          });

        if (!error) {
          successCount++;
          console.log(`✓ Updated ${token.symbol}: $${priceData.price}`);
          
          // Also create a pool_update for realtime
          await supabase
            .from('pool_updates')
            .insert({
              token_mint: token.mint,
              pool_address: `jupiter-${token.mint}`,
              update_type: 'price',
              old_value: null,
              new_value: priceData.price,
              change_percentage: 0,
              metadata: { source: 'fix-script' }
            });
        }
      }
    }

    console.log(`\nSuccessfully updated ${successCount} token prices`);

    // 5. Test with a specific wallet
    console.log('\n5. Testing with a wallet...');
    const testWallet = 'GH1TpdwvPJNgvZ1jfwvxzTKecNVQkJPLfNfCsYvcvnVu';
    
    // First sync the wallet to ensure tokens are in wallet_tokens
    const { data: walletTokens } = await supabase
      .from('wallet_tokens')
      .select('token_mint')
      .eq('wallet_address', testWallet)
      .limit(5);

    if (walletTokens && walletTokens.length > 0) {
      console.log(`\nWallet ${testWallet} has ${walletTokens.length} tokens`);
      
      // Check if these tokens have prices
      const walletMints = walletTokens.map(wt => wt.token_mint);
      const { data: walletPrices } = await supabase
        .from('token_prices')
        .select('token_mint, price, updated_at')
        .in('token_mint', walletMints);

      if (walletPrices) {
        console.log('\nWallet token prices:');
        walletPrices.forEach(p => {
          const secondsAgo = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 1000);
          console.log(`- ${p.token_mint.substring(0, 8)}...: $${p.price} (${secondsAgo}s ago)`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixPriceUpdates().then(() => {
  console.log('\nPrice update fix completed');
  process.exit(0);
});