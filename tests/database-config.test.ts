import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  DatabaseConfigurationError,
  readDatabaseConfiguration,
} from '../server/db/backend.ts';
import {
  checkPostgresConnection,
  createPostgresPoolOptions,
  PostgresStartupDiagnosticError,
  verifyPostgresSchema,
} from '../server/db/postgres-pool.ts';

test('JSON is the default backend and ignores DATABASE_URL', () => {
  assert.deepEqual(
    readDatabaseConfiguration({
      DATABASE_URL: 'postgresql://localhost:5432/voxmitra',
    }),
    { backend: 'json' }
  );
});

test('PostgreSQL selection requires a valid server-side connection URL', () => {
  assert.throws(
    () => readDatabaseConfiguration({ VOXMITRA_DATABASE: 'postgres' }),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('DATABASE_URL is required')
  );
  assert.throws(
    () =>
      readDatabaseConfiguration({
        VOXMITRA_DATABASE: 'postgres',
        DATABASE_URL: 'not-a-database-url',
      }),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('valid PostgreSQL connection URL') &&
      !error.message.includes('not-a-database-url')
  );
});

test('PostgreSQL mode is selected only when explicitly configured', () => {
  assert.deepEqual(
    readDatabaseConfiguration({
      VOXMITRA_DATABASE: 'postgres',
      DATABASE_URL: 'postgresql://localhost:5432/voxmitra',
    }),
    { backend: 'postgres', connectionString: 'postgresql://localhost:5432/voxmitra' }
  );
});

test('PostgreSQL pool verifies TLS and strips connection-string SSL overrides', () => {
  const options = createPostgresPoolOptions({
    backend: 'postgres',
    connectionString:
      'postgresql://localhost:5432/voxmitra?sslmode=no-verify&ssl=false&sslrootcert=%2Fignored.crt&application_name=voxmitra',
  }, {});
  const connectionUrl = new URL(options.connectionString!);

  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
  assert.equal(connectionUrl.searchParams.has('sslmode'), false);
  assert.equal(connectionUrl.searchParams.has('ssl'), false);
  assert.equal(connectionUrl.searchParams.has('sslrootcert'), false);
  assert.equal(connectionUrl.searchParams.get('application_name'), 'voxmitra');
});

