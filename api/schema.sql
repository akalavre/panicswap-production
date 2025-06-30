-- Subscriptions table for PanicSwap
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('crypto', 'stripe')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    transaction_signature VARCHAR(255), -- For crypto payments (Solana transaction signature)
    stripe_session_id VARCHAR(255), -- For Stripe checkout session
    stripe_subscription_id VARCHAR(255), -- For Stripe subscription ID
    stripe_customer_id VARCHAR(255), -- For Stripe customer ID
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'failed')),
    protection_mode VARCHAR(20) DEFAULT 'watch-only' CHECK (protection_mode IN ('full', 'watch-only')), -- Protection mode: full enables swaps, watch-only only alerts
    features JSONB DEFAULT '{}', -- Store plan features as JSON
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, status) WHERE status = 'active' -- Only one active subscription per wallet
);

-- Index for faster queries
CREATE INDEX idx_subscriptions_wallet ON subscriptions(wallet_address);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);
CREATE INDEX idx_subscriptions_stripe_session ON subscriptions(stripe_session_id);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE
    ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payment history table for audit trail
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions(id),
    wallet_address VARCHAR(44) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2),
    currency VARCHAR(10),
    transaction_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for payment history
CREATE INDEX idx_payment_history_wallet ON payment_history(wallet_address);
CREATE INDEX idx_payment_history_subscription ON payment_history(subscription_id);

-- View for active subscriptions with features
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    s.id,
    s.wallet_address,
    s.plan_type,
    s.features,
    s.expires_at,
    s.created_at,
    CASE 
        WHEN s.expires_at IS NULL THEN true
        WHEN s.expires_at > CURRENT_TIMESTAMP THEN true
        ELSE false
    END as is_active
FROM subscriptions s
WHERE s.status = 'active';