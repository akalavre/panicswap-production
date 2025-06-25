// Script to populate monitoring data for testing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_TOKEN = '3Smyegu4whxhhZ6rYH1XK83nWh5s7abrUE1Dm61rpump';
const TEST_WALLET = '4N1dz1tC7kMPFtdFXV5dqWNmdRUqodicHFJ9ntA7NPcV';

async function populateMonitoringData() {
    console.log('Populating monitoring data...\n');
    
    // 1. Create monitoring stats entry
    const monitoringStatsData = {
        token_mint: TEST_TOKEN,
        wallet_address: TEST_WALLET,
        monitoring_active: true,
        last_check_at: new Date().toISOString(),
        active_monitors: 1,
        websocket_connected: true,
        current_liquidity: 45000,
        liquidity_change_1m: -2.5,
        liquidity_change_5m: -5.2,
        liquidity_change_30m: -12.8,
        price_change_1m: -1.2,
        price_change_5m: -3.5,
        volume_spike: false,
        flash_rug_alert: false,
        rapid_drain_alert: false,
        slow_bleed_alert: true,
        active_patterns: ['SLOW_BLEED'],
        highest_risk_pattern: 'SLOW_BLEED',
        pattern_confidence: 0.75,
        estimated_time_to_rug: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { data: statsData, error: statsError } = await supabase
        .from('monitoring_stats')
        .upsert(monitoringStatsData, { onConflict: 'token_mint,wallet_address' })
        .select()
        .single();
        
    if (statsError) {
        console.error('Error upserting monitoring stats:', statsError);
    } else {
        console.log('Monitoring stats created/updated:', statsData);
    }
    
    // 2. Create liquidity velocity entry
    const velocityData = {
        token_mint: TEST_TOKEN,
        liquidity_usd: 45000,
        liquidity_velocity_1m: -2.5,
        liquidity_velocity_5m: -5.2,
        liquidity_velocity_30m: -12.8,
        price_velocity_1m: -1.2,
        price_velocity_5m: -3.5,
        volume_24h: 125000,
        volume_velocity_1h: 15000,
        flash_rug_alert: false,
        rapid_drain_alert: false,
        slow_bleed_alert: true,
        timestamp: new Date().toISOString()
    };
    
    const { data: velData, error: velError } = await supabase
        .from('liquidity_velocity')
        .insert(velocityData)
        .select()
        .single();
        
    if (velError) {
        console.error('Error inserting velocity data:', velError);
    } else {
        console.log('\nVelocity data created:', velData);
    }
    
    // 3. Update protected_tokens to ensure monitoring is enabled
    const { data: protData, error: protError } = await supabase
        .from('protected_tokens')
        .update({
            monitoring_active: true,
            mempool_monitoring: true,
            is_active: true
        })
        .eq('token_mint', TEST_TOKEN)
        .eq('wallet_address', TEST_WALLET)
        .select()
        .single();
        
    if (protError) {
        console.error('Error updating protected tokens:', protError);
    } else {
        console.log('\nProtected token updated:', protData);
    }
    
    // 4. Add some price history for velocity calculations
    const now = new Date();
    const priceHistory = [];
    
    for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - (i * 60 * 1000)); // Every minute
        const price = 0.000044741627274 * (1 - (i * 0.002)); // Decreasing price
        
        priceHistory.push({
            token_mint: TEST_TOKEN,
            price: price,
            recorded_at: timestamp.toISOString(),
            created_at: timestamp.toISOString(),
            timestamp: timestamp.toISOString()
        });
    }
    
    const { data: histData, error: histError } = await supabase
        .from('token_price_history')
        .insert(priceHistory)
        .select();
        
    if (histError) {
        console.error('Error inserting price history:', histError);
    } else {
        console.log('\nPrice history entries created:', histData.length);
    }
    
    console.log('\nMonitoring data population complete!');
}

populateMonitoringData().catch(console.error);