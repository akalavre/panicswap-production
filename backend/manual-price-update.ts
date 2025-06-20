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

async function updateTokenPrices() {
  console.log('Manually updating token prices...\n');

  try {
    // 1. Get a sample of tokens to update (including SOL)
    const testTokens = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    ];

    // 2. Get some active tokens from the database
    const { data: activeTokens } = await supabase
      .from('token_metadata')
      .select('mint')
      .eq('is_active', true)
      .limit(5);

    if (activeTokens) {
      activeTokens.forEach(token => testTokens.push(token.mint));
    }

    console.log(`Updating prices for ${testTokens.length} tokens...`);

    // 3. Fetch prices from Jupiter
    const priceIds = [...new Set(testTokens)].join(',');
    const jupiterResponse = await axios.get(jupiterApiUrl, {
      params: { ids: priceIds }
    });

    const jupiterPrices = jupiterResponse.data.data || {};
    console.log(`Received prices for ${Object.keys(jupiterPrices).length} tokens from Jupiter`);

    // 4. Update prices in database
    const updates = [];
    for (const [mint, priceData] of Object.entries(jupiterPrices)) {
      const price = (priceData as any).price || 0;
      if (price > 0) {
        updates.push({
          token_mint: mint,
          price: price,
          price_usd: price,
          liquidity: 0, // Jupiter doesn't provide liquidity
          platform: 'jupiter',
          updated_at: new Date().toISOString()
        });
      }
    }

    if (updates.length > 0) {
      // Upsert prices
      const { error } = await supabase
        .from('token_prices')
        .upsert(updates, {
          onConflict: 'token_mint'
        });

      if (error) {
        console.error('Error updating prices:', error);
      } else {
        console.log(`Successfully updated ${updates.length} token prices`);
        
        // Show updated prices
        console.log('\nUpdated prices:');
        updates.forEach(update => {
          console.log(`- ${update.token_mint.substring(0, 8)}...: $${update.price}`);
        });
      }
    }

    // 5. Also insert into pool_updates for Supabase Realtime
    console.log('\n5. Creating pool_updates for realtime...');
    const poolUpdates = updates.map(update => ({
      token_mint: update.token_mint,
      pool_address: `jupiter-${update.token_mint}`, // Fake pool address
      update_type: 'price',
      old_value: null,
      new_value: update.price,
      change_percentage: 0,
      metadata: { source: 'manual-update' }
    }));

    const { error: poolError } = await supabase
      .from('pool_updates')
      .insert(poolUpdates);

    if (poolError) {
      console.error('Error creating pool updates:', poolError);
    } else {
      console.log(`Created ${poolUpdates.length} pool update records for realtime`);
    }

    // 6. Verify updates
    console.log('\n6. Verifying updates...');
    const { data: verifyData } = await supabase
      .from('token_prices')
      .select('token_mint, price, updated_at')
      .in('token_mint', testTokens)
      .order('updated_at', { ascending: false });

    if (verifyData) {
      console.log('\nVerified prices:');
      verifyData.forEach(price => {
        const secondsAgo = Math.floor((Date.now() - new Date(price.updated_at).getTime()) / 1000);
        console.log(`- ${price.token_mint.substring(0, 8)}...: $${price.price} (${secondsAgo}s ago)`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the update
updateTokenPrices().then(() => {
  console.log('\nManual price update completed');
  process.exit(0);
});