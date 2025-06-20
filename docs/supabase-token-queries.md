# Supabase Token Data Queries

## Table Structure

### token_metadata
- `mint` - Token mint address (primary key)
- `logo_uri` or `logo_url` - Token image URL
- `decimals` - Token decimals (important for balance calculation)
- `risk_score` - Risk assessment score

### token_prices
- `token_mint` - Token mint address
- `symbol` - Token symbol
- `name` - Token name
- `price` - Price in SOL
- `price_usd` - Price in USD
- `liquidity` - Liquidity in SOL
- `volume_24h` - 24h volume
- `change_24h` - 24h price change percentage
- `market_cap` - Market capitalization
- `platform` - Trading platform (pump.fun, raydium, etc.)

### wallet_tokens
- `wallet_address` - User wallet address
- `token_mint` - Token mint address
- `balance` - Raw balance (needs to be divided by 10^decimals)
- `decimals` - Token decimals

## Key Queries

### Get User Token Portfolio
```sql
SELECT 
    wt.token_mint,
    wt.balance,
    wt.decimals as wallet_decimals,
    tp.symbol,
    tp.name,
    tp.price,
    tp.price_usd,
    tp.liquidity,
    tp.volume_24h,
    tp.change_24h,
    tp.market_cap,
    tp.platform,
    tm.logo_uri,
    tm.logo_url,
    tm.decimals as metadata_decimals,
    tm.risk_score,
    -- Calculate actual balance
    wt.balance / POWER(10, COALESCE(wt.decimals, tm.decimals, 9)) as actual_balance,
    -- Calculate USD value
    (wt.balance / POWER(10, COALESCE(wt.decimals, tm.decimals, 9))) * tp.price_usd as value_usd
FROM wallet_tokens wt
LEFT JOIN token_prices tp ON wt.token_mint = tp.token_mint
LEFT JOIN token_metadata tm ON wt.token_mint = tm.mint
WHERE wt.wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY value_usd DESC;
```

### Get Token Prices with Metadata
```sql
SELECT 
    tp.*,
    tm.logo_uri,
    tm.logo_url,
    tm.decimals,
    tm.risk_score
FROM token_prices tp
LEFT JOIN token_metadata tm ON tp.token_mint = tm.mint
ORDER BY tp.updated_at DESC
LIMIT 50;
```

## JavaScript Integration

### Proper Balance Calculation
```javascript
// When you have wallet_tokens data
const decimals = walletToken.decimals || metadata.decimals || 9;
const actualBalance = walletToken.balance / Math.pow(10, decimals);
const valueUsd = actualBalance * priceData.price_usd;
```

### Image URL Handling
```javascript
// Check both logo_uri and logo_url fields
let imageUrl = metadata?.logo_uri || metadata?.logo_url || '';

// Handle IPFS URLs
if (imageUrl.startsWith('ipfs://')) {
    imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
}

// Use proxy for external images
if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('ipfs://'))) {
    imageUrl = `/api/token-image.php?url=${encodeURIComponent(imageUrl)}`;
}
```

### Supabase Real-time Subscription
```javascript
// Subscribe to price updates
const channel = supabaseClient
    .channel('token-updates')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'token_prices'
    }, (payload) => {
        // Update token data
        updateTokenPrice(payload.new);
    })
    .subscribe();

// Subscribe to wallet token changes
const walletChannel = supabaseClient
    .channel('wallet-tokens')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallet_tokens',
        filter: `wallet_address=eq.${walletAddress}`
    }, (payload) => {
        // Update balance data
        updateTokenBalance(payload.new);
    })
    .subscribe();
```

## Important Notes

1. **Decimals**: Always use decimals from wallet_tokens first, then fall back to token_metadata
2. **Images**: Check both logo_uri and logo_url fields in token_metadata
3. **Value Calculation**: `actual_balance = raw_balance / 10^decimals`
4. **Price**: Use price_usd for USD calculations, price for SOL calculations
5. **Real-time**: Set up subscriptions for both token_prices and wallet_tokens tables