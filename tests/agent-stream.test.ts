import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import type { Agent, AgentConfig, CallRecord } from '../server/db/database.ts';
import type { DatabaseContract } from '../server/db/database.contract.ts';
import {
  attachExotelAgentStream,
  isValidExotelStartEvent,
  normalizePhoneNumber,
  resamplePcm16,
  verifyExotelStreamAuthorization,
  type AgentStreamCallbacks,
} from '../server/telephony/agent-stream.ts';

const agent: Agent = {
  id: 'agent-1',
  business_id: 'business-1',
  name: 'Receptionist',
  agent_type: 'inbound_receptionist',
  description: '',
  status: 'active',
  inbound_phone_number: '18005550100',
  total_calls: 0,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

const config: AgentConfig = {
  id: 'config-1',
  agent_id: agent.id,
  business_id: agent.business_id,
  greeting: 'Hello, how can I help?',
  instructions: 'Answer clearly.',
  objectives: '',
  supported_languages: ['en-US'],
  voice_id: '',
  voice_name: '',
  voice_settings: { stability: 0.5, similarity_boost: 0.5 },
  max_duration_seconds: 60,
  transfer_enabled: false,
  transfer_phone: '',
  transfer_conditions: '',
  callback_instructions: '',
  contact_fields_to_collect: [],
  business_faqs: [],
  webhook_url: '',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

function makeStartEvent(callSid = 'call-1', to = '+18005550100') {
  return {
    event: 'start',
    stream_sid: `stream-${callSid}`,
    start: {
      call_sid: callSid,
      account_sid: 'account-1',
      from: '+14155550100',
      to,
      media_format: {
        encoding: 'audio/L16',
        sample_rate: '16000',
        bit_rate: '16',
      },
    },
  };
}

function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (predicate()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Timed out waiting for mocked stream state.'));
      }
    }, 5);
  });
}

test('validates Exotel start events, phone normalization and Basic authentication', () => {
  assert.equal(normalizePhoneNumber(' +1 (800) 555-0100 '), '18005550100');
  assert.equal(normalizePhoneNumber('1234'), undefined);
  assert.equal(verifyExotelStreamAuthorization('Basic dXNlcjpwYXNz', 'user', 'pass'), true);
  assert.equal(verifyExotelStreamAuthorization('Basic dXNlcjpwYXNz', 'user', 'wrong'), false);
  assert.equal(verifyExotelStreamAuthorization('Bearer token', 'user', 'pass'), false);
  assert.equal(isValidExotelStartEvent(makeStartEvent()), true);
  assert.equal(
    isValidExotelStartEvent({
      ...makeStartEvent(),
      start: { ...makeStartEvent().start, media_format: { encoding: 'audio/L16', sample_rate: '8000', bit_rate: '16' } },
    }),
    false
  );
});

test('resamples signed PCM16 little-endian between Gemini and Exotel rates', () => {
  const samples = Buffer.alloc(12);
  [0, 1000, 2000, 3000, 4000, 5000].forEach((sample, index) => {
    samples.writeInt16LE(sample, index * 2);
  });
  const converted = resamplePcm16(samples);
  assert.equal(converted.length, 8);
  assert.deepEqual(
    Array.from({ length: converted.length / 2 }, (_, index) =>
      converted.readInt16LE(index * 2)
    ),
    [0, 1500, 3000, 4500]
  );
});

