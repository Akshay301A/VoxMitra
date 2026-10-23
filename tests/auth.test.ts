import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { after, before, test } from 'node:test';

const testJwtSecret = 'voxmitra-auth-tests-secret-32-bytes-minimum';
const envKeys = [
  'NODE_ENV',
  'JWT_SECRET',
  'VOXMITRA_DEMO_MODE',
  'VOXMITRA_DATA_FILE',
  'VOXMITRA_DATABASE',
  'EXOTEL_ACCOUNT_SID',
  'EXOTEL_STREAM_USERNAME',
  'EXOTEL_STREAM_PASSWORD',
  'GEMINI_API_KEY',
] as const;
const previousEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
let temporaryDirectory = '';
let server: Server;
let baseUrl = '';

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'voxmitra-auth-tests-'));
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = testJwtSecret;
  process.env.VOXMITRA_DEMO_MODE = 'false';
  process.env.VOXMITRA_DATA_FILE = path.join(temporaryDirectory, 'voxmitra.json');
  process.env.VOXMITRA_DATABASE = 'json';
  process.env.EXOTEL_ACCOUNT_SID = '';
  process.env.EXOTEL_STREAM_USERNAME = '';
  process.env.EXOTEL_STREAM_PASSWORD = '';
  process.env.GEMINI_API_KEY = '';

  const { app } = await import('../server.ts');
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  for (const key of envKeys) {
    const value = previousEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('authentication and tenant ownership are enforced for protected resources', async () => {
  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok' });

  const request = (url: string, token?: string, body?: unknown) =>
    fetch(`${baseUrl}${url}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  for (const authorization of [undefined, 'Basic malformed', 'Bearer not-a-valid-token']) {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: authorization ? { Authorization: authorization } : {},
    });
    assert.equal(response.status, 401);
  }

  const alice = await (await request('/api/auth/register', undefined, {
    email: ' Alice@example.test ',
    password: 'alice-customer-password',
    fullName: 'Alice Example',
    businessName: 'Alice Test Workspace',
  })).json();
  assert.equal(alice.user.email, 'alice@example.test');

  const duplicate = await request('/api/auth/register', undefined, {
    email: 'ALICE@example.test',
    password: 'another-password',
    fullName: 'Duplicate Account',
    businessName: 'Conflicting Workspace',
  });
  assert.equal(duplicate.status, 400);

  const bob = await (await request('/api/auth/register', undefined, {
    email: 'bob@example.test',
    password: 'bob-customer-password',
    fullName: 'Bob Example',
    businessName: 'Bob Test Workspace',
  })).json();

  const demoPasswordLogin = await request('/api/auth/login', undefined, {
    email: bob.user.email,
    password: 'demo1234',
  });
  assert.equal(demoPasswordLogin.status, 401);

  const login = await request('/api/auth/login', undefined, {
    email: alice.user.email,
    password: 'alice-customer-password',
  });
  assert.equal(login.status, 200);
  const loggedInAlice = await login.json();
  assert.equal(loggedInAlice.user.id, alice.user.id);
  assert.equal((await request('/api/auth/me', loggedInAlice.token)).status, 200);
  assert.equal(
    (await request('/api/auth/login', undefined, {
      email: alice.user.email,
      password: 'incorrect-password',
    })).status,
    401
  );

  const expiredToken = jwt.sign({ userId: alice.user.id }, testJwtSecret, { expiresIn: -1 });
  const expiredResponse = await request('/api/auth/me', expiredToken);
  assert.equal(expiredResponse.status, 401);
  const unknownUserToken = jwt.sign({ userId: 'not-a-registered-user' }, testJwtSecret);
  assert.equal((await request('/api/auth/me', unknownUserToken)).status, 401);

  const aliceToken = alice.token as string;
  const bobToken = bob.token as string;
  const createdAgentResponse = await fetch(`${baseUrl}/api/agents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Agent', agent_type: 'inbound_receptionist' }),
  });
  assert.equal(createdAgentResponse.status, 201);
  const { agent } = await createdAgentResponse.json();
  assert.equal(agent.status, 'draft');
  const activationAttempt = await fetch(`${baseUrl}/api/agents/${agent.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'active' }),
  });
  assert.equal(activationAttempt.status, 409);
  const unconfiguredDeployment = await fetch(`${baseUrl}/api/agents/${agent.id}/inbound-deployment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+18005550100' }),
  });
  assert.equal(unconfiguredDeployment.status, 503);
  process.env.EXOTEL_ACCOUNT_SID = 'test-account';
  process.env.EXOTEL_STREAM_USERNAME = 'test-stream-user';
  process.env.EXOTEL_STREAM_PASSWORD = 'test-stream-password';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  const invalidDeployment = await fetch(`${baseUrl}/api/agents/${agent.id}/inbound-deployment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '1234' }),
  });
  assert.equal(invalidDeployment.status, 400);
  const deployed = await fetch(`${baseUrl}/api/agents/${agent.id}/inbound-deployment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+1 (800) 555-0100' }),
  });
  assert.equal(deployed.status, 200);
  const deployedAgent = (await deployed.json()).agent;
  assert.equal(deployedAgent.status, 'active');
  assert.equal(deployedAgent.inbound_phone_number, '18005550100');
  const duplicateAgentResponse = await fetch(`${baseUrl}/api/agents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Second Receptionist', agent_type: 'inbound_receptionist' }),
  });
  const duplicateAgent = (await duplicateAgentResponse.json()).agent;
  const duplicateDeployment = await fetch(`${baseUrl}/api/agents/${duplicateAgent.id}/inbound-deployment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '18005550100' }),
  });
  assert.equal(duplicateDeployment.status, 409);
  const deactivated = await fetch(`${baseUrl}/api/agents/${agent.id}/inbound-deployment`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(deactivated.status, 200);
  assert.equal((await deactivated.json()).agent.status, 'paused');
  assert.equal((await request(`/api/agents/${agent.id}`, aliceToken)).status, 200);
  assert.equal((await request(`/api/agents/${agent.id}`, bobToken)).status, 404);
  assert.equal((await request(`/api/agents/${agent.id}/test-turn`, bobToken, {
    callerMessage: 'Hello',
  })).status, 404);
  assert.equal((await request('/api/telephony/dispatch', bobToken, {
    agentId: agent.id,
    toNumber: '+10000000000',
  })).status, 503);

  const ownershipMutation = await fetch(`${baseUrl}/api/agents/${agent.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Agent Updated', business_id: bob.business.id }),
  });
  assert.equal(ownershipMutation.status, 200);
  const aliceAgentAfterMutation = await (await request(`/api/agents/${agent.id}`, aliceToken)).json();
  assert.equal(aliceAgentAfterMutation.agent.business_id, alice.business.id);
  assert.equal((await request(`/api/agents/${agent.id}`, bobToken)).status, 404);

  const configMutation = await fetch(`${baseUrl}/api/agents/${agent.id}/config`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ greeting: 'Hello', agent_id: 'other-agent', business_id: bob.business.id }),
  });
  assert.equal(configMutation.status, 200);
  const ownConfig = await (await request(`/api/agents/${agent.id}/config`, aliceToken)).json();
  assert.equal(ownConfig.agent_id, agent.id);
  assert.equal(ownConfig.business_id, alice.business.id);
  assert.equal((await request(`/api/agents/${agent.id}/config`, bobToken)).status, 404);
  const foreignConfigUpdate = await fetch(`${baseUrl}/api/agents/${agent.id}/config`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bobToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ greeting: 'Unauthorized' }),
  });
  assert.equal(foreignConfigUpdate.status, 404);

  const callResponse = await fetch(`${baseUrl}/api/agents/${agent.id}/save-test-call`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: bob.business.id, durationSeconds: 60 }),
  });
  assert.equal(callResponse.status, 410);

  const { db } = await import('../server/db/database.ts');
  const billingConfig = await db.getBillingConfig(alice.business.id);
  await db.updateBillingConfig(
    alice.business.id,
    { included_minutes_used: billingConfig.included_minutes },
    alice.user.email
  );
  const walletTransaction = (await db.settleCallUsage(
    alice.business.id,
    'auth-test-wallet-fixture',
    60
  )).transaction;
  assert.ok(walletTransaction);
  assert.equal(
    (await request(`/api/wallet/transactions/${walletTransaction.id}`, aliceToken)).status,
    200
  );
  assert.equal(
    (await request(`/api/wallet/transactions/${walletTransaction.id}`, bobToken)).status,
    404
  );

  const aliceBilling = await (await request('/api/billing/config', aliceToken)).json();
  const bobBilling = await (await request('/api/billing/config', bobToken)).json();
  assert.equal(aliceBilling.business_id, alice.business.id);
  assert.equal(bobBilling.business_id, bob.business.id);
  const billingMutation = await fetch(`${baseUrl}/api/billing/config`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: bob.business.id, included_minutes: 321 }),
  });
  assert.equal(billingMutation.status, 200);
  assert.equal((await billingMutation.json()).business_id, alice.business.id);
});
