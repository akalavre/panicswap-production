// Verify velocity tracking is working after backend restart
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ACTIVE_TOKEN = 'BmyLzEuNq9rGHxuwxwJq9zo7wKfaFS9GPWetz9Jhpump';
const WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function verifyVelocityTracking() {
  console.log('🔍 Verifying Velocity Tracking\n');
  
  let previousCount = 0;
  let attempts = 0;
  const maxAttempts = 12; // Check for 2 minutes
  
  const checkInterval = setInterval(async () => {
    attempts++;
    
    try {
      // Check velocity_tracker snapshots
      const { count } = await supabase
        .from('token_price_history')
        .select('*', { count: 'exact', head: true })
        .eq('token_mint', ACTIVE_TOKEN)
        .eq('source', 'velocity_tracker');
      
      console.log(`[${new Date().toLocaleTimeString()}] Velocity tracker snapshots: ${count}`);
      
      if (count > previousCount) {
        console.log(`✅ NEW SNAPSHOT DETECTED! Backend is storing price data.`);
        previousCount = count;
      }
      
      if (count >= 2) {
        // Check monitoring stats
        const { data: stats } = await supabase
          .from('monitoring_stats')
          .select('price_change_1m, price_change_5m')
          .eq('token_mint', ACTIVE_TOKEN)
          .eq('wallet_address', WALLET)
          .single();
        
        if (stats && (stats.price_change_1m !== 0 || stats.price_change_5m !== 0)) {
          console.log('\n🎉 SUCCESS! Price velocities are calculating:');
          console.log(`   1m change: ${stats.price_change_1m}%`);
          console.log(`   5m change: ${stats.price_change_5m}%`);
          clearInterval(checkInterval);
          return;
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏱️ Timeout reached.');
        if (count === 0) {
          console.log('❌ No velocity_tracker snapshots found.');
          console.log('\nDid you rebuild the TypeScript?');
          console.log('1. npm run build');
          console.log('2. npm run dev');
        } else {
          console.log(`Found ${count} snapshots. Velocities should appear soon.`);
        }
        clearInterval(checkInterval);
      }
    } catch (error) {
      console.error('Error:', error);
      clearInterval(checkInterval);
    }
  }, 10000); // Check every 10 seconds
}

verifyVelocityTracking();