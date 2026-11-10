/**
 * Source-level regression guard for the student identity schema.
 *
 * The live database is checked by scripts/verifyStudentIdentitySchema.js, but a
 * fresh install is created from scripts/initDatabase.js. Assert here that the
 * installer never recreates the retired positional `student_index` and that the
 * per-student tables are created with `adm_no`.
 */
const fs = require('fs');
const path = require('path');

const INIT_DB = path.join(__dirname, '..', '..', 'scripts', 'initDatabase.js');

const ADM_NO_TABLES = [
  'student_photos',
  'student_parishes',
  'individual_scores',
  'monthly_results',
  'comments',
  'tabia_mwenendo',
  'individual_debt',
];

function createTableBlock(source, table) {
  const pattern = new RegExp(
    'CREATE TABLE IF NOT EXISTS\\s+' + table + '\\s*\\(([\\s\\S]*?)\\)\\s*`',
    'i'
  );
  const match = source.match(pattern);
  return match ? match[1] : null;
}

describe('initDatabase student identity schema', () => {
  const source = fs.readFileSync(INIT_DB, 'utf8');

  it('never creates a student_index column', () => {
    expect(source).not.toMatch(/student_index/i);
  });

  it.each(ADM_NO_TABLES)('creates %s with adm_no', (table) => {
    const block = createTableBlock(source, table);
    expect(block).not.toBeNull();
    expect(block).toMatch(/\badm_no\b/i);
  });

  it('declares adm_no as NOT NULL in every per-student table', () => {
    for (const table of ADM_NO_TABLES) {
      const block = createTableBlock(source, table);
      expect(block).not.toBeNull();
      const admNoLine = block.split('\n').find((line) => /\badm_no\b/i.test(line));
      expect(admNoLine).toMatch(/NOT NULL/i);
    }
  });
});
