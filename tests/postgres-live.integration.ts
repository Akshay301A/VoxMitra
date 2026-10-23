import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Live database verification is forbidden in production.');
}
if (process.env.VOXMITRA_TEST_DATABASE_CONFIRM !== 'YES') {
  throw new Error('Set VOXMITRA_TEST_DATABASE_CONFIRM=YES only after confirming DATABASE_URL targets a disposable TEST project.');
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');

const { readDatabaseConfiguration } = await import('../server/db/backend.ts');
const configuration = readDatabaseConfiguration();
if (configuration.backend !== 'postgres') {
  throw new Error('Live database verification requires VOXMITRA_DATABASE=postgres.');
}

const configuredUrl = new URL(configuration.connectionString);
if (
  !configuredUrl.hostname.endsWith('.supabase.co') &&
  !configuredUrl.hostname.endsWith('.pooler.supabase.com')
) {
  throw new Error('Live database verification only accepts a Supabase PostgreSQL host.');
}

const { closePostgresPool, getPostgresPool, verifyPostgresSchema } =
  await import('../server/db/postgres-pool.ts');
let phase = 'startup schema and role checks';
let httpServer: Server | undefined;
let businessIds: string[] = [];
let cleanupComplete = false;

function reportFailure(error: unknown): void {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  const category =
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED'
      ? 'database TLS certificate verification'
      : code === 'ENOTFOUND' || code === 'EAI_AGAIN'
      ? 'database-host DNS resolution'
      : code === 'ECONNREFUSED' || code === 'ETIMEDOUT'
        ? 'database network connectivity'
        : code.startsWith('28')
          ? 'database authentication/authorization'
          : code.startsWith('3D')
            ? 'database selection'
            : error instanceof assert.AssertionError
              ? 'live integration assertion'
              : 'database/schema operation';
  console.error(JSON.stringify({
    result: 'FAIL',
    phase,
    category,
    sqlStateOrNetworkCode: code || undefined,
    errorDetailsRedacted: true,
  }));
}

async function closeHttpServer(): Promise<void> {
  if (!httpServer?.listening) return;
  await new Promise<void>((resolve, reject) => {
    httpServer!.close((error) => (error ? reject(error) : resolve()));
  });
}

async function run(): Promise<void> {
  phase = 'database connection and authentication';
  await getPostgresPool().query('SELECT 1');
  console.log('PASS: configured database accepted a read-only PostgreSQL connection.');

  phase = 'startup schema and role checks';
  await verifyPostgresSchema();
  console.log('PASS: migration schema and runtime-role checks passed.');

  phase = 'isolated tenant API CRUD';
  const { app } = await import('../server.ts');
  const { db } = await import('../server/db/database.ts');
  const { PostgresRepository } = await import('../server/db/postgres-repository.ts');

  httpServer = createServer(app);
  await new Promise<void>((resolve, reject) => {
    httpServer!.once('error', reject);
    httpServer!.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(
    route: string,
    options: { method?: string; token?: string; body?: unknown } = {}
  ): Promise<{ status: number; body: any }> {
    const response = await fetch(`${baseUrl}${route}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    let body: any;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    return { status: response.status, body };
  }

  const anonymous = await request('/api/auth/me');
  assert.equal(anonymous.status, 401);
  const malformed = await request('/api/auth/me', { token: 'not-a-jwt' });
  assert.equal(malformed.status, 401);

  const tag = randomUUID();
  const password = randomBytes(32).toString('base64url');
  async function register(label: string) {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: `voxmitra-live-${tag}-${label}@example.invalid`,
        password,
        fullName: `VoxMitra Integration ${label}`,
        businessName: `VoxMitra Integration ${tag} ${label}`,
      },
    });
    assert.equal(result.status, 200);
    assert.ok(result.body.token);
    assert.ok(result.body.user?.id);
    assert.ok(result.body.business?.id);
    businessIds.push(result.body.business.id);
    return result.body as {
      token: string;
      user: { id: string };
      business: { id: string };
    };
  }

  const tenantA = await register('A');
  const tenantB = await register('B');
  assert.notEqual(tenantA.business.id, tenantB.business.id);
  assert.equal((await request('/api/auth/me', { token: tenantA.token })).status, 200);
  const expiredToken = await import('jsonwebtoken').then(({ default: jwt }) =>
    jwt.sign({ userId: tenantA.user.id }, process.env.JWT_SECRET!, { expiresIn: -1 })
  );
  assert.equal((await request('/api/auth/me', { token: expiredToken })).status, 401);

  async function createAgent(token: string, businessId: string, label: string) {
    const result = await request('/api/agents', {
      method: 'POST',
      token,
      body: {
        name: `Integration Agent ${label}`,
        agent_type: 'inbound_receptionist',
        status: 'draft',
        business_id: tenantB.business.id,
        config: {
          greeting: `Hello ${label}`,
          supported_languages: ['en-US', 'hi-IN'],
          voice_settings: { stability: 0.42, similarity_boost: 0.81 },
          business_faqs: [{ question: 'Test?', answer: 'Yes.' }],
          agent_plan: { objective: `isolated-${label}`, steps: ['greet', 'finish'] },
        },
      },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.agent.business_id, businessId);
    assert.equal(result.body.config.business_id, businessId);
    return result.body as {
      agent: { id: string; name: string; business_id: string };
      config: { business_id: string; agent_plan: { objective: string; steps: string[] } };
    };
  }

  const agentA = await createAgent(tenantA.token, tenantA.business.id, 'A');
  const agentB = await createAgent(tenantB.token, tenantB.business.id, 'B');

  const agentAUpdate = await request(`/api/agents/${agentA.agent.id}`, {
    method: 'PUT',
    token: tenantA.token,
    body: { name: 'Updated Integration Agent A', business_id: tenantB.business.id },
  });
  assert.equal(agentAUpdate.status, 200);
  assert.equal(agentAUpdate.body.business_id, tenantA.business.id);

  const configUpdate = await request(`/api/agents/${agentA.agent.id}/config`, {
    method: 'PUT',
    token: tenantA.token,
    body: {
      greeting: 'Updated integration greeting',
      business_id: tenantB.business.id,
      agent_plan: { objective: 'updated-isolated-A', steps: ['answer'] },
    },
  });
  assert.equal(configUpdate.status, 200);
  assert.deepEqual(configUpdate.body.agent_plan, {
    objective: 'updated-isolated-A',
    steps: ['answer'],
  });
  assert.deepEqual(
    (await db.getAgentConfig(agentA.agent.id, tenantA.business.id))?.supported_languages,
    ['en-US', 'hi-IN']
  );
  assert.deepEqual(
    (await db.getAgentConfig(agentA.agent.id, tenantA.business.id))?.voice_settings,
    { stability: 0.42, similarity_boost: 0.81 }
  );
  assert.deepEqual(
    (await db.getAgentConfig(agentA.agent.id, tenantA.business.id))?.agent_plan,
    { objective: 'updated-isolated-A', steps: ['answer'] }
  );

  assert.equal((await request(`/api/agents/${agentB.agent.id}`, { token: tenantA.token })).status, 404);
  assert.equal((await request(`/api/agents/${agentB.agent.id}/config`, { token: tenantA.token })).status, 404);
  assert.equal((await request(`/api/agents/${agentB.agent.id}`, { token: tenantA.token, method: 'DELETE' })).status, 404);
  assert.equal((await db.getAgentById(agentB.agent.id, tenantB.business.id))?.name, agentB.agent.name);

  async function createCampaign(token: string, agentId: string, label: string) {
    const result = await request('/api/campaigns', {
      method: 'POST',
      token,
      body: {
        name: `Draft integration campaign ${label}`,
        agent_id: agentId,
        status: 'draft',
        total_contacts: 0,
        completed_contacts: 0,
        successful_calls: 0,
      },
    });
    assert.equal(result.status, 201);
    return result.body as { id: string; business_id: string; name: string };
  }
  const campaignB = await createCampaign(tenantB.token, agentB.agent.id, 'B');
  assert.equal(
    (await request(`/api/campaigns/${campaignB.id}`, {
      method: 'PATCH',
      token: tenantA.token,
      body: { name: 'Unauthorized cross-tenant update' },
    })).status,
    404
  );
  assert.equal((await db.getCampaigns(tenantB.business.id)).find(({ id }) => id === campaignB.id)?.name, campaignB.name);

  async function createCallback(token: string, agentId: string, label: string) {
    const result = await request('/api/callbacks', {
      method: 'POST',
      token,
      body: {
        agent_id: agentId,
        customer_name: `Integration fixture ${label}`,
        customer_phone: '+10000000000',
        scheduled_time: new Date(Date.now() + 86_400_000).toISOString(),
        notes: 'Synthetic integration-test fixture; no call is placed.',
      },
    });
    assert.equal(result.status, 201);
    return result.body as { id: string; business_id: string; notes: string };
  }
  const callbackB = await createCallback(tenantB.token, agentB.agent.id, 'B');
  assert.equal(
    (await request(`/api/callbacks/${callbackB.id}`, {
      method: 'PATCH',
      token: tenantA.token,
      body: { notes: 'Unauthorized cross-tenant update' },
    })).status,
    404
  );
  assert.equal(
    (await db.getCallbacks(tenantB.business.id)).find(({ id }) => id === callbackB.id)?.notes,
    callbackB.notes
  );

  const leadIds = [randomUUID(), randomUUID()];
  const pool = getPostgresPool();
  for (const [index, businessId] of [tenantA.business.id, tenantB.business.id].entries()) {
    await pool.query(
      `INSERT INTO public.leads
         (id, business_id, contact_name, phone, email, source, qualification_status, notes)
       VALUES ($1, $2, $3, $4, $5, 'integration-test', 'new', 'Synthetic isolated fixture')`,
      [
        leadIds[index],
        businessId,
        `VoxMitra Integration Contact ${index}`,
        '+10000000000',
        `fixture-${tag}-${index}@example.invalid`,
      ]
    );
  }
  const leadsA = await request(`/api/leads?business_id=${encodeURIComponent(tenantB.business.id)}`, {
    token: tenantA.token,
  });
  const leadsB = await request('/api/leads', { token: tenantB.token });
  assert.equal(leadsA.status, 200);
  assert.equal(leadsB.status, 200);
  assert.ok(leadsA.body.some(({ id }: { id: string }) => id === leadIds[0]));
  assert.ok(!leadsA.body.some(({ id }: { id: string }) => id === leadIds[1]));
  assert.ok(leadsB.body.some(({ id }: { id: string }) => id === leadIds[1]));
  assert.equal(
    (await request(`/api/leads/${leadIds[1]}`, {
      method: 'PATCH',
      token: tenantA.token,
      body: { notes: 'Unauthorized cross-tenant update' },
    })).status,
    404
  );
  assert.equal(
    (await db.getLeads(tenantB.business.id)).find(({ id }) => id === leadIds[1])?.notes,
    'Synthetic isolated fixture'
  );

  const walletA = await request(`/api/wallet?business_id=${encodeURIComponent(tenantB.business.id)}`, {
    token: tenantA.token,
  });
  const walletB = await request('/api/wallet', { token: tenantB.token });
  assert.equal(walletA.status, 200);
  assert.equal(walletB.status, 200);
  assert.equal(walletA.body.wallet.business_id, tenantA.business.id);
  assert.equal(walletB.body.wallet.business_id, tenantB.business.id);
  assert.equal(walletA.body.wallet.available_balance_minor, 0);
  assert.equal(walletB.body.wallet.available_balance_minor, 0);
  assert.equal((await request('/api/wallet/transactions', { token: tenantA.token })).status, 200);
  assert.equal((await request(`/api/wallet/transactions/test-foreign-${tag}`, { token: tenantA.token })).status, 404);

  const callsA = await request(`/api/calls?business_id=${encodeURIComponent(tenantB.business.id)}`, {
    token: tenantA.token,
  });
  assert.equal(callsA.status, 200);
  assert.ok(Array.isArray(callsA.body));
  assert.equal((await request(`/api/calls/test-foreign-${tag}`, { token: tenantA.token })).status, 404);
  assert.equal((await request('/api/agents/not-a-resource/test-turn', {
    method: 'POST',
    token: tenantA.token,
    body: { callerMessage: 'No provider call is made by this test.' },
  })).status, 404);
  assert.equal((await request('/api/agents/not-a-resource/save-test-call', {
    method: 'POST',
    token: tenantA.token,
    body: {},
  })).status, 410);

  const beforeFailedAgentCreate = await pool.query(
    'SELECT count(*)::integer AS count FROM public.agents WHERE business_id = $1',
    [tenantA.business.id]
  );
  const { PostgresRepositoryError } = await import('../server/db/postgres-repository.ts');
  await assert.rejects(
    async () => {
      await db.createAgentWithConfig(
        tenantA.business.id,
        { name: 'Must roll back', agent_type: 'invalid' as never, description: '', status: 'draft' },
        {}
      );
    },
    (error: unknown) =>
      error instanceof PostgresRepositoryError &&
      error.message === 'Database operation failed.' &&
      !/constraint|SQLSTATE|postgres|password/i.test(error.message)
  );
  const afterFailedAgentCreate = await pool.query(
    'SELECT count(*)::integer AS count FROM public.agents WHERE business_id = $1',
    [tenantA.business.id]
  );
  assert.equal(afterFailedAgentCreate.rows[0].count, beforeFailedAgentCreate.rows[0].count);

  for (const route of ['/api/wallet/orders', '/api/wallet/verify']) {
    assert.equal((await request(route, {
      method: 'POST',
      token: tenantA.token,
      body: { amount: 1, verified: true },
    })).status, 503);
  }
  assert.equal((await request('/api/wallet/autotopup', {
    method: 'PUT',
    token: tenantA.token,
    body: { enabled: true },
  })).status, 503);
  assert.equal((await request('/api/telephony/dispatch', {
    method: 'POST',
    token: tenantA.token,
    body: { agentId: agentA.agent.id },
  })).status, 503);

  console.log('PASS: two isolated TEST tenants exercised auth, agent/config JSONB CRUD, campaigns, callbacks, leads, wallets, and tenant-scoped API routes.');
  console.log('PASS: invalid agent insert rolled back; API rejects fake payment, top-up, call persistence, and telephony actions.');

  phase = 'persistence across database connection reopen';
  await closeHttpServer();
  httpServer = undefined;
  await closePostgresPool();
  const reopenedRepository = new PostgresRepository();
  const persistedAgent = await reopenedRepository.getAgentById(agentA.agent.id, tenantA.business.id);
  const persistedConfig = await reopenedRepository.getAgentConfig(agentA.agent.id, tenantA.business.id);
  assert.equal(persistedAgent?.name, 'Updated Integration Agent A');
  assert.deepEqual(persistedConfig?.agent_plan, {
    objective: 'updated-isolated-A',
    steps: ['answer'],
  });
  console.log('PASS: test user, agent, and JSONB configuration remained readable after closing and reopening the PostgreSQL pool.');
}

try {
  await run();
} catch (error) {
  reportFailure(error);
  process.exitCode = 1;
} finally {
  try {
    await closeHttpServer();
    if (businessIds.length) {
      await getPostgresPool().query(
        'DELETE FROM public.businesses WHERE id = ANY($1::text[])',
        [businessIds]
      );
    }
    cleanupComplete = true;
  } catch (error) {
    reportFailure(error);
    process.exitCode = 1;
  } finally {
    try {
      await closePostgresPool();
    } catch {
      console.error('FAIL: database pool cleanup failed; detailed error redacted.');
      process.exitCode = 1;
    }
  }
  if (cleanupComplete && businessIds.length) {
    console.log('PASS: removed only uniquely identified integration-test business fixtures.');
  }
}
