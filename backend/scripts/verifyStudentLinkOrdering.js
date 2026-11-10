/**
 * Verify every adm_no link against the exact roster order the app uses.
 *
 * The old app renders positional rows by mapping the stored `student_index`
 * onto the *current* class roster:
 *   - comments / tabia_mwenendo / student_parishes / individual_debt
 *       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
 *   - monthly_results
 *       ORDER BY adm_no ASC (lexicographic), term derived from the month
 *
 * This script replays that ordering and checks each row:
 *   match            linked adm_no equals the roster position
 *   mismatch         linked adm_no is a different student  <-- misattribution
 *   unverifiable     linked but student_index is NULL
 *   out_of_range     NULL and the index is outside the roster (departed student)
 *   duplicate_skip   NULL but that roster slot is already linked by another copy
 *   unexpected_null  NULL but the slot was free and should have been linked
 *
 * Run: node scripts/verifyStudentLinkOrdering.js
 * Exits 1 if any mismatch or unexpected_null is found.
 */
const { query, pool } = require('../config/database');
const { buildRoster, admNoForIndex } = require('../utils/nameSortedBackfill');
const {
  buildRoster: buildMonthlyRoster,
  admNoForIndex: admNoForMonthlyIndex,
} = require('../utils/monthlyResultsBackfill');

const NAME_ORDER = 'first_name ASC, middle_name ASC NULLS LAST, surname ASC';

const NAME_TABLES = [
  { name: 'comments', hasTerm: true, scope: ['comment_type'] },
  { name: 'tabia_mwenendo', hasTerm: true, scope: ['criterion'] },
  { name: 'student_parishes', hasTerm: false, scope: [], dedupeByAdmNo: true },
  { name: 'individual_debt', hasTerm: true, scope: [] },
];

const DETAIL_LIMIT = 40;

function scopeKey(row, cols) {
  return cols.map((c) => String(row[c] ?? '')).join('|');
}

function blankResult(table) {
  return {
    table,
    linked: 0,
    match: 0,
    mismatch: 0,
    unverifiable: 0,
    nulls: 0,
    outOfRange: 0,
    duplicateSkip: 0,
    unexpectedNull: 0,
    details: [],
  };
}

function noteDetail(result, detail) {
  if (result.details.length < DETAIL_LIMIT) result.details.push(detail);
}

async function auditNameTable(t) {
  const groupCols = ['level', 'stream', 'year'];
  if (t.hasTerm) groupCols.push('term');

  const groups = await query(
    `SELECT DISTINCT ${groupCols.join(', ')} FROM ${t.name} ORDER BY ${groupCols.join(', ')}`
  );

  const result = blankResult(t.name);

  for (const g of groups.rows) {
    const { level, stream, year, term } = g;

    const studentsRes = await query(
      `SELECT adm_no, level, stream, year, term, status, first_name, middle_name, surname
         FROM students
        WHERE level = $1 AND year = $2
        ORDER BY ${NAME_ORDER}`,
      [level, parseInt(year, 10)]
    );
    const roster = buildRoster(
      studentsRes.rows,
      level,
      stream,
      year,
      t.hasTerm ? term : null,
      { presorted: true, dedupeByAdmNo: Boolean(t.dedupeByAdmNo) }
    );

    const where = ['level = $1', 'stream = $2', 'year = $3'];
    const params = [level, stream, parseInt(year, 10)];
    if (t.hasTerm) {
      where.push('term IS NOT DISTINCT FROM $4');
      params.push(term);
    }

    const cols = ['id', 'student_index', 'adm_no', ...t.scope];
    const rowsRes = await query(
      `SELECT ${cols.join(', ')} FROM ${t.name} WHERE ${where.join(' AND ')}`,
      params
    );

    const claimed = new Set();
    for (const row of rowsRes.rows) {
      if (row.adm_no) claimed.add(`${scopeKey(row, t.scope)}|${String(row.adm_no)}`);
    }

    const label = `${level}/${stream}/${year}${t.hasTerm ? `/${term}` : ''}`;

    for (const row of rowsRes.rows) {
      const expected = admNoForIndex(roster, row.student_index);

      if (row.adm_no) {
        result.linked += 1;
        if (row.student_index == null) {
          result.unverifiable += 1;
        } else if (expected && String(row.adm_no) === String(expected)) {
          result.match += 1;
        } else {
          result.mismatch += 1;
          noteDetail(result, {
            kind: 'mismatch',
            class: label,
            id: row.id,
            idx: row.student_index,
            linked: row.adm_no,
            expected,
          });
        }
      } else {
        result.nulls += 1;
        if (!expected) {
          result.outOfRange += 1;
        } else if (claimed.has(`${scopeKey(row, t.scope)}|${String(expected)}`)) {
          result.duplicateSkip += 1;
        } else {
          result.unexpectedNull += 1;
          noteDetail(result, {
            kind: 'unexpected_null',
            class: label,
            id: row.id,
            idx: row.student_index,
            expected,
          });
        }
      }
    }
  }

  return result;
}

