import fetch from 'node-fetch';
import config from './src/config';

async function testHeliusSubscription() {
    console.log('🔍 Testing Helius API Key and Subscription Tier...');
    
    const apiKey = config.heliusApiKey;
    if (!apiKey) {
        console.error('❌ No HELIUS_API_KEY found in environment');
        return;
    }
    
    console.log('✅ API Key found:', apiKey.substring(0, 8) + '...');
    
    try {
        // Test 1: Basic RPC access
        console.log('\n📡 Testing basic RPC access...');
        const rpcResponse = await fetch(config.heliusRpcUrl!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getHealth',
                params: []
            })
        });
        
        if (rpcResponse.ok) {
            console.log('✅ Basic RPC access working');
        } else {
            console.log('❌ Basic RPC access failed:', rpcResponse.status, rpcResponse.statusText);
            return;
        }
        
        // Test 2: Check account limits/tier
        console.log('\n🔐 Testing subscription tier...');
        const accountResponse = await fetch(`https://api.helius.xyz/v0/account/${apiKey}`);
        
        if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            console.log('📊 Account Information:');
            console.log('- Plan:', accountData.plan || 'Unknown');
            console.log('- Credits remaining:', accountData.creditsRemaining || 'Unknown');
            console.log('- Credits per month:', accountData.creditsPerMonth || 'Unknown');
            
            // Check if this is premium tier
            const plan = accountData.plan?.toLowerCase();
            if (plan === 'premium' || plan === 'pro' || plan === 'enterprise') {
                console.log('✅ Premium tier detected - WebSocket mempool access should work!');
            } else {
                console.log('⚠️ Free/Basic tier detected - WebSocket mempool access requires Premium tier');
                console.log('💡 Upgrade to Helius Premium for memecoin trading features');
            }
        } else {
            console.log('❌ Could not fetch account information:', accountResponse.status);
        }
        
        // Test 3: Try enhanced transactions API (premium feature)
        console.log('\n🔬 Testing enhanced transactions API...');
        try {
            const enhancedResponse = await fetch(config.heliusRpcUrl!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAsset',
                    params: {
                        id: 'So11111111111111111111111111111111111111112' // WSOL
                    }
                })
            });
            
            if (enhancedResponse.ok) {
                console.log('✅ Enhanced API access working');
            } else {
                const errorText = await enhancedResponse.text();
                console.log('❌ Enhanced API failed:', enhancedResponse.status, errorText);
            }
        } catch (enhancedError) {
            console.log('❌ Enhanced API error:', enhancedError);
        }
        
        // Test 4: Test WebSocket availability (without connecting)
        console.log('\n🌐 Testing WebSocket endpoint...');
        const wsUrl = config.heliusRpcUrl?.replace('https://', 'wss://');
        console.log('WebSocket URL:', wsUrl?.replace(/api-key=.*/, 'api-key=***'));
        
        // Just test if the endpoint exists with a simple HTTP request
        try {
            const wsTestResponse = await fetch(wsUrl!, {
                method: 'HEAD',
                timeout: 5000
            } as any);
            
            console.log('WebSocket endpoint response:', wsTestResponse.status);
            
            if (wsTestResponse.status === 401) {
                console.log('❌ WebSocket endpoint returned 401 - API key invalid or insufficient permissions');
                console.log('💡 For memecoin trading, you need:');
                console.log('   1. Valid Helius API key');
                console.log('   2. Premium tier subscription');
                console.log('   3. WebSocket/mempool access enabled');
            }
        } catch (wsError: any) {
            console.log('WebSocket test result:', wsError.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('\n📋 Summary for Memecoin Trading:');
    console.log('To enable real-time mempool monitoring for memecoins, you need:');
    console.log('1. ✅ Helius API key (you have this)');
    console.log('2. ❓ Helius Premium tier (check account info above)');
    console.log('3. ❓ WebSocket/mempool access (requires Premium tier)');
    console.log('\nWithout Premium tier, the system will fall back to polling-based monitoring.');
    console.log('This is still effective but with ~5-15 second delays instead of real-time.');
}

testHeliusSubscription().catch(console.error);
