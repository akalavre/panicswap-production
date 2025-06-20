import dotenv from 'dotenv';
import { heliusAutomaticTokenDiscoveryService } from './src/services/HeliusAutomaticTokenDiscoveryService';
import supabase from './src/utils/supabaseClient';
import { Connection, PublicKey } from '@solana/web3.js';

dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

async function testTokenDiscovery() {
  console.log(`\n${colors.bright}${colors.blue}===========================================`);
  console.log('🚀 Testing Automatic Token Discovery Service');
  console.log(`===========================================${colors.reset}\n`);

  // Step 1: Check environment
  console.log(`${colors.yellow}📋 Step 1: Checking environment...${colors.reset}`);
  
  if (!process.env.HELIUS_RPC_URL) {
    console.error(`${colors.red}❌ HELIUS_RPC_URL not found in .env file${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Helius RPC URL found${colors.reset}`);
  console.log(`   URL: ${process.env.HELIUS_RPC_URL.substring(0, 50)}...`);
  
  // Step 2: Test database connection
  console.log(`\n${colors.yellow}📋 Step 2: Testing database connection...${colors.reset}`);
  
  try {
    const { data, error } = await supabase
      .from('token_metadata')
      .select('count')
      .limit(1);
      
    if (error) throw error;
    console.log(`${colors.green}✅ Database connection successful${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ Database connection failed:${colors.reset}`, error);
    process.exit(1);
  }
  
  // Step 3: Check current token count
  console.log(`\n${colors.yellow}📋 Step 3: Getting baseline metrics...${colors.reset}`);
  
  const { count: initialTokenCount } = await supabase
    .from('token_metadata')
    .select('*', { count: 'exact', head: true });
    
  console.log(`   Current tokens in database: ${colors.bright}${initialTokenCount || 0}${colors.reset}`);
  
  // Get tokens discovered today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count: todayCount } = await supabase
    .from('token_metadata')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());
    
  console.log(`   Tokens discovered today: ${colors.bright}${todayCount || 0}${colors.reset}`);
  
  // Step 4: Start discovery service
  console.log(`\n${colors.yellow}📋 Step 4: Starting discovery service...${colors.reset}`);
  
  try {
    await heliusAutomaticTokenDiscoveryService.startDiscovery(5000); // Poll every 5 seconds for testing
    console.log(`${colors.green}✅ Discovery service started${colors.reset}`);
    console.log(`   Polling interval: 5 seconds`);
    console.log(`   Monitoring programs:`);
    console.log(`   - pump.fun: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`);
    console.log(`   - Raydium: 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to start discovery:${colors.reset}`, error);
    process.exit(1);
  }
  
  // Step 5: Monitor for discoveries
  console.log(`\n${colors.yellow}📋 Step 5: Monitoring for new tokens...${colors.reset}`);
  console.log(`${colors.bright}   Watching for 60 seconds...${colors.reset}\n`);
  
  let discoveryCount = 0;
  let lastCheck = initialTokenCount || 0;
  
  // Set up real-time monitoring
  const startTime = Date.now();
  const monitorDuration = 60000; // 60 seconds
  
  // Check for new tokens every 2 seconds
  const checkInterval = setInterval(async () => {
    try {
      // Get current token count
      const { count: currentCount } = await supabase
        .from('token_metadata')
        .select('*', { count: 'exact', head: true });
        
      if (currentCount && currentCount > lastCheck) {
        const newTokens = currentCount - lastCheck;
        discoveryCount += newTokens;
        
        // Get the new tokens
        const { data: latestTokens } = await supabase
          .from('token_metadata')
          .select('mint, symbol, name, platform, created_at')
          .order('created_at', { ascending: false })
          .limit(newTokens);
          
        console.log(`\n${colors.green}🎉 NEW TOKENS DISCOVERED!${colors.reset}`);
        latestTokens?.forEach(token => {
          console.log(`   ${colors.bright}${token.symbol}${colors.reset} (${token.name})`);
          console.log(`   Mint: ${token.mint}`);
          console.log(`   Platform: ${colors.magenta}${token.platform}${colors.reset}`);
          console.log(`   Time: ${new Date(token.created_at).toLocaleTimeString()}\n`);
        });
        
        lastCheck = currentCount;
      }
      
      // Show progress
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, monitorDuration - elapsed);
      process.stdout.write(`\r   ⏱️  Time remaining: ${Math.ceil(remaining / 1000)}s `);
      
    } catch (error) {
      console.error(`\n${colors.red}Error checking tokens:${colors.reset}`, error);
    }
  }, 2000);
  
  // Show stats periodically
  const statsInterval = setInterval(async () => {
    try {
      const stats = await heliusAutomaticTokenDiscoveryService.getStats();
      console.log(`\n\n${colors.blue}📊 Discovery Statistics:${colors.reset}`);
      console.log(`   Service running: ${stats.isRunning ? colors.green + '✅' : colors.red + '❌'}${colors.reset}`);
      console.log(`   Tokens discovered today: ${colors.bright}${stats.discoveredToday}${colors.reset}`);
      console.log(`   Tokens in memory cache: ${colors.bright}${stats.totalDiscovered}${colors.reset}`);
      if (stats.lastProcessedSignature) {
        console.log(`   Last signature: ${stats.lastProcessedSignature.substring(0, 20)}...`);
      }
      console.log('');
    } catch (e) {
      // Stats might not be available
    }
  }, 15000);
  
  // Wait for monitoring duration
  await new Promise(resolve => setTimeout(resolve, monitorDuration));
  
  // Step 6: Show final results
  clearInterval(checkInterval);
  clearInterval(statsInterval);
  
  console.log(`\n\n${colors.yellow}📋 Step 6: Final results...${colors.reset}`);
  
  // Get final token count
  const { count: finalTokenCount } = await supabase
    .from('token_metadata')
    .select('*', { count: 'exact', head: true });
    
  const totalDiscovered = (finalTokenCount || 0) - (initialTokenCount || 0);
  
  console.log(`\n${colors.bright}📈 Summary:${colors.reset}`);
  console.log(`   Initial token count: ${initialTokenCount || 0}`);
  console.log(`   Final token count: ${finalTokenCount || 0}`);
  console.log(`   New tokens discovered: ${colors.bright}${colors.green}${totalDiscovered}${colors.reset}`);
  
  if (totalDiscovered > 0) {
    console.log(`\n${colors.green}✅ Token discovery is working!${colors.reset}`);
    
    // Show recent tokens
    const { data: recentTokens } = await supabase
      .from('token_metadata')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log(`\n${colors.bright}Most recent tokens:${colors.reset}`);
    recentTokens?.forEach((token, i) => {
      console.log(`\n${i + 1}. ${colors.bright}${token.symbol}${colors.reset} - ${token.name}`);
      console.log(`   Mint: ${token.mint}`);
      console.log(`   Platform: ${colors.magenta}${token.platform}${colors.reset}`);
      console.log(`   Decimals: ${token.decimals}`);
      console.log(`   Created: ${new Date(token.created_at).toLocaleString()}`);
    });
  } else {
    console.log(`\n${colors.yellow}⚠️  No new tokens discovered during test period${colors.reset}`);
    console.log(`   This could mean:`);
    console.log(`   - No new tokens were created on pump.fun/Raydium during the test`);
    console.log(`   - Rate limits are preventing discovery`);
    console.log(`   - The service needs more time to find tokens`);
  }
  
  // Step 7: Test specific transaction (optional)
  console.log(`\n${colors.yellow}📋 Step 7: Testing transaction parsing...${colors.reset}`);
  
  try {
    // Get a recent transaction from pump.fun
    const connection = new Connection(process.env.HELIUS_RPC_URL!);
    const pumpFunProgram = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    
    const signatures = await connection.getSignaturesForAddress(pumpFunProgram, { limit: 1 });
    
    if (signatures.length > 0) {
      console.log(`   Found recent pump.fun transaction: ${signatures[0].signature.substring(0, 20)}...`);
      console.log(`   Block time: ${new Date(signatures[0].blockTime! * 1000).toLocaleString()}`);
      console.log(`${colors.green}✅ Transaction fetching works${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error testing transactions:${colors.reset}`, error);
  }
  
  // Stop the service
  console.log(`\n${colors.yellow}📋 Stopping discovery service...${colors.reset}`);
  heliusAutomaticTokenDiscoveryService.stopDiscovery();
  console.log(`${colors.green}✅ Service stopped${colors.reset}`);
  
  console.log(`\n${colors.bright}${colors.blue}===========================================`);
  console.log('✨ Test completed!');
  console.log(`===========================================${colors.reset}\n`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Stopping discovery service...${colors.reset}`);
  heliusAutomaticTokenDiscoveryService.stopDiscovery();
  console.log(`${colors.green}✅ Service stopped${colors.reset}`);
  process.exit(0);
});

// Run the test
testTokenDiscovery().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});