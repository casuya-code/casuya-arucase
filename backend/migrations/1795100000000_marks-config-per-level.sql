-- Per-form marks configuration: add level column to marks_config
ALTER TABLE marks_config ADD COLUMN IF NOT EXISTS level VARCHAR(20) NOT NULL DEFAULT 'ALL';

-- Backfill existing rows as global default
UPDATE marks_config SET level = 'ALL' WHERE level IS NULL OR TRIM(level) = '';

-- Drop legacy unique constraint on month alone (if present)
ALTER TABLE marks_config DROP CONSTRAINT IF EXISTS marks_config_month_key;

-- New unique constraint per level+month
ALTER TABLE marks_config ADD CONSTRAINT marks_config_level_month_key UNIQUE (level, month);

CREATE INDEX IF NOT EXISTS idx_marks_config_level ON marks_config(level);