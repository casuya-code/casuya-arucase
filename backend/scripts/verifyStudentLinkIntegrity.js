/**
 * Verify that every adm_no link points at a real student in the same class.
 *
 * Run: node scripts/verifyStudentLinkIntegrity.js
 *
 * A "mismatch" means the row's adm_no does not exist in students for that
 * level/stream/year (A/NA treated as equivalent for FORM I-IV), or the term
 * does not match for FORM V/VI. Mismatches indicate a bad backfill link.
 *
 * PRE-FORM ONE rows are validated against preform_one_students (its admission
 * numbers live there, not in the students table).
 */
const { query } = require('../config/database');

const TABLES = [
  { name: 'monthly_results', hasTerm: false, formVTerm: true },
  { name: 'comments', hasTerm: true },
  { name: 'tabia_mwenendo', hasTerm: true },
  { name: 'student_parishes', hasTerm: false },
  { name: 'individual_debt', hasTerm: true },
];

const FORM_I_TO_IV = /^FORM\s+(I|II|III|IV)$/i;
const FORM_V_OR_VI = /^FORM\s+(V|VI)$/i;

function normalizeTerm(term) {
  const t = String(term || '').trim();
  if (/^Term\s+I$/i.test(t) || /^First\s+Term$/i.test(t)) return 'First Term';
  if (/^Term\s+II$/i.test(t) || /^Second\s+Term$/i.test(t)) return 'Second Term';
  return t || null;
}

async function run() {
  let totalMismatch = 0;

  for (const { name, hasTerm } of TABLES) {
    const rows = await query(
      `SELECT ${name}.* FROM ${name} WHERE ${name}.adm_no IS NOT NULL`
    );

    let checked = 0;
    let mismatches = 0;
    const samples = [];

    for (const row of rows.rows) {
      checked += 1;
      const level = String(row.level || '').trim().toUpperCase();

      let found;
      if (level === 'PRE-FORM ONE') {
        found = await query(
          'SELECT 1 FROM preform_one_students WHERE admission_number = $1 AND year = $2 LIMIT 1',
          [row.adm_no, parseInt(row.year, 10)]
        );
      } else {
        const isFormIToIV = FORM_I_TO_IV.test(level);
        const isFormVOrVI = FORM_V_OR_VI.test(level);
        const stream = String(row.stream || '').trim().toUpperCase();

        const params = [row.adm_no, row.level, parseInt(row.year, 10)];
        let sql = 'SELECT 1 FROM students WHERE adm_no = $1 AND level = $2 AND year = $3';

        if (isFormIToIV && (stream === 'A' || stream === 'NA')) {
          sql += ` AND stream IN ('A', 'NA')`;
        } else if (isFormVOrVI && stream === 'ALL') {
          // ALL means every stream in that level/year; no stream filter.
        } else {
          sql += ' AND stream = $4';
          params.push(row.stream);
        }

        if (hasTerm && isFormVOrVI && row.term) {
          sql += ` AND term = $${params.length + 1}`;
          params.push(normalizeTerm(row.term));
        }

        found = await query(`${sql} LIMIT 1`, params);
      }

      if (found.rows.length === 0) {
        mismatches += 1;
        if (samples.length < 10) {
          samples.push({
            id: row.id,
            level: row.level,
            stream: row.stream,
            year: row.year,
            term: row.term ?? null,
            adm_no: row.adm_no,
          });
        }
      }
    }

    totalMismatch += mismatches;
    console.log(`\n=== ${name} ===`);
    console.log(`  checked: ${checked}`);
    console.log(`  mismatches: ${mismatches}`);
    if (samples.length) {
      console.log('  samples:');
      samples.forEach((s) => console.log('   ', JSON.stringify(s)));
    }
  }

  console.log(`\nTotal mismatches across all tables: ${totalMismatch}`);
  if (totalMismatch === 0) {
    console.log('✅ Every linked adm_no resolves to a student in the same class/year.');
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Verification failed:', e.message);
    process.exit(1);
  });
