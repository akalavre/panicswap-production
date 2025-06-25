-- Migration: 004_add_ml_and_social_tables
-- Description: Add tables for ML model, social signals, and wallet clustering (Phase 3)

-- Phase 3 ML Tables Migration

-- 1. Historical rugs table for training data
CREATE TABLE IF NOT EXISTS historical_rugs (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL UNIQUE,
  token_name TEXT,
  token_symbol TEXT,
  dev_address TEXT,
  initial_liquidity NUMERIC,
  initial_holders INTEGER,
  rug_timestamp TIMESTAMP NOT NULL,
  rug_type TEXT CHECK (rug_type IN ('flash', 'slow_bleed', 'honeypot', 'dev_dump')),
  liquidity_removed_percent NUMERIC,
  time_to_rug_hours NUMERIC,
  warning_signs TEXT[],
  chain TEXT DEFAULT 'solana',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for historical rugs
CREATE INDEX IF NOT EXISTS idx_historical_rugs_dev ON historical_rugs(dev_address);
CREATE INDEX IF NOT EXISTS idx_historical_rugs_timestamp ON historical_rugs(rug_timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_rugs_type ON historical_rugs(rug_type);

-- 2. Historical rug metrics for training enrichment
CREATE TABLE IF NOT EXISTS historical_rug_metrics (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL REFERENCES historical_rugs(token_mint),
  liquidity_trend_24h NUMERIC,
  holder_trend_24h NUMERIC,
  volume_spike_detected BOOLEAN,
  sell_pressure_1h NUMERIC,
  warning_signs_1h_before TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. ML predictions table
CREATE TABLE IF NOT EXISTS ml_predictions (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  probability NUMERIC NOT NULL CHECK (probability >= 0 AND probability <= 100),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  time_to_rug INTEGER, -- minutes
  risk_factors TEXT[],
  model_version TEXT NOT NULL,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ML predictions
CREATE INDEX IF NOT EXISTS idx_ml_predictions_token ON ml_predictions(token_mint);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_time ON ml_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_probability ON ml_predictions(probability);

-- 4. ML inference results table
CREATE TABLE IF NOT EXISTS ml_inference_results (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  ml_probability NUMERIC NOT NULL,
  ml_confidence NUMERIC NOT NULL,
  combined_score NUMERIC NOT NULL,
  action_required TEXT CHECK (action_required IN ('exit_now', 'exit_soon', 'monitor', 'safe')),
  overall_confidence NUMERIC NOT NULL,
  risk_factors TEXT[],
  time_to_rug INTEGER,
  source TEXT CHECK (source IN ('ml', 'rules', 'combined')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for inference results
CREATE INDEX IF NOT EXISTS idx_ml_inference_token ON ml_inference_results(token_mint);
CREATE INDEX IF NOT EXISTS idx_ml_inference_time ON ml_inference_results(created_at);
CREATE INDEX IF NOT EXISTS idx_ml_inference_action ON ml_inference_results(action_required);

-- 5. Social signals table
CREATE TABLE IF NOT EXISTS social_signals (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('twitter', 'telegram', 'discord', 'reddit')),
  signal_type TEXT CHECK (signal_type IN ('mention', 'sentiment', 'alert', 'whale_movement')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'panic')),
  intensity INTEGER CHECK (intensity >= 0 AND intensity <= 100),
  source TEXT,
  content TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for social signals
CREATE INDEX IF NOT EXISTS idx_social_signals_token ON social_signals(token_mint);
CREATE INDEX IF NOT EXISTS idx_social_signals_time ON social_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_social_signals_platform ON social_signals(platform);

-- 6. Social metrics table
CREATE TABLE IF NOT EXISTS social_metrics (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  mention_count_24h INTEGER DEFAULT 0,
  sentiment_score NUMERIC CHECK (sentiment_score >= -100 AND sentiment_score <= 100),
  panic_level NUMERIC CHECK (panic_level >= 0 AND panic_level <= 100),
  whale_alerts INTEGER DEFAULT 0,
  rug_mentions INTEGER DEFAULT 0,
  positive_ratio NUMERIC CHECK (positive_ratio >= 0 AND positive_ratio <= 1),
  velocity_score NUMERIC CHECK (velocity_score >= -100 AND velocity_score <= 100),
  influencer_engagement NUMERIC CHECK (influencer_engagement >= 0 AND influencer_engagement <= 100),
  community_health NUMERIC CHECK (community_health >= 0 AND community_health <= 100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for social metrics
CREATE INDEX IF NOT EXISTS idx_social_metrics_token ON social_metrics(token_mint);

-- 7. Wallet clusters table
CREATE TABLE IF NOT EXISTS wallet_clusters (
  id SERIAL PRIMARY KEY,
  main_wallet TEXT NOT NULL UNIQUE,
  related_wallets TEXT[],
  cluster_size INTEGER NOT NULL,
  funding_source TEXT,
  rug_history INTEGER DEFAULT 0,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  last_activity TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for wallet clusters
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_main ON wallet_clusters(main_wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_funding ON wallet_clusters(funding_source);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_risk ON wallet_clusters(risk_level);

-- Supporting tables for ML features

-- Token socials table for social media links
CREATE TABLE IF NOT EXISTS token_socials (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL UNIQUE,
  discord_url TEXT,
  twitter_url TEXT,
  telegram_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Community reports table for crowdsourced data
CREATE TABLE IF NOT EXISTS community_reports (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('rugpull', 'honeypot', 'suspicious', 'legitimate')),
  reporter_wallet TEXT,
  description TEXT,
  evidence JSONB,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Liquidity history table for tracking
CREATE TABLE IF NOT EXISTS liquidity_history (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  liquidity_usd NUMERIC,
  holder_count INTEGER,
  volume_24h NUMERIC,
  failed_sells_percent NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Token transactions table for tracking trades
CREATE TABLE IF NOT EXISTS token_transactions (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  type TEXT CHECK (type IN ('buy', 'sell', 'transfer')),
  wallet_address TEXT NOT NULL,
  amount_usd NUMERIC,
  success BOOLEAN DEFAULT true,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Token metrics history for ML features
CREATE TABLE IF NOT EXISTS token_metrics_history (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  liquidity_usd NUMERIC,
  holder_count INTEGER,
  volume_24h NUMERIC,
  sell_count INTEGER,
  buy_count INTEGER,
  liquidity_velocity NUMERIC,
  failed_sells_percent NUMERIC,
  dev_activity_percent NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Liquidity changes table for quick lookups
CREATE TABLE IF NOT EXISTS liquidity_changes (
  id SERIAL PRIMARY KEY,
  token_mint TEXT NOT NULL,
  change_percent NUMERIC NOT NULL,
  previous_liquidity NUMERIC,
  current_liquidity NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet transactions table for clustering
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  amount NUMERIC,
  token_mint TEXT,
  transaction_type TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_token_socials_mint ON token_socials(token_mint);
CREATE INDEX IF NOT EXISTS idx_community_reports_mint ON community_reports(token_mint);
CREATE INDEX IF NOT EXISTS idx_liquidity_history_mint ON liquidity_history(token_mint);
CREATE INDEX IF NOT EXISTS idx_liquidity_history_time ON liquidity_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_transactions_mint ON token_transactions(token_mint);
CREATE INDEX IF NOT EXISTS idx_token_transactions_wallet ON token_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_metrics_history_mint ON token_metrics_history(token_mint);
CREATE INDEX IF NOT EXISTS idx_liquidity_changes_mint ON liquidity_changes(token_mint);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_from ON wallet_transactions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_to ON wallet_transactions(to_wallet);

-- Enable RLS on all tables
ALTER TABLE historical_rugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_rug_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_inference_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_socials ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all tables
CREATE POLICY "Service role full access to historical_rugs" ON historical_rugs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to historical_rug_metrics" ON historical_rug_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ml_predictions" ON ml_predictions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ml_inference_results" ON ml_inference_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to social_signals" ON social_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to social_metrics" ON social_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to wallet_clusters" ON wallet_clusters
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token_socials" ON token_socials
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to community_reports" ON community_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to liquidity_history" ON liquidity_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token_transactions" ON token_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token_metrics_history" ON token_metrics_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to liquidity_changes" ON liquidity_changes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to wallet_transactions" ON wallet_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Public read access for some tables
CREATE POLICY "Public read social_metrics" ON social_metrics
  FOR SELECT USING (true);

CREATE POLICY "Public read ml_predictions" ON ml_predictions
  FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE historical_rugs IS 'Historical rugpull data for ML training';
COMMENT ON TABLE ml_predictions IS 'ML model predictions for rugpull probability';
COMMENT ON TABLE social_signals IS 'Social media signals and mentions';
COMMENT ON TABLE wallet_clusters IS 'Wallet clustering for dev tracking';
COMMENT ON TABLE token_socials IS 'Social media links for tokens';
COMMENT ON TABLE community_reports IS 'Community-reported suspicious activity';
COMMENT ON TABLE liquidity_history IS 'Historical liquidity tracking';
COMMENT ON TABLE token_transactions IS 'Individual token transactions';
COMMENT ON TABLE token_metrics_history IS 'Historical metrics for ML features';
COMMENT ON TABLE liquidity_changes IS 'Significant liquidity changes';
COMMENT ON TABLE wallet_transactions IS 'Wallet-to-wallet transaction history';