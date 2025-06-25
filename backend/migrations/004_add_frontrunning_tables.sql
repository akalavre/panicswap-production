-- Migration: Add frontrunning and protection execution tables
-- Date: 2025-06-23
-- Description: Support for real-time protection execution and emergency executions

-- Create protection_executions table for logging successful protections
CREATE TABLE IF NOT EXISTS protection_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address varchar(44) NOT NULL,
  token_mint varchar(44) NOT NULL,
  signature varchar(100),
  success boolean DEFAULT false,
  execution_time_ms integer,
  priority_fee bigint,
  source varchar(50),
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_protection_executions_wallet_token 
ON protection_executions(wallet_address, token_mint, created_at DESC);

-- Create emergency_executions table for detailed execution logs
CREATE TABLE IF NOT EXISTS emergency_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address varchar(44) NOT NULL,
  token_mint varchar(44) NOT NULL,
  amount_to_sell varchar(50), -- Store as string to handle bigint
  min_sol_output varchar(50),
  urgency_level varchar(20),
  reason text,
  success boolean DEFAULT false,
  signature varchar(100),
  sol_received varchar(50),
  percentage_filled numeric(5,2),
  slippage numeric(5,2),
  execution_time_ms integer,
  rpc_used text,
  error text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for emergency executions
CREATE INDEX IF NOT EXISTS idx_emergency_executions_wallet_token 
ON emergency_executions(wallet_address, token_mint, created_at DESC);

-- Add priority fee multiplier column if not exists (already added in previous migration)
-- This is here for completeness/documentation
-- ALTER TABLE protected_tokens
-- ADD COLUMN IF NOT EXISTS priority_fee_multiplier numeric(3,2) DEFAULT 1.5;

-- Add comments
COMMENT ON TABLE protection_executions IS 'Log of all protection executions triggered by mempool monitoring';
COMMENT ON TABLE emergency_executions IS 'Detailed log of emergency sell executions with performance metrics';
COMMENT ON COLUMN emergency_executions.urgency_level IS 'low, medium, high, or critical';
COMMENT ON COLUMN emergency_executions.percentage_filled IS 'Percentage of tokens successfully sold';
COMMENT ON COLUMN emergency_executions.slippage IS 'Actual slippage vs expected';