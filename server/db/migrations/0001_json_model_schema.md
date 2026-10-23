# VoxMitra migration 0001 review notes

Review [0001_json_model_schema.sql](./0001_json_model_schema.sql) before applying it to a target. This migration is create-only. Its preflight checks the 19 target relations plus the legacy singular `public.billing_config` name and raises an exception if any are present. It does not drop, truncate, or alter existing application tables. The application does not verify prior execution in a remote project.

## Source model and field mapping

Source of truth: the interfaces and `DatabaseSchema` in `server/db/database.ts`. JSON top-level arrays map as follows:

| JSON collection | PostgreSQL table | Mapping and handling |
| --- | --- | --- |
| `businesses` | `businesses` | Fields map by name. `id`, `name`, `slug`, `contact_email`, `phone_number`, plan, timezone, and timestamps are retained. |
| `users` | `users` | Fields map by name. Password hashes stay server-side. Email uniqueness is case-insensitive/trimmed to match lookup behavior. |
| `agents` | `agents` | Fields map by name. `id` and `business_id` are `TEXT`; `total_calls` is nonnegative. |
| `agent_configurations` | `agent_configurations` | Fields map by name. Languages, voice settings, contact fields, FAQs, and `agent_plan` remain JSONB. |
| `call_records` | `call_records` | Fields map by name, including the denormalized optional `agent_name`, `is_demo`, JSON transcript/extracted data, and `cost_usd`. |
| `callbacks` | `callbacks` | Fields map by name. `scheduled_time` is a timestamp; optional agent/call links must belong to the same business. |
| `integrations` | `integrations` | `config_meta` remains JSONB. Review and protect any credential-like values found there during migration; never log/export them to clients. |
| `usage_records` | `usage_records` | Fields map by name. `billed_amount_cents` is retained as named; its current data has a USD-style example and must not be silently reinterpreted. |
| `wallets` | `wallets` | Fields map by name. Currency is INR and balances are integer minor units (paise). |
| `wallet_transactions` | `wallet_transactions` | Fields map by name. `metadata` remains JSONB; idempotency key is globally unique to match current transaction processing. `call_id` remains a text correlation value: current settlement can record IDs without a corresponding call row. |
| `wallet_reservations` | `wallet_reservations` | Fields map by name. `call_id` stays `TEXT` without a call-record FK because reservations can be created before a persisted call exists. |
| `wallet_autotopup_settings` | `wallet_autotopup_settings` | Fields map by name, including mandate reference/status. A mandate reference is sensitive operational data and must remain server-side. |
| `payment_orders` | `payment_orders` | Fields map by name. Idempotency uniqueness is per business, matching current order creation. |
| `billing_configs` | `billing_configs` | Fields map by name. `last_updated_by` is text because current records may contain a system label rather than a user ID. |
| `wallet_notifications` | `wallet_notifications` | Fields map by name. |
| `campaigns` | `campaigns` | Fields map by name. `agent_name` is a denormalized display snapshot; `agent_id` has a same-business FK. |
| `leads` | `leads` | Fields map by name. `agent_name` is free text, not an agent FK. `last_call_at` and `callback_date` remain text because current values include human-readable strings. |
| `knowledge_sources` | `knowledge_sources` | Fields map by name. `updated_at` stays text because current records contain relative strings such as `"2 days ago"`. |
| `onboarding[userId]` | `onboarding` | One row per user; `user_id` is the primary key. CamelCase keys map to snake_case columns. `business_id` is derived from the owning user's `business_id` during import and constrained to that user/business pair. |

All primary and relationship identifiers are `TEXT`. Import identifiers verbatim, including prefixed transaction IDs, seeded agent IDs, and UUID-shaped strings. Do not cast them to PostgreSQL UUIDs. The schema does not generate IDs: the future server-side adapter/importer must supply IDs, as the current JSON implementation does.

JSON timestamps that are valid ISO timestamps should be parsed into `TIMESTAMPTZ` while preserving their instant. Do not parse the human-readable lead and knowledge-source date labels as timestamps. `leads` and `onboarding` do not currently include source creation/update timestamps; their SQL `created_at`/`updated_at` values are database-side row-maintenance metadata, not historical source timestamps.

