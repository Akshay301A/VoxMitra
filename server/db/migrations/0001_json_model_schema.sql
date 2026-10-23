-- VoxMitra migration 0001: PostgreSQL schema matching server/db/database.ts.
-- Review server/db/migrations/0001_json_model_schema.md before applying.
--
-- This is a create-only migration for a fresh target schema. It intentionally
-- aborts if overlapping public tables already exist; it does not convert the
-- UUID-based legacy schema.sql or alter the JSON store.
--
-- IDs are TEXT so existing UUID-shaped, prefixed, and business-generated
-- identifiers can be copied verbatim.
--
-- RLS is intentionally not enabled here. The Express API authenticates its
-- own JWTs; auth.uid() is not that identity and the current backend does not
-- set a tenant context in PostgreSQL. See the companion notes for the role/RLS
-- strategy to resolve before a runtime adapter is introduced.

BEGIN;

DO $migration_preflight$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL
     OR to_regclass('public.users') IS NOT NULL
     OR to_regclass('public.agents') IS NOT NULL
     OR to_regclass('public.agent_configurations') IS NOT NULL
     OR to_regclass('public.call_records') IS NOT NULL
     OR to_regclass('public.callbacks') IS NOT NULL
     OR to_regclass('public.integrations') IS NOT NULL
     OR to_regclass('public.usage_records') IS NOT NULL
     OR to_regclass('public.wallets') IS NOT NULL
     OR to_regclass('public.wallet_transactions') IS NOT NULL
     OR to_regclass('public.wallet_reservations') IS NOT NULL
     OR to_regclass('public.wallet_autotopup_settings') IS NOT NULL
     OR to_regclass('public.payment_orders') IS NOT NULL
     OR to_regclass('public.billing_configs') IS NOT NULL
     OR to_regclass('public.billing_config') IS NOT NULL
     OR to_regclass('public.wallet_notifications') IS NOT NULL
     OR to_regclass('public.campaigns') IS NOT NULL
     OR to_regclass('public.leads') IS NOT NULL
     OR to_regclass('public.knowledge_sources') IS NOT NULL
     OR to_regclass('public.onboarding') IS NOT NULL THEN
    RAISE EXCEPTION
      'VoxMitra migration 0001 expects a fresh public schema; overlapping tables exist. Review the legacy schema and choose a separate target or a reviewed conversion migration.';
  END IF;
END;
$migration_preflight$;

CREATE TABLE public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  plan_tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, slug)
);

CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, business_id),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX users_email_normalized_uq ON public.users (lower(btrim(email)));
CREATE INDEX users_business_idx ON public.users (business_id);

CREATE TABLE public.agents (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL
    CHECK (agent_type IN ('instant_lead', 'bulk_caller', 'inbound_receptionist')),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'draft')),
  total_calls INTEGER NOT NULL DEFAULT 0 CHECK (total_calls >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, business_id),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX agents_business_idx ON public.agents (business_id);
CREATE INDEX agents_business_status_idx ON public.agents (business_id, status);

CREATE TABLE public.agent_configurations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  business_id TEXT NOT NULL,
  greeting TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  supported_languages JSONB NOT NULL DEFAULT '["en-US"]'::jsonb
    CHECK (jsonb_typeof(supported_languages) = 'array'),
  voice_id TEXT NOT NULL DEFAULT '21m00Tcm4TlvDq8ikWAM',
  voice_name TEXT NOT NULL DEFAULT 'Rachel',
  voice_settings JSONB NOT NULL DEFAULT '{"stability":0.6,"similarity_boost":0.75}'::jsonb
    CHECK (jsonb_typeof(voice_settings) = 'object'),
  max_duration_seconds INTEGER NOT NULL DEFAULT 300
    CHECK (max_duration_seconds > 0),
  transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_phone TEXT NOT NULL DEFAULT '',
  transfer_conditions TEXT NOT NULL DEFAULT '',
  callback_instructions TEXT NOT NULL DEFAULT '',
  contact_fields_to_collect JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(contact_fields_to_collect) = 'array'),
  business_faqs JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(business_faqs) = 'array'),
  agent_plan JSONB,
  webhook_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (agent_id, business_id)
    REFERENCES public.agents(id, business_id) ON DELETE CASCADE
);

