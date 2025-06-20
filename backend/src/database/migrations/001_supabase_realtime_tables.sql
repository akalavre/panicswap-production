-- Migration: Add tables for Supabase Realtime
-- Description: Creates new tables for pool updates, system alerts, and wallet notifications
-- Date: 2025-01-16

-- Create pool_updates table for real-time pool monitoring updates
CREATE TABLE IF NOT EXISTS pool_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_address TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('liquidity', 'volume', 'price', 'reserves')),
  old_value NUMERIC,
  new_value NUMERIC,
  change_percentage NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_pool_updates_pool_address (pool_address),
  INDEX idx_pool_updates_token_mint (token_mint),
  INDEX idx_pool_updates_created_at (created_at DESC)
);

-- Create system_alerts table for application-wide notifications
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'general', -- 'price', 'liquidity', 'protection', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_system_alerts_alert_type (alert_type),
  INDEX idx_system_alerts_category (category),
  INDEX idx_system_alerts_created_at (created_at DESC)
);

-- Create wallet_notifications table for user-specific notifications
CREATE TABLE IF NOT EXISTS wallet_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'protection_triggered',
    'protection_executed',
    'protection_failed',
    'rugpull_detected',
    'price_alert',
    'liquidity_alert',
    'auto_protection_enabled',
    'auto_protection_disabled',
    'subscription_expiring',
    'general'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_wallet_notifications_wallet (wallet_address),
  INDEX idx_wallet_notifications_read (read),
  INDEX idx_wallet_notifications_created_at (created_at DESC),
  INDEX idx_wallet_notifications_type (notification_type)
);

-- Add RLS policies for wallet_notifications
ALTER TABLE wallet_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON wallet_notifications
  FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', TRUE));

-- Policy: System can insert notifications for any wallet
CREATE POLICY "System can create notifications" ON wallet_notifications
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON wallet_notifications
  FOR UPDATE
  USING (wallet_address = current_setting('app.current_wallet', TRUE))
  WITH CHECK (wallet_address = current_setting('app.current_wallet', TRUE));

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE pool_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_notifications;

-- Ensure existing tables have realtime enabled
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS token_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS protected_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS rugpull_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS protection_events;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS auto_protection_events;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS swap_transactions;

-- Create helper function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM wallet_notifications 
  WHERE read = TRUE AND read_at < NOW() - INTERVAL '30 days';
  
  -- Delete unread low-priority notifications older than 90 days
  DELETE FROM wallet_notifications 
  WHERE read = FALSE 
    AND priority = 'low' 
    AND created_at < NOW() - INTERVAL '90 days';
  
  -- Delete expired system alerts
  DELETE FROM system_alerts 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Delete old pool updates (keep last 7 days)
  DELETE FROM pool_updates 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes on existing tables for better realtime performance
CREATE INDEX IF NOT EXISTS idx_token_prices_updated_at ON token_prices(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_token_mint ON token_prices(token_mint);

CREATE INDEX IF NOT EXISTS idx_protected_tokens_wallet ON protected_tokens(wallet_address);
CREATE INDEX IF NOT EXISTS idx_protected_tokens_updated ON protected_tokens(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rugpull_alerts_created ON rugpull_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rugpull_alerts_token ON rugpull_alerts(token_mint);

-- Add updated_at trigger for pool_updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for system_alerts to auto-expire after 24 hours if not set
CREATE OR REPLACE FUNCTION set_default_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL AND NEW.alert_type != 'critical' THEN
    NEW.expires_at = NOW() + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_system_alert_expiry
  BEFORE INSERT ON system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_default_expiry();

-- Grant appropriate permissions
GRANT SELECT ON pool_updates TO anon, authenticated;
GRANT SELECT ON system_alerts TO anon, authenticated;
GRANT ALL ON wallet_notifications TO authenticated;
GRANT SELECT ON wallet_notifications TO anon;

-- Add comments for documentation
COMMENT ON TABLE pool_updates IS 'Real-time updates for liquidity pool changes';
COMMENT ON TABLE system_alerts IS 'System-wide alerts and notifications';
COMMENT ON TABLE wallet_notifications IS 'User-specific notifications tied to wallet addresses';

COMMENT ON COLUMN pool_updates.update_type IS 'Type of update: liquidity, volume, price, or reserves';
COMMENT ON COLUMN system_alerts.category IS 'Category of alert for filtering: price, liquidity, protection, or system';
COMMENT ON COLUMN wallet_notifications.priority IS 'Notification priority level: low, normal, high, or critical';