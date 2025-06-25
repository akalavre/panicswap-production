import { wsClient } from './src/services/SolanaWebsocketClient';
import { PublicKey } from '@solana/web3.js';
import config from './src/config';

async function testWebSocketConnection() {
    console.log('🔗 Testing WebSocket Connection for Memecoin Trading...');
    console.log('Configuration:');
    console.log('- Mempool Enabled:', config.mempoolEnabled);
    console.log('- Helius RPC URL:', config.heliusRpcUrl?.replace(/api-key=.*/, 'api-key=***'));
    
    try {
        // Test connection
        console.log('\n📡 Connecting to WebSocket...');
        await wsClient.connect();
        console.log('✅ WebSocket connected successfully!');
        
        // Test if connection is active
        console.log('- Connection status:', wsClient.isConnected() ? '✅ Active' : '❌ Inactive');
        
        // Test mempool monitoring subscription
        if (config.mempoolEnabled) {
            console.log('\n🔍 Testing mempool monitoring subscriptions...');
            
            // Subscribe to Raydium logs (most active for memecoins)
            const raydiumProgramId = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
            const pumpFunProgramId = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
            
            try {
                const raydiumSub = await wsClient.subscribeToLogs({
                    programId: new PublicKey(raydiumProgramId)
                });
                console.log(`✅ Subscribed to Raydium logs (ID: ${raydiumSub})`);
                
                const pumpSub = await wsClient.subscribeToLogs({
                    programId: new PublicKey(pumpFunProgramId)
                });
                console.log(`✅ Subscribed to Pump.fun logs (ID: ${pumpSub})`);
                
                // Listen for events for 10 seconds
                console.log('\n⏱️ Listening for mempool events (10 seconds)...');
                let eventCount = 0;
                
                const eventHandler = (event: any) => {
                    eventCount++;
                    if (eventCount <= 3) { // Show first 3 events
                        console.log(`📦 Event ${eventCount}:`, {
                            signature: event.signature?.substring(0, 8) + '...',
                            logs: event.logs?.length ? `${event.logs.length} log entries` : 'No logs',
                            error: event.err ? 'Has error' : 'Success'
                        });
                    }
                };
                
                wsClient.on('logs', eventHandler);
                
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                wsClient.removeListener('logs', eventHandler);
                
                console.log(`\n📊 Total events received: ${eventCount}`);
                
                if (eventCount > 0) {
                    console.log('✅ WebSocket is receiving mempool data - ready for memecoin trading!');
                } else {
                    console.log('⚠️ No events received - this is normal if network is quiet');
                }
                
                // Cleanup subscriptions
                await wsClient.unsubscribe(raydiumSub);
                await wsClient.unsubscribe(pumpSub);
                console.log('🧹 Cleaned up subscriptions');
                
            } catch (subError) {
                console.error('❌ Subscription error:', subError);
            }
        } else {
            console.log('⚠️ Mempool monitoring is disabled in config');
        }
        
        // Test performance
        console.log('\n⚡ Testing connection performance...');
        const startTime = Date.now();
        
        // Test ping
        await new Promise((resolve) => {
            wsClient.getConnection().getLatestBlockhash().then(() => {
                const latency = Date.now() - startTime;
                console.log(`📊 RPC Latency: ${latency}ms`);
                
                if (latency < 100) {
                    console.log('✅ Excellent latency for memecoin trading!');
                } else if (latency < 300) {
                    console.log('⚠️ Acceptable latency for memecoin trading');
                } else {
                    console.log('❌ High latency - may affect memecoin trading performance');
                }
                
                resolve(undefined);
            });
        });
        
    } catch (error) {
        console.error('❌ WebSocket test failed:', error);
        
        // Provide troubleshooting tips
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check if HELIUS_API_KEY is set in .env');
        console.log('2. Verify Helius subscription tier (Premium required for mempool)');
        console.log('3. Check network connectivity');
        console.log('4. Ensure firewall allows WebSocket connections');
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        wsClient.disconnect();
        console.log('✅ Test completed');
        process.exit(0);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Terminating WebSocket test...');
    wsClient.disconnect();
    process.exit(0);
});

// Run the test
testWebSocketConnection().catch(console.error);
