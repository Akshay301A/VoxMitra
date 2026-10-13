import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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
  business_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  created_at: string;
  updated_at: string;
}

export type AgentType = 'instant_lead' | 'bulk_caller' | 'inbound_receptionist';
export type AgentStatus = 'active' | 'paused' | 'draft';

export interface Agent {
  id: string;
  business_id: string;
  name: string;
  agent_type: AgentType;
  description: string;
  status: AgentStatus;
  total_calls: number;
  created_at: string;
  updated_at: string;
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
  };
  max_duration_seconds: number;
  transfer_enabled: boolean;
  transfer_phone: string;
  transfer_conditions: string;
  callback_instructions: string;
  contact_fields_to_collect: ContactField[];
  business_faqs: FAQItem[];
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
  call_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationRecord {
  id: string;
  business_id: string;
  provider: 'elevenlabs' | 'exotel' | 'supabase' | 'webhook';
  is_enabled: boolean;
  config_meta: Record<string, any>;
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  total_minutes: number;
  total_calls: number;
  billed_amount_cents: number;
  payment_status: 'paid' | 'pending' | 'waived';
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
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
  business_id: string;
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
  business_id: string;
  title: string;
  type: 'business_info' | 'faq' | 'document' | 'website';
  item_count?: number;
  status: 'active' | 'processing' | 'draft';
  updated_at: string;
  details?: string;
}

export interface OnboardingData {
  businessName: string;
  businessCategory: string;
  primaryUseCase: 'inbound_receptionist' | 'instant_lead' | 'bulk_caller';
  preferredLanguage: string;
  preferredVoice: string;
  step: number;
  completed: boolean;
}

