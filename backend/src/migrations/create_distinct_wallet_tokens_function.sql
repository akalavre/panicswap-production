-- Create a function to get distinct token mints from wallet_tokens efficiently
CREATE OR REPLACE FUNCTION get_distinct_wallet_tokens(min_balance NUMERIC DEFAULT 0)
RETURNS TABLE (token_mint TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT token_mint 
  FROM wallet_tokens 
  WHERE balance > min_balance
  ORDER BY token_mint;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_mint_balance 
ON wallet_tokens(token_mint, balance) 
WHERE balance > 0;

-- Comment on the function
COMMENT ON FUNCTION get_distinct_wallet_tokens IS 'Returns distinct token mints from wallet_tokens table where balance is greater than the specified minimum';

-- Also create a view for active wallet tokens (tokens that exist in at least one wallet)
CREATE OR REPLACE VIEW active_wallet_tokens AS
SELECT DISTINCT 
  wt.token_mint,
  tm.symbol,
  tm.name,
  tm.platform,
  COUNT(DISTINCT wt.wallet_address) as wallet_count,
  SUM(wt.balance) as total_balance
FROM wallet_tokens wt
LEFT JOIN token_metadata tm ON wt.token_mint = tm.mint
WHERE wt.balance > 0
GROUP BY wt.token_mint, tm.symbol, tm.name, tm.platform;