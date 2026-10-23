import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { test } from 'node:test';
import { importJsonData, prepareJsonImport } from '../scripts/import-json-to-postgres.ts';

const emptySource = (businesses: Record<string, unknown>[] = []) => ({
  businesses,
  users: [],
  agents: [],
  agent_configurations: [],
  call_records: [],
  callbacks: [],
  integrations: [],
  usage_records: [],
});

function memoryPool() {
  const records = new Map<string, Record<string, unknown>>();
  const statements: string[] = [];
  let snapshot = new Map<string, Record<string, unknown>>();
  const client = {
    async query(text: string, values: unknown[] = []) {
      statements.push(text);
      if (text === 'BEGIN') {
        snapshot = new Map([...records].map(([key, value]) => [key, { ...value }]));
        return { rows: [] };
      }
      if (text === 'COMMIT') return { rows: [] };
      if (text === 'ROLLBACK') {
        records.clear();
        for (const [key, value] of snapshot) records.set(key, value);
        return { rows: [] };
      }
      if (text.includes('SELECT count(*)')) {
        const table = /FROM public\.(\w+)/.exec(text)?.[1] ?? '';
        const count = [...records.keys()].filter((key) => key.startsWith(`${table}:`)).length;
        return { rows: [{ count: String(count) }] };
      }
      if (text.startsWith('INSERT INTO public.businesses')) {
        const columns = /\(([^)]+)\)/.exec(text)?.[1].split(', ').map((column) => column.trim()) ?? [];
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
        const key = `businesses:${String(row.id)}`;
        if (records.has(key)) return { rows: [] };
        records.set(key, row);
        return { rows: [{ id: row.id }] };
      }
      if (text.startsWith('SELECT') && text.includes('FROM public.businesses WHERE')) {
        const id = String(values[0]);
        const row = records.get(`businesses:${id}`);
        if (!row) return { rows: [] };
        const columns = text.slice('SELECT '.length, text.indexOf(' FROM')).split(', ').map((column) => column.trim());
        return { rows: [Object.fromEntries(columns.map((column) => [column, row[column]]))] };
      }
      throw new Error('Unexpected importer query.');
    },
    release() {},
  };
  const pool = { connect: async () => client } as unknown as Pool;
  return { pool, statements };
}

