import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { db, DEVELOPMENT_DEMO_USER_ID, User } from './server/db/database.ts';
import { closePostgresPool, verifyPostgresSchema } from './server/db/postgres-pool.ts';
import { readDatabaseConfiguration } from './server/db/backend.ts';
import { isBillableRealCall } from './server/db/call-records.ts';
import { getVoiceCatalog, testSpeechSynthesis, getConversationalSignedUrl } from './server/services/elevenlabs.ts';
import { processConversationTurn } from './server/services/conversationalEngine.ts';
import {
  attachExotelAgentStream,
  createDefaultLiveConversation,
  getExotelStreamConfiguration,
  hasValidInboundAgentConfiguration,
  normalizePhoneNumber,
} from './server/telephony/agent-stream.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const configuredPort = process.env.PORT;
const PORT = configuredPort === undefined ? 3000 : Number(configuredPort);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid TCP port between 1 and 65535.');
}
const configuredJwtSecret = process.env.JWT_SECRET;
if (
  configuredJwtSecret &&
  (Buffer.byteLength(configuredJwtSecret, 'utf8') < 32 ||
    configuredJwtSecret === 'voxmitra_jwt_super_secret_key_2026' ||
    configuredJwtSecret === 'voxmitra_production_jwt_secret_change_me_in_prod')
) {
  throw new Error('JWT_SECRET must be a unique, securely generated value of at least 32 bytes.');
}
if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) {
  throw new Error('JWT_SECRET is required in production. Configure a securely generated secret before starting VoxMitra.');
}
const JWT_SECRET = configuredJwtSecret || crypto.randomBytes(32).toString('hex');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

function asyncRoute(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req as AuthenticatedRequest, res, next).catch(next);
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    if (typeof payload !== 'object' || !payload || typeof payload.userId !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    void Promise.resolve(db.getUserById(payload.userId)).then((user) => {
      if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
      if (
        user.id === DEVELOPMENT_DEMO_USER_ID &&
        !(process.env.NODE_ENV === 'development' && process.env.VOXMITRA_DEMO_MODE === 'true')
      ) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      return next();
    }).catch(() => res.status(503).json({ error: 'Authentication service unavailable' }));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// -----------------------------------------------------------------------------
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  try {
    const { email, password, fullName, businessName } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string' ||
        !email.trim() || !password || !fullName.trim()) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    const { user, business } = await db.createUser({
      email: normalizedEmail,
      password,
      fullName: fullName.trim(),
      businessName: typeof businessName === 'string' ? businessName.trim() : '',
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      business,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await db.getUserByEmail(email.trim());
    if (
      !user ||
      (user.id === DEVELOPMENT_DEMO_USER_ID &&
        !(process.env.NODE_ENV === 'development' && process.env.VOXMITRA_DEMO_MODE === 'true')) ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const business = await db.getBusiness(user.business_id);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      business,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

app.get('/api/auth/me', authenticateToken, asyncRoute(async (req, res) => {
  const user = req.user!;
  const business = await db.getBusiness(user.business_id);
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    business,
  });
}));

// -----------------------------------------------------------------------------
// DASHBOARD & BUSINESS ROUTES
// -----------------------------------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, asyncRoute(async (req, res) => {
  const stats = await db.getDashboardStats(req.user!.business_id);
  res.json(stats);
}));

app.get('/api/business', authenticateToken, asyncRoute(async (req, res) => {
  const b = await db.getBusiness(req.user!.business_id);
  res.json(b);
}));

