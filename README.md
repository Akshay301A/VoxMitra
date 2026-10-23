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

### 3. Six-step agent creation
- Choose from nine business categories and describe the business in plain language.
- Review and edit a structured plan for identity, objectives, caller questions, business knowledge, conversation workflow, transfers, callbacks, and safety.
- Select only voices returned by the existing provider catalog; audio previews appear only when a provider preview URL is available.
- Business analysis is explicitly labelled demo mode and uses local rule-based templates. It does not claim that an AI provider analyzed the supplied information.
- The existing agent API persists the plan. Creation saves a draft; inbound deployment requires an explicit administrator action and an already-provisioned Exotel number.

### 4. Interactive Voice Testing Lab
- Test and speak with any configured AI agent directly inside your browser before wiring carrier phone trunks.
- Live conversational turns with speech recognition and voice synthesis.
- Real-time field extraction and live call transfer simulation.
- Simulated test calls are not stored as real calls or billed usage.

### 5. Telephony & Voice Integration Layer
- **ElevenLabs**: Server-side API proxy for speech synthesis and voice catalog fetching; these MP3 endpoints are not used for live telephone audio.
- **Exotel AgentStream**: Authenticated inbound Voicebot WebSocket streams bidirectional PCM audio to Google Gemini Live. Outbound call dispatch and standalone HTTP status callbacks remain disabled.
- **Database Persistence**: JSON is the default. A PostgreSQL repository and asynchronous Express integration are available when PostgreSQL is explicitly selected.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons.
- **Backend**: Node.js, Express, tsx.
- **Voice AI**: Google Gemini Live for real-time inbound conversation; ElevenLabs catalog and MP3 synthesis remain available for non-telephone features.
- **Telecom**: Exotel AgentStream Voicebot WebSocket for inbound calls.
- **Database**: JSON-file store by default; server-only PostgreSQL pool/repository is selected with `VOXMITRA_DATABASE=postgres`.
- **Authentication**: JWT token authentication with bcrypt password hashing and business tenant isolation.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Server Port
PORT=3000

# Authentication & Session Security
# Generate a unique secret with: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=""

# Optional seeded demo workspace; honored only when NODE_ENV=development.
VOXMITRA_DEMO_MODE=false

# Database backend (JSON remains the default)
VOXMITRA_DATABASE=json
# Server-only PostgreSQL URL; never expose it or any database credential to frontend code.
DATABASE_URL=""

# Provider credentials are server-side only.
GEMINI_API_KEY=""
ELEVENLABS_API_KEY=""

# Exotel AgentStream credentials must match the Voicebot applet's Basic Auth settings.
EXOTEL_ACCOUNT_SID=""
EXOTEL_STREAM_USERNAME=""
EXOTEL_STREAM_PASSWORD=""
# Optional Gemini Live overrides.
GEMINI_LIVE_MODEL="gemini-2.5-flash-native-audio-preview-12-2025"
GEMINI_LIVE_VOICE="Aoede"
```

---

## 📦 Local Setup & Development

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Start Development Server**:
   ```bash
   bun run dev
   ```
   The application runs on `http://localhost:3000`.

3. **Build for Production**:
   ```bash
   bun run build
   ```

4. **Run Production Server**:
   ```bash
   bun run start
   ```

### Deploying the existing app to Render

This repository includes [`render.yaml`](./render.yaml) for a single persistent Node.js **Web Service**. It builds the existing React app and bundled server (`npm install && npm run build`), starts it with `npm start` (`node server.js`), and checks `GET /health`. The server uses Render's assigned `PORT` and binds to `0.0.0.0`; HTTP, API requests, and WebSocket upgrades share the same listener. The browser uses same-origin relative `/api/...` requests, so no frontend localhost URL or separate WebSocket proxy is required.

1. Push the repository to your Git provider and create a Render Blueprint from that repository. Review the `render.yaml` service definition and select a **paid, always-on Web Service** plan. Do not use a Static Site or serverless function for the Node server. Render supports inbound WebSockets on Web Services, but Free web services can spin down after idle time and lose local files.
2. Review Render's current service and disk pricing before creating paid resources. In the service settings, attach a persistent disk mounted at `/var/data`, then set `VOXMITRA_DATA_FILE` to `/var/data/voxmitra.json`. Keep `VOXMITRA_DATABASE=json` as defined in the Blueprint. The default JSON database is local-file based; without the persistent disk, user/agent/call data can be lost on restarts or redeploys. Use a single service instance with this JSON backend; do not scale it horizontally.
3. Set the prompted server-only `GEMINI_API_KEY`, `EXOTEL_ACCOUNT_SID`, `EXOTEL_STREAM_USERNAME`, and `EXOTEL_STREAM_PASSWORD` in Render's environment settings. The Blueprint generates `JWT_SECRET`; retain it as a secret. Render assigns `PORT` automatically—do not hardcode or override it. ElevenLabs is not required for the inbound Gemini audio stream.
4. Wait for the deploy and verify `https://<service-name>.onrender.com/health` returns `{"status":"ok"}`. This is a process liveness check, not a database/provider readiness claim. Confirm the deployment's `/api/telephony/status` reports server credentials as configured; it does not verify an Exotel call.
5. In Exotel, configure the Voicebot Applet to use `wss://<service-name>.onrender.com/api/telephony/exotel/media`, the same Basic Auth credentials, and the documented audio format above. Then assign the already-provisioned number to the configured agent in VoxMitra and place a controlled test call.