test('JSON import excludes demo tenant and unsettled financial activity without changing source', () => {
  const source = {
    businesses: [
      { id: 'business-live', name: 'Live', slug: 'live', contact_email: 'live@example.test', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'business-demo', name: 'Demo', slug: 'demo', contact_email: 'demo@example.test', created_at: '2026-01-01T00:00:00.000Z' },
    ],
    users: [
      { id: 'user-live', business_id: 'business-live' },
      { id: 'u0198000-0000-4000-8000-000000000001', business_id: 'business-demo' },
    ],
    agents: [{ id: 'agent-live', business_id: 'business-live' }],
    agent_configurations: [{ id: 'config-live', agent_id: 'agent-live', business_id: 'business-live' }],
    call_records: [
      { id: 'call-real', business_id: 'business-live', is_demo: false, telephony_call_sid: 'provider-sid' },
      { id: 'call-demo', business_id: 'business-live', is_demo: true, telephony_call_sid: 'mock' },
      { id: 'call-demo-tenant', business_id: 'business-demo', is_demo: false, telephony_call_sid: 'demo-sid' },
    ],
    callbacks: [],
    integrations: [],
    usage_records: [],
    wallets: [{ id: 'wallet-live', business_id: 'business-live', available_balance_minor: 1234, reserved_balance_minor: 50 }],
    wallet_transactions: [{ id: 'transaction-1', business_id: 'business-live' }],
    wallet_reservations: [{ id: 'reservation-1', business_id: 'business-live' }],
    wallet_autotopup_settings: [{ id: 'settings-1', business_id: 'business-live', enabled: true, mandate_status: 'active' }],
    payment_orders: [{ id: 'order-1', business_id: 'business-live' }],
    billing_configs: [],
    wallet_notifications: [{ id: 'notification-1', business_id: 'business-live' }],
    campaigns: [],
    leads: [],
    knowledge_sources: [],
    onboarding: { 'user-live': { businessName: 'Live', step: 1, completed: false } },
  };
  const original = structuredClone(source);
  const prepared = prepareJsonImport(source);

  assert.deepEqual(source, original);
  assert.equal(prepared.rows.get([...prepared.rows.keys()].find((spec) => spec.table === 'call_records')!)?.length, 1);
  assert.deepEqual(prepared.skippedFinancialCounts, {
    wallet_transactions: 1,
    wallet_reservations: 1,
    payment_orders: 1,
    wallet_notifications: 1,
  });
  const walletSpec = [...prepared.rows.keys()].find((spec) => spec.table === 'wallets')!;
  assert.equal(prepared.rows.get(walletSpec)?.[0].available_balance_minor, 0);
  const topUpSpec = [...prepared.rows.keys()].find((spec) => spec.table === 'wallet_autotopup_settings')!;
  assert.equal(prepared.rows.get(topUpSpec)?.[0].enabled, false);
  assert.equal(prepared.rows.get(topUpSpec)?.[0].mandate_status, 'none');
  const onboardingSpec = [...prepared.rows.keys()].find((spec) => spec.table === 'onboarding')!;
  assert.equal(prepared.rows.get(onboardingSpec)?.[0].user_id, 'user-live');
  assert.equal(prepared.rows.get(onboardingSpec)?.[0].business_id, 'business-live');
});

test('JSON import rejects malformed core entities and duplicate identifiers', () => {
  assert.throws(() => prepareJsonImport({ businesses: [] }), /must be an array/);
  const duplicateData = {
    businesses: [],
    users: [],
    agents: [{ id: 'same', business_id: 'business-1' }, { id: 'same', business_id: 'business-1' }],
    agent_configurations: [],
    call_records: [],
    callbacks: [],
    integrations: [],
    usage_records: [],
  };
  assert.throws(() => prepareJsonImport(duplicateData), /duplicate identifiers/);
});

test('JSON import dry run rolls back and repeated applied imports are idempotent', async () => {
  const database = memoryPool();
  const business = {
    id: 'business-live',
    name: 'Live',
    slug: 'live',
    contact_email: 'live@example.test',
    phone_number: '',
    plan_tier: 'starter',
    timezone: 'UTC',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const dryRun = await importJsonData(database.pool, emptySource([business]), false);
  assert.equal(dryRun.mode, 'dry-run');
  assert.equal(dryRun.before.businesses, 0);
  assert.equal(dryRun.after.businesses, 1);
  assert.ok(database.statements.includes('ROLLBACK'));
  assert.ok(!database.statements.includes('COMMIT'));

  const first = await importJsonData(database.pool, emptySource([business]), true);
  assert.equal(first.inserted.businesses, 1);
  assert.equal(first.after.businesses, 1);

  const second = await importJsonData(database.pool, emptySource([business]), true);
  assert.equal(second.inserted.businesses, 0);
  assert.equal(second.alreadyPresent.businesses, 1);
  assert.equal(second.after.businesses, 1);
});

test('JSON import rolls back instead of overwriting a conflicting existing identifier', async () => {
  const database = memoryPool();
  const original = {
    id: 'business-live',
    name: 'Original',
    slug: 'original',
    contact_email: 'live@example.test',
  };
  const conflict = { ...original, name: 'Changed' };
  await importJsonData(database.pool, emptySource([original]), true);
  await assert.rejects(
    importJsonData(database.pool, emptySource([conflict]), true),
    /conflicts with the JSON source/
  );
  assert.ok(database.statements.at(-1) === 'ROLLBACK');
});
