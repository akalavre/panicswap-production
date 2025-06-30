<?php
/**
 * Token Display Helper
 * Shared rendering logic for tokens across all token list views
 * Handles loading states for tokens with pending metadata
 * Includes risk badge rendering functionality
 */

function renderTokenDisplay($token) {
    // Check if token has pending metadata
    $isPending = isset($token['metadata_status']) && $token['metadata_status'] === 'pending';
    
    if ($isPending) {
        // Return loading state with gradient animation
        return '
            <div class="flex items-center">
                <div class="h-8 w-8 rounded-full mr-3 token-loader"></div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium token-loading-text">Loading...</span>
                    </div>
                    <div class="text-sm text-gray-500">Fetching metadata</div>
                </div>
            </div>
        ';
    }
    
    // Extract and sanitize token data
    $symbol = htmlspecialchars($token['symbol'] ?? 'UNKNOWN', ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars($token['name'] ?? 'Unknown Token', ENT_QUOTES, 'UTF-8');
    $tokenMint = htmlspecialchars($token['mint'] ?? $token['address'] ?? '', ENT_QUOTES, 'UTF-8');
    
    // Handle image URL - check multiple possible fields
    $imageUrl = $token['image'] ?? $token['logo_uri'] ?? $token['logo_url'] ?? '/assets/images/token-placeholder.svg';
    $image = htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8');
    
    // Generate risk badge HTML
    $riskBadge = renderRiskBadge($tokenMint);
    
    // Return normal token display
    return '
        <div class="flex items-center">
            <img alt="' . $symbol . '" 
                 class="h-8 w-8 rounded-full mr-3" 
                 src="' . $image . '"
                 onerror="this.src=\'/assets/images/token-placeholder.svg\'">            <div>
                <div class="flex items-center gap-2">
                    <span class="font-medium">' . $symbol . '</span>
                    ' . $riskBadge . '
                </div>
                <div class="text-sm text-gray-400">' . $name . '</div>
            </div>
        </div>
    ';
}

/**
 * Render initial server-side risk badge HTML
 * This provides the initial HTML structure that UnifiedBadgeService will replace
 * @param string $tokenMint - Token mint address
 * @return string HTML for the risk badge
 */
function renderRiskBadge($tokenMint) {
    // Return empty string if no token mint provided
    if (empty($tokenMint)) {
        return '';
    }
    
    // Server-side renders loading state by default
    // UnifiedBadgeService will replace this with actual badge state
    return '
        <span data-risk-badge="' . $tokenMint . '">
            <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md bg-gray-500/10 border-gray-500/20 text-gray-400 cursor-help unified-badge"
                  data-token-mint="' . $tokenMint . '">
                <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Loading</span>
            </span>
        </span>
    ';
}
?>
