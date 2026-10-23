import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { readDatabaseConfiguration } from '../server/db/backend.ts';
import { closePostgresPool, getPostgresPool, verifyPostgresSchema } from '../server/db/postgres-pool.ts';

type JsonRecord = Record<string, unknown>;
type ImportSpec = {
  table: string;
  source: string;
  key: string;
  columns: string[];
  jsonColumns?: string[];
  numberColumns?: string[];
  dateColumns?: string[];
  skip?: boolean;
  transform?: (record: JsonRecord) => JsonRecord;
};

const demoUserId = 'u0198000-0000-4000-8000-000000000001';
const importSpecs: ImportSpec[] = [
  { table: 'businesses', source: 'businesses', key: 'id', columns: ['id', 'name', 'slug', 'contact_email', 'phone_number', 'plan_tier', 'timezone', 'created_at', 'updated_at'], dateColumns: ['created_at', 'updated_at'] },
  { table: 'users', source: 'users', key: 'id', columns: ['id', 'business_id', 'email', 'password_hash', 'full_name', 'role', 'created_at', 'updated_at'], dateColumns: ['created_at', 'updated_at'] },
  { table: 'agents', source: 'agents', key: 'id', columns: ['id', 'business_id', 'name', 'agent_type', 'description', 'status', 'total_calls', 'created_at', 'updated_at'], numberColumns: ['total_calls'], dateColumns: ['created_at', 'updated_at'] },
  { table: 'agent_configurations', source: 'agent_configurations', key: 'id', columns: ['id', 'agent_id', 'business_id', 'greeting', 'instructions', 'objectives', 'supported_languages', 'voice_id', 'voice_name', 'voice_settings', 'max_duration_seconds', 'transfer_enabled', 'transfer_phone', 'transfer_conditions', 'callback_instructions', 'contact_fields_to_collect', 'business_faqs', 'agent_plan', 'webhook_url', 'created_at', 'updated_at'], jsonColumns: ['supported_languages', 'voice_settings', 'contact_fields_to_collect', 'business_faqs', 'agent_plan'], numberColumns: ['max_duration_seconds'], dateColumns: ['created_at', 'updated_at'] },
  { table: 'call_records', source: 'call_records', key: 'id', columns: ['id', 'business_id', 'agent_id', 'agent_name', 'direction', 'caller_number', 'recipient_number', 'duration_seconds', 'status', 'transcript', 'summary', 'extracted_data', 'sentiment', 'cost_usd', 'telephony_call_sid', 'recording_url', 'is_demo', 'created_at'], jsonColumns: ['transcript', 'extracted_data'], numberColumns: ['duration_seconds', 'cost_usd'], dateColumns: ['created_at'] },
  { table: 'callbacks', source: 'callbacks', key: 'id', columns: ['id', 'business_id', 'agent_id', 'customer_name', 'customer_phone', 'scheduled_time', 'status', 'notes', 'call_record_id', 'created_at', 'updated_at'], dateColumns: ['scheduled_time', 'created_at', 'updated_at'] },
  { table: 'integrations', source: 'integrations', key: 'id', columns: ['id', 'business_id', 'provider', 'is_enabled', 'config_meta', 'last_tested_at', 'created_at', 'updated_at'], jsonColumns: ['config_meta'], dateColumns: ['last_tested_at', 'created_at', 'updated_at'], transform: (record) => ({ ...record, is_enabled: false, last_tested_at: null }) },
  { table: 'usage_records', source: 'usage_records', key: 'id', columns: ['id', 'business_id', 'period_start', 'period_end', 'total_minutes', 'total_calls', 'billed_amount_cents', 'payment_status', 'created_at'], numberColumns: ['total_minutes', 'total_calls', 'billed_amount_cents'], dateColumns: ['period_start', 'period_end', 'created_at'] },
  { table: 'wallets', source: 'wallets', key: 'id', columns: ['id', 'business_id', 'currency', 'available_balance_minor', 'reserved_balance_minor', 'status', 'created_at', 'updated_at'], numberColumns: ['available_balance_minor', 'reserved_balance_minor'], dateColumns: ['created_at', 'updated_at'], transform: (record) => ({ ...record, available_balance_minor: 0, reserved_balance_minor: 0 }) },
  { table: 'wallet_transactions', source: 'wallet_transactions', key: 'id', columns: [], skip: true },
  { table: 'wallet_reservations', source: 'wallet_reservations', key: 'id', columns: [], skip: true },
  { table: 'wallet_autotopup_settings', source: 'wallet_autotopup_settings', key: 'id', columns: ['id', 'business_id', 'enabled', 'threshold_minor', 'recharge_amount_minor', 'monthly_cap_minor', 'current_month_recharged_minor', 'payment_mandate_reference', 'mandate_status', 'last_recharge_at', 'created_at', 'updated_at'], numberColumns: ['threshold_minor', 'recharge_amount_minor', 'monthly_cap_minor', 'current_month_recharged_minor'], dateColumns: ['last_recharge_at', 'created_at', 'updated_at'], transform: (record) => ({ ...record, enabled: false, current_month_recharged_minor: 0, payment_mandate_reference: null, mandate_status: 'none', last_recharge_at: null }) },
  { table: 'payment_orders', source: 'payment_orders', key: 'id', columns: [], skip: true },
  { table: 'billing_configs', source: 'billing_configs', key: 'id', columns: ['id', 'business_id', 'billing_mode', 'usage_rate_per_minute_minor', 'included_minutes', 'included_minutes_used', 'minimum_recharge_minor', 'low_balance_alert_threshold_minor', 'call_duration_rounding_seconds', 'charge_unanswered_calls', 'gst_tax_rate_percent', 'last_updated_by', 'updated_at'], numberColumns: ['usage_rate_per_minute_minor', 'included_minutes', 'included_minutes_used', 'minimum_recharge_minor', 'low_balance_alert_threshold_minor', 'call_duration_rounding_seconds', 'gst_tax_rate_percent'], dateColumns: ['updated_at'] },
  { table: 'wallet_notifications', source: 'wallet_notifications', key: 'id', columns: [], skip: true },
  { table: 'campaigns', source: 'campaigns', key: 'id', columns: ['id', 'business_id', 'name', 'agent_id', 'agent_name', 'status', 'total_contacts', 'completed_contacts', 'successful_calls', 'schedule_start', 'calling_window', 'created_at'], numberColumns: ['total_contacts', 'completed_contacts', 'successful_calls'], dateColumns: ['created_at'] },
  { table: 'leads', source: 'leads', key: 'id', columns: ['id', 'business_id', 'contact_name', 'phone', 'email', 'source', 'qualification_status', 'agent_name', 'last_call_at', 'next_action', 'callback_date', 'notes'] },
  { table: 'knowledge_sources', source: 'knowledge_sources', key: 'id', columns: ['id', 'business_id', 'title', 'type', 'item_count', 'status', 'updated_at', 'details'], numberColumns: ['item_count'] },
  { table: 'onboarding', source: 'onboarding', key: 'user_id', columns: ['user_id', 'business_id', 'business_name', 'business_category', 'website', 'location', 'timezone', 'goals', 'starting_point', 'pending_agent_start', 'status', 'step', 'tour_step', 'completed', 'tour_completed', 'primary_use_case', 'preferred_language', 'preferred_voice', 'created_at', 'updated_at'], jsonColumns: ['goals'], numberColumns: ['step', 'tour_step'], dateColumns: ['created_at', 'updated_at'] },
];

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stable(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function recordsFor(spec: ImportSpec, data: JsonRecord, demoBusinessIds: Set<string>): JsonRecord[] {
  const value = data[spec.source];
  if (spec.source === 'onboarding') {
    if (value === undefined) return [];
    if (!isRecord(value)) throw new Error('JSON onboarding data must be an object keyed by user ID.');
    const userBusinessById = new Map(
      (data.users as JsonRecord[]).map((user) => [String(user.id), String(user.business_id)])
    );
    return Object.entries(value)
      .map(([userId, onboarding]) => {
        if (!isRecord(onboarding)) throw new Error('JSON onboarding contains a malformed record.');
        const businessId = userBusinessById.get(userId);
        if (!businessId) throw new Error('JSON onboarding contains a user without a business.');
        return {
          user_id: userId,
          business_id: businessId,
          business_name: onboarding.businessName ?? '',
          business_category: onboarding.businessCategory ?? '',
          website: onboarding.website ?? null,
          location: onboarding.location ?? null,
          timezone: onboarding.timezone ?? null,
          goals: onboarding.goals ?? [],
          starting_point: onboarding.startingPoint ?? null,
          pending_agent_start: onboarding.pendingAgentStart ?? null,
          status: onboarding.status ?? null,
          step: onboarding.step ?? 0,
          tour_step: onboarding.tourStep ?? null,
          completed: onboarding.completed ?? false,
          tour_completed: onboarding.tourCompleted ?? null,
          primary_use_case: onboarding.primaryUseCase ?? null,
          preferred_language: onboarding.preferredLanguage ?? null,
          preferred_voice: onboarding.preferredVoice ?? null,
        };
      })
      .filter((row) => !demoBusinessIds.has(String(row.business_id)));
  }
  if (value === undefined && ['campaigns', 'leads', 'knowledge_sources', 'wallets', 'wallet_transactions', 'wallet_reservations', 'wallet_autotopup_settings', 'payment_orders', 'billing_configs', 'wallet_notifications'].includes(spec.source)) {
    return [];
  }
  if (!Array.isArray(value)) throw new Error(`JSON ${spec.source} must be an array.`);
  const seen = new Set<string>();
  return value.filter((entry) => {
    if (!isRecord(entry)) throw new Error(`JSON ${spec.source} contains a malformed record.`);
    const key = entry[spec.key];
    if (typeof key !== 'string' || !key) throw new Error(`JSON ${spec.source} contains a record without a text identifier.`);
    if (seen.has(key)) throw new Error(`JSON ${spec.source} contains duplicate identifiers.`);
    seen.add(key);
    if (typeof entry.business_id === 'string' && demoBusinessIds.has(entry.business_id)) return false;
    if (spec.table === 'call_records' && (entry.is_demo === true || /^test[-_]/i.test(String(entry.telephony_call_sid ?? '')))) return false;
    return true;
  });
}

export function prepareJsonImport(input: unknown): {
  rows: Map<ImportSpec, JsonRecord[]>;
  sourceCounts: Record<string, number>;
  excludedDemoCounts: Record<string, number>;
  skippedFinancialCounts: Record<string, number>;
} {
  if (!isRecord(input)) throw new Error('JSON database root must be an object.');
  const data = input;
  for (const key of ['businesses', 'users', 'agents', 'agent_configurations', 'call_records', 'callbacks', 'integrations', 'usage_records']) {
    if (!Array.isArray(data[key])) throw new Error(`JSON ${key} must be an array.`);
  }
  const demoBusinessIds = new Set<string>();
  for (const user of data.users as JsonRecord[]) {
    if (isRecord(user) && user.id === demoUserId && typeof user.business_id === 'string') {
      demoBusinessIds.add(user.business_id);
    }
  }
  const rows = new Map<ImportSpec, JsonRecord[]>();
  const sourceCounts: Record<string, number> = {};
  const excludedDemoCounts: Record<string, number> = {};
  const skippedFinancialCounts: Record<string, number> = {};
  for (const spec of importSpecs) {
    const sourceRows = data[spec.source];
    const originals = spec.source === 'onboarding'
      ? (isRecord(data.onboarding) ? Object.keys(data.onboarding).length : 0)
      : Array.isArray(sourceRows) ? sourceRows.length : 0;
    const eligible = recordsFor(spec, data, demoBusinessIds);
    sourceCounts[spec.table] = originals;
    excludedDemoCounts[spec.table] = Math.max(0, originals - eligible.length);
    if (spec.skip) {
      skippedFinancialCounts[spec.table] = eligible.length;
      rows.set(spec, []);
    } else {
      for (const row of eligible) {
        if (Object.keys(row).some((column) => !spec.columns.includes(column))) {
          throw new Error(`JSON ${spec.source} has fields that are not mapped by the import schema.`);
        }
      }
      rows.set(spec, eligible.map((record) => spec.transform ? spec.transform(record) : record));
    }
  }
  return { rows, sourceCounts, excludedDemoCounts, skippedFinancialCounts };
}

function normalizeForCompare(value: unknown, spec: ImportSpec, column: string): string {
  if (value == null) return 'null';
  if (spec.dateColumns?.includes(column)) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error('A source timestamp is invalid.');
    return date.toISOString();
  }
  if (spec.numberColumns?.includes(column)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error('A source numeric value is invalid.');
    return String(numeric);
  }
  return stable(value);
}

