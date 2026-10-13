import {
  Agent,
  AgentConfig,
  Business,
  CallbackItem,
  CallRecord,
  DashboardStats,
  ElevenLabsVoice,
  IntegrationRecord,
  User,
  Wallet,
  WalletTransaction,
  AutoTopUpSettings,
  BillingConfig,
  WalletOverviewData,
  WalletNotification,
} from '../types.ts';

const TOKEN_KEY = 'voxmitra_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; business: Business }> {
    const res = await request<{ token: string; user: User; business: Business }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: { email: string; password: string; fullName: string; businessName: string }): Promise<{ token: string; user: User; business: Business }> {
    const res = await request<{ token: string; user: User; business: Business }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; business: Business }> {
    return request<{ user: User; business: Business }>('/api/auth/me');
  },

  logout() {
    setStoredToken(null);
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/dashboard/stats');
  },

  // Business
  async getBusiness(): Promise<Business> {
    return request<Business>('/api/business');
  },

  async updateBusiness(data: Partial<Business>): Promise<Business> {
    return request<Business>('/api/business', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Agents
  async getAgents(): Promise<Agent[]> {
    return request<Agent[]>('/api/agents');
  },

  async getAgent(id: string): Promise<{ agent: Agent; config: AgentConfig }> {
    return request<{ agent: Agent; config: AgentConfig }>(`/api/agents/${id}`);
  },

  async createAgent(data: {
    name: string;
    agent_type: string;
    description: string;
    status?: string;
    config?: Partial<AgentConfig>;
  }): Promise<{ agent: Agent; config: AgentConfig }> {
    return request<{ agent: Agent; config: AgentConfig }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAgent(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/agents/${id}`, {
      method: 'DELETE',
    });
  },

  async getAgentConfig(id: string): Promise<AgentConfig> {
    return request<AgentConfig>(`/api/agents/${id}/config`);
  },

  async saveAgentConfig(id: string, config: Partial<AgentConfig>): Promise<AgentConfig> {
    return request<AgentConfig>(`/api/agents/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  // Test conversation
  async processTestTurn(
    agentId: string,
    payload: {
      conversationHistory: { speaker: string; text: string; timestamp: number }[];
      callerMessage: string;
      voiceId?: string;
    }
  ): Promise<{
    replyText: string;
    audioBase64?: string;
    isCompleted: boolean;
    shouldTransfer?: boolean;
    transferReason?: string;
    extractedFields: Record<string, string>;
    sentiment: 'positive' | 'neutral' | 'negative';
  }> {
    return request(`/api/agents/${agentId}/test-turn`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async saveTestCall(
    agentId: string,
    data: {
      durationSeconds: number;
      transcript: any[];
      summary: string;
      extractedData: Record<string, string>;
      status?: string;
      callerNumber?: string;
      direction?: 'inbound' | 'outbound';
      sentiment?: string;
    }
  ): Promise<CallRecord> {
    return request<CallRecord>(`/api/agents/${agentId}/save-test-call`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Calls
  async getCalls(filters?: { agentId?: string; status?: string; direction?: string; search?: string }): Promise<CallRecord[]> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append('agentId', filters.agentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.direction) params.append('direction', filters.direction);
    if (filters?.search) params.append('search', filters.search);
    return request<CallRecord[]>(`/api/calls?${params.toString()}`);
  },

  async getCall(id: string): Promise<CallRecord> {
    return request<CallRecord>(`/api/calls/${id}`);
  },

  // Callbacks
  async getCallbacks(status?: string): Promise<CallbackItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<CallbackItem[]>(`/api/callbacks${query}`);
  },

  async createCallback(payload: {
    customer_name: string;
    customer_phone: string;
    scheduled_time: string;
    notes: string;
    agent_id?: string;
  }): Promise<CallbackItem> {
    return request<CallbackItem>('/api/callbacks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCallback(id: string, updates: Partial<CallbackItem>): Promise<CallbackItem> {
    return request<CallbackItem>(`/api/callbacks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Voices
  async getVoices(apiKey?: string): Promise<{
    configured: boolean;
    provider: string;
    voices: ElevenLabsVoice[];
    supported_languages: { code: string; name: string; native: string }[];
    message?: string;
  }> {
    const query = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
    return request(`/api/elevenlabs/voices${query}`);
  },

  async synthesizeSpeech(voiceId: string, text: string, apiKey?: string): Promise<{ success: boolean; audioBase64?: string; error?: string }> {
    return request('/api/elevenlabs/synthesize', {
      method: 'POST',
      body: JSON.stringify({ voiceId, text, apiKey }),
    });
  },

  // Telephony
  async getTelephonyStatus(): Promise<{
    configured: boolean;
    provider: string;
    missingKeys: string[];
    details: Record<string, any>;
  }> {
    return request('/api/telephony/status');
  },

  async dispatchCall(agentId: string, toNumber: string): Promise<{
    success: boolean;
    callSid: string;
    status: string;
    message?: string;
  }> {
    return request('/api/telephony/dispatch', {
      method: 'POST',
      body: JSON.stringify({ agentId, toNumber }),
    });
  },

  // Integrations
  async getIntegrations(): Promise<IntegrationRecord[]> {
    return request<IntegrationRecord[]>('/api/integrations');
  },

  async updateIntegration(provider: string, data: Partial<IntegrationRecord>): Promise<IntegrationRecord> {
    return request<IntegrationRecord>(`/api/integrations/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Billing & Usage
  async getUsage(): Promise<any> {
    return request<any>('/api/usage');
  },

  // ---------------------------------------------------------------------------
  // WALLET, USAGE CREDITS & AUTO TOP-UP METHODS
  // ---------------------------------------------------------------------------
  async getWalletOverview(): Promise<WalletOverviewData> {
    return request<WalletOverviewData>('/api/wallet');
  },

  async getWalletTransactions(params?: {
    type?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; limit: number; offset: number; transactions: WalletTransaction[] }> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/wallet/transactions${qs}`);
  },

  async getTransaction(id: string): Promise<WalletTransaction> {
    return request<WalletTransaction>(`/api/wallet/transactions/${id}`);
  },

  async createPaymentOrder(
    amountINR: number,
    idempotencyKey?: string
  ): Promise<{
    orderId: string;
    amountMinor: number;
    amountINR: number;
    currency: string;
    keyId: string;
    isConfigured: boolean;
    company: string;
  }> {
    return request('/api/wallet/orders', {
      method: 'POST',
      body: JSON.stringify({ amountINR, idempotencyKey }),
    });
  },

  async verifyPayment(payload: {
    orderId: string;
    paymentId: string;
    signature?: string;
    idempotencyKey?: string;
    amountMinor: number;
    description?: string;
  }): Promise<{ success: boolean; transaction: WalletTransaction; wallet: Wallet }> {
    return request('/api/wallet/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAutoTopUpSettings(): Promise<AutoTopUpSettings> {
    return request<AutoTopUpSettings>('/api/wallet/autotopup');
  },

  async updateAutoTopUpSettings(settings: Partial<AutoTopUpSettings>): Promise<AutoTopUpSettings> {
    return request<AutoTopUpSettings>('/api/wallet/autotopup', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async authorizePaymentMandate(): Promise<{ success: boolean; settings: AutoTopUpSettings }> {
    return request('/api/wallet/mandate/authorize', {
      method: 'POST',
    });
  },

  async cancelPaymentMandate(): Promise<{ success: boolean; settings: AutoTopUpSettings }> {
    return request('/api/wallet/mandate', {
      method: 'DELETE',
    });
  },

  async getWalletNotifications(): Promise<WalletNotification[]> {
    return request<WalletNotification[]>('/api/wallet/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request(`/api/wallet/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async getBillingConfig(): Promise<BillingConfig> {
    return request<BillingConfig>('/api/billing/config');
  },

  async updateBillingConfig(data: Partial<BillingConfig>): Promise<BillingConfig> {
    return request<BillingConfig>('/api/billing/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Campaigns
  async getCampaigns(): Promise<any[]> {
    return request<any[]>('/api/campaigns');
  },

  async createCampaign(data: any): Promise<any> {
    return request<any>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCampaign(id: string, data: any): Promise<any> {
    return request<any>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Leads
  async getLeads(status?: string): Promise<any[]> {
    const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return request<any[]>(`/api/leads${q}`);
  },

  async updateLead(id: string, data: any): Promise<any> {
    return request<any>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Knowledge Base
  async getKnowledgeSources(): Promise<any[]> {
    return request<any[]>('/api/knowledge');
  },

  async addKnowledgeSource(data: any): Promise<any> {
    return request<any>('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Onboarding
  async getOnboarding(): Promise<any> {
    return request<any>('/api/onboarding');
  },

  async saveOnboarding(data: any): Promise<any> {
    return request<any>('/api/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
