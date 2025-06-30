<!DOCTYPE html>
<html>
<head>
    <title>API Test Step by Step</title>
    <style>
        body { font-family: monospace; padding: 20px; }
        .test { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
        pre { white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>Step by Step API Test</h1>
    
    <div id="results"></div>
    
    <script>
    const testWallet = '6PP4BH39zThbjRU8XhJ9AwXRqPyGjqCxwftemXYXSwvG';
    const testTokens = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'];
    const results = document.getElementById('results');
    
    async function runTest(name, url, data) {
        const div = document.createElement('div');
        div.className = 'test';
        div.innerHTML = `<h3>${name}</h3><pre>Testing ${url}...</pre>`;
        results.appendChild(div);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': testWallet
                },
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            let json;
            
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
            }
            
            if (response.ok) {
                div.className += ' success';
                div.querySelector('pre').textContent = `✓ Success (${response.status})\n${JSON.stringify(json, null, 2)}`;
            } else {
                div.className += ' error';
                div.querySelector('pre').textContent = `✗ Error (${response.status})\n${JSON.stringify(json, null, 2)}`;
            }
            
        } catch (error) {
            div.className += ' error';
            div.querySelector('pre').textContent = `✗ Exception: ${error.message}`;
        }
    }
    
    async function runAllTests() {
        // Test 1: Mock endpoint
        await runTest(
            'Test 1: Mock Endpoint', 
            '/PanicSwap-php/api/v2/batch-mock.php',
            { wallet: testWallet, tokens: testTokens }
        );
        
        // Test 2: Simple endpoint
        await runTest(
            'Test 2: Simple Batch Endpoint', 
            '/PanicSwap-php/api/v2/batch-simple.php',
            { wallet: testWallet, tokens: testTokens }
        );
        
        // Test 3: Original batch endpoint
        await runTest(
            'Test 3: Original Batch Endpoint', 
            '/PanicSwap-php/api/v2/batch.php',
            { wallet: testWallet, tokens: testTokens }
        );
        
        // Test 4: Check Supabase directly
        const phpTest = document.createElement('div');
        phpTest.className = 'test';
        phpTest.innerHTML = '<h3>Test 4: Direct PHP Test</h3><iframe src="/PanicSwap-php/debug-batch-api.php" width="100%" height="400"></iframe>';
        results.appendChild(phpTest);
    }
    
    // Run tests on load
    runAllTests();
    </script>
</body>
</html>