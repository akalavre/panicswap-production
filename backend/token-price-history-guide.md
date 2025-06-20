# Token Price History Table Guide

## Table Structure

The `token_price_history` table stores historical price data for tokens with the following schema:

```sql
CREATE TABLE token_price_history (
  id BIGSERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  price NUMERIC NOT NULL,
  liquidity NUMERIC,
  volume_24h NUMERIC,
  market_cap NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_token_price_history_mint_recorded 
ON token_price_history(token_mint, recorded_at DESC);
```

## Column Descriptions

- `id`: Auto-incrementing primary key
- `token_mint`: The token's mint address (Solana public key)
- `price`: Token price in USD
- `liquidity`: Total liquidity in USD (nullable)
- `volume_24h`: 24-hour trading volume in USD (nullable)
- `market_cap`: Market capitalization in USD (nullable)
- `recorded_at`: Timestamp when the price was recorded
- `source`: Source of the price data (e.g., 'price_polling', 'webhook', 'manual')
- `created_at`: When the record was created in the database

## Common Query Patterns

### 1. Get Latest Price for Each Token

```sql
-- Using DISTINCT ON (PostgreSQL specific)
SELECT DISTINCT ON (token_mint)
  token_mint,
  price,
  liquidity,
  market_cap,
  recorded_at
FROM token_price_history
ORDER BY token_mint, recorded_at DESC;
```

### 2. Get Latest Prices for Specific Tokens

```sql
-- For multiple specific tokens
WITH latest_prices AS (
  SELECT DISTINCT ON (token_mint)
    token_mint,
    price,
    liquidity,
    market_cap,
    recorded_at
  FROM token_price_history
  WHERE token_mint IN ('token1_mint', 'token2_mint', 'token3_mint')
  ORDER BY token_mint, recorded_at DESC
)
SELECT * FROM latest_prices;
```

### 3. Get Price History for a Token (Last 24 Hours)

```sql
SELECT 
  recorded_at,
  price,
  liquidity,
  market_cap
FROM token_price_history
WHERE token_mint = 'your_token_mint_here'
  AND recorded_at >= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC;
```

### 4. Calculate Price Changes

```sql
-- Get current price and price from 1 hour ago
WITH current_price AS (
  SELECT price, liquidity
  FROM token_price_history
  WHERE token_mint = 'your_token_mint_here'
  ORDER BY recorded_at DESC
  LIMIT 1
),
price_1h_ago AS (
  SELECT price, liquidity
  FROM token_price_history
  WHERE token_mint = 'your_token_mint_here'
    AND recorded_at <= NOW() - INTERVAL '1 hour'
  ORDER BY recorded_at DESC
  LIMIT 1
)
SELECT 
  cp.price as current_price,
  p1h.price as price_1h_ago,
  ((cp.price - p1h.price) / p1h.price) * 100 as price_change_1h_percent,
  cp.liquidity as current_liquidity,
  p1h.liquidity as liquidity_1h_ago,
  ((cp.liquidity - p1h.liquidity) / p1h.liquidity) * 100 as liquidity_change_1h_percent
FROM current_price cp, price_1h_ago p1h;
```

### 5. Get Tokens with Significant Price Movement

```sql
-- Find tokens with >10% price change in last hour
WITH price_changes AS (
  SELECT 
    token_mint,
    MAX(CASE WHEN rn = 1 THEN price END) as current_price,
    MAX(CASE WHEN recorded_at <= NOW() - INTERVAL '1 hour' THEN price END) as price_1h_ago
  FROM (
    SELECT 
      token_mint,
      price,
      recorded_at,
      ROW_NUMBER() OVER (PARTITION BY token_mint ORDER BY recorded_at DESC) as rn
    FROM token_price_history
    WHERE recorded_at >= NOW() - INTERVAL '2 hours'
  ) t
  GROUP BY token_mint
)
SELECT 
  token_mint,
  current_price,
  price_1h_ago,
  ((current_price - price_1h_ago) / price_1h_ago) * 100 as price_change_percent
FROM price_changes
WHERE price_1h_ago IS NOT NULL
  AND ABS((current_price - price_1h_ago) / price_1h_ago) > 0.1
ORDER BY price_change_percent DESC;
```

## Supabase JavaScript Examples

### Using Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

// Get latest price for a token
const { data, error } = await supabase
  .from('token_price_history')
  .select('*')
  .eq('token_mint', 'your_token_mint')
  .order('recorded_at', { ascending: false })
  .limit(1)
  .single();

// Get price history for multiple tokens
const { data: prices, error } = await supabase
  .from('token_price_history')
  .select('*')
  .in('token_mint', ['token1', 'token2', 'token3'])
  .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('recorded_at', { ascending: false });
```

## Performance Considerations

1. The table has an index on `(token_mint, recorded_at DESC)` for efficient queries
2. For large-scale queries, consider using the SQL functions defined in the database
3. When querying latest prices for many tokens, use batch queries or the `calculate_multiple_token_changes` function
4. Consider implementing data retention policies to prevent the table from growing too large

## Data Sources

Price data comes from multiple sources:
- `price_polling`: Regular polling service that fetches prices from DEXs
- `webhook`: Real-time updates from Helius webhooks
- `manual`: Manual price updates or corrections
- `pump_fun`: Prices from Pump.fun platform
- `raydium`: Direct Raydium pool monitoring