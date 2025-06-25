<?php
/**
 * Token Display Helper
 * Shared rendering logic for tokens across all token list views
 * Handles loading states for tokens with pending metadata
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
    
    // Handle image URL - check multiple possible fields
    $imageUrl = $token['image'] ?? $token['logo_uri'] ?? $token['logo_url'] ?? '/assets/images/token-placeholder.svg';
    $image = htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8');
    
    // Return normal token display
    return '
        <div class="flex items-center">
            <img alt="' . $symbol . '" 
                 class="h-8 w-8 rounded-full mr-3" 
                 src="' . $image . '"
                 onerror="this.src=\'/assets/images/token-placeholder.svg\'">
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-medium">' . $symbol . '</span>
                </div>
                <div class="text-sm text-gray-400">' . $name . '</div>
            </div>
        </div>
    ';
}
?>