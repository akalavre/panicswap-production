import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkPriceHistoryRange() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check the time range of price history data
  const { data: timeRange, error } = await supabase
    .from('token_price_history')
    .select('token_mint')
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);
    
  if (error) {
    console.error('Error checking time range:', error);
    return;
  }
  
  console.log('Checking if we have 24-hour old data...');
  console.log(`Found ${timeRange?.length || 0} records from 24 hours ago`);
  
  // Get the oldest and newest records
  const { data: stats, error: statsError } = await supabase
    .rpc('get_price_history_stats');
    
  if (!statsError && stats) {
    console.log('\nPrice history statistics:');
    console.log(`Oldest record: ${stats[0]?.oldest_record || 'N/A'}`);
    console.log(`Newest record: ${stats[0]?.newest_record || 'N/A'}`);
    console.log(`Total records: ${stats[0]?.total_records || 0}`);
    console.log(`Unique tokens: ${stats[0]?.unique_tokens || 0}`);
  }
}

// Create the stats function if it doesn't exist
async function createStatsFunction() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  await supabase.rpc('query', {
    query: `
      CREATE OR REPLACE FUNCTION get_price_history_stats()
      RETURNS TABLE (
        oldest_record TIMESTAMP,
        newest_record TIMESTAMP,
        total_records BIGINT,
        unique_tokens BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          MIN(recorded_at)::TIMESTAMP AS oldest_record,
          MAX(recorded_at)::TIMESTAMP AS newest_record,
          COUNT(*)::BIGINT AS total_records,
          COUNT(DISTINCT token_mint)::BIGINT AS unique_tokens
        FROM token_price_history;
      END;
      $$ LANGUAGE plpgsql;
    `
  }).catch(() => {
    // Function might already exist
  });
}

createStatsFunction().then(() => {
  checkPriceHistoryRange().catch(console.error);
});