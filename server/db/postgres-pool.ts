import { readFileSync } from 'node:fs';
import { Pool, type PoolConfig } from 'pg';
import {
  DatabaseConfigurationError,
  readDatabaseConfiguration,
  type DatabaseConfiguration,
} from './backend.ts';

export interface DatabaseHealthResult {
  ok: boolean;
  message?: string;
}

export type PostgresStartupDiagnosticCategory =
  | 'tls'
  | 'authentication'
  | 'network'
  | 'database-not-found'
  | 'permission'
  | 'schema'
  | 'unknown';

export class PostgresStartupDiagnosticError extends DatabaseConfigurationError {
  constructor(
    readonly category: PostgresStartupDiagnosticCategory,
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'PostgresStartupDiagnosticError';
  }
}

const TLS_ERROR_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'CERT_REVOKED',
  'CERT_SIGNATURE_FAILURE',
  'CERT_UNTRUSTED',
  'INVALID_CA',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

const NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'PGCONNECT_TIMEOUT',
]);

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function classifyPostgresError(
  error: unknown
): { category: PostgresStartupDiagnosticCategory; code?: string } {
  const code = getErrorCode(error);
  if (!code) return { category: 'unknown' };
  if (TLS_ERROR_CODES.has(code)) {
    return { category: 'tls', code };
  }
  if (/^28[A-Z0-9]{3}$/.test(code)) return { category: 'authentication', code };
  if (code === '3D000') return { category: 'database-not-found', code };
  if (code === '42501') return { category: 'permission', code };
  if (NETWORK_ERROR_CODES.has(code) || /^08[A-Z0-9]{3}$/.test(code)) {
    return { category: 'network', code };
  }
  return { category: 'unknown' };
}

function classifyConfigurationError(
  error: DatabaseConfigurationError
): { category: 'permission' | 'schema'; message: string } | undefined {
  const permissionMessages = [
    'Required Supabase client roles are missing; access lockdown cannot be verified.',
    'PostgreSQL runtime role must be a dedicated non-privileged server role.',
    'PostgreSQL runtime role must not own VoxMitra tables.',
    'Supabase client-access lockdown is not applied to all VoxMitra tables.',
    'PostgreSQL runtime role lacks required VoxMitra schema or table privileges.',
  ];
  if (permissionMessages.includes(error.message)) {
    return { category: 'permission', message: error.message };
  }

  const schemaMessages = [
    'PostgreSQL schema is missing required VoxMitra tables.',
    'PostgreSQL schema is missing required VoxMitra columns.',
    'PostgreSQL schema contains incompatible VoxMitra column types.',
    'PostgreSQL schema is missing required VoxMitra key or tenant constraints.',
    'PostgreSQL schema is missing required VoxMitra indexes.',
  ];
  if (schemaMessages.includes(error.message)) {
    return { category: 'schema', message: error.message };
  }

  return undefined;
}

const EXPECTED_TABLES = [
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
  'onboarding',
];

const REQUIRED_INDEXES = [
  'users_email_normalized_uq',
  'users_business_idx',
  'agents_business_idx',
  'agents_business_status_idx',
  'agents_inbound_phone_number_uq',
  'agent_configurations_business_idx',
  'call_records_business_created_idx',
  'call_records_business_agent_idx',
  'call_records_business_status_idx',
  'call_records_telephony_sid_idx',
  'call_records_telephony_call_sid_uq',
  'callbacks_business_status_scheduled_idx',
  'callbacks_business_agent_idx',
  'integrations_business_idx',
  'usage_records_business_period_idx',
  'wallet_transactions_business_created_idx',
  'wallet_transactions_business_wallet_idx',
  'wallet_transactions_business_call_idx',
  'wallet_reservations_business_status_idx',
  'wallet_reservations_business_call_idx',
  'payment_orders_business_created_idx',
  'wallet_notifications_business_created_idx',
  'wallet_notifications_business_unread_idx',
  'campaigns_business_created_idx',
  'campaigns_business_agent_idx',
  'leads_business_status_idx',
  'leads_business_phone_idx',
  'knowledge_sources_business_updated_idx',
  'onboarding_business_idx',
];

