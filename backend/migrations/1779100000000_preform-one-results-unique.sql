-- Up Migration
-- Required for ON CONFLICT (student_id, year) on interview/continuing results calculate.

DO $$
BEGIN
  IF to_regclass('public.preform_one_interview_results') IS NOT NULL THEN
    DELETE FROM public.preform_one_interview_results a
    USING public.preform_one_interview_results b
    WHERE a.id > b.id
      AND a.student_id = b.student_id
      AND a.year = b.year;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_preform_one_interview_results_student_year
      ON public.preform_one_interview_results (student_id, year);
  END IF;

  IF to_regclass('public.preform_one_continuing_results') IS NOT NULL THEN
    DELETE FROM public.preform_one_continuing_results a
    USING public.preform_one_continuing_results b
    WHERE a.id > b.id
      AND a.student_id = b.student_id
      AND a.year = b.year;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_preform_one_continuing_results_student_year
      ON public.preform_one_continuing_results (student_id, year);
  END IF;
END
$$;

-- Down Migration
DROP INDEX IF EXISTS uq_preform_one_interview_results_student_year;
DROP INDEX IF EXISTS uq_preform_one_continuing_results_student_year;
