-- Add columns to track active tokens (from user wallets)
ALTER TABLE token_metadata 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of active tokens
CREATE INDEX IF NOT EXISTS idx_token_metadata_active 
ON token_metadata(is_active, last_active_at DESC) 
WHERE is_active = true;

-- Update existing tokens to be inactive by default
UPDATE token_metadata 
SET is_active = false 
WHERE is_active IS NULL;

-- Add wallet sync tracking table
CREATE TABLE IF NOT EXISTS wallet_sync_history (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    tokens_found INTEGER DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'success',
    error_message TEXT
);

-- Index for wallet history
CREATE INDEX IF NOT EXISTS idx_wallet_sync_history_wallet 
ON wallet_sync_history(wallet_address, synced_at DESC);