## Relationships and tenant isolation

Every tenant-owned table carries `business_id`. Composite foreign keys bind agent configuration, calls, callbacks, wallet children, campaigns, and onboarding to a parent in the same business. `users` has a composite `(id, business_id)` key so onboarding can be user-keyed and tenant-consistent. Multiple users per business are supported by the schema; the current registration flow still creates one business per user and exposes no membership/invitation flow.

Agent references in calls, callbacks, and campaigns use restrictive deletion so historical records are not silently removed or orphaned. This differs from the JSON `deleteAgent` behavior, which removes an agent and its configuration but leaves other references untouched. Before adopting the schema, choose and implement a retention-aware agent deletion policy, and validate old JSON records for orphaned agent/call references.

The migration deliberately does **not** enable RLS or create `auth.uid()` policies. The existing Express API authenticates a custom VoxMitra JWT; it is not a Supabase Auth identity, and `auth.uid()` does not establish that identity. The runtime also does not set transaction-local tenant context, so enabling policies now could deny legitimate API operations or create a false sense of isolation.

### Mandatory security prerequisites

- Do not expose these tenant tables to public, anonymous, or frontend/client access until a verified server-only access strategy is in place. Apply [0002_revoke_client_access.sql](./0002_revoke_client_access.sql) after migration 0001 to revoke table grants from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- Keep all database credentials and elevated keys exclusively on the server. Never expose a Supabase service-role key to the frontend. A service-role key bypasses RLS and is not a substitute for tenant authorization.
- The current custom Express JWT does not authenticate as Supabase Auth. Do not use `auth.uid()` as the VoxMitra user identity.
- Use a dedicated least-privilege runtime login separate from the migration/owner role. Grant it only the required CRUD permissions on these 19 tables; keep its password in server deployment secrets. The backend derives `business_id` from the verified custom token's user record and applies tenant predicates. Composite foreign keys are an integrity safeguard, not authorization.
- Decide whether database-enforced tenant context will be added. A transaction-local custom setting can provide defense-in-depth, but if the runtime role can freely set it, compromised backend credentials or SQL access can impersonate a tenant. Strong database-enforced identity requires PostgreSQL to verify a signed identity/claim or a planned migration to Supabase Auth. Do not enable RLS until the chosen mechanism and policies are tested for every API operation.

Migration 0001 creates no roles, grants, RLS policies, JWT secrets, credentials, or live database settings. Migration 0002 revokes client-role grants but does not provision the runtime login role. These remain deployment gates.

## Known mismatches and import gates