const REQUIRED_CONSTRAINTS: { table: string; name: string; type: 'p' | 'u' | 'f' }[] = [
  { table: 'businesses', name: 'businesses_pkey', type: 'p' },
  { table: 'businesses', name: 'businesses_slug_key', type: 'u' },
  { table: 'users', name: 'users_pkey', type: 'p' },
  { table: 'users', name: 'users_id_business_id_key', type: 'u' },
  { table: 'users', name: 'users_business_id_fkey', type: 'f' },
  { table: 'agents', name: 'agents_pkey', type: 'p' },
  { table: 'agents', name: 'agents_id_business_id_key', type: 'u' },
  { table: 'agents', name: 'agents_business_id_fkey', type: 'f' },
  { table: 'agent_configurations', name: 'agent_configurations_pkey', type: 'p' },
  { table: 'agent_configurations', name: 'agent_configurations_agent_id_key', type: 'u' },
  { table: 'agent_configurations', name: 'agent_configurations_agent_id_business_id_fkey', type: 'f' },
  { table: 'call_records', name: 'call_records_pkey', type: 'p' },
  { table: 'call_records', name: 'call_records_id_business_id_key', type: 'u' },
  { table: 'call_records', name: 'call_records_agent_id_business_id_fkey', type: 'f' },
  { table: 'callbacks', name: 'callbacks_pkey', type: 'p' },
  { table: 'callbacks', name: 'callbacks_business_id_fkey', type: 'f' },
  { table: 'callbacks', name: 'callbacks_agent_id_business_id_fkey', type: 'f' },
  { table: 'callbacks', name: 'callbacks_call_record_id_business_id_fkey', type: 'f' },
  { table: 'integrations', name: 'integrations_pkey', type: 'p' },
  { table: 'integrations', name: 'integrations_business_id_provider_key', type: 'u' },
  { table: 'integrations', name: 'integrations_id_business_id_key', type: 'u' },
  { table: 'integrations', name: 'integrations_business_id_fkey', type: 'f' },
  { table: 'usage_records', name: 'usage_records_pkey', type: 'p' },
  { table: 'usage_records', name: 'usage_records_business_id_fkey', type: 'f' },
  { table: 'wallets', name: 'wallets_pkey', type: 'p' },
  { table: 'wallets', name: 'wallets_business_id_key', type: 'u' },
  { table: 'wallets', name: 'wallets_id_business_id_key', type: 'u' },
  { table: 'wallets', name: 'wallets_business_id_fkey', type: 'f' },
  { table: 'wallet_transactions', name: 'wallet_transactions_pkey', type: 'p' },
  { table: 'wallet_transactions', name: 'wallet_transactions_idempotency_key_key', type: 'u' },
  { table: 'wallet_transactions', name: 'wallet_transactions_wallet_id_business_id_fkey', type: 'f' },
  { table: 'wallet_reservations', name: 'wallet_reservations_pkey', type: 'p' },
  { table: 'wallet_reservations', name: 'wallet_reservations_wallet_id_business_id_fkey', type: 'f' },
  { table: 'wallet_autotopup_settings', name: 'wallet_autotopup_settings_pkey', type: 'p' },
  { table: 'wallet_autotopup_settings', name: 'wallet_autotopup_settings_business_id_key', type: 'u' },
  { table: 'wallet_autotopup_settings', name: 'wallet_autotopup_settings_business_id_fkey', type: 'f' },
  { table: 'payment_orders', name: 'payment_orders_pkey', type: 'p' },
  { table: 'payment_orders', name: 'payment_orders_provider_order_reference_key', type: 'u' },
  { table: 'payment_orders', name: 'payment_orders_business_id_idempotency_key_key', type: 'u' },
  { table: 'payment_orders', name: 'payment_orders_id_business_id_key', type: 'u' },
  { table: 'payment_orders', name: 'payment_orders_business_id_fkey', type: 'f' },
  { table: 'billing_configs', name: 'billing_configs_pkey', type: 'p' },
  { table: 'billing_configs', name: 'billing_configs_business_id_key', type: 'u' },
  { table: 'billing_configs', name: 'billing_configs_business_id_fkey', type: 'f' },
  { table: 'wallet_notifications', name: 'wallet_notifications_pkey', type: 'p' },
  { table: 'wallet_notifications', name: 'wallet_notifications_business_id_fkey', type: 'f' },
  { table: 'campaigns', name: 'campaigns_pkey', type: 'p' },
  { table: 'campaigns', name: 'campaigns_agent_id_business_id_fkey', type: 'f' },
  { table: 'campaigns', name: 'campaigns_business_id_fkey', type: 'f' },
  { table: 'leads', name: 'leads_pkey', type: 'p' },
  { table: 'leads', name: 'leads_business_id_fkey', type: 'f' },
  { table: 'knowledge_sources', name: 'knowledge_sources_pkey', type: 'p' },
  { table: 'knowledge_sources', name: 'knowledge_sources_business_id_fkey', type: 'f' },
  { table: 'onboarding', name: 'onboarding_pkey', type: 'p' },
  { table: 'onboarding', name: 'onboarding_user_id_business_id_fkey', type: 'f' },
];

