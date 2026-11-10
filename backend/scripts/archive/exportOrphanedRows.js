/**
 * Export rows with no adm_no link (legacy positional student_index only) to CSV.
 *
 * Run: node scripts/exportOrphanedRows.js [outputPath]
 * Default output: reports/orphaned_student_index_rows_<date>.csv
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../../config/database');

const TABLES = [
  { name: 'monthly_results', columns: ['student_index', 'total_marks', 'average', 'grade', 'position', 'remarks'] },
  { name: 'comments', columns: ['term', 'comment_type', 'student_index', 'comment_text'] },
  { name: 'tabia_mwenendo', columns: ['term', 'student_index', 'criterion', 'evaluation'] },
  { name: 'student_parishes', columns: ['student_index', 'parish_name'] },
  { name: 'individual_debt', columns: ['term', 'student_index', 'amount', 'description', 'status'] },
];

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function run() {
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = process.argv[2] || path.join(__dirname, '..', '..', 'reports', `orphaned_student_index_rows_${stamp}.csv`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const header = ['table', 'id', 'level', 'stream', 'year', 'term', 'student_index', 'adm_no', 'details'];
  const lines = [header.join(',')];
  let total = 0;

  for (const { name, columns } of TABLES) {
    const selectCols = ['id', 'level', 'stream', 'year', 'adm_no', ...columns.filter((c) => c !== 'student_index')];
    const rows = await query(
      `SELECT ${selectCols.join(', ')}, student_index FROM ${name} WHERE adm_no IS NULL ORDER BY level, stream, year, id`
    );

    for (const row of rows.rows) {
      total += 1;
      const details = columns
        .filter((c) => c !== 'student_index' && c !== 'term')
        .map((c) => `${c}=${row[c] ?? ''}`)
        .join(' | ');
      lines.push([
        name,
        row.id,
        row.level,
        row.stream,
        row.year,
        row.term ?? '',
        row.student_index ?? '',
        row.adm_no ?? '',
        details,
      ].map(csvEscape).join(','));
    }
  }

  fs.writeFileSync(outPath, lines.join('\r\n'), 'utf8');
  console.log(`Wrote ${total} orphaned row(s) to ${outPath}`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Export failed:', e.message);
    process.exit(1);
  });