- The unchanged `server/db/schema.sql` uses UUID primary/foreign keys; this target uses `TEXT`. Do not apply this create-only migration over that schema or silently cast the existing identifiers. The SQL preflight checks every target relation in `public` and also checks the legacy singular `public.billing_config`; it aborts before DDL if any checked name already exists. If the legacy SQL schema was already applied, first choose a clean target or author a separately reviewed conversion migration. The DDL explicitly creates tables and comments in `public`; indexes are created on those explicitly qualified tables and therefore reside in `public`.
- The legacy SQL names the billing table `billing_config`, while JSON uses `billing_configs`; this target follows the JSON collection name. The existing SQL also omits campaigns, leads, knowledge sources, and onboarding.
- Existing legacy RLS policies use `auth.uid()` and do not cover every requested tenant table. They are not copied.
- Current JSON `deleteAgent` removes the agent and its configuration but leaves references from calls/campaigns/callbacks, allowing dangling references. The new agent FKs cascade configuration deletion but restrict deleting an agent referenced by a call, campaign, or callback. A runtime delete may therefore fail where JSON deletion succeeded; choose an archive/soft-delete, cascade, or explicit dependent-record policy before adapter cutover.
- The new callback-to-call FK uses `ON DELETE RESTRICT`, whereas the legacy SQL schema uses `ON DELETE SET NULL` for callback agent/call references. The JSON runtime currently has no call-delete method, but if call deletion is later added, it will need to account for this stricter behavior. Deleting a business cascades to its tenant records, so business deletion must be an explicit, authorized operation.
- `getOnboarding` can read a legacy onboarding record keyed by `business_id` when there is no `user_id` record. Resolve those keys to the intended user before import; do not place a business ID in `onboarding.user_id`. A business-level record shared by multiple users needs an explicit per-user migration decision.
- `wallet_reservations.call_id` can identify a call before there is a persisted call record, so it is intentionally not a foreign key. `wallet_transactions.call_id` is likewise not a foreign key: current settlement accepts a call ID without requiring an existing `call_records` row (including existing test flows). Both remain tenant-associated through their wallet/business relationship.
- `wallet_reservations` checks nonnegative amounts and enforces `settled_amount_minor <= reserved_amount_minor`. It does not prevent duplicate active reservations for one call or make a wallet balance update atomic. The future adapter must use a database transaction, lock the wallet and relevant reservation rows (for example with `SELECT ... FOR UPDATE`), recheck balance and reservation state inside that transaction, then update balances and reservation/ledger state together. Add a unique active-reservation constraint only if runtime semantics are made compatible and existing data is checked first.
- A payment-crediting adapter must verify that the authenticated business owns the payment order, the order is in an eligible unpaid state, the credited amount equals the expected order amount, and the provider's payment verification is valid. In one database transaction, update the order, credit the wallet, insert the ledger transaction, and insert the notification. Enforce idempotency so retries or concurrent callbacks cannot credit twice; roll back all changes if any operation fails.
- `integrations.config_meta`, wallet metadata, and mandate/payment reference fields need a data-classification and sanitization review before any export or logging. This migration does not move or disclose their values.
- The current `schema.sql` and JSON data are untouched by the import tool. No live PostgreSQL connection or schema verification is claimed by this repository work.

## Import dependency order and safety checklist

For a full-fidelity nonfinancial import, the dependency order is:

1. `businesses`.
2. `users` and `agents` (both depend only on businesses; either order between these two is valid).
3. Tables depending on businesses only: `integrations`, `usage_records`, `wallets`, `wallet_autotopup_settings`, `payment_orders`, `billing_configs`, `wallet_notifications`, `leads`, and `knowledge_sources`.
4. `agent_configurations` (requires agents), then `call_records` (requires agents).
5. `callbacks` (requires businesses, agents when `agent_id` is non-null, and calls when `call_record_id` is non-null); `campaigns` (requires agents).
6. `wallet_transactions` and `wallet_reservations` (require wallets; transactions may retain an optional call correlation ID without a call FK).
7. `onboarding` (requires the corresponding user and its business; resolve any legacy business-keyed onboarding records to intended users first).

The included `scripts/import-json-to-postgres.ts` is deliberately more conservative: it excludes the seeded demo tenant and demo/test calls, imports integrations disabled, zeros wallet balances, and disables mandates/auto-top-up. It skips wallet transactions, reservations, payment orders, and notifications instead of treating unverified historical financial activity as settled. Review its dry-run counts and reconcile excluded finance from authoritative provider/ledger records before cutover.

Before any later import:

1. Back up the source JSON file and retain a read-only copy with access controls.
2. Confirm the target is empty and that this migration is the only intended schema initializer; do not run the UUID-based legacy `schema.sql` first.
3. Validate source identifiers and all references without transforming IDs. Report missing businesses/users/agents, duplicate normalized emails, duplicate slugs, invalid enum values, malformed timestamps, and nonnumeric/out-of-range amounts before inserting.
4. Sanitize integration metadata and other sensitive references from logs and exported diagnostics. Do not put credentials in migration files.
5. Import in the dependency order above, within a transaction or staged tables, preserving IDs and source timestamps where valid. Compare per-table row counts and representative non-sensitive aggregates before cutover.
6. Keep the JSON source unchanged until application cutover and reconciliation are explicitly approved. Define rollback as routing traffic back to the JSON-backed version before writes diverge; after cutover, establish a write freeze or dual-write/reconciliation plan so rollback cannot discard new writes.
