/**
 * Final step of the student identity migration: retire the positional
 * student_index column and make adm_no the only identity.
 *
 * Safety:
 *  - Every live row without an adm_no must already be present in
 *    student_index_orphan_archive (written by scripts/archive/archiveOrphanedRows.js).
 *  - The script aborts before deleting anything if an unarchived orphan exists.
 *  - Everything runs in a single transaction, so a failure leaves the schema intact.
 *
 * Run after all application code has stopped reading/writing student_index:
 *   node scripts/migrateStudentIdentityToAdmNo.js
 */
const { withTransaction } = require('../config/database');

const TABLES = [
  'monthly_results',
  'comments',
  'tabia_mwenendo',
  'student_parishes',
  'individual_debt',
  'student_photos',
];

const UNIQUE_INDEXES = [
  {
    name: 'uq_monthly_results_adm_no',
    table: 'monthly_results',
    sql: `CREATE UNIQUE INDEX uq_monthly_results_adm_no
          ON monthly_results(level, stream, year, month, adm_no)`,
  },
  {
    name: 'uq_comments_adm_no',
    table: 'comments',
    sql: `CREATE UNIQUE INDEX uq_comments_adm_no
          ON comments(comment_type, level, stream, year, term, adm_no)`,
  },
  {
    name: 'uq_tabia_mwenendo_adm_no',
    table: 'tabia_mwenendo',
    sql: `CREATE UNIQUE INDEX uq_tabia_mwenendo_adm_no
          ON tabia_mwenendo(level, stream, year, term, adm_no, criterion)`,
  },
  {
    name: 'uq_student_parishes_adm_no',
    table: 'student_parishes',
    sql: `CREATE UNIQUE INDEX uq_student_parishes_adm_no
          ON student_parishes(level, stream, year, adm_no)`,
  },
  {
    name: 'uq_individual_debt_adm_no',
    table: 'individual_debt',
    sql: `CREATE UNIQUE INDEX uq_individual_debt_adm_no
          ON individual_debt(level, stream, year, term, adm_no) NULLS NOT DISTINCT`,
  },
  {
    name: 'uq_student_photos_adm_no',
    table: 'student_photos',
    sql: `CREATE UNIQUE INDEX uq_student_photos_adm_no
          ON student_photos(level, stream, year, adm_no)`,
  },
];

async function run() {
  let deleted = {};

  await withTransaction(async (client) => {
    // 1. Verify every live orphan has already been archived.
    for (const table of TABLES) {
      const live = await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE adm_no IS NULL`);
      const liveCount = live.rows[0].n;
      if (liveCount === 0) continue;

      const archived = await client.query(
        'SELECT count(*)::int AS n FROM student_index_orphan_archive WHERE table_name = $1',
        [table]
      );
      const archivedCount = archived.rows[0].n;
      if (liveCount > archivedCount) {
        throw new Error(
          `${table}: ${liveCount} rows have adm_no IS NULL but only ${archivedCount} are archived. ` +
          'Run scripts/archive/exportOrphanedRows.js and scripts/archive/archiveOrphanedRows.js first.'
        );
      }
    }

    // 2. Remove the archived orphan rows from the live tables.
    for (const table of TABLES) {
      const res = await client.query(`DELETE FROM ${table} WHERE adm_no IS NULL`);
      deleted[table] = res.rowCount;
    }

    // 3. Every remaining row now has an identity.
    for (const table of TABLES) {
      await client.query(`ALTER TABLE ${table} ALTER COLUMN adm_no SET NOT NULL`);
    }

    // 4. Replace legacy unique indexes and drop the positional column.
    //    Dropping student_index also removes any index/constraint that depends on it.
    await client.query('DROP INDEX IF EXISTS uq_monthly_results_adm_no');
    await client.query('DROP INDEX IF EXISTS uq_individual_debt_adm_no');

    for (const table of TABLES) {
      await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS student_index`);
    }

    // 5. Create the identity keys the application's ON CONFLICT clauses rely on.
    for (const index of UNIQUE_INDEXES) {
      await client.query(`DROP INDEX IF EXISTS ${index.name}`);
      await client.query(index.sql);
    }
  });

  console.log('Student identity migration complete.');
  console.log('Archived orphan rows removed:', deleted);
}

run().then(() => process.exit(0)).catch((error) => {
  console.error('Student identity migration failed:', error.message);
  process.exit(1);
});
