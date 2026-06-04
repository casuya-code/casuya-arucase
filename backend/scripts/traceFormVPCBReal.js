/**
 * Trace real FORM V PCB data: students, scores, subjects by year + term
 * Run: node backend/scripts/traceFormVPCBReal.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query, pool } = require('../config/database');

async function main() {
  console.log('='.repeat(72));
  console.log('REAL DATA: FORM V PCB (year + term)');
  console.log('='.repeat(72));
  console.log();

  const pcb = await query(`
    SELECT year, term, COUNT(*)::int AS count,
           MIN(adm_no) AS sample_min_adm,
           MAX(adm_no) AS sample_max_adm
    FROM students
    WHERE level = 'FORM V' AND stream = 'PCB'
    GROUP BY year, term
    ORDER BY year DESC, term
  `);
  if (!pcb.rows.length) {
    console.log('No FORM V PCB students in database.\n');
  } else {
    console.log('Students grouped by year + term:');
    pcb.rows.forEach((r) => {
      console.log(
        `  year=${r.year}  term=${r.term || '(null)'}  count=${r.count}  adm_range=${r.sample_min_adm}..${r.sample_max_adm}`
      );
    });
    console.log();
  }

  console.log('UI mapping (getFormVVIYears labels for each DB year):');
  const currentYear = new Date().getFullYear();
  const labels = {};
  const seen = new Set();
  for (let startYear = 2025; startYear <= currentYear + 3; startYear++) {
    const range = `${startYear} - ${startYear + 1}`;
    if (!seen.has(startYear)) {
      labels[startYear] = `${startYear} (${range})`;
      seen.add(startYear);
    }
    const endYear = startYear + 1;
    if (!seen.has(endYear) && endYear <= currentYear + 4) {
      labels[endYear] = `${endYear} (${range})`;
      seen.add(endYear);
    }
  }
  for (const r of pcb.rows) {
    const y = r.year;
    console.log(`  DB year ${y} → screen card: "${labels[y] || y}" + term "${r.term}"`);
  }
  console.log();

  console.log('Scores (students with individual_scores, by student year/term):');
  const scores = await query(`
    SELECT s.year, s.term,
           COUNT(DISTINCT i.adm_no)::int AS students_with_scores,
           COUNT(i.*)::int AS score_rows,
           STRING_AGG(DISTINCT i.month, ', ' ORDER BY i.month) AS months
    FROM individual_scores i
    INNER JOIN students s
      ON i.adm_no = s.adm_no AND i.level = s.level AND i.stream = s.stream AND i.year = s.year
    WHERE s.level = 'FORM V' AND s.stream = 'PCB'
    GROUP BY s.year, s.term
    ORDER BY s.year DESC, s.term
  `);
  if (!scores.rows.length) console.log('  (none)\n');
  else {
    scores.rows.forEach((r) => {
      console.log(
        `  year=${r.year} term=${r.term} students=${r.students_with_scores} rows=${r.score_rows} months=[${r.months}]`
      );
    });
    console.log();
  }

  console.log('Subjects configured for FORM V PCB:');
  const subs = await query(`
    SELECT year, COUNT(*)::int AS n,
           STRING_AGG(subject_code, ', ' ORDER BY subject_code) AS codes
    FROM subjects
    WHERE level = 'FORM V' AND stream = 'PCB'
    GROUP BY year ORDER BY year DESC
  `);
  subs.rows.forEach((r) => console.log(`  year=${r.year} subjects=${r.n} [${r.codes}]`));
  console.log();

  console.log('Same adm_no in multiple year/term rows (PCB):');
  const dup = await query(`
    SELECT adm_no, COUNT(*)::int AS rows,
           STRING_AGG(year::text || ':' || COALESCE(term, '?'), ' | ' ORDER BY year, term) AS slots
    FROM students
    WHERE level = 'FORM V' AND stream = 'PCB'
    GROUP BY adm_no
    HAVING COUNT(*) > 1
    ORDER BY adm_no
    LIMIT 30
  `);
  console.log(`  ${dup.rows.length} student(s) with more than one row`);
  dup.rows.forEach((r) => console.log(`  ${r.adm_no}: ${r.slots}`));
  console.log();

  console.log('All FORM V streams — year + term counts:');
  const all = await query(`
    SELECT stream, year, term, COUNT(*)::int AS count
    FROM students WHERE level = 'FORM V'
    GROUP BY stream, year, term
    ORDER BY stream, year DESC, term
  `);
  all.rows.forEach((r) => {
    console.log(`  ${String(r.stream).padEnd(4)} year=${r.year} term=${String(r.term || '?').padEnd(14)} n=${r.count}`);
  });

  console.log('Every FORM V PCB student row:');
  const rows = await query(`
    SELECT adm_no, first_name, surname, year, term, status
    FROM students
    WHERE level = 'FORM V' AND stream = 'PCB'
    ORDER BY adm_no, year, term
  `);
  rows.rows.forEach((x) => {
    console.log(
      `  ${x.adm_no} ${x.first_name} ${x.surname} | year=${x.year} term=${x.term} status=${x.status}`
    );
  });

  const only2026 = await query(`
    SELECT adm_no FROM students
    WHERE level = 'FORM V' AND stream = 'PCB' AND year = 2026 AND term = 'Second Term'
    EXCEPT
    SELECT adm_no FROM students
    WHERE level = 'FORM V' AND stream = 'PCB' AND year = 2025
  `);
  console.log(
    `\nAdm in 2026 Second Term only (no 2025 row): ${only2026.rows.map((x) => x.adm_no).join(', ') || '(none)'}`
  );

  const only2025 = await query(`
    SELECT adm_no FROM students
    WHERE level = 'FORM V' AND stream = 'PCB' AND year = 2025 AND term = 'First Term'
    EXCEPT
    SELECT adm_no FROM students
    WHERE level = 'FORM V' AND stream = 'PCB' AND year = 2026
  `);
  console.log(
    `Adm in 2025 First Term only (no 2026 row): ${only2025.rows.map((x) => x.adm_no).join(', ') || '(none)'}`
  );

  console.log('\nSimulated UI paths (what registration would load):');
  for (const { y, t } of [
    { y: 2025, t: 'First Term' },
    { y: 2026, t: 'Second Term' },
    { y: 2026, t: 'First Term' },
    { y: 2025, t: 'Second Term' },
  ]) {
    const sim = await query(
      `SELECT COUNT(*)::int AS n FROM students WHERE level = 'FORM V' AND stream = 'PCB' AND year = $1 AND term = $2`,
      [y, t]
    );
    console.log(`  Pick card year=${y}, term=${t} → ${sim.rows[0].n} student(s)`);
  }

  console.log();
  console.log('='.repeat(72));
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
