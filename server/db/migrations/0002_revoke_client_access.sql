-- Protect VoxMitra tenant data from Supabase client roles. The Express backend
-- must connect with a separately provisioned server-only PostgreSQL role.
BEGIN;

DO $migration_preflight$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'businesses',
    'users',
    'agents',
    'agent_configurations',
    'call_records',
    'callbacks',
    'integrations',
    'usage_records',
    'wallets',
    'wallet_transactions',
    'wallet_reservations',
    'wallet_autotopup_settings',
    'payment_orders',
    'billing_configs',
    'wallet_notifications',
    'campaigns',
    'leads',
    'knowledge_sources',
    'onboarding'
  ];
  missing_tables TEXT[];
BEGIN
  SELECT array_agg(expected_name)
  INTO missing_tables
  FROM unnest(expected_tables) AS expected(expected_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables AS existing
    WHERE existing.table_schema = 'public'
      AND existing.table_name = expected.expected_name
      AND existing.table_type = 'BASE TABLE'
  );

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'VoxMitra client-access lockdown requires all tables from migration 0001.';
  END IF;
END;
$migration_preflight$;

REVOKE ALL PRIVILEGES ON TABLE
  public.businesses,
  public.users,
  public.agents,
  public.agent_configurations,
  public.call_records,
  public.callbacks,
  public.integrations,
  public.usage_records,
  public.wallets,
  public.wallet_transactions,
  public.wallet_reservations,
  public.wallet_autotopup_settings,
  public.payment_orders,
  public.billing_configs,
  public.wallet_notifications,
  public.campaigns,
  public.leads,
  public.knowledge_sources,
  public.onboarding
FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
