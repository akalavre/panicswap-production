// Comment out imports for now - they require module type script tag
// import protectionEvents from './protection-events.js';
// import autoSell from './auto-sell.js';

// Configuration
const API_BASE_URL = window.location.origin + '/PanicSwap-php/api'; // PHP API URL
const WS_URL = 'ws://localhost:3001'; // WebSocket URL for real-time updates (optional - backend service)
const USE_BACKEND_API = false; // Set to true only if Node.js backend is running

// Global state (deprecated - use window.walletState from wallet-state.js instead)
let legacyWalletState = {
    connected: false,
    address: null,
    balance: 0,
    tokens: []
};

let protectionState = {
    activeProtections: [],
    monitoring: false,
    stats: {
        totalProtected: 0,
        solSaved: 0,
        rugsAvoided: 0
    }
};

// WebSocket connection for real-time updates
let ws = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Migration is now handled by WalletState
    initializeAnimations();
    initializeIntersectionObservers();
    initializeParallaxEffects();
    initializeHeader();
    initializeHero();
    initializeWallet();
    initializeRealTimeUpdates();
    initializeProtectionMonitoring();
    
    // Check if we're on the dashboard and show connect modal if no wallet
    if (window.location.pathname.includes('dashboard.php')) {
        setTimeout(() => {
            // Use WalletState to check connection status
            if (window.walletState && !window.walletState.state.connected) {
                if (typeof openWalletConnectModal === 'function') {
                    openWalletConnectModal();
                }
            }
        }, 1000); // Small delay to ensure all scripts are loaded
    }
    
    // Set Supabase credentials if available
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        window.SUPABASE_URL = window.SUPABASE_URL || '';
        window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
    }
});

// Initialize advanced animations
function initializeAnimations() {
    // Add stagger animation to elements
    const staggerElements = document.querySelectorAll('[data-stagger]');
    staggerElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Initialize count-up animations for stats
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target') || stat.textContent);
        animateValue(stat, 0, target, 2000);
    });
    
    // Add smooth reveal animations
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
    });
}

// Initialize Intersection Observers for scroll animations
function initializeIntersectionObservers() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-slide-up');
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Add stagger effect for children
                const children = entry.target.querySelectorAll('[data-stagger-child]');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('animate-fade-in');
                    }, index * 100);
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with animation classes
    document.querySelectorAll('.animate-on-scroll, [data-aos]').forEach(el => {
        observer.observe(el);
    });
}

