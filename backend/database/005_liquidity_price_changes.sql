-- Function to calculate price and liquidity changes for tokens
CREATE OR REPLACE FUNCTION calculate_token_changes(p_token_mint TEXT)
RETURNS TABLE (
  price_change_1h NUMERIC,
  price_change_24h NUMERIC,
  liquidity_change_1h NUMERIC,
  liquidity_change_24h NUMERIC,
  current_price NUMERIC,
  current_liquidity NUMERIC
) AS $$
DECLARE
  v_current_price NUMERIC;
  v_current_liquidity NUMERIC;
  v_price_1h_ago NUMERIC;
  v_price_24h_ago NUMERIC;
  v_liquidity_1h_ago NUMERIC;
  v_liquidity_24h_ago NUMERIC;
BEGIN
  -- Get current price and liquidity from token_prices
  SELECT price, liquidity 
  INTO v_current_price, v_current_liquidity
  FROM token_prices 
  WHERE token_mint = p_token_mint;
  
  -- Get price and liquidity from 1 hour ago
  SELECT price, liquidity 
  INTO v_price_1h_ago, v_liquidity_1h_ago
  FROM token_price_history 
  WHERE token_mint = p_token_mint 
    AND recorded_at >= NOW() - INTERVAL '1 hour'
    AND recorded_at <= NOW() - INTERVAL '55 minutes'
  ORDER BY recorded_at ASC
  LIMIT 1;
  
  -- Get price and liquidity from 24 hours ago
  SELECT price, liquidity 
  INTO v_price_24h_ago, v_liquidity_24h_ago
  FROM token_price_history 
  WHERE token_mint = p_token_mint 
    AND recorded_at >= NOW() - INTERVAL '24 hours'
    AND recorded_at <= NOW() - INTERVAL '23 hours 50 minutes'
  ORDER BY recorded_at ASC
  LIMIT 1;
  
  -- Calculate percentage changes
  RETURN QUERY SELECT
    CASE 
      WHEN v_price_1h_ago IS NOT NULL AND v_price_1h_ago > 0 
      THEN ((v_current_price - v_price_1h_ago) / v_price_1h_ago) * 100
      ELSE NULL
    END AS price_change_1h,
    CASE 
      WHEN v_price_24h_ago IS NOT NULL AND v_price_24h_ago > 0 
      THEN ((v_current_price - v_price_24h_ago) / v_price_24h_ago) * 100
      ELSE NULL
    END AS price_change_24h,
    CASE 
      WHEN v_liquidity_1h_ago IS NOT NULL AND v_liquidity_1h_ago > 0 
      THEN ((v_current_liquidity - v_liquidity_1h_ago) / v_liquidity_1h_ago) * 100
      ELSE NULL
    END AS liquidity_change_1h,
    CASE 
      WHEN v_liquidity_24h_ago IS NOT NULL AND v_liquidity_24h_ago > 0 
      THEN ((v_current_liquidity - v_liquidity_24h_ago) / v_liquidity_24h_ago) * 100
      ELSE NULL
    END AS liquidity_change_24h,
    v_current_price AS current_price,
    v_current_liquidity AS current_liquidity;
END;
$$ LANGUAGE plpgsql;

-- Function to get multiple token changes at once (more efficient)
CREATE OR REPLACE FUNCTION calculate_multiple_token_changes(p_token_mints TEXT[])
RETURNS TABLE (
  token_mint TEXT,
  price_change_1h NUMERIC,
  price_change_24h NUMERIC,
  liquidity_change_1h NUMERIC,
  liquidity_change_24h NUMERIC,
  current_price NUMERIC,
  current_liquidity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_data AS (
    SELECT 
      tp.token_mint,
      tp.price as current_price,
      tp.liquidity as current_liquidity
    FROM token_prices tp
    WHERE tp.token_mint = ANY(p_token_mints)
  ),
  historical_1h AS (
    SELECT DISTINCT ON (tph.token_mint)
      tph.token_mint,
      tph.price as price_1h_ago,
      tph.liquidity as liquidity_1h_ago
    FROM token_price_history tph
    WHERE tph.token_mint = ANY(p_token_mints)
      AND tph.recorded_at >= NOW() - INTERVAL '1 hour 5 minutes'
      AND tph.recorded_at <= NOW() - INTERVAL '55 minutes'
    ORDER BY tph.token_mint, tph.recorded_at ASC
  ),
  historical_24h AS (
    SELECT DISTINCT ON (tph.token_mint)
      tph.token_mint,
      tph.price as price_24h_ago,
      tph.liquidity as liquidity_24h_ago
    FROM token_price_history tph
    WHERE tph.token_mint = ANY(p_token_mints)
      AND tph.recorded_at >= NOW() - INTERVAL '24 hours 10 minutes'
      AND tph.recorded_at <= NOW() - INTERVAL '23 hours 50 minutes'
    ORDER BY tph.token_mint, tph.recorded_at ASC
  )
  SELECT 
    cd.token_mint,
    CASE 
      WHEN h1.price_1h_ago IS NOT NULL AND h1.price_1h_ago > 0 
      THEN ROUND(((cd.current_price - h1.price_1h_ago) / h1.price_1h_ago) * 100, 2)
      ELSE NULL
    END AS price_change_1h,
    CASE 
      WHEN h24.price_24h_ago IS NOT NULL AND h24.price_24h_ago > 0 
      THEN ROUND(((cd.current_price - h24.price_24h_ago) / h24.price_24h_ago) * 100, 2)
      ELSE NULL
    END AS price_change_24h,
    CASE 
      WHEN h1.liquidity_1h_ago IS NOT NULL AND h1.liquidity_1h_ago > 0 
      THEN ROUND(((cd.current_liquidity - h1.liquidity_1h_ago) / h1.liquidity_1h_ago) * 100, 2)
      ELSE NULL
    END AS liquidity_change_1h,
    CASE 
      WHEN h24.liquidity_24h_ago IS NOT NULL AND h24.liquidity_24h_ago > 0 
      THEN ROUND(((cd.current_liquidity - h24.liquidity_24h_ago) / h24.liquidity_24h_ago) * 100, 2)
      ELSE NULL
    END AS liquidity_change_24h,
    cd.current_price,
    cd.current_liquidity
  FROM current_data cd
  LEFT JOIN historical_1h h1 ON cd.token_mint = h1.token_mint
  LEFT JOIN historical_24h h24 ON cd.token_mint = h24.token_mint;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_token_price_history_mint_recorded 
ON token_price_history(token_mint, recorded_at DESC);

-- Create a view for easy access to current prices with changes
CREATE OR REPLACE VIEW token_prices_with_changes AS
WITH current_data AS (
  SELECT 
    tp.token_mint,
    tp.symbol,
    tp.price as current_price,
    tp.liquidity as current_liquidity,
    tp.market_cap,
    tp.updated_at
  FROM token_prices tp
),
changes AS (
  SELECT * FROM calculate_multiple_token_changes(
    (SELECT array_agg(token_mint) FROM token_prices)
  )
)
SELECT 
  cd.*,
  ch.price_change_1h,
  ch.price_change_24h,
  ch.liquidity_change_1h,
  ch.liquidity_change_24h
FROM current_data cd
LEFT JOIN changes ch ON cd.token_mint = ch.token_mint;