// BannerController - Unified banner management with WalletState integration
// Handles all banner visibility logic with smooth Tailwind transitions

class BannerController {
    constructor() {
        // Banner element references - will be populated during init
        this.banners = {
            connectWallet: null,          // connect-wallet-banner
            fullProtection: null,         // full-protection-banner  
            protectedStatus: null,        // protected-status-banner
            newModes: null               // new-modes-banner (if exists)
        };

        // Transition classes for smooth animations
        this.transitionClasses = ['transition-opacity', 'duration-300'];
        
        // Current visibility state tracking
        this.visibilityState = {
            connectWallet: false,
            fullProtection: false,
            protectedStatus: false,
            newModes: false
        };

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.updateBannerVisibility = this.updateBannerVisibility.bind(this);
        this.showBanner = this.showBanner.bind(this);
        this.hideBanner = this.hideBanner.bind(this);
        this.onWalletStateChange = this.onWalletStateChange.bind(this);

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }

    // Initialize banner controller
    init() {
        console.log('BannerController: Initializing...');
        
        // Get references to banner elements
        this.banners.connectWallet = document.getElementById('connect-wallet-banner');
        this.banners.fullProtection = document.getElementById('full-protection-banner');
        this.banners.protectedStatus = document.getElementById('protected-status-banner');
        this.banners.newModes = document.getElementById('new-modes-banner');

        // Log which banners were found
        Object.entries(this.banners).forEach(([key, element]) => {
            console.log(`BannerController: ${key} banner ${element ? 'found' : 'not found'}`);
        });

        // Add transition classes to all banner elements
        this.addTransitionClasses();

        // Listen for WalletState changes
        if (window.walletState) {
            window.walletState.on('change', this.onWalletStateChange);
            
            // Initial banner visibility update
            this.onWalletStateChange(window.walletState.getState());
        } else {
            console.warn('BannerController: WalletState not available, waiting...');
            
            // Fallback: listen for when walletState becomes available
            this.waitForWalletState();
        }

        // Handle new modes banner dismissal if it exists
        this.initNewModesBanner();

        console.log('BannerController: Initialized successfully');
    }

    // Wait for WalletState to become available
    waitForWalletState() {
        const checkWalletState = () => {
            if (window.walletState) {
                console.log('BannerController: WalletState now available');
                window.walletState.on('change', this.onWalletStateChange);
                this.onWalletStateChange(window.walletState.getState());
            } else {
                setTimeout(checkWalletState, 100);
            }
        };
        checkWalletState();
    }

    // Add transition classes to all banner elements
    addTransitionClasses() {
        Object.values(this.banners).forEach(banner => {
            if (banner) {
                this.transitionClasses.forEach(className => {
                    banner.classList.add(className);
                });
                // Ensure banner starts with proper initial state
                if (!banner.classList.contains('hidden')) {
                    banner.classList.add('opacity-100');
                } else {
                    banner.classList.add('opacity-0');
                }
            }
        });
    }

    // Handle WalletState changes
    onWalletStateChange(state) {
        console.log('BannerController: WalletState changed', state);
        this.updateBannerVisibility(state);
    }

    // Main logic for determining banner visibility based on wallet state
    updateBannerVisibility(state) {
        const { status, address, mode } = state;

        // Determine which banners should be visible
        const shouldShow = {
            connectWallet: false,
            fullProtection: false,
            protectedStatus: false,
            newModes: this.shouldShowNewModesBanner()
        };

        // Logic for banner visibility based on wallet state
        if (!address || status === 'disconnected' || status === 'idle') {
            // No wallet connected or disconnected - show connect wallet banner
            shouldShow.connectWallet = true;
            console.log('BannerController: Should show connect wallet banner');
        } else if (status === 'connected') {
            if (mode === 'full') {
                // Full protection enabled - show protected status banner
                shouldShow.protectedStatus = true;
                console.log('BannerController: Should show protected status banner');
            } else if (mode === 'watch') {
                // Wallet connected but only watch mode - show full protection upgrade banner
                shouldShow.fullProtection = true;
                console.log('BannerController: Should show full protection banner');
            }
        }

        // Update banner visibility with smooth transitions
        this.updateBannerStates(shouldShow);
    }

    // Update banner states with smooth transitions
    updateBannerStates(shouldShow) {
        Object.keys(this.banners).forEach(bannerKey => {
            const banner = this.banners[bannerKey];
            const shouldBeVisible = shouldShow[bannerKey];
            const currentlyVisible = this.visibilityState[bannerKey];

            if (banner && shouldBeVisible !== currentlyVisible) {
                if (shouldBeVisible) {
                    this.showBanner(bannerKey);
                } else {
                    this.hideBanner(bannerKey);
                }
                this.visibilityState[bannerKey] = shouldBeVisible;
            }
        });
    }

    // Show banner with smooth transition
    showBanner(bannerKey) {
        const banner = this.banners[bannerKey];
        if (!banner) return;

        console.log(`BannerController: Showing ${bannerKey} banner`);

        // Remove hidden class and ensure display is block
        banner.classList.remove('hidden');
        if (banner.style.display === 'none') {
            banner.style.display = 'block';
        }
        
        // Force reflow to ensure the element is rendered
        banner.offsetHeight;
        
        // Add opacity class to trigger fade in transition
        banner.classList.remove('opacity-0');
        banner.classList.add('opacity-100');
    }

    // Hide banner with smooth transition
    hideBanner(bannerKey) {
        const banner = this.banners[bannerKey];
        if (!banner) return;

        console.log(`BannerController: Hiding ${bannerKey} banner`);

        // Start fade out transition
        banner.classList.remove('opacity-100');
        banner.classList.add('opacity-0');
        
        // Hide the banner after transition completes (300ms duration)
        setTimeout(() => {
            if (banner.classList.contains('opacity-0')) {
                banner.classList.add('hidden');
                banner.style.display = 'none';
            }
        }, 300); // Match duration-300
    }

    // Check if new modes banner should be shown
    shouldShowNewModesBanner() {
        const dismissed = localStorage.getItem('newModesBannerDismissed');
        return !dismissed;
    }

    // Initialize new modes banner functionality
    initNewModesBanner() {
        const closeBtn = document.getElementById('close-new-modes-banner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dismissNewModesBanner();
            });
        }

        // Show new modes banner initially if not dismissed and banner exists
        if (this.shouldShowNewModesBanner() && this.banners.newModes) {
            this.visibilityState.newModes = true;
            this.showBanner('newModes');
        }
    }

    // Dismiss new modes banner permanently
    dismissNewModesBanner() {
        localStorage.setItem('newModesBannerDismissed', 'true');
        this.hideBanner('newModes');
        this.visibilityState.newModes = false;
    }

    // Public API: Force refresh banner visibility
    refresh() {
        if (window.walletState) {
            this.onWalletStateChange(window.walletState.getState());
        }
    }

    // Public API: Manually show/hide specific banner
    setBannerVisibility(bannerKey, visible) {
        if (this.banners[bannerKey]) {
            if (visible) {
                this.showBanner(bannerKey);
            } else {
                this.hideBanner(bannerKey);
            }
            this.visibilityState[bannerKey] = visible;
        }
    }

    // Public API: Get current banner states
    getBannerStates() {
        return { ...this.visibilityState };
    }

    // Public API: Get banner elements (for debugging)
    getBannerElements() {
        return { ...this.banners };
    }
}

// Create singleton instance
const bannerController = new BannerController();

// Export for global access
window.BannerController = BannerController;
window.bannerController = bannerController;

// Export as module if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = bannerController;
}
