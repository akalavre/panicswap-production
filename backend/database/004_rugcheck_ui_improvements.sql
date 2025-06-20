-- Migration: Add UI improvement columns to rugcheck_reports
-- These columns support the protection-focused UI improvements

-- Add launch time (store once, never overwrite)
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS launch_time TIMESTAMPTZ;

-- Add dev wallet activity tracking
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS dev_activity_pct DECIMAL(5,2) DEFAULT 0;  -- Percentage of tokens moved/sold by dev in last 24h
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS dev_activity_time TIMESTAMPTZ;            -- When the activity occurred

-- Add honeypot/sellability status
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS honeypot_status VARCHAR(20) DEFAULT 'unknown' 
  CHECK (honeypot_status IN ('safe', 'honeypot', 'warning', 'unknown'));

-- Add liquidity change percentages
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS liquidity_current DECIMAL(20,2) DEFAULT 0;
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS liquidity_change_1h_pct DECIMAL(8,2) DEFAULT 0;
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS liquidity_change_24h_pct DECIMAL(8,2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rugcheck_launch_time ON rugcheck_reports(launch_time);
CREATE INDEX IF NOT EXISTS idx_rugcheck_honeypot ON rugcheck_reports(honeypot_status);

-- Add comment
COMMENT ON TABLE rugcheck_reports IS 'Comprehensive risk metrics for tokens including UI-specific protection indicators';