test('bridges inbound media, records the call once and finalizes on stop', async (context) => {
  let callRecord: CallRecord | undefined;
  let createdCallCount = 0;
  let receivedPcm: Buffer | undefined;
  let conversationCallbacks: AgentStreamCallbacks | undefined;
  let sentGreeting = '';

  const db = {
    async getActiveInboundAgentByPhoneNumber(phoneNumber: string) {
      return phoneNumber === '18005550100' ? { agent, config } : undefined;
    },
    async getCallRecordByTelephonySid(callSid: string) {
      return callRecord?.telephony_call_sid === callSid ? callRecord : undefined;
    },
    async createCallRecordIfNew(
      data: Omit<CallRecord, 'id' | 'created_at'>
    ): Promise<{ call: CallRecord; created: boolean }> {
      createdCallCount += 1;
      callRecord = {
        ...data,
        id: 'record-1',
        created_at: new Date().toISOString(),
      };
      return { call: callRecord, created: true };
    },
    async updateCallRecordByTelephonySid(
      callSid: string,
      updates: Partial<CallRecord>
    ) {
      if (!callRecord || callRecord.telephony_call_sid !== callSid) return undefined;
      Object.assign(callRecord, updates);
      return callRecord;
    },
  } as unknown as DatabaseContract;

  const server = createServer();
  const closeAgentStream = attachExotelAgentStream(server, {
    db,
    accountSid: 'account-1',
    username: 'stream-user',
    password: 'stream-password',
    createConversation: async (_agent, _config, callbacks) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      conversationCallbacks = callbacks;
      return {
        sendAudio(pcm) {
          receivedPcm = pcm;
        },
        sendText(text) {
          sentGreeting = text;
        },
        close() {},
      };
    },
  });
  context.after(async () => {
    await closeAgentStream();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`, {
    headers: {
      Authorization: `Basic ${Buffer.from('stream-user:stream-password').toString('base64')}`,
    },
  });
  await once(socket, 'open');

  const providerMessages: Record<string, unknown>[] = [];
  socket.on('message', (raw) => {
    providerMessages.push(JSON.parse(raw.toString()) as Record<string, unknown>);
  });
  socket.send(JSON.stringify(makeStartEvent()));
  const callerAudio = Buffer.alloc(3200);
  socket.send(JSON.stringify({
    event: 'media',
    stream_sid: 'stream-call-1',
    media: { payload: callerAudio.toString('base64') },
  }));
  await waitFor(() => Boolean(callRecord && conversationCallbacks));
  assert.equal(callRecord?.direction, 'inbound');
  assert.equal(callRecord?.is_demo, false);
  assert.equal(sentGreeting.includes(config.greeting), true);

  await waitFor(() => receivedPcm?.length === callerAudio.length);
  assert.deepEqual(receivedPcm, callerAudio);

  const firstGeminiChunk = Buffer.alloc(4800);
  for (let index = 0; index < firstGeminiChunk.length / 2; index += 1) {
    firstGeminiChunk.writeInt16LE(index, index * 2);
  }
  const secondGeminiChunk = Buffer.alloc(4);
  secondGeminiChunk.writeInt16LE(2400, 0);
  secondGeminiChunk.writeInt16LE(2401, 2);
  conversationCallbacks!.onAudio(firstGeminiChunk);
  conversationCallbacks!.onAudio(secondGeminiChunk);
  conversationCallbacks!.onAudioEnd();
  await waitFor(
    () => providerMessages.filter((message) => message.event === 'media').length === 2
  );
  const returnedAudio = Buffer.concat(
    providerMessages
      .filter((message) => message.event === 'media')
      .map((message) =>
        Buffer.from((message.media as { payload: string }).payload, 'base64')
      )
  );
  assert.deepEqual(
    returnedAudio,
    resamplePcm16(Buffer.concat([firstGeminiChunk, secondGeminiChunk]))
  );
  conversationCallbacks!.onInterrupted();
  await waitFor(() => providerMessages.some((message) => message.event === 'clear'));

  conversationCallbacks!.onTranscript('caller', 'I need help.');
  socket.send(JSON.stringify({
    event: 'stop',
    stream_sid: 'stream-call-1',
    stop: { call_sid: 'call-1', reason: 'hangup' },
  }));
  await waitFor(() => callRecord?.status === 'completed');
  assert.equal(callRecord?.transcript[0]?.text, 'I need help.');

  const retry = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`, {
    headers: {
      Authorization: `Basic ${Buffer.from('stream-user:stream-password').toString('base64')}`,
    },
  });
  await once(retry, 'open');
  const closePromise = once(retry, 'close');
  retry.send(JSON.stringify(makeStartEvent()));
  const [closeCode] = await closePromise;
  assert.equal((closeCode as number), 1013);
  assert.equal(createdCallCount, 1);
});

