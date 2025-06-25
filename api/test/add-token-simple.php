<?php
// Disable error display in production for security
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load environment configuration first
require_once dirname(__DIR__, 2) . '/env-config.php';

// Then load Supabase config
require_once __DIR__ . '/../supabase-config.php';

// Security: Set proper CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Function to fetch token data from PumpFun API
function fetchTokenDataFromPumpFun($tokenMint) {
    try {
        // Use the token mint as-is
        $url = "https://pumpfun-scraper-api.p.rapidapi.com/search_tokens?term={$tokenMint}";
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-rapidapi-host: pumpfun-scraper-api.p.rapidapi.com',
            'x-rapidapi-key: 569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($httpCode !== 200 || $error) {
            error_log("PumpFun API error: HTTP $httpCode - $error");
            return null;
        }
        
        $data = json_decode($response, true);
        
        if (!$data || !isset($data['data']) || count($data['data']) === 0) {
            error_log("PumpFun API: No data found for token $tokenMint");
            return null;
        }
        
        $tokenData = $data['data'][0];
        
        // Calculate price from market cap (assuming 1B total supply)
        $price = ($tokenData['marketCap'] ?? 0) / 1000000000;
        
        // Calculate liquidity based on bonding curve progress
        $liquidity = ($tokenData['marketCap'] ?? 0) * ($tokenData['bondingCurveProgress'] ?? 0.1);
        
        return [
            'symbol' => $tokenData['ticker'] ?? null,
            'name' => $tokenData['name'] ?? null,
            'image' => $tokenData['imageUrl'] ?? null,
            'decimals' => 6, // Standard for pump.fun tokens
            'current_price' => $price,
            'market_cap' => $tokenData['marketCap'] ?? 0,
            'volume_24h' => $tokenData['volume'] ?? 0,
            'holder_count' => $tokenData['numHolders'] ?? 0,
            'current_liquidity' => $liquidity,
            'price_24h_change' => 0, // Not provided by PumpFun
            'bonding_curve_progress' => $tokenData['bondingCurveProgress'] ?? 0,
            'dev_wallet' => $tokenData['dev'] ?? null,
            'sniper_count' => $tokenData['sniperCount'] ?? 0,
            'source' => 'pumpfun'
        ];
    } catch (Exception $e) {
        error_log("PumpFun API exception: " . $e->getMessage());
        return null;
    }
}

// Function to fetch token metadata from Helius RPC
function fetchTokenMetadataFromHelius($tokenMint) {
    // First try PumpFun API for pump.fun tokens
    $pumpData = fetchTokenDataFromPumpFun($tokenMint);
    if ($pumpData) {
        error_log("Successfully fetched data from PumpFun API for token: $tokenMint");
        return $pumpData;
    }
    
    $heliusApiKey = getenv('HELIUS_API_KEY');
    $heliusUrl = "https://mainnet.helius-rpc.com/?api-key={$heliusApiKey}";
    
    // Get token metadata using getAsset method
    $postData = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'getAsset',
        'params' => [
            'id' => $tokenMint
        ]
    ];
    
    $ch = curl_init($heliusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("Helius API request failed: HTTP $httpCode - $response");
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || isset($data['error']) || !isset($data['result'])) {
        error_log("Helius API error: " . ($data['error']['message'] ?? 'Unknown error'));
        return null;
    }
    
    $result = $data['result'];
    
    // Extract basic metadata
    $metadata = [
        'symbol' => $result['content']['metadata']['symbol'] ?? null,
        'name' => $result['content']['metadata']['name'] ?? null,
        'image' => $result['content']['files'][0]['uri'] ?? $result['content']['metadata']['image'] ?? null,
        'decimals' => $result['token_info']['decimals'] ?? 6
    ];
    
    // If no metadata found, try alternative method with getAccountInfo
    if (!$metadata['symbol'] && !$metadata['name']) {
        $fallback = fetchTokenMetadataFallback($tokenMint);
        if ($fallback) {
            $metadata = array_merge($metadata, $fallback);
        }
    }
    
    // Fetch additional data (price, liquidity, holders)
    $priceData = fetchTokenPriceFromJupiter($tokenMint);
    if ($priceData) {
        $metadata = array_merge($metadata, $priceData);
    }
    
    $holderData = fetchTokenHolderCount($tokenMint);
    if ($holderData) {
        $metadata['holder_count'] = $holderData;
    }
    
    $liquidityData = fetchTokenLiquidity($tokenMint);
    if ($liquidityData) {
        $metadata['current_liquidity'] = $liquidityData;
    }
    
    return $metadata;
}