async function auditMonthly() {
  const groups = await query(
    'SELECT DISTINCT level, stream, year, month FROM monthly_results ORDER BY level, stream, year, month'
  );

  const result = blankResult('monthly_results');

  for (const g of groups.rows) {
    const { level, stream, year, month } = g;

    const studentsRes = await query(
      'SELECT adm_no, level, stream, year, term, status FROM students WHERE level = $1 AND year = $2 ORDER BY adm_no ASC',
      [level, parseInt(year, 10)]
    );
    const isFormVOrVI = /^FORM\s+(V|VI)$/i.test(String(level).trim());
    const { roster } = buildMonthlyRoster(
      studentsRes.rows,
      level,
      stream,
      month,
      isFormVOrVI
    );

    const rowsRes = await query(
      `SELECT id, student_index, adm_no, month
         FROM monthly_results
        WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4`,
      [level, stream, parseInt(year, 10), month]
    );

    const claimed = new Set();
    for (const row of rowsRes.rows) {
      if (row.adm_no) claimed.add(String(row.adm_no));
    }

    const label = `${level}/${stream}/${year}/${month}`;

    for (const row of rowsRes.rows) {
      const expected = admNoForMonthlyIndex(roster, row.student_index);

      if (row.adm_no) {
        result.linked += 1;
        if (row.student_index == null) {
          result.unverifiable += 1;
        } else if (expected && String(row.adm_no) === String(expected)) {
          result.match += 1;
        } else {
          result.mismatch += 1;
          noteDetail(result, {
            kind: 'mismatch',
            class: label,
            id: row.id,
            idx: row.student_index,
            linked: row.adm_no,
            expected,
          });
        }
      } else {
        result.nulls += 1;
        if (!expected) {
          result.outOfRange += 1;
        } else if (claimed.has(String(expected))) {
          result.duplicateSkip += 1;
        } else {
          result.unexpectedNull += 1;
          noteDetail(result, {
            kind: 'unexpected_null',
            class: label,
            id: row.id,
            idx: row.student_index,
            expected,
          });
        }
      }
    }
  }

  return result;
}

async function main() {
  const results = [];

  for (const t of NAME_TABLES) {
    results.push(await auditNameTable(t));
  }
  results.push(await auditMonthly());

  let failed = false;

  for (const r of results) {
    console.log(JSON.stringify({
      table: r.table,
      linked: r.linked,
      match: r.match,
      mismatch: r.mismatch,
      unverifiable: r.unverifiable,
      nulls: r.nulls,
      outOfRange: r.outOfRange,
      duplicateSkip: r.duplicateSkip,
      unexpectedNull: r.unexpectedNull,
    }));
    for (const d of r.details) console.log(JSON.stringify(d));
    if (r.mismatch > 0 || r.unexpectedNull > 0) failed = true;
  }

  const totals = results.reduce((acc, r) => ({
    linked: acc.linked + r.linked,
    match: acc.match + r.match,
    mismatch: acc.mismatch + r.mismatch,
    unverifiable: acc.unverifiable + r.unverifiable,
    nulls: acc.nulls + r.nulls,
    outOfRange: acc.outOfRange + r.outOfRange,
    duplicateSkip: acc.duplicateSkip + r.duplicateSkip,
    unexpectedNull: acc.unexpectedNull + r.unexpectedNull,
  }), {
    linked: 0, match: 0, mismatch: 0, unverifiable: 0,
    nulls: 0, outOfRange: 0, duplicateSkip: 0, unexpectedNull: 0,
  });

  console.log(`TOTALS ${JSON.stringify(totals)}`);
  console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');

  await pool.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Audit failed:', error.message);
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