CREATE INDEX agent_configurations_business_idx
  ON public.agent_configurations (business_id);

CREATE TABLE public.call_records (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  caller_number TEXT NOT NULL,
  recipient_number TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  status TEXT NOT NULL
    CHECK (status IN ('completed', 'failed', 'busy', 'no_answer', 'in_progress', 'transferred')),
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(transcript) = 'array'),
  summary TEXT NOT NULL DEFAULT '',
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(extracted_data) = 'object'),
  sentiment TEXT NOT NULL DEFAULT 'neutral'
    CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  telephony_call_sid TEXT NOT NULL DEFAULT '',
  recording_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, business_id),
  FOREIGN KEY (agent_id, business_id)
    REFERENCES public.agents(id, business_id) ON DELETE RESTRICT
);

CREATE INDEX call_records_business_created_idx
  ON public.call_records (business_id, created_at DESC);
CREATE INDEX call_records_business_agent_idx
  ON public.call_records (business_id, agent_id);
CREATE INDEX call_records_business_status_idx
  ON public.call_records (business_id, status);
CREATE INDEX call_records_telephony_sid_idx
  ON public.call_records (telephony_call_sid) WHERE telephony_call_sid <> '';

CREATE TABLE public.callbacks (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  agent_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  call_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id, business_id)
    REFERENCES public.agents(id, business_id) ON DELETE RESTRICT,
  FOREIGN KEY (call_record_id, business_id)
    REFERENCES public.call_records(id, business_id) ON DELETE RESTRICT
);

CREATE INDEX callbacks_business_status_scheduled_idx
  ON public.callbacks (business_id, status, scheduled_time);
CREATE INDEX callbacks_business_agent_idx
  ON public.callbacks (business_id, agent_id);

CREATE TABLE public.integrations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  provider TEXT NOT NULL
    CHECK (provider IN ('elevenlabs', 'exotel', 'supabase', 'webhook')),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config_meta JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config_meta) = 'object'),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider),
  UNIQUE (id, business_id),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX integrations_business_idx ON public.integrations (business_id);

CREATE TABLE public.usage_records (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_minutes NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  total_calls INTEGER NOT NULL DEFAULT 0 CHECK (total_calls >= 0),
  billed_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (billed_amount_cents >= 0),
  payment_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'pending', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX usage_records_business_period_idx
  ON public.usage_records (business_id, period_start DESC);

CREATE TABLE public.wallets (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  available_balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_balance_minor >= 0),
  reserved_balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (reserved_balance_minor >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, business_id),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.wallet_transactions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('topup', 'call_usage', 'autotopup', 'refund', 'reversal', 'admin_adjustment')),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'failed', 'reversed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  external_reference TEXT,
  call_id TEXT,
  description TEXT NOT NULL,
  resulting_balance_minor BIGINT NOT NULL CHECK (resulting_balance_minor >= 0),
  metadata JSONB CHECK (metadata IS NULL OR jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (wallet_id, business_id)
    REFERENCES public.wallets(id, business_id) ON DELETE CASCADE
);

CREATE INDEX wallet_transactions_business_created_idx
  ON public.wallet_transactions (business_id, created_at DESC);
CREATE INDEX wallet_transactions_business_wallet_idx
  ON public.wallet_transactions (business_id, wallet_id);
CREATE INDEX wallet_transactions_business_call_idx
  ON public.wallet_transactions (business_id, call_id) WHERE call_id IS NOT NULL;

CREATE TABLE public.wallet_reservations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  reserved_amount_minor BIGINT NOT NULL CHECK (reserved_amount_minor >= 0),
  settled_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (settled_amount_minor >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'settled', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (settled_amount_minor <= reserved_amount_minor),
  FOREIGN KEY (wallet_id, business_id)
    REFERENCES public.wallets(id, business_id) ON DELETE CASCADE
);

