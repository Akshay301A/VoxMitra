import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { test } from 'node:test';
import {
  PostgresRepository,
  PostgresRepositoryError,
} from '../server/db/postgres-repository.ts';

type QueryResultStub = { rows: Record<string, unknown>[]; rowCount: number };
type QueryStub = (text: string, values?: unknown[]) => Promise<QueryResultStub>;

function fakePool(query: QueryStub, connect?: () => Promise<unknown>): Pool {
  return {
    query,
    connect: connect ?? (() => Promise.reject(new Error('Unexpected transaction'))),
  } as unknown as Pool;
}

const timestamp = '2026-10-13T08:00:00.000Z';

test('agent reads map PostgreSQL rows and constrain every lookup to its business', async () => {
  const calls: { text: string; values: unknown[] }[] = [];
  const repository = new PostgresRepository(
    fakePool(async (text, values = []) => {
      calls.push({ text, values });
      return {
        rows: [{
          id: 'agent-1',
          business_id: 'business-a',
          name: 'Reception',
          agent_type: 'inbound_receptionist',
          description: '',
          status: 'draft',
          total_calls: 3,
          created_at: new Date(timestamp),
          updated_at: new Date(timestamp),
        }],
        rowCount: 1,
      };
    })
  );

  const agent = await repository.getAgentById('agent-1', 'business-a');

  assert.equal(agent?.id, 'agent-1');
  assert.equal(agent?.business_id, 'business-a');
  assert.equal(agent?.created_at, timestamp);
  assert.match(calls[0].text, /WHERE id = \$1 AND business_id = \$2/);
  assert.deepEqual(calls[0].values, ['agent-1', 'business-a']);
});

test('configuration upsert maps JSON fields and cannot change agent ownership', async () => {
  let sql = '';
  let parameters: unknown[] = [];
  const repository = new PostgresRepository(
    fakePool(async (text, values = []) => {
      sql = text;
      parameters = values;
      return {
        rows: [{
          id: 'config-1',
          agent_id: 'agent-1',
          business_id: 'business-a',
          greeting: 'Hello',
          instructions: 'Original instructions',
          objectives: 'Qualify the lead',
          supported_languages: ['en-US', 'hi-IN'],
          voice_id: 'voice-1',
          voice_name: 'Voice',
          voice_settings: { stability: 0.4, similarity_boost: 0.8 },
          max_duration_seconds: 300,
          transfer_enabled: false,
          transfer_phone: '',
          transfer_conditions: '',
          callback_instructions: '',
          contact_fields_to_collect: [{ name: 'email' }],
          business_faqs: [{ question: 'Hours?', answer: '9 to 5' }],
          agent_plan: { objective: 'qualify' },
          webhook_url: '',
          created_at: timestamp,
          updated_at: timestamp,
        }],
        rowCount: 1,
      };
    })
  );

  const config = await repository.saveAgentConfig('agent-1', 'business-a', {
    greeting: 'Hello',
    business_faqs: [{ question: 'Hours?', answer: '9 to 5' }],
  });

  assert.equal(config.greeting, 'Hello');
  assert.deepEqual(config.business_faqs, [{ question: 'Hours?', answer: '9 to 5' }]);
  assert.deepEqual(config.agent_plan, { objective: 'qualify' });
  assert.match(sql, /FROM public\.agents AS a\s+WHERE a\.id = \$2 AND a\.business_id = \$3/);
  assert.match(sql, /greeting = EXCLUDED\.greeting/);
  assert.match(sql, /business_faqs = EXCLUDED\.business_faqs/);
  assert.doesNotMatch(sql, /instructions = EXCLUDED\.instructions/);
  assert.doesNotMatch(sql.split('WHERE current_config.business_id')[0], /business_id = EXCLUDED\.business_id/);
  assert.deepEqual(parameters.slice(1, 3), ['agent-1', 'business-a']);
  assert.equal(parameters[16], JSON.stringify([{ question: 'Hours?', answer: '9 to 5' }]));
});

