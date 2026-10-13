# VoxMitra — Autonomous AI Voice-Agent Platform for Businesses

> **"VoxMitra — From Every Call to a Business Opportunity."**

VoxMitra is a self-service AI voice-agent platform for businesses. Users can create, configure, test, deploy, and monitor AI employees that handle phone conversations. The platform supports outbound lead qualification, high-volume campaign calling, and 24/7 inbound office receptionist workflows.

---

## 🚀 Key Features & Architectural Capabilities

### 1. Three Core Autonomous Voice Agent Types
- **Instant Lead Caller**: Automatically contacts newly submitted web form leads in under 60 seconds. Qualifies intent, gathers requirement data, and schedules consultations.
- **Bulk Calling Agent**: Executes high-throughput outbound lists for renewals, customer announcements, event confirmations, and surveys with concurrency management.
- **Inbound AI Receptionist**: Answers business telephone lines 24/7 with zero hold time, handles FAQs, triages caller inquiries, and performs warm phone transfers.

### 2. Guided Agent Creation Wizard & Configuration Editor
- **Persona & Identity**: Natural language role description, custom greeting, and objective formulation.
- **Voice Tuning**: ElevenLabs high-fidelity conversational voice synthesis with stability and clarity settings.
- **Knowledge Base**: Integrated business FAQs for accurate on-call responses.
- **Call-Handling Rules**: Maximum duration timers, call transfer numbers with conditional triggers, and callback scheduling.
- **Field Extraction Schema**: Automatically captures caller name, phone number, and custom CRM data fields from natural spoken dialogue.

### 3. Interactive Voice Testing Lab
- Test and speak with any configured AI agent directly inside your browser before wiring carrier phone trunks.
- Live conversational turns with speech recognition and voice synthesis.
- Real-time field extraction and live call transfer simulation.
- Automatically computes duration and persists real test conversations to the database.

### 4. Telephony & Voice Integration Layer
- **ElevenLabs Conversational AI**: Secure server-side API proxy for real-time speech synthesis and voice catalog fetching.
- **Exotel Telecom Adapter**: Modular telephony integration implementing Exotel API v1 endpoints (`/v1/Accounts/{AccountSid}/Calls/connect.json`), status callbacks, and webhook receivers.
- **Database Persistence**: Multi-tenant relational schema with Row Level Security (`server/db/schema.sql`) for PostgreSQL/Supabase, backed by an embedded persistent engine for immediate zero-config operation.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons.
- **Backend**: Node.js, Express, tsx.
- **Voice AI**: ElevenLabs Text-to-Speech & Conversational APIs.
- **Telecom**: Exotel Telephony Adapter layer with webhook support.
- **Database**: PostgreSQL / Supabase with Row Level Security (`server/db/schema.sql`).
- **Authentication**: JWT token authentication with bcrypt password hashing and business tenant isolation.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Server Port
PORT=3000

# Authentication & Session Security
JWT_SECRET="voxmitra_production_jwt_secret_change_me_in_prod"

# Supabase / PostgreSQL Configuration (Optional: for remote cloud Supabase persistence)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# ElevenLabs Conversational Voice API (Required for live voice synthesis and custom cloned voices)
ELEVENLABS_API_KEY=""

# Exotel Telephony Integration (Required for live PSTN telephone dialing)
EXOTEL_ACCOUNT_SID=""
EXOTEL_API_KEY=""
EXOTEL_API_TOKEN=""
EXOTEL_SUBDOMAIN="api.exotel.com"
EXOTEL_CALLER_ID=""
```

---

## 📦 Local Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Run Production Server**:
   ```bash
   npm start
   ```

---

## 🗄️ Database Schema & RLS Policies

The PostgreSQL schema is provided at `server/db/schema.sql`. It defines:
- `businesses`: Multi-tenant organization accounts.
- `users`: Team members and role permissions (`owner`, `admin`, `operator`, `viewer`).
- `agents`: Autonomous voice employee archetypes and statuses.
- `agent_configurations`: Comprehensive conversational instructions, greetings, FAQs, and voice settings.
- `call_records`: Full conversation transcripts, extracted lead fields, sentiment scores, and audio recording links.
- `callbacks`: Scheduled outbound callback queue.
- `integrations`: Secure server-side credential references for external providers.
- `usage_records`: Monthly call minute tracking and billing ledger.

Row Level Security (RLS) policies enforce strict tenant isolation so users can only access data belonging to their verified business ID.
