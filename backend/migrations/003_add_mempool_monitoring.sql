-- Migration: Add mempool monitoring support
-- Date: 2025-06-23
-- Description: Adds columns to protected_tokens for real-time mempool monitoring

-- Add mempool monitoring columns to protected_tokens table
ALTER TABLE protected_tokens
ADD COLUMN IF NOT EXISTS mempool_monitoring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS risk_threshold text DEFAULT 'HIGH' 
  CHECK (risk_threshold IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
ADD COLUMN IF NOT EXISTS last_threat_detected timestamp with time zone;

-- Create index for faster lookups of tokens with mempool monitoring enabled
CREATE INDEX IF NOT EXISTS idx_protected_tokens_mempool 
ON protected_tokens(token_mint, is_active, mempool_monitoring) 
WHERE is_active = true AND mempool_monitoring = true;

-- Add comments for documentation
COMMENT ON COLUMN protected_tokens.mempool_monitoring 
  IS 'Whether to monitor pending transactions in mempool for this token';
COMMENT ON COLUMN protected_tokens.risk_threshold 
  IS 'Risk level threshold for triggering protection (CRITICAL, HIGH, MODERATE, LOW)';
COMMENT ON COLUMN protected_tokens.last_threat_detected 
  IS 'Timestamp of last mempool threat detection';

-- Note: pattern_alerts table already exists and is used for storing detected threats