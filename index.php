<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PanicSwap - Emergency Exit for Solana</title>
    <meta name="description" content="Protect your SPL tokens from rug pulls and market crashes with automated emergency swaps">
    
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg">
    
    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="PanicSwap - Emergency Exit for Solana">
    <meta property="og:description" content="Protect your SPL tokens from rug pulls and market crashes with automated emergency swaps">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://panicswap.com">
    <meta property="og:image" content="https://panicswap.com/assets/images/og-image.png">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="PanicSwap - Emergency Exit for Solana">
    <meta name="twitter:description" content="Protect your SPL tokens from rug pulls and market crashes with automated emergency swaps">
    <meta name="twitter:image" content="https://panicswap.com/assets/images/og-image.png">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <!-- Tailwind Configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#fff1f0',
                            100: '#ffe0db',
                            200: '#ffc5bd',
                            300: '#ff9d8c',
                            400: '#ff6854',
                            500: '#FF4B36',
                            600: '#ed2408',
                            700: '#c71c05',
                            800: '#a41b0a',
                            900: '#871c0f',
                            950: '#490a03',
                        },
                        secondary: {
                            50: '#f0fdfa',
                            100: '#ccfbf1',
                            200: '#99f6e4',
                            300: '#5eead4',
                            400: '#2dd4bf',
                            500: '#14b8a6',
                            600: '#0d9488',
                            700: '#0f766e',
                            800: '#115e59',
                            900: '#134e4a',
                            950: '#042f2e',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
    
    <!-- Prevent FOUC -->
    <style>
        body { 
            opacity: 0; 
            transition: opacity 0.3s ease-in-out;
        }
        body.loaded { 
            opacity: 1; 
        }
    </style>
    
</head>
<body class="gradient-bg">
    <div class="relative min-h-screen">
        <!-- Gradient Mesh Background -->
        <div class="gradient-mesh"></div>
        
        <!-- Animated Orbs -->
        <div class="orb orb-primary w-96 h-96 top-10 -left-48"></div>
        <div class="orb orb-secondary w-80 h-80 bottom-20 -right-40" style="animation-delay: 10s;"></div>
        <div class="orb orb-accent w-64 h-64 top-1/2 -left-32" style="animation-delay: 5s;"></div>
        <div class="orb orb-primary w-72 h-72 bottom-10 left-1/3" style="animation-delay: 15s;"></div>
        <div class="orb orb-secondary w-56 h-56 top-20 right-1/4" style="animation-delay: 7s;"></div>
        <?php include 'components/network-status.php'; ?>
        <?php include 'components/header.php'; ?>
        
        <main>
            <?php include 'components/hero.php'; ?>
            <?php include 'components/tech-stack.php'; ?>
            <?php include 'components/video-trailer.php'; ?>
            <?php include 'components/features.php'; ?>
            <?php include 'components/trust-indicators.php'; ?>
            <?php include 'components/pricing.php'; ?>
            <?php include 'components/feature-comparison.php'; ?>
            <?php include 'components/how-it-works.php'; ?>
            <?php include 'components/testimonials.php'; ?>
            <?php include 'components/cta-section.php'; ?>
        </main>
        
        <?php include 'components/footer.php'; ?>
    </div> <!-- End of relative min-h-screen -->
    
    <!-- Payment Modal -->
    <?php include 'components/payment-modal.php'; ?>
    
    <!-- JavaScript -->
    <script src="assets/js/main.js"></script>
    <script src="assets/js/wallet-adapter.js"></script>
    <script src="assets/js/payment.js"></script>
    
    <!-- Initialize Lucide Icons -->
    <script>
        lucide.createIcons();
        
        // Add loaded class to body after everything is ready
        window.addEventListener('load', function() {
            document.body.classList.add('loaded');
        });
        
        // Fallback to ensure body is shown
        setTimeout(function() {
            document.body.classList.add('loaded');
        }, 100);
    </script>
</body>
</html>