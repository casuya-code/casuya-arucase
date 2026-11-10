/**
 * Collision-safe backfill for student_parishes.adm_no.
 *
 * Fills adm_no only for rows where it is NULL, and never deletes or overwrites:
 *  - if the position maps to a student already linked in that class, the row is
 *    left NULL (it is a duplicate copy of the same student's parish record);
 *  - if the position is outside the roster, the row is left NULL (orphan).
 *
 * This avoids the unique-constraint abort that the archived script hits when a
 * class contains duplicate positional rows.
 *
 * Usage:
 *   node scripts/archive/linkParishesSafe.js --dry-run
 *   node scripts/archive/linkParishesSafe.js
 */
const { query, pool } = require('../../config/database');
const { buildRoster, admNoForIndex } = require('../../utils/nameSortedBackfill');

const TABLE = 'student_parishes';

function norm(value) {
  return String(value || '').trim().toUpperCase();
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const groups = await query(
    `SELECT DISTINCT level, stream, year FROM ${TABLE} ORDER BY level, stream, year`
  );

  let linked = 0;
  let duplicatesSkipped = 0;
  let orphaned = 0;
  const conflicts = [];

  for (const g of groups.rows) {
    const { level, stream, year } = g;
    const studentsRes = await query(
      `SELECT adm_no, level, stream, year, term, status, first_name, middle_name, surname
         FROM students
        WHERE level = $1 AND year = $2
        ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [level, parseInt(year, 10)]
    );
    const roster = buildRoster(studentsRes.rows, level, stream, year, null, { presorted: true, dedupeByAdmNo: true });

    const rowsRes = await query(
      `SELECT id, student_index, adm_no, parish_name
         FROM ${TABLE}
        WHERE level = $1 AND stream = $2 AND year = $3
        ORDER BY id`,
      [level, stream, parseInt(year, 10)]
    );

    const used = new Map();
    for (const row of rowsRes.rows) {
      if (row.adm_no) used.set(String(row.adm_no), row);
    }

    for (const row of rowsRes.rows) {
      if (row.adm_no) continue;
      const admNo = admNoForIndex(roster, row.student_index);
      if (!admNo) {
        orphaned += 1;
        continue;
      }
      const existing = used.get(String(admNo));
      if (existing) {
        if (norm(existing.parish_name) === norm(row.parish_name)) {
          duplicatesSkipped += 1;
        } else {
          conflicts.push({
            level, stream, year,
            id: row.id,
            student_index: row.student_index,
            adm_no: admNo,
            parish_name: row.parish_name,
            existing_id: existing.id,
            existing_parish: existing.parish_name,
          });
        }
        continue;
      }
      if (!dryRun) {
        try {
          await query(`UPDATE ${TABLE} SET adm_no = $1 WHERE id = $2 AND adm_no IS NULL`, [admNo, row.id]);
        } catch (error) {
          if (error.code === '23505') {
            duplicatesSkipped += 1;
            continue;
          }
          throw error;
        }
      }
      used.set(String(admNo), { ...row, adm_no: admNo });
      linked += 1;
    }
  }

  console.log(JSON.stringify({
    dryRun,
    linked,
    duplicatesSkipped,
    orphaned,
    conflicts,
  }, null, 1));
}

run()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (error) => {
    console.error('Parish backfill failed:', error.message);
    try { await pool.end(); } catch (_) { /* ignore */ }
    process.exit(1);
  });
