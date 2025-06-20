-- Create table for pump.fun token monitoring
CREATE TABLE IF NOT EXISTS pump_fun_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_mint TEXT NOT NULL UNIQUE,
  creator TEXT NOT NULL,
  bonding_curve_address TEXT NOT NULL,
  sol_reserves DECIMAL,
  token_reserves DECIMAL,
  is_complete BOOLEAN DEFAULT FALSE,
  total_holders INTEGER DEFAULT 0,
  dev_wallet_percentage DECIMAL,
  concentration_risk TEXT CHECK (concentration_risk IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score INTEGER DEFAULT 0,
  top_holders JSONB,
  warnings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pump_fun_monitoring_token_mint ON pump_fun_monitoring(token_mint);
CREATE INDEX idx_pump_fun_monitoring_risk_score ON pump_fun_monitoring(risk_score);
CREATE INDEX idx_pump_fun_monitoring_updated_at ON pump_fun_monitoring(updated_at);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pump_fun_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pump_fun_monitoring_updated_at
BEFORE UPDATE ON pump_fun_monitoring
FOR EACH ROW
EXECUTE FUNCTION update_pump_fun_monitoring_updated_at();

-- Create table for pump.fun holder snapshots (for tracking changes over time)
CREATE TABLE IF NOT EXISTS pump_fun_holder_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_mint TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  balance DECIMAL NOT NULL,
  percentage DECIMAL NOT NULL,
  is_dev_wallet BOOLEAN DEFAULT FALSE,
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (token_mint) REFERENCES pump_fun_monitoring(token_mint) ON DELETE CASCADE
);

-- Create indexes for holder snapshots
CREATE INDEX idx_holder_snapshots_token_mint ON pump_fun_holder_snapshots(token_mint);
CREATE INDEX idx_holder_snapshots_wallet ON pump_fun_holder_snapshots(wallet_address);
CREATE INDEX idx_holder_snapshots_time ON pump_fun_holder_snapshots(snapshot_time);

-- Create table for pump.fun alerts
CREATE TABLE IF NOT EXISTS pump_fun_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_mint TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('DEV_SELL', 'WHALE_DUMP', 'LIQUIDITY_REMOVAL', 'HIGH_CONCENTRATION')),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for alerts
CREATE INDEX idx_pump_fun_alerts_token_mint ON pump_fun_alerts(token_mint);
CREATE INDEX idx_pump_fun_alerts_created_at ON pump_fun_alerts(created_at);