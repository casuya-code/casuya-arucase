-- Up Migration
-- Drop the legacy adm_no column from preform_one_students.
-- Routes and frontend use admission_number exclusively; adm_no is never populated
-- and causes 23502 NOT NULL violations on every INSERT.

DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;

  -- Backfill admission_number from adm_no for any legacy rows where it was missed
  UPDATE public.preform_one_students
  SET admission_number = adm_no
  WHERE (admission_number IS NULL OR trim(COALESCE(admission_number, '')) = '')
    AND adm_no IS NOT NULL
    AND trim(COALESCE(adm_no, '')) != '';

  -- Generate a placeholder admission_number for any remaining NULLs
  UPDATE public.preform_one_students
  SET admission_number = 'PF1-LEGACY-' || id::text
  WHERE admission_number IS NULL OR trim(COALESCE(admission_number, '')) = '';

  -- Drop the obsolete adm_no column
  ALTER TABLE public.preform_one_students DROP COLUMN IF EXISTS adm_no;

  -- Align with canonical schema: admission_number NOT NULL
  ALTER TABLE public.preform_one_students
    ALTER COLUMN admission_number SET NOT NULL;
END
$$;

-- Down Migration
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;

  -- Down migration: restore nullable admission_number first
  ALTER TABLE public.preform_one_students
    ALTER COLUMN admission_number DROP NOT NULL;

  ALTER TABLE public.preform_one_students
    ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50) NOT NULL;

  UPDATE public.preform_one_students
  SET adm_no = admission_number
  WHERE adm_no IS NULL AND admission_number IS NOT NULL;
END
$$;
