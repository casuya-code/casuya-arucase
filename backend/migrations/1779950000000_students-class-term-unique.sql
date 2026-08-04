-- Up Migration
-- Required for ON CONFLICT (adm_no, level, stream, year, term) in routes/students.js.
-- The unique index is missing on deployed databases, so the upsert fails with 42P10.

-- Drop the legacy 4-column constraint (without term) if it still exists, so it cannot
-- block the new one and so two same-year rows are not allowed to slip in.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'students'::regclass
      AND contype = 'u'
      AND conname = 'students_adm_no_level_stream_year_key'
  ) THEN
    ALTER TABLE public.students DROP CONSTRAINT students_adm_no_level_stream_year_key;
  END IF;
END
$$;

-- Remove any duplicate rows (keep the lowest id) so the unique index can be created.
DELETE FROM public.students a
USING public.students b
WHERE a.id > b.id
  AND a.adm_no = b.adm_no
  AND a.level = b.level
  AND a.stream = b.stream
  AND a.year = b.year
  AND a.term = b.term;

CREATE UNIQUE INDEX IF NOT EXISTS students_adm_no_level_stream_year_term_key
  ON public.students (adm_no, level, stream, year, term);

-- Down Migration
DROP INDEX IF EXISTS students_adm_no_level_stream_year_term_key;