// Initialize parallax effects
function initializeParallaxEffects() {
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        parallaxElements.forEach(el => {
            const speed = el.getAttribute('data-parallax') || 0.5;
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Animate value for count-up effect
function animateValue(element, start, end, duration) {
    const startTimestamp = Date.now();
    const step = () => {
        const timestamp = Date.now();
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOutQuart * (end - start) + start);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

// Header functionality with enhanced animations
function initializeHeader() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const headerContainer = document.getElementById('header-container');
    
    // Mobile menu toggle with animation
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            const isOpen = !mobileMenu.classList.contains('hidden');
            
            if (isOpen) {
                mobileMenu.classList.add('animate-slide-up');
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                    mobileMenu.classList.remove('animate-slide-up');
                }, 300);
                menuIcon.classList.remove('hidden');
                closeIcon.classList.add('hidden');
            } else {
                mobileMenu.classList.remove('hidden');
                mobileMenu.classList.add('animate-slide-down');
                menuIcon.classList.add('hidden');
                closeIcon.classList.remove('hidden');
            }
        });
    }
    
    // Enhanced header scroll behavior
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    function updateHeader() {
        if (!headerContainer) return; // Guard against null element
        
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 10) {
            headerContainer.classList.add('backdrop-blur-xl', 'bg-black/80', 'shadow-lg');
            
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                headerContainer.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                headerContainer.style.transform = 'translateY(0)';
            }
        } else {
            headerContainer.classList.remove('backdrop-blur-xl', 'bg-black/80', 'shadow-lg');
            headerContainer.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Hero functionality with enhanced mouse effects
function initializeHero() {
    const floatElement1 = document.getElementById('float-element-1');
    const floatElement2 = document.getElementById('float-element-2');
    const platformGuideBtn = document.getElementById('platform-guide-btn');
    const platformGuideModal = document.getElementById('platform-guide-modal');
    const closePlatformGuide = document.getElementById('close-platform-guide');
    
    // Enhanced mouse move effect
    if (floatElement1 && floatElement2) {
        let mouseX = 0;
        let mouseY = 0;
        let currentX = 0;
        let currentY = 0;
        
        document.addEventListener('mousemove', function(e) {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 30;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 30;
        });
        
        function animate() {
            // Smooth animation using lerp
            currentX += (mouseX - currentX) * 0.1;
            currentY += (mouseY - currentY) * 0.1;
            
            floatElement1.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentX * 0.1}deg)`;
            floatElement2.style.transform = `translate(${-currentX}px, ${-currentY}px) rotate(${-currentX * 0.1}deg)`;
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    // Platform guide modal with fade animation
    if (platformGuideBtn && platformGuideModal) {
        platformGuideBtn.addEventListener('click', function() {
            platformGuideModal.classList.remove('hidden');
            platformGuideModal.classList.add('animate-fade-in');
        });
    }
    
    if (closePlatformGuide && platformGuideModal) {
        closePlatformGuide.addEventListener('click', function() {
            platformGuideModal.classList.add('animate-fade-out');
            setTimeout(() => {
                platformGuideModal.classList.add('hidden');
                platformGuideModal.classList.remove('animate-fade-out');
            }, 300);
        });
        
        // Close on outside click
        platformGuideModal.addEventListener('click', function(e) {
            if (e.target === platformGuideModal) {
                platformGuideModal.classList.add('animate-fade-out');
                setTimeout(() => {
                    platformGuideModal.classList.add('hidden');
                    platformGuideModal.classList.remove('animate-fade-out');
                }, 300);
            }
        });
    }
    
    // Update rug amount with animation
    updateRugStats();
    setInterval(updateRugStats, 60000); // Update every minute
    
    // Hero button actions
    const heroConnectBtn = document.getElementById('hero-connect-btn');
    const heroProtectBtn = document.getElementById('hero-protect-btn');
    
    if (heroConnectBtn) {
        heroConnectBtn.addEventListener('click', connectWallet);
    }
    
    if (heroProtectBtn) {
        heroProtectBtn.addEventListener('click', function() {
            window.location.href = 'dashboard.php';
        });
    }
    
    // Add typing effect to hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        let index = 0;
        
        function typeWriter() {
            if (index < text.length) {
                heroTitle.textContent += text.charAt(index);
                index++;
                setTimeout(typeWriter, 50);
            }
        }
        
        setTimeout(typeWriter, 500);
    }
}

// Initialize real-time updates
function initializeRealTimeUpdates() {
    // Connect to WebSocket for real-time updates (only if backend is enabled)
    if (USE_BACKEND_API) {
        connectWebSocket();
    }
    
    // Update price displays
    setInterval(updatePriceDisplays, 5000);
}

// WebSocket reconnection settings
let wsReconnectAttempts = 0;
const maxReconnectAttempts = 1; // Only try once to avoid console spam
let wsReconnectTimeout = null;

// Connect to WebSocket
function connectWebSocket() {
    // Don't attempt if we've exceeded max attempts
    if (wsReconnectAttempts >= maxReconnectAttempts) {
        console.log('WebSocket: Max reconnection attempts reached. Backend may not be running.');
        updateNetworkStatus('offline');
        return;
    }
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = function() {
            console.log('Connected to real-time updates');
            updateNetworkStatus('connected');
            wsReconnectAttempts = 0; // Reset attempts on successful connection
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
        };
        
        ws.onerror = function(error) {
            // Don't log error if backend is not running
            if (wsReconnectAttempts === 0) {
                console.log('WebSocket backend not running. Real-time updates disabled.');
            }
            updateNetworkStatus('degraded');
        };
        
        ws.onclose = function() {
            if (wsReconnectAttempts < maxReconnectAttempts) {
                console.log('WebSocket connection closed, reconnecting...');
                updateNetworkStatus('disconnected');
                wsReconnectAttempts++;
                
                // Clear any existing timeout
                if (wsReconnectTimeout) {
                    clearTimeout(wsReconnectTimeout);
                }
                
                // Exponential backoff: 5s, 10s, 20s
                const delay = 5000 * Math.pow(2, wsReconnectAttempts - 1);
                wsReconnectTimeout = setTimeout(connectWebSocket, delay);
            } else {
                updateNetworkStatus('offline');
            }
        };
    } catch (error) {
        console.warn('WebSocket not available. Backend may not be running.');
        updateNetworkStatus('offline');
    }
}

// Handle real-time updates
function handleRealtimeUpdate(data) {
    switch (data.type) {
        case 'price_update':
            updateTokenPrice(data.token, data.price);
            break;
        case 'rug_detected':
            handleRugDetection(data);
            break;
        case 'protection_triggered':
            handleProtectionTriggered(data);
            break;
        case 'activity':
            addActivityItem(data);
            break;
    }
}

// Update network status indicator with animation
function updateNetworkStatus(status) {
    const indicator = document.getElementById('network-indicator');
    const statusText = document.getElementById('network-status-text');
    
    if (indicator) {
        indicator.classList.add('animate-scale-in');
        
        switch (status) {
            case 'connected':
                indicator.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
                break;
            case 'disconnected':
                indicator.className = 'w-2 h-2 bg-red-500 rounded-full';
                break;
            case 'error':
                indicator.className = 'w-2 h-2 bg-yellow-500 rounded-full';
                break;
        }
    }
}

// Update rug statistics with animation
async function updateRugStats() {
    if (!USE_BACKEND_API) {
        // Use static values when backend is not available
        const rugAmountElement = document.getElementById('rug-amount');
        if (rugAmountElement) {
            const currentValue = parseInt(rugAmountElement.textContent) || 0;
            const newValue = 2500000; // Static value for demo
            animateValue(rugAmountElement, currentValue, newValue, 1000);
        }
        return;
    }
    
    try {
        const stats = await apiCall('stats/rugs');
        const rugAmountElement = document.getElementById('rug-amount');
        if (rugAmountElement && stats.weeklyLosses) {
            const currentValue = parseInt(rugAmountElement.textContent) || 0;
            const newValue = Math.floor(stats.weeklyLosses);
            animateValue(rugAmountElement, currentValue, newValue, 1000);
        }
    } catch (error) {
        console.error('Failed to update rug stats:', error);
    }
}

// Initialize protection monitoring
function initializeProtectionMonitoring() {
    if (legacyWalletState.connected) {
        // Initialize protection events for real-time notifications
        if (window.protectionEvents) {
            window.protectionEvents.init(legacyWalletState.address).catch(err => {
                console.error('Failed to initialize protection events:', err);
            });
        }
        
        // Initialize auto-sell module
        if (window.autoSell) {
            window.autoSell.init();
        }
        
        if (USE_BACKEND_API) {
            loadProtectedTokens();
            startMonitoring();
        }
    }
}

// Load protected tokens
async function loadProtectedTokens() {
    if (!USE_BACKEND_API) {
        // Skip if backend is not available
        return;
    }
    
    try {
        const response = await apiCall(`protected-tokens/${legacyWalletState.address}`);
        protectionState.activeProtections = response.tokens || [];
        updateProtectionUI();
    } catch (error) {
        console.error('Failed to load protected tokens:', error);
    }
}

// Start monitoring
async function startMonitoring() {
    if (!USE_BACKEND_API || !legacyWalletState.connected || protectionState.monitoring) return;
    
    try {
        await apiCall('monitoring/start', {
            method: 'POST',
            body: JSON.stringify({
                wallet: legacyWalletState.address,
                tokens: protectionState.activeProtections.map(p => p.address)
            })
        });
        
        protectionState.monitoring = true;
        // Only show notification for real events, not automatic starts
        // showNotification('Protection monitoring started', 'success');
    } catch (error) {
        console.error('Failed to start monitoring:', error);
        // Don't show notification for monitoring start failures
        // showNotification('Failed to start monitoring', 'error');
    }
}

// Wallet functionality
function initializeWallet() {
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    // Initialize WalletState if available and try to restore connection
    if (window.walletState) {
        // Listen for wallet state changes
        window.walletState.on('change', (state) => {
            legacyWalletState.connected = (state.status === 'connected');
            legacyWalletState.address = state.address;
            updateWalletUI();
            
            if (state.status === 'connected') {
                loadWalletData();
                initializeProtectionMonitoring();
            }
        });
        
        // Try to restore connection
        window.walletState.restoreConnection().then(restoredAddress => {
            if (restoredAddress) {
                console.log('Wallet connection restored:', restoredAddress);
            } else {
                // Check if we have a previously connected wallet that needs manual reconnection
                const currentState = window.walletState.state;
                if (currentState.address) {
                    // Show "reconnect" option in UI but don't mark as connected
                    updateWalletUIForReconnect(currentState.address);
                }
            }
        }).catch(error => {
            console.log('Could not restore wallet connection:', error.message);
        });
    } else {
        // Fallback for when walletState is not available yet
        setTimeout(() => initializeWallet(), 100);
    }
}

// Connect wallet function with animation
async function connectWallet() {
    try {
        // Check if Phantom wallet is installed
        if (!window.solana || !window.solana.isPhantom) {
            showNotification('Please install Phantom wallet to continue', 'error');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Connect to Phantom
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();
        
        // Update state
        legacyWalletState.connected = true;
        legacyWalletState.address = publicKey;
        
        // Note: localStorage is now handled by WalletState
        // This will be managed automatically through the adapter
        
        // Register wallet with backend
        await registerWallet(publicKey);
        
        // Update UI
        updateWalletUI();
        
        // Load wallet data
        await loadWalletData();
        
        // Initialize protection monitoring
        initializeProtectionMonitoring();
        
        // Don't show notification for wallet connection - it's obvious from UI change
        // showNotification('Wallet connected successfully!', 'success');
        
    } catch (err) {
        console.error('Error connecting wallet:', err);
        showNotification('Failed to connect wallet', 'error');
    }
}

// Register wallet with backend
async function registerWallet(address) {
    if (!USE_BACKEND_API) return;
    
    try {
        await apiCall('wallet/register', {
            method: 'POST',
            body: JSON.stringify({ address })
        });
    } catch (error) {
        console.error('Failed to register wallet:', error);
    }
}

// Load wallet data
async function loadWalletData() {
    if (!USE_BACKEND_API) {
        // Initialize with empty data when backend is not available
        legacyWalletState.tokens = [];
        return;
    }
    
    try {
        // Load wallet tokens
        const tokens = await apiCall(`wallet/${legacyWalletState.address}/tokens`);
        legacyWalletState.tokens = tokens || [];
        
        // Load protection stats
        const stats = await apiCall(`wallet/${legacyWalletState.address}/stats`);
        protectionState.stats = stats || protectionState.stats;
        
        updateDashboardStats();
    } catch (error) {
        console.error('Failed to load wallet data:', error);
    }
}

// Update dashboard statistics with animation
function updateDashboardStats() {
    const elements = {
        'total-protected': protectionState.stats.totalProtected,
        'sol-saved': protectionState.stats.solSaved?.toFixed(2),
        'rugs-avoided': protectionState.stats.rugsAvoided,
        'active-monitors': protectionState.activeProtections.length
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            const currentValue = parseFloat(element.textContent) || 0;
            animateValue(element, currentValue, value, 1000);
        }
    });
}

// Disconnect wallet
function disconnectWallet() {
    // Use WalletState to handle disconnect which will clear all localStorage
    if (window.walletState) {
        window.walletState.disconnect();
    } else if (window.walletAdapter) {
        // Fallback to adapter
        window.walletAdapter.disconnect();
    }
    
    legacyWalletState.connected = false;
    legacyWalletState.address = null;
    legacyWalletState.balance = 0;
    legacyWalletState.tokens = [];
    
    protectionState.monitoring = false;
    protectionState.activeProtections = [];
    
    if (window.solana) {
        window.solana.disconnect();
    }
    
    updateWalletUI();
    showNotification('Wallet disconnected', 'info');
    
    // Show connect wallet modal after disconnect
    setTimeout(() => {
        if (typeof openWalletConnectModal === 'function') {
            openWalletConnectModal();
        }
    }, 500);
}

// Update wallet UI with animations
function updateWalletUI() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const heroConnectBtn = document.getElementById('hero-connect-btn');
    const heroProtectBtn = document.getElementById('hero-protect-btn');
    const walletStatusDesktop = document.getElementById('wallet-status-desktop');
    const walletStatusMobile = document.getElementById('wallet-status-mobile');
    
    if (legacyWalletState.connected) {
        // Update connect button with animation
        if (connectBtn) {
            connectBtn.classList.add('animate-fade-in');
            connectBtn.innerHTML = `
                <span class="truncate">${formatAddress(legacyWalletState.address)}</span>
                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            `;
            connectBtn.removeEventListener('click', connectWallet);
            connectBtn.addEventListener('click', showWalletMenu);
        }
        
        // Show/hide hero buttons with animation
        if (heroConnectBtn) {
            heroConnectBtn.classList.add('animate-fade-out');
            setTimeout(() => heroConnectBtn.classList.add('hidden'), 300);
        }
        if (heroProtectBtn) {
            heroProtectBtn.classList.remove('hidden');
            heroProtectBtn.classList.add('animate-scale-in');
        }
        
        // Update wallet status
        const statusHTML = `
            <div class="flex items-center space-x-2 animate-fade-in">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-300">Protected</span>
            </div>
        `;
        
        if (walletStatusDesktop) walletStatusDesktop.innerHTML = statusHTML;
        if (walletStatusMobile) walletStatusMobile.innerHTML = statusHTML;
        
    } else {
        // Reset to connect state
        if (connectBtn) {
            connectBtn.innerHTML = 'Connect Wallet';
            connectBtn.removeEventListener('click', showWalletMenu);
            connectBtn.addEventListener('click', connectWallet);
        }
        
        // Show/hide hero buttons
        if (heroConnectBtn) {
            heroConnectBtn.classList.remove('hidden');
            heroConnectBtn.classList.add('animate-fade-in');
        }
        if (heroProtectBtn) {
            heroProtectBtn.classList.add('animate-fade-out');
            setTimeout(() => heroProtectBtn.classList.add('hidden'), 300);
        }
        
        // Clear wallet status
        if (walletStatusDesktop) walletStatusDesktop.innerHTML = '';
        if (walletStatusMobile) walletStatusMobile.innerHTML = '';
    }
}

// Format wallet address
function formatAddress(address) {
    if (!address) return '';
    return address.slice(0, 4) + '...' + address.slice(-4);
}

// Update wallet UI for reconnection state
function updateWalletUIForReconnect(savedAddress) {
    const connectBtn = document.getElementById('connect-wallet-btn');
    
    if (connectBtn) {
        connectBtn.innerHTML = `
            <span class="text-orange-400">Reconnect</span>
            <span class="truncate text-xs">${formatAddress(savedAddress)}</span>
        `;
        connectBtn.classList.add('border-orange-500/50', 'bg-orange-500/10');
        
        // Add click handler to reconnect
        connectBtn.removeEventListener('click', connectWallet);
        connectBtn.addEventListener('click', async () => {
            try {
                // Try to connect using wallet adapter
                if (window.walletAdapter) {
                    await walletAdapter.connectWatchMode();
                    
                    // If successful, update state
                    legacyWalletState.connected = true;
                    legacyWalletState.address = walletAdapter.publicKey;
                    updateWalletUI();
                    loadWalletData();
                    initializeProtectionMonitoring();
                    
                    showNotification('Wallet reconnected!', 'success');
                } else {
                    // Fallback to regular connect
                    await connectWallet();
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
                showNotification('Failed to reconnect wallet', 'error');
                
                // Reset to normal connect state on failure
                connectBtn.innerHTML = 'Connect Wallet';
                connectBtn.classList.remove('border-orange-500/50', 'bg-orange-500/10');
                connectBtn.removeEventListener('click', arguments.callee);
                connectBtn.addEventListener('click', connectWallet);
            }
        });
    }
}

// Show wallet menu with animation
function showWalletMenu(e) {
    e.stopPropagation();
    
    // Create menu if it doesn't exist
    let menu = document.getElementById('wallet-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'wallet-menu';
        menu.className = 'absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50 hidden';
        menu.innerHTML = `
            <button onclick="disconnectWallet()" class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Disconnect Wallet
            </button>
        `;
        
        const connectBtn = document.getElementById('connect-wallet-btn');
        if (connectBtn && connectBtn.parentElement) {
            connectBtn.parentElement.appendChild(menu);
        }
    }
    
    // Toggle menu with animation
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('animate-slide-down');
    } else {
        menu.classList.add('animate-slide-up');
        setTimeout(() => menu.classList.add('hidden'), 300);
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.classList.add('animate-slide-up');
            setTimeout(() => {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }, 300);
        }
    });
}

// Enhanced notification with sexy dashboard-matching design
function showNotification(message, type = 'info', duration = 4000) {
    // Create unique ID for this notification
    const notificationId = 'notification-' + Date.now();
    
    // Icon based on type
    const icons = {
        success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>`
    };
    
    // Color schemes based on type
    const colorSchemes = {
        success: {
            bg: 'bg-gradient-to-r from-green-900/90 to-green-800/90',
            border: 'border-green-500/30',
            icon: 'text-green-400',
            text: 'text-green-50',
            glow: 'rgba(34, 197, 94, 0.3)'
        },
        error: {
            bg: 'bg-gradient-to-r from-red-900/90 to-red-800/90',
            border: 'border-red-500/30',
            icon: 'text-red-400',
            text: 'text-red-50',
            glow: 'rgba(239, 68, 68, 0.3)'
        },
        info: {
            bg: 'bg-gradient-to-r from-blue-900/90 to-blue-800/90',
            border: 'border-blue-500/30',
            icon: 'text-blue-400',
            text: 'text-blue-50',
            glow: 'rgba(59, 130, 246, 0.3)'
        },
        warning: {
            bg: 'bg-gradient-to-r from-orange-900/90 to-orange-800/90',
            border: 'border-orange-500/30',
            icon: 'text-orange-400',
            text: 'text-orange-50',
            glow: 'rgba(251, 146, 60, 0.3)'
        }
    };
    
    const scheme = colorSchemes[type] || colorSchemes.info;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `fixed top-24 right-6 z-[100] transform transition-all duration-500 ease-out translate-x-full opacity-0`;
    
    notification.innerHTML = `
        <div class="${scheme.bg} backdrop-blur-xl border ${scheme.border} rounded-2xl shadow-2xl overflow-hidden min-w-[320px] max-w-[420px]" style="box-shadow: 0 0 40px ${scheme.glow}, 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <!-- Animated background gradient -->
            <div class="absolute inset-0 opacity-30">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
            
            <!-- Content -->
            <div class="relative px-5 py-4">
                <div class="flex items-start space-x-4">
                    <!-- Icon container with pulse -->
                    <div class="flex-shrink-0">
                        <div class="relative">
                            <div class="absolute inset-0 ${scheme.icon} blur-xl opacity-50 animate-pulse"></div>
                            <div class="${scheme.icon} relative">
                                ${icons[type] || icons.info}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Message -->
                    <div class="flex-1 pt-0.5">
                        <p class="${scheme.text} text-sm font-medium leading-relaxed">
                            ${message}
                        </p>
                        <p class="text-xs ${scheme.text} opacity-60 mt-1">
                            ${new Date().toLocaleTimeString()}
                        </p>
                    </div>
                    
                    <!-- Close button -->
                    <button onclick="closeNotification('${notificationId}')" class="${scheme.icon} opacity-60 hover:opacity-100 transition-opacity">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Progress bar -->
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
                    <div class="h-full ${scheme.bg} animate-shrink" style="animation-duration: ${duration}ms;"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add shimmer animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
        }
        .animate-shimmer {
            animation: shimmer 2s infinite;
        }
        .animate-shrink {
            animation: shrink linear forwards;
        }
    `;
    document.head.appendChild(style);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    });
    
    // Auto remove
    setTimeout(() => {
        closeNotification(notificationId);
    }, duration);
}

