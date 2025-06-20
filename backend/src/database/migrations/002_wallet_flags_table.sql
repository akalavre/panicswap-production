-- Migration: Add wallet_flags table for wallet reputation
-- Description: Creates wallet_flags table for tracking wallet reputation/flags
-- Date: 2025-01-16

-- Create wallet_flags table
CREATE TABLE IF NOT EXISTS wallet_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  total_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_wallet_flags_address (wallet_address),
  INDEX idx_wallet_flags_flagged (is_flagged),
  INDEX idx_wallet_flags_reputation (reputation_score)
);

-- Create function to check wallet reputation
CREATE OR REPLACE FUNCTION check_wallet_reputation(p_wallet_address TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'is_flagged', COALESCE(wf.is_flagged, false),
    'reputation_score', COALESCE(wf.reputation_score, 100),
    'flag_reason', wf.flag_reason,
    'total_transactions', COALESCE(wf.total_transactions, 0),
    'failed_transactions', COALESCE(wf.failed_transactions, 0)
  ) INTO v_result
  FROM wallet_flags wf
  WHERE wf.wallet_address = p_wallet_address;
  
  -- If wallet not found, return default values
  IF v_result IS NULL THEN
    v_result := json_build_object(
      'is_flagged', false,
      'reputation_score', 100,
      'flag_reason', null,
      'total_transactions', 0,
      'failed_transactions', 0
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at
CREATE TRIGGER update_wallet_flags_updated_at
  BEFORE UPDATE ON wallet_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON wallet_flags TO anon, authenticated;
GRANT INSERT, UPDATE ON wallet_flags TO authenticated;

-- Add RLS policies
ALTER TABLE wallet_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view wallet flags
CREATE POLICY "Public can view wallet flags" ON wallet_flags
  FOR SELECT
  USING (true);

-- Policy: Only system can update wallet flags
CREATE POLICY "System can manage wallet flags" ON wallet_flags
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_wallet_reputation(TEXT) TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE wallet_flags IS 'Tracks wallet reputation and flags for suspicious activity';
COMMENT ON COLUMN wallet_flags.reputation_score IS 'Reputation score from 0-100, where 100 is best';
COMMENT ON FUNCTION check_wallet_reputation IS 'Returns wallet reputation data for subscription eligibility checks';