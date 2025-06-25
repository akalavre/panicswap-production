#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create backups directory
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Generate timestamp for backup files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

// Database connection info
const DB_URL = process.env.SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '');
const PROJECT_REF = DB_URL || 'cfficjjdhgqwqprfhlrj';

// You'll need to provide the database password
console.log('⚠️  IMPORTANT: You need to provide your Supabase database password.');
console.log('You can find it in your Supabase dashboard under Settings > Database');
console.log('');

// Check if supabase CLI is installed
exec('supabase --version', (error) => {
  if (error) {
    console.error('❌ Supabase CLI not found. Installing...');
    exec('npm install -g supabase', (installError) => {
      if (installError) {
        console.error('Failed to install Supabase CLI:', installError);
        console.log('\nPlease install manually with: npm install -g supabase');
        process.exit(1);
      }
      console.log('✅ Supabase CLI installed successfully');
      promptForBackup();
    });
  } else {
    promptForBackup();
  }
});

function promptForBackup() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\n📦 Backing up Supabase project: ${PROJECT_REF}`);
  console.log(`📁 Backups will be saved to: ${backupDir}`);
  console.log('\nWhat would you like to backup?');
  console.log('1. Full backup (schema + data)');
  console.log('2. Schema only');
  console.log('3. Data only');
  console.log('4. All of the above');
  
  rl.question('\nEnter your choice (1-4): ', (choice) => {
    rl.question('Enter your database password: ', (password) => {
      rl.close();
      
      const dbUrl = `postgresql://postgres.${PROJECT_REF}:${password}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`;
      
      switch(choice) {
        case '1':
          createFullBackup(dbUrl);
          break;
        case '2':
          createSchemaBackup(dbUrl);
          break;
        case '3':
          createDataBackup(dbUrl);
          break;
        case '4':
          createAllBackups(dbUrl);
          break;
        default:
          console.log('Invalid choice. Exiting.');
          process.exit(1);
      }
    });
  });
}

function createFullBackup(dbUrl) {
  const filename = path.join(backupDir, `full-backup-${timestamp}.sql`);
  console.log('\n🔄 Creating full backup...');
  
  exec(`supabase db dump --db-url "${dbUrl}" -f "${filename}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Backup failed:', error);
      console.error(stderr);
      return;
    }
    console.log(`✅ Full backup created: ${filename}`);
    console.log(`📊 File size: ${getFileSize(filename)}`);
  });
}

function createSchemaBackup(dbUrl) {
  const filename = path.join(backupDir, `schema-backup-${timestamp}.sql`);
  console.log('\n🔄 Creating schema backup...');
  
  exec(`supabase db dump --db-url "${dbUrl}" -f "${filename}" --schema-only`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Schema backup failed:', error);
      console.error(stderr);
      return;
    }
    console.log(`✅ Schema backup created: ${filename}`);
    console.log(`📊 File size: ${getFileSize(filename)}`);
  });
}

function createDataBackup(dbUrl) {
  const filename = path.join(backupDir, `data-backup-${timestamp}.sql`);
  console.log('\n🔄 Creating data backup...');
  
  exec(`supabase db dump --db-url "${dbUrl}" -f "${filename}" --data-only`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Data backup failed:', error);
      console.error(stderr);
      return;
    }
    console.log(`✅ Data backup created: ${filename}`);
    console.log(`📊 File size: ${getFileSize(filename)}`);
  });
}

function createAllBackups(dbUrl) {
  console.log('\n🔄 Creating all backups...');
  createFullBackup(dbUrl);
  setTimeout(() => createSchemaBackup(dbUrl), 2000);
  setTimeout(() => createDataBackup(dbUrl), 4000);
  
  // Also create a special backup of important tables
  setTimeout(() => {
    console.log('\n🔄 Creating backup of critical tables...');
    const criticalTables = [
      'wallet_tokens',
      'protected_tokens',
      'rugcheck_reports',
      'liquidity_velocity',
      'rug_patterns',
      'ml_predictions',
      'social_metrics'
    ];
    
    const filename = path.join(backupDir, `critical-tables-${timestamp}.sql`);
    const tables = criticalTables.map(t => `-t public.${t}`).join(' ');
    
    exec(`supabase db dump --db-url "${dbUrl}" -f "${filename}" ${tables}`, (error) => {
      if (error) {
        console.error('❌ Critical tables backup failed:', error);
        return;
      }
      console.log(`✅ Critical tables backup created: ${filename}`);
      console.log(`📊 File size: ${getFileSize(filename)}`);
    });
  }, 6000);
}

function getFileSize(filename) {
  try {
    const stats = fs.statSync(filename);
    const size = stats.size;
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } catch (e) {
    return 'unknown';
  }
}

// Add restore instructions
console.log('\n📖 To restore from a backup later:');
console.log('supabase db push --db-url "postgresql://..." -f backups/[filename].sql');
console.log('\n⚠️  Always test restore on a development database first!');