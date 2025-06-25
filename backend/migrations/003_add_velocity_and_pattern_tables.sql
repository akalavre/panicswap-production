-- Migration: 003_add_velocity_and_pattern_tables
-- Description: Add velocity tracking and pattern detection tables for enhanced rugpull detection

-- Add new columns to rugcheck_reports table for velocity metrics
ALTER TABLE rugcheck_reports 
ADD COLUMN IF NOT EXISTS liquidity_velocity NUMERIC,
ADD COLUMN IF NOT EXISTS successful_sell_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dev_wallet_cluster JSONB,
ADD COLUMN IF NOT EXISTS cex_interaction_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rug_probability NUMERIC,
ADD COLUMN IF NOT EXISTS detection_timestamp TIMESTAMP;

-- Create table for velocity tracking
CREATE TABLE IF NOT EXISTS liquidity_velocity (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  liquidity_usd NUMERIC,
  liquidity_velocity_1m NUMERIC,
  liquidity_velocity_5m NUMERIC,
  liquidity_velocity_30m NUMERIC,
  price_velocity_1m NUMERIC,
  price_velocity_5m NUMERIC,
  price_velocity_30m NUMERIC,
  flash_rug_alert BOOLEAN DEFAULT FALSE,
  rapid_drain_alert BOOLEAN DEFAULT FALSE,
  slow_bleed_alert BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_liquidity_velocity_token ON liquidity_velocity(token_mint);
CREATE INDEX IF NOT EXISTS idx_liquidity_velocity_timestamp ON liquidity_velocity(timestamp);

-- Create table for pattern tracking
CREATE TABLE IF NOT EXISTS rug_patterns (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('flash_rug', 'slow_bleed', 'honeypot_evolution', 'coordinated_dump', 'dev_preparation')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  indicators JSONB,
  estimated_time_to_rug INTEGER, -- in minutes
  detected_at TIMESTAMP DEFAULT NOW(),
  pattern_data JSONB
);

-- Create indexes for pattern queries
CREATE INDEX IF NOT EXISTS idx_rug_patterns_token ON rug_patterns(token_mint);
CREATE INDEX IF NOT EXISTS idx_rug_patterns_type ON rug_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_rugcheck_velocity ON rugcheck_reports(liquidity_velocity);

-- Create table for pattern alerts
CREATE TABLE IF NOT EXISTS pattern_alerts (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 100),
  recommendation TEXT CHECK (recommendation IN ('exit_now', 'exit_soon', 'monitor_closely', 'low_risk')),
  patterns JSONB,
  alert_type TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for pattern alerts
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_token ON pattern_alerts(token_mint);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_timestamp ON pattern_alerts(timestamp);

-- Create liquidity snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS liquidity_snapshots (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  liquidity_usd NUMERIC NOT NULL,
  holder_count INTEGER,
  price NUMERIC,
  volume_24h NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for liquidity snapshots
CREATE INDEX IF NOT EXISTS idx_liquidity_snapshots_mint ON liquidity_snapshots(token_mint);
CREATE INDEX IF NOT EXISTS idx_liquidity_snapshots_time ON liquidity_snapshots(timestamp);

-- Add RLS policies for new tables
ALTER TABLE liquidity_velocity ENABLE ROW LEVEL SECURITY;
ALTER TABLE rug_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend services)
CREATE POLICY "Service role has full access to liquidity_velocity" ON liquidity_velocity
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to rug_patterns" ON rug_patterns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to pattern_alerts" ON pattern_alerts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to liquidity_snapshots" ON liquidity_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own alerts
CREATE POLICY "Users can read pattern alerts for their tokens" ON pattern_alerts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    token_mint IN (
      SELECT token_mint FROM protected_tokens 
      WHERE wallet_address = auth.jwt() ->> 'sub'
    )
  );

-- Allow public read access to aggregated velocity data (for analytics)
CREATE POLICY "Public can read liquidity velocity data" ON liquidity_velocity
  FOR SELECT USING (true);

-- Comment for tracking
COMMENT ON TABLE liquidity_velocity IS 'Tracks liquidity velocity metrics for rugpull detection (30s intervals)';
COMMENT ON TABLE rug_patterns IS 'Stores detected rug patterns with confidence scores';
COMMENT ON TABLE pattern_alerts IS 'Stores pattern-based alerts sent to users';