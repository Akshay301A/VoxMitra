import type { AgentPlan } from './agents/agentPlan.types.ts';

export type AgentType = 'instant_lead' | 'bulk_caller' | 'inbound_receptionist';
export type AgentStatus = 'active' | 'paused' | 'draft';

export interface Business {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  phone_number: string;
  plan_tier: 'starter' | 'growth' | 'enterprise';
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ContactField {
  name: string;
  label: string;
  required: boolean;
  type: 'text' | 'phone' | 'email' | 'date' | 'select';
  options?: string[];
}

export interface Agent {
  id: string;
  business_id: string;
  name: string;
  agent_type: AgentType;
  description: string;
  status: AgentStatus;
  inbound_phone_number?: string;
  total_calls: number;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  agent_id: string;
  business_id: string;
  greeting: string;
  instructions: string;
  objectives: string;
  supported_languages: string[];
  voice_id: string;
  voice_name: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    speaking_rate?: number;
  };
  max_duration_seconds: number;
  transfer_enabled: boolean;
  transfer_phone: string;
  transfer_conditions: string;
  callback_instructions: string;
  contact_fields_to_collect: ContactField[];
  business_faqs: FAQItem[];
  agent_plan?: AgentPlan;
  elevenlabs_agent_id?: string;
  webhook_url: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptItem {
  speaker: 'agent' | 'caller' | 'system';
  text: string;
  timestamp: number;
}

export interface CallRecord {
  id: string;
  business_id: string;
  agent_id: string;
  agent_name?: string;
  direction: 'inbound' | 'outbound';
  caller_number: string;
  recipient_number: string;
  duration_seconds: number;
  status: 'completed' | 'failed' | 'busy' | 'no_answer' | 'in_progress' | 'transferred';
  transcript: TranscriptItem[];
  summary: string;
  extracted_data: Record<string, string>;
  sentiment: 'positive' | 'neutral' | 'negative';
  cost_usd: number;
  telephony_call_sid: string;
  recording_url?: string;
  is_demo: boolean;
  created_at: string;
}

export interface CallbackItem {
  id: string;
  business_id: string;
  agent_id?: string;
  customer_name: string;
  customer_phone: string;
  scheduled_time: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  agent_id: string;
  agent_name?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  total_contacts: number;
  completed_contacts: number;
  successful_calls: number;
  schedule_start?: string;
  calling_window?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  contact_name: string;
  phone: string;
  email?: string;
  source: string;
  qualification_status: 'new' | 'qualified' | 'unqualified' | 'follow_up_due';
  agent_name?: string;
  last_call_at?: string;
  next_action?: string;
  callback_date?: string;
  notes?: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  type: 'business_info' | 'faq' | 'document' | 'website';
  item_count?: number;
  status: 'active' | 'processing' | 'draft';
  updated_at: string;
  details?: string;
}

export interface IntegrationRecord {
  id: string;
  business_id: string;
  provider: 'elevenlabs' | 'exotel' | 'supabase' | 'webhook';
  is_enabled: boolean;
  config_meta: Record<string, any>;
  last_tested_at?: string;
}

export interface DashboardStats {
  totalCalls: number;
  answeredCalls: number;
  failedCalls: number;
  answerRatePercent: number;
  totalDurationSeconds: number;
  totalMinutes: number;
  activeAgentsCount: number;
  totalAgentsCount: number;
  pendingCallbacksCount: number;
  realCallsCount: number;
  demoCallsCount: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface OnboardingData {
  businessName: string;
  businessCategory: string;
  website?: string;
  location?: string;
  timezone?: string;
  goals?: string[];
  startingPoint?: 'agent' | 'dashboard';
  pendingAgentStart?: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  step: number;
  tourStep?: number;
  completed: boolean;
  tourCompleted: boolean;
  primaryUseCase?: 'inbound_receptionist' | 'instant_lead' | 'bulk_caller';
  preferredLanguage?: string;
  preferredVoice?: string;
}

// -----------------------------------------------------------------------------
// FINTECH WALLET & PREPAID USAGE CREDITS TYPES
// ₹1 = 1 Usage Credit. Minor units: Integer paise (100 paise = ₹1 = 1 credit)
// -----------------------------------------------------------------------------

export interface Wallet {
  id: string;
  business_id: string;
  currency: 'INR';
  available_balance_minor: number; // in paise
  reserved_balance_minor: number;  // in paise
  credits_balance?: number;        // ₹1 = 1 credit helper
  status: 'active' | 'frozen' | 'suspended';
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'topup'
  | 'call_usage'
  | 'autotopup'
  | 'refund'
  | 'reversal'
  | 'admin_adjustment';

export interface WalletTransaction {
  id: string;
  business_id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  direction: 'credit' | 'debit';
  amount_minor: number; // in paise
  currency: 'INR';
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  idempotency_key: string;
  external_reference?: string;
  call_id?: string;
  description: string;
  resulting_balance_minor: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WalletReservation {
  id: string;
  business_id: string;
  wallet_id: string;
  call_id: string;
  reserved_amount_minor: number;
  settled_amount_minor: number;
  status: 'active' | 'settled' | 'released' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AutoTopUpSettings {
  id: string;
  business_id: string;
  enabled: boolean;
  threshold_minor: number; // e.g. 10000 = ₹100, 20000 = ₹200, 50000 = ₹500
  recharge_amount_minor: number; // e.g. 50000 = ₹500, 100000 = ₹1000, 250000 = ₹2500
  monthly_cap_minor: number; // e.g. 500000 = ₹5000
  current_month_recharged_minor: number;
  payment_mandate_reference?: string;
  mandate_status: 'none' | 'pending_auth' | 'active' | 'failed' | 'cancelled';
  last_recharge_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrder {
  id: string;
  business_id: string;
  provider: 'razorpay' | 'manual';
  provider_order_reference: string;
  provider_payment_reference?: string;
  amount_minor: number;
  currency: 'INR';
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'expired';
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface BillingConfig {
  id: string;
  business_id: string;
  billing_mode: 'subscription_plus_wallet' | 'pure_prepaid';
  usage_rate_per_minute_minor: number; // e.g. 550 = ₹5.50/min for Growth
  included_minutes: number;
  included_minutes_used: number;
  minimum_recharge_minor: number;
  low_balance_alert_threshold_minor: number;
  call_duration_rounding_seconds: number;
  charge_unanswered_calls: boolean;
  gst_tax_rate_percent: number;
  last_updated_by?: string;
  updated_at: string;
}

export interface WalletNotification {
  id: string;
  business_id: string;
  type:
    | 'low_balance'
    | 'topup_success'
    | 'payment_failed'
    | 'autotopup_triggered'
    | 'autotopup_failed'
    | 'call_blocked_insufficient_funds';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DailyUsagePoint {
  date: string;
  credits: number;
  minutes: number;
  callCount: number;
}

export interface WalletOverviewData {
  wallet: Wallet;
  autoTopUp: AutoTopUpSettings;
  billingConfig: BillingConfig;
  todayUsageMinor: number;
  cycleUsageMinor: number;
  cycleMinutesConsumed: number;
  cycleCompletedCalls: number;
  estimatedRemainingMinutes: number;
  lastSuccessfulRechargeDate?: string;
  dailyUsage: DailyUsagePoint[];
  unreadNotificationsCount: number;
  recentTransactions: WalletTransaction[];
}
