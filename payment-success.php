<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - PanicSwap</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
    
    <style>
        body {
            background: #0a0a0a;
            background-image: 
                radial-gradient(at 20% 80%, rgb(120, 20, 60) 0, transparent 50%),
                radial-gradient(at 80% 20%, rgb(60, 20, 120) 0, transparent 50%);
        }
    </style>
</head>
<body class="bg-black text-gray-100 font-sans antialiased">
    <?php include 'components/header.php'; ?>
    
    <main class="container mx-auto px-4 py-16 mt-16 max-w-2xl">
        <div class="text-center">
            <!-- Success Animation -->
            <div class="mb-8">
                <div class="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
                    <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
            </div>
            
            <h1 class="text-4xl font-bold text-white mb-4">Payment Successful!</h1>
            <p class="text-xl text-gray-400 mb-8">Your subscription is now active</p>
            
            <!-- Subscription Details -->
            <div class="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-8">
                <div class="space-y-4">
                    <div class="flex items-center justify-between py-3 border-b border-gray-800">
                        <span class="text-gray-400">Plan</span>
                        <span class="text-white font-semibold" id="plan-name">Loading...</span>
                    </div>
                    <div class="flex items-center justify-between py-3 border-b border-gray-800">
                        <span class="text-gray-400">Status</span>
                        <span class="text-green-400 font-semibold">Active</span>
                    </div>
                    <div class="flex items-center justify-between py-3 border-b border-gray-800">
                        <span class="text-gray-400">Next billing date</span>
                        <span class="text-white" id="next-billing">In 30 days</span>
                    </div>
                    <div class="flex items-center justify-between py-3">
                        <span class="text-gray-400">Payment method</span>
                        <span class="text-white">Credit Card</span>
                    </div>
                </div>
            </div>
            
            <!-- What's Next -->
            <div class="bg-gray-900/50 rounded-xl p-6 mb-8">
                <h2 class="text-lg font-semibold text-white mb-4">What happens next?</h2>
                <div class="space-y-3 text-left">
                    <div class="flex items-start space-x-3">
                        <div class="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-xs text-orange-400">1</span>
                        </div>
                        <p class="text-sm text-gray-300">You'll receive a confirmation email with your receipt</p>
                    </div>
                    <div class="flex items-start space-x-3">
                        <div class="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-xs text-orange-400">2</span>
                        </div>
                        <p class="text-sm text-gray-300">Your protection features are now active</p>
                    </div>
                    <div class="flex items-start space-x-3">
                        <div class="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-xs text-orange-400">3</span>
                        </div>
                        <p class="text-sm text-gray-300">Go to your dashboard to start protecting tokens</p>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="dashboard.php" class="btn btn-primary">
                    Go to Dashboard
                </a>
                <a href="https://docs.panicswap.com/getting-started" target="_blank" class="btn btn-secondary">
                    Read Documentation
                </a>
            </div>
            
            <!-- Support -->
            <p class="text-sm text-gray-500 mt-8">
                Need help? <a href="mailto:support@panicswap.com" class="text-orange-400 hover:text-orange-300">Contact support</a>
            </p>
        </div>
    </main>
    
    <?php include 'components/footer.php'; ?>
    
    <script>
        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        // Verify payment and get details
        async function verifyPayment() {
            if (!sessionId) return;
            
            try {
                const response = await fetch('/api/verify-payment.php?session_id=' + sessionId);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('plan-name').textContent = data.plan || 'Pro';
                    if (data.nextBilling) {
                        const date = new Date(data.nextBilling);
                        document.getElementById('next-billing').textContent = date.toLocaleDateString();
                    }
                }
            } catch (err) {
                console.error('Failed to verify payment:', err);
            }
        }
        
        // Clear stored session ID
        localStorage.removeItem('stripe_session_id');
        
        // Verify payment on load
        verifyPayment();
    </script>
</body>
</html>