test('agent and configuration creation commits together with JSONB payloads', async () => {
  const calls: { text: string; values: unknown[] }[] = [];
  const client = {
    async query(text: string, values: unknown[] = []) {
      calls.push({ text, values });
      if (text.includes('INSERT INTO public.agents')) {
        return {
          rows: [{
            id: values[0],
            business_id: values[1],
            name: values[2],
            agent_type: values[3],
            description: values[4],
            status: values[5],
            total_calls: values[6],
            created_at: values[7],
            updated_at: values[8],
          }],
          rowCount: 1,
        };
      }
      if (text.includes('INSERT INTO public.agent_configurations')) {
        return {
          rows: [{
            id: values[0],
            agent_id: values[1],
            business_id: values[2],
            greeting: values[3],
            instructions: values[4],
            objectives: values[5],
            supported_languages: JSON.parse(String(values[6])),
            voice_id: values[7],
            voice_name: values[8],
            voice_settings: JSON.parse(String(values[9])),
            max_duration_seconds: values[10],
            transfer_enabled: values[11],
            transfer_phone: values[12],
            transfer_conditions: values[13],
            callback_instructions: values[14],
            contact_fields_to_collect: JSON.parse(String(values[15])),
            business_faqs: JSON.parse(String(values[16])),
            agent_plan: values[17] == null ? null : JSON.parse(String(values[17])),
            webhook_url: values[18],
            created_at: values[19],
            updated_at: values[20],
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      calls.push({ text: 'RELEASE', values: [] });
    },
  };
  const repository = new PostgresRepository(
    fakePool(async () => ({ rows: [], rowCount: 0 }), async () => client)
  );

  const result = await repository.createAgentWithConfig(
    'business-a',
    {
      name: 'Reception',
      agent_type: 'inbound_receptionist',
      description: 'Inbound calls',
    },
    {
      supported_languages: ['en-US', 'hi-IN'],
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    }
  );

  assert.equal(result.agent.business_id, 'business-a');
  assert.equal(result.config.agent_id, result.agent.id);
  assert.deepEqual(result.config.supported_languages, ['en-US', 'hi-IN']);
  assert.equal(result.config.agent_plan, undefined);
  assert.equal(calls[0].text, 'BEGIN');
  assert.ok(calls[1].text.includes('INSERT INTO public.agents'));
  assert.ok(calls[2].text.includes('INSERT INTO public.agent_configurations'));
  assert.equal(calls[3].text, 'COMMIT');
  assert.equal(calls[1].values[1], 'business-a');
  assert.equal(calls[2].values[6], JSON.stringify(['en-US', 'hi-IN']));
  assert.equal(calls[2].values[17], null);
});

test('user and business creation is transactional, normalized, and hashes the password', async () => {
  const statements: string[] = [];
  const client = {
    async query(text: string, values: unknown[] = []) {
      statements.push(text);
      if (text.includes('INSERT INTO public.businesses')) {
        return {
          rows: [{
            id: values[0],
            name: values[1],
            slug: values[2],
            contact_email: values[3],
            phone_number: values[4],
            plan_tier: values[5],
            timezone: values[6],
            created_at: values[7],
            updated_at: values[8],
          }],
          rowCount: 1,
        };
      }
      if (text.includes('INSERT INTO public.users')) {
        return {
          rows: [{
            id: values[0],
            business_id: values[1],
            email: values[2],
            password_hash: values[3],
            full_name: values[4],
            role: values[5],
            created_at: values[6],
            updated_at: values[7],
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      statements.push('RELEASE');
    },
  };
  const repository = new PostgresRepository(
    fakePool(
      async () => ({ rows: [], rowCount: 0 }),
      async () => client
    )
  );

  const result = await repository.createUser({
    email: ' New.User@example.test ',
    password: 'safe-test-password',
    fullName: 'New User',
    businessName: 'Test Workspace',
  });

  assert.equal(result.user.email, 'new.user@example.test');
  assert.equal(result.business.contact_email, 'new.user@example.test');
  assert.equal(await bcrypt.compare('safe-test-password', result.user.password_hash), true);
  assert.equal(statements[0], 'BEGIN');
  assert.ok(statements[1].includes('INSERT INTO public.businesses'));
  assert.ok(statements[2].includes('INSERT INTO public.users'));
  assert.ok(statements[3].includes('INSERT INTO public.onboarding'));
  assert.equal(statements[4], 'COMMIT');
  assert.equal(statements.at(-1), 'RELEASE');
  assert.ok(!statements.join(' ').includes('safe-test-password'));
});

test('database failures are sanitized and transaction failures roll back', async () => {
  const statements: string[] = [];
  const client = {
    async query(text: string) {
      statements.push(text);
      if (text.startsWith('DELETE FROM public.agents')) {
        const error = new Error('connection password=private') as Error & { code: string };
        error.code = '23503';
        throw error;
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      statements.push('RELEASE');
    },
  };
  const repository = new PostgresRepository(
    fakePool(
      async () => {
        const error = new Error('db connection string contains credentials');
        throw error;
      },
      async () => client
    )
  );

  await assert.rejects(
    repository.getAgents('business-a'),
    (error: unknown) =>
      error instanceof PostgresRepositoryError &&
      error.message === 'Database operation failed.' &&
      !error.message.includes('credentials')
  );
  await assert.rejects(
    repository.deleteAgent('agent-1', 'business-a'),
    (error: unknown) =>
      error instanceof PostgresRepositoryError &&
      error.message.includes('related records') &&
      !error.message.includes('private')
  );
  assert.ok(statements.includes('ROLLBACK'));
  assert.equal(statements.at(-1), 'RELEASE');
});

test('wallet reservation locks billing and wallet rows before reserving funds transactionally', async () => {
  const statements: string[] = [];
  const client = {
    async query(text: string) {
      statements.push(text);
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (text.includes('SELECT id, plan_tier')) {
        return { rows: [{ id: 'business-a', plan_tier: 'growth' }], rowCount: 1 };
      }
      if (text.includes('FROM public.billing_configs WHERE business_id = $1 FOR UPDATE')) {
        return {
          rows: [{
            id: 'billing-a',
            business_id: 'business-a',
            billing_mode: 'pure_prepaid',
            usage_rate_per_minute_minor: 550,
            included_minutes: 0,
            included_minutes_used: 0,
            minimum_recharge_minor: 0,
            low_balance_alert_threshold_minor: 0,
            call_duration_rounding_seconds: 60,
            charge_unanswered_calls: false,
            gst_tax_rate_percent: 18,
            last_updated_by: null,
            updated_at: timestamp,
          }],
          rowCount: 1,
        };
      }
      if (text.includes('FROM public.wallets WHERE business_id = $1 FOR UPDATE')) {
        return {
          rows: [{
            id: 'wallet-a',
            business_id: 'business-a',
            currency: 'INR',
            available_balance_minor: '10000',
            reserved_balance_minor: '0',
            status: 'active',
            created_at: timestamp,
            updated_at: timestamp,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      statements.push('RELEASE');
    },
  };
  const repository = new PostgresRepository(
    fakePool(async () => ({ rows: [], rowCount: 0 }), async () => client)
  );

  const result = await repository.reserveCallUsage('business-a', 'call-a', 2);

  assert.equal(result.allowed, true);
  assert.equal(result.reservedAmountMinor, 1100);
  assert.ok(statements[0] === 'BEGIN');
  assert.ok(statements.some((text) => text.includes('billing_configs WHERE business_id = $1 FOR UPDATE')));
  assert.ok(statements.some((text) => text.includes('wallets WHERE business_id = $1 FOR UPDATE')));
  assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.at(-1), 'RELEASE');
});

test('call lifecycle updates cannot overwrite a terminal PostgreSQL call status', async () => {
  let sql = '';
  const repository = new PostgresRepository(
    fakePool(async (text) => {
      sql = text;
      return {
        rows: [{
          id: 'call-record-1',
          business_id: 'business-a',
          agent_id: 'agent-1',
          agent_name: 'Receptionist',
          direction: 'inbound',
          caller_number: '14155550100',
          recipient_number: '18005550100',
          duration_seconds: 45,
          status: 'completed',
          transcript: [{ speaker: 'caller', text: 'Hello', timestamp: 1 }],
          summary: 'Inbound AI call ended.',
          extracted_data: {},
          sentiment: 'neutral',
          cost_usd: '0',
          telephony_call_sid: 'call-sid-1',
          recording_url: null,
          is_demo: false,
          created_at: new Date(timestamp),
        }],
        rowCount: 1,
      };
    })
  );

  const result = await repository.updateCallRecordByTelephonySid('call-sid-1', {
    status: 'in_progress',
    transcript: [{ speaker: 'caller', text: 'Hello', timestamp: 1 }],
  });

  assert.equal(result?.status, 'completed');
  assert.match(sql, /WHEN status IN \('completed', 'failed', 'busy', 'no_answer', 'transferred'\) THEN status/);
});

test('call record retries return the existing PostgreSQL record without incrementing agent calls', async () => {
  const statements: string[] = [];
  const existing = {
    id: 'record-existing',
    business_id: 'business-a',
    agent_id: 'agent-1',
    agent_name: 'Receptionist',
    direction: 'inbound',
    caller_number: '14155550100',
    recipient_number: '18005550100',
    duration_seconds: 12,
    status: 'in_progress',
    transcript: [],
    summary: '',
    extracted_data: {},
    sentiment: 'neutral',
    cost_usd: 0,
    telephony_call_sid: 'call-sid-duplicate',
    recording_url: null,
    is_demo: false,
    created_at: new Date(timestamp),
  };
  const client = {
    async query(text: string) {
      statements.push(text);
      if (text.includes('INSERT INTO public.call_records')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('FROM public.call_records WHERE telephony_call_sid = $1')) {
        return { rows: [existing], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      statements.push('RELEASE');
    },
  };
  const repository = new PostgresRepository(
    fakePool(async () => ({ rows: [], rowCount: 0 }), async () => client)
  );
  const result = await repository.createCallRecordIfNew({
    business_id: 'business-a',
    agent_id: 'agent-1',
    agent_name: 'Receptionist',
    direction: 'inbound',
    caller_number: '14155550100',
    recipient_number: '18005550100',
    duration_seconds: 0,
    status: 'in_progress',
    transcript: [],
    summary: '',
    extracted_data: {},
    sentiment: 'neutral',
    cost_usd: 0,
    telephony_call_sid: 'call-sid-duplicate',
    is_demo: false,
  });

  assert.equal(result.created, false);
  assert.equal(result.call.id, 'record-existing');
  assert.equal(statements[0], 'BEGIN');
  assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.some((text) => text.includes('UPDATE public.agents SET total_calls')), false);
});
