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

export type DatabaseResult<T> = T | Promise<T>;

export interface CoreDatabaseRepository {
  getUserByEmail(email: string): DatabaseResult<User | undefined>;
  getUserById(id: string): DatabaseResult<User | undefined>;
  createUser(payload: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
  }): DatabaseResult<{ user: User; business: Business }>;
  getBusiness(businessId: string): DatabaseResult<Business | undefined>;
  updateBusiness(businessId: string, updates: Partial<Business>): DatabaseResult<Business>;
  getAgents(businessId: string): DatabaseResult<Agent[]>;
  getAgentById(agentId: string, businessId: string): DatabaseResult<Agent | undefined>;
  assignInboundPhone(businessId: string, agentId: string, phoneNumber: string): DatabaseResult<Agent>;
  getActiveInboundAgentByPhoneNumber(
    phoneNumber: string
  ): DatabaseResult<{ agent: Agent; config: AgentConfig } | undefined>;
  clearInboundPhone(businessId: string, agentId: string): DatabaseResult<Agent>;
  createAgentWithConfig(
    businessId: string,
    agentData: { name: string; agent_type: AgentType; description: string; status?: AgentStatus },
    configData: Partial<AgentConfig>
  ): DatabaseResult<{ agent: Agent; config: AgentConfig }>;
  updateAgent(agentId: string, businessId: string, updates: Partial<Agent>): DatabaseResult<Agent>;
  deleteAgent(agentId: string, businessId: string): DatabaseResult<boolean>;
  getAgentConfig(agentId: string, businessId: string): DatabaseResult<AgentConfig | undefined>;
  saveAgentConfig(agentId: string, businessId: string, updates: Partial<AgentConfig>): DatabaseResult<AgentConfig>;
}

export interface DatabaseContract extends CoreDatabaseRepository {
  getCallRecords(
    businessId: string,
    filters?: { agentId?: string; status?: string; direction?: string; search?: string }
  ): DatabaseResult<CallRecord[]>;
  getCallRecordById(callId: string, businessId: string): DatabaseResult<CallRecord | undefined>;
  getCallRecordByTelephonySid(callSid: string): DatabaseResult<CallRecord | undefined>;
  updateCallRecordByTelephonySid(
    callSid: string,
    updates: Partial<Pick<CallRecord, 'duration_seconds' | 'status' | 'transcript' | 'summary' | 'recording_url'>>
  ): DatabaseResult<CallRecord | undefined>;
  createCallRecord(callData: Omit<CallRecord, 'id' | 'created_at'>): DatabaseResult<CallRecord>;
  createCallRecordIfNew(
    callData: Omit<CallRecord, 'id' | 'created_at'>
  ): DatabaseResult<{ call: CallRecord; created: boolean }>;
  getCallbacks(businessId: string, status?: string): DatabaseResult<CallbackItem[]>;
  createCallback(
    payload: Omit<CallbackItem, 'id' | 'created_at' | 'updated_at'>
  ): DatabaseResult<CallbackItem>;
  updateCallback(callbackId: string, businessId: string, updates: Partial<CallbackItem>): DatabaseResult<CallbackItem>;
  getIntegrations(businessId: string): DatabaseResult<IntegrationRecord[]>;
  updateIntegration(
    businessId: string,
    provider: IntegrationRecord['provider'],
    updates: Partial<IntegrationRecord>
  ): DatabaseResult<IntegrationRecord>;
  getDashboardStats(businessId: string): DatabaseResult<{
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
  }>;
  getCampaigns(businessId: string): DatabaseResult<Campaign[]>;
  createCampaign(payload: Omit<Campaign, 'id' | 'created_at'>): DatabaseResult<Campaign>;
  updateCampaign(id: string, businessId: string, updates: Partial<Campaign>): DatabaseResult<Campaign>;
  getLeads(businessId: string, status?: string): DatabaseResult<Lead[]>;
  updateLead(id: string, businessId: string, updates: Partial<Lead>): DatabaseResult<Lead>;
  getKnowledgeSources(businessId: string): DatabaseResult<KnowledgeSource[]>;
  addKnowledgeSource(payload: Omit<KnowledgeSource, 'id' | 'updated_at'>): DatabaseResult<KnowledgeSource>;
  getOnboarding(userId: string, businessId?: string): DatabaseResult<OnboardingData>;
  saveOnboarding(userId: string, data: Partial<OnboardingData>, businessId?: string): DatabaseResult<OnboardingData>;
  getWallet(businessId: string): DatabaseResult<Wallet>;
  getWalletTransactions(
    businessId: string,
    filter?: { type?: string; status?: string; search?: string; startDate?: string; endDate?: string }
  ): DatabaseResult<WalletTransaction[]>;
  getTransactionById(id: string, businessId: string): DatabaseResult<WalletTransaction | null>;
  getAutoTopUpSettings(businessId: string): DatabaseResult<AutoTopUpSettings>;
  updateAutoTopUpSettings(
    businessId: string,
    updates: Partial<AutoTopUpSettings>
  ): DatabaseResult<AutoTopUpSettings>;
  getBillingConfig(businessId: string): DatabaseResult<BillingConfig>;
  updateBillingConfig(
    businessId: string,
    updates: Partial<BillingConfig>,
    updatedBy: string
  ): DatabaseResult<BillingConfig>;
  createPaymentOrder(
    businessId: string,
    params: {
      amountMinor: number;
      idempotencyKey: string;
      providerOrderReference: string;
      provider?: PaymentOrder['provider'];
    }
  ): DatabaseResult<PaymentOrder>;
  verifyAndCreditPaymentOrder(
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
  ): DatabaseResult<{ success: boolean; transaction: WalletTransaction; wallet: Wallet }>;
  reserveCallUsage(
    businessId: string,
    callId: string,
    estimatedMinutes?: number
  ): DatabaseResult<{
    allowed: boolean;
    reservationId?: string;
    reservedAmountMinor?: number;
    reason?: string;
    mode: string;
  }>;
  settleCallUsage(
    businessId: string,
    callId: string,
    durationSeconds: number,
    callStatus?: string
  ): DatabaseResult<{
    billedAmountMinor: number;
    billedMinutes: number;
    mode: string;
    transaction?: WalletTransaction;
    wallet: Wallet;
    autoTopUpTriggered?: boolean;
  }>;
  releaseCallReservation(businessId: string, callId: string): DatabaseResult<void>;
  getWalletNotifications(businessId: string, unreadOnly?: boolean): DatabaseResult<WalletNotification[]>;
  markNotificationRead(id: string, businessId: string): DatabaseResult<void>;
  addWalletNotification(
    businessId: string,
    notification: Omit<WalletNotification, 'id' | 'business_id' | 'created_at' | 'read'>
  ): DatabaseResult<WalletNotification>;
  getDailyUsageMetrics(
    businessId: string,
    days?: number
  ): DatabaseResult<{ date: string; credits: number; minutes: number; callCount: number }[]>;
}
