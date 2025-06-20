// Configuration
const API_BASE_URL = 'http://localhost:3001/api'; // Backend server URL
const WS_URL = 'ws://localhost:3001'; // WebSocket URL for real-time updates

// Global state
let walletState = {
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
    initializeAnimations();
    initializeIntersectionObservers();
    initializeParallaxEffects();
    initializeHeader();
    initializeHero();
    initializeWallet();
    initializeRealTimeUpdates();
    initializeProtectionMonitoring();
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
            window.location.href = 'protect.php';
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
    // Connect to WebSocket for real-time updates
    connectWebSocket();
    
    // Update price displays
    setInterval(updatePriceDisplays, 5000);
}

// WebSocket reconnection settings
let wsReconnectAttempts = 0;
const maxReconnectAttempts = 3;
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
            if (wsReconnectAttempts < maxReconnectAttempts) {
                console.warn('WebSocket connection failed, attempt', wsReconnectAttempts + 1);
            }
            updateNetworkStatus('error');
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
    if (walletState.connected) {
        loadProtectedTokens();
        startMonitoring();
    }
}

// Load protected tokens
async function loadProtectedTokens() {
    try {
        const response = await apiCall(`protected-tokens/${walletState.address}`);
        protectionState.activeProtections = response.tokens || [];
        updateProtectionUI();
    } catch (error) {
        console.error('Failed to load protected tokens:', error);
    }
}

// Start monitoring
async function startMonitoring() {
    if (!walletState.connected || protectionState.monitoring) return;
    
    try {
        await apiCall('monitoring/start', {
            method: 'POST',
            body: JSON.stringify({
                wallet: walletState.address,
                tokens: protectionState.activeProtections.map(p => p.address)
            })
        });
        
        protectionState.monitoring = true;
        showNotification('Protection monitoring started', 'success');
    } catch (error) {
        console.error('Failed to start monitoring:', error);
        showNotification('Failed to start monitoring', 'error');
    }
}

// Wallet functionality
function initializeWallet() {
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem('walletAddress');
    if (savedWallet) {
        walletState.connected = true;
        walletState.address = savedWallet;
        updateWalletUI();
        loadWalletData();
    }
}

// Connect wallet function with animation
async function connectWallet() {
    try {
        // Check if Phantom wallet is installed
        if (!window.solana || !window.solana.isPhantom) {
            alert('Please install Phantom wallet to continue');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Connect to Phantom
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();
        
        // Update state
        walletState.connected = true;
        walletState.address = publicKey;
        
        // Save to localStorage
        localStorage.setItem('walletAddress', publicKey);
        
        // Register wallet with backend
        await registerWallet(publicKey);
        
        // Update UI
        updateWalletUI();
        
        // Load wallet data
        await loadWalletData();
        
        // Initialize protection monitoring
        initializeProtectionMonitoring();
        
        // Show success message with animation
        showNotification('Wallet connected successfully!', 'success');
        
    } catch (err) {
        console.error('Error connecting wallet:', err);
        showNotification('Failed to connect wallet', 'error');
    }
}

// Register wallet with backend
async function registerWallet(address) {
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
    try {
        // Load wallet tokens
        const tokens = await apiCall(`wallet/${walletState.address}/tokens`);
        walletState.tokens = tokens || [];
        
        // Load protection stats
        const stats = await apiCall(`wallet/${walletState.address}/stats`);
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
    walletState.connected = false;
    walletState.address = null;
    walletState.balance = 0;
    walletState.tokens = [];
    
    protectionState.monitoring = false;
    protectionState.activeProtections = [];
    
    localStorage.removeItem('walletAddress');
    
    if (window.solana) {
        window.solana.disconnect();
    }
    
    updateWalletUI();
    showNotification('Wallet disconnected', 'info');
}

// Update wallet UI with animations
function updateWalletUI() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const heroConnectBtn = document.getElementById('hero-connect-btn');
    const heroProtectBtn = document.getElementById('hero-protect-btn');
    const walletStatusDesktop = document.getElementById('wallet-status-desktop');
    const walletStatusMobile = document.getElementById('wallet-status-mobile');
    
    if (walletState.connected) {
        // Update connect button with animation
        if (connectBtn) {
            connectBtn.classList.add('animate-fade-in');
            connectBtn.innerHTML = `
                <span class="truncate">${formatAddress(walletState.address)}</span>
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

// Enhanced notification with better animations
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
        'bg-blue-600'
    } text-white transform transition-all opacity-0`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add fade effect
    setTimeout(() => {
        notification.classList.remove('opacity-0');
        notification.classList.add('animate-slide-in');
    }, 10);
    
    // Remove with fade out
    setTimeout(() => {
        notification.classList.add('animate-fade-out', 'translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
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
    if (!walletState.connected || walletState.tokens.length === 0) return;
    
    try {
        const prices = await apiCall(`prices/${walletState.tokens.map(t => t.address).join(',')}`);
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

// Protection functions for protect.php
window.protectToken = async function(tokenAddress, settings) {
    try {
        const response = await apiCall('protect', {
            method: 'POST',
            body: JSON.stringify({
                wallet: walletState.address,
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
window.walletState = walletState;
window.protectionState = protectionState;