The WebSocket is held by the persistent Web Service and uses ping/pong keepalives. As with any host, deploys, maintenance, or instance replacement can terminate active sockets; schedule deployments outside calls. No service was created, no provider credentials were entered, and no database migration was applied as part of this change.

### Agent plan storage

The embedded development database stores the structured plan with the agent configuration. The Supabase schema includes the matching `agent_plan` JSONB column. Agents are saved as drafts; a business owner or admin must explicitly assign an already-provisioned inbound number to activate an inbound receptionist. VoxMitra does not purchase or provision phone numbers.

### Real inbound AI calls

The inbound media path uses Exotel's documented [Voicebot Applet / AgentStream WebSocket](https://developer.exotel.com/docs/agentstream/stream-voicebot-applet.md) and [WebSocket protocol](https://developer.exotel.com/docs/agentstream/websocket-protocol.md), not Exotel's ordinary call-connect API. The Voicebot applet opens a secure WebSocket to `wss://<your-public-host>/api/telephony/exotel/media`; the server authenticates that upgrade with HTTP Basic credentials from `EXOTEL_STREAM_USERNAME` and `EXOTEL_STREAM_PASSWORD`, validates the Exotel `start` event and account SID, then forwards 16 kHz mono PCM16 audio to [Gemini Live](https://ai.google.dev/gemini-api/docs/live). Gemini's 24 kHz PCM16 output is resampled to 16 kHz and returned as AgentStream `media` events. The authenticated AgentStream `stop` event closes and finalizes the call record.

To enable it:

1. Obtain an Exotel account with AgentStream / Voicebot Applet access and an already-provisioned ExoPhone. Create a dedicated applet Basic Auth username and password; store them only in the server's secret manager as `EXOTEL_STREAM_USERNAME` and `EXOTEL_STREAM_PASSWORD`. Set `EXOTEL_ACCOUNT_SID` and a server-side `GEMINI_API_KEY` with Gemini Live model access.
2. Deploy VoxMitra behind public TLS and make its WebSocket endpoint reachable at `wss://<your-public-host>/api/telephony/exotel/media`. In the Exotel App Bazaar call flow, attach the ExoPhone to a Voicebot Applet configured for that URL, matching Basic Auth credentials, raw signed 16-bit little-endian mono PCM (`audio/L16`), 16,000 Hz sample rate and 16-bit samples. Exotel's Voicebot/AgentStream capability and the public WSS endpoint are external prerequisites; local development on `localhost` cannot receive provider calls.
3. If PostgreSQL is selected, review and manually apply `server/db/migrations/0003_inbound_call_deployment.sql` after migrations `0001` and `0002`. It adds the inbound-number assignment and unique provider-call identifier constraints required for safe mapping and retries. VoxMitra does not execute migrations at startup. JSON development storage does not need this migration.
4. In VoxMitra, finish and save an inbound receptionist's greeting and instructions, then open its Telephony settings, enter the provisioned Exotel number, and choose **Assign number & activate**. The agent remains a draft until this explicit action succeeds. Deactivation clears the assignment and pauses it.

This path currently records real inbound call lifecycle and available speech transcripts. It does not purchase numbers, perform outbound dispatch, execute transfers/callbacks, run usage settlement or make payment changes. The existing ElevenLabs voice selection/settings are not used in the Gemini telephone stream; the live voice is controlled by `GEMINI_LIVE_VOICE`. Automated tests use mocked conversations and never call Exotel, Gemini or Supabase. Complete an end-to-end provider call before treating the deployment as verified.

---

## 🗄️ Database Schema & Access Control

JSON remains the local-development default. PostgreSQL mode selects the async repository for all current Express persistence paths, verifies connectivity and the expected `public` tables/columns before listening, and fails closed on configuration, connection, or schema errors. Startup never runs migrations. Existing custom Express JWTs identify VoxMitra users; they are not Supabase Auth identities and must not be interpreted using `auth.uid()`.

The schema migration does not enable RLS policies. Before enabling the PostgreSQL backend, review and apply the client-access lockdown migration after `0001_json_model_schema.sql`:

1. `server/db/migrations/0001_json_model_schema.sql` creates the 19 VoxMitra tables.
2. `server/db/migrations/0002_revoke_client_access.sql` revokes table privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
3. Provision a dedicated non-superuser PostgreSQL login with a generated password stored only in the deployment secret manager. Grant that role `USAGE` on `public` and `SELECT, INSERT, UPDATE, DELETE` only on the 19 VoxMitra tables. Do not use the browser anon key or expose a service-role key, database URL, or password in frontend code.
4. Set `VOXMITRA_DATABASE=postgres` and `DATABASE_URL` only in the server environment. The Express backend derives each business ID from the verified custom JWT's server-loaded user row.
5. For Supabase TLS, download the project's root certificate from **Project Settings → Database → SSL Configuration → Download Certificate**. Save it locally outside tracked files (for example, `.supabase/supabase-ca.crt`; `.supabase/` is ignored by Git) and set `DATABASE_CA_CERT_PATH` to its absolute path in the server environment. The PostgreSQL client uses that certificate as a trust anchor and verifies both the certificate chain and server hostname. Keep the certificate path and `DATABASE_URL` server-side. No `sslmode`, `ssl`, or certificate settings in `DATABASE_URL` can override this verified TLS configuration.

For example, run role provisioning from the Supabase SQL editor as an administrator, substituting a secret through the secure console rather than committing it:

```sql
CREATE ROLE voxmitra_app LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '<set securely>';
GRANT CONNECT ON DATABASE postgres TO voxmitra_app;
GRANT USAGE ON SCHEMA public TO voxmitra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.businesses, public.users, public.agents, public.agent_configurations,
  public.call_records, public.callbacks, public.integrations, public.usage_records,
  public.wallets, public.wallet_transactions, public.wallet_reservations,
  public.wallet_autotopup_settings, public.payment_orders, public.billing_configs,
  public.wallet_notifications, public.campaigns, public.leads, public.knowledge_sources,
  public.onboarding TO voxmitra_app;
```

Because custom JWTs are not Supabase Auth identities, do not add tenant RLS policies based on `auth.uid()` unless a verified identity bridge is designed and tested. The lockdown migration blocks Supabase API client roles; it does not replace careful server-side tenant predicates or the dedicated-role requirement. The adapter uses parameterized SQL and tenant-scoped predicates for tenant-owned operations. Agent deletion is restricted when calls, callbacks, or campaigns reference the agent; this differs from JSON deletion behavior.

JSON import is explicit and non-destructive. First run a dry-run report; the tool validates the destination schema, checks ID conflicts, and keeps the JSON source unchanged. It does not import wallet transactions, payment orders, reservations, notifications, or mandate authorizations. It sets wallet balances to zero, disables integrations and auto-top-up, excludes demo records, and reports the excluded/skipped counts. Reconcile those financial records separately with trusted payment-provider and ledger evidence before enabling any billing:

```powershell
$env:VOXMITRA_DATABASE = "postgres"
$env:DATABASE_URL = "<server-only TEST PostgreSQL URL>"
bun run db:import-json
# Review counts/reconciliation; only then:
bun run db:import-json --apply
```

To run the application against an already provisioned TEST schema:

```powershell
$env:VOXMITRA_DATABASE = "postgres"
$env:DATABASE_URL = "<server-only TEST PostgreSQL URL>"
npm run dev
```

PostgreSQL startup performs read-only checks for connectivity, every required migration table and column, compatible identifier/JSONB types, required keys and tenant foreign keys, migration-defined indexes, the application role's schema/table grants, and the absence of Supabase client-role table access. It does not run or re-run migrations. A successful startup confirms these checks against the database selected by `DATABASE_URL`; it does not prove that the URL points to TEST unless you verify the project/host independently.

The live integration runner is deliberately opt-in and refuses production mode or non-Supabase hosts. It creates unique test tenants and synthetic fixtures, then deletes only the businesses it created. Confirm the configured URL is a disposable TEST project before running:

```powershell
$env:VOXMITRA_TEST_DATABASE_CONFIRM = "YES"
npm run test:postgres-live
Remove-Item Env:VOXMITRA_TEST_DATABASE_CONFIRM
```

The runner never calls a telephony provider or credits a wallet. It exercises the application API and PostgreSQL repository only after read-only schema and role verification succeeds.

Wallet recharge/verification, mandate authorization and auto-top-up activation currently return disabled responses and must not be treated as successful. Outbound telephony dispatch and standalone Exotel HTTP status webhooks also remain disabled; the documented authenticated AgentStream inbound flow is described above and is not billable. A payment flow requires provider order/payment verification of ownership, status, currency, and exact amount plus an atomic idempotent order/wallet/ledger/notification transaction. Real provider usage settlement remains out of scope.
