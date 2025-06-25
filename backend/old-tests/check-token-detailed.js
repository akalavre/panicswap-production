const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const axios = require('axios');

async function checkTokenDetailed(tokenMint) {
  console.log(`\n🔍 Detailed Token Analysis: ${tokenMint}\n`);
  console.log('=' .repeat(80));
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // 1. Check token supply on-chain
  console.log('\n📊 On-Chain Token Data:');
  console.log('-'.repeat(40));
  
  try {
    const mintPubkey = new PublicKey(tokenMint);
    const supply = await connection.getTokenSupply(mintPubkey);
    console.log(`Total Supply: ${(supply.value.uiAmount || 0).toLocaleString()}`);
    console.log(`Decimals: ${supply.value.decimals}`);
    
    // Get largest accounts
    const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
    console.log(`\nTop Token Holders: ${largestAccounts.value.length}`);
    
    let totalHeld = 0;
    largestAccounts.value.slice(0, 5).forEach((account, i) => {
      const amount = account.uiAmount || 0;
      totalHeld += amount;
      console.log(`  ${i + 1}. ${account.address.toBase58().substring(0, 8)}... : ${amount.toLocaleString()} tokens`);
    });
    
  } catch (error) {
    console.error('Error fetching on-chain data:', error.message);
  }
  
  // 2. Check pump.fun API
  console.log('\n\n🚀 Pump.fun Data:');
  console.log('-'.repeat(40));
  
  try {
    // Try pump.fun API
    const response = await axios.get(`https://frontend-api.pump.fun/coins/${tokenMint}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data) {
      const data = response.data;
      console.log(`Name: ${data.name}`);
      console.log(`Symbol: ${data.symbol}`);
      console.log(`Market Cap: $${(data.usd_market_cap || 0).toLocaleString()}`);
      console.log(`Price: ${data.price || 0} SOL`);
      console.log(`Virtual SOL Reserves: ${data.virtual_sol_reserves || 0}`);
      console.log(`Virtual Token Reserves: ${(data.virtual_token_reserves || 0).toLocaleString()}`);
      console.log(`Is Graduated: ${data.complete ? 'Yes' : 'No'}`);
      console.log(`Created: ${new Date(data.created_timestamp * 1000).toLocaleString()}`);
      
      if (data.king_of_the_hill_timestamp) {
        console.log(`King of the Hill: ${new Date(data.king_of_the_hill_timestamp * 1000).toLocaleString()}`);
      }
      
      // Social links
      if (data.twitter || data.telegram || data.website) {
        console.log('\nSocial Links:');
        if (data.twitter) console.log(`  Twitter: ${data.twitter}`);
        if (data.telegram) console.log(`  Telegram: ${data.telegram}`);
        if (data.website) console.log(`  Website: ${data.website}`);
      }
    }
  } catch (error) {
    console.log('Could not fetch pump.fun data:', error.response?.status || error.message);
  }
  
  // 3. Try alternative API endpoints
  console.log('\n\n🔗 Alternative Data Sources:');
  console.log('-'.repeat(40));
  
  // Try DexScreener
  try {
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
    const dexResponse = await axios.get(dexScreenerUrl, { timeout: 5000 });
    
    if (dexResponse.data && dexResponse.data.pairs && dexResponse.data.pairs.length > 0) {
      console.log('\n📈 DexScreener Data:');
      const pair = dexResponse.data.pairs[0];
      console.log(`DEX: ${pair.dexId}`);
      console.log(`Price USD: $${pair.priceUsd || 0}`);
      console.log(`Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
      console.log(`24h Volume: $${(pair.volume?.h24 || 0).toLocaleString()}`);
      console.log(`Market Cap: $${(pair.fdv || 0).toLocaleString()}`);
      console.log(`24h Transactions: ${pair.txns?.h24?.buys || 0} buys, ${pair.txns?.h24?.sells || 0} sells`);
    } else {
      console.log('No DexScreener data available');
    }
  } catch (error) {
    console.log('DexScreener API error:', error.message);
  }
  
  // Try Birdeye
  try {
    console.log('\n🦅 Checking Birdeye...');
    const birdeyeUrl = `https://public-api.birdeye.so/public/tokenlist?address=${tokenMint}`;
    const birdeyeResponse = await axios.get(birdeyeUrl, { 
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'x-chain': 'solana'
      }
    });
    
    if (birdeyeResponse.data && birdeyeResponse.data.data) {
      const tokenData = birdeyeResponse.data.data;
      console.log('Birdeye data found - token exists in their database');
    }
  } catch (error) {
    console.log('Birdeye API not accessible');
  }
  
  // 4. Direct RPC check for holder count
  console.log('\n\n👥 Checking actual holders...');
  console.log('-'.repeat(40));
  
  try {
    // This would need a more complex implementation to get all holders
    // For now, let's at least check if the token program owns any
    const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const accounts = await connection.getProgramAccounts(tokenProgramId, {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 0,
            bytes: tokenMint
          }
        }
      ]
    });
    
    console.log(`Found ${accounts.length} token accounts (this may be limited by RPC)`);
    
  } catch (error) {
    console.log('Could not fetch holder data:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis complete!\n');
}

const tokenMint = process.argv[2] || 'BLK12C3EJHo986q95FN1KpJHMK2mmmYTuJBh57wepump';
checkTokenDetailed(tokenMint).catch(console.error);