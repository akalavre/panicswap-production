require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { EnhancedDevWalletService } = require('./dist/services/EnhancedDevWalletService');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function backfillDevActivity() {
    console.log('🔄 Starting Dev Activity Backfill...\n');
    
    const service = new EnhancedDevWalletService();
    let processed = 0;
    let errors = 0;
    
    try {
        // Get all tokens from rugcheck_reports that need backfilling
        const { data: tokens, error } = await supabase
            .from('rugcheck_reports')
            .select('token_mint, creator_address')
            .is('dev_activity_pct_total', null)
            .not('creator_address', 'is', null)
            .limit(100); // Process in batches
            
        if (error) {
            console.error('Error fetching tokens:', error);
            return;
        }
        
        console.log(`Found ${tokens.length} tokens to backfill\n`);
        
        for (const token of tokens) {
            try {
                console.log(`Processing ${token.token_mint.slice(0, 8)}...`);
                
                // Update the report with enhanced activity
                await service.updateRugcheckReport(token.token_mint);
                
                processed++;
                console.log(`✅ Updated ${token.token_mint.slice(0, 8)}... (${processed}/${tokens.length})`);
                
                // Add a small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Error processing ${token.token_mint}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n📊 Backfill Summary:');
        console.log(`   Total tokens: ${tokens.length}`);
        console.log(`   Successfully processed: ${processed}`);
        console.log(`   Errors: ${errors}`);
        
        // Check if there are more tokens to process
        const { count } = await supabase
            .from('rugcheck_reports')
            .select('*', { count: 'exact', head: true })
            .is('dev_activity_pct_total', null)
            .not('creator_address', 'is', null);
            
        if (count > 0) {
            console.log(`\n⚠️  ${count} tokens remaining. Run script again to continue backfilling.`);
        } else {
            console.log('\n✅ All tokens have been backfilled!');
        }
        
    } catch (error) {
        console.error('Fatal error:', error);
    }
}

// Run the backfill
backfillDevActivity().catch(console.error);