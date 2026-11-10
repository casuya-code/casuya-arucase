const { query } = require('../../config/database');
const { buildRoster, admNoForIndex } = require('../../utils/nameSortedBackfill');

const TABLE = 'individual_debt';

async function run() {
  const groups = await query(
    `SELECT DISTINCT level, stream, year, term FROM ${TABLE} ORDER BY level, stream, year, term`
  );

  let total = 0, linked = 0, orphaned = 0;
  const orphans = [];

  for (const g of groups.rows) {
    const { level, stream, year, term } = g;
    const studentsRes = await query(
      `SELECT adm_no, level, stream, year, term, status, first_name, middle_name, surname
         FROM students
        WHERE level = $1 AND year = $2
        ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [level, parseInt(year, 10)]
    );
    const roster = buildRoster(studentsRes.rows, level, stream, year, term, { presorted: true });

    const rowsRes = await query(
      `SELECT id, student_index FROM ${TABLE} WHERE level = $1 AND stream = $2 AND year = $3 AND term IS NOT DISTINCT FROM $4 AND adm_no IS NULL`,
      [level, stream, parseInt(year, 10), term]
    );

    for (const row of rowsRes.rows) {
      total += 1;
      const admNo = admNoForIndex(roster, row.student_index);
      if (admNo) {
        try {
          await query(`UPDATE ${TABLE} SET adm_no = $1 WHERE id = $2 AND adm_no IS NULL`, [admNo, row.id]);
          linked += 1;
        } catch (e) {
          // unique constraint conflict; skip
        }
      } else {
        orphaned += 1;
        orphans.push({ level, stream, year, term, student_index: row.student_index });
      }
    }
  }

  console.log(`${TABLE} backfill complete`);
  console.log('Total rows:', total);
  console.log('Linked to adm_no:', linked);
  console.log('Orphaned (left NULL):', orphaned);
  if (orphans.length) {
    console.log('Orphaned sample (first 20):');
    orphans.slice(0, 20).forEach((o) => console.log(JSON.stringify(o)));
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error('Backfill failed:', e.message); process.exit(1); });
