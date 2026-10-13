-- =========================================================================
-- VoxMitra PostgreSQL & Supabase Database Schema
-- Multi-tenant schema with Row-Level Security (RLS) policies
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table (Tenants)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    plan_tier VARCHAR(50) DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('instant_lead', 'bulk_caller', 'inbound_receptionist')),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
    total_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_business ON agents(business_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 4. Agent Configurations Table
CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    greeting TEXT NOT NULL,
    instructions TEXT NOT NULL,
    objectives TEXT,
    supported_languages JSONB DEFAULT '["en-US"]'::jsonb,
    voice_id VARCHAR(100) NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    voice_settings JSONB DEFAULT '{"stability": 0.5, "similarity_boost": 0.75}'::jsonb,
    max_duration_seconds INTEGER DEFAULT 300,
    transfer_enabled BOOLEAN DEFAULT FALSE,
    transfer_phone VARCHAR(50),
    transfer_conditions TEXT,
    callback_instructions TEXT,
    contact_fields_to_collect JSONB DEFAULT '[]'::jsonb,
    business_faqs JSONB DEFAULT '[]'::jsonb,
    webhook_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_agent ON agent_configurations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_business ON agent_configurations(business_id);

-- 5. Call Records Table
CREATE TABLE IF NOT EXISTS call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    caller_number VARCHAR(50) NOT NULL,
    recipient_number VARCHAR(50) NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('completed', 'failed', 'busy', 'no_answer', 'in_progress', 'transferred')),
    transcript JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    sentiment VARCHAR(30) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
    telephony_call_sid VARCHAR(255),
    recording_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_records_business ON call_records(business_id);
CREATE INDEX IF NOT EXISTS idx_call_records_agent ON call_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_records_created ON call_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON call_records(status);

-- 6. Callbacks Table
CREATE TABLE IF NOT EXISTS callbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    call_record_id UUID REFERENCES call_records(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_callbacks_business ON callbacks(business_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);

-- 7. Integrations Table (Provider credentials kept server-side)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('elevenlabs', 'exotel', 'supabase', 'webhook')),
    is_enabled BOOLEAN DEFAULT FALSE,
    config_meta JSONB DEFAULT '{}'::jsonb,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_business_provider UNIQUE (business_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_business ON integrations(business_id);

-- 8. Usage Records Table
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_minutes NUMERIC(10, 2) DEFAULT 0.00,
    total_calls INTEGER DEFAULT 0,
    billed_amount_cents INTEGER DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'waived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_business ON usage_records(business_id);

-- =========================================================================
-- Row Level Security (RLS) Setup for Supabase
-- =========================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Helper function to retrieve authenticated user's business_id
CREATE OR REPLACE FUNCTION auth_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policy: Users can only view & edit resources within their business
CREATE POLICY tenant_isolation_agents ON agents
    FOR ALL
    USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_agent_configs ON agent_configurations
    FOR ALL
    USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_call_records ON call_records
    FOR ALL
    USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_callbacks ON callbacks
    FOR ALL
    USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_integrations ON integrations
    FOR ALL
    USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_usage ON usage_records
    FOR ALL
    USING (business_id = auth_user_business_id());

-- =========================================================================
-- 9. Wallets, Transactions & Fintech Billing Tables (Integer Paise Minor Units)
-- =========================================================================

-- Wallets Table (Prepaid Usage Ledger Balance)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    available_balance_minor BIGINT DEFAULT 0 NOT NULL, -- in paise: ₹1 = 100 paise = 1 usage credit
    reserved_balance_minor BIGINT DEFAULT 0 NOT NULL,  -- in paise
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_business ON wallets(business_id);

-- Wallet Transactions (Immutable Double-Entry Ledger Records)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('topup', 'call_usage', 'autotopup', 'refund', 'reversal', 'admin_adjustment')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount_minor BIGINT NOT NULL, -- in paise
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'reversed')),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    external_reference VARCHAR(255),
    call_id UUID REFERENCES call_records(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    resulting_balance_minor BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_business ON wallet_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_call ON wallet_transactions(call_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_idempotency ON wallet_transactions(idempotency_key);

-- Wallet Reservations (Temporary hold during active billable calls)
CREATE TABLE IF NOT EXISTS wallet_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    call_id UUID,
    reserved_amount_minor BIGINT NOT NULL,
    settled_amount_minor BIGINT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'released', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_reservations_business ON wallet_reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_wallet_reservations_wallet ON wallet_reservations(wallet_id);

-- Auto Top-Up Settings
CREATE TABLE IF NOT EXISTS wallet_autotopup_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    threshold_minor BIGINT DEFAULT 20000, -- ₹200 default trigger
    recharge_amount_minor BIGINT DEFAULT 100000, -- ₹1,000 default recharge
    monthly_cap_minor BIGINT DEFAULT 500000, -- ₹5,000 default cap
    current_month_recharged_minor BIGINT DEFAULT 0,
    payment_mandate_reference VARCHAR(255),
    mandate_status VARCHAR(30) DEFAULT 'none' CHECK (mandate_status IN ('none', 'pending_auth', 'active', 'failed', 'cancelled')),
    last_recharge_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_autotopup_business ON wallet_autotopup_settings(business_id);

-- Payment Orders (Razorpay Orders & Gateway Verifications)
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'razorpay' NOT NULL,
    provider_order_reference VARCHAR(255) NOT NULL,
    provider_payment_reference VARCHAR(255),
    amount_minor BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(30) DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'expired')),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_business ON payment_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_ref ON payment_orders(provider_order_reference);

-- Billing & Commercial Configuration
CREATE TABLE IF NOT EXISTS billing_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    billing_mode VARCHAR(50) DEFAULT 'subscription_plus_wallet' CHECK (billing_mode IN ('subscription_plus_wallet', 'pure_prepaid')),
    usage_rate_per_minute_minor BIGINT DEFAULT 550, -- ₹5.50/min for Growth
    included_minutes INTEGER DEFAULT 500,
    included_minutes_used INTEGER DEFAULT 0,
    minimum_recharge_minor BIGINT DEFAULT 10000, -- ₹100
    low_balance_alert_threshold_minor BIGINT DEFAULT 20000, -- ₹200
    call_duration_rounding_seconds INTEGER DEFAULT 60,
    charge_unanswered_calls BOOLEAN DEFAULT FALSE,
    gst_tax_rate_percent NUMERIC(5, 2) DEFAULT 18.00,
    last_updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Notifications
CREATE TABLE IF NOT EXISTS wallet_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('low_balance', 'topup_success', 'payment_failed', 'autotopup_triggered', 'autotopup_failed', 'call_blocked_insufficient_funds')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_notifications_business ON wallet_notifications(business_id);

-- Enable RLS on New Financial Tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_autotopup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_wallets ON wallets
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_wallet_tx ON wallet_transactions
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_wallet_reservations ON wallet_reservations
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_autotopup ON wallet_autotopup_settings
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_payment_orders ON payment_orders
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_billing_config ON billing_config
    FOR ALL USING (business_id = auth_user_business_id());

CREATE POLICY tenant_isolation_wallet_notifications ON wallet_notifications
    FOR ALL USING (business_id = auth_user_business_id());