test('PostgreSQL pool trusts a configured CA certificate while verifying the server', () => {
  const directory = mkdtempSync(join(tmpdir(), 'voxmitra-postgres-ca-'));
  const certificatePath = join(directory, 'supabase-ca.crt');
  const certificate = '-----BEGIN CERTIFICATE-----\nTEST CA\n-----END CERTIFICATE-----\n';

  try {
    writeFileSync(certificatePath, certificate);
    const options = createPostgresPoolOptions(
      {
        backend: 'postgres',
        connectionString: 'postgresql://localhost:5432/voxmitra',
      },
      { DATABASE_CA_CERT_PATH: certificatePath }
    );

    assert.deepEqual(options.ssl, {
      ca: readFileSync(certificatePath, 'utf8'),
      rejectUnauthorized: true,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('PostgreSQL health check returns a safe success or failure result', async () => {
  assert.deepEqual(
    await checkPostgresConnection({
      async query(text) {
        assert.equal(text, 'SELECT 1');
        return {};
      },
    }),
    { ok: true }
  );

  assert.deepEqual(
    await checkPostgresConnection({
      async query() {
        throw new Error('connection failed with sensitive connection information');
      },
    }),
    { ok: false, message: 'PostgreSQL connectivity check failed.' }
  );
});

test('PostgreSQL schema check verifies all required tables and columns safely', async () => {
  let queryCount = 0;
  const checkedColumns: unknown[][] = [];
  const checkedConstraints: unknown[][] = [];
  let checkedIndexes: unknown[] = [];
  await verifyPostgresSchema({
    async query(text, values = []) {
      queryCount += 1;
      if (text === 'SELECT 1') return { rows: [] };
      if (text.includes('information_schema.tables')) {
        return {
          rows: [
            'businesses', 'users', 'agents', 'agent_configurations', 'call_records',
            'callbacks', 'integrations', 'usage_records', 'wallets', 'wallet_transactions',
            'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders',
            'billing_configs', 'wallet_notifications', 'campaigns', 'leads',
            'knowledge_sources', 'onboarding',
          ].map((table_name) => ({ table_name })),
        };
      }
      if (text.includes('information_schema.columns')) checkedColumns.push(values);
      if (text.includes('pg_constraint')) checkedConstraints.push(values);
      if (text.includes('pg_indexes')) checkedIndexes = values;
      if (text.includes('FROM pg_roles')) {
        if (text.includes('current_user')) {
          return {
            rows: [{
              rolname: 'voxmitra_app',
              rolsuper: false,
              rolcreatedb: false,
              rolcreaterole: false,
              rolreplication: false,
              rolbypassrls: false,
            }],
          };
        }
        return { rows: ['anon', 'authenticated', 'service_role'].map((rolname) => ({ rolname })) };
      }
      return { rows: [] };
    },
  });
  assert.equal(queryCount, 11);
  const requiredTables = checkedColumns[0][0] as string[];
  const requiredNames = checkedColumns[0][1] as string[];
  assert.ok(requiredTables.includes('businesses'));
  assert.ok(requiredNames.includes('updated_at'));
  assert.ok(requiredTables.includes('onboarding'));
  assert.ok(requiredNames.includes('preferred_voice'));
  assert.ok((checkedConstraints[0][1] as string[]).includes('campaigns_agent_id_business_id_fkey'));
  assert.ok((checkedIndexes[0] as string[]).includes('users_email_normalized_uq'));

  await assert.rejects(
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) return { rows: [] };
        throw new Error('sensitive connection information');
      },
    }),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      !error.message.includes('sensitive') &&
      error.message.includes('schema')
  );
});

test('PostgreSQL startup diagnostics classify known connection errors without exposing messages', async () => {
  const cases = [
    { code: 'SELF_SIGNED_CERT_IN_CHAIN', category: 'tls' },
    { code: '28P01', category: 'authentication' },
    { code: 'ECONNREFUSED', category: 'network' },
    { code: '3D000', category: 'database-not-found' },
    { code: '42501', category: 'permission' },
  ] as const;

  for (const { code, category } of cases) {
    await assert.rejects(
      verifyPostgresSchema({
        async query() {
          throw Object.assign(
            new Error('sensitive message with host, username, password, and connection URL'),
            { code }
          );
        },
      }),
      (error: unknown) =>
        error instanceof PostgresStartupDiagnosticError &&
        error.category === category &&
        error.code === code &&
        !error.message.includes('sensitive') &&
        !error.message.includes('password') &&
        !error.message.includes('connection URL')
    );
  }
});

test('PostgreSQL startup diagnostics identify schema validation failures safely', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) return { rows: [] };
        throw new Error('unexpected query');
      },
    }),
    (error: unknown) =>
      error instanceof PostgresStartupDiagnosticError &&
      error.category === 'schema' &&
      error.message === 'PostgreSQL schema is missing required VoxMitra tables.'
  );
});

test('PostgreSQL startup diagnostics use the generic fallback for unknown errors', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query() {
        throw new Error('sensitive connection string and API key');
      },
    }),
    (error: unknown) =>
      error instanceof PostgresStartupDiagnosticError &&
      error.category === 'unknown' &&
      error.code === undefined &&
      error.message === 'PostgreSQL connection or schema verification failed.' &&
      !error.message.includes('sensitive') &&
      !error.message.includes('API key')
  );
});

test('PostgreSQL startup diagnostics reject arbitrary error codes', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query() {
        throw Object.assign(new Error('private data in message'), {
          code: 'private-data-in-code',
        });
      },
    }),
    (error: unknown) =>
      error instanceof PostgresStartupDiagnosticError &&
      error.category === 'unknown' &&
      error.code === undefined &&
      !error.message.includes('private')
  );
});

test('PostgreSQL schema check rejects incompatible identifier and JSONB column types', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) {
          return {
            rows: [
              'businesses', 'users', 'agents', 'agent_configurations', 'call_records',
              'callbacks', 'integrations', 'usage_records', 'wallets', 'wallet_transactions',
              'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders',
              'billing_configs', 'wallet_notifications', 'campaigns', 'leads',
              'knowledge_sources', 'onboarding',
            ].map((table_name) => ({ table_name })),
          };
        }
        if (text.includes('information_schema.columns')) {
          return text.includes('unnest($1::text[], $2::text[], $3::text[])')
            ? { rows: [{ table_name: 'users', column_name: 'id' }] }
            : { rows: [] };
        }
        return { rows: [] };
      },
    }),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('incompatible') &&
      !error.message.includes('users')
  );
});