const SUPABASE_CLIENT_ROLES = ['anon', 'authenticated', 'service_role'];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  businesses: [
    'id', 'name', 'slug', 'contact_email', 'phone_number', 'plan_tier', 'timezone',
    'created_at', 'updated_at',
  ],
  users: [
    'id', 'business_id', 'email', 'password_hash', 'full_name', 'role',
    'created_at', 'updated_at',
  ],
  agents: [
    'id', 'business_id', 'name', 'agent_type', 'description', 'status',
    'inbound_phone_number', 'total_calls',
    'created_at', 'updated_at',
  ],
  agent_configurations: [
    'id', 'agent_id', 'business_id', 'greeting', 'instructions', 'objectives',
    'supported_languages', 'voice_id', 'voice_name', 'voice_settings',
    'max_duration_seconds', 'transfer_enabled', 'transfer_phone', 'transfer_conditions',
    'callback_instructions', 'contact_fields_to_collect', 'business_faqs', 'agent_plan', 'webhook_url',
    'created_at', 'updated_at',
  ],
  call_records: [
    'id', 'business_id', 'agent_id', 'agent_name', 'direction', 'caller_number', 'recipient_number',
    'duration_seconds', 'status', 'transcript', 'summary', 'extracted_data', 'sentiment',
    'cost_usd', 'telephony_call_sid', 'recording_url', 'is_demo', 'created_at',
  ],
  callbacks: [
    'id', 'business_id', 'agent_id', 'customer_name', 'customer_phone', 'scheduled_time',
    'status', 'notes', 'call_record_id', 'created_at', 'updated_at',
  ],
  integrations: [
    'id', 'business_id', 'provider', 'is_enabled', 'config_meta', 'last_tested_at',
    'created_at', 'updated_at',
  ],
  usage_records: [
    'id', 'business_id', 'period_start', 'period_end', 'total_minutes', 'total_calls',
    'billed_amount_cents', 'payment_status', 'created_at',
  ],
  wallets: [
    'id', 'business_id', 'currency', 'available_balance_minor', 'reserved_balance_minor',
    'status', 'created_at', 'updated_at',
  ],
  wallet_transactions: [
    'id', 'business_id', 'wallet_id', 'transaction_type', 'direction', 'amount_minor',
    'currency', 'status', 'idempotency_key', 'external_reference', 'call_id',
    'description', 'resulting_balance_minor', 'metadata', 'created_at',
  ],
  wallet_reservations: [
    'id', 'business_id', 'wallet_id', 'call_id', 'reserved_amount_minor',
    'settled_amount_minor', 'status', 'expires_at', 'created_at', 'updated_at',
  ],
  wallet_autotopup_settings: [
    'id', 'business_id', 'enabled', 'threshold_minor', 'recharge_amount_minor',
    'monthly_cap_minor', 'current_month_recharged_minor', 'payment_mandate_reference',
    'mandate_status', 'last_recharge_at', 'created_at', 'updated_at',
  ],
  payment_orders: [
    'id', 'business_id', 'provider', 'provider_order_reference', 'provider_payment_reference',
    'amount_minor', 'currency', 'status', 'idempotency_key', 'created_at', 'updated_at',
  ],
  billing_configs: [
    'id', 'business_id', 'billing_mode', 'usage_rate_per_minute_minor', 'included_minutes',
    'included_minutes_used', 'minimum_recharge_minor', 'low_balance_alert_threshold_minor',
    'call_duration_rounding_seconds', 'charge_unanswered_calls', 'gst_tax_rate_percent',
    'last_updated_by', 'updated_at',
  ],
  wallet_notifications: [
    'id', 'business_id', 'type', 'title', 'message', 'read', 'created_at',
  ],
  campaigns: [
    'id', 'business_id', 'name', 'agent_id', 'agent_name', 'status', 'total_contacts',
    'completed_contacts', 'successful_calls', 'schedule_start', 'calling_window', 'created_at',
  ],
  leads: [
    'id', 'business_id', 'contact_name', 'phone', 'email', 'source', 'qualification_status',
    'agent_name', 'last_call_at', 'next_action', 'callback_date', 'notes', 'created_at', 'updated_at',
  ],
  knowledge_sources: [
    'id', 'business_id', 'title', 'type', 'item_count', 'status', 'updated_at', 'details',
  ],
  onboarding: [
    'user_id', 'business_id', 'business_name', 'business_category', 'website', 'location', 'timezone',
    'goals', 'starting_point', 'pending_agent_start', 'status', 'step', 'tour_step', 'completed',
    'tour_completed', 'primary_use_case', 'preferred_language', 'preferred_voice',
    'created_at', 'updated_at',
  ],
};

