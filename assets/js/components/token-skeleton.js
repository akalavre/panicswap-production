/**
 * Token Loading Skeleton Component
 * Provides smooth loading states for token cards
 */

// Create skeleton HTML for a token row
function createTokenRowSkeleton(index = 0) {
    const delay = index * 50; // Stagger animation
    
    return `
        <tr class="animate-fade-in" style="animation-delay: ${delay}ms">
            <!-- Token Info -->
            <td class="px-4 py-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
                    <div class="flex-1">
                        <div class="h-4 w-16 bg-gray-800 rounded animate-pulse mb-1"></div>
                        <div class="h-3 w-24 bg-gray-800/60 rounded animate-pulse"></div>
                    </div>
                </div>
            </td>
            
            <!-- Risk Badge -->
            <td class="px-4 py-4 text-center">
                <div class="inline-flex h-6 w-20 bg-gray-800 rounded-full animate-pulse mx-auto"></div>
            </td>
            
            <!-- Age -->
            <td class="px-4 py-4 text-center">
                <div class="h-4 w-12 bg-gray-800 rounded animate-pulse mx-auto"></div>
            </td>
            
            <!-- Price -->
            <td class="px-4 py-4 text-right">
                <div class="space-y-1">
                    <div class="h-4 w-20 bg-gray-800 rounded animate-pulse ml-auto"></div>
                    <div class="h-3 w-16 bg-gray-800/60 rounded animate-pulse ml-auto"></div>
                </div>
            </td>
            
            <!-- Balance -->
            <td class="px-4 py-4 text-right">
                <div class="h-4 w-24 bg-gray-800 rounded animate-pulse ml-auto"></div>
            </td>
            
            <!-- Value -->
            <td class="px-4 py-4 text-right">
                <div class="h-5 w-20 bg-gray-800 rounded animate-pulse ml-auto"></div>
            </td>
            
            <!-- Dev Activity -->
            <td class="px-4 py-4 text-center">
                <div class="h-6 w-16 bg-gray-800 rounded animate-pulse mx-auto"></div>
            </td>
            
            <!-- Holders -->
            <td class="px-4 py-4 text-center">
                <div class="h-4 w-16 bg-gray-800 rounded animate-pulse mx-auto"></div>
            </td>
            
            <!-- Market Cap -->
            <td class="px-4 py-4 text-right">
                <div class="h-4 w-20 bg-gray-800 rounded animate-pulse ml-auto"></div>
            </td>
            
            <!-- Creator % -->
            <td class="px-4 py-4 text-center">
                <div class="h-4 w-12 bg-gray-800 rounded animate-pulse mx-auto"></div>
            </td>
            
            <!-- Protection Toggle -->
            <td class="px-4 py-4 text-center">
                <div class="inline-flex items-center justify-center">
                    <div class="w-10 h-5 bg-gray-800 rounded-full animate-pulse"></div>
                </div>
            </td>
            
            <!-- Actions -->
            <td class="px-4 py-4 text-center sticky right-0 bg-gray-900">
                <div class="flex items-center justify-center gap-2">
                    <div class="w-8 h-8 bg-gray-800 rounded-lg animate-pulse"></div>
                    <div class="w-8 h-8 bg-gray-800 rounded-lg animate-pulse"></div>
                </div>
            </td>
        </tr>
    `;
}

// Create multiple skeleton rows
function createTokenListSkeleton(count = 5) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += createTokenRowSkeleton(i);
    }
    return html;
}

// Create skeleton for empty state
function createEmptyStateSkeleton() {
    return `
        <div class="py-16 text-center">
            <div class="mx-auto w-32 h-32 mb-8">
                <div class="w-full h-full bg-gray-800/50 rounded-full animate-pulse"></div>
            </div>
            <div class="space-y-4 max-w-sm mx-auto">
                <div class="h-6 w-48 bg-gray-800 rounded animate-pulse mx-auto"></div>
                <div class="h-4 w-64 bg-gray-800/60 rounded animate-pulse mx-auto"></div>
                <div class="h-4 w-56 bg-gray-800/60 rounded animate-pulse mx-auto"></div>
            </div>
            <div class="mt-8">
                <div class="h-10 w-32 bg-gray-800 rounded-lg animate-pulse mx-auto"></div>
            </div>
        </div>
    `;
}

// Show loading state
function showTokenListLoading(containerId = 'token-list-tbody-v3', count = 5) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = createTokenListSkeleton(count);
        
        // Show loading indicator
        const loadingState = document.getElementById('loading-state-v3');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state-v3');
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
    }
}

// Hide loading state
function hideTokenListLoading() {
    const loadingState = document.getElementById('loading-state-v3');
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
}

// Error state component
function createErrorState(message = 'Failed to load tokens', retry = null) {
    return `
        <div class="py-16 text-center">
            <div class="mx-auto w-20 h-20 mb-6">
                <div class="w-full h-full bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">${message}</h3>
            <p class="text-gray-400 mb-6">Please check your connection and try again</p>
            ${retry ? `
                <button onclick="${retry}" class="btn btn-primary">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Retry
                </button>
            ` : ''}
        </div>
    `;
}

// Export functions
window.TokenSkeleton = {
    showLoading: showTokenListLoading,
    hideLoading: hideTokenListLoading,
    createRowSkeleton: createTokenRowSkeleton,
    createListSkeleton: createTokenListSkeleton,
    createEmptyStateSkeleton: createEmptyStateSkeleton,
    createErrorState: createErrorState
};