test('PostgreSQL schema check rejects missing tenant constraints and migration indexes', async () => {
  const tables = [
    'businesses', 'users', 'agents', 'agent_configurations', 'call_records',
    'callbacks', 'integrations', 'usage_records', 'wallets', 'wallet_transactions',
    'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders',
    'billing_configs', 'wallet_notifications', 'campaigns', 'leads',
    'knowledge_sources', 'onboarding',
  ].map((table_name) => ({ table_name }));
  const verifyWithMissingObject = (missing: 'constraint' | 'index') =>
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) return { rows: tables };
        if (text.includes('information_schema.columns')) return { rows: [] };
        if (text.includes('pg_constraint')) {
          return missing === 'constraint'
            ? { rows: [{ table_name: 'campaigns', constraint_name: 'campaigns_agent_id_business_id_fkey' }] }
            : { rows: [] };
        }
        if (text.includes('pg_indexes')) {
          return missing === 'index'
            ? { rows: [{ index_name: 'users_email_normalized_uq' }] }
            : { rows: [] };
        }
        return { rows: [] };
      },
    });

  await assert.rejects(
    verifyWithMissingObject('constraint'),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('key or tenant constraints')
  );
  await assert.rejects(
    verifyWithMissingObject('index'),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('required VoxMitra indexes')
  );
});

test('PostgreSQL startup refuses to run while Supabase client roles can access tenant tables', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) {
          return {
            rows: [
              'businesses', 'users', 'agents', 'agent_configurations', 'call_records',
              'callbacks', 'integrations', 'usage_records', 'wallets', 'wallet_transactions',
              'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders',
              'billing_configs', 'wallet_notifications', 'campaigns', 'leads',
              'knowledge_sources', 'onboarding',
            ].map((table_name) => ({ table_name })),
          };
        }
        if (text.includes('information_schema.columns')) return { rows: [] };
        if (text.includes('FROM pg_roles')) {
          if (text.includes('current_user')) {
            return {
              rows: [{
                rolname: 'voxmitra_app',
                rolsuper: false,
                rolcreatedb: false,
                rolcreaterole: false,
                rolreplication: false,
                rolbypassrls: false,
              }],
            };
          }
          return { rows: ['anon', 'authenticated', 'service_role'].map((rolname) => ({ rolname })) };
        }
        if (text.includes('has_table_privilege')) {
          return { rows: [{ role_name: 'anon', table_name: 'users' }] };
        }
        return { rows: [] };
      },
    }),
    (error: unknown) =>
      error instanceof DatabaseConfigurationError &&
      error.message.includes('access lockdown')
  );
});

test('PostgreSQL startup refuses an application role without VoxMitra table grants', async () => {
  await assert.rejects(
    verifyPostgresSchema({
      async query(text) {
        if (text === 'SELECT 1') return { rows: [] };
        if (text.includes('information_schema.tables')) {
          return {
            rows: [
              'businesses', 'users', 'agents', 'agent_configurations', 'call_records',
              'callbacks', 'integrations', 'usage_records', 'wallets', 'wallet_transactions',
              'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders',
              'billing_configs', 'wallet_notifications', 'campaigns', 'leads',
              'knowledge_sources', 'onboarding',
            ].map((table_name) => ({ table_name })),
          };
        }
        if (text.includes('information_schema.columns')) return { rows: [] };
        if (text.includes('FROM pg_roles')) {
          if (text.includes('current_user')) {
            return {
              rows: [{
                rolname: 'voxmitra_app',
                rolsuper: false,
                rolcreatedb: false,
                rolcreaterole: false,
                rolreplication: false,
                rolbypassrls: false,
              }],
            };
          }
          return { rows: ['anon', 'authenticated', 'service_role'].map((rolname) => ({ rolname })) };
        }
        if (text.includes('WHERE NOT has_schema_privilege')) {
          return { rows: [{ role_name: 'voxmitra_app' }] };
        }
        return { rows: [] };
      },
    }),
    (error: unknown) =>
      error instanceof PostgresStartupDiagnosticError &&
      error.category === 'permission' &&
      error.message.includes('runtime role lacks')
  );
});
