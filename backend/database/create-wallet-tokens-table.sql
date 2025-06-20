-- Create wallet_tokens table to track which tokens belong to which wallets
CREATE TABLE IF NOT EXISTS wallet_tokens (
    wallet_address TEXT NOT NULL,
    token_mint TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    decimals INTEGER DEFAULT 9,
    is_test_token BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (wallet_address, token_mint),
    FOREIGN KEY (token_mint) REFERENCES token_metadata(mint) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_wallet 
ON wallet_tokens(wallet_address);

CREATE INDEX IF NOT EXISTS idx_wallet_tokens_mint 
ON wallet_tokens(token_mint);

CREATE INDEX IF NOT EXISTS idx_wallet_tokens_last_seen 
ON wallet_tokens(last_seen_at DESC);

-- Add comment
COMMENT ON TABLE wallet_tokens IS 'Tracks which tokens belong to which wallets, including test tokens';