// Function to fetch token price from Jupiter API
function fetchTokenPriceFromJupiter($tokenMint) {
    $jupiterUrl = "https://price.jup.ag/v6/price?ids={$tokenMint}&showExtraInfo=true";
    
    $ch = curl_init($jupiterUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("Jupiter price API request failed: HTTP $httpCode - $response");
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || !isset($data['data'][$tokenMint])) {
        return null;
    }
    
    $priceInfo = $data['data'][$tokenMint];
    
    // Calculate 24h price change percentage if we have historical data
    $priceChange24h = 0;
    if (isset($priceInfo['price']) && isset($priceInfo['priceChange24h'])) {
        $priceChange24h = $priceInfo['priceChange24h'];
    } elseif (isset($priceInfo['price']) && isset($priceInfo['price24hAgo'])) {
        $currentPrice = $priceInfo['price'];
        $price24hAgo = $priceInfo['price24hAgo'];
        if ($price24hAgo > 0) {
            $priceChange24h = (($currentPrice - $price24hAgo) / $price24hAgo) * 100;
        }
    }
    
    return [
        'current_price' => $priceInfo['price'] ?? 0,
        'market_cap' => $priceInfo['marketCap'] ?? 0,
        'volume_24h' => $priceInfo['volume24h'] ?? 0,
        'price_24h_change' => $priceChange24h
    ];
}

// Function to fetch token holder count from Helius
function fetchTokenHolderCount($tokenMint) {
    $heliusApiKey = getenv('HELIUS_API_KEY');
    $heliusUrl = "https://mainnet.helius-rpc.com/?api-key={$heliusApiKey}";
    
    // Get token holders using getTokenAccounts
    $postData = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'getTokenAccounts',
        'params' => [
            'mint' => $tokenMint,
            'options' => [
                'showZeroBalance' => false
            ]
        ]
    ];
    
    $ch = curl_init($heliusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("Helius token holders request failed: HTTP $httpCode - $response");
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || isset($data['error'])) {
        return null;
    }
    
    return count($data['result']['token_accounts'] ?? []);
}

// Function to fetch token liquidity data
function fetchTokenLiquidity($tokenMint) {
    // Try Jupiter API first for liquidity info
    $jupiterUrl = "https://quote-api.jup.ag/v6/quote?inputMint={$tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=1000000";
    
    $ch = curl_init($jupiterUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        // Fallback: Use Helius to get DEX data
        return fetchLiquidityFromHelius($tokenMint);
    }
    
    $data = json_decode($response, true);
    
    if (!$data || isset($data['error'])) {
        return fetchLiquidityFromHelius($tokenMint);
    }
    
    // Estimate liquidity based on price impact and route data
    $routeData = $data['routePlan'] ?? [];
    $estimatedLiquidity = 0;
    
    foreach ($routeData as $route) {
        // Basic liquidity estimation (this is simplified)
        $estimatedLiquidity += ($route['swapInfo']['feeAmount'] ?? 0) * 1000;
    }
    
    return $estimatedLiquidity > 0 ? $estimatedLiquidity : null;
}

// Fallback liquidity fetching using Helius DEX data
function fetchLiquidityFromHelius($tokenMint) {
    $heliusApiKey = getenv('HELIUS_API_KEY');
    $heliusUrl = "https://mainnet.helius-rpc.com/?api-key={$heliusApiKey}";
    
    // Get DEX market data
    $postData = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'getMultipleAccounts',
        'params' => [
            // This would need specific market addresses for each DEX
            // For now, return a basic estimate
            []
        ]
    ];
    
    // For this demo, return null - in production you'd implement proper DEX API calls
    // to get actual liquidity from Raydium, Orca, etc.
    return null;
}

