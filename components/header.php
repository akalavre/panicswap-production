<?php 
$current_page = basename($_SERVER['PHP_SELF'], '.php');
?>
<!-- Modern SaaS Header -->
<header class="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/5">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
            <!-- Logo -->
            <div class="flex items-center space-x-4">
                <a href="index.php" class="flex items-center space-x-3 group">
                    <div class="relative">
                        <div class="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div class="relative bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                    </div>
                    <span class="text-xl font-bold">
                        <span class="text-white">Panic</span><span class="text-gradient">Swap</span>
                    </span>
                </a>
            </div>

            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center space-x-1">
                <a href="index.php" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all <?php echo $current_page === 'index' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                    Home
                </a>
                <a href="dashboard.php" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all <?php echo $current_page === 'dashboard' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                    Dashboard
                </a>
                <a href="#pricing" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5">
                    Pricing
                </a>
                <a href="how-it-works.php" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all <?php echo $current_page === 'how-it-works' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                    How it Works
                </a>
            </nav>

            <!-- Right Section -->
            <div class="hidden md:flex items-center space-x-4">
                <?php include 'wallet-button.php'; ?>
            </div>

            <!-- Mobile Menu Button -->
            <div class="md:hidden">
                <button id="mobile-menu-btn" class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    <svg id="menu-icon" class="block h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                    <svg id="close-icon" class="hidden h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Menu -->
    <div id="mobile-menu" class="md:hidden hidden">
        <div class="px-4 pt-2 pb-4 space-y-1 bg-black/90 backdrop-blur-xl border-b border-white/5">
            <a href="index.php" class="block px-4 py-3 rounded-lg text-base font-medium transition-all <?php echo $current_page === 'index' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                Home
            </a>
            <a href="dashboard.php" class="block px-4 py-3 rounded-lg text-base font-medium transition-all <?php echo $current_page === 'dashboard' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                Dashboard
            </a>
            <a href="#pricing" class="block px-4 py-3 rounded-lg text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5">
                Pricing
            </a>
            <a href="how-it-works.php" class="block px-4 py-3 rounded-lg text-base font-medium transition-all <?php echo $current_page === 'how-it-works' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'; ?>">
                How it Works
            </a>
            <div class="pt-4 px-4">
                <button class="btn btn-primary w-full" id="mobile-connect-wallet">
                    Connect Wallet
                </button>
            </div>
        </div>
    </div>
</header>

<!-- Add spacing for fixed header -->
<div class="h-20"></div>