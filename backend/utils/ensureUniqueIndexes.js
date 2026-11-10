/**
 * Startup / self-healing guards for unique indexes required by ON CONFLICT clauses.
 *
 * Databases restored from older backups can be missing the unique indexes that the
 * application's INSERT ... ON CONFLICT statements rely on. Postgres then fails with
 * SQLSTATE 42P10 ("there is no unique or exclusion constraint matching the ON CONFLICT
 * specification"). These helpers make the schema self-healing at runtime.
 */
const { query } = require('../config/database');

const MISSING_CONFLICT_TARGET = '42P10';

function isMissingConflictTarget(error) {
  return Boolean(error) && error.code === MISSING_CONFLICT_TARGET;
}

async function ensureCommentsUniqueIndex() {
  try {
    await query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'Term I'`);
    await query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);

    // Remove duplicate adm_no rows (keep the newest) before creating the unique index.
    await query(`
      DELETE FROM comments a
      USING comments b
      WHERE a.id < b.id
        AND a.adm_no IS NOT NULL
        AND a.adm_no = b.adm_no
        AND a.comment_type = b.comment_type
        AND a.level = b.level
        AND a.stream = b.stream
        AND a.year = b.year
        AND COALESCE(a.term, '') = COALESCE(b.term, '')
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_comments_adm_no
      ON comments (comment_type, level, stream, year, term, adm_no)
    `);

    return true;
  } catch (error) {
    console.warn('[schema] ensureCommentsUniqueIndex failed:', error.message);
    return false;
  }
}

async function ensureTabiaUniqueIndex() {
  try {
    await query(`ALTER TABLE tabia_mwenendo ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'Term I'`);
    await query(`ALTER TABLE tabia_mwenendo ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);

    await query(`
      DELETE FROM tabia_mwenendo a
      USING tabia_mwenendo b
      WHERE a.id < b.id
        AND a.adm_no IS NOT NULL
        AND a.adm_no = b.adm_no
        AND a.level = b.level
        AND a.stream = b.stream
        AND a.year = b.year
        AND COALESCE(a.term, '') = COALESCE(b.term, '')
        AND a.criterion = b.criterion
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tabia_mwenendo_adm_no
      ON tabia_mwenendo (level, stream, year, term, adm_no, criterion)
    `);

    return true;
  } catch (error) {
    console.warn('[schema] ensureTabiaUniqueIndex failed:', error.message);
    return false;
  }
}

module.exports = {
  MISSING_CONFLICT_TARGET,
  isMissingConflictTarget,
  ensureCommentsUniqueIndex,
  ensureTabiaUniqueIndex,
};
