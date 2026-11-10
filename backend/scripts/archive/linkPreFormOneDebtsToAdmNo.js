/**
 * Pre-Form One debts reuse the shared individual_debt table. Historically they
 * were stored with student_index = preform_one_students.id, which is stable but
 * not the identity used by every other module. This script rewrites those rows
 * to the student's admission number (adm_no), matching the rest of the app.
 *
 * Rows that cannot be matched to a Pre-Form One student in the same year are
 * left with adm_no = NULL and reported so they can be archived.
 */
const { query } = require('../../config/database');

const LEVEL = 'PRE-FORM ONE';

async function run() {
  const pending = await query(
    `SELECT d.id, d.year, d.student_index
       FROM individual_debt d
      WHERE UPPER(TRIM(d.level)) = $1 AND d.adm_no IS NULL`,
    [LEVEL]
  );

  let linked = 0;
  const orphans = [];

  for (const row of pending.rows) {
    const match = await query(
      `SELECT admission_number
         FROM preform_one_students
        WHERE year = $1 AND id::text = TRIM($2)
        LIMIT 1`,
      [parseInt(row.year, 10), String(row.student_index ?? '')]
    );

    const admNo = match.rows.length > 0 ? String(match.rows[0].admission_number || '').trim() : '';
    if (!admNo) {
      orphans.push(row);
      continue;
    }

    await query('UPDATE individual_debt SET adm_no = $1 WHERE id = $2 AND adm_no IS NULL', [admNo, row.id]);
    linked += 1;
  }

  console.log('Pre-Form One debt backfill complete');
  console.log('Pending rows:', pending.rows.length);
  console.log('Linked to adm_no:', linked);
  console.log('Orphaned (left NULL):', orphans.length);
  if (orphans.length) {
    console.log('Orphaned rows:');
    orphans.forEach((o) => console.log(JSON.stringify(o)));
  }
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('Pre-Form One debt backfill failed:', e.message);
  process.exit(1);
});