// Fallback method using getAccountInfo for older tokens
function fetchTokenMetadataFallback($tokenMint) {
    $heliusApiKey = getenv('HELIUS_API_KEY');
    $heliusUrl = "https://mainnet.helius-rpc.com/?api-key={$heliusApiKey}";
    
    $postData = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'getAccountInfo',
        'params' => [
            $tokenMint,
            ['encoding' => 'jsonParsed']
        ]
    ];
    
    $ch = curl_init($heliusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || isset($data['error']) || !isset($data['result']['value'])) {
        return null;
    }
    
    $accountData = $data['result']['value']['data']['parsed'] ?? null;
    
    if (!$accountData) {
        return null;
    }
    
    // Extract basic token info
    return [
        'symbol' => 'TOKEN',
        'name' => 'Token ' . substr($tokenMint, -8),
        'image' => null,
        'decimals' => $accountData['info']['decimals'] ?? 6
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Main try-catch to handle all errors
try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }

    if (!$input || !isset($input['tokenMint']) || !isset($input['walletAddress'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters: tokenMint and walletAddress']);
        exit;
    }

    $tokenMint = $input['tokenMint'];
    $walletAddress = $input['walletAddress'];
    $supabase = new SupabaseClient(true);

    $existingTokens = $supabase->query('wallet_tokens', [
        'wallet_address' => 'eq.' . $walletAddress,
        'token_mint' => 'eq.' . $tokenMint
    ]);
    
    if ($existingTokens && count($existingTokens) > 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Token already exists in your wallet'
        ]);
        exit;
    }

    $existingMetadata = $supabase->query('token_metadata', ['mint' => 'eq.' . $tokenMint]);
    
    // Always fetch token metadata from Helius for the response
    $tokenMetadata = fetchTokenMetadataFromHelius($tokenMint);
    
    // If Helius fetch fails, try to use existing metadata from database
    if (!$tokenMetadata && $existingMetadata && count($existingMetadata) > 0) {
        $tokenMetadata = [
            'symbol' => $existingMetadata[0]['symbol'] ?? 'UNKNOWN',
            'name' => $existingMetadata[0]['name'] ?? 'Unknown Token',
            'decimals' => $existingMetadata[0]['decimals'] ?? 6,
            'image' => $existingMetadata[0]['logo_uri'] ?? '/assets/images/token-placeholder.svg',
            'current_price' => $existingMetadata[0]['current_price'] ?? 0,
            'price_24h_change' => $existingMetadata[0]['price_24h_change'] ?? 0,
            'market_cap' => $existingMetadata[0]['market_cap'] ?? 0,
            'volume_24h' => $existingMetadata[0]['volume_24h'] ?? 0,
            'holder_count' => $existingMetadata[0]['holder_count'] ?? 0,
            'current_liquidity' => $existingMetadata[0]['current_liquidity'] ?? 0
        ];
    }
    
    // If still no metadata, exit with error
    if (!$tokenMetadata) {
        echo json_encode([
            'success' => false,
            'error' => 'Could not fetch token metadata from blockchain. Please verify the token mint address.'
        ]);
        exit;
    }
    
    // Only insert metadata if it doesn't already exist
    if (!$existingMetadata || count($existingMetadata) === 0) {
        try {
            // Determine metadata status based on quality
            // Accept any token with non-empty symbol and name as valid
            $hasValidMetadata = !empty($tokenMetadata['symbol']) && !empty($tokenMetadata['name']);
            
            $metadataData = [
                'mint' => $tokenMint,
                'symbol' => $tokenMetadata['symbol'] ?? 'UNKNOWN',
                'name' => $tokenMetadata['name'] ?? 'Unknown Token',
                'decimals' => $tokenMetadata['decimals'] ?? 6,
                'logo_uri' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
                'verified' => false,
                'source' => 'helius_rpc',
                'platform' => 'solana',
                'metadata_status' => $hasValidMetadata ? 'complete' : 'pending',  // Set based on metadata quality
                'current_price' => $tokenMetadata['current_price'] ?? 0,
                'price_24h_change' => $tokenMetadata['price_24h_change'] ?? 0,
                'market_cap' => $tokenMetadata['market_cap'] ?? 0,
                'volume_24h' => $tokenMetadata['volume_24h'] ?? 0,
                'holder_count' => $tokenMetadata['holder_count'] ?? 0,
                'current_liquidity' => $tokenMetadata['current_liquidity'] ?? 0,
                'price_last_updated' => date('c')
            ];
            
            $metadataResult = $supabase->insert('token_metadata', $metadataData);
            
            if (!$metadataResult) {
                // Check if it's a duplicate key error by querying again
                $recheckMetadata = $supabase->query('token_metadata', ['mint' => 'eq.' . $tokenMint]);
                if ($recheckMetadata && count($recheckMetadata) > 0) {
                    // Metadata was created by another process, continue
                    error_log('Token metadata already exists (race condition) for mint: ' . $tokenMint);
                } else {
                    error_log('Token metadata creation failed for mint: ' . $tokenMint);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Failed to create token metadata - check server logs'
                    ]);
                    exit;
                }
            }
        } catch (Exception $metaError) {
            error_log('Exception during metadata creation: ' . $metaError->getMessage());
            echo json_encode([
                'success' => false,
                'error' => 'Metadata creation exception: ' . $metaError->getMessage()
            ]);
            exit;
        }
    }

    $tokenData = [
        'wallet_address' => $walletAddress,
        'token_mint' => $tokenMint,
        'balance' => 1000000.0,  // 1 million tokens
        'decimals' => 6,
        'is_test_token' => true,
        'is_newly_added' => true  // Mark as newly added for UI handling
        // added_at and last_seen_at have default values in the database
    ];

    $result = $supabase->insert('wallet_tokens', $tokenData);
    
    // Treat empty array as success (Supabase returns empty array with Prefer: return=minimal)
    if ($result !== false) {
        // DO NOT automatically enable protection for newly added tokens
        // This ensures users must explicitly enable protection
        $protectedTokenData = [
            'wallet_address' => $walletAddress,
            'token_mint' => $tokenMint,
            'token_symbol' => $tokenMetadata['symbol'] ?? 'UNKNOWN',
            'token_name' => $tokenMetadata['name'] ?? 'Unknown Token',
            'monitoring_enabled' => false, // Disabled by default
            'is_active' => false, // Disabled by default
            'swap_to_sol' => true,
            'max_slippage_bps' => 500, // 5% slippage
            'priority_fee_multiplier' => 1.5,
            'status' => 'inactive', // Inactive by default
            'protection_settings' => json_encode([
                'sell_percentage' => 100,
                'auto_protect' => false, // Disabled by default
                'is_demo' => true,
                'newly_added' => true // Flag to indicate this is a newly added token
            ])
        ];
        
        try {
            // Check if protection already exists
            $existingProtection = $supabase->query('protected_tokens', [
                'wallet_address' => 'eq.' . $walletAddress,
                'token_mint' => 'eq.' . $tokenMint
            ]);
            
            if (!$existingProtection || count($existingProtection) === 0) {
                $protectionResult = $supabase->insert('protected_tokens', $protectedTokenData);
                if (!$protectionResult) {
                    error_log('Failed to create protected_tokens entry for demo token: ' . $tokenMint);
                }
            }
        } catch (Exception $protectionError) {
            // Log but don't fail the main operation
            error_log('Exception creating protected_tokens: ' . $protectionError->getMessage());
        }
        
        // Trigger pool discovery in backend
        triggerPoolDiscovery($tokenMint, $walletAddress);
        
        // Trigger comprehensive data population
        triggerDataPopulation($tokenMint, $walletAddress);
        
        // Also trigger monitoring update to ensure stats are initialized
        triggerMonitoringUpdate($tokenMint, $walletAddress);
        
        // Determine if the fetched metadata is valid
        $hasValidResponseMetadata = !empty($tokenMetadata['symbol']) && !empty($tokenMetadata['name']);
        
        echo json_encode([
            'success' => true,
            'message' => "Token {$tokenMetadata['symbol']} added successfully with live market data!",
            'walletAddress' => $walletAddress,
            'token' => [
                'mint' => $tokenMint,
                'symbol' => $tokenMetadata['symbol'] ?? 'UNKNOWN',
                'name' => $tokenMetadata['name'] ?? 'Unknown Token',
                'balance' => 1000000,
                'decimals' => $tokenMetadata['decimals'] ?? 6,
                'image' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
                'logo_uri' => $tokenMetadata['image'] ?? '/assets/images/token-placeholder.svg',
                'price' => $tokenMetadata['current_price'] ?? 0,
                'value' => ($tokenMetadata['current_price'] ?? 0) * 1000000,
                'holder_count' => $tokenMetadata['holder_count'] ?? 0,
                'liquidity' => $tokenMetadata['current_liquidity'] ?? 0,
                'market_cap' => $tokenMetadata['market_cap'] ?? 0,
                'volume_24h' => $tokenMetadata['volume_24h'] ?? 0,
                'price_change_24h' => $tokenMetadata['price_24h_change'] ?? 0,
                'bonding_curve_progress' => $tokenMetadata['bonding_curve_progress'] ?? null,
                'dev_wallet' => $tokenMetadata['dev_wallet'] ?? null,
                'sniper_count' => $tokenMetadata['sniper_count'] ?? null,
                'data_source' => $tokenMetadata['source'] ?? 'helius',
                'isTestToken' => true,
                'protected' => false, // Protection disabled by default
                'is_newly_added' => true, // Flag for frontend to handle UI state
                'metadata_status' => $hasValidResponseMetadata ? 'complete' : 'pending'
            ]
        ]);
    } else {
        // Check if it's a duplicate key error
        $existingCheck = $supabase->query('wallet_tokens', [
            'wallet_address' => 'eq.' . $walletAddress,
            'token_mint' => 'eq.' . $tokenMint
        ]);
        
        if ($existingCheck && count($existingCheck) > 0) {
            echo json_encode([
                'success' => false,
                'error' => 'Token already exists in your wallet'
            ]);
        } else {
            // Check if it's a specific error
            $lastError = error_get_last();
            $errorMsg = 'Failed to save token to database.';
            
            if ($lastError && $lastError['message']) {
                $errorMsg .= ' Details: ' . $lastError['message'];
            }
            
            error_log('Failed to insert wallet token: ' . json_encode($tokenData));
            error_log('Last error: ' . json_encode($lastError));
            
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => $errorMsg
            ]);
        }
    }

} catch (Exception $e) {
    error_log('Exception in add-token-simple.php: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch (Error $e) {
    // Catch fatal errors too
    error_log('Fatal error in add-token-simple.php: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Fatal error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

/**
 * Trigger pool discovery in backend
 */
function triggerPoolDiscovery($tokenMint, $walletAddress) {
    try {
        $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
        $endpoint = $backendUrl . '/api/pool-protection/discover';
        
        $payload = json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress
        ]);
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            error_log("Pool discovery trigger failed: HTTP $httpCode - $response");
        } else {
            error_log("Pool discovery triggered successfully for token: $tokenMint");
            $responseData = json_decode($response, true);
            if ($responseData && isset($responseData['poolAddress'])) {
                error_log("Pool found: " . $responseData['poolAddress']);
            }
        }
    } catch (Exception $e) {
        // Log but don't fail the main operation
        error_log("Failed to trigger pool discovery: " . $e->getMessage());
    }
}

/**
 * Trigger comprehensive data population in backend
 */
function triggerDataPopulation($tokenMint, $walletAddress) {
    try {
        $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
        $endpoint = $backendUrl . '/api/tokens/populate-data';
        
        $payload = json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress
        ]);
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout, runs async
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            error_log("Data population trigger failed: HTTP $httpCode - $response");
        } else {
            error_log("Data population triggered successfully for token: $tokenMint");
        }
    } catch (Exception $e) {
        // Log but don't fail the main operation
        error_log("Failed to trigger data population: " . $e->getMessage());
    }
}

/**
 * Trigger monitoring update to initialize stats
 */
function triggerMonitoringUpdate($tokenMint, $walletAddress) {
    try {
        $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
        $endpoint = $backendUrl . '/api/monitoring/force-update';
        
        $payload = json_encode([
            'tokenMint' => $tokenMint,
            'walletAddress' => $walletAddress
        ]);
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            error_log("Monitoring update trigger failed: HTTP $httpCode - $response");
        } else {
            error_log("Monitoring update triggered successfully for token: $tokenMint");
        }
    } catch (Exception $e) {
        // Log but don't fail the main operation
        error_log("Failed to trigger monitoring update: " . $e->getMessage());
    }
}