async function countTables(client: Pick<PoolClient, 'query'>): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const spec of importSpecs) {
    const result = await client.query<QueryResultRow>(
      `SELECT count(*)::bigint AS count FROM public.${spec.table}`
    );
    counts[spec.table] = Number(result.rows[0].count);
  }
  return counts;
}

export async function importJsonData(
  pool: Pool,
  input: unknown,
  apply: boolean
): Promise<{
  mode: 'dry-run' | 'applied';
  before: Record<string, number>;
  after: Record<string, number>;
  inserted: Record<string, number>;
  alreadyPresent: Record<string, number>;
  sourceCounts: Record<string, number>;
  excludedDemoCounts: Record<string, number>;
  skippedFinancialCounts: Record<string, number>;
}> {
  const prepared = prepareJsonImport(input);
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const before = await countTables(client);
    const inserted: Record<string, number> = {};
    const alreadyPresent: Record<string, number> = {};
    for (const spec of importSpecs) {
      inserted[spec.table] = 0;
      alreadyPresent[spec.table] = 0;
      for (const row of prepared.rows.get(spec) ?? []) {
        const columns = spec.columns.filter((column) => row[column] !== undefined);
        if (!columns.includes(spec.key)) throw new Error(`A ${spec.table} record is missing its key field.`);
        const values = columns.map((column) =>
          spec.jsonColumns?.includes(column) ? JSON.stringify(row[column]) : row[column]
        );
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const insertedRows = await client.query<QueryResultRow>(
          `INSERT INTO public.${spec.table} (${columns.join(', ')})
           VALUES (${placeholders})
           ON CONFLICT DO NOTHING
           RETURNING ${spec.key}`,
          values
        );
        if (insertedRows.rows.length) {
          inserted[spec.table] += 1;
          continue;
        }

        const existing = await client.query<QueryResultRow>(
          `SELECT ${columns.join(', ')} FROM public.${spec.table} WHERE ${spec.key} = $1 LIMIT 1`,
          [row[spec.key]]
        );
        if (!existing.rows[0]) throw new Error(`A unique-key conflict exists in ${spec.table}.`);
        const isSame = columns.every((column) =>
          normalizeForCompare(existing.rows[0][column], spec, column) ===
          normalizeForCompare(row[column], spec, column)
        );
        if (!isSame) throw new Error(`An existing ${spec.table} record conflicts with the JSON source.`);
        alreadyPresent[spec.table] += 1;
      }
    }
    const after = await countTables(client);
    const projected = Object.fromEntries(
      importSpecs.map((spec) => [spec.table, before[spec.table] + inserted[spec.table]])
    );
    if (apply) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    transactionOpen = false;
    return {
      mode: apply ? 'applied' : 'dry-run',
      before,
      after: apply ? after : projected,
      inserted,
      alreadyPresent,
      sourceCounts: prepared.sourceCounts,
      excludedDemoCounts: prepared.excludedDemoCounts,
      skippedFinancialCounts: prepared.skippedFinancialCounts,
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {
        throw new Error('JSON import failed and rollback could not be confirmed.');
      }
    }
    throw error instanceof Error && !/password|credential|connection|SQL|query/i.test(error.message)
      ? error
      : new Error('JSON import failed; no source records were changed and the database transaction was rolled back.');
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (readDatabaseConfiguration().backend !== 'postgres') {
    throw new Error('Set VOXMITRA_DATABASE=postgres and a server-only DATABASE_URL before importing.');
  }
  const sourcePath = path.resolve(
    process.env.VOXMITRA_DATA_FILE || path.join(process.cwd(), 'data', 'voxmitra.json')
  );
  let input: unknown;
  try {
    input = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  } catch {
    throw new Error('The JSON source file could not be read or parsed.');
  }
  await verifyPostgresSchema();
  const result = await importJsonData(getPostgresPool(), input, process.argv.includes('--apply'));
  console.log(JSON.stringify(result, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Re-run with --apply to commit the transaction.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().catch(async () => {
    console.error('JSON import failed safely. The source file is unchanged.');
    try {
      await closePostgresPool();
    } catch {
      console.error('PostgreSQL pool cleanup failed safely.');
    }
    process.exitCode = 1;
  });
}