app.put('/api/business', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const { name, contact_email, phone_number, timezone } = req.body;
    const updated = await db.updateBusiness(req.user!.business_id, { name, contact_email, phone_number, timezone });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// AGENTS & CONFIGURATIONS ROUTES
// -----------------------------------------------------------------------------
app.get('/api/agents', authenticateToken, asyncRoute(async (req, res) => {
  const agents = await db.getAgents(req.user!.business_id);
  res.json(agents);
}));

app.get('/api/agents/:id', authenticateToken, asyncRoute(async (req, res) => {
  const agent = await db.getAgentById(req.params.id, req.user!.business_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const config = await db.getAgentConfig(agent.id, req.user!.business_id);
  res.json({ agent, config });
}));

app.post('/api/agents', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const { name, agent_type, description, config } = req.body;
    if (!name || !agent_type) {
      return res.status(400).json({ error: 'Agent name and type are required' });
    }

    const result = await db.createAgentWithConfig(
      req.user!.business_id,
      { name, agent_type, description: description || '', status: 'draft' },
      config || {}
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

app.put('/api/agents/:id', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id, req.user!.business_id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (
      req.body.status !== undefined &&
      !['active', 'paused', 'draft'].includes(req.body.status)
    ) {
      return res.status(400).json({ error: 'Agent status must be active, paused or draft.' });
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'inbound_phone_number') ||
      (req.body.status === 'active' && agent.status !== 'active')
    ) {
      return res.status(409).json({ error: 'Use the explicit inbound deployment workflow to activate or assign an agent.' });
    }
    const updated = await db.updateAgent(req.params.id, req.user!.business_id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}));

app.put('/api/agents/:id/inbound-deployment', authenticateToken, asyncRoute(async (req, res) => {
  if (!['owner', 'admin'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Business administrator access is required.' });
  }
  const providerConfig = getExotelStreamConfiguration();
  if (!providerConfig || !process.env.GEMINI_API_KEY?.trim()) {
    return res.status(503).json({
      error: 'Inbound calling is unavailable. Configure Exotel AgentStream credentials and the Gemini Live API key first.',
    });
  }
  const requestedPhoneNumber =
    req.body && typeof req.body === 'object' ? req.body.phoneNumber : undefined;
  const phoneNumber = typeof requestedPhoneNumber === 'string'
    ? normalizePhoneNumber(requestedPhoneNumber)
    : undefined;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Enter the provisioned Exotel inbound number using 8 to 15 digits.' });
  }

  try {
    const agent = await db.getAgentById(req.params.id, req.user!.business_id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.agent_type !== 'inbound_receptionist') {
      return res.status(400).json({ error: 'Only inbound receptionist agents can be deployed for inbound calls.' });
    }
    const config = await db.getAgentConfig(agent.id, req.user!.business_id);
    if (!config || !hasValidInboundAgentConfiguration(config)) {
      return res.status(400).json({ error: 'Configure a greeting and instructions and set maximum call duration between 30 and 3600 seconds before deployment.' });
    }
    const updated = await db.assignInboundPhone(req.user!.business_id, agent.id, phoneNumber);
    res.json({ agent: updated, inbound_phone_number: phoneNumber, status: updated.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('already assigned')) {
      return res.status(409).json({ error: message });
    }
    console.error('Inbound agent deployment failed.');
    return res.status(400).json({ error: 'Inbound agent deployment could not be completed.' });
  }
}));

app.delete('/api/agents/:id/inbound-deployment', authenticateToken, asyncRoute(async (req, res) => {
  if (!['owner', 'admin'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Business administrator access is required.' });
  }
  try {
    const agent = await db.clearInboundPhone(req.user!.business_id, req.params.id);
    res.json({ agent, status: agent.status });
  } catch {
    return res.status(404).json({ error: 'Agent not found' });
  }
}));

app.delete('/api/agents/:id', authenticateToken, asyncRoute(async (req, res) => {
  const success = await db.deleteAgent(req.params.id, req.user!.business_id);
  if (!success) return res.status(404).json({ error: 'Agent not found' });
  res.json({ success: true });
}));

app.get('/api/agents/:id/config', authenticateToken, asyncRoute(async (req, res) => {
  const config = await db.getAgentConfig(req.params.id, req.user!.business_id);
  if (!config) return res.status(404).json({ error: 'Configuration not found' });
  res.json(config);
}));

app.put('/api/agents/:id/config', authenticateToken, asyncRoute(async (req, res) => {
  try {
    if (!await db.getAgentById(req.params.id, req.user!.business_id)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const updated = await db.saveAgentConfig(req.params.id, req.user!.business_id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// INTERACTIVE AGENT TEST-CALL ROUTES
// -----------------------------------------------------------------------------
app.post('/api/agents/:id/test-turn', authenticateToken, asyncRoute(async (req, res) => {
  try {
    if (!await db.getAgentById(req.params.id, req.user!.business_id)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const { conversationHistory, callerMessage, voiceId } = req.body;
    const result = await processConversationTurn({
      agentId: req.params.id,
      businessId: req.user!.business_id,
      conversationHistory: conversationHistory || [],
      callerMessage: callerMessage || '',
      voiceId,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

app.post('/api/agents/:id/save-test-call', authenticateToken, (_req, res) => {
  res.status(410).json({ error: 'Test call persistence is disabled because simulated calls are not billable usage.' });
});

// -----------------------------------------------------------------------------
// CALL RECORDS & DETAILS
// -----------------------------------------------------------------------------
app.get('/api/calls', authenticateToken, asyncRoute(async (req, res) => {
  const { agentId, status, direction, search } = req.query as Record<string, string>;
  const calls = await db.getCallRecords(req.user!.business_id, { agentId, status, direction, search });
  res.json(calls);
}));

app.get('/api/calls/:id', authenticateToken, asyncRoute(async (req, res) => {
  const call = await db.getCallRecordById(req.params.id, req.user!.business_id);
  if (!call) return res.status(404).json({ error: 'Call record not found' });
  res.json(call);
}));

// -----------------------------------------------------------------------------
// CALLBACKS
// -----------------------------------------------------------------------------
app.get('/api/callbacks', authenticateToken, asyncRoute(async (req, res) => {
  const status = req.query.status as string;
  const callbacks = await db.getCallbacks(req.user!.business_id, status);
  res.json(callbacks);
}));

app.post('/api/callbacks', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const businessId = req.user!.business_id;
    if (req.body.agent_id && !await db.getAgentById(req.body.agent_id, businessId)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    if (req.body.call_record_id && !await db.getCallRecordById(req.body.call_record_id, businessId)) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    const item = await db.createCallback({
      ...req.body,
      business_id: businessId,
      status: 'pending',
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

app.patch('/api/callbacks/:id', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const businessId = req.user!.business_id;
    if (req.body.agent_id && !await db.getAgentById(req.body.agent_id, businessId)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    if (req.body.call_record_id && !await db.getCallRecordById(req.body.call_record_id, businessId)) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    const updated = await db.updateCallback(req.params.id, businessId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// CAMPAIGNS
// -----------------------------------------------------------------------------
app.get('/api/campaigns', authenticateToken, asyncRoute(async (req, res) => {
  const campaigns = await db.getCampaigns(req.user!.business_id);
  res.json(campaigns);
}));

app.post('/api/campaigns', authenticateToken, asyncRoute(async (req, res) => {
  try {
    if (!await db.getAgentById(req.body.agent_id, req.user!.business_id)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const item = await db.createCampaign({
      ...req.body,
      business_id: req.user!.business_id,
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

app.patch('/api/campaigns/:id', authenticateToken, asyncRoute(async (req, res) => {
  try {
    if (req.body.agent_id && !await db.getAgentById(req.body.agent_id, req.user!.business_id)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const updated = await db.updateCampaign(req.params.id, req.user!.business_id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// LEADS & FOLLOW-UPS
// -----------------------------------------------------------------------------
app.get('/api/leads', authenticateToken, asyncRoute(async (req, res) => {
  const status = req.query.status as string;
  const leads = await db.getLeads(req.user!.business_id, status);
  res.json(leads);
}));

app.patch('/api/leads/:id', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const updated = await db.updateLead(req.params.id, req.user!.business_id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// KNOWLEDGE BASE
// -----------------------------------------------------------------------------
app.get('/api/knowledge', authenticateToken, asyncRoute(async (req, res) => {
  const sources = await db.getKnowledgeSources(req.user!.business_id);
  res.json(sources);
}));

app.post('/api/knowledge', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const item = await db.addKnowledgeSource({
      ...req.body,
      business_id: req.user!.business_id,
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// ONBOARDING
// -----------------------------------------------------------------------------
app.get('/api/onboarding', authenticateToken, asyncRoute(async (req, res) => {
  const data = await db.getOnboarding(req.user!.id, req.user!.business_id);
  res.json(data);
}));

app.put('/api/onboarding', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const data = await db.saveOnboarding(req.user!.id, req.body, req.user!.business_id);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// -----------------------------------------------------------------------------
// VOICE & ELEVENLABS ROUTES
// -----------------------------------------------------------------------------
app.get('/api/elevenlabs/voices', authenticateToken, asyncRoute(async (_req, res) => {
  const catalog = await getVoiceCatalog();
  res.json(catalog);
}));

app.post('/api/elevenlabs/synthesize', authenticateToken, asyncRoute(async (req, res) => {
  const { voiceId, text } = req.body;
  if (!voiceId || !text) {
    return res.status(400).json({ error: 'voiceId and text are required' });
  }
  const result = await testSpeechSynthesis(voiceId, text);
  res.json(result);
}));

app.get('/api/elevenlabs/convai/signed-url', authenticateToken, asyncRoute(async (req, res) => {
  const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : '';
  if (!agentId) {
    return res.status(400).json({ error: 'agentId query parameter is required' });
  }
  const result = await getConversationalSignedUrl(agentId);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ signedUrl: result.signedUrl });
}));

// -----------------------------------------------------------------------------
// TELEPHONY & EXOTEL ROUTES
// -----------------------------------------------------------------------------
app.get('/api/telephony/status', (req, res) => {
  const configured = Boolean(
    getExotelStreamConfiguration() && process.env.GEMINI_API_KEY?.trim()
  );
  res.json({
    configured,
    active: false,
    ready: configured,
    mechanism: 'Exotel AgentStream Voicebot WebSocket with Gemini Live audio.',
    message: configured
      ? 'Server credentials are present. Configure the Exotel Voicebot applet and public WSS endpoint before placing a real call.'
      : 'Configure Exotel AgentStream credentials and the Gemini Live API key to enable inbound calls.',
  });
});

app.post('/api/telephony/dispatch', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Telephony dispatch is disabled until provider callbacks and usage settlement are verified.' });
});

// Exotel Webhook Receiver
app.post('/api/telephony/webhooks/exotel', (_req, res) => {
  res.status(503).json({ error: 'Telephony webhooks are disabled until provider signature verification is configured.' });
});

// -----------------------------------------------------------------------------
// INTEGRATIONS & SETTINGS
// -----------------------------------------------------------------------------
app.get('/api/integrations', authenticateToken, asyncRoute(async (req, res) => {
  const list = await db.getIntegrations(req.user!.business_id);
  res.json(list.map((item) => ({
    ...item,
    is_enabled: false,
    config_meta: {},
    last_tested_at: undefined,
  })));
}));

app.put('/api/integrations/:provider', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Integration changes are disabled until secrets can be stored and provider connectivity verified server-side.' });
});

// -----------------------------------------------------------------------------
// FINTECH WALLET, USAGE CREDITS & AUTO TOP-UP ROUTES
// Owned by Ramachandra Naidu Jyothi Private Limited
// Minor Currency: Integer Paise (₹1 = 100 paise = 1 usage credit)
// -----------------------------------------------------------------------------

// Wallet Overview Console
app.get('/api/wallet', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const businessId = req.user!.business_id;
    const [wallet, autoTopUp, billingConfig, stats, dailyUsage, unreadNotifications, transactions, calls] = await Promise.all([
      db.getWallet(businessId),
      db.getAutoTopUpSettings(businessId),
      db.getBillingConfig(businessId),
      db.getDashboardStats(businessId),
      db.getDailyUsageMetrics(businessId, 14),
      db.getWalletNotifications(businessId, true),
      db.getWalletTransactions(businessId),
      db.getCallRecords(businessId),
    ]);
    const recentTransactions = transactions.slice(0, 8);
    const billableCallIds = new Set(calls.filter(isBillableRealCall).map((call) => call.id));

    // Calculate today's usage in minor paise
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTxs = transactions.filter(
      (t) =>
        t.transaction_type === 'call_usage' &&
        t.status === 'completed' &&
        t.direction === 'debit' &&
        t.call_id !== undefined &&
        billableCallIds.has(t.call_id) &&
        t.created_at.slice(0, 10) === todayStr
    );
    const todayUsageMinor = todayTxs.reduce((acc, t) => acc + t.amount_minor, 0);

    // Cycle usage
    const cycleTxs = transactions.filter(
      (t) =>
        t.transaction_type === 'call_usage' &&
        t.status === 'completed' &&
        t.direction === 'debit' &&
        t.call_id !== undefined &&
        billableCallIds.has(t.call_id)
    );
    const cycleUsageMinor = cycleTxs.reduce((acc, t) => acc + t.amount_minor, 0);

    // Last successful recharge

    const rateMinor = billingConfig.usage_rate_per_minute_minor || 550;
    const estimatedRemainingMinutes = Math.floor(wallet.available_balance_minor / rateMinor);

    res.json({
      wallet,
      autoTopUp: {
        ...autoTopUp,
        enabled: false,
        payment_mandate_reference: undefined,
        mandate_status: 'none',
      },
      billingConfig,
      todayUsageMinor,
      cycleUsageMinor,
      cycleMinutesConsumed: stats.totalMinutes,
      cycleCompletedCalls: stats.totalCalls,
      estimatedRemainingMinutes,
      lastSuccessfulRechargeDate: undefined,
      dailyUsage,
      unreadNotificationsCount: unreadNotifications.filter((notification) =>
        !['topup_success', 'autotopup_triggered'].includes(notification.type)
      ).length,
      recentTransactions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

// Transactions list with search, filter, and pagination
app.get('/api/wallet/transactions', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const businessId = req.user!.business_id;
    const { type, status, search, startDate, endDate, limit, offset } = req.query as Record<string, string>;
    const txs = await db.getWalletTransactions(businessId, {
      type,
      status,
      search,
      startDate,
      endDate,
    });

    const pageLimit = parseInt(limit || '20', 10);
    const pageOffset = parseInt(offset || '0', 10);
    const paginated = txs.slice(pageOffset, pageOffset + pageLimit);

    res.json({
      total: txs.length,
      limit: pageLimit,
      offset: pageOffset,
      transactions: paginated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

// Single Transaction Details
app.get('/api/wallet/transactions/:id', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const tx = await db.getTransactionById(req.params.id, req.user!.business_id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

// Create Payment Order (Indian Gateway / Razorpay Boundary)
app.post('/api/wallet/orders', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Wallet recharges are disabled until payment-provider order creation is configured.' });
});

// Verify Payment and Credit Wallet (Server-Side Verification & Idempotent Ledger Update)
app.post('/api/wallet/verify', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Wallet credits are disabled until provider verification and transactional crediting are configured.' });
});

// Auto Top-Up Settings
app.get('/api/wallet/autotopup', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const settings = await db.getAutoTopUpSettings(req.user!.business_id);
    res.json({
      ...settings,
      enabled: false,
      payment_mandate_reference: undefined,
      mandate_status: 'none',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

app.put('/api/wallet/autotopup', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Auto Top-Up is disabled until a real recurring payment mandate is authorized.' });
});

app.post('/api/wallet/mandate/authorize', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Mandate authorization is disabled until completed by a payment provider.' });
});

// Cancel payment mandate
app.delete('/api/wallet/mandate', authenticateToken, (_req, res) => {
  res.status(503).json({ error: 'Mandate management is disabled until a real payment-provider integration is configured.' });
});

// Wallet Notifications
app.get('/api/wallet/notifications', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const notifications = (await db.getWalletNotifications(req.user!.business_id)).filter((notification) =>
      !['topup_success', 'autotopup_triggered'].includes(notification.type)
    );
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

app.patch('/api/wallet/notifications/:id/read', authenticateToken, asyncRoute(async (req, res) => {
  try {
    await db.markNotificationRead(req.params.id, req.user!.business_id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// Commercial Rates & Billing Configuration
app.get('/api/billing/config', authenticateToken, asyncRoute(async (req, res) => {
  try {
    const cfg = await db.getBillingConfig(req.user!.business_id);
    res.json(cfg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

// Admin Rate Configuration (Authorized roles: owner / admin)
app.put('/api/billing/config', authenticateToken, asyncRoute(async (req, res) => {
  try {
    if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only workspace owners or billing administrators can modify commercial rates.' });
    }

    const businessId = req.user!.business_id;
    const {
      billing_mode,
      usage_rate_per_minute_minor,
      included_minutes,
      call_duration_rounding_seconds,
      charge_unanswered_calls,
      low_balance_alert_threshold_minor,
    } = req.body;

    const updated = await db.updateBillingConfig(
      businessId,
      {
        billing_mode,
        usage_rate_per_minute_minor: usage_rate_per_minute_minor ? parseInt(usage_rate_per_minute_minor, 10) : undefined,
        included_minutes: included_minutes !== undefined ? parseInt(included_minutes, 10) : undefined,
        call_duration_rounding_seconds: call_duration_rounding_seconds ? parseInt(call_duration_rounding_seconds, 10) : undefined,
        charge_unanswered_calls: charge_unanswered_calls !== undefined ? !!charge_unanswered_calls : undefined,
        low_balance_alert_threshold_minor: low_balance_alert_threshold_minor ? parseInt(low_balance_alert_threshold_minor, 10) : undefined,
      },
      req.user!.email
    );

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// Legacy / Existing Usage endpoint (augmented with wallet info)
app.get('/api/usage', authenticateToken, asyncRoute(async (req, res) => {
  const businessId = req.user!.business_id;
  const [stats, business, wallet, cfg] = await Promise.all([
    db.getDashboardStats(businessId),
    db.getBusiness(businessId),
    db.getWallet(businessId),
    db.getBillingConfig(businessId),
  ]);

  res.json({
    plan_tier: business?.plan_tier || 'growth',
    total_minutes: stats.totalMinutes,
    total_calls: stats.totalCalls,
    included_minutes: cfg.included_minutes,
    included_minutes_used: cfg.included_minutes_used,
    cost_per_minute_inr: cfg.usage_rate_per_minute_minor / 100,
    wallet_balance_inr: wallet.available_balance_minor / 100,
    wallet_credits: Math.round(wallet.available_balance_minor / 100),
    billing_period: null,
    payment_method: null,
  });
}));

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(error);
  console.error('Request failed; returning a sanitized error response.');
  res.status(500).json({ error: 'Internal server error' });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// -----------------------------------------------------------------------------
async function startServer() {
  let closeDevServer: (() => Promise<void>) | undefined;
  if (readDatabaseConfiguration().backend === 'postgres') {
    try {
      await verifyPostgresSchema();
    } catch (err: any) {
      console.warn(
        'PostgreSQL schema verification warning (continuing startup):',
        err?.message || err,
        err?.code ? `[code: ${err.code}]` : ''
      );
    }
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic Vite middleware for HMR-less dev mode in AI Studio
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    closeDevServer = () => vite.close();
    app.use(vite.middlewares);
  }

  const httpServer = createServer(app);
  const streamConfiguration = getExotelStreamConfiguration();
  const closeAgentStream = attachExotelAgentStream(httpServer, {
    db,
    accountSid: streamConfiguration?.accountSid || '',
    username: streamConfiguration?.username || '',
    password: streamConfiguration?.password || '',
    createConversation: createDefaultLiveConversation,
  });
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxMitra server listening on http://0.0.0.0:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    void closeAgentStream()
      .then(() => new Promise<void>((resolve, reject) => {
        httpServer.close((serverError) => serverError ? reject(serverError) : resolve());
      }))
      .then(() => Promise.all([closeDevServer?.(), closePostgresPool()]))
      .catch(() => {
        console.error('Application resources could not be closed safely.');
        process.exitCode = 1;
      });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  void startServer().catch(async () => {
    console.error('VoxMitra startup failed. Verify database configuration and the required public schema.');
    try {
      await closePostgresPool();
    } catch {
      console.error('PostgreSQL pool cleanup failed safely.');
    }
    process.exitCode = 1;
  });
}
