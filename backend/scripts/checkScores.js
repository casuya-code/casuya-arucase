/**
 * Check Scores for FORM I, stream A, subject 0181, month November, year 2025
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkScores() {
  try {
    console.log('Checking scores for FORM I, stream A, subject 0181, month November, year 2025...\n');
    
    // Check if subject exists
    const subjectResult = await query(
      "SELECT subject_code, subject_name FROM subjects WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181'"
    );
    
    if (subjectResult.rows.length === 0) {
      console.log('⚠️  Subject 0181 not found for FORM I, stream A, year 2025');
      console.log('\nChecking available subjects...');
      const allSubjects = await query(
        "SELECT subject_code, subject_name FROM subjects WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 ORDER BY subject_code"
      );
      console.log(`Found ${allSubjects.rows.length} subjects:`);
      allSubjects.rows.forEach(s => {
        console.log(`  ${s.subject_code}: ${s.subject_name}`);
      });
    } else {
      console.log(`✅ Subject found: ${subjectResult.rows[0].subject_code} - ${subjectResult.rows[0].subject_name}\n`);
    }
    
    // Check students
    const studentsResult = await query(
      "SELECT COUNT(*) as count FROM students WHERE level = 'FORM I' AND stream = 'A' AND year = 2025"
    );
    console.log(`Students: ${studentsResult.rows[0].count}`);
    
    // Check scores
    const scoresResult = await query(
      "SELECT COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181' AND month = 'November'"
    );
    console.log(`Scores for November: ${scoresResult.rows[0].count}\n`);
    
    if (parseInt(scoresResult.rows[0].count) > 0) {
      const scores = await query(
        "SELECT adm_no, score FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181' AND month = 'November' ORDER BY adm_no LIMIT 10"
      );
      console.log('Sample scores:');
      scores.rows.forEach(s => {
        console.log(`  ${s.adm_no}: ${s.score}`);
      });
    } else {
      console.log('⚠️  No scores found for November');
      console.log('\nChecking other months...');
      const monthsResult = await query(
        "SELECT DISTINCT month, COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181' GROUP BY month ORDER BY month"
      );
      if (monthsResult.rows.length > 0) {
        console.log('Available months:');
        monthsResult.rows.forEach(m => {
          console.log(`  ${m.month}: ${m.count} scores`);
        });
      } else {
        console.log('  No scores found for this subject');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkScores();