const REQUIRED_COLUMN_TYPES: Record<string, Record<string, string>> = {
  businesses: { id: 'text' },
  users: { id: 'text', business_id: 'text' },
  agents: { id: 'text', business_id: 'text' },
  agent_configurations: {
    id: 'text', agent_id: 'text', business_id: 'text',
    supported_languages: 'jsonb', voice_settings: 'jsonb',
    contact_fields_to_collect: 'jsonb', business_faqs: 'jsonb', agent_plan: 'jsonb',
  },
  call_records: {
    id: 'text', business_id: 'text', agent_id: 'text', transcript: 'jsonb', extracted_data: 'jsonb',
  },
  callbacks: { id: 'text', business_id: 'text', agent_id: 'text', call_record_id: 'text' },
  integrations: { id: 'text', business_id: 'text', config_meta: 'jsonb' },
  usage_records: { id: 'text', business_id: 'text' },
  wallets: { id: 'text', business_id: 'text', available_balance_minor: 'bigint', reserved_balance_minor: 'bigint' },
  wallet_transactions: {
    id: 'text', business_id: 'text', wallet_id: 'text', call_id: 'text',
    amount_minor: 'bigint', resulting_balance_minor: 'bigint', metadata: 'jsonb',
  },
  wallet_reservations: {
    id: 'text', business_id: 'text', wallet_id: 'text', call_id: 'text',
    reserved_amount_minor: 'bigint', settled_amount_minor: 'bigint',
  },
  wallet_autotopup_settings: {
    id: 'text', business_id: 'text', threshold_minor: 'bigint',
    recharge_amount_minor: 'bigint', monthly_cap_minor: 'bigint',
    current_month_recharged_minor: 'bigint',
  },
  payment_orders: { id: 'text', business_id: 'text', amount_minor: 'bigint' },
  billing_configs: { id: 'text', business_id: 'text', usage_rate_per_minute_minor: 'bigint' },
  wallet_notifications: { id: 'text', business_id: 'text' },
  campaigns: { id: 'text', business_id: 'text', agent_id: 'text' },
  leads: { id: 'text', business_id: 'text' },
  knowledge_sources: { id: 'text', business_id: 'text' },
  onboarding: { user_id: 'text', business_id: 'text', goals: 'jsonb' },
};

let pool: Pool | undefined;

const SSL_CONNECTION_PARAMETERS = [
  'ssl',
  'sslmode',
  'sslrootcert',
  'sslcert',
  'sslkey',
  'sslpassword',
];

export function createPostgresPoolOptions(
  configuration: DatabaseConfiguration,
  env: Readonly<Record<string, string | undefined>> = process.env
): PoolConfig {
  if (configuration.backend !== 'postgres') {
    throw new DatabaseConfigurationError(
      'PostgreSQL pool requested while VOXMITRA_DATABASE is set to JSON.'
    );
  }

  const connectionUrl = new URL(configuration.connectionString);
  for (const parameter of SSL_CONNECTION_PARAMETERS) {
    connectionUrl.searchParams.delete(parameter);
  }

  const caCertificatePath = env.DATABASE_CA_CERT_PATH?.trim();
  let ca: string | undefined;
  if (caCertificatePath) {
    ca = readFileSync(caCertificatePath, 'utf8');
    if (!ca.trim()) {
      throw new DatabaseConfigurationError(
        'The PostgreSQL CA certificate configured by DATABASE_CA_CERT_PATH is empty.'
      );
    }
  }

  return {
    connectionString: connectionUrl.toString(),
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    ssl: { ...(ca ? { ca } : {}), rejectUnauthorized: true },
  };
}