test('rejects unknown inbound numbers without creating a call record', async (context) => {
  let created = false;
  const db = {
    async getActiveInboundAgentByPhoneNumber() {
      return undefined;
    },
    async getCallRecordByTelephonySid() {
      return undefined;
    },
    async createCallRecordIfNew() {
      created = true;
      throw new Error('Must not create call.');
    },
    async updateCallRecordByTelephonySid() {
      return undefined;
    },
  } as unknown as DatabaseContract;

  const server = createServer();
  const closeAgentStream = attachExotelAgentStream(server, {
    db,
    accountSid: 'account-1',
    username: 'user',
    password: 'password',
    createConversation: async () => {
      throw new Error('Must not open AI session.');
    },
  });
  context.after(async () => {
    await closeAgentStream();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`, {
    headers: { Authorization: `Basic ${Buffer.from('user:password').toString('base64')}` },
  });
  await once(socket, 'open');
  const closePromise = once(socket, 'close');
  socket.send(JSON.stringify(makeStartEvent('unknown-call', '+18005550999')));
  const [closeCode] = await closePromise;
  assert.equal(closeCode, 1008);
  assert.equal(created, false);
});

test('rejects an atomic duplicate-call claim without opening another AI session', async (context) => {
  let aiSessionCreated = false;
  const existingCall = {
    id: 'existing-record',
    business_id: agent.business_id,
    agent_id: agent.id,
    direction: 'inbound',
    caller_number: '14155550100',
    recipient_number: '18005550100',
    duration_seconds: 30,
    status: 'completed',
    transcript: [],
    summary: 'Already finalized.',
    extracted_data: {},
    sentiment: 'neutral',
    cost_usd: 0,
    telephony_call_sid: 'racing-call',
    is_demo: false,
    created_at: new Date().toISOString(),
  } as CallRecord;
  const db = {
    async getActiveInboundAgentByPhoneNumber() {
      return { agent, config };
    },
    async getCallRecordByTelephonySid() {
      return undefined;
    },
    async createCallRecordIfNew() {
      return { call: existingCall, created: false };
    },
    async updateCallRecordByTelephonySid() {
      throw new Error('A duplicate retry must not alter the existing call.');
    },
  } as unknown as DatabaseContract;
  const server = createServer();
  const closeAgentStream = attachExotelAgentStream(server, {
    db,
    accountSid: 'account-1',
    username: 'user',
    password: 'password',
    createConversation: async () => {
      aiSessionCreated = true;
      throw new Error('A duplicate retry must not open another AI session.');
    },
  });
  context.after(async () => {
    await closeAgentStream();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`, {
    headers: { Authorization: `Basic ${Buffer.from('user:password').toString('base64')}` },
  });
  await once(socket, 'open');
  const closePromise = once(socket, 'close');
  socket.send(JSON.stringify(makeStartEvent('racing-call')));
  const [closeCode] = await closePromise;
  assert.equal(closeCode, 1013);
  assert.equal(aiSessionCreated, false);
});

test('rejects stream upgrades with missing or invalid Basic authentication', async (context) => {
  const server = createServer();
  const closeAgentStream = attachExotelAgentStream(server, {
    db: {} as DatabaseContract,
    accountSid: 'account-1',
    username: 'user',
    password: 'password',
    createConversation: async () => {
      throw new Error('Must not start an unauthenticated session.');
    },
  });
  context.after(async () => {
    await closeAgentStream();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`);
  const [error] = await once(socket, 'error');
  assert.match((error as Error).message, /Unexpected server response: 401/);
});

test('records provider initialization failures as failed inbound calls', async (context) => {
  let callRecord: CallRecord | undefined;
  const db = {
    async getActiveInboundAgentByPhoneNumber() {
      return { agent, config };
    },
    async getCallRecordByTelephonySid() {
      return undefined;
    },
    async createCallRecordIfNew(data: Omit<CallRecord, 'id' | 'created_at'>) {
      callRecord = { ...data, id: 'record-failed', created_at: new Date().toISOString() };
      return { call: callRecord, created: true };
    },
    async updateCallRecordByTelephonySid(_callSid: string, updates: Partial<CallRecord>) {
      if (!callRecord) return undefined;
      Object.assign(callRecord, updates);
      return callRecord;
    },
  } as unknown as DatabaseContract;

  const server = createServer();
  const closeAgentStream = attachExotelAgentStream(server, {
    db,
    accountSid: 'account-1',
    username: 'user',
    password: 'password',
    createConversation: async () => {
      throw new Error('Mock Gemini connection failure.');
    },
  });
  context.after(async () => {
    await closeAgentStream();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/telephony/exotel/media`, {
    headers: { Authorization: `Basic ${Buffer.from('user:password').toString('base64')}` },
  });
  await once(socket, 'open');
  const closePromise = once(socket, 'close');
  socket.send(JSON.stringify(makeStartEvent('failed-call')));
  await closePromise;
  await waitFor(() => callRecord?.status === 'failed');
  assert.equal(callRecord?.is_demo, false);
});
