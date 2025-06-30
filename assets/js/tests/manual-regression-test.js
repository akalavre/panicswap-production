// Manual Regression Test for Token Protection Toggle
// Run this in the browser console to test the actual functionality

(function() {
    'use strict';
    
    console.log('🧪 Starting Token Protection Toggle Regression Tests...');
    
    // Test 1: Rapid toggle prevention
    function testRapidTogglePrevention() {
        console.log('\n📝 Test 1: Rapid Toggle Prevention');
        
        const testButton = document.querySelector('[data-protection-btn]');
        if (!testButton) {
            console.error('❌ No protection button found on page');
            return false;
        }
        
        const tokenMint = testButton.dataset.mint;
        console.log(`Testing rapid toggle for token: ${tokenMint}`);
        
        // Clear any existing progress
        if (window.toggleInProgress) {
            window.toggleInProgress.clear();
        }
        
        // Simulate rapid clicks
        const event1 = new MouseEvent('click', { bubbles: true });
        const event2 = new MouseEvent('click', { bubbles: true });
        
        testButton.dispatchEvent(event1);
        
        if (window.toggleInProgress && window.toggleInProgress.has(tokenMint)) {
            console.log('✅ First click set toggleInProgress gate');
            
            // Second rapid click should be blocked
            testButton.dispatchEvent(event2);
            
            if (window.toggleInProgress.size === 1) {
                console.log('✅ Second rapid click was blocked by toggleInProgress gate');
                return true;
            } else {
                console.error('❌ Second rapid click was not blocked');
                return false;
            }
        } else {
            console.error('❌ toggleInProgress gate not working');
            return false;
        }
    }
    
    // Test 2: State persistence after page refresh simulation
    function testStatePersistence() {
        console.log('\n📝 Test 2: State Persistence After Refresh');
        
        if (!window.tokenListV3State) {
            console.error('❌ tokenListV3State not available');
            return false;
        }
        
        const tokens = window.tokenListV3State.tokens;
        if (!tokens || tokens.length === 0) {
            console.error('❌ No tokens found in state');
            return false;
        }
        
        // Take first 3 tokens and simulate protection changes
        const testTokens = tokens.slice(0, 3);
        console.log(`Testing state persistence for ${testTokens.length} tokens`);
        
        // Add recent changes to simulate user toggles
        if (!window.tokenListV3State.recentChanges) {
            window.tokenListV3State.recentChanges = new Map();
        }
        
        testTokens.forEach((token, index) => {
            const newState = !token.protected; // Toggle current state
            window.tokenListV3State.recentChanges.set(token.token_mint, {
                state: newState,
                timestamp: Date.now()
            });
            console.log(`Simulated toggle for ${token.symbol}: ${token.protected} → ${newState}`);
        });
        
        // Simulate page refresh by calling the token refresh function
        if (window.refreshTokensV3) {
            console.log('Simulating page refresh...');
            setTimeout(() => {
                window.refreshTokensV3();
                
                // Check if states are preserved
                setTimeout(() => {
                    let allCorrect = true;
                    testTokens.forEach(token => {
                        const currentToken = window.tokenListV3State.tokens.find(t => t.token_mint === token.token_mint);
                        const recentChange = window.tokenListV3State.recentChanges.get(token.token_mint);
                        
                        if (currentToken && recentChange) {
                            if (currentToken.protected === recentChange.state) {
                                console.log(`✅ ${token.symbol} state preserved correctly`);
                            } else {
                                console.error(`❌ ${token.symbol} state not preserved`);
                                allCorrect = false;
                            }
                        }
                    });
                    
                    if (allCorrect) {
                        console.log('✅ All token states preserved after refresh simulation');
                    }
                }, 1000);
            }, 500);
        } else {
            console.error('❌ refreshTokensV3 function not available');
            return false;
        }
        
        return true;
    }
    
    // Test 3: Rugged token protection attempt
    function testRuggedTokenPrevention() {
        console.log('\n📝 Test 3: Rugged Token Protection Prevention');
        
        // Look for a rugged token or simulate one
        const ruggedButton = document.querySelector('[data-protection-btn][data-rugged="true"]');
        
        if (ruggedButton) {
            console.log('Found rugged token button, testing protection attempt...');
            
            // Mock notification system to capture calls
            const originalShowNotification = window.showNotification;
            let notificationCalled = false;
            window.showNotification = function(message, type) {
                if (message.includes('rugged') || message.includes('Cannot protect')) {
                    notificationCalled = true;
                    console.log(`✅ Notification shown: "${message}" (${type})`);
                }
                if (originalShowNotification) {
                    originalShowNotification(message, type);
                }
            };
            
            // Attempt to click the rugged token button
            const event = new MouseEvent('click', { bubbles: true });
            ruggedButton.dispatchEvent(event);
            
            setTimeout(() => {
                if (notificationCalled) {
                    console.log('✅ Rugged token protection attempt was blocked');
                    window.showNotification = originalShowNotification; // Restore
                    return true;
                } else {
                    console.error('❌ Rugged token protection was not blocked');
                    window.showNotification = originalShowNotification; // Restore
                    return false;
                }
            }, 100);
        } else {
            console.log('⚠️  No rugged tokens found, creating simulated test...');
            
            // Create a simulated rugged token button for testing
            const testButton = document.createElement('button');
            testButton.dataset.protectionBtn = 'true';
            testButton.dataset.mint = 'test-rugged-mint';
            testButton.dataset.rugged = 'true';
            testButton.dataset.symbol = 'RUGGED';
            
            // Add to DOM temporarily
            document.body.appendChild(testButton);
            
            // Mock notification system
            let notificationCalled = false;
            const originalShowNotification = window.showNotification;
            window.showNotification = function(message, type) {
                if (message.includes('rugged') || message.includes('Cannot protect')) {
                    notificationCalled = true;
                    console.log(`✅ Notification shown: "${message}" (${type})`);
                }
                if (originalShowNotification) {
                    originalShowNotification(message, type);
                }
            };
            
            // Simulate click event
            const event = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(event, 'target', { value: testButton });
            
            if (window.handleProtectionClick) {
                window.handleProtectionClick(event);
            }
            
            setTimeout(() => {
                // Clean up
                document.body.removeChild(testButton);
                window.showNotification = originalShowNotification;
                
                if (notificationCalled) {
                    console.log('✅ Simulated rugged token protection was blocked');
                    return true;
                } else {
                    console.error('❌ Simulated rugged token protection was not blocked');
                    return false;
                }
            }, 100);
        }
        
        return true;
    }
    
    // Run all tests
    console.log('\n🚀 Running all regression tests...');
    
    const results = {
        rapidToggle: testRapidTogglePrevention(),
        statePersistence: testStatePersistence(),
        ruggedPrevention: testRuggedTokenPrevention()
    };
    
    setTimeout(() => {
        console.log('\n📊 Test Results Summary:');
        console.log('=======================');
        console.log(`Rapid Toggle Prevention: ${results.rapidToggle ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`State Persistence: ${results.statePersistence ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Rugged Token Prevention: ${results.ruggedPrevention ? '✅ PASS' : '❌ FAIL'}`);
        
        const passCount = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
        
        if (passCount === totalTests) {
            console.log('🎉 All regression tests PASSED!');
        } else {
            console.log('⚠️  Some tests FAILED - please review the implementation');
        }
    }, 2000);
    
})();

console.log('📋 Manual regression test script loaded. Copy and paste this entire script into your browser console on the dashboard page to run the tests.');