export function createPostgresPool(
  configuration: DatabaseConfiguration = readDatabaseConfiguration()
): Pool {
  const postgresPool = new Pool(createPostgresPoolOptions(configuration));

  postgresPool.on('error', () => {
    console.error('PostgreSQL pool reported an idle connection error.');
  });

  return postgresPool;
}

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = createPostgresPool();
  }
  return pool;
}

export async function checkPostgresConnection(
  client: { query(text: string): Promise<unknown> } = getPostgresPool()
): Promise<DatabaseHealthResult> {
  try {
    await client.query('SELECT 1');
    return { ok: true };
  } catch {
    return { ok: false, message: 'PostgreSQL connectivity check failed.' };
  }
}

export async function verifyPostgresSchema(
  client: { query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> } = getPostgresPool()
): Promise<void> {
  try {
    await client.query('SELECT 1');
    const tableResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [EXPECTED_TABLES]
    );
    const presentTables = new Set(tableResult.rows.map((row) => row.table_name));
    const missingTables = EXPECTED_TABLES.filter((table) => !presentTables.has(table));
    if (missingTables.length) {
      throw new DatabaseConfigurationError('PostgreSQL schema is missing required VoxMitra tables.');
    }

    const tableNames: string[] = [];
    const columnNames: string[] = [];
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      for (const column of columns) {
        tableNames.push(table);
        columnNames.push(column);
      }
    }
    const columnsResult = await client.query(
      `SELECT required.table_name, required.column_name
       FROM unnest($1::text[], $2::text[]) AS required(table_name, column_name)
       LEFT JOIN information_schema.columns AS actual
         ON actual.table_schema = 'public'
        AND actual.table_name = required.table_name
        AND actual.column_name = required.column_name
       WHERE actual.column_name IS NULL`,
      [tableNames, columnNames]
    );
    if (columnsResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL schema is missing required VoxMitra columns.');
    }

    const typeTables: string[] = [];
    const typeColumns: string[] = [];
    const expectedTypes: string[] = [];
    for (const [table, columns] of Object.entries(REQUIRED_COLUMN_TYPES)) {
      for (const [column, dataType] of Object.entries(columns)) {
        typeTables.push(table);
        typeColumns.push(column);
        expectedTypes.push(dataType);
      }
    }
    const typesResult = await client.query(
      `SELECT required.table_name, required.column_name
       FROM unnest($1::text[], $2::text[], $3::text[])
         AS required(table_name, column_name, data_type)
       LEFT JOIN information_schema.columns AS actual
         ON actual.table_schema = 'public'
        AND actual.table_name = required.table_name
        AND actual.column_name = required.column_name
        AND actual.data_type = required.data_type
       WHERE actual.column_name IS NULL`,
      [typeTables, typeColumns, expectedTypes]
    );
    if (typesResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL schema contains incompatible VoxMitra column types.');
    }

    const constraintTables = REQUIRED_CONSTRAINTS.map(({ table }) => table);
    const constraintNames = REQUIRED_CONSTRAINTS.map(({ name }) => name);
    const constraintTypes = REQUIRED_CONSTRAINTS.map(({ type }) => type);
    const constraintsResult = await client.query(
      `SELECT required.table_name, required.constraint_name
       FROM unnest($1::text[], $2::text[], $3::text[])
         AS required(table_name, constraint_name, constraint_type)
       LEFT JOIN pg_namespace AS namespace ON namespace.nspname = 'public'
       LEFT JOIN pg_class AS relation
         ON relation.relnamespace = namespace.oid
        AND relation.relname = required.table_name
       LEFT JOIN pg_constraint AS actual
         ON actual.conrelid = relation.oid
        AND actual.conname = required.constraint_name
        AND actual.contype::text = required.constraint_type
       WHERE actual.oid IS NULL`,
      [constraintTables, constraintNames, constraintTypes]
    );
    if (constraintsResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL schema is missing required VoxMitra key or tenant constraints.');
    }

    const indexesResult = await client.query(
      `SELECT required.index_name
       FROM unnest($1::text[]) AS required(index_name)
       LEFT JOIN pg_indexes AS actual
         ON actual.schemaname = 'public'
        AND actual.indexname = required.index_name
       WHERE actual.indexname IS NULL`,
      [REQUIRED_INDEXES]
    );
    if (indexesResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL schema is missing required VoxMitra indexes.');
    }

    const rolesResult = await client.query(
      `SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])`,
      [SUPABASE_CLIENT_ROLES]
    );
    if (rolesResult.rows.length !== SUPABASE_CLIENT_ROLES.length) {
      throw new DatabaseConfigurationError('Required Supabase client roles are missing; access lockdown cannot be verified.');
    }
    const runtimeRoleResult = await client.query(
      `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
       FROM pg_roles WHERE rolname = current_user`
    );
    const runtimeRole = runtimeRoleResult.rows[0];
    if (
      !runtimeRole ||
      runtimeRole.rolname === 'service_role' ||
      runtimeRole.rolsuper === true ||
      runtimeRole.rolcreatedb === true ||
      runtimeRole.rolcreaterole === true ||
      runtimeRole.rolreplication === true ||
      runtimeRole.rolbypassrls === true
    ) {
      throw new DatabaseConfigurationError('PostgreSQL runtime role must be a dedicated non-privileged server role.');
    }
    const ownershipResult = await client.query(
      `SELECT relation.relname
       FROM pg_class AS relation
       INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = 'public'
         AND relation.relname = ANY($1::text[])
         AND pg_get_userbyid(relation.relowner) = current_user`,
      [EXPECTED_TABLES]
    );
    if (ownershipResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL runtime role must not own VoxMitra tables.');
    }
    const privilegesResult = await client.query(
      `SELECT required.role_name, required.table_name
       FROM unnest($1::text[]) AS required(role_name)
       CROSS JOIN unnest($2::text[]) AS target(table_name)
       WHERE has_table_privilege(required.role_name, format('%I.%I', 'public', target.table_name), 'SELECT')
          OR has_table_privilege(required.role_name, format('%I.%I', 'public', target.table_name), 'INSERT')
          OR has_table_privilege(required.role_name, format('%I.%I', 'public', target.table_name), 'UPDATE')
          OR has_table_privilege(required.role_name, format('%I.%I', 'public', target.table_name), 'DELETE')`,
      [SUPABASE_CLIENT_ROLES, EXPECTED_TABLES]
    );
    if (privilegesResult.rows.length) {
      throw new DatabaseConfigurationError('Supabase client-access lockdown is not applied to all VoxMitra tables.');
    }
    const runtimePrivilegesResult = await client.query(
      `SELECT current_user AS role_name
       WHERE NOT has_schema_privilege(current_user, 'public', 'USAGE')
          OR EXISTS (
            SELECT 1
            FROM unnest($1::text[]) AS target(table_name)
            WHERE NOT has_table_privilege(
                    current_user, format('%I.%I', 'public', target.table_name), 'SELECT'
                  )
               OR NOT has_table_privilege(
                    current_user, format('%I.%I', 'public', target.table_name), 'INSERT'
                  )
               OR NOT has_table_privilege(
                    current_user, format('%I.%I', 'public', target.table_name), 'UPDATE'
                  )
               OR NOT has_table_privilege(
                    current_user, format('%I.%I', 'public', target.table_name), 'DELETE'
                  )
          )
       LIMIT 1`,
      [EXPECTED_TABLES]
    );
    if (runtimePrivilegesResult.rows.length) {
      throw new DatabaseConfigurationError('PostgreSQL runtime role lacks required VoxMitra schema or table privileges.');
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      const diagnostic = classifyConfigurationError(error);
      if (diagnostic) {
        throw new PostgresStartupDiagnosticError(diagnostic.category, diagnostic.message);
      }
      throw new PostgresStartupDiagnosticError(
        'unknown',
        'PostgreSQL connection or schema verification failed.'
      );
    }
    const diagnostic = classifyPostgresError(error);
    throw new PostgresStartupDiagnosticError(
      diagnostic.category,
      'PostgreSQL connection or schema verification failed.',
      diagnostic.code
    );
  }
}

export async function closePostgresPool(): Promise<void> {
  if (!pool) return;

  const activePool = pool;
  pool = undefined;
  try {
    await activePool.end();
  } catch {
    throw new Error('Failed to close the PostgreSQL connection pool safely.');
  }
}
