-- Migration: Add protection_mode column to subscriptions table
-- This adds the ability to distinguish between full protection (auto-execution) and watch-only mode

-- Add the protection_mode column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'protection_mode'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN protection_mode VARCHAR(20) DEFAULT 'watch-only' 
        CHECK (protection_mode IN ('full', 'watch-only'));
        
        -- Update existing subscriptions based on plan type
        -- Pro, enterprise, and degen-mode plans get full protection by default
        UPDATE subscriptions 
        SET protection_mode = 'full' 
        WHERE plan IN ('pro', 'enterprise', 'degen-mode') 
        AND status = 'active';
        
        -- All other plans remain watch-only
        UPDATE subscriptions 
        SET protection_mode = 'watch-only' 
        WHERE plan NOT IN ('pro', 'enterprise', 'degen-mode');
        
        -- Add comment to the column
        COMMENT ON COLUMN subscriptions.protection_mode IS 
        'Protection mode: "full" enables auto-execution of swaps, "watch-only" only provides alerts and scans';
        
        RAISE NOTICE 'Added protection_mode column to subscriptions table';
    ELSE
        RAISE NOTICE 'protection_mode column already exists in subscriptions table';
    END IF;
END $$;
