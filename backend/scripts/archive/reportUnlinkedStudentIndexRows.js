/**
 * Report rows that still have no adm_no link (legacy positional student_index only).
 *
 * Run: node scripts/reportUnlinkedStudentIndexRows.js
 *
 * These rows are the remaining risk area: their student_index points outside the
 * current roster, so we cannot safely infer who they belonged to. Review before
 * deleting or manually linking.
 */
const { query } = require('../../config/database');

const TABLES = [
  { name: 'monthly_results', hasTerm: false },
  { name: 'comments', hasTerm: true },
  { name: 'tabia_mwenendo', hasTerm: true },
  { name: 'student_parishes', hasTerm: false },
  { name: 'individual_debt', hasTerm: true },
];

async function run() {
  let grandTotal = 0;

  for (const { name, hasTerm } of TABLES) {
    const termCol = hasTerm ? ', term' : '';
    const groupSql = `
      SELECT level, stream, year${termCol}, count(*) AS row_count
      FROM ${name}
      WHERE adm_no IS NULL
      GROUP BY level, stream, year${termCol}
      ORDER BY level, stream, year${hasTerm ? ', term' : ''}
    `;

    const groups = await query(groupSql);

    console.log(`\n=== ${name}: ${groups.rows.reduce((n, r) => n + Number(r.row_count), 0)} unlinked row(s) ===`);
    if (groups.rows.length === 0) {
      console.log('  (none)');
      continue;
    }

    for (const g of groups.rows) {
      grandTotal += Number(g.row_count);
      const term = hasTerm ? ` term=${g.term ?? 'NULL'}` : '';
      console.log(
        `  ${g.level} | stream=${g.stream} | year=${g.year}${term} | rows=${g.row_count}`
      );

      // Show the offending student_index values for this group.
      const detailSql = `
        SELECT student_index, count(*) AS n
        FROM ${name}
        WHERE adm_no IS NULL AND level = $1 AND stream = $2 AND year = $3
          ${hasTerm ? 'AND term IS NOT DISTINCT FROM $4' : ''}
        GROUP BY student_index
        ORDER BY min(id)
        LIMIT 50
      `;
      const params = hasTerm
        ? [g.level, g.stream, g.year, g.term]
        : [g.level, g.stream, g.year];
      const details = await query(detailSql, params);
      const idxList = details.rows
        .map((d) => `${d.student_index}${Number(d.n) > 1 ? `(x${d.n})` : ''}`)
        .join(', ');
      console.log(`    student_index: ${idxList}`);
    }
  }

  console.log(`\nTotal unlinked rows across all tables: ${grandTotal}`);
  console.log('These rows were left NULL because their positional index is out of range for the current roster.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Report failed:', e.message);
    process.exit(1);
  });
