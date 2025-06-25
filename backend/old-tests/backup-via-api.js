const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection
const supabaseUrl = 'https://cfficjjdhgqwqprfhlrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupTables() {
  console.log('🔵 Starting Supabase backup via API...\n');
  
  // Create backups directory
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupData = {};
  
  // Critical tables to backup
  const tables = [
    'users',
    'subscriptions',
    'wallet_tokens',
    'protected_tokens',
    'rugcheck_reports',
    'liquidity_velocity',
    'rug_patterns',
    'pattern_alerts',
    'ml_predictions',
    'ml_inference_results',
    'social_signals',
    'social_metrics',
    'wallet_clusters',
    'liquidity_snapshots',
    'historical_rugs',
    'token_prices',
    'pool_liquidity',
    'demo_protection_events',
    'protection_logs',
    'webhook_tokens',
    'token_socials',
    'community_reports'
  ];
  
  console.log(`📦 Backing up ${tables.length} tables...\n`);
  
  for (const table of tables) {
    try {
      console.log(`  📋 Backing up ${table}...`);
      
      // Get row count first
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (count === 0) {
        console.log(`     ⚪ No data in ${table}`);
        backupData[table] = [];
        continue;
      }
      
      // Fetch all data (in chunks if needed)
      let allData = [];
      const chunkSize = 1000;
      let offset = 0;
      
      while (offset < count) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(offset, offset + chunkSize - 1)
          .order('created_at', { ascending: true, nullsFirst: true });
        
        if (error) {
          console.error(`     ❌ Error backing up ${table}:`, error.message);
          break;
        }
        
        allData = allData.concat(data || []);
        offset += chunkSize;
      }
      
      backupData[table] = allData;
      console.log(`     ✅ Backed up ${allData.length} rows from ${table}`);
      
    } catch (error) {
      console.error(`     ❌ Failed to backup ${table}:`, error.message);
    }
  }
  
  // Save to JSON file
  const filename = path.join(backupDir, `panicswap_backup_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  
  const stats = fs.statSync(filename);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log('\n✅ Backup completed successfully!');
  console.log(`📁 File: ${filename}`);
  console.log(`📊 Size: ${fileSizeInMB} MB`);
  console.log(`📈 Total rows: ${Object.values(backupData).reduce((sum, data) => sum + data.length, 0)}`);
  
  // Also create a SQL-like export for critical tables
  console.log('\n🔄 Creating SQL export for critical tables...');
  const sqlFilename = path.join(backupDir, `panicswap_sql_export_${timestamp}.sql`);
  let sqlContent = `-- PanicSwap Database Export
-- Generated: ${new Date().toISOString()}
-- Project: cfficjjdhgqwqprfhlrj

`;
  
  // Export most important tables as INSERT statements
  const criticalTables = ['wallet_tokens', 'protected_tokens', 'rugcheck_reports', 'subscriptions'];
  
  for (const table of criticalTables) {
    if (backupData[table] && backupData[table].length > 0) {
      sqlContent += `\n-- Table: ${table}\n`;
      sqlContent += `-- Rows: ${backupData[table].length}\n\n`;
      
      for (const row of backupData[table]) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          return v;
        }).join(', ');
        
        sqlContent += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
      }
      sqlContent += '\n';
    }
  }
  
  fs.writeFileSync(sqlFilename, sqlContent);
  console.log(`✅ SQL export created: ${sqlFilename}`);
  
  // Create a metadata file
  const metadataFilename = path.join(backupDir, `backup_metadata_${timestamp}.json`);
  const metadata = {
    timestamp: new Date().toISOString(),
    project_id: 'cfficjjdhgqwqprfhlrj',
    project_name: 'PanicSwap',
    region: 'eu-west-2',
    tables_backed_up: Object.keys(backupData).length,
    total_rows: Object.values(backupData).reduce((sum, data) => sum + data.length, 0),
    table_summary: Object.entries(backupData).map(([table, data]) => ({
      table,
      row_count: data.length
    }))
  };
  
  fs.writeFileSync(metadataFilename, JSON.stringify(metadata, null, 2));
  console.log(`📋 Metadata saved: ${metadataFilename}`);
  
  console.log('\n🎉 All backups completed successfully!');
  console.log('\n📖 To restore data later, you can:');
  console.log('   1. Use the JSON files to restore via Supabase API');
  console.log('   2. Use the SQL file for critical tables');
  console.log('   3. Keep these backups safe and secure!');
}

// Run backup
backupTables().catch(console.error);