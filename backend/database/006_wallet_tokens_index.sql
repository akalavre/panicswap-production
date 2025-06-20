-- Create index on wallet_tokens for faster dropdown queries
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_wallet_lastseen 
ON wallet_tokens(wallet_address, last_seen_at DESC);

-- This index speeds up the query in GET /api/wallet/tokens/:address
-- which orders by last_seen_at DESC