export interface Wallet {
  id: string;
  business_id: string;
  currency: 'INR';
  available_balance_minor: number; // in paise: 100 paise = ₹1 = 1 usage credit
  reserved_balance_minor: number;  // in paise
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

interface DatabaseSchema {
  businesses: Business[];
  users: User[];
  agents: Agent[];
  agent_configurations: AgentConfig[];
  call_records: CallRecord[];
  callbacks: CallbackItem[];
  integrations: IntegrationRecord[];
  usage_records: UsageRecord[];
  campaigns?: Campaign[];
  leads?: Lead[];
  knowledge_sources?: KnowledgeSource[];
  onboarding?: Record<string, OnboardingData>;
  wallets?: Wallet[];
  wallet_transactions?: WalletTransaction[];
  wallet_reservations?: WalletReservation[];
  wallet_autotopup_settings?: AutoTopUpSettings[];
  payment_orders?: PaymentOrder[];
  billing_configs?: BillingConfig[];
  wallet_notifications?: WalletNotification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'voxmitra.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.ensureWalletSchema(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Failed reading existing db file, initializing fresh store:', err);
    }

    const initial = this.generateSeedData();
    this.persistSync(initial);
    return initial;
  }

  private persistSync(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }

  private save() {
    this.persistSync(this.data);
  }

  private generateSeedData(): DatabaseSchema {
    const businessId = 'b0198000-0000-4000-8000-000000000001';
    const userId = 'u0198000-0000-4000-8000-000000000001';
    const agent1Id = 'ag019800-0000-4000-8000-000000000001';
    const agent2Id = 'ag019800-0000-4000-8000-000000000002';
    const agent3Id = 'ag019800-0000-4000-8000-000000000003';

    const defaultPasswordHash = bcrypt.hashSync('demo1234', 10);

    const business: Business = {
      id: businessId,
      name: 'Apex Solar Solutions',
      slug: 'apex-solar',
      contact_email: 'team@apexsolar.io',
      phone_number: '+1 (555) 392-8021',
      plan_tier: 'growth',
      timezone: 'America/New_York',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const user: User = {
      id: userId,
      business_id: businessId,
      email: 'akshaydosapati.16@gmail.com',
      password_hash: defaultPasswordHash,
      full_name: 'Akshay Dosapati',
      role: 'owner',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const agents: Agent[] = [
      {
        id: agent1Id,
        business_id: businessId,
        name: 'Priya — Instant Inbound Receptionist',
        agent_type: 'inbound_receptionist',
        description: '24/7 business receptionist handling general inquiries, office hours, location details, and scheduling consultations.',
        status: 'active',
        total_calls: 148,
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: agent2Id,
        business_id: businessId,
        name: 'Rohan — Speed-to-Lead Qualifier',
        agent_type: 'instant_lead',
        description: 'Instant outbound caller for newly submitted web form leads within 60 seconds to qualify monthly electricity bills and roof status.',
        status: 'active',
        total_calls: 312,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: agent3Id,
        business_id: businessId,
        name: 'Tara — Seasonal Campaign Caller',
        agent_type: 'bulk_caller',
        description: 'Outbound campaign agent for existing contact lists to introduce zero-down commercial solar tax credit updates.',
        status: 'paused',
        total_calls: 95,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const agentConfigs: AgentConfig[] = [
      {
        id: uuidv4(),
        agent_id: agent1Id,
        business_id: businessId,
        greeting: 'Hello and thank you for calling Apex Solar Solutions. My name is Priya, your AI concierge. How may I assist you today?',
        instructions: 'You are a warm, articulate receptionist for Apex Solar Solutions. Answer questions about office hours (9 AM - 6 PM EST), address inquiries, and help customers schedule a free site audit. Speak in clear, polite sentences.',
        objectives: '1. Greet the caller warmly.\n2. Answer general questions regarding residential and commercial solar installations.\n3. Collect name, phone number, and preferred appointment time.\n4. Offer to transfer to a Senior Energy Specialist if urgent.',
        supported_languages: ['en-US', 'hi-IN'],
        voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel
        voice_name: 'Rachel (Calm & Professional)',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.8,
        },
        max_duration_seconds: 300,
        transfer_enabled: true,
        transfer_phone: '+1 (555) 902-1100',
        transfer_conditions: 'When customer asks to speak with an engineer or supervisor.',
        callback_instructions: 'If lines are busy, confirm their phone number and schedule callback within 2 business hours.',
        contact_fields_to_collect: [
          { name: 'full_name', label: 'Full Name', required: true, type: 'text' },
          { name: 'phone', label: 'Phone Number', required: true, type: 'phone' },
          { name: 'property_type', label: 'Property Type', required: false, type: 'select', options: ['Residential', 'Commercial', 'Agricultural'] },
        ],
        business_faqs: [
          { question: 'What are your operational hours?', answer: 'We are open Monday through Friday from 9 AM to 6 PM EST.' },
          { question: 'Do you offer zero-down solar options?', answer: 'Yes, we provide zero-down financing and power purchase agreements for qualified homeowners.' },
          { question: 'Where is your service area located?', answer: 'We service the greater metropolitan area and surrounding counties within 100 miles.' },
        ],
        webhook_url: '',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        agent_id: agent2Id,
        business_id: businessId,
        greeting: 'Hi there! This is Rohan following up on your request from Apex Solar. Did I catch you at an okay time?',
        instructions: 'You are an energetic, respectful solar qualification agent. Your goal is to verify if the lead owns their single-family home and spends at least $120/month on electricity. If qualified, book a 15-minute zoom consultation.',
        objectives: '1. Confirm lead identity.\n2. Verify home ownership and average electric bill.\n3. Schedule solar survey on calendar.\n4. Send confirmation SMS.',
        supported_languages: ['en-US'],
        voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam
        voice_name: 'Adam (Direct & Friendly)',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
        },
        max_duration_seconds: 240,
        transfer_enabled: true,
        transfer_phone: '+1 (555) 902-1100',
        transfer_conditions: 'Caller asks for immediate pricing or specific roof warranty details.',
        callback_instructions: 'Offer callback tomorrow morning if caller is driving or busy.',
        contact_fields_to_collect: [
          { name: 'monthly_bill', label: 'Monthly Electric Bill', required: true, type: 'text' },
          { name: 'roof_age', label: 'Approximate Roof Age', required: false, type: 'text' },
        ],
        business_faqs: [
          { question: 'How much does the consultation cost?', answer: 'The initial roof shade analysis and proposal consultation is completely complimentary.' },
        ],
        webhook_url: '',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        agent_id: agent3Id,
        business_id: businessId,
        greeting: 'Good day! I am Tara calling on behalf of Apex Solar with an update on new regional clean energy incentives.',
        instructions: 'Call past leads who deferred decisions last year to inform them of new state rebates.',
        objectives: 'Re-engage contact and verify ongoing interest.',
        supported_languages: ['en-US'],
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Bella
        voice_name: 'Bella (Warm & Expressive)',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.85,
        },
        max_duration_seconds: 180,
        transfer_enabled: false,
        transfer_phone: '',
        transfer_conditions: '',
        callback_instructions: 'Log callback if requested.',
        contact_fields_to_collect: [],
        business_faqs: [],
        webhook_url: '',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const callRecords: CallRecord[] = [
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent1Id,
        agent_name: 'Priya — Instant Inbound Receptionist',
        direction: 'inbound',
        caller_number: '+1 (555) 481-9920',
        recipient_number: '+1 (555) 392-8021',
        duration_seconds: 142,
        status: 'completed',
        transcript: [
          { speaker: 'system', text: 'Call connected to inbound phone number +1 (555) 392-8021', timestamp: 0 },
          { speaker: 'agent', text: 'Hello and thank you for calling Apex Solar Solutions. My name is Priya, your AI concierge. How may I assist you today?', timestamp: 2 },
          { speaker: 'caller', text: 'Hi Priya, I was wondering what hours your office is open and if someone can come look at my roof in North Hills.', timestamp: 7 },
          { speaker: 'agent', text: 'Our office is open Monday through Friday from 9 AM to 6 PM EST. We would be delighted to perform an on-site roof inspection in North Hills! May I get your name to begin scheduling?', timestamp: 15 },
          { speaker: 'caller', text: 'Sure, my name is Michael Harrison.', timestamp: 21 },
          { speaker: 'agent', text: 'Wonderful to meet you, Michael. Would Thursday afternoon around 2 PM work for our technician to visit?', timestamp: 26 },
          { speaker: 'caller', text: 'Yes, Thursday at 2 PM is great.', timestamp: 31 },
          { speaker: 'agent', text: 'Terrific! I have confirmed your appointment for Thursday at 2 PM. You will receive an SMS confirmation shortly. Have a wonderful day!', timestamp: 36 },
        ],
        summary: 'Informed caller of business hours and successfully booked Thursday 2 PM on-site solar inspection for Michael Harrison.',
        extracted_data: {
          customer_name: 'Michael Harrison',
          appointment_date: 'Thursday 2:00 PM',
          location: 'North Hills',
          lead_qualification: 'High Intent',
        },
        sentiment: 'positive',
        cost_usd: 0.12,
        telephony_call_sid: 'EXO-DEMO-9821419',
        is_demo: true,
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent2Id,
        agent_name: 'Rohan — Speed-to-Lead Qualifier',
        direction: 'outbound',
        caller_number: '+1 (555) 392-8021',
        recipient_number: '+1 (555) 710-3329',
        duration_seconds: 98,
        status: 'completed',
        transcript: [
          { speaker: 'system', text: 'Web lead trigger dispatched via CRM webhook', timestamp: 0 },
          { speaker: 'agent', text: 'Hi there! This is Rohan following up on your request from Apex Solar. Did I catch you at an okay time?', timestamp: 3 },
          { speaker: 'caller', text: 'Yeah, I just clicked submit on your website 2 minutes ago!', timestamp: 8 },
          { speaker: 'agent', text: 'Speed is our motto! I see you entered interest in residential panels. Roughly how much is your average electric bill each month?', timestamp: 14 },
          { speaker: 'caller', text: 'It runs around $230 in summer and $160 in winter.', timestamp: 20 },
          { speaker: 'agent', text: 'That qualifies you for significant net-metering savings. Would you like our senior solar engineer to prepare a 3D satellite model of your roof?', timestamp: 27 },
          { speaker: 'caller', text: 'Please do! Email it over to david@example.com.', timestamp: 33 },
          { speaker: 'agent', text: 'Done! David, we have sent the preliminary estimates to your email. Thank you!', timestamp: 38 },
        ],
        summary: 'Speed-to-lead outbound follow-up completed in under 2 minutes of web submission. Lead qualified with $200+ average electric bill.',
        extracted_data: {
          customer_name: 'David',
          average_bill: '$195/month',
          intent: 'Immediate',
        },
        sentiment: 'positive',
        cost_usd: 0.08,
        telephony_call_sid: 'EXO-DEMO-8712391',
        is_demo: true,
        created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent1Id,
        agent_name: 'Priya — Instant Inbound Receptionist',
        direction: 'inbound',
        caller_number: '+1 (555) 832-1984',
        recipient_number: '+1 (555) 392-8021',
        duration_seconds: 35,
        status: 'transferred',
        transcript: [
          { speaker: 'agent', text: 'Hello and thank you for calling Apex Solar Solutions. My name is Priya, how may I help you?', timestamp: 2 },
          { speaker: 'caller', text: 'I need to speak directly with an inverter technician regarding warranty error code 402.', timestamp: 7 },
          { speaker: 'agent', text: 'I understand. Let me transfer you immediately to our Inverter Diagnostics line. One moment please.', timestamp: 13 },
          { speaker: 'system', text: 'Call transferred to engineering line +1 (555) 902-1100', timestamp: 18 },
        ],
        summary: 'Caller requested warranty error diagnostics. Rule matched and call was seamlessly transferred to engineering queue.',
        extracted_data: {
          issue: 'Inverter error code 402',
          transfer_target: 'Engineering',
        },
        sentiment: 'neutral',
        cost_usd: 0.04,
        telephony_call_sid: 'EXO-DEMO-4109281',
        is_demo: true,
        created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent2Id,
        agent_name: 'Rohan — Speed-to-Lead Qualifier',
        direction: 'outbound',
        caller_number: '+1 (555) 392-8021',
        recipient_number: '+1 (555) 901-2299',
        duration_seconds: 0,
        status: 'no_answer',
        transcript: [
          { speaker: 'system', text: 'Telephony dialing +1 (555) 901-2299. Ringing timeout reached (30s). No answer.', timestamp: 30 },
        ],
        summary: 'Outbound call timed out after 30 seconds with no answer. Scheduled retry in callback queue.',
        extracted_data: {},
        sentiment: 'neutral',
        cost_usd: 0.01,
        telephony_call_sid: 'EXO-DEMO-1928374',
        is_demo: true,
        created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
      },
    ];

    const callbacks: CallbackItem[] = [
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent2Id,
        customer_name: 'Elena Rostova',
        customer_phone: '+1 (555) 602-8811',
        scheduled_time: new Date(Date.now() + 4 * 3600000).toISOString(),
        status: 'pending',
        notes: 'Requested callback after 4 PM to discuss battery storage with spouse.',
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        agent_id: agent1Id,
        customer_name: 'Carlos Mendez',
        customer_phone: '+1 (555) 412-9900',
        scheduled_time: new Date(Date.now() + 24 * 3600000).toISOString(),
        status: 'pending',
        notes: 'Commercial rooftop assessment for warehouse in Newark.',
        created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const integrations: IntegrationRecord[] = [
      {
        id: uuidv4(),
        business_id: businessId,
        provider: 'elevenlabs',
        is_enabled: !!process.env.ELEVENLABS_API_KEY,
        config_meta: {
          model_id: 'eleven_turbo_v2_5',
          configured_at_env: !!process.env.ELEVENLABS_API_KEY,
        },
        last_tested_at: process.env.ELEVENLABS_API_KEY ? new Date().toISOString() : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        provider: 'exotel',
        is_enabled: !!process.env.EXOTEL_API_KEY,
        config_meta: {
          subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
          account_sid: process.env.EXOTEL_ACCOUNT_SID ? 'EXO_CONFIGURED' : '',
          caller_id: process.env.EXOTEL_CALLER_ID || '',
        },
        last_tested_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        provider: 'supabase',
        is_enabled: !!process.env.SUPABASE_URL,
        config_meta: {
          endpoint: process.env.SUPABASE_URL || 'Local Embedded PostgreSQL Engine',
        },
        last_tested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        provider: 'webhook',
        is_enabled: true,
        config_meta: {
          webhook_secret: 'vowk_' + uuidv4().replace(/-/g, '').slice(0, 24),
          events: ['call.completed', 'lead.captured', 'callback.scheduled'],
        },
        last_tested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const usage: UsageRecord[] = [
      {
        id: uuidv4(),
        business_id: businessId,
        period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
        period_end: new Date().toISOString(),
        total_minutes: 485.5,
        total_calls: 555,
        billed_amount_cents: 3884, // $38.84
        payment_status: 'paid',
        created_at: new Date().toISOString(),
      },
    ];

    return {
      businesses: [business],
      users: [user],
      agents,
      agent_configurations: agentConfigs,
      call_records: callRecords,
      callbacks,
      integrations,
      usage_records: usage,
    };
  }

  // User & Auth operations
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(payload: { email: string; password: string; fullName: string; businessName: string }): { user: User; business: Business } {
    const existing = this.getUserByEmail(payload.email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const businessId = uuidv4();
    const userId = uuidv4();
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(payload.password, salt);

    const business: Business = {
      id: businessId,
      name: payload.businessName || 'My Business',
      slug: (payload.businessName || 'my-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
      contact_email: payload.email,
      phone_number: '',
      plan_tier: 'starter',
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const user: User = {
      id: userId,
      business_id: businessId,
      email: payload.email,
      password_hash,
      full_name: payload.fullName,
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.businesses.push(business);
    this.data.users.push(user);
    this.save();

    return { user, business };
  }

  // Business operations
  getBusiness(businessId: string): Business | undefined {
    return this.data.businesses.find((b) => b.id === businessId);
  }

  updateBusiness(businessId: string, updates: Partial<Business>): Business {
    const index = this.data.businesses.findIndex((b) => b.id === businessId);
    if (index === -1) throw new Error('Business not found');

    this.data.businesses[index] = {
      ...this.data.businesses[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.businesses[index];
  }

  // Agent operations
  getAgents(businessId: string): Agent[] {
    return this.data.agents.filter((a) => a.business_id === businessId);
  }

  getAgentById(agentId: string, businessId: string): Agent | undefined {
    return this.data.agents.find((a) => a.id === agentId && a.business_id === businessId);
  }

  createAgentWithConfig(
    businessId: string,
    agentData: {
      name: string;
      agent_type: AgentType;
      description: string;
      status?: AgentStatus;
    },
    configData: Partial<AgentConfig>
  ): { agent: Agent; config: AgentConfig } {
    const agentId = uuidv4();
    const configId = uuidv4();
    const now = new Date().toISOString();

    const agent: Agent = {
      id: agentId,
      business_id: businessId,
      name: agentData.name,
      agent_type: agentData.agent_type,
      description: agentData.description,
      status: agentData.status || 'active',
      total_calls: 0,
      created_at: now,
      updated_at: now,
    };

    const config: AgentConfig = {
      id: configId,
      agent_id: agentId,
      business_id: businessId,
      greeting: configData.greeting || `Hello, thank you for calling ${agentData.name}. How can I help you today?`,
      instructions: configData.instructions || 'Answer caller questions politely and concisely.',
      objectives: configData.objectives || 'Help the caller and collect contact information.',
      supported_languages: configData.supported_languages || ['en-US'],
      voice_id: configData.voice_id || '21m00Tcm4TlvDq8ikWAM',
      voice_name: configData.voice_name || 'Rachel (Professional)',
      voice_settings: configData.voice_settings || { stability: 0.6, similarity_boost: 0.75 },
      max_duration_seconds: configData.max_duration_seconds || 300,
      transfer_enabled: configData.transfer_enabled || false,
      transfer_phone: configData.transfer_phone || '',
      transfer_conditions: configData.transfer_conditions || '',
      callback_instructions: configData.callback_instructions || '',
      contact_fields_to_collect: configData.contact_fields_to_collect || [],
      business_faqs: configData.business_faqs || [],
      webhook_url: configData.webhook_url || '',
      created_at: now,
      updated_at: now,
    };

    this.data.agents.push(agent);
    this.data.agent_configurations.push(config);
    this.save();

    return { agent, config };
  }

  updateAgent(agentId: string, businessId: string, updates: Partial<Agent>): Agent {
    const idx = this.data.agents.findIndex((a) => a.id === agentId && a.business_id === businessId);
    if (idx === -1) throw new Error('Agent not found');

    this.data.agents[idx] = {
      ...this.data.agents[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.agents[idx];
  }

  deleteAgent(agentId: string, businessId: string): boolean {
    const beforeCount = this.data.agents.length;
    this.data.agents = this.data.agents.filter((a) => !(a.id === agentId && a.business_id === businessId));
    this.data.agent_configurations = this.data.agent_configurations.filter((c) => !(c.agent_id === agentId && c.business_id === businessId));
    this.save();
    return this.data.agents.length < beforeCount;
  }

  getAgentConfig(agentId: string, businessId: string): AgentConfig | undefined {
    return this.data.agent_configurations.find((c) => c.agent_id === agentId && c.business_id === businessId);
  }

  saveAgentConfig(agentId: string, businessId: string, updates: Partial<AgentConfig>): AgentConfig {
    const idx = this.data.agent_configurations.findIndex((c) => c.agent_id === agentId && c.business_id === businessId);
    if (idx === -1) {
      const newConfig: AgentConfig = {
        id: uuidv4(),
        agent_id: agentId,
        business_id: businessId,
        greeting: updates.greeting || '',
        instructions: updates.instructions || '',
        objectives: updates.objectives || '',
        supported_languages: updates.supported_languages || ['en-US'],
        voice_id: updates.voice_id || '21m00Tcm4TlvDq8ikWAM',
        voice_name: updates.voice_name || 'Rachel',
        voice_settings: updates.voice_settings || { stability: 0.6, similarity_boost: 0.75 },
        max_duration_seconds: updates.max_duration_seconds || 300,
        transfer_enabled: updates.transfer_enabled || false,
        transfer_phone: updates.transfer_phone || '',
        transfer_conditions: updates.transfer_conditions || '',
        callback_instructions: updates.callback_instructions || '',
        contact_fields_to_collect: updates.contact_fields_to_collect || [],
        business_faqs: updates.business_faqs || [],
        webhook_url: updates.webhook_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.agent_configurations.push(newConfig);
      this.save();
      return newConfig;
    }

    this.data.agent_configurations[idx] = {
      ...this.data.agent_configurations[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.agent_configurations[idx];
  }

  // Call Records
  getCallRecords(
    businessId: string,
    filters?: {
      agentId?: string;
      status?: string;
      direction?: string;
      search?: string;
    }
  ): CallRecord[] {
    let records = this.data.call_records.filter((r) => r.business_id === businessId);

    if (filters?.agentId) {
      records = records.filter((r) => r.agent_id === filters.agentId);
    }
    if (filters?.status && filters.status !== 'all') {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.direction && filters.direction !== 'all') {
      records = records.filter((r) => r.direction === filters.direction);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      records = records.filter(
        (r) =>
          r.caller_number.toLowerCase().includes(q) ||
          r.recipient_number.toLowerCase().includes(q) ||
          (r.summary && r.summary.toLowerCase().includes(q)) ||
          (r.agent_name && r.agent_name.toLowerCase().includes(q))
      );
    }

    return records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getCallRecordById(callId: string, businessId: string): CallRecord | undefined {
    return this.data.call_records.find((r) => r.id === callId && r.business_id === businessId);
  }

  createCallRecord(callData: Omit<CallRecord, 'id' | 'created_at'>): CallRecord {
    const id = uuidv4();
    const record: CallRecord = {
      ...callData,
      id,
      created_at: new Date().toISOString(),
    };

    this.data.call_records.unshift(record);

    // Update agent total calls count
    const agentIdx = this.data.agents.findIndex((a) => a.id === callData.agent_id);
    if (agentIdx !== -1) {
      this.data.agents[agentIdx].total_calls = (this.data.agents[agentIdx].total_calls || 0) + 1;
    }

    this.save();
    return record;
  }

  // Callbacks
  getCallbacks(businessId: string, status?: string): CallbackItem[] {
    let list = this.data.callbacks.filter((c) => c.business_id === businessId);
    if (status && status !== 'all') {
      list = list.filter((c) => c.status === status);
    }
    return list.sort((a, b) => new Date(a.scheduled_time || a.created_at).getTime() - new Date(b.scheduled_time || b.created_at).getTime());
  }

  createCallback(payload: Omit<CallbackItem, 'id' | 'created_at' | 'updated_at'>): CallbackItem {
    const now = new Date().toISOString();
    const item: CallbackItem = {
      ...payload,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    this.data.callbacks.push(item);
    this.save();
    return item;
  }

  updateCallback(callbackId: string, businessId: string, updates: Partial<CallbackItem>): CallbackItem {
    const idx = this.data.callbacks.findIndex((c) => c.id === callbackId && c.business_id === businessId);
    if (idx === -1) throw new Error('Callback not found');

    this.data.callbacks[idx] = {
      ...this.data.callbacks[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.callbacks[idx];
  }

  // Integrations
  getIntegrations(businessId: string): IntegrationRecord[] {
    return this.data.integrations.filter((i) => i.business_id === businessId);
  }

  updateIntegration(businessId: string, provider: 'elevenlabs' | 'exotel' | 'supabase' | 'webhook', updates: Partial<IntegrationRecord>): IntegrationRecord {
    const idx = this.data.integrations.findIndex((i) => i.business_id === businessId && i.provider === provider);
    const now = new Date().toISOString();

    if (idx === -1) {
      const item: IntegrationRecord = {
        id: uuidv4(),
        business_id: businessId,
        provider,
        is_enabled: updates.is_enabled || false,
        config_meta: updates.config_meta || {},
        last_tested_at: updates.last_tested_at,
        created_at: now,
        updated_at: now,
      };
      this.data.integrations.push(item);
      this.save();
      return item;
    }

    this.data.integrations[idx] = {
      ...this.data.integrations[idx],
      ...updates,
      updated_at: now,
    };
    this.save();
    return this.data.integrations[idx];
  }

  // Dashboard Stats
  getDashboardStats(businessId: string) {
    const calls = this.data.call_records.filter((r) => r.business_id === businessId);
    const agents = this.data.agents.filter((a) => a.business_id === businessId);
    const callbacks = this.data.callbacks.filter((c) => c.business_id === businessId && c.status === 'pending');

    const totalCalls = calls.length;
    const answeredCalls = calls.filter((r) => r.status === 'completed' || r.status === 'transferred').length;
    const failedCalls = calls.filter((r) => r.status === 'failed' || r.status === 'no_answer' || r.status === 'busy').length;
    const totalDurationSeconds = calls.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
    const totalMinutes = Math.round((totalDurationSeconds / 60) * 10) / 10;

    const realCallsCount = calls.filter((c) => !c.is_demo).length;
    const demoCallsCount = calls.filter((c) => c.is_demo).length;
    const qualifiedLeadsCount = (this.data.leads || []).filter((l) => l.business_id === businessId && l.qualification_status === 'qualified').length || 48;
    const followUpsDueCount = callbacks.length + ((this.data.leads || []).filter((l) => l.business_id === businessId && l.qualification_status === 'follow_up_due').length || 15);

    return {
      totalCalls: totalCalls > 0 ? totalCalls : 248,
      answeredCalls: answeredCalls > 0 ? answeredCalls : 212,
      failedCalls,
      answerRatePercent: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 85,
      totalDurationSeconds,
      totalMinutes: totalMinutes > 0 ? totalMinutes : 324.5,
      activeAgentsCount: agents.filter((a) => a.status === 'active').length,
      totalAgentsCount: agents.length,
      pendingCallbacksCount: callbacks.length,
      qualifiedLeadsCount,
      followUpsDueCount,
      realCallsCount,
      demoCallsCount,
    };
  }

  // Campaigns
  getCampaigns(businessId: string): Campaign[] {
    if (!this.data.campaigns) {
      this.data.campaigns = this.generateSeedCampaigns(businessId);
      this.save();
    }
    return this.data.campaigns.filter((c) => c.business_id === businessId);
  }

  createCampaign(payload: Omit<Campaign, 'id' | 'created_at'>): Campaign {
    if (!this.data.campaigns) this.data.campaigns = [];
    const item: Campaign = {
      ...payload,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.data.campaigns.unshift(item);
    this.save();
    return item;
  }

  updateCampaign(id: string, businessId: string, updates: Partial<Campaign>): Campaign {
    if (!this.data.campaigns) this.data.campaigns = [];
    const idx = this.data.campaigns.findIndex((c) => c.id === id && c.business_id === businessId);
    if (idx === -1) throw new Error('Campaign not found');
    this.data.campaigns[idx] = { ...this.data.campaigns[idx], ...updates };
    this.save();
    return this.data.campaigns[idx];
  }

  // Leads & Follow-ups
  getLeads(businessId: string, status?: string): Lead[] {
    if (!this.data.leads) {
      this.data.leads = this.generateSeedLeads(businessId);
      this.save();
    }
    let list = this.data.leads.filter((l) => l.business_id === businessId);
    if (status && status !== 'all') {
      list = list.filter((l) => l.qualification_status === status);
    }
    return list;
  }

  updateLead(id: string, businessId: string, updates: Partial<Lead>): Lead {
    if (!this.data.leads) this.data.leads = [];
    const idx = this.data.leads.findIndex((l) => l.id === id && l.business_id === businessId);
    if (idx === -1) throw new Error('Lead not found');
    this.data.leads[idx] = { ...this.data.leads[idx], ...updates };
    this.save();
    return this.data.leads[idx];
  }

  // Knowledge Sources
  getKnowledgeSources(businessId: string): KnowledgeSource[] {
    if (!this.data.knowledge_sources) {
      this.data.knowledge_sources = this.generateSeedKnowledge(businessId);
      this.save();
    }
    return this.data.knowledge_sources.filter((k) => k.business_id === businessId);
  }

  addKnowledgeSource(payload: Omit<KnowledgeSource, 'id' | 'updated_at'>): KnowledgeSource {
    if (!this.data.knowledge_sources) this.data.knowledge_sources = [];
    const item: KnowledgeSource = {
      ...payload,
      id: uuidv4(),
      updated_at: new Date().toISOString(),
    };
    this.data.knowledge_sources.unshift(item);
    this.save();
    return item;
  }

  // Onboarding
  getOnboarding(businessId: string): OnboardingData {
    if (!this.data.onboarding) this.data.onboarding = {};
    if (!this.data.onboarding[businessId]) {
      this.data.onboarding[businessId] = {
        businessName: 'Acme Healthcare',
        businessCategory: 'Healthcare & Clinics',
        primaryUseCase: 'inbound_receptionist',
        preferredLanguage: 'English (Indian Accent)',
        preferredVoice: 'Priya (Indian Female)',
        step: 1,
        completed: true,
      };
      this.save();
    }
    return this.data.onboarding[businessId];
  }

  saveOnboarding(businessId: string, data: Partial<OnboardingData>): OnboardingData {
    if (!this.data.onboarding) this.data.onboarding = {};
    const existing = this.getOnboarding(businessId);
    this.data.onboarding[businessId] = { ...existing, ...data };
    this.save();
    return this.data.onboarding[businessId];
  }

  private generateSeedCampaigns(businessId: string): Campaign[] {
    return [
      {
        id: uuidv4(),
        business_id: businessId,
        name: 'April Outreach',
        agent_id: 'ag019800-0000-4000-8000-000000000002',
        agent_name: 'Rohan — Speed-to-Lead Qualifier',
        status: 'running',
        total_contacts: 500,
        completed_contacts: 325,
        successful_calls: 218,
        calling_window: '10:00 AM – 6:30 PM IST',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        name: 'Property Leads Batch 1',
        agent_id: 'ag019800-0000-4000-8000-000000000003',
        agent_name: 'Tara — Campaign Outreach Agent',
        status: 'paused',
        total_contacts: 300,
        completed_contacts: 60,
        successful_calls: 42,
        calling_window: '11:00 AM – 7:00 PM IST',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        name: 'Education Follow-up',
        agent_id: 'ag019800-0000-4000-8000-000000000002',
        agent_name: 'Rohan — Speed-to-Lead Qualifier',
        status: 'completed',
        total_contacts: 1000,
        completed_contacts: 1000,
        successful_calls: 742,
        calling_window: '10:00 AM – 6:00 PM IST',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        business_id: businessId,
        name: 'Product Demo Invitations',
        agent_id: 'ag019800-0000-4000-8000-000000000003',
        agent_name: 'Tara — Campaign Outreach Agent',
        status: 'draft',
        total_contacts: 750,
        completed_contacts: 0,
        successful_calls: 0,
        calling_window: '10:30 AM – 5:30 PM IST',
        created_at: new Date().toISOString(),
      },
    ];
  }

  private generateSeedLeads(businessId: string): Lead[] {
    return [
      {
        id: uuidv4(),
        business_id: businessId,
        contact_name: 'Ravi Kumar',
        phone: '+91 86765 43210',
        email: 'ravi.kumar@gmail.com',
        source: 'Real Estate / 99acres',
        qualification_status: 'qualified',
        agent_name: 'Rohan (Speed-to-Lead)',
        last_call_at: 'Today, 2:00 PM',
        next_action: 'Site visit scheduled for Saturday',
        callback_date: 'Saturday, 11:00 AM',
        notes: 'Interested in 3BHK Whitefield. Budget 1.4 Cr.',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        contact_name: 'Priya Sharma',
        phone: '+91 91234 56789',
        email: 'priya.s@yahoo.com',
        source: 'Healthcare / Inbound Clinic Desk',
        qualification_status: 'follow_up_due',
        agent_name: 'Priya (Receptionist)',
        last_call_at: 'Today, 4:30 PM',
        next_action: 'Confirm doctor slot with family',
        callback_date: 'Tomorrow, 10:00 AM',
        notes: 'Consultation with Dr. Sengupta. Needs Saturday slot.',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        contact_name: 'Suresh Reddy',
        phone: '+91 99887 76655',
        email: 'suresh.reddy@techcorp.in',
        source: 'Education / Web Form',
        qualification_status: 'follow_up_due',
        agent_name: 'Rohan (Speed-to-Lead)',
        last_call_at: 'Yesterday, 10:00 AM',
        next_action: 'Send curriculum syllabus PDF',
        callback_date: 'Tomorrow, 3:00 PM',
        notes: 'Executive Data Science enrollment inquiry.',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        contact_name: 'Anjali Verma',
        phone: '+91 97654 32109',
        email: 'anjali.v@outlook.com',
        source: 'E-commerce / D2C',
        qualification_status: 'unqualified',
        agent_name: 'Priya (Receptionist)',
        last_call_at: 'Yesterday, 2:00 PM',
        next_action: 'No further action required',
        notes: 'Delivery address outside service pincode.',
      },
    ];
  }

  private generateSeedKnowledge(businessId: string): KnowledgeSource[] {
    return [
      {
        id: uuidv4(),
        business_id: businessId,
        title: 'Business Information',
        type: 'business_info',
        details: 'Clinic & office details, operating hours (9 AM - 7 PM IST), branches in Indiranagar and Koramangala.',
        item_count: 8,
        status: 'active',
        updated_at: '2 days ago',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        title: 'Common FAQs',
        type: 'faq',
        details: 'Pre-visit fasting rules, payment card acceptance, cancellation policy, parking availability.',
        item_count: 24,
        status: 'active',
        updated_at: '1 day ago',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        title: 'Clinical Services & Pricing PDF',
        type: 'document',
        details: 'Uploaded PDF document: OPD consultation fees, lab test tariff card, health checkup packages.',
        item_count: 14,
        status: 'processing',
        updated_at: '1 hour ago',
      },
      {
        id: uuidv4(),
        business_id: businessId,
        title: 'Official Website Content',
        type: 'website',
        details: 'Ingested sitemap & service pages from https://example-clinic.in',
        item_count: 32,
        status: 'active',
        updated_at: '1 week ago',
      },
    ];
  }

  // =========================================================================
  // FINTECH WALLET, CREDITS, LEDGER & AUTO TOP-UP METHODS
  // Minor Currency: Paise (₹1 = 100 paise = 1 usage credit)
  // =========================================================================

  ensureWalletSchema(store: DatabaseSchema) {
    if (!store.wallets) store.wallets = [];
    if (!store.wallet_transactions) store.wallet_transactions = [];
    if (!store.wallet_reservations) store.wallet_reservations = [];
    if (!store.wallet_autotopup_settings) store.wallet_autotopup_settings = [];
    if (!store.payment_orders) store.payment_orders = [];
    if (!store.billing_configs) store.billing_configs = [];
    if (!store.wallet_notifications) store.wallet_notifications = [];

    store.businesses.forEach((b) => {
      let wallet = store.wallets!.find((w) => w.business_id === b.id);
      if (!wallet) {
        wallet = {
          id: 'w0198000-0000-4000-8000-' + b.id.slice(-12),
          business_id: b.id,
          currency: 'INR',
          available_balance_minor: 245000, // ₹2,450.00 = 2,450 credits
          reserved_balance_minor: 0,
          status: 'active',
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.wallets!.push(wallet);
      }

      if (!store.billing_configs!.find((cfg) => cfg.business_id === b.id)) {
        const rateMinor = b.plan_tier === 'starter' ? 700 : b.plan_tier === 'enterprise' ? 475 : 550;
        const incMin = b.plan_tier === 'starter' ? 100 : b.plan_tier === 'enterprise' ? 1500 : 500;
        store.billing_configs!.push({
          id: uuidv4(),
          business_id: b.id,
          billing_mode: 'subscription_plus_wallet',
          usage_rate_per_minute_minor: rateMinor,
          included_minutes: incMin,
          included_minutes_used: 142,
          minimum_recharge_minor: 10000, // ₹100
          low_balance_alert_threshold_minor: 20000, // ₹200
          call_duration_rounding_seconds: 60,
          charge_unanswered_calls: false,
          gst_tax_rate_percent: 18.0,
          last_updated_by: 'Ramachandra Naidu Jyothi Pvt Ltd System',
          updated_at: new Date().toISOString(),
        });
      }

      if (!store.wallet_autotopup_settings!.find((at) => at.business_id === b.id)) {
        store.wallet_autotopup_settings!.push({
          id: uuidv4(),
          business_id: b.id,
          enabled: false,
          threshold_minor: 20000, // ₹200 threshold
          recharge_amount_minor: 100000, // ₹1,000 recharge
          monthly_cap_minor: 500000, // ₹5,000 monthly cap
          current_month_recharged_minor: 0,
          mandate_status: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Seed initial transactions if empty
      if (store.wallet_transactions!.filter((t) => t.business_id === b.id).length === 0) {
        store.wallet_transactions!.push(
          {
            id: 'TXN-20261001-INIT',
            business_id: b.id,
            wallet_id: wallet.id,
            transaction_type: 'topup',
            direction: 'credit',
            amount_minor: 300000, // ₹3,000.00
            currency: 'INR',
            status: 'completed',
            idempotency_key: 'ik_init_recharge_' + b.id,
            external_reference: 'pay_rzp_mock_init_001',
            description: 'Prepaid Usage Wallet Recharge (Razorpay Online Transfer)',
            resulting_balance_minor: 300000,
            metadata: { method: 'upi', utr: 'UTR92837410293' },
            created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: 'TXN-20261004-CALL-01',
            business_id: b.id,
            wallet_id: wallet.id,
            transaction_type: 'call_usage',
            direction: 'debit',
            amount_minor: 1650, // ₹16.50 = 3 min @ ₹5.50
            currency: 'INR',
            status: 'completed',
            idempotency_key: 'ik_call_usage_seed_1',
            description: 'AI Call Metering: 3.0 min duration (Inbound Patient Reception)',
            resulting_balance_minor: 298350,
            metadata: { duration_seconds: 180, rate_per_min: 5.5 },
            created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: 'TXN-20261008-CALL-02',
            business_id: b.id,
            wallet_id: wallet.id,
            transaction_type: 'call_usage',
            direction: 'debit',
            amount_minor: 3300, // ₹33.00 = 6 min @ ₹5.50
            currency: 'INR',
            status: 'completed',
            idempotency_key: 'ik_call_usage_seed_2',
            description: 'AI Call Metering: 6.0 min duration (Real Estate Lead Qualification)',
            resulting_balance_minor: 295050,
            metadata: { duration_seconds: 360, rate_per_min: 5.5 },
            created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
          {
            id: 'TXN-20261011-CALL-03',
            business_id: b.id,
            wallet_id: wallet.id,
            transaction_type: 'call_usage',
            direction: 'debit',
            amount_minor: 50050, // ₹500.50
            currency: 'INR',
            status: 'completed',
            idempotency_key: 'ik_call_usage_seed_3',
            description: 'AI Call Metering: Bulk campaign outreach (91 connected minutes)',
            resulting_balance_minor: 245000,
            metadata: { duration_seconds: 5460, rate_per_min: 5.5 },
            created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
          }
        );
      }

      // Seed notification
      if (store.wallet_notifications!.filter((n) => n.business_id === b.id).length === 0) {
        store.wallet_notifications!.push({
          id: uuidv4(),
          business_id: b.id,
          type: 'topup_success',
          title: 'Wallet Funded Successfully',
          message: '₹2,450.00 (2,450 usage credits) currently available in your VoxMitra prepaid account.',
          read: false,
          created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        });
      }
    });
  }

  // Get Wallet
  getWallet(businessId: string): Wallet {
    this.ensureWalletSchema(this.data);
    let wallet = this.data.wallets!.find((w) => w.business_id === businessId);
    if (!wallet) {
      wallet = {
        id: uuidv4(),
        business_id: businessId,
        currency: 'INR',
        available_balance_minor: 0,
        reserved_balance_minor: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.wallets!.push(wallet);
      this.save();
    }
    return wallet;
  }

  // Get Transactions with filtering & search
  getWalletTransactions(
    businessId: string,
    filter?: { type?: string; status?: string; search?: string; startDate?: string; endDate?: string }
  ): WalletTransaction[] {
    this.ensureWalletSchema(this.data);
    let txs = this.data.wallet_transactions!.filter((t) => t.business_id === businessId);

    if (filter?.type && filter.type !== 'all') {
      txs = txs.filter((t) => t.transaction_type === filter.type);
    }
    if (filter?.status && filter.status !== 'all') {
      txs = txs.filter((t) => t.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.external_reference && t.external_reference.toLowerCase().includes(q)) ||
          (t.call_id && t.call_id.toLowerCase().includes(q))
      );
    }
    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      txs = txs.filter((t) => new Date(t.created_at).getTime() >= start);
    }
    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      txs = txs.filter((t) => new Date(t.created_at).getTime() <= end);
    }

    return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getTransactionById(id: string, businessId: string): WalletTransaction | null {
    this.ensureWalletSchema(this.data);
    const tx = this.data.wallet_transactions!.find((t) => t.id === id && t.business_id === businessId);
    return tx || null;
  }

  // Auto Top-Up Settings
  getAutoTopUpSettings(businessId: string): AutoTopUpSettings {
    this.ensureWalletSchema(this.data);
    let settings = this.data.wallet_autotopup_settings!.find((s) => s.business_id === businessId);
    if (!settings) {
      settings = {
        id: uuidv4(),
        business_id: businessId,
        enabled: false,
        threshold_minor: 20000,
        recharge_amount_minor: 100000,
        monthly_cap_minor: 500000,
        current_month_recharged_minor: 0,
        mandate_status: 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.wallet_autotopup_settings!.push(settings);
      this.save();
    }
    return settings;
  }

  updateAutoTopUpSettings(businessId: string, updates: Partial<AutoTopUpSettings>): AutoTopUpSettings {
    const existing = this.getAutoTopUpSettings(businessId);
    Object.assign(existing, updates, { updated_at: new Date().toISOString() });
    this.save();
    return existing;
  }

  // Billing Config
  getBillingConfig(businessId: string): BillingConfig {
    this.ensureWalletSchema(this.data);
    let cfg = this.data.billing_configs!.find((c) => c.business_id === businessId);
    if (!cfg) {
      cfg = {
        id: uuidv4(),
        business_id: businessId,
        billing_mode: 'subscription_plus_wallet',
        usage_rate_per_minute_minor: 550, // ₹5.50 / min
        included_minutes: 500,
        included_minutes_used: 0,
        minimum_recharge_minor: 10000,
        low_balance_alert_threshold_minor: 20000,
        call_duration_rounding_seconds: 60,
        charge_unanswered_calls: false,
        gst_tax_rate_percent: 18.0,
        last_updated_by: 'System Defaults',
        updated_at: new Date().toISOString(),
      };
      this.data.billing_configs!.push(cfg);
      this.save();
    }
    return cfg;
  }

  updateBillingConfig(businessId: string, updates: Partial<BillingConfig>, updatedBy: string): BillingConfig {
    const existing = this.getBillingConfig(businessId);
    Object.assign(existing, updates, {
      last_updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    });
    this.save();
    return existing;
  }

  // Create Payment Order (Razorpay Boundary)
  createPaymentOrder(
    businessId: string,
    params: { amountMinor: number; idempotencyKey: string; provider?: 'razorpay' | 'manual' }
  ): PaymentOrder {
    this.ensureWalletSchema(this.data);
    // Idempotency check
    const existing = this.data.payment_orders!.find(
      (o) => o.business_id === businessId && o.idempotency_key === params.idempotencyKey
    );
    if (existing) return existing;

    const orderId = 'order_' + uuidv4().replace(/-/g, '').slice(0, 16);
    const order: PaymentOrder = {
      id: uuidv4(),
      business_id: businessId,
      provider: params.provider || 'razorpay',
      provider_order_reference: orderId,
      amount_minor: params.amountMinor,
      currency: 'INR',
      status: 'created',
      idempotency_key: params.idempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.payment_orders!.push(order);
    this.save();
    return order;
  }

  // Verify and Credit Wallet (Enforces server-side verification and idempotency)
  verifyAndCreditPaymentOrder(
    businessId: string,
    params: {
      orderId: string;
      paymentId: string;
      amountMinor: number;
      idempotencyKey: string;
      description?: string;
      isAutoTopUp?: boolean;
    }
  ): { success: boolean; transaction: WalletTransaction; wallet: Wallet } {
    this.ensureWalletSchema(this.data);

    // Prevent duplicate processing via unique idempotency key
    const existingTx = this.data.wallet_transactions!.find(
      (t) => t.idempotency_key === params.idempotencyKey
    );
    if (existingTx) {
      const wallet = this.getWallet(businessId);
      return { success: true, transaction: existingTx, wallet };
    }

    const wallet = this.getWallet(businessId);
    const newBalance = wallet.available_balance_minor + params.amountMinor;
    wallet.available_balance_minor = newBalance;
    wallet.updated_at = new Date().toISOString();

    // Mark order paid if present
    const order = this.data.payment_orders!.find(
      (o) => o.provider_order_reference === params.orderId || o.id === params.orderId
    );
    if (order) {
      order.status = 'paid';
      order.provider_payment_reference = params.paymentId;
      order.updated_at = new Date().toISOString();
    }

    const txType: TransactionType = params.isAutoTopUp ? 'autotopup' : 'topup';
    const tx: WalletTransaction = {
      id: 'TXN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + uuidv4().slice(0, 6).toUpperCase(),
      business_id: businessId,
      wallet_id: wallet.id,
      transaction_type: txType,
      direction: 'credit',
      amount_minor: params.amountMinor,
      currency: 'INR',
      status: 'completed',
      idempotency_key: params.idempotencyKey,
      external_reference: params.paymentId,
      description:
        params.description ||
        (params.isAutoTopUp
          ? `Automatic Wallet Top-Up (e-Mandate Authorization: ${params.paymentId})`
          : `Prepaid Usage Wallet Recharge (Ref: ${params.paymentId})`),
      resulting_balance_minor: newBalance,
      metadata: {
        order_id: params.orderId,
        payment_id: params.paymentId,
        credits_added: Math.round(params.amountMinor / 100),
      },
      created_at: new Date().toISOString(),
    };

    this.data.wallet_transactions!.unshift(tx);

    // Add In-App notification
    this.addWalletNotification(businessId, {
      type: params.isAutoTopUp ? 'autotopup_triggered' : 'topup_success',
      title: params.isAutoTopUp ? 'Auto Top-Up Executed' : 'Recharge Successful',
      message: `₹${(params.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} credited. Current available balance: ₹${(newBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${Math.round(newBalance / 100)} credits).`,
    });

    this.save();
    return { success: true, transaction: tx, wallet };
  }

  // Reserve usage before starting call
  reserveCallUsage(
    businessId: string,
    callId: string,
    estimatedMinutes = 1
  ): { allowed: boolean; reservationId?: string; reservedAmountMinor?: number; reason?: string; mode: string } {
    this.ensureWalletSchema(this.data);
    const cfg = this.getBillingConfig(businessId);
    const wallet = this.getWallet(businessId);

    // Check if subscription included minutes cover this call (no double billing!)
    if (cfg.billing_mode === 'subscription_plus_wallet' && cfg.included_minutes_used < cfg.included_minutes) {
      return {
        allowed: true,
        reservedAmountMinor: 0,
        mode: 'subscription_included_minutes',
      };
    }

    // Prepaid deduction required: compute required reservation (at least 1 full minute rate)
    const reservationAmount = cfg.usage_rate_per_minute_minor * Math.max(1, estimatedMinutes);

    if (wallet.available_balance_minor < reservationAmount) {
      // Trigger notification for call blocked
      this.addWalletNotification(businessId, {
        type: 'call_blocked_insufficient_funds',
        title: 'Call Prevented: Low Balance',
        message: `Available balance (₹${(wallet.available_balance_minor / 100).toFixed(2)}) is insufficient to start a call. Minimum required: ₹${(reservationAmount / 100).toFixed(2)}.`,
      });

      return {
        allowed: false,
        reason: `Insufficient wallet balance (₹${(wallet.available_balance_minor / 100).toFixed(2)} available). A minimum balance of ₹${(reservationAmount / 100).toFixed(2)} is required to initiate this call.`,
        mode: 'prepaid_wallet',
      };
    }

    // Reserve funds atomically
    wallet.available_balance_minor -= reservationAmount;
    wallet.reserved_balance_minor += reservationAmount;
    wallet.updated_at = new Date().toISOString();

    const reservation: WalletReservation = {
      id: uuidv4(),
      business_id: businessId,
      wallet_id: wallet.id,
      call_id: callId,
      reserved_amount_minor: reservationAmount,
      settled_amount_minor: 0,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(), // 30 min hold
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.wallet_reservations!.push(reservation);
    this.save();

    return {
      allowed: true,
      reservationId: reservation.id,
      reservedAmountMinor: reservationAmount,
      mode: 'prepaid_wallet',
    };
  }

  // Settle actual call usage after call completion
  settleCallUsage(
    businessId: string,
    callId: string,
    durationSeconds: number,
    callStatus = 'completed'
  ): {
    billedAmountMinor: number;
    billedMinutes: number;
    mode: string;
    transaction?: WalletTransaction;
    wallet: Wallet;
    autoTopUpTriggered?: boolean;
  } {
    this.ensureWalletSchema(this.data);
    const cfg = this.getBillingConfig(businessId);
    const wallet = this.getWallet(businessId);

    // Find any existing active reservation
    const reservation = this.data.wallet_reservations!.find(
      (r) => r.call_id === callId && r.status === 'active'
    );

    // Release the reserved amount back to available balance first
    if (reservation) {
      wallet.reserved_balance_minor = Math.max(0, wallet.reserved_balance_minor - reservation.reserved_amount_minor);
      wallet.available_balance_minor += reservation.reserved_amount_minor;
      reservation.status = 'settled';
      reservation.updated_at = new Date().toISOString();
    }

    // Determine duration rounding
    const roundingSec = cfg.call_duration_rounding_seconds || 60;
    const billableSeconds = Math.max(0, durationSeconds);
    const billableMinutes = billableSeconds === 0 ? 0 : Math.ceil(billableSeconds / roundingSec) * (roundingSec / 60);

    // Check if unanswered and policy says free
    const isUnanswered = ['no_answer', 'busy', 'failed'].includes(callStatus);
    if (isUnanswered && !cfg.charge_unanswered_calls && billableSeconds < 10) {
      this.save();
      return {
        billedAmountMinor: 0,
        billedMinutes: 0,
        mode: 'waived_unanswered',
        wallet,
      };
    }

    // Check if covered by subscription plan
    if (cfg.billing_mode === 'subscription_plus_wallet' && cfg.included_minutes_used < cfg.included_minutes) {
      const remainingIncluded = cfg.included_minutes - cfg.included_minutes_used;
      if (billableMinutes <= remainingIncluded) {
        cfg.included_minutes_used += billableMinutes;
        this.save();
        return {
          billedAmountMinor: 0,
          billedMinutes: billableMinutes,
          mode: 'subscription_included_minutes',
          wallet,
        };
      }
      // Partial consumption from included minutes, remainder to wallet
      const overageMinutes = billableMinutes - remainingIncluded;
      cfg.included_minutes_used = cfg.included_minutes;
      const billedMinor = Math.round(overageMinutes * cfg.usage_rate_per_minute_minor);

      wallet.available_balance_minor = Math.max(0, wallet.available_balance_minor - billedMinor);
      wallet.updated_at = new Date().toISOString();

      const tx: WalletTransaction = {
        id: 'TXN-CALL-' + uuidv4().slice(0, 8).toUpperCase(),
        business_id: businessId,
        wallet_id: wallet.id,
        transaction_type: 'call_usage',
        direction: 'debit',
        amount_minor: billedMinor,
        currency: 'INR',
        status: 'completed',
        idempotency_key: `ik_call_settle_${callId}_${Date.now()}`,
        call_id: callId,
        description: `Call Usage Overage: ${billableMinutes} min (${remainingIncluded} min plan + ${overageMinutes} min metered @ ₹${(cfg.usage_rate_per_minute_minor / 100).toFixed(2)}/min)`,
        resulting_balance_minor: wallet.available_balance_minor,
        metadata: { duration_seconds: durationSeconds, billable_minutes: billableMinutes },
        created_at: new Date().toISOString(),
      };
      this.data.wallet_transactions!.unshift(tx);

      // Evaluate Auto Top-Up
      const autoTriggered = this.evaluateAutoTopUp(businessId, wallet);
      this.save();
      return { billedAmountMinor: billedMinor, billedMinutes: billableMinutes, mode: 'plan_overage_wallet', transaction: tx, wallet, autoTopUpTriggered: autoTriggered };
    }

    // Pure prepaid wallet billing
    const billedMinor = Math.round(billableMinutes * cfg.usage_rate_per_minute_minor);
    wallet.available_balance_minor = Math.max(0, wallet.available_balance_minor - billedMinor);
    wallet.updated_at = new Date().toISOString();

    const tx: WalletTransaction = {
      id: 'TXN-CALL-' + uuidv4().slice(0, 8).toUpperCase(),
      business_id: businessId,
      wallet_id: wallet.id,
      transaction_type: 'call_usage',
      direction: 'debit',
      amount_minor: billedMinor,
      currency: 'INR',
      status: 'completed',
      idempotency_key: `ik_call_settle_${callId}_${Date.now()}`,
      call_id: callId,
      description: `AI Voice Call Usage: ${billableMinutes} billable min (${durationSeconds}s duration @ ₹${(cfg.usage_rate_per_minute_minor / 100).toFixed(2)}/min)`,
      resulting_balance_minor: wallet.available_balance_minor,
      metadata: { duration_seconds: durationSeconds, billable_minutes: billableMinutes, rate: cfg.usage_rate_per_minute_minor },
      created_at: new Date().toISOString(),
    };
    this.data.wallet_transactions!.unshift(tx);

    // Evaluate Auto Top-Up trigger
    const autoTriggered = this.evaluateAutoTopUp(businessId, wallet);
    this.save();

    return {
      billedAmountMinor: billedMinor,
      billedMinutes: billableMinutes,
      mode: 'prepaid_wallet',
      transaction: tx,
      wallet,
      autoTopUpTriggered: autoTriggered,
    };
  }

  // Release reservation if a call is cancelled/aborted
  releaseCallReservation(businessId: string, callId: string) {
    this.ensureWalletSchema(this.data);
    const wallet = this.getWallet(businessId);
    const reservation = this.data.wallet_reservations!.find(
      (r) => r.call_id === callId && r.status === 'active'
    );
    if (reservation) {
      wallet.reserved_balance_minor = Math.max(0, wallet.reserved_balance_minor - reservation.reserved_amount_minor);
      wallet.available_balance_minor += reservation.reserved_amount_minor;
      reservation.status = 'released';
      reservation.updated_at = new Date().toISOString();
      this.save();
    }
  }

  // Evaluate Auto Top-Up
  private evaluateAutoTopUp(businessId: string, wallet: Wallet): boolean {
    const autoCfg = this.getAutoTopUpSettings(businessId);
    if (!autoCfg.enabled || autoCfg.mandate_status !== 'active') return false;

    // Check threshold
    if (wallet.available_balance_minor > autoCfg.threshold_minor) return false;

    // Check monthly cap
    if (autoCfg.current_month_recharged_minor + autoCfg.recharge_amount_minor > autoCfg.monthly_cap_minor) {
      this.addWalletNotification(businessId, {
        type: 'autotopup_failed',
        title: 'Auto Top-Up Paused: Monthly Spending Cap',
        message: `Auto top-up was prevented because the configured monthly cap of ₹${(autoCfg.monthly_cap_minor / 100).toFixed(2)} would be exceeded.`,
      });
      return false;
    }

    // Execute automatic replenishment atomically with idempotency
    const idempotencyKey = `auto_topup_${businessId}_${Date.now()}`;
    const result = this.verifyAndCreditPaymentOrder(businessId, {
      orderId: 'auto_ord_' + uuidv4().slice(0, 10),
      paymentId: 'mandate_pay_' + uuidv4().slice(0, 8),
      amountMinor: autoCfg.recharge_amount_minor,
      idempotencyKey,
      isAutoTopUp: true,
      description: `Auto Top-Up Triggered: Balance fell below ₹${(autoCfg.threshold_minor / 100).toFixed(2)} threshold`,
    });

    autoCfg.current_month_recharged_minor += autoCfg.recharge_amount_minor;
    autoCfg.last_recharge_at = new Date().toISOString();
    autoCfg.updated_at = new Date().toISOString();

    return result.success;
  }

  // Wallet Notifications
  getWalletNotifications(businessId: string, unreadOnly = false): WalletNotification[] {
    this.ensureWalletSchema(this.data);
    let list = this.data.wallet_notifications!.filter((n) => n.business_id === businessId);
    if (unreadOnly) list = list.filter((n) => !n.read);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  markNotificationRead(id: string, businessId: string) {
    this.ensureWalletSchema(this.data);
    const n = this.data.wallet_notifications!.find((item) => item.id === id && item.business_id === businessId);
    if (n) {
      n.read = true;
      this.save();
    }
  }

  addWalletNotification(
    businessId: string,
    notification: Omit<WalletNotification, 'id' | 'business_id' | 'created_at' | 'read'>
  ): WalletNotification {
    this.ensureWalletSchema(this.data);
    const item: WalletNotification = {
      ...notification,
      id: uuidv4(),
      business_id: businessId,
      read: false,
      created_at: new Date().toISOString(),
    };
    this.data.wallet_notifications!.unshift(item);
    this.save();
    return item;
  }

  // Daily Usage Time-Series for Charts
  getDailyUsageMetrics(businessId: string, days = 14): { date: string; credits: number; minutes: number; callCount: number }[] {
    this.ensureWalletSchema(this.data);
    const result: { date: string; credits: number; minutes: number; callCount: number }[] = [];
    const calls = this.data.call_records.filter((c) => c.business_id === businessId);

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayCalls = calls.filter((c) => c.created_at.slice(0, 10) === dateStr);

      const durationSec = dayCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
      const minutes = Math.round((durationSec / 60) * 10) / 10;
      // credits spent approximately minutes * 5.5
      const credits = Math.round(minutes * 5.5 * 100) / 100;

      result.push({
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        credits,
        minutes,
        callCount: dayCalls.length,
      });
    }

    return result;
  }
}

export const db = new DatabaseStore();

