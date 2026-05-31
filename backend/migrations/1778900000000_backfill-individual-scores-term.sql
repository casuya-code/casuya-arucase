-- Up Migration
-- Backfill individual_scores.term from assessment month + form level.
-- Older score saves omitted term (defaulted to First Term), which broke bulk report term filters.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'individual_scores'
      AND column_name = 'term'
  ) THEN
    -- Form V/VI: Term I = Aug–Nov, Term II = Feb–May
    UPDATE individual_scores SET term = 'First Term'
    WHERE level IN ('FORM V', 'FORM VI', 'FORM 5', 'FORM 6')
      AND month IN ('August', 'September', 'October', 'November');

    UPDATE individual_scores SET term = 'Second Term'
    WHERE level IN ('FORM V', 'FORM VI', 'FORM 5', 'FORM 6')
      AND month IN ('February', 'March', 'April', 'May');

    -- Form I–IV: Term I = Feb–May, Term II = Aug–Nov
    UPDATE individual_scores SET term = 'First Term'
    WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM 1', 'FORM 2', 'FORM 3', 'FORM 4')
      AND month IN ('February', 'March', 'April', 'May');

    UPDATE individual_scores SET term = 'Second Term'
    WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM 1', 'FORM 2', 'FORM 3', 'FORM 4')
      AND month IN ('August', 'September', 'October', 'November');
  END IF;
END $$;

-- Down Migration
-- Term backfill is not reversible without a snapshot; no-op.