CREATE INDEX wallet_reservations_business_status_idx
  ON public.wallet_reservations (business_id, status);
CREATE INDEX wallet_reservations_business_call_idx
  ON public.wallet_reservations (business_id, call_id);

CREATE TABLE public.wallet_autotopup_settings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  threshold_minor BIGINT NOT NULL DEFAULT 20000 CHECK (threshold_minor >= 0),
  recharge_amount_minor BIGINT NOT NULL DEFAULT 100000 CHECK (recharge_amount_minor > 0),
  monthly_cap_minor BIGINT NOT NULL DEFAULT 500000 CHECK (monthly_cap_minor >= 0),
  current_month_recharged_minor BIGINT NOT NULL DEFAULT 0
    CHECK (current_month_recharged_minor >= 0),
  payment_mandate_reference TEXT,
  mandate_status TEXT NOT NULL DEFAULT 'none'
    CHECK (mandate_status IN ('none', 'pending_auth', 'active', 'failed', 'cancelled')),
  last_recharge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.payment_orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay'
    CHECK (provider IN ('razorpay', 'manual')),
  provider_order_reference TEXT NOT NULL UNIQUE,
  provider_payment_reference TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'expired')),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, idempotency_key),
  UNIQUE (id, business_id),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX payment_orders_business_created_idx
  ON public.payment_orders (business_id, created_at DESC);

