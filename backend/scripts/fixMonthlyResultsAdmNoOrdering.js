/**
 * Correct monthly_results.adm_no rows that were mapped with the wrong roster
 * ordering.
 *
 * Background: monthly_results used to be keyed by student_index, a position in
 * the class roster returned by Postgres `ORDER BY adm_no` (lexicographic). The
 * first backfill sorted adm_no numerically instead, and the two orders diverge
 * whenever admission numbers have different lengths (e.g. 1711 < 11754 in
 * Postgres, but 1711 > 11754 numerically). That shifted the mapping inside the
 * affected classes.
 *
 * The original index is recoverable for already-linked rows: it is the position
 * of the current adm_no in the numeric roster the backfill used. Mapping that
 * index onto the Postgres-ordered roster gives the student the row actually
 * belongs to.
 *
 * Run with --dry-run to inspect the counts without writing.
 *   node scripts/fixMonthlyResultsAdmNoOrdering.js --dry-run
 */
const { query, withTransaction } = require('../config/database');
const { getTermFromMonth } = require('../utils/monthlyResultsBackfill');

const norm = (v) => String(v ?? '').trim().toUpperCase();

function numericSort(students) {
  return [...students].sort((a, b) =>
    String(a.adm_no || '').localeCompare(String(b.adm_no || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

function buildRosters(students, level, stream, month) {
  const streamKey = norm(stream);
  const isFormVOrVI = /^FORM\s+(V|VI)$/i.test(String(level).trim());
  const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(String(level).trim());

  let filtered = students;
  if (isFormVOrVI) {
    const term = getTermFromMonth(month, level);
    if (term) filtered = filtered.filter((s) => String(s.term || '').trim() === term);
    filtered = filtered.filter((s) => String(s.status || '').toUpperCase() !== 'PROMOTED');
  }
  if (streamKey !== 'ALL') {
    if (isFormIToIV && (streamKey === 'A' || streamKey === 'NA')) {
      filtered = filtered.filter((s) => ['A', 'NA'].includes(norm(s.stream)));
    } else {
      filtered = filtered.filter((s) => norm(s.stream) === streamKey);
    }
  }

  return {
    sqlRoster: filtered.map((s) => String(s.adm_no)),
    numericRoster: numericSort(filtered).map((s) => String(s.adm_no)),
  };
}

async function collectUpdates() {
  const classes = await query(
    `SELECT DISTINCT level, stream, year FROM monthly_results ORDER BY level, stream, year`);

  const updates = [];
  const unmapped = [];
  let inspected = 0;

  for (const c of classes.rows) {
    const year = parseInt(c.year, 10);
    const studentsRes = await query(
      'SELECT adm_no, stream, term, status FROM students WHERE level = $1 AND year = $2 ORDER BY adm_no',
      [c.level, year]);

    const months = await query(
      'SELECT DISTINCT month FROM monthly_results WHERE level = $1 AND stream = $2 AND year = $3',
      [c.level, c.stream, year]);

    for (const m of months.rows) {
      const { sqlRoster, numericRoster } = buildRosters(studentsRes.rows, c.level, c.stream, m.month);
      if (sqlRoster.join('|') === numericRoster.join('|')) continue;

      const rows = await query(
        `SELECT id, adm_no FROM monthly_results
         WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4 ORDER BY id`,
        [c.level, c.stream, year, m.month]);

      for (const row of rows.rows) {
        inspected += 1;
        const current = String(row.adm_no);
        const idx = numericRoster.indexOf(current);
        const correct = idx >= 0 ? sqlRoster[idx] : undefined;

        if (!correct) {
          unmapped.push({ id: row.id, class: `${c.level}/${c.stream}/${year}/${m.month}`, current });
          continue;
        }
        if (correct !== current) {
          updates.push({ id: row.id, from: current, to: correct, class: `${c.level}/${c.stream}/${year}/${m.month}` });
        }
      }
    }
  }

  return { updates, unmapped, inspected };
}

async function verify() {
  const nulls = await query('SELECT count(*)::int AS n FROM monthly_results WHERE adm_no IS NULL');
  const dupes = await query(`
    SELECT level, stream, year, month, adm_no, count(*)::int AS n
    FROM monthly_results
    GROUP BY level, stream, year, month, adm_no
    HAVING count(*) > 1`);
  return { nulls: nulls.rows[0].n, duplicates: dupes.rows };
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const { updates, unmapped, inspected } = await collectUpdates();

  console.log('rows inspected in classes with divergent ordering:', inspected);
  console.log('rows to re-link:', updates.length);
  console.log('rows that could not be re-linked:', unmapped.length);
  updates.slice(0, 10).forEach((u) => console.log('  ', JSON.stringify(u)));
  unmapped.slice(0, 10).forEach((u) => console.log('  UNMAPPED', JSON.stringify(u)));

  if (unmapped.length) {
    console.log('\nAborting: some rows cannot be re-linked safely.');
    process.exitCode = 1;
    return;
  }
  if (dryRun || updates.length === 0) {
    console.log(dryRun ? '\nDry run: no changes written.' : '\nNothing to do.');
    return;
  }

  await withTransaction(async (client) => {
    // Drop the unique key so swapped rows can be updated without transient conflicts.
    await client.query('DROP INDEX IF EXISTS uq_monthly_results_adm_no');
    for (const u of updates) {
      await client.query('UPDATE monthly_results SET adm_no = $1, updated_at = NOW() WHERE id = $2', [u.to, u.id]);
    }
    await client.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_monthly_results_adm_no ON monthly_results(level, stream, year, month, adm_no)'
    );

    const nulls = await client.query('SELECT count(*)::int AS n FROM monthly_results WHERE adm_no IS NULL');
    if (nulls.rows[0].n !== 0) throw new Error(`adm_no became NULL for ${nulls.rows[0].n} rows`);
    const dupes = await client.query(`
      SELECT count(*)::int AS n FROM (
        SELECT 1 FROM monthly_results
        GROUP BY level, stream, year, month, adm_no HAVING count(*) > 1
      ) d`);
    if (dupes.rows[0].n !== 0) throw new Error(`duplicate identity keys after update: ${dupes.rows[0].n}`);
  });

  const post = await verify();
  console.log('\nRe-linked monthly_results rows:', updates.length);
  console.log('NULL adm_no rows:', post.nulls);
  console.log('duplicate identity groups:', post.duplicates.length);
  console.log('✅ monthly_results identity corrected.');
}

run()
  .then(() => process.exit(process.exitCode || 0))
  .catch((e) => { console.error('Correction failed:', e.message); process.exit(1); });
