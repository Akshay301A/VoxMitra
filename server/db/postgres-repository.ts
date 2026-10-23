import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentType,
  AutoTopUpSettings,
  BillingConfig,
  Business,
  CallRecord,
  CallbackItem,
  Campaign,
  IntegrationRecord,
  KnowledgeSource,
  Lead,
  OnboardingData,
  PaymentOrder,
  User,
  Wallet,
  WalletNotification,
  WalletTransaction,
} from './database.ts';
import type { DatabaseContract } from './database.contract.ts';
import { getPostgresPool } from './postgres-pool.ts';

type QueryExecutor = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface BusinessRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  phone_number: string;
  plan_tier: Business['plan_tier'];
  timezone: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface UserRow extends QueryResultRow {
  id: string;
  business_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: User['role'];
  created_at: Date | string;
  updated_at: Date | string;
}

interface AgentRow extends QueryResultRow {
  id: string;
  business_id: string;
  name: string;
  agent_type: AgentType;
  description: string;
  status: AgentStatus;
  inbound_phone_number: string;
  total_calls: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AgentConfigRow extends QueryResultRow {
  id: string;
  agent_id: string;
  business_id: string;
  greeting: string;
  instructions: string;
  objectives: string;
  supported_languages: string[];
  voice_id: string;
  voice_name: string;
  voice_settings: AgentConfig['voice_settings'];
  max_duration_seconds: number;
  transfer_enabled: boolean;
  transfer_phone: string;
  transfer_conditions: string;
  callback_instructions: string;
  contact_fields_to_collect: AgentConfig['contact_fields_to_collect'];
  business_faqs: AgentConfig['business_faqs'];
  agent_plan: AgentConfig['agent_plan'] | null;
  webhook_url: string;
  created_at: Date | string;
  updated_at: Date | string;
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapBusiness = (row: BusinessRow): Business => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  contact_email: row.contact_email,
  phone_number: row.phone_number,
  plan_tier: row.plan_tier,
  timezone: row.timezone,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

const mapUser = (row: UserRow): User => ({
  id: row.id,
  business_id: row.business_id,
  email: row.email,
  password_hash: row.password_hash,
  full_name: row.full_name,
  role: row.role,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

const mapAgent = (row: AgentRow): Agent => ({
  id: row.id,
  business_id: row.business_id,
  name: row.name,
  agent_type: row.agent_type,
  description: row.description,
  status: row.status,
  inbound_phone_number: row.inbound_phone_number ?? '',
  total_calls: row.total_calls,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

const mapAgentConfig = (row: AgentConfigRow): AgentConfig => ({
  id: row.id,
  agent_id: row.agent_id,
  business_id: row.business_id,
  greeting: row.greeting,
  instructions: row.instructions,
  objectives: row.objectives,
  supported_languages: row.supported_languages,
  voice_id: row.voice_id,
  voice_name: row.voice_name,
  voice_settings: row.voice_settings,
  max_duration_seconds: row.max_duration_seconds,
  transfer_enabled: row.transfer_enabled,
  transfer_phone: row.transfer_phone,
  transfer_conditions: row.transfer_conditions,
  callback_instructions: row.callback_instructions,
  contact_fields_to_collect: row.contact_fields_to_collect,
  business_faqs: row.business_faqs,
  ...(row.agent_plan == null ? {} : { agent_plan: row.agent_plan }),
  webhook_url: row.webhook_url,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

export class PostgresRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostgresRepositoryError';
  }
}

  interface CallRow extends QueryResultRow {
    id: string;
    business_id: string;
    agent_id: string;
    agent_name: string | null;
    direction: CallRecord['direction'];
    caller_number: string;
    recipient_number: string;
    duration_seconds: number;
    status: CallRecord['status'];
    transcript: CallRecord['transcript'];
    summary: string;
    extracted_data: CallRecord['extracted_data'];
    sentiment: CallRecord['sentiment'];
    cost_usd: number | string;
    telephony_call_sid: string;
    recording_url: string | null;
    is_demo: boolean;
    created_at: Date | string;
  }

  interface CallbackRow extends QueryResultRow {
    id: string;
    business_id: string;
    agent_id: string | null;
    customer_name: string;
    customer_phone: string;
    scheduled_time: Date | string;
    status: CallbackItem['status'];
    notes: string;
    call_record_id: string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }

  interface CampaignRow extends QueryResultRow {
    id: string;
    business_id: string;
    name: string;
    agent_id: string;
    agent_name: string | null;
    status: Campaign['status'];
    total_contacts: number;
    completed_contacts: number;
    successful_calls: number;
    schedule_start: string | null;
    calling_window: string | null;
    created_at: Date | string;
  }

  interface LeadRow extends QueryResultRow {
    id: string;
    business_id: string;
    contact_name: string;
    phone: string;
    email: string | null;
    source: string;
    qualification_status: Lead['qualification_status'];
    agent_name: string | null;
    last_call_at: string | null;
    next_action: string | null;
    callback_date: string | null;
    notes: string | null;
  }

  interface KnowledgeRow extends QueryResultRow {
    id: string;
    business_id: string;
    title: string;
    type: KnowledgeSource['type'];
    item_count: number | null;
    status: KnowledgeSource['status'];
    updated_at: string;
    details: string | null;
  }

  interface WalletRow extends QueryResultRow {
    id: string;
    business_id: string;
    currency: 'INR';
    available_balance_minor: number | string;
    reserved_balance_minor: number | string;
    status: Wallet['status'];
    created_at: Date | string;
    updated_at: Date | string;
  }

  interface WalletTransactionRow extends QueryResultRow {
    id: string;
    business_id: string;
    wallet_id: string;
    transaction_type: WalletTransaction['transaction_type'];
    direction: WalletTransaction['direction'];
    amount_minor: number | string;
    currency: 'INR';
    status: WalletTransaction['status'];
    idempotency_key: string;
    external_reference: string | null;
    call_id: string | null;
    description: string;
    resulting_balance_minor: number | string;
    metadata: WalletTransaction['metadata'] | null;
    created_at: Date | string;
  }

  interface AutoTopUpRow extends QueryResultRow {
    id: string;
    business_id: string;
    enabled: boolean;
    threshold_minor: number | string;
    recharge_amount_minor: number | string;
    monthly_cap_minor: number | string;
    current_month_recharged_minor: number | string;
    payment_mandate_reference: string | null;
    mandate_status: AutoTopUpSettings['mandate_status'];
    last_recharge_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }

  interface BillingRow extends QueryResultRow {
    id: string;
    business_id: string;
    billing_mode: BillingConfig['billing_mode'];
    usage_rate_per_minute_minor: number | string;
    included_minutes: number;
    included_minutes_used: number;
    minimum_recharge_minor: number | string;
    low_balance_alert_threshold_minor: number | string;
    call_duration_rounding_seconds: number;
    charge_unanswered_calls: boolean;
    gst_tax_rate_percent: number | string;
    last_updated_by: string | null;
    updated_at: Date | string;
  }

  interface PaymentOrderRow extends QueryResultRow {
    id: string;
    business_id: string;
    provider: PaymentOrder['provider'];
    provider_order_reference: string;
    provider_payment_reference: string | null;
    amount_minor: number | string;
    currency: 'INR';
    status: PaymentOrder['status'];
    idempotency_key: string;
    created_at: Date | string;
    updated_at: Date | string;
  }

  interface IntegrationRow extends QueryResultRow {
    id: string;
    business_id: string;
    provider: IntegrationRecord['provider'];
    is_enabled: boolean;
    config_meta: Record<string, unknown>;
    last_tested_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }

  interface NotificationRow extends QueryResultRow {
    id: string;
    business_id: string;
    type: WalletNotification['type'];
    title: string;
    message: string;
    read: boolean;
    created_at: Date | string;
  }

  const numeric = (value: number | string): number => Number(value);
  const nullableIso = (value: Date | string | null): string | undefined =>
    value == null ? undefined : toIso(value);

  const mapCall = (row: CallRow): CallRecord => ({
    id: row.id,
    business_id: row.business_id,
    agent_id: row.agent_id,
    ...(row.agent_name == null ? {} : { agent_name: row.agent_name }),
    direction: row.direction,
    caller_number: row.caller_number,
    recipient_number: row.recipient_number,
    duration_seconds: row.duration_seconds,
    status: row.status,
    transcript: row.transcript,
    summary: row.summary,
    extracted_data: row.extracted_data,
    sentiment: row.sentiment,
    cost_usd: numeric(row.cost_usd),
    telephony_call_sid: row.telephony_call_sid,
    ...(row.recording_url == null ? {} : { recording_url: row.recording_url }),
    is_demo: row.is_demo,
    created_at: toIso(row.created_at),
  });

  const mapCallback = (row: CallbackRow): CallbackItem => ({
    id: row.id,
    business_id: row.business_id,
    ...(row.agent_id == null ? {} : { agent_id: row.agent_id }),
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    scheduled_time: toIso(row.scheduled_time),
    status: row.status,
    notes: row.notes,
    ...(row.call_record_id == null ? {} : { call_record_id: row.call_record_id }),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  });

  const mapCampaign = (row: CampaignRow): Campaign => ({
    id: row.id,
    business_id: row.business_id,
    name: row.name,
    agent_id: row.agent_id,
    ...(row.agent_name == null ? {} : { agent_name: row.agent_name }),
    status: row.status,
    total_contacts: row.total_contacts,
    completed_contacts: row.completed_contacts,
    successful_calls: row.successful_calls,
    ...(row.schedule_start == null ? {} : { schedule_start: row.schedule_start }),
    ...(row.calling_window == null ? {} : { calling_window: row.calling_window }),
    created_at: toIso(row.created_at),
  });

  const mapLead = (row: LeadRow): Lead => ({
    id: row.id,
    business_id: row.business_id,
    contact_name: row.contact_name,
    phone: row.phone,
    ...(row.email == null ? {} : { email: row.email }),
    source: row.source,
    qualification_status: row.qualification_status,
    ...(row.agent_name == null ? {} : { agent_name: row.agent_name }),
    ...(row.last_call_at == null ? {} : { last_call_at: row.last_call_at }),
    ...(row.next_action == null ? {} : { next_action: row.next_action }),
    ...(row.callback_date == null ? {} : { callback_date: row.callback_date }),
    ...(row.notes == null ? {} : { notes: row.notes }),
  });

  const mapKnowledge = (row: KnowledgeRow): KnowledgeSource => ({
    id: row.id,
    business_id: row.business_id,
    title: row.title,
    type: row.type,
    ...(row.item_count == null ? {} : { item_count: row.item_count }),
    status: row.status,
    updated_at: row.updated_at,
    ...(row.details == null ? {} : { details: row.details }),
  });

  const mapWallet = (row: WalletRow): Wallet => ({
    id: row.id,
    business_id: row.business_id,
    currency: row.currency,
    available_balance_minor: numeric(row.available_balance_minor),
    reserved_balance_minor: numeric(row.reserved_balance_minor),
    status: row.status,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  });

  const mapWalletTransaction = (row: WalletTransactionRow): WalletTransaction => ({
    id: row.id,
    business_id: row.business_id,
    wallet_id: row.wallet_id,
    transaction_type: row.transaction_type,
    direction: row.direction,
    amount_minor: numeric(row.amount_minor),
    currency: row.currency,
    status: row.status,
    idempotency_key: row.idempotency_key,
    ...(row.external_reference == null ? {} : { external_reference: row.external_reference }),
    ...(row.call_id == null ? {} : { call_id: row.call_id }),
    description: row.description,
    resulting_balance_minor: numeric(row.resulting_balance_minor),
    ...(row.metadata == null ? {} : { metadata: row.metadata }),
    created_at: toIso(row.created_at),
  });

  const mapAutoTopUp = (row: AutoTopUpRow): AutoTopUpSettings => ({
    id: row.id,
    business_id: row.business_id,
    enabled: row.enabled,
    threshold_minor: numeric(row.threshold_minor),
    recharge_amount_minor: numeric(row.recharge_amount_minor),
    monthly_cap_minor: numeric(row.monthly_cap_minor),
    current_month_recharged_minor: numeric(row.current_month_recharged_minor),
    ...(row.payment_mandate_reference == null
      ? {}
      : { payment_mandate_reference: row.payment_mandate_reference }),
    mandate_status: row.mandate_status,
    ...(nullableIso(row.last_recharge_at) == null
      ? {}
      : { last_recharge_at: nullableIso(row.last_recharge_at) }),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  });

  const mapBilling = (row: BillingRow): BillingConfig => ({
    id: row.id,
    business_id: row.business_id,
    billing_mode: row.billing_mode,
    usage_rate_per_minute_minor: numeric(row.usage_rate_per_minute_minor),
    included_minutes: row.included_minutes,
    included_minutes_used: row.included_minutes_used,
    minimum_recharge_minor: numeric(row.minimum_recharge_minor),
    low_balance_alert_threshold_minor: numeric(row.low_balance_alert_threshold_minor),
    call_duration_rounding_seconds: row.call_duration_rounding_seconds,
    charge_unanswered_calls: row.charge_unanswered_calls,
    gst_tax_rate_percent: numeric(row.gst_tax_rate_percent),
    ...(row.last_updated_by == null ? {} : { last_updated_by: row.last_updated_by }),
    updated_at: toIso(row.updated_at),
  });

  const mapPaymentOrder = (row: PaymentOrderRow): PaymentOrder => ({
    id: row.id,
    business_id: row.business_id,
    provider: row.provider,
    provider_order_reference: row.provider_order_reference,
    ...(row.provider_payment_reference == null
      ? {}
      : { provider_payment_reference: row.provider_payment_reference }),
    amount_minor: numeric(row.amount_minor),
    currency: row.currency,
    status: row.status,
    idempotency_key: row.idempotency_key,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  });

  const mapIntegration = (row: IntegrationRow): IntegrationRecord => ({
    id: row.id,
    business_id: row.business_id,
    provider: row.provider,
    is_enabled: false,
    config_meta: redactCredentials(row.config_meta),
    ...(nullableIso(row.last_tested_at) == null
      ? {}
      : { last_tested_at: nullableIso(row.last_tested_at) }),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  });

  const mapNotification = (row: NotificationRow): WalletNotification => ({
    id: row.id,
    business_id: row.business_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    created_at: toIso(row.created_at),
  });

function safeDatabaseError(error: unknown): PostgresRepositoryError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  const constraint =
    typeof error === 'object' && error !== null && 'constraint' in error
      ? (error as { constraint?: unknown }).constraint
      : undefined;

  if (code === '23505' && constraint === 'users_email_normalized_uq') {
    return new PostgresRepositoryError('An account with this email address already exists.');
  }
  if (code === '23503') {
    return new PostgresRepositoryError('The requested resource has related records and cannot be changed.');
  }
  return new PostgresRepositoryError('Database operation failed.');
}

function redactCredentials(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/(secret|token|password|credential|api.?key|private.?key)/i.test(key)) continue;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      result[key] = redactCredentials(entry as Record<string, unknown>);
    } else if (Array.isArray(entry)) {
      result[key] = entry.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? redactCredentials(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = entry;
    }
  }
  return result;
}

export class PostgresRepository implements DatabaseContract {
  constructor(private readonly pool: Pool = getPostgresPool()) {}

  private async query<T extends QueryResultRow>(
    executor: QueryExecutor,
    text: string,
    values: unknown[] = []
  ): Promise<T[]> {
    try {
      const result = await executor.query<T>(text, values);
      return result.rows;
    } catch (error) {
      throw safeDatabaseError(error);
    }
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } catch {
      throw new PostgresRepositoryError('Database operation failed.');
    }

    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        throw new PostgresRepositoryError('Database transaction could not be completed safely.');
      }
      throw error instanceof PostgresRepositoryError ? error : safeDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await this.query<UserRow>(
      this.pool,
      `SELECT id, business_id, email, password_hash, full_name, role, created_at, updated_at
       FROM public.users
       WHERE lower(btrim(email)) = lower(btrim($1))
       LIMIT 1`,
      [email]
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const rows = await this.query<UserRow>(
      this.pool,
      `SELECT id, business_id, email, password_hash, full_name, role, created_at, updated_at
       FROM public.users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async createUser(payload: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
  }): Promise<{ user: User; business: Business }> {
    const email = payload.email.trim().toLowerCase();
    const businessName = payload.businessName.trim() || 'My Business';
    const businessId = uuidv4();
    const userId = uuidv4();
    const now = new Date().toISOString();
    const business: Business = {
      id: businessId,
      name: businessName,
      slug: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-business'}-${businessId.slice(0, 8)}`,
      contact_email: email,
      phone_number: '',
      plan_tier: 'starter',
      timezone: 'UTC',
      created_at: now,
      updated_at: now,
    };
    const user: User = {
      id: userId,
      business_id: businessId,
      email,
      password_hash: bcrypt.hashSync(payload.password, bcrypt.genSaltSync(10)),
      full_name: payload.fullName,
      role: 'owner',
      created_at: now,
      updated_at: now,
    };

    return this.transaction(async (client) => {
      const businesses = await this.query<BusinessRow>(
        client,
        `INSERT INTO public.businesses
           (id, name, slug, contact_email, phone_number, plan_tier, timezone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, slug, contact_email, phone_number, plan_tier, timezone, created_at, updated_at`,
        [
          business.id,
          business.name,
          business.slug,
          business.contact_email,
          business.phone_number,
          business.plan_tier,
          business.timezone,
          business.created_at,
          business.updated_at,
        ]
      );
      const users = await this.query<UserRow>(
        client,
        `INSERT INTO public.users
           (id, business_id, email, password_hash, full_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, business_id, email, password_hash, full_name, role, created_at, updated_at`,
        [
          user.id,
          user.business_id,
          user.email,
          user.password_hash,
          user.full_name,
          user.role,
          user.created_at,
          user.updated_at,
        ]
      );
      await this.query(
        client,
        `INSERT INTO public.onboarding
           (user_id, business_id, business_name, business_category, timezone, goals,
            starting_point, pending_agent_start, status, step, tour_step, completed,
            tour_completed, created_at, updated_at)
         VALUES ($1, $2, $3, '', $4, '[]'::jsonb, 'agent', FALSE, 'not_started', 0, 0, FALSE, FALSE, $5, $5)`,
        [user.id, business.id, business.name, business.timezone, now]
      );
      if (!businesses[0] || !users[0]) {
        throw new PostgresRepositoryError('Database operation failed.');
      }
      return { user: mapUser(users[0]), business: mapBusiness(businesses[0]) };
    });
  }

  async getBusiness(businessId: string): Promise<Business | undefined> {
    const rows = await this.query<BusinessRow>(
      this.pool,
      `SELECT id, name, slug, contact_email, phone_number, plan_tier, timezone, created_at, updated_at
       FROM public.businesses WHERE id = $1 LIMIT 1`,
      [businessId]
    );
    return rows[0] ? mapBusiness(rows[0]) : undefined;
  }

  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<Business> {
    const allowed: (keyof Business)[] = [
      'name',
      'slug',
      'contact_email',
      'phone_number',
      'plan_tier',
      'timezone',
    ];
    const values: unknown[] = [businessId];
    const assignments = allowed.flatMap((key) => {
      if (updates[key] === undefined) return [];
      values.push(updates[key]);
      return [`${key} = $${values.length}`];
    });
    assignments.push('updated_at = now()');

    const rows = await this.query<BusinessRow>(
      this.pool,
      `UPDATE public.businesses SET ${assignments.join(', ')}
       WHERE id = $1
       RETURNING id, name, slug, contact_email, phone_number, plan_tier, timezone, created_at, updated_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Business not found.');
    return mapBusiness(rows[0]);
  }

  async getAgents(businessId: string): Promise<Agent[]> {
    const rows = await this.query<AgentRow>(
      this.pool,
      `SELECT id, business_id, name, agent_type, description, status, inbound_phone_number,
              total_calls, created_at, updated_at
       FROM public.agents WHERE business_id = $1 ORDER BY created_at, id`,
      [businessId]
    );
    return rows.map(mapAgent);
  }

  async getAgentById(agentId: string, businessId: string): Promise<Agent | undefined> {
    const rows = await this.query<AgentRow>(
      this.pool,
      `SELECT id, business_id, name, agent_type, description, status, inbound_phone_number,
              total_calls, created_at, updated_at
       FROM public.agents WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [agentId, businessId]
    );
    return rows[0] ? mapAgent(rows[0]) : undefined;
  }

  async assignInboundPhone(
    businessId: string,
    agentId: string,
    phoneNumber: string
  ): Promise<Agent> {
    try {
      const rows = await this.query<AgentRow>(
        this.pool,
        `UPDATE public.agents AS a
         SET inbound_phone_number = $3, status = 'active', updated_at = now()
         WHERE a.id = $1 AND a.business_id = $2 AND a.agent_type = 'inbound_receptionist'
           AND EXISTS (
             SELECT 1 FROM public.agent_configurations AS c
             WHERE c.agent_id = a.id AND c.business_id = a.business_id
           )
         RETURNING a.id, a.business_id, a.name, a.agent_type, a.description, a.status,
                   a.inbound_phone_number, a.total_calls, a.created_at, a.updated_at`,
        [agentId, businessId, phoneNumber]
      );
      if (!rows[0]) throw new PostgresRepositoryError('Inbound agent or configuration not found.');
      return mapAgent(rows[0]);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new PostgresRepositoryError('This phone number is already assigned to another agent.');
      }
      throw error;
    }
  }

  async getActiveInboundAgentByPhoneNumber(
    phoneNumber: string
  ): Promise<{ agent: Agent; config: AgentConfig } | undefined> {
    const rows = await this.query<AgentRow>(
      this.pool,
      `SELECT id, business_id, name, agent_type, description, status, inbound_phone_number,
              total_calls, created_at, updated_at
       FROM public.agents
       WHERE inbound_phone_number = $1 AND status = 'active'
         AND agent_type = 'inbound_receptionist'
       LIMIT 1`,
      [phoneNumber]
    );
    if (!rows[0]) return undefined;
    const agent = mapAgent(rows[0]);
    const config = await this.getAgentConfig(agent.id, agent.business_id);
    return config ? { agent, config } : undefined;
  }

  async clearInboundPhone(businessId: string, agentId: string): Promise<Agent> {
    const rows = await this.query<AgentRow>(
      this.pool,
      `UPDATE public.agents
       SET inbound_phone_number = '', status = 'paused', updated_at = now()
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, name, agent_type, description, status, inbound_phone_number,
                 total_calls, created_at, updated_at`,
      [agentId, businessId]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Agent not found.');
    return mapAgent(rows[0]);
  }

  async createAgentWithConfig(
    businessId: string,
    agentData: { name: string; agent_type: AgentType; description: string; status?: AgentStatus },
    configData: Partial<AgentConfig>
  ): Promise<{ agent: Agent; config: AgentConfig }> {
    const agentId = uuidv4();
    const configId = uuidv4();
    const now = new Date().toISOString();
    const agent: Agent = {
      id: agentId,
      business_id: businessId,
      name: agentData.name,
      agent_type: agentData.agent_type,
      description: agentData.description,
      status: agentData.status || 'draft',
      inbound_phone_number: '',
      total_calls: 0,
      created_at: now,
      updated_at: now,
    };
    const config = this.makeAgentConfig(agentId, businessId, agentData.name, configData, configId, now);

    return this.transaction(async (client) => {
      const agents = await this.query<AgentRow>(
        client,
        `INSERT INTO public.agents
           (id, business_id, name, agent_type, description, status, inbound_phone_number,
            total_calls, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, business_id, name, agent_type, description, status, inbound_phone_number,
                   total_calls, created_at, updated_at`,
        [
          agent.id,
          agent.business_id,
          agent.name,
          agent.agent_type,
          agent.description,
          agent.status,
          agent.inbound_phone_number,
          agent.total_calls,
          agent.created_at,
          agent.updated_at,
        ]
      );
      const configs = await this.insertAgentConfig(client, config);
      if (!agents[0] || !configs[0]) {
        throw new PostgresRepositoryError('Database operation failed.');
      }
      return { agent: mapAgent(agents[0]), config: mapAgentConfig(configs[0]) };
    });
  }

  async updateAgent(agentId: string, businessId: string, updates: Partial<Agent>): Promise<Agent> {
    const allowed: (keyof Agent)[] = ['name', 'agent_type', 'description', 'status', 'total_calls'];
    const values: unknown[] = [agentId, businessId];
    const assignments = allowed.flatMap((key) => {
      if (updates[key] === undefined) return [];
      values.push(updates[key]);
      return [`${key} = $${values.length}`];
    });
    assignments.push('updated_at = now()');

    const rows = await this.query<AgentRow>(
      this.pool,
      `UPDATE public.agents SET ${assignments.join(', ')}
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, name, agent_type, description, status, inbound_phone_number,
                 total_calls, created_at, updated_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Agent not found.');
    return mapAgent(rows[0]);
  }

  async deleteAgent(agentId: string, businessId: string): Promise<boolean> {
    return this.transaction(async (client) => {
      await this.query(
        client,
        `DELETE FROM public.agent_configurations WHERE agent_id = $1 AND business_id = $2`,
        [agentId, businessId]
      );
      const rows = await this.query<AgentRow>(
        client,
        `DELETE FROM public.agents
         WHERE id = $1 AND business_id = $2
         RETURNING id, business_id, name, agent_type, description, status, total_calls, created_at, updated_at`,
        [agentId, businessId]
      );
      return rows.length > 0;
    });
  }

  async getAgentConfig(agentId: string, businessId: string): Promise<AgentConfig | undefined> {
    const rows = await this.query<AgentConfigRow>(
      this.pool,
      `SELECT c.id, c.agent_id, c.business_id, c.greeting, c.instructions, c.objectives,
              c.supported_languages, c.voice_id, c.voice_name, c.voice_settings,
              c.max_duration_seconds, c.transfer_enabled, c.transfer_phone,
              c.transfer_conditions, c.callback_instructions, c.contact_fields_to_collect,
              c.business_faqs, c.agent_plan, c.webhook_url, c.created_at, c.updated_at
       FROM public.agent_configurations AS c
       INNER JOIN public.agents AS a
         ON a.id = c.agent_id AND a.business_id = c.business_id
       WHERE c.agent_id = $1 AND c.business_id = $2
       LIMIT 1`,
      [agentId, businessId]
    );
    return rows[0] ? mapAgentConfig(rows[0]) : undefined;
  }

  async saveAgentConfig(
    agentId: string,
    businessId: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig> {
    const insertId = uuidv4();
    const now = new Date().toISOString();
    const config = this.makeAgentConfig(
      agentId,
      businessId,
      '',
      updates,
      insertId,
      now,
      true
    );
    const mutableFields: (keyof AgentConfig)[] = [
      'greeting',
      'instructions',
      'objectives',
      'supported_languages',
      'voice_id',
      'voice_name',
      'voice_settings',
      'max_duration_seconds',
      'transfer_enabled',
      'transfer_phone',
      'transfer_conditions',
      'callback_instructions',
      'contact_fields_to_collect',
      'business_faqs',
      'agent_plan',
      'webhook_url',
    ];
    const conflictUpdates = mutableFields
      .filter((field) => updates[field] !== undefined)
      .map((field) => `${field} = EXCLUDED.${field}`);
    conflictUpdates.push('updated_at = EXCLUDED.updated_at');

    const rows = await this.query<AgentConfigRow>(
      this.pool,
      `INSERT INTO public.agent_configurations AS current_config
         (id, agent_id, business_id, greeting, instructions, objectives, supported_languages,
          voice_id, voice_name, voice_settings, max_duration_seconds, transfer_enabled,
          transfer_phone, transfer_conditions, callback_instructions, contact_fields_to_collect,
          business_faqs, agent_plan, webhook_url, created_at, updated_at)
       SELECT $1, a.id, a.business_id, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21
       FROM public.agents AS a
       WHERE a.id = $2 AND a.business_id = $3
       ON CONFLICT (agent_id) DO UPDATE SET
         ${conflictUpdates.join(', ')}
       WHERE current_config.business_id = EXCLUDED.business_id
       RETURNING id, agent_id, business_id, greeting, instructions, objectives,
                 supported_languages, voice_id, voice_name, voice_settings,
                 max_duration_seconds, transfer_enabled, transfer_phone,
                 transfer_conditions, callback_instructions, contact_fields_to_collect,
                 business_faqs, agent_plan, webhook_url, created_at, updated_at`,
      [
        config.id,
        agentId,
        businessId,
        config.greeting,
        config.instructions,
        config.objectives,
        JSON.stringify(config.supported_languages),
        config.voice_id,
        config.voice_name,
        JSON.stringify(config.voice_settings),
        config.max_duration_seconds,
        config.transfer_enabled,
        config.transfer_phone,
        config.transfer_conditions,
        config.callback_instructions,
        JSON.stringify(config.contact_fields_to_collect),
        JSON.stringify(config.business_faqs),
        config.agent_plan == null ? null : JSON.stringify(config.agent_plan),
        config.webhook_url,
        config.created_at,
        config.updated_at,
      ]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Agent not found.');
    return mapAgentConfig(rows[0]);
  }

  async getCallRecords(
    businessId: string,
    filters?: { agentId?: string; status?: string; direction?: string; search?: string }
  ): Promise<CallRecord[]> {
    const values: unknown[] = [businessId];
    const predicates = ['business_id = $1'];
    if (filters?.agentId) {
      values.push(filters.agentId);
      predicates.push(`agent_id = $${values.length}`);
    }
    if (filters?.status && filters.status !== 'all') {
      values.push(filters.status);
      predicates.push(`status = $${values.length}`);
    }
    if (filters?.direction && filters.direction !== 'all') {
      values.push(filters.direction);
      predicates.push(`direction = $${values.length}`);
    }
    if (filters?.search) {
      values.push(`%${filters.search}%`);
      predicates.push(
        `(caller_number ILIKE $${values.length} OR recipient_number ILIKE $${values.length} OR summary ILIKE $${values.length} OR agent_name ILIKE $${values.length})`
      );
    }
    const rows = await this.query<CallRow>(
      this.pool,
      `SELECT id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
              duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
              telephony_call_sid, recording_url, is_demo, created_at
       FROM public.call_records WHERE ${predicates.join(' AND ')}
       ORDER BY created_at DESC, id DESC`,
      values
    );
    return rows.map(mapCall);
  }

  async getCallRecordById(callId: string, businessId: string): Promise<CallRecord | undefined> {
    const rows = await this.query<CallRow>(
      this.pool,
      `SELECT id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
              duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
              telephony_call_sid, recording_url, is_demo, created_at
       FROM public.call_records WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [callId, businessId]
    );
    return rows[0] ? mapCall(rows[0]) : undefined;
  }

  async getCallRecordByTelephonySid(callSid: string): Promise<CallRecord | undefined> {
    const rows = await this.query<CallRow>(
      this.pool,
      `SELECT id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
              duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
              telephony_call_sid, recording_url, is_demo, created_at
       FROM public.call_records WHERE telephony_call_sid = $1 LIMIT 1`,
      [callSid]
    );
    return rows[0] ? mapCall(rows[0]) : undefined;
  }

  async updateCallRecordByTelephonySid(
    callSid: string,
    updates: Partial<Pick<CallRecord, 'duration_seconds' | 'status' | 'transcript' | 'summary' | 'recording_url'>>
  ): Promise<CallRecord | undefined> {
    const allowed: (keyof typeof updates)[] = [
      'duration_seconds',
      'status',
      'transcript',
      'summary',
      'recording_url',
    ];
    const values: unknown[] = [callSid];
    const assignments = allowed.flatMap((key) => {
      if (updates[key] === undefined) return [];
      values.push(
        key === 'transcript'
          ? JSON.stringify(updates[key])
          : updates[key]
      );
      if (key === 'status') {
        return [
          `status = CASE
             WHEN status IN ('completed', 'failed', 'busy', 'no_answer', 'transferred') THEN status
             ELSE $${values.length}
           END`,
        ];
      }
      return [`${key} = $${values.length}${key === 'transcript' ? '::jsonb' : ''}`];
    });
    if (assignments.length === 0) return this.getCallRecordByTelephonySid(callSid);

    const rows = await this.query<CallRow>(
      this.pool,
      `UPDATE public.call_records SET ${assignments.join(', ')}
       WHERE telephony_call_sid = $1
       RETURNING id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
                 duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
                 telephony_call_sid, recording_url, is_demo, created_at`,
      values
    );
    return rows[0] ? mapCall(rows[0]) : undefined;
  }

  async createCallRecord(
    callData: Omit<CallRecord, 'id' | 'created_at'>
  ): Promise<CallRecord> {
    return (await this.createCallRecordIfNew(callData)).call;
  }

  async createCallRecordIfNew(
    callData: Omit<CallRecord, 'id' | 'created_at'>
  ): Promise<{ call: CallRecord; created: boolean }> {
    const id = uuidv4();
    const now = new Date().toISOString();
    return this.transaction(async (client) => {
      const rows = await this.query<CallRow>(
        client,
        `INSERT INTO public.call_records
           (id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
            duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
            telephony_call_sid, recording_url, is_demo, created_at)
         SELECT $1, a.business_id, a.id, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
         FROM public.agents AS a WHERE a.id = $2 AND a.business_id = $3
         ON CONFLICT (telephony_call_sid) WHERE telephony_call_sid <> '' DO NOTHING
         RETURNING id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
                   duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
                   telephony_call_sid, recording_url, is_demo, created_at`,
        [
          id,
          callData.agent_id,
          callData.business_id,
          callData.agent_name ?? null,
          callData.direction,
          callData.caller_number,
          callData.recipient_number,
          callData.duration_seconds,
          callData.status,
          JSON.stringify(callData.transcript),
          callData.summary,
          JSON.stringify(callData.extracted_data),
          callData.sentiment,
          callData.cost_usd,
          callData.telephony_call_sid,
          callData.recording_url ?? null,
          callData.is_demo,
          now,
        ]
      );
      if (!rows[0]) {
        const existing = await this.query<CallRow>(
          client,
          `SELECT id, business_id, agent_id, agent_name, direction, caller_number, recipient_number,
                  duration_seconds, status, transcript, summary, extracted_data, sentiment, cost_usd,
                  telephony_call_sid, recording_url, is_demo, created_at
           FROM public.call_records WHERE telephony_call_sid = $1 LIMIT 1`,
          [callData.telephony_call_sid]
        );
        if (existing[0]) return { call: mapCall(existing[0]), created: false };
        throw new PostgresRepositoryError('Agent not found.');
      }
      await this.query(
        client,
        `UPDATE public.agents SET total_calls = total_calls + 1, updated_at = now()
         WHERE id = $1 AND business_id = $2`,
        [callData.agent_id, callData.business_id]
      );
      return { call: mapCall(rows[0]), created: true };
    });
  }

  async getCallbacks(businessId: string, status?: string): Promise<CallbackItem[]> {
    const values: unknown[] = [businessId];
    const statusFilter = status && status !== 'all' ? ` AND status = $2` : '';
    if (statusFilter) values.push(status);
    const rows = await this.query<CallbackRow>(
      this.pool,
      `SELECT id, business_id, agent_id, customer_name, customer_phone, scheduled_time,
              status, notes, call_record_id, created_at, updated_at
       FROM public.callbacks WHERE business_id = $1${statusFilter}
       ORDER BY scheduled_time, created_at`,
      values
    );
    return rows.map(mapCallback);
  }

  async createCallback(
    payload: Omit<CallbackItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CallbackItem> {
    const now = new Date().toISOString();
    const rows = await this.query<CallbackRow>(
      this.pool,
      `INSERT INTO public.callbacks
         (id, business_id, agent_id, customer_name, customer_phone, scheduled_time,
          status, notes, call_record_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING id, business_id, agent_id, customer_name, customer_phone, scheduled_time,
                 status, notes, call_record_id, created_at, updated_at`,
      [
        uuidv4(),
        payload.business_id,
        payload.agent_id ?? null,
        payload.customer_name,
        payload.customer_phone,
        payload.scheduled_time,
        payload.status,
        payload.notes,
        payload.call_record_id ?? null,
        now,
      ]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Database operation failed.');
    return mapCallback(rows[0]);
  }

  async updateCallback(
    callbackId: string,
    businessId: string,
    updates: Partial<CallbackItem>
  ): Promise<CallbackItem> {
    const fields: (keyof CallbackItem)[] = [
      'agent_id',
      'customer_name',
      'customer_phone',
      'scheduled_time',
      'status',
      'notes',
      'call_record_id',
    ];
    const values: unknown[] = [callbackId, businessId];
    const assignments = fields.flatMap((field) => {
      if (updates[field] === undefined) return [];
      values.push(updates[field] ?? null);
      return [`${field} = $${values.length}`];
    });
    assignments.push('updated_at = now()');
    const rows = await this.query<CallbackRow>(
      this.pool,
      `UPDATE public.callbacks SET ${assignments.join(', ')}
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, agent_id, customer_name, customer_phone, scheduled_time,
                 status, notes, call_record_id, created_at, updated_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Callback not found.');
    return mapCallback(rows[0]);
  }

  async getIntegrations(businessId: string): Promise<IntegrationRecord[]> {
    const rows = await this.query<IntegrationRow>(
      this.pool,
      `SELECT id, business_id, provider, is_enabled, config_meta, last_tested_at, created_at, updated_at
       FROM public.integrations WHERE business_id = $1 ORDER BY provider`,
      [businessId]
    );
    return rows.map(mapIntegration);
  }

  async updateIntegration(
    businessId: string,
    provider: IntegrationRecord['provider'],
    updates: Partial<IntegrationRecord>
  ): Promise<IntegrationRecord> {
    const now = new Date().toISOString();
    const safeMetadata = redactCredentials(updates.config_meta ?? {});
    const rows = await this.query<IntegrationRow>(
      this.pool,
      `INSERT INTO public.integrations
         (id, business_id, provider, is_enabled, config_meta, last_tested_at, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, $4, NULL, $5, $5)
       ON CONFLICT (business_id, provider) DO UPDATE SET
         is_enabled = FALSE,
         config_meta = EXCLUDED.config_meta,
         last_tested_at = NULL,
         updated_at = EXCLUDED.updated_at
       RETURNING id, business_id, provider, is_enabled, config_meta, last_tested_at, created_at, updated_at`,
      [uuidv4(), businessId, provider, JSON.stringify(safeMetadata), now]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Database operation failed.');
    return mapIntegration(rows[0]);
  }

  async getDashboardStats(businessId: string): Promise<{
    totalCalls: number;
    answeredCalls: number;
    failedCalls: number;
    answerRatePercent: number;
    totalDurationSeconds: number;
    totalMinutes: number;
    activeAgentsCount: number;
    totalAgentsCount: number;
    pendingCallbacksCount: number;
    qualifiedLeadsCount: number;
    followUpsDueCount: number;
    realCallsCount: number;
    demoCallsCount: number;
  }> {
    const rows = await this.query<QueryResultRow & Record<string, number | string>>(
      this.pool,
      `WITH real_calls AS (
         SELECT * FROM public.call_records
         WHERE business_id = $1 AND is_demo = FALSE
           AND telephony_call_sid <> ''
           AND telephony_call_sid !~* '^test[-_]'
           AND caller_number NOT ILIKE '%(Interactive Test)%'
       ), demo_calls AS (
         SELECT * FROM public.call_records
         WHERE business_id = $1
           AND (is_demo = TRUE OR telephony_call_sid ~* '^test[-_]' OR caller_number ILIKE '%(Interactive Test)%')
       )
       SELECT
         (SELECT count(*) FROM real_calls) AS total_calls,
         (SELECT count(*) FROM real_calls WHERE status IN ('completed', 'transferred')) AS answered_calls,
         (SELECT count(*) FROM real_calls WHERE status IN ('failed', 'no_answer', 'busy')) AS failed_calls,
         (SELECT COALESCE(sum(duration_seconds), 0) FROM real_calls) AS real_duration_seconds,
         (SELECT count(*) FROM real_calls) AS real_calls,
         (SELECT count(*) FROM demo_calls) AS demo_calls,
         (SELECT count(*) FROM public.agents WHERE business_id = $1 AND status = 'active') AS active_agents,
         (SELECT count(*) FROM public.agents WHERE business_id = $1) AS total_agents,
         (SELECT count(*) FROM public.callbacks WHERE business_id = $1 AND status = 'pending') AS pending_callbacks,
         (SELECT count(*) FROM public.leads WHERE business_id = $1 AND qualification_status = 'qualified') AS qualified_leads,
         ((SELECT count(*) FROM public.callbacks WHERE business_id = $1 AND status = 'pending') +
          (SELECT count(*) FROM public.leads WHERE business_id = $1 AND qualification_status = 'follow_up_due')) AS follow_ups`,
      [businessId]
    );
    const stats = rows[0];
    if (!stats) throw new PostgresRepositoryError('Database operation failed.');
    const totalCalls = numeric(stats.total_calls);
    const answeredCalls = numeric(stats.answered_calls);
    const totalDurationSeconds = numeric(stats.real_duration_seconds);
    return {
      totalCalls,
      answeredCalls,
      failedCalls: numeric(stats.failed_calls),
      answerRatePercent: totalCalls ? Math.round((answeredCalls / totalCalls) * 100) : 0,
      totalDurationSeconds,
      totalMinutes: Math.round((totalDurationSeconds / 60) * 10) / 10,
      activeAgentsCount: numeric(stats.active_agents),
      totalAgentsCount: numeric(stats.total_agents),
      pendingCallbacksCount: numeric(stats.pending_callbacks),
      qualifiedLeadsCount: numeric(stats.qualified_leads),
      followUpsDueCount: numeric(stats.follow_ups),
      realCallsCount: numeric(stats.real_calls),
      demoCallsCount: numeric(stats.demo_calls),
    };
  }

  async getCampaigns(businessId: string): Promise<Campaign[]> {
    const rows = await this.query<CampaignRow>(
      this.pool,
      `SELECT id, business_id, name, agent_id, agent_name, status, total_contacts,
              completed_contacts, successful_calls, schedule_start, calling_window, created_at
       FROM public.campaigns WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId]
    );
    return rows.map(mapCampaign);
  }

  async createCampaign(payload: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    const rows = await this.query<CampaignRow>(
      this.pool,
      `INSERT INTO public.campaigns
         (id, business_id, name, agent_id, agent_name, status, total_contacts,
          completed_contacts, successful_calls, schedule_start, calling_window)
       SELECT $1, a.business_id, $3, a.id, $5, $6, $7, $8, $9, $10, $11
       FROM public.agents AS a WHERE a.id = $4 AND a.business_id = $2
       RETURNING id, business_id, name, agent_id, agent_name, status, total_contacts,
                 completed_contacts, successful_calls, schedule_start, calling_window, created_at`,
      [
        uuidv4(),
        payload.business_id,
        payload.name,
        payload.agent_id,
        payload.agent_name ?? null,
        payload.status,
        payload.total_contacts,
        payload.completed_contacts,
        payload.successful_calls,
        payload.schedule_start ?? null,
        payload.calling_window ?? null,
      ]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Agent not found.');
    return mapCampaign(rows[0]);
  }

  async updateCampaign(
    id: string,
    businessId: string,
    updates: Partial<Campaign>
  ): Promise<Campaign> {
    const fields: (keyof Campaign)[] = [
      'name',
      'agent_id',
      'agent_name',
      'status',
      'total_contacts',
      'completed_contacts',
      'successful_calls',
      'schedule_start',
      'calling_window',
    ];
    const values: unknown[] = [id, businessId];
    const assignments = fields.flatMap((field) => {
      if (updates[field] === undefined) return [];
      values.push(updates[field] ?? null);
      return [`${field} = $${values.length}`];
    });
    const agentParameter = updates.agent_id === undefined
      ? undefined
      : Number(assignments.find((assignment) => assignment.startsWith('agent_id ='))?.match(/\$(\d+)/)?.[1]);
    const agentPredicate = agentParameter
      ? ` AND EXISTS (SELECT 1 FROM public.agents WHERE id = $${agentParameter} AND business_id = $2)`
      : '';
    const rows = await this.query<CampaignRow>(
      this.pool,
      `UPDATE public.campaigns SET ${assignments.length ? assignments.join(', ') : 'name = name'}
       WHERE id = $1 AND business_id = $2${agentPredicate}
       RETURNING id, business_id, name, agent_id, agent_name, status, total_contacts,
                 completed_contacts, successful_calls, schedule_start, calling_window, created_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Campaign not found or agent does not belong to this business.');
    return mapCampaign(rows[0]);
  }

  async getLeads(businessId: string, status?: string): Promise<Lead[]> {
    const values: unknown[] = [businessId];
    const statusFilter = status && status !== 'all' ? ' AND qualification_status = $2' : '';
    if (statusFilter) values.push(status);
    const rows = await this.query<LeadRow>(
      this.pool,
      `SELECT id, business_id, contact_name, phone, email, source, qualification_status,
              agent_name, last_call_at, next_action, callback_date, notes
       FROM public.leads WHERE business_id = $1${statusFilter}
       ORDER BY updated_at DESC, id`,
      values
    );
    return rows.map(mapLead);
  }

  async updateLead(id: string, businessId: string, updates: Partial<Lead>): Promise<Lead> {
    const fields: (keyof Lead)[] = [
      'contact_name',
      'phone',
      'email',
      'source',
      'qualification_status',
      'agent_name',
      'last_call_at',
      'next_action',
      'callback_date',
      'notes',
    ];
    const values: unknown[] = [id, businessId];
    const assignments = fields.flatMap((field) => {
      if (updates[field] === undefined) return [];
      values.push(updates[field] ?? null);
      return [`${field} = $${values.length}`];
    });
    assignments.push('updated_at = now()');
    const rows = await this.query<LeadRow>(
      this.pool,
      `UPDATE public.leads SET ${assignments.join(', ')}
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, contact_name, phone, email, source, qualification_status,
                 agent_name, last_call_at, next_action, callback_date, notes`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Lead not found.');
    return mapLead(rows[0]);
  }

  async getKnowledgeSources(businessId: string): Promise<KnowledgeSource[]> {
    const rows = await this.query<KnowledgeRow>(
      this.pool,
      `SELECT id, business_id, title, type, item_count, status, updated_at, details
       FROM public.knowledge_sources WHERE business_id = $1
       ORDER BY updated_at DESC, id`,
      [businessId]
    );
    return rows.map(mapKnowledge);
  }

  async addKnowledgeSource(
    payload: Omit<KnowledgeSource, 'id' | 'updated_at'>
  ): Promise<KnowledgeSource> {
    const rows = await this.query<KnowledgeRow>(
      this.pool,
      `INSERT INTO public.knowledge_sources
         (id, business_id, title, type, item_count, status, updated_at, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, business_id, title, type, item_count, status, updated_at, details`,
      [
        uuidv4(),
        payload.business_id,
        payload.title,
        payload.type,
        payload.item_count ?? null,
        payload.status,
        new Date().toISOString(),
        payload.details ?? null,
      ]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Database operation failed.');
    return mapKnowledge(rows[0]);
  }

  async getOnboarding(userId: string, businessId?: string): Promise<OnboardingData> {
    const rows = await this.query<QueryResultRow & Record<string, unknown>>(
      this.pool,
      `SELECT o.business_name, o.business_category, o.website, o.location, o.timezone,
              o.goals, o.starting_point, o.pending_agent_start, o.status, o.step, o.tour_step,
              o.completed, o.tour_completed, o.primary_use_case, o.preferred_language,
              o.preferred_voice
       FROM public.onboarding AS o
       INNER JOIN public.users AS u ON u.id = o.user_id AND u.business_id = o.business_id
       WHERE o.user_id = $1 AND ($2::text IS NULL OR o.business_id = $2)
       LIMIT 1`,
      [userId, businessId ?? null]
    );
    if (rows[0]) {
      const row = rows[0];
      return {
        businessName: String(row.business_name),
        businessCategory: String(row.business_category),
        ...(row.website == null ? {} : { website: String(row.website) }),
        ...(row.location == null ? {} : { location: String(row.location) }),
        ...(row.timezone == null ? {} : { timezone: String(row.timezone) }),
        goals: (row.goals as string[]) ?? [],
        ...(row.starting_point == null ? {} : { startingPoint: row.starting_point as OnboardingData['startingPoint'] }),
        ...(row.pending_agent_start == null ? {} : { pendingAgentStart: Boolean(row.pending_agent_start) }),
        ...(row.status == null ? {} : { status: row.status as OnboardingData['status'] }),
        step: numeric(row.step as string | number),
        ...(row.tour_step == null ? {} : { tourStep: numeric(row.tour_step as string | number) }),
        completed: Boolean(row.completed),
        ...(row.tour_completed == null ? {} : { tourCompleted: Boolean(row.tour_completed) }),
        ...(row.primary_use_case == null ? {} : { primaryUseCase: row.primary_use_case as OnboardingData['primaryUseCase'] }),
        ...(row.preferred_language == null ? {} : { preferredLanguage: String(row.preferred_language) }),
        ...(row.preferred_voice == null ? {} : { preferredVoice: String(row.preferred_voice) }),
      };
    }
    const business = await this.getBusiness(businessId ?? (await this.getUserById(userId))?.business_id ?? '');
    return {
      businessName: business?.name ?? '',
      businessCategory: '',
      timezone: business?.timezone ?? 'UTC',
      goals: [],
      startingPoint: 'dashboard',
      pendingAgentStart: false,
      status: 'completed',
      step: 5,
      tourStep: 0,
      completed: true,
      tourCompleted: true,
    };
  }

  async saveOnboarding(
    userId: string,
    data: Partial<OnboardingData>,
    businessId?: string
  ): Promise<OnboardingData> {
    const user = await this.getUserById(userId);
    const tenantId = businessId ?? user?.business_id;
    if (!user || !tenantId || user.business_id !== tenantId) {
      throw new PostgresRepositoryError('User not found.');
    }
    const existing = await this.getOnboarding(userId, tenantId);
    const value = { ...existing, ...data };
    if (value.status && !['not_started', 'in_progress', 'completed', 'skipped'].includes(value.status)) {
      throw new PostgresRepositoryError('Invalid onboarding status.');
    }
    value.completed = value.status === 'completed' || value.status === 'skipped';
    const fields = [
      'business_name', 'business_category', 'website', 'location', 'timezone', 'goals',
      'starting_point', 'pending_agent_start', 'status', 'step', 'tour_step', 'completed',
      'tour_completed', 'primary_use_case', 'preferred_language', 'preferred_voice',
    ];
    const values = [
      userId, tenantId, value.businessName, value.businessCategory, value.website ?? null,
      value.location ?? null, value.timezone ?? null, JSON.stringify(value.goals ?? []),
      value.startingPoint ?? null, value.pendingAgentStart ?? null, value.status ?? null,
      value.step, value.tourStep ?? null, value.completed, value.tourCompleted ?? null,
      value.primaryUseCase ?? null, value.preferredLanguage ?? null, value.preferredVoice ?? null,
    ];
    const rows = await this.query(
      this.pool,
      `INSERT INTO public.onboarding
         (user_id, business_id, ${fields.join(', ')})
       SELECT $1, u.business_id, ${fields.map((_, i) => `$${i + 3}`).join(', ')}
       FROM public.users AS u WHERE u.id = $1 AND u.business_id = $2
       ON CONFLICT (user_id) DO UPDATE SET
         ${fields.map((field) => `${field} = EXCLUDED.${field}`).join(', ')},
         updated_at = now()
       WHERE public.onboarding.business_id = EXCLUDED.business_id
       RETURNING user_id`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('User not found.');
    return value;
  }

  async getWallet(businessId: string): Promise<Wallet> {
    const now = new Date().toISOString();
    await this.query(
      this.pool,
      `INSERT INTO public.wallets (id, business_id, currency, created_at, updated_at)
       SELECT $1, id, 'INR', $2, $2 FROM public.businesses WHERE id = $3
       ON CONFLICT (business_id) DO NOTHING`,
      [uuidv4(), now, businessId]
    );
    const selected = await this.query<WalletRow>(
      this.pool,
      `SELECT id, business_id, currency, available_balance_minor, reserved_balance_minor,
              status, created_at, updated_at
       FROM public.wallets WHERE business_id = $1 LIMIT 1`,
      [businessId]
    );
    if (!selected[0]) throw new PostgresRepositoryError('Business not found.');
    return mapWallet(selected[0]);
  }

  async getWalletTransactions(
    businessId: string,
    filter?: { type?: string; status?: string; search?: string; startDate?: string; endDate?: string }
  ): Promise<WalletTransaction[]> {
    const values: unknown[] = [businessId];
    const predicates = ['business_id = $1'];
    if (filter?.type && filter.type !== 'all') {
      values.push(filter.type);
      predicates.push(`transaction_type = $${values.length}`);
    }
    if (filter?.status && filter.status !== 'all') {
      values.push(filter.status);
      predicates.push(`status = $${values.length}`);
    }
    if (filter?.search) {
      values.push(`%${filter.search}%`);
      predicates.push(
        `(id ILIKE $${values.length} OR description ILIKE $${values.length} OR external_reference ILIKE $${values.length} OR call_id ILIKE $${values.length})`
      );
    }
    if (filter?.startDate) {
      values.push(filter.startDate);
      predicates.push(`created_at >= $${values.length}::timestamptz`);
    }
    if (filter?.endDate) {
      values.push(filter.endDate);
      predicates.push(`created_at <= $${values.length}::timestamptz`);
    }
    const rows = await this.query<WalletTransactionRow>(
      this.pool,
      `SELECT id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
              status, idempotency_key, external_reference, call_id, description,
              resulting_balance_minor, metadata, created_at
       FROM public.wallet_transactions WHERE ${predicates.join(' AND ')}
       ORDER BY created_at DESC, id DESC`,
      values
    );
    return rows.map(mapWalletTransaction);
  }

  async getTransactionById(id: string, businessId: string): Promise<WalletTransaction | null> {
    const rows = await this.query<WalletTransactionRow>(
      this.pool,
      `SELECT id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
              status, idempotency_key, external_reference, call_id, description,
              resulting_balance_minor, metadata, created_at
       FROM public.wallet_transactions WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [id, businessId]
    );
    return rows[0] ? mapWalletTransaction(rows[0]) : null;
  }

  async getAutoTopUpSettings(businessId: string): Promise<AutoTopUpSettings> {
    const now = new Date().toISOString();
    await this.query(
      this.pool,
      `INSERT INTO public.wallet_autotopup_settings (id, business_id, created_at, updated_at)
       SELECT $1, id, $2, $2 FROM public.businesses WHERE id = $3
       ON CONFLICT (business_id) DO NOTHING`,
      [uuidv4(), now, businessId]
    );
    const rows = await this.query<AutoTopUpRow>(
      this.pool,
      `SELECT id, business_id, enabled, threshold_minor, recharge_amount_minor, monthly_cap_minor,
              current_month_recharged_minor, payment_mandate_reference, mandate_status,
              last_recharge_at, created_at, updated_at
       FROM public.wallet_autotopup_settings WHERE business_id = $1 LIMIT 1`,
      [businessId]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Business not found.');
    return mapAutoTopUp(rows[0]);
  }

  async updateAutoTopUpSettings(
    businessId: string,
    updates: Partial<AutoTopUpSettings>
  ): Promise<AutoTopUpSettings> {
    if (updates.enabled === true || updates.mandate_status === 'active' || updates.payment_mandate_reference) {
      throw new PostgresRepositoryError('Automatic recharge is unavailable until a verified payment mandate integration is configured.');
    }
    const fields: (keyof AutoTopUpSettings)[] = [
      'threshold_minor',
      'recharge_amount_minor',
      'monthly_cap_minor',
    ];
    const values: unknown[] = [businessId];
    const assignments = fields.flatMap((field) => {
      if (updates[field] === undefined) return [];
      const value = updates[field];
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
          (field === 'recharge_amount_minor' && value === 0)) {
        throw new PostgresRepositoryError('Automatic recharge amounts must be valid non-negative whole minor units.');
      }
      values.push(value);
      return [`${field} = $${values.length}`];
    });
    if (updates.enabled === false) assignments.push('enabled = FALSE');
    assignments.push('updated_at = now()');
    await this.getAutoTopUpSettings(businessId);
    const rows = await this.query<AutoTopUpRow>(
      this.pool,
      `UPDATE public.wallet_autotopup_settings SET ${assignments.join(', ')}
       WHERE business_id = $1
       RETURNING id, business_id, enabled, threshold_minor, recharge_amount_minor, monthly_cap_minor,
                 current_month_recharged_minor, payment_mandate_reference, mandate_status,
                 last_recharge_at, created_at, updated_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Business not found.');
    return mapAutoTopUp(rows[0]);
  }

  async getBillingConfig(businessId: string): Promise<BillingConfig> {
    const business = await this.getBusiness(businessId);
    if (!business) throw new PostgresRepositoryError('Business not found.');
    const planDefaults = business.plan_tier === 'starter'
      ? { rate: 700, minutes: 100 }
      : business.plan_tier === 'enterprise'
        ? { rate: 475, minutes: 1500 }
        : { rate: 550, minutes: 500 };
    const rows = await this.query<BillingRow>(
      this.pool,
      `INSERT INTO public.billing_configs
         (id, business_id, billing_mode, usage_rate_per_minute_minor, included_minutes,
          included_minutes_used, minimum_recharge_minor, low_balance_alert_threshold_minor,
          call_duration_rounding_seconds, charge_unanswered_calls, gst_tax_rate_percent,
          last_updated_by, updated_at)
       VALUES ($1, $2, 'subscription_plus_wallet', $3, $4, 0, 10000, 20000, 60, FALSE, 18.0, 'System Defaults', $5)
       ON CONFLICT (business_id) DO NOTHING
       RETURNING id, business_id, billing_mode, usage_rate_per_minute_minor, included_minutes,
                 included_minutes_used, minimum_recharge_minor, low_balance_alert_threshold_minor,
                 call_duration_rounding_seconds, charge_unanswered_calls, gst_tax_rate_percent,
                 last_updated_by, updated_at`,
      [uuidv4(), businessId, planDefaults.rate, planDefaults.minutes, new Date().toISOString()]
    );
    if (rows[0]) return mapBilling(rows[0]);
    const existing = await this.query<BillingRow>(
      this.pool,
      `SELECT id, business_id, billing_mode, usage_rate_per_minute_minor, included_minutes,
              included_minutes_used, minimum_recharge_minor, low_balance_alert_threshold_minor,
              call_duration_rounding_seconds, charge_unanswered_calls, gst_tax_rate_percent,
              last_updated_by, updated_at
       FROM public.billing_configs WHERE business_id = $1 LIMIT 1`,
      [businessId]
    );
    if (!existing[0]) throw new PostgresRepositoryError('Billing configuration is unavailable.');
    return mapBilling(existing[0]);
  }

  async updateBillingConfig(
    businessId: string,
    updates: Partial<BillingConfig>,
    updatedBy: string
  ): Promise<BillingConfig> {
    const allowed: (keyof BillingConfig)[] = [
      'billing_mode',
      'usage_rate_per_minute_minor',
      'included_minutes',
      'included_minutes_used',
      'minimum_recharge_minor',
      'low_balance_alert_threshold_minor',
      'call_duration_rounding_seconds',
      'charge_unanswered_calls',
      'gst_tax_rate_percent',
    ];
    const values: unknown[] = [businessId];
    const assignments = allowed.flatMap((field) => {
      if (updates[field] === undefined) return [];
      values.push(updates[field]);
      return [`${field} = $${values.length}`];
    });
    values.push(updatedBy);
    assignments.push(`last_updated_by = $${values.length}`, 'updated_at = now()');
    await this.getBillingConfig(businessId);
    const rows = await this.query<BillingRow>(
      this.pool,
      `UPDATE public.billing_configs SET ${assignments.join(', ')}
       WHERE business_id = $1
       RETURNING id, business_id, billing_mode, usage_rate_per_minute_minor, included_minutes,
                 included_minutes_used, minimum_recharge_minor, low_balance_alert_threshold_minor,
                 call_duration_rounding_seconds, charge_unanswered_calls, gst_tax_rate_percent,
                 last_updated_by, updated_at`,
      values
    );
    if (!rows[0]) throw new PostgresRepositoryError('Billing configuration is unavailable.');
    return mapBilling(rows[0]);
  }

  async createPaymentOrder(
    businessId: string,
    params: {
      amountMinor: number;
      idempotencyKey: string;
      providerOrderReference: string;
      provider?: PaymentOrder['provider'];
    }
  ): Promise<PaymentOrder> {
    if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0 ||
        !params.idempotencyKey.trim() || !params.providerOrderReference.trim()) {
      throw new PostgresRepositoryError('A positive amount, idempotency key, and verified provider order reference are required.');
    }
    const rows = await this.query<PaymentOrderRow>(
      this.pool,
      `INSERT INTO public.payment_orders
         (id, business_id, provider, provider_order_reference, amount_minor, currency,
          status, idempotency_key, created_at, updated_at)
       SELECT $1, id, $3, $4, $5, 'INR', 'created', $6, $7, $7
       FROM public.businesses WHERE id = $2
       ON CONFLICT (business_id, idempotency_key) DO NOTHING
       RETURNING id, business_id, provider, provider_order_reference, provider_payment_reference,
                 amount_minor, currency, status, idempotency_key, created_at, updated_at`,
      [
        uuidv4(),
        businessId,
        params.provider ?? 'razorpay',
        params.providerOrderReference,
        params.amountMinor,
        params.idempotencyKey,
        new Date().toISOString(),
      ]
    );
    if (rows[0]) return mapPaymentOrder(rows[0]);
    const existing = await this.query<PaymentOrderRow>(
      this.pool,
      `SELECT id, business_id, provider, provider_order_reference, provider_payment_reference,
              amount_minor, currency, status, idempotency_key, created_at, updated_at
       FROM public.payment_orders WHERE business_id = $1 AND idempotency_key = $2 LIMIT 1`,
      [businessId, params.idempotencyKey]
    );
    if (!existing[0]) throw new PostgresRepositoryError('Business not found or payment order could not be stored.');
    const order = mapPaymentOrder(existing[0]);
    if (order.amount_minor !== params.amountMinor || order.provider_order_reference !== params.providerOrderReference) {
      throw new PostgresRepositoryError('Idempotency key was already used for a different payment order.');
    }
    return order;
  }

  async verifyAndCreditPaymentOrder(
    businessId: string,
    params: {
      orderId: string;
      paymentId: string;
      amountMinor: number;
      idempotencyKey: string;
      providerVerified: true;
      description?: string;
      isAutoTopUp?: boolean;
    }
  ): Promise<{ success: boolean; transaction: WalletTransaction; wallet: Wallet }> {
    if (params.providerVerified !== true || !params.paymentId || !Number.isSafeInteger(params.amountMinor) ||
        params.amountMinor <= 0 || params.isAutoTopUp) {
      throw new PostgresRepositoryError('Payment cannot be credited without verified provider details; automatic recharge is disabled.');
    }
    return this.transaction(async (client) => {
      const orders = await this.query<PaymentOrderRow>(
        client,
        `SELECT id, business_id, provider, provider_order_reference, provider_payment_reference,
                amount_minor, currency, status, idempotency_key, created_at, updated_at
         FROM public.payment_orders
         WHERE business_id = $1 AND (id = $2 OR provider_order_reference = $2)
         FOR UPDATE`,
        [businessId, params.orderId]
      );
      const orderRow = orders[0];
      if (!orderRow) throw new PostgresRepositoryError('Payment order not found.');
      const order = mapPaymentOrder(orderRow);
      if (order.currency !== 'INR' || order.amount_minor !== params.amountMinor) {
        throw new PostgresRepositoryError('Verified payment amount or currency does not match the order.');
      }
      const idempotencyKey = `payment_credit_${order.id}`;
      if (order.status === 'paid') {
        const prior = await this.query<WalletTransactionRow>(
          client,
          `SELECT id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
                  status, idempotency_key, external_reference, call_id, description,
                  resulting_balance_minor, metadata, created_at
           FROM public.wallet_transactions WHERE idempotency_key = $1 LIMIT 1`,
          [idempotencyKey]
        );
        if (!prior[0] || order.provider_payment_reference !== params.paymentId) {
          throw new PostgresRepositoryError('Payment order was already processed with different payment details.');
        }
        const walletRows = await this.lockWallet(client, businessId);
        return {
          success: true,
          transaction: mapWalletTransaction(prior[0]),
          wallet: mapWallet(walletRows),
        };
      }
      if (order.status !== 'created' && order.status !== 'attempted') {
        throw new PostgresRepositoryError('Payment order is not payable.');
      }
      const walletRows = await this.lockWallet(client, businessId);
      const wallet = mapWallet(walletRows);
      if (wallet.status !== 'active') throw new PostgresRepositoryError('Wallet is not active.');
      const balance = wallet.available_balance_minor + order.amount_minor;
      const updatedWalletRows = await this.query<WalletRow>(
        client,
        `UPDATE public.wallets SET available_balance_minor = $2, updated_at = now()
         WHERE id = $1 AND business_id = $3
         RETURNING id, business_id, currency, available_balance_minor, reserved_balance_minor,
                   status, created_at, updated_at`,
        [wallet.id, balance, businessId]
      );
      const paymentRows = await this.query<PaymentOrderRow>(
        client,
        `UPDATE public.payment_orders
         SET status = 'paid', provider_payment_reference = $2, updated_at = now()
         WHERE id = $1 AND business_id = $3 AND status IN ('created', 'attempted')
         RETURNING id, business_id, provider, provider_order_reference, provider_payment_reference,
                   amount_minor, currency, status, idempotency_key, created_at, updated_at`,
        [order.id, params.paymentId, businessId]
      );
      if (!updatedWalletRows[0] || !paymentRows[0]) {
        throw new PostgresRepositoryError('Payment credit could not be committed.');
      }
      const transactions = await this.query<WalletTransactionRow>(
        client,
        `INSERT INTO public.wallet_transactions
           (id, business_id, wallet_id, transaction_type, direction, amount_minor, currency, status,
            idempotency_key, external_reference, description, resulting_balance_minor, metadata, created_at)
         VALUES ($1, $2, $3, 'topup', 'credit', $4, 'INR', 'completed', $5, $6, $7, $8, $9, now())
         RETURNING id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
                   status, idempotency_key, external_reference, call_id, description,
                   resulting_balance_minor, metadata, created_at`,
        [
          `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`,
          businessId,
          wallet.id,
          order.amount_minor,
          idempotencyKey,
          params.paymentId,
          params.description ?? `Prepaid Usage Wallet Recharge (Ref: ${params.paymentId})`,
          balance,
          JSON.stringify({ order_id: order.provider_order_reference, payment_id: params.paymentId }),
        ]
      );
      const notification = await this.query(
        client,
        `INSERT INTO public.wallet_notifications (id, business_id, type, title, message, read, created_at)
         VALUES ($1, $2, 'topup_success', 'Recharge Successful', $3, FALSE, now())
         RETURNING id`,
        [
          uuidv4(),
          businessId,
          `₹${(order.amount_minor / 100).toFixed(2)} credited. Available balance: ₹${(balance / 100).toFixed(2)}.`,
        ]
      );
      if (!transactions[0] || !notification[0]) {
        throw new PostgresRepositoryError('Payment credit could not be committed.');
      }
      return {
        success: true,
        transaction: mapWalletTransaction(transactions[0]),
        wallet: mapWallet(updatedWalletRows[0]),
      };
    });
  }

  async reserveCallUsage(
    businessId: string,
    callId: string,
    estimatedMinutes = 1
  ): Promise<{
    allowed: boolean;
    reservationId?: string;
    reservedAmountMinor?: number;
    reason?: string;
    mode: string;
  }> {
    if (!Number.isSafeInteger(estimatedMinutes) || estimatedMinutes < 1) {
      throw new PostgresRepositoryError('Estimated call minutes must be a positive whole number.');
    }
    return this.transaction(async (client) => {
      const config = await this.lockBilling(client, businessId);
      const walletRow = await this.lockWallet(client, businessId);
      const active = await this.query<QueryResultRow & { id: string; reserved_amount_minor: string | number }>(
        client,
        `SELECT id, reserved_amount_minor FROM public.wallet_reservations
         WHERE business_id = $1 AND call_id = $2 AND status = 'active'
         LIMIT 1 FOR UPDATE`,
        [businessId, callId]
      );
      if (active[0]) {
        return {
          allowed: true,
          reservationId: active[0].id,
          reservedAmountMinor: numeric(active[0].reserved_amount_minor),
          mode: numeric(active[0].reserved_amount_minor) === 0 ? 'subscription_included_minutes' : 'prepaid_wallet',
        };
      }
      const settled = await this.query<QueryResultRow>(
        client,
        `SELECT 1 FROM public.wallet_reservations
         WHERE business_id = $1 AND call_id = $2 AND status = 'settled'
         LIMIT 1`,
        [businessId, callId]
      );
      if (settled.length) {
        throw new PostgresRepositoryError('A settled call cannot be reserved again.');
      }
      if (config.billing_mode === 'subscription_plus_wallet' &&
          config.included_minutes_used < config.included_minutes) {
        const pendingIncluded = await this.query<QueryResultRow>(
          client,
          `SELECT 1 FROM public.wallet_reservations
           WHERE business_id = $1 AND status = 'active' AND reserved_amount_minor = 0
           LIMIT 1`,
          [businessId]
        );
        if (pendingIncluded.length) {
          return {
            allowed: false,
            reason: 'Another call is using the remaining included-minute allowance.',
            mode: 'subscription_included_minutes',
          };
        }
        const reservationId = uuidv4();
        await this.query(
          client,
          `INSERT INTO public.wallet_reservations
             (id, business_id, wallet_id, call_id, reserved_amount_minor, settled_amount_minor,
              status, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, 0, 'active', now() + interval '30 minutes', now(), now())`,
          [reservationId, businessId, walletRow.id, callId]
        );
        return { allowed: true, reservationId, reservedAmountMinor: 0, mode: 'subscription_included_minutes' };
      }
      const needed = numeric(config.usage_rate_per_minute_minor) * estimatedMinutes;
      if (walletRow.status !== 'active' || numeric(walletRow.available_balance_minor) < needed) {
        await this.insertNotification(client, businessId, {
          type: 'call_blocked_insufficient_funds',
          title: 'Call Prevented: Low Balance',
          message: 'Available wallet balance is insufficient to reserve this call.',
        });
        return {
          allowed: false,
          reason: 'Insufficient wallet balance to reserve the estimated call usage.',
          mode: 'prepaid_wallet',
        };
      }
      const balance = numeric(walletRow.available_balance_minor) - needed;
      await this.query(
        client,
        `UPDATE public.wallets
         SET available_balance_minor = $2, reserved_balance_minor = reserved_balance_minor + $3, updated_at = now()
         WHERE id = $1 AND business_id = $4`,
        [walletRow.id, balance, needed, businessId]
      );
      const reservationId = uuidv4();
      await this.query(
        client,
        `INSERT INTO public.wallet_reservations
           (id, business_id, wallet_id, call_id, reserved_amount_minor, settled_amount_minor,
            status, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, 'active', now() + interval '30 minutes', now(), now())`,
        [reservationId, businessId, walletRow.id, callId, needed]
      );
      return { allowed: true, reservationId, reservedAmountMinor: needed, mode: 'prepaid_wallet' };
    });
  }

  async settleCallUsage(
    businessId: string,
    callId: string,
    durationSeconds: number,
    callStatus = 'completed'
  ): Promise<{
    billedAmountMinor: number;
    billedMinutes: number;
    mode: string;
    transaction?: WalletTransaction;
    wallet: Wallet;
    autoTopUpTriggered?: boolean;
  }> {
    if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 0) {
      throw new PostgresRepositoryError('Call duration must be a non-negative whole number of seconds.');
    }
    return this.transaction(async (client) => {
      const config = await this.lockBilling(client, businessId);
      const walletRow = await this.lockWallet(client, businessId);
      const wallet = mapWallet(walletRow);
      const idempotencyKey = `ik_call_settle_${businessId}_${callId}`;
      const existing = await this.query<WalletTransactionRow>(
        client,
        `SELECT id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
                status, idempotency_key, external_reference, call_id, description,
                resulting_balance_minor, metadata, created_at
         FROM public.wallet_transactions WHERE idempotency_key = $1 LIMIT 1`,
        [idempotencyKey]
      );
      if (existing[0]) {
        const pendingReservations = await this.query(
          client,
          `SELECT id FROM public.wallet_reservations
           WHERE business_id = $1 AND call_id = $2 AND status = 'active'
           LIMIT 1`,
          [businessId, callId]
        );
        if (pendingReservations.length) {
          throw new PostgresRepositoryError('A settled call has an unexpected active reservation.');
        }
        return {
          billedAmountMinor: numeric(existing[0].amount_minor),
          billedMinutes: Number((Number(existing[0].metadata?.billable_minutes ?? 0))),
          mode: 'already_settled',
          transaction: mapWalletTransaction(existing[0]),
          wallet,
        };
      }
      const reservationRows = await this.query<QueryResultRow & {
        id: string;
        wallet_id: string;
        reserved_amount_minor: number | string;
        status: string;
      }>(
        client,
        `SELECT id, wallet_id, reserved_amount_minor, status
         FROM public.wallet_reservations
         WHERE business_id = $1 AND call_id = $2 AND status = 'active'
         LIMIT 1 FOR UPDATE`,
        [businessId, callId]
      );
      const reservation = reservationRows[0];
      if (!reservation) throw new PostgresRepositoryError('Active call reservation not found.');
      if (reservation.wallet_id !== wallet.id) throw new PostgresRepositoryError('Call reservation wallet mismatch.');
      const reserved = numeric(reservation.reserved_amount_minor);
      if (reserved > 0) {
        await this.query(
          client,
          `UPDATE public.wallets
           SET available_balance_minor = available_balance_minor + $2,
               reserved_balance_minor = reserved_balance_minor - $2, updated_at = now()
           WHERE id = $1 AND business_id = $3`,
          [wallet.id, reserved, businessId]
        );
        wallet.available_balance_minor += reserved;
        wallet.reserved_balance_minor -= reserved;
      }
      const seconds = Math.max(0, durationSeconds);
      const isUnanswered = ['no_answer', 'busy', 'failed'].includes(callStatus);
      if (isUnanswered && !config.charge_unanswered_calls && seconds < 10) {
        await this.query(
          client,
          `UPDATE public.wallet_reservations
           SET settled_amount_minor = 0, status = 'settled', updated_at = now()
           WHERE id = $1 AND business_id = $2`,
          [reservation.id, businessId]
        );
        const freshWallet = await this.getWalletInTransaction(client, businessId);
        return { billedAmountMinor: 0, billedMinutes: 0, mode: 'waived_unanswered', wallet: freshWallet };
      }
      const billableMinutes = seconds === 0
        ? 0
        : Math.ceil(seconds / config.call_duration_rounding_seconds) *
          (config.call_duration_rounding_seconds / 60);
      const includedAvailable = config.billing_mode === 'subscription_plus_wallet'
        ? Math.max(0, config.included_minutes - config.included_minutes_used)
        : 0;
      const includedUsed = Math.min(includedAvailable, billableMinutes);
      const overageMinutes = billableMinutes - includedUsed;
      const billed = Math.round(overageMinutes * numeric(config.usage_rate_per_minute_minor));
      if (billed > reserved || billed > wallet.available_balance_minor) {
        throw new PostgresRepositoryError('Final usage exceeds the reserved wallet amount; settlement was rejected to prevent an unreserved debit.');
      }
      if (includedUsed > 0) {
        await this.query(
          client,
          `UPDATE public.billing_configs
           SET included_minutes_used = included_minutes_used + $2, updated_at = now()
           WHERE business_id = $1`,
          [businessId, includedUsed]
        );
      }
      wallet.available_balance_minor -= billed;
      wallet.updated_at = new Date().toISOString();
      const updatedWalletRows = await this.query<WalletRow>(
        client,
        `UPDATE public.wallets SET available_balance_minor = $2, updated_at = now()
         WHERE id = $1 AND business_id = $3
         RETURNING id, business_id, currency, available_balance_minor, reserved_balance_minor,
                   status, created_at, updated_at`,
        [wallet.id, wallet.available_balance_minor, businessId]
      );
      if (!updatedWalletRows[0]) throw new PostgresRepositoryError('Wallet settlement failed.');
      const txRows = billed > 0
        ? await this.query<WalletTransactionRow>(
            client,
            `INSERT INTO public.wallet_transactions
               (id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
                status, idempotency_key, call_id, description, resulting_balance_minor, metadata, created_at)
             VALUES ($1, $2, $3, 'call_usage', 'debit', $4, 'INR', 'completed', $5, $6, $7, $8, $9, now())
             RETURNING id, business_id, wallet_id, transaction_type, direction, amount_minor, currency,
                       status, idempotency_key, external_reference, call_id, description,
                       resulting_balance_minor, metadata, created_at`,
            [
              `TXN-CALL-${uuidv4().slice(0, 12).toUpperCase()}`,
              businessId,
              wallet.id,
              billed,
              idempotencyKey,
              callId,
              `AI call usage: ${billableMinutes} billable minutes`,
              wallet.available_balance_minor,
              JSON.stringify({ duration_seconds: seconds, billable_minutes: billableMinutes }),
            ]
          )
        : [];
      await this.query(
        client,
        `UPDATE public.wallet_reservations
         SET settled_amount_minor = $2, status = 'settled', updated_at = now()
         WHERE id = $1 AND business_id = $3`,
        [reservation.id, Math.min(billed, reserved), businessId]
      );
      return {
        billedAmountMinor: billed,
        billedMinutes: billableMinutes,
        mode: includedUsed > 0
          ? (overageMinutes > 0 ? 'plan_overage_wallet' : 'subscription_included_minutes')
          : 'prepaid_wallet',
        ...(txRows[0] ? { transaction: mapWalletTransaction(txRows[0]) } : {}),
        wallet: mapWallet(updatedWalletRows[0]),
      };
    });
  }

  async releaseCallReservation(businessId: string, callId: string): Promise<void> {
    await this.transaction(async (client) => {
      const reservations = await this.query<QueryResultRow & {
        id: string;
        wallet_id: string;
        reserved_amount_minor: number | string;
      }>(
        client,
        `SELECT id, wallet_id, reserved_amount_minor
         FROM public.wallet_reservations
         WHERE business_id = $1 AND call_id = $2 AND status = 'active'
         LIMIT 1 FOR UPDATE`,
        [businessId, callId]
      );
      const reservation = reservations[0];
      if (!reservation) return;
      const wallet = await this.lockWallet(client, businessId);
      const amount = numeric(reservation.reserved_amount_minor);
      if (amount > 0) {
        await this.query(
          client,
          `UPDATE public.wallets
           SET available_balance_minor = available_balance_minor + $2,
               reserved_balance_minor = reserved_balance_minor - $2, updated_at = now()
           WHERE id = $1 AND business_id = $3`,
          [wallet.id, amount, businessId]
        );
      }
      await this.query(
        client,
        `UPDATE public.wallet_reservations SET status = 'released', updated_at = now()
         WHERE id = $1 AND business_id = $2 AND status = 'active'`,
        [reservation.id, businessId]
      );
    });
  }

  async getWalletNotifications(
    businessId: string,
    unreadOnly = false
  ): Promise<WalletNotification[]> {
    const rows = await this.query<NotificationRow>(
      this.pool,
      `SELECT id, business_id, type, title, message, read, created_at
       FROM public.wallet_notifications
       WHERE business_id = $1 AND ($2::boolean = FALSE OR read = FALSE)
       ORDER BY created_at DESC`,
      [businessId, unreadOnly]
    );
    return rows.map(mapNotification);
  }

  async markNotificationRead(id: string, businessId: string): Promise<void> {
    await this.query(
      this.pool,
      `UPDATE public.wallet_notifications SET read = TRUE
       WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
  }

  async addWalletNotification(
    businessId: string,
    notification: Omit<WalletNotification, 'id' | 'business_id' | 'created_at' | 'read'>
  ): Promise<WalletNotification> {
    const rows = await this.query<NotificationRow>(
      this.pool,
      `INSERT INTO public.wallet_notifications
         (id, business_id, type, title, message, read, created_at)
       SELECT $1, id, $3, $4, $5, FALSE, now()
       FROM public.businesses WHERE id = $2
       RETURNING id, business_id, type, title, message, read, created_at`,
      [uuidv4(), businessId, notification.type, notification.title, notification.message]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Business not found.');
    return mapNotification(rows[0]);
  }

  async getDailyUsageMetrics(
    businessId: string,
    days = 14
  ): Promise<{ date: string; credits: number; minutes: number; callCount: number }[]> {
    if (!Number.isSafeInteger(days) || days < 1 || days > 366) {
      throw new PostgresRepositoryError('Usage range must be between 1 and 366 days.');
    }
    const rows = await this.query<QueryResultRow & {
      date_key: string;
      duration_seconds: number | string;
      call_count: number | string;
      billed_minor: number | string;
    }>(
      this.pool,
      `WITH days AS (
         SELECT generate_series(current_date - ($2::integer - 1), current_date, interval '1 day')::date AS day
       ), daily_calls AS (
         SELECT created_at::date AS day, sum(duration_seconds) AS duration_seconds, count(*) AS call_count
         FROM public.call_records
         WHERE business_id = $1 AND is_demo = FALSE AND telephony_call_sid <> ''
           AND telephony_call_sid !~* '^test[-_]'
           AND caller_number NOT ILIKE '%(Interactive Test)%'
           AND created_at >= current_date - ($2::integer - 1)
         GROUP BY created_at::date
       ), daily_billing AS (
         SELECT transaction.created_at::date AS day, sum(transaction.amount_minor) AS billed_minor
         FROM public.wallet_transactions AS transaction
         INNER JOIN public.call_records AS call
           ON call.id = transaction.call_id AND call.business_id = transaction.business_id
         WHERE transaction.business_id = $1 AND transaction.transaction_type = 'call_usage'
           AND transaction.direction = 'debit' AND transaction.status = 'completed'
           AND call.is_demo = FALSE AND call.telephony_call_sid <> ''
           AND call.telephony_call_sid !~* '^test[-_]'
           AND call.caller_number NOT ILIKE '%(Interactive Test)%'
           AND transaction.created_at >= current_date - ($2::integer - 1)
         GROUP BY transaction.created_at::date
       )
       SELECT to_char(days.day, 'YYYY-MM-DD') AS date_key,
              COALESCE(daily_calls.duration_seconds, 0) AS duration_seconds,
              COALESCE(daily_calls.call_count, 0) AS call_count,
              COALESCE(daily_billing.billed_minor, 0) AS billed_minor
       FROM days
       LEFT JOIN daily_calls ON daily_calls.day = days.day
       LEFT JOIN daily_billing ON daily_billing.day = days.day
       ORDER BY days.day`,
      [businessId, days]
    );
    return rows.map((row) => {
      const duration = numeric(row.duration_seconds);
      return {
        date: new Date(`${row.date_key}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        credits: numeric(row.billed_minor) / 100,
        minutes: Math.round((duration / 60) * 10) / 10,
        callCount: numeric(row.call_count),
      };
    });
  }

  private async lockWallet(client: PoolClient, businessId: string): Promise<WalletRow> {
    const now = new Date().toISOString();
    await this.query(
      client,
      `INSERT INTO public.wallets (id, business_id, currency, created_at, updated_at)
       SELECT $1, id, 'INR', $2, $2 FROM public.businesses WHERE id = $3
       ON CONFLICT (business_id) DO NOTHING`,
      [uuidv4(), now, businessId]
    );
    const rows = await this.query<WalletRow>(
      client,
      `SELECT id, business_id, currency, available_balance_minor, reserved_balance_minor,
              status, created_at, updated_at
       FROM public.wallets WHERE business_id = $1 FOR UPDATE`,
      [businessId]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Business not found.');
    return rows[0];
  }

  private async getWalletInTransaction(client: PoolClient, businessId: string): Promise<Wallet> {
    const rows = await this.query<WalletRow>(
      client,
      `SELECT id, business_id, currency, available_balance_minor, reserved_balance_minor,
              status, created_at, updated_at
       FROM public.wallets WHERE business_id = $1`,
      [businessId]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Wallet not found.');
    return mapWallet(rows[0]);
  }

  private async lockBilling(client: PoolClient, businessId: string): Promise<BillingConfig> {
    const businesses = await this.query<Pick<BusinessRow, 'id' | 'plan_tier'>>(
      client,
      `SELECT id, plan_tier FROM public.businesses WHERE id = $1`,
      [businessId]
    );
    if (!businesses[0]) throw new PostgresRepositoryError('Business not found.');
    const defaults = businesses[0].plan_tier === 'starter'
      ? { rate: 700, minutes: 100 }
      : businesses[0].plan_tier === 'enterprise'
        ? { rate: 475, minutes: 1500 }
        : { rate: 550, minutes: 500 };
    await this.query(
      client,
      `INSERT INTO public.billing_configs
         (id, business_id, usage_rate_per_minute_minor, included_minutes, updated_at)
       VALUES ($1, $2, $3, $4, now()) ON CONFLICT (business_id) DO NOTHING`,
      [uuidv4(), businessId, defaults.rate, defaults.minutes]
    );
    const rows = await this.query<BillingRow>(
      client,
      `SELECT id, business_id, billing_mode, usage_rate_per_minute_minor, included_minutes,
              included_minutes_used, minimum_recharge_minor, low_balance_alert_threshold_minor,
              call_duration_rounding_seconds, charge_unanswered_calls, gst_tax_rate_percent,
              last_updated_by, updated_at
       FROM public.billing_configs WHERE business_id = $1 FOR UPDATE`,
      [businessId]
    );
    if (!rows[0]) throw new PostgresRepositoryError('Billing configuration is unavailable.');
    return mapBilling(rows[0]);
  }

  private async insertNotification(
    client: PoolClient,
    businessId: string,
    notification: Pick<WalletNotification, 'type' | 'title' | 'message'>
  ): Promise<void> {
    await this.query(
      client,
      `INSERT INTO public.wallet_notifications
         (id, business_id, type, title, message, read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, now())`,
      [uuidv4(), businessId, notification.type, notification.title, notification.message]
    );
  }

  private async insertAgentConfig(
    client: PoolClient,
    config: AgentConfig
  ): Promise<AgentConfigRow[]> {
    return this.query<AgentConfigRow>(
      client,
      `INSERT INTO public.agent_configurations
         (id, agent_id, business_id, greeting, instructions, objectives, supported_languages,
          voice_id, voice_name, voice_settings, max_duration_seconds, transfer_enabled,
          transfer_phone, transfer_conditions, callback_instructions, contact_fields_to_collect,
          business_faqs, agent_plan, webhook_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id, agent_id, business_id, greeting, instructions, objectives,
                 supported_languages, voice_id, voice_name, voice_settings,
                 max_duration_seconds, transfer_enabled, transfer_phone,
                 transfer_conditions, callback_instructions, contact_fields_to_collect,
                 business_faqs, agent_plan, webhook_url, created_at, updated_at`,
      [
        config.id,
        config.agent_id,
        config.business_id,
        config.greeting,
        config.instructions,
        config.objectives,
        JSON.stringify(config.supported_languages),
        config.voice_id,
        config.voice_name,
        JSON.stringify(config.voice_settings),
        config.max_duration_seconds,
        config.transfer_enabled,
        config.transfer_phone,
        config.transfer_conditions,
        config.callback_instructions,
        JSON.stringify(config.contact_fields_to_collect),
        JSON.stringify(config.business_faqs),
        config.agent_plan == null ? null : JSON.stringify(config.agent_plan),
        config.webhook_url,
        config.created_at,
        config.updated_at,
      ]
    );
  }

  private makeAgentConfig(
    agentId: string,
    businessId: string,
    agentName: string,
    updates: Partial<AgentConfig>,
    id: string,
    now: string,
    blankGreeting = false
  ): AgentConfig {
    return {
      id,
      agent_id: agentId,
      business_id: businessId,
      greeting: updates.greeting || (blankGreeting ? '' : `Hello, thank you for calling ${agentName}. How can I help you today?`),
      instructions: updates.instructions || (blankGreeting ? '' : 'Answer caller questions politely and concisely.'),
      objectives: updates.objectives || (blankGreeting ? '' : 'Help the caller and collect contact information.'),
      supported_languages: updates.supported_languages || ['en-US'],
      voice_id: updates.voice_id || '21m00Tcm4TlvDq8ikWAM',
      voice_name: updates.voice_name || (blankGreeting ? 'Rachel' : 'Rachel (Professional)'),
      voice_settings: updates.voice_settings || { stability: 0.6, similarity_boost: 0.75 },
      max_duration_seconds: updates.max_duration_seconds || 300,
      transfer_enabled: updates.transfer_enabled || false,
      transfer_phone: updates.transfer_phone || '',
      transfer_conditions: updates.transfer_conditions || '',
      callback_instructions: updates.callback_instructions || '',
      contact_fields_to_collect: updates.contact_fields_to_collect || [],
      business_faqs: updates.business_faqs || [],
      ...(updates.agent_plan === undefined ? {} : { agent_plan: updates.agent_plan }),
      webhook_url: updates.webhook_url || '',
      created_at: now,
      updated_at: now,
    };
  }
}
