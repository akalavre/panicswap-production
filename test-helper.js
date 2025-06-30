/**
 * Test Helper Script for PanicSwap Dashboard Manual Testing
 * Run these commands in the browser console during testing
 */

// Test Helper Functions
window.testHelper = {
    
    // Check if batch processing is active
    checkBatchProcessing() {
        const tokenCount = window.tokenListV3State?.tokens?.length || 0;
        console.log(`🔍 Token Count: ${tokenCount}`);
        
        if (tokenCount >= 4) {
            console.log('✅ Batch processing should be active (4+ tokens)');
        } else {
            console.log('⚠️ Batch processing not triggered (need 4+ tokens)');
        }
        
        return tokenCount >= 4;
    },
    
    // Verify token data integrity
    verifyTokenData() {
        const tokens = window.tokenListV3State?.tokens || [];
        console.log(`🔍 Verifying ${tokens.length} tokens...`);
        
        tokens.forEach((token, index) => {
            const issues = [];
            
            if (!token.symbol) issues.push('Missing symbol');
            if (!token.token_mint) issues.push('Missing mint address');
            if (token.price === undefined) issues.push('Missing price');
            if (token.balance_ui === undefined) issues.push('Missing balance');
            if (token.protected === undefined) issues.push('Missing protection status');
            
            if (issues.length > 0) {
                console.log(`❌ Token ${index + 1} (${token.symbol || 'Unknown'}): ${issues.join(', ')}`);
            } else {
                console.log(`✅ Token ${index + 1} (${token.symbol}): All data present`);
            }
        });
        
        return tokens.filter(token => 
            token.symbol && token.token_mint && 
            token.price !== undefined && token.balance_ui !== undefined
        ).length;
    },
    
    // Check auto-protect functionality
    checkAutoProtect() {
        const state = window.tokenListV3State;
        const toggle = document.getElementById('auto-protect-v3');
        
        console.log('🔍 Auto-Protect Status:');
        console.log(`- State: ${state?.autoProtectEnabled ? 'ON' : 'OFF'}`);
        console.log(`- Toggle: ${toggle?.checked ? 'ON' : 'OFF'}`);
        console.log(`- Processing: ${state?.autoProtectProcessing ? 'YES' : 'NO'}`);
        
        // Check if individual protection buttons are disabled when auto-protect is on
        const protectButtons = document.querySelectorAll('[data-protect-button]');
        const disabledButtons = Array.from(protectButtons).filter(btn => btn.disabled);
        
        if (state?.autoProtectEnabled) {
            console.log(`- Individual buttons disabled: ${disabledButtons.length}/${protectButtons.length}`);
        }
        
        return {
            enabled: state?.autoProtectEnabled,
            processing: state?.autoProtectProcessing,
            toggleChecked: toggle?.checked,
            buttonsDisabled: disabledButtons.length
        };
    },
    
    // Simulate auto-protect toggle for testing
    async testAutoProtectToggle() {
        const toggle = document.getElementById('auto-protect-v3');
        const currentState = toggle?.checked;
        
        console.log(`🧪 Testing auto-protect toggle (currently ${currentState ? 'ON' : 'OFF'})`);
        
        if (toggle) {
            // Simulate click
            toggle.click();
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const newState = toggle.checked;
            console.log(`- After toggle: ${newState ? 'ON' : 'OFF'}`);
            console.log(`- State changed: ${newState !== currentState ? 'YES' : 'NO'}`);
            
            return newState !== currentState;
        } else {
            console.log('❌ Auto-protect toggle not found');
            return false;
        }
    },
    
    // Check for console errors
    checkConsoleErrors() {
        console.log('🔍 Checking for recent errors...');
        
        // Hook into console.error to catch new errors
        const originalError = console.error;
        const errors = [];
        
        console.error = function(...args) {
            errors.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        // Return function to check collected errors
        return {
            getErrors: () => errors,
            restore: () => { console.error = originalError; }
        };
    },
    
    // Test network connectivity and API responses
    async testNetworkConnectivity() {
        console.log('🌐 Testing network connectivity...');
        
        const tests = [
            {
                name: 'Supabase Connection',
                test: () => window.supabaseClient ? 'Available' : 'Missing'
            },
            {
                name: 'Backend URL',
                test: () => window.BACKEND_URL || 'http://localhost:3001'
            },
            {
                name: 'Wallet State',
                test: () => window.walletState?.getState()?.address ? 'Connected' : 'Disconnected'
            }
        ];
        
        tests.forEach(test => {
            const result = test.test();
            console.log(`- ${test.name}: ${result}`);
        });
        
        // Test actual API call
        try {
            const walletAddress = window.walletState?.getState()?.address;
            if (walletAddress && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('wallet_tokens')
                    .select('count', { count: 'exact', head: true })
                    .eq('wallet_address', walletAddress);
                
                console.log(`- Database query: ${error ? 'Failed' : 'Success'}`);
                if (error) console.log(`  Error: ${error.message}`);
            }
        } catch (error) {
            console.log(`- Database query: Failed (${error.message})`);
        }
    },
    
    // Force error scenarios for testing
    simulateErrors: {
        networkError() {
            console.log('🚨 Simulating network error...');
            const originalFetch = window.fetch;
            window.fetch = () => Promise.reject(new Error('Network error'));
            
            return {
                restore: () => { window.fetch = originalFetch; }
            };
        },
        
        supabaseError() {
            console.log('🚨 Simulating Supabase error...');
            const originalClient = window.supabaseClient;
            window.supabaseClient = null;
            
            return {
                restore: () => { window.supabaseClient = originalClient; }
            };
        }
    },
    
    // Performance monitoring
    monitorPerformance() {
        console.log('📊 Starting performance monitoring...');
        
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
            stop() {
                const endTime = performance.now();
                const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                console.log('📊 Performance Results:');
                console.log(`- Duration: ${(endTime - startTime).toFixed(2)}ms`);
                if (performance.memory) {
                    console.log(`- Memory Delta: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`);
                }
                
                return {
                    duration: endTime - startTime,
                    memoryDelta: endMemory - startMemory
                };
            }
        };
    },
    
    // Complete test suite
    async runFullTest() {
        console.log('🚀 Running full test suite...');
        console.log('=====================================');
        
        const monitor = this.monitorPerformance();
        
        // 1. Check batch processing
        console.log('\n1. Testing Batch Processing:');
        const batchActive = this.checkBatchProcessing();
        
        // 2. Verify token data
        console.log('\n2. Verifying Token Data:');
        const validTokens = this.verifyTokenData();
        
        // 3. Check auto-protect
        console.log('\n3. Testing Auto-Protect:');
        const autoProtectStatus = this.checkAutoProtect();
        
        // 4. Test network
        console.log('\n4. Testing Network:');
        await this.testNetworkConnectivity();
        
        // 5. Performance results
        console.log('\n5. Performance Results:');
        const perf = monitor.stop();
        
        console.log('\n=====================================');
        console.log('🎯 Test Summary:');
        console.log(`- Batch Processing: ${batchActive ? 'PASS' : 'FAIL'}`);
        console.log(`- Valid Tokens: ${validTokens}`);
        console.log(`- Auto-Protect Working: ${autoProtectStatus.enabled !== undefined ? 'PASS' : 'FAIL'}`);
        console.log(`- Performance: ${perf.duration < 5000 ? 'PASS' : 'SLOW'}`);
        
        return {
            batchProcessing: batchActive,
            validTokens,
            autoProtect: autoProtectStatus,
            performance: perf
        };
    }
};

// Quick test commands
console.log('🧪 Test Helper Loaded!');
console.log('Available commands:');
console.log('- testHelper.runFullTest() - Run complete test suite');
console.log('- testHelper.checkBatchProcessing() - Check if batch mode is active'); 
console.log('- testHelper.verifyTokenData() - Verify all token data');
console.log('- testHelper.checkAutoProtect() - Check auto-protect status');
console.log('- testHelper.testAutoProtectToggle() - Test toggle functionality');
console.log('- testHelper.testNetworkConnectivity() - Test API connections');
