-- Form V/VI term rollover and level promotion session log (idempotency)
CREATE TABLE IF NOT EXISTS form_vvi_promotion_sessions (
  id SERIAL PRIMARY KEY,
  mode VARCHAR(32) NOT NULL,
  from_level VARCHAR(50) NOT NULL,
  from_stream VARCHAR(50) NOT NULL,
  from_year INTEGER NOT NULL,
  from_term VARCHAR(20) NOT NULL,
  to_level VARCHAR(50) NOT NULL,
  to_stream VARCHAR(50) NOT NULL,
  to_year INTEGER NOT NULL,
  to_term VARCHAR(20) NOT NULL,
  total_students INTEGER DEFAULT 0,
  promoted_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  excluded_count INTEGER DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (mode, from_level, from_stream, from_year, from_term)
);

CREATE INDEX IF NOT EXISTS idx_form_vvi_promotion_sessions_created
  ON form_vvi_promotion_sessions (created_at DESC);
