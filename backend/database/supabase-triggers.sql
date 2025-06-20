-- Supabase Database Triggers for PanicSwap MVP

-- 1. Function to handle rugpull alerts and queue executions
CREATE OR REPLACE FUNCTION handle_rugpull_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process HIGH and CRITICAL alerts
  IF NEW.severity IN ('HIGH', 'CRITICAL') THEN
    -- Insert execution tasks for all protected wallets
    INSERT INTO execution_queue (
      token_mint,
      wallet_address,
      action_type,
      priority,
      reason,
      metadata
    )
    SELECT 
      NEW.token_mint,
      pt.wallet_address,
      'emergency_sell',
      CASE 
        WHEN NEW.severity = 'CRITICAL' THEN 100
        ELSE 50
      END,
      CONCAT('Rugpull detected: ', NEW.liquidity_drop::text, '% liquidity removed'),
      jsonb_build_object(
        'alert_id', NEW.id,
        'severity', NEW.severity,
        'liquidity_drop', NEW.liquidity_drop,
        'triggered_at', NOW()
      )
    FROM protected_tokens pt
    WHERE pt.token_mint = NEW.token_mint
      AND pt.is_active = true
      AND pt.monitoring_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for rugpull alerts
DROP TRIGGER IF EXISTS trigger_rugpull_execution ON rugpull_alerts;
CREATE TRIGGER trigger_rugpull_execution
  AFTER INSERT ON rugpull_alerts
  FOR EACH ROW
  EXECUTE FUNCTION handle_rugpull_alert();

-- 3. Function to update protection status after execution
CREATE OR REPLACE FUNCTION update_protection_after_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- If execution completed successfully, deactivate protection
  IF NEW.status = 'completed' AND NEW.action_type = 'emergency_sell' THEN
    UPDATE protected_tokens
    SET 
      is_active = false,
      monitoring_active = false,
      updated_at = NOW(),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{last_execution}',
        jsonb_build_object(
          'executed_at', NEW.completed_at,
          'signature', NEW.transaction_signature,
          'reason', NEW.reason
        )
      )
    WHERE token_mint = NEW.token_mint
      AND wallet_address = NEW.wallet_address;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for execution completion
DROP TRIGGER IF EXISTS trigger_protection_update ON execution_queue;
CREATE TRIGGER trigger_protection_update
  AFTER UPDATE ON execution_queue
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_protection_after_execution();

-- 5. Function to track active monitoring
CREATE OR REPLACE FUNCTION track_monitoring_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When protection is enabled
  IF NEW.monitoring_active = true AND (OLD.monitoring_active = false OR OLD.monitoring_active IS NULL) THEN
    INSERT INTO monitoring_status (
      token_mint,
      pool_address,
      started_at,
      is_active
    ) VALUES (
      NEW.token_mint,
      NEW.pool_address,
      NOW(),
      true
    )
    ON CONFLICT (token_mint) 
    DO UPDATE SET 
      is_active = true,
      started_at = NOW();
  
  -- When protection is disabled
  ELSIF NEW.monitoring_active = false AND OLD.monitoring_active = true THEN
    UPDATE monitoring_status
    SET 
      is_active = false,
      stopped_at = NOW()
    WHERE token_mint = NEW.token_mint;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for monitoring status
DROP TRIGGER IF EXISTS trigger_monitoring_status ON protected_tokens;
CREATE TRIGGER trigger_monitoring_status
  AFTER INSERT OR UPDATE ON protected_tokens
  FOR EACH ROW
  WHEN (NEW.monitoring_active IS DISTINCT FROM OLD.monitoring_active)
  EXECUTE FUNCTION track_monitoring_status();

-- 7. Create monitoring_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS monitoring_status (
  id BIGSERIAL PRIMARY KEY,
  token_mint VARCHAR(64) UNIQUE NOT NULL,
  pool_address VARCHAR(64),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monitoring_status_active 
  ON monitoring_status(is_active) 
  WHERE is_active = true;

-- 9. Function to calculate protection metrics
CREATE OR REPLACE FUNCTION get_protection_metrics(p_wallet_address VARCHAR)
RETURNS TABLE (
  total_protected INTEGER,
  active_protections INTEGER,
  executions_triggered INTEGER,
  executions_completed INTEGER,
  total_saved_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pt.token_mint)::INTEGER as total_protected,
    COUNT(DISTINCT pt.token_mint) FILTER (WHERE pt.is_active = true)::INTEGER as active_protections,
    COUNT(DISTINCT eq.id) FILTER (WHERE eq.action_type = 'emergency_sell')::INTEGER as executions_triggered,
    COUNT(DISTINCT eq.id) FILTER (WHERE eq.status = 'completed')::INTEGER as executions_completed,
    COALESCE(SUM((eq.metadata->>'saved_amount_usd')::NUMERIC), 0) as total_saved_usd
  FROM protected_tokens pt
  LEFT JOIN execution_queue eq ON pt.token_mint = eq.token_mint 
    AND pt.wallet_address = eq.wallet_address
  WHERE pt.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- 10. Enable Row Level Security on critical tables
ALTER TABLE protected_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet isolation
CREATE POLICY "Users can view their own protected tokens"
  ON protected_tokens FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Users can view their own executions"
  ON execution_queue FOR SELECT
  USING (wallet_address = current_setting('app.current_wallet', true));