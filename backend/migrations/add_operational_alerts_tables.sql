-- Create operational_alerts table for monitoring swap failures
CREATE TABLE IF NOT EXISTS operational_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('swap_failed', 'swap_delayed', 'protection_failed', 'key_missing')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    wallet_address VARCHAR(100) NOT NULL,
    token_mint VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    error_details JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(100)
);

-- Create critical_alerts table for real-time broadcasting
CREATE TABLE IF NOT EXISTS critical_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    token_mint VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_operational_alerts_created_at ON operational_alerts(created_at DESC);
CREATE INDEX idx_operational_alerts_type_severity ON operational_alerts(alert_type, severity);
CREATE INDEX idx_operational_alerts_wallet ON operational_alerts(wallet_address);
CREATE INDEX idx_critical_alerts_created_at ON critical_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication model)
CREATE POLICY "Service role can manage operational alerts" ON operational_alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage critical alerts" ON critical_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment to tables
COMMENT ON TABLE operational_alerts IS 'Stores all operational alerts for swap execution monitoring';
COMMENT ON TABLE critical_alerts IS 'Stores critical alerts for real-time broadcasting';