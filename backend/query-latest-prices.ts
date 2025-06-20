import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://cfficjjdhgqwqprfhlrj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryLatestPrices() {
  console.log('Querying latest token prices from token_price_history...\n');

  // Method 1: Get the latest price for each token using a window function
  const { data: latestPrices, error: latestError } = await supabase
    .rpc('get_latest_token_prices');

  if (latestError) {
    console.error('Error with RPC function (it might not exist):', latestError);
    
    // Method 2: Alternative approach using raw SQL query through Supabase
    // This gets the latest price for each token by using DISTINCT ON
    const { data: prices, error } = await supabase
      .from('token_price_history')
      .select('*')
      .order('token_mint', { ascending: true })
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error querying prices:', error);
      return;
    }

    // Group by token_mint and take the first (latest) entry for each
    const latestPriceMap = new Map<string, any>();
    prices?.forEach(price => {
      if (!latestPriceMap.has(price.token_mint)) {
        latestPriceMap.set(price.token_mint, price);
      }
    });

    console.log(`Found ${latestPriceMap.size} unique tokens with price history\n`);
    
    // Display the results
    Array.from(latestPriceMap.values())
      .slice(0, 10) // Show first 10 tokens
      .forEach(price => {
        console.log(`Token: ${price.token_mint.slice(0, 8)}...`);
        console.log(`  Price: $${price.price}`);
        console.log(`  Liquidity: $${price.liquidity || 'N/A'}`);
        console.log(`  Market Cap: $${price.market_cap || 'N/A'}`);
        console.log(`  Last Updated: ${new Date(price.recorded_at).toLocaleString()}`);
        console.log(`  Source: ${price.source || 'N/A'}\n`);
      });
  } else {
    // If RPC function exists, use its results
    console.log(`Found ${latestPrices?.length || 0} tokens with latest prices\n`);
    latestPrices?.slice(0, 10).forEach((price: any) => {
      console.log(`Token: ${price.token_mint.slice(0, 8)}...`);
      console.log(`  Price: $${price.price}`);
      console.log(`  Liquidity: $${price.liquidity || 'N/A'}`);
      console.log(`  Market Cap: $${price.market_cap || 'N/A'}`);
      console.log(`  Last Updated: ${new Date(price.recorded_at).toLocaleString()}\n`);
    });
  }
}

// Method 3: Get latest prices for specific token mints
async function queryLatestPricesForTokens(tokenMints: string[]) {
  console.log(`\nQuerying latest prices for ${tokenMints.length} specific tokens...\n`);

  // Using a subquery to get the latest recorded_at for each token
  const { data: prices, error } = await supabase
    .from('token_price_history')
    .select('*')
    .in('token_mint', tokenMints)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Error querying specific token prices:', error);
    return;
  }

  // Group by token_mint and take the latest entry
  const latestPrices = new Map<string, any>();
  prices?.forEach(price => {
    if (!latestPrices.has(price.token_mint)) {
      latestPrices.set(price.token_mint, price);
    }
  });

  latestPrices.forEach((price, mint) => {
    console.log(`Token: ${mint}`);
    console.log(`  Price: $${price.price}`);
    console.log(`  Liquidity: $${price.liquidity || 'N/A'}`);
    console.log(`  Market Cap: $${price.market_cap || 'N/A'}`);
    console.log(`  Last Updated: ${new Date(price.recorded_at).toLocaleString()}\n`);
  });
}

// Method 4: Create the SQL function if it doesn't exist
async function createLatestPricesFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION get_latest_token_prices()
    RETURNS TABLE (
      token_mint TEXT,
      price NUMERIC,
      liquidity NUMERIC,
      volume_24h NUMERIC,
      market_cap NUMERIC,
      recorded_at TIMESTAMPTZ,
      source TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT ON (tph.token_mint)
        tph.token_mint,
        tph.price,
        tph.liquidity,
        tph.volume_24h,
        tph.market_cap,
        tph.recorded_at,
        tph.source
      FROM token_price_history tph
      ORDER BY tph.token_mint, tph.recorded_at DESC;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.log('Note: Could not create SQL function (this is normal if you don\'t have exec_sql permissions)');
  } else {
    console.log('Successfully created get_latest_token_prices function');
  }
}

// Main execution
async function main() {
  // Try to create the function first (optional)
  await createLatestPricesFunction();
  
  // Query all latest prices
  await queryLatestPrices();
  
  // Example: Query specific tokens
  const exampleTokens = [
    'So11111111111111111111111111111111111111112', // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  ];
  
  await queryLatestPricesForTokens(exampleTokens);
}

main().catch(console.error);