-- Add pool_address column to token_metadata table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_metadata' 
        AND column_name = 'pool_address'
    ) THEN
        ALTER TABLE token_metadata 
        ADD COLUMN pool_address VARCHAR(88);
        
        -- Create index for pool lookups
        CREATE INDEX idx_token_metadata_pool_address ON token_metadata(pool_address);
    END IF;
END $$;

-- Update the protected_tokens table to ensure it has pool_address
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'protected_tokens' 
        AND column_name = 'pool_address'
    ) THEN
        ALTER TABLE protected_tokens 
        ADD COLUMN pool_address VARCHAR(88);
        
        -- Add baseline liquidity column for monitoring
        ALTER TABLE protected_tokens 
        ADD COLUMN baseline_liquidity NUMERIC(18, 6);
        
        -- Add monitoring active flag
        ALTER TABLE protected_tokens 
        ADD COLUMN monitoring_active BOOLEAN DEFAULT FALSE;
        
        -- Create indexes
        CREATE INDEX idx_protected_tokens_pool_address ON protected_tokens(pool_address);
        CREATE INDEX idx_protected_tokens_monitoring ON protected_tokens(monitoring_active);
    END IF;
END $$;

-- Update wallet column to wallet_address if needed
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'protected_tokens' 
        AND column_name = 'wallet'
    ) THEN
        ALTER TABLE protected_tokens RENAME COLUMN wallet TO wallet_address;
    END IF;
END $$;