CREATE TABLE public.billing_configs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE,
  billing_mode TEXT NOT NULL DEFAULT 'subscription_plus_wallet'
    CHECK (billing_mode IN ('subscription_plus_wallet', 'pure_prepaid')),
  usage_rate_per_minute_minor BIGINT NOT NULL DEFAULT 550
    CHECK (usage_rate_per_minute_minor >= 0),
  included_minutes INTEGER NOT NULL DEFAULT 0 CHECK (included_minutes >= 0),
  included_minutes_used INTEGER NOT NULL DEFAULT 0 CHECK (included_minutes_used >= 0),
  minimum_recharge_minor BIGINT NOT NULL DEFAULT 0 CHECK (minimum_recharge_minor >= 0),
  low_balance_alert_threshold_minor BIGINT NOT NULL DEFAULT 0
    CHECK (low_balance_alert_threshold_minor >= 0),
  call_duration_rounding_seconds INTEGER NOT NULL DEFAULT 60
    CHECK (call_duration_rounding_seconds > 0),
  charge_unanswered_calls BOOLEAN NOT NULL DEFAULT FALSE,
  gst_tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (gst_tax_rate_percent BETWEEN 0 AND 100),
  last_updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.wallet_notifications (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN (
      'low_balance', 'topup_success', 'payment_failed', 'autotopup_triggered',
      'autotopup_failed', 'call_blocked_insufficient_funds'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX wallet_notifications_business_created_idx
  ON public.wallet_notifications (business_id, created_at DESC);
CREATE INDEX wallet_notifications_business_unread_idx
  ON public.wallet_notifications (business_id, created_at DESC) WHERE read = FALSE;

CREATE TABLE public.campaigns (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed')),
  total_contacts INTEGER NOT NULL DEFAULT 0 CHECK (total_contacts >= 0),
  completed_contacts INTEGER NOT NULL DEFAULT 0 CHECK (completed_contacts >= 0),
  successful_calls INTEGER NOT NULL DEFAULT 0 CHECK (successful_calls >= 0),
  schedule_start TEXT,
  calling_window TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (agent_id, business_id)
    REFERENCES public.agents(id, business_id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX campaigns_business_created_idx
  ON public.campaigns (business_id, created_at DESC);
CREATE INDEX campaigns_business_agent_idx
  ON public.campaigns (business_id, agent_id);

CREATE TABLE public.leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL,
  qualification_status TEXT NOT NULL
    CHECK (qualification_status IN ('new', 'qualified', 'unqualified', 'follow_up_due')),
  agent_name TEXT,
  last_call_at TEXT,
  next_action TEXT,
  callback_date TEXT,
  notes TEXT,
  -- The JSON model has no lead creation/update timestamps. This is an
  -- ingestion/row-maintenance timestamp, not a claim about the lead's age.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX leads_business_status_idx
  ON public.leads (business_id, qualification_status);
CREATE INDEX leads_business_phone_idx ON public.leads (business_id, phone);

CREATE TABLE public.knowledge_sources (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('business_info', 'faq', 'document', 'website')),
  item_count INTEGER CHECK (item_count IS NULL OR item_count >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'processing', 'draft')),
  -- Kept as TEXT because current JSON includes values such as "2 days ago".
  updated_at TEXT NOT NULL,
  details TEXT,
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX knowledge_sources_business_updated_idx
  ON public.knowledge_sources (business_id, updated_at);

CREATE TABLE public.onboarding (
  user_id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  business_category TEXT NOT NULL DEFAULT '',
  website TEXT,
  location TEXT,
  timezone TEXT,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(goals) = 'array'),
  starting_point TEXT CHECK (starting_point IS NULL OR starting_point IN ('agent', 'dashboard')),
  pending_agent_start BOOLEAN,
  status TEXT
    CHECK (status IS NULL OR status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  step INTEGER NOT NULL DEFAULT 0 CHECK (step >= 0),
  tour_step INTEGER CHECK (tour_step IS NULL OR tour_step >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  tour_completed BOOLEAN,
  primary_use_case TEXT
    CHECK (primary_use_case IS NULL OR primary_use_case IN (
      'inbound_receptionist', 'instant_lead', 'bulk_caller'
    )),
  preferred_language TEXT,
  preferred_voice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, business_id)
    REFERENCES public.users(id, business_id) ON DELETE CASCADE
);

CREATE INDEX onboarding_business_idx ON public.onboarding (business_id);

COMMENT ON TABLE public.businesses IS 'Tenant/business records from DatabaseSchema.businesses.';
COMMENT ON TABLE public.users IS 'Users belong to one business; multiple users per business are supported.';
COMMENT ON TABLE public.agents IS 'Tenant-owned AI agents from DatabaseSchema.agents.';
COMMENT ON TABLE public.agent_configurations IS 'One structured configuration per agent; JSON fields retain the existing nested structures.';
COMMENT ON TABLE public.call_records IS 'Call history including demo marker and JSON transcript/extracted data.';
COMMENT ON TABLE public.callbacks IS 'Scheduled callback records with same-business optional agent and call links.';
COMMENT ON TABLE public.integrations IS 'Integration metadata only; configuration values remain server-side and require secret review.';
COMMENT ON TABLE public.usage_records IS 'Usage aggregates; billed_amount_cents retains the existing field/unit.';
COMMENT ON TABLE public.wallets IS 'Prepaid wallet balances in INR minor units (paise).';
COMMENT ON TABLE public.wallet_transactions IS 'Wallet ledger transactions; call_id remains a TEXT correlation identifier because current processing does not require a persisted call row.';
COMMENT ON TABLE public.wallet_reservations IS 'Temporary wallet holds; call_id stays TEXT and is not constrained to a call record.';
COMMENT ON TABLE public.wallet_autotopup_settings IS 'Automatic top-up configuration and mandate reference metadata.';
COMMENT ON TABLE public.payment_orders IS 'Payment-order metadata; not a payment integration or verification implementation.';
COMMENT ON TABLE public.billing_configs IS 'Canonical plural table for DatabaseSchema.billing_configs.';
COMMENT ON TABLE public.wallet_notifications IS 'Per-business wallet notifications.';
COMMENT ON TABLE public.campaigns IS 'Campaigns; agent_id is constrained to an agent in the same business.';
COMMENT ON TABLE public.leads IS 'Lead records; agent_name is a denormalized display label in the JSON model.';
COMMENT ON TABLE public.knowledge_sources IS 'Knowledge metadata; updated_at remains TEXT to preserve current human-readable values.';
COMMENT ON TABLE public.onboarding IS 'Onboarding is keyed by user_id, with business_id copied from that user for tenant scoping.';

COMMIT;
