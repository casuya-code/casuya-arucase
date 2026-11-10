/**
 * Guard the student identity schema.
 *
 * Run: node scripts/verifyStudentIdentitySchema.js
 *
 * `adm_no` is the canonical identity for academic data. The old positional
 * `student_index` is retired: it shifted whenever the roster changed, which
 * silently re-attributed rows to other students.
 *
 * Fails (exit 1) when:
 *  - any table still has a `student_index` column, or
 *  - an identity table is missing `adm_no`, or `adm_no` accepts NULL.
 */
const { query } = require('../config/database');

// Tables that store per-student academic data and must key on adm_no.
const ADM_NO_TABLES = [
  'students',
  'student_photos',
  'student_parishes',
  'individual_scores',
  'monthly_results',
  'comments',
  'tabia_mwenendo',
  'individual_debt',
  'student_history',
  'student_pass_ids',
  'promotion_exclusions',
];

async function run() {
  const errors = [];

  const leftovers = await query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name ILIKE '%student_index%'
    ORDER BY table_name`);

  for (const row of leftovers.rows) {
    errors.push(`${row.table_name}.${row.column_name} still exists (student_index is retired)`);
  }

  for (const table of ADM_NO_TABLES) {
    const columns = await query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );

    if (columns.rows.length === 0) {
      console.warn(`⚠️  ${table}: table not found, skipped`);
      continue;
    }

    const admNo = columns.rows.find((c) => c.column_name === 'adm_no');
    if (!admNo) {
      errors.push(`${table} is missing its adm_no column`);
      continue;
    }
    if (String(admNo.is_nullable).toUpperCase() === 'YES') {
      errors.push(`${table}.adm_no is nullable`);
    }
  }

  if (errors.length) {
    console.error('❌ Student identity schema check failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
    return;
  }

  console.log(`✅ No student_index columns; adm_no is NOT NULL on ${ADM_NO_TABLES.length} identity tables.`);
}

run()
  .then(() => process.exit(process.exitCode || 0))
  .catch((e) => {
    console.error('Schema check failed:', e.message);
    process.exit(1);
  });