// Close notification function
window.closeNotification = function(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }
}

// Handle rug detection with animation
function handleRugDetection(data) {
    showNotification(`⚠️ Rug detected on ${data.token}! Auto-exiting...`, 'error');
    
    // Add to activity feed
    addActivityItem({
        type: 'rug_detection',
        token: data.token,
        reason: data.reason,
        timestamp: new Date()
    });
    
    // Add screen flash effect
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-red-500 opacity-0 pointer-events-none z-50';
    document.body.appendChild(flash);
    
    flash.animate([
        { opacity: 0 },
        { opacity: 0.3 },
        { opacity: 0 }
    ], {
        duration: 300,
        easing: 'ease-out'
    }).onfinish = () => flash.remove();
}

// Handle protection triggered
function handleProtectionTriggered(data) {
    showNotification(`✅ Protected! Swapped ${data.token} to ${data.exitToken}`, 'success');
    
    // Update stats
    protectionState.stats.rugsAvoided++;
    protectionState.stats.solSaved += data.savedAmount || 0;
    updateDashboardStats();
    
    // Reload protected tokens
    loadProtectedTokens();
}

// Add activity item with animation
function addActivityItem(activity) {
    const activityFeed = document.getElementById('activity-feed');
    const activityLog = document.getElementById('activity-log');
    
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-4 bg-gray-800/50 rounded-lg animate-slide-in opacity-0';
    
    const statusColor = activity.type === 'rug_detection' ? 'bg-red-500' : 'bg-green-500';
    const timeAgo = getTimeAgo(activity.timestamp);
    
    item.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="w-2 h-2 ${statusColor} rounded-full animate-pulse"></div>
            <span class="text-sm text-gray-300">
                ${activity.token} ${activity.action || activity.type}
                ${activity.reason ? `<span class="text-xs text-gray-500">(${activity.reason})</span>` : ''}
            </span>
        </div>
        <span class="text-xs text-gray-500">${timeAgo}</span>
    `;
    
    // Add to both activity feeds if they exist
    [activityFeed, activityLog].forEach(container => {
        if (container) {
            const newItem = item.cloneNode(true);
            container.insertBefore(newItem, container.firstChild);
            
            // Animate in
            setTimeout(() => {
                newItem.classList.remove('opacity-0');
                newItem.classList.add('opacity-100');
            }, 100);
            
            // Remove old items with fade out
            while (container.children.length > 5) {
                const lastChild = container.lastChild;
                lastChild.classList.add('animate-fade-out');
                setTimeout(() => lastChild.remove(), 300);
            }
        }
    });
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

// Update token price with flash animation
function updateTokenPrice(tokenAddress, price) {
    const priceElements = document.querySelectorAll(`[data-token="${tokenAddress}"] .token-price`);
    priceElements.forEach(element => {
        const oldPrice = parseFloat(element.textContent) || 0;
        element.textContent = price.toFixed(6);
        
        // Add flash animation
        if (price > oldPrice) {
            element.classList.add('text-green-500', 'animate-pulse');
        } else if (price < oldPrice) {
            element.classList.add('text-red-500', 'animate-pulse');
        }
        
        setTimeout(() => {
            element.classList.remove('text-green-500', 'text-red-500', 'animate-pulse');
        }, 1000);
    });
}

// Update price displays
async function updatePriceDisplays() {
    if (!legacyWalletState.connected || !Array.isArray(legacyWalletState.tokens) || legacyWalletState.tokens.length === 0) return;
    
    try {
        const prices = await apiCall(`prices/${legacyWalletState.tokens.map(t => t.address).join(',')}`);
        Object.entries(prices).forEach(([token, price]) => {
            updateTokenPrice(token, price);
        });
    } catch (error) {
        console.error('Failed to update prices:', error);
    }
}

// Update protection UI
function updateProtectionUI() {
    // Update protection toggles
    document.querySelectorAll('.protection-toggle').forEach(toggle => {
        const tokenAddress = toggle.dataset.token;
        const isProtected = protectionState.activeProtections.some(p => p.address === tokenAddress);
        toggle.checked = isProtected;
    });
}

// Track if backend is available
let backendAvailable = true;

// Utility function for API calls
async function apiCall(endpoint, options = {}) {
    // If backend is not available, return early with mock data
    if (!backendAvailable) {
        console.warn(`Backend not available, skipping API call to: ${endpoint}`);
        
        // Return mock data for certain endpoints
        if (endpoint.includes('stats/rugs')) {
            return { detected: 0, stopped: 0, saved: '$0' };
        }
        if (endpoint.includes('protected-tokens')) {
            return { tokens: [] };
        }
        if (endpoint.includes('wallet') && endpoint.includes('tokens')) {
            return [];
        }
        if (endpoint.includes('prices')) {
            return {};
        }
        
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            // If backend is down, mark it as unavailable
            if (response.status === 0 || response.status >= 500) {
                backendAvailable = false;
                console.warn('Backend appears to be down. Switching to offline mode.');
            }
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        // Network errors indicate backend is not available
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            backendAvailable = false;
            console.warn('Backend is not reachable. Running in offline mode.');
            
            // Return mock data based on endpoint
            if (endpoint.includes('stats/rugs')) {
                return { detected: 0, stopped: 0, saved: '$0' };
            }
            return null;
        }
        
        console.error('API call error:', error);
        throw error;
    }
}

// Protection functions
window.protectToken = async function(tokenAddress, settings) {
    try {
        const response = await apiCall('protect', {
            method: 'POST',
            body: JSON.stringify({
                wallet: legacyWalletState.address,
                token: tokenAddress,
                settings: settings
            })
        });
        
        if (response.success) {
            showNotification('Token protection activated!', 'success');
            // Reload protected tokens
            await loadProtectedTokens();
            return true;
        }
        
        throw new Error(response.error || 'Failed to protect token');
    } catch (error) {
        console.error('Protection error:', error);
        showNotification(error.message, 'error');
        return false;
    }
};

// Export global functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.showNotification = showNotification;
window.apiCall = apiCall;
// window.walletState = walletState; // REMOVED: This was overwriting the proper walletState from wallet-state.js
window.protectionState = protectionState;