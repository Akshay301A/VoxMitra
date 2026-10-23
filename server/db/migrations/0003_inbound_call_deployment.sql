BEGIN;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS inbound_phone_number TEXT NOT NULL DEFAULT '',
  ALTER COLUMN status SET DEFAULT 'draft';

DO $migration_preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.agents
    WHERE inbound_phone_number <> ''
    GROUP BY inbound_phone_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'VoxMitra migration 0003 found duplicate inbound phone assignments; resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.call_records
    WHERE telephony_call_sid <> ''
    GROUP BY telephony_call_sid
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'VoxMitra migration 0003 found duplicate telephony call identifiers; resolve them before applying this migration.';
  END IF;
END;
$migration_preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS agents_inbound_phone_number_uq
  ON public.agents (inbound_phone_number)
  WHERE inbound_phone_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS call_records_telephony_call_sid_uq
  ON public.call_records (telephony_call_sid)
  WHERE telephony_call_sid <> '';

COMMIT;
