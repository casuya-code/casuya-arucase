/**
 * Archive rows that have no adm_no link before retiring student_index columns.
 *
 * Creates a JSON snapshot on disk and a DB archive table:
 *   student_index_orphan_archive(table_name, row_id, data jsonb, archived_at)
 *
 * Run: node scripts/archiveOrphanedRows.js
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../../config/database');

const TABLES = ['monthly_results', 'comments', 'tabia_mwenendo', 'student_parishes', 'individual_debt'];

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS student_index_orphan_archive (
      id SERIAL PRIMARY KEY,
      table_name VARCHAR(60) NOT NULL,
      row_id INTEGER NOT NULL,
      data JSONB NOT NULL,
      archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, '..', '..', 'reports', `orphaned_student_index_rows_${stamp}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const snapshot = {};
  let total = 0;

  for (const name of TABLES) {
    const rows = await query(`SELECT * FROM ${name} WHERE adm_no IS NULL ORDER BY id`);
    snapshot[name] = rows.rows;
    total += rows.rows.length;

    for (const row of rows.rows) {
      await query(
        `INSERT INTO student_index_orphan_archive (table_name, row_id, data)
         VALUES ($1, $2, $3::jsonb)`,
        [name, row.id, JSON.stringify(row)]
      );
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Archived ${total} orphaned row(s).`);
  console.log(`JSON snapshot: ${outPath}`);
  console.log('DB archive table: student_index_orphan_archive');
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('Archive failed:', e.message);
  process.exit(1);
});
