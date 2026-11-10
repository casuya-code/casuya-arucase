const { query, pool } = require('../../config/database');
const { classKey, sortByName, selectRoster } = require('../../utils/studentPhotoBackfill');

async function ensureSchema() {
  await query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);
  await query(`ALTER TABLE comments ALTER COLUMN student_index DROP NOT NULL`);
  await query(`ALTER TABLE tabia_mwenendo ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);
  await query(`ALTER TABLE tabia_mwenendo ALTER COLUMN student_index DROP NOT NULL`);
  await query(`ALTER TABLE student_parishes ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);
  await query(`ALTER TABLE student_parishes ALTER COLUMN student_index DROP NOT NULL`);
}

async function backfillTable(table, hasTerm) {
  const studentsResult = await query(`SELECT adm_no, first_name, middle_name, surname, level, stream, year, term FROM students`);
  let rowsResult;
  if (hasTerm) {
    rowsResult = await query(`SELECT id, level, stream, year, term, student_index, adm_no FROM ${table} WHERE adm_no IS NULL`);
  } else {
    rowsResult = await query(`SELECT id, level, stream, year, student_index, adm_no FROM ${table} WHERE adm_no IS NULL`);
  }

  const studentsByClass = new Map();
  for (const s of studentsResult.rows) {
    const key = hasTerm ? `${s.level}|${s.stream}|${s.year}|${s.term}` : `${s.level}|${s.stream}|${s.year}`;
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(s);
  }

  const rowsByClass = new Map();
  for (const r of rowsResult.rows) {
    const key = hasTerm ? `${r.level}|${r.stream}|${r.year}|${r.term}` : `${r.level}|${r.stream}|${r.year}`;
    if (!rowsByClass.has(key)) rowsByClass.set(key, []);
    rowsByClass.get(key).push(r);
  }

  const updates = [];
  for (const [key, rows] of rowsByClass.entries()) {
    const studentsInClass = studentsByClass.get(key) || [];
    // For parishes (no term), students may be grouped by term; flatten all terms.
    const allStudents = hasTerm ? studentsInClass : studentsResult.rows.filter(s => `${s.level}|${s.stream}|${s.year}` === key);
    const maxIdx = rows.reduce((m, r) => Math.max(m, Number(r.student_index) || 0), 0);
    const { roster } = hasTerm ? selectRosterForTerm(allStudents, maxIdx) : selectRosterSimple(allStudents, maxIdx);
    if (!roster) continue;
    for (const r of rows) {
      const owner = roster[Number(r.student_index)];
      if (owner && owner.adm_no) updates.push({ id: r.id, admNo: owner.adm_no });
    }
  }

  if (updates.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const u of updates) {
        await client.query(`UPDATE ${table} SET adm_no = $1 WHERE id = $2`, [u.admNo, u.id]);
      }
      await client.query('COMMIT');
      console.log(`✅ ${table}: linked ${updates.length} rows`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    console.log(`✅ ${table}: nothing to link`);
  }
}

function selectRosterForTerm(students, maxIdx) {
  // reuse selectRoster from backfill util
  const { selectRoster } = require('../../utils/studentPhotoBackfill');
  return selectRoster(students, maxIdx);
}

function selectRosterSimple(students, maxIdx) {
  const { sortByName } = require('../../utils/studentPhotoBackfill');
  const roster = sortByName(students);
  if (roster.length <= maxIdx) return { roster: null };
  return { roster };
}

async function main() {
  console.log('\n🔗 Backfilling comments, tabia_mwenendo, student_parishes adm_no\n');
  await ensureSchema();
  await backfillTable('comments', true);
  await backfillTable('tabia_mwenendo', true);
  await backfillTable('student_parishes', false);
  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Failed:', e.message);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});