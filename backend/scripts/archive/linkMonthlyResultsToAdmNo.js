const { query } = require('../../config/database');
const { buildRoster, admNoForIndex } = require('../../utils/monthlyResultsBackfill');

async function run() {
  // Ensure column exists.
  await query('ALTER TABLE monthly_results ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)');

  // Distinct class groups present in monthly_results.
  const groups = await query(
    'SELECT DISTINCT level, stream, year FROM monthly_results ORDER BY level, stream, year'
  );

  let total = 0;
  let linked = 0;
  let orphaned = 0;
  const orphans = [];

  for (const g of groups.rows) {
    const { level, stream, year } = g;
    const isFormVOrVI = /^FORM\s+(V|VI)$/i.test(String(level).trim());

    // Load all students for this level/year (any stream/term) once.
    const studentsRes = await query(
      'SELECT adm_no, stream, term, status FROM students WHERE level = $1 AND year = $2',
      [level, parseInt(year, 10)]
    );
    const allStudents = studentsRes.rows;

    // Distinct months for this group.
    const monthsRes = await query(
      'SELECT DISTINCT month FROM monthly_results WHERE level = $1 AND stream = $2 AND year = $3',
      [level, stream, parseInt(year, 10)]
    );

    for (const m of monthsRes.rows) {
      const month = m.month;
      const { roster } = buildRoster(allStudents, level, stream, month, isFormVOrVI);

      // Fetch rows for this group/month.
      const rowsRes = await query(
        'SELECT id, student_index FROM monthly_results WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4',
        [level, stream, parseInt(year, 10), month]
      );

      for (const row of rowsRes.rows) {
        total += 1;
        const admNo = admNoForIndex(roster, row.student_index);
        if (admNo) {
          linked += 1;
          await query('UPDATE monthly_results SET adm_no = $1 WHERE id = $2', [admNo, row.id]);
        } else {
          orphaned += 1;
          orphans.push({ level, stream, year, month, student_index: row.student_index });
        }
      }
    }
  }

  // Indexes for fast lookup.
  await query('CREATE INDEX IF NOT EXISTS idx_monthly_results_adm_no ON monthly_results(adm_no)');
  await query(
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_monthly_results_adm_no ON monthly_results(level, stream, year, month, adm_no) WHERE adm_no IS NOT NULL'
  );

  console.log('Monthly results backfill complete');
  console.log('Total rows:', total);
  console.log('Linked to adm_no:', linked);
  console.log('Orphaned (left NULL):', orphaned);
  if (orphans.length) {
    console.log('Orphaned rows sample (first 20):');
    orphans.slice(0, 20).forEach((o) => console.log(JSON.stringify(o)));
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Backfill failed:', e.message);
    process.exit(1);
  });
