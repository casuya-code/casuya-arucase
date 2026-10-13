-- Up Migration
-- Pre-Form One comment modules (PRE-SALA, PRE-TAALUMA, PRE-TABIA NA MWENENDO, …).
--
-- Pre-Form One students have no stream/term, so unlike the class-level
-- `comments` / `tabia_mwenendo` tables used for Forms I–VI these are keyed
-- directly by student_id + year. Free-text comment types share one table
-- (comment_type discriminates the module); the 11-criterion behaviour grid has
-- its own table.
--
-- No-op when public.preform_one_students does not exist (mirrors the defensive
-- style of 1778755582339_preform-one-schema-align.sql).

DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS public.preform_one_comments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES public.preform_one_students(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      comment_type VARCHAR(64) NOT NULL,
      comment_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  $ddl$;
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_preform_one_comments_student_year_type ON public.preform_one_comments (student_id, year, comment_type)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_preform_one_comments_year_type ON public.preform_one_comments (year, comment_type)';

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS public.preform_one_tabia_mwenendo (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES public.preform_one_students(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      criterion VARCHAR(16) NOT NULL,
      evaluation VARCHAR(8) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  $ddl$;
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_preform_one_tabia_mwenendo_student_year_criterion ON public.preform_one_tabia_mwenendo (student_id, year, criterion)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_preform_one_tabia_mwenendo_year ON public.preform_one_tabia_mwenendo (year)';
END
$$;

-- Down Migration
DROP TABLE IF EXISTS public.preform_one_tabia_mwenendo;
DROP TABLE IF EXISTS public.preform_one_comments;
