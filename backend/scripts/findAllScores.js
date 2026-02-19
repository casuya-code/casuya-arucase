/**
 * Find ALL scores for subject 0181, FORM I, year 2025
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function findAllScores() {
  try {
    console.log('Finding ALL scores for subject 0181, FORM I, year 2025...\n');
    
    // Check all scores for this subject regardless of stream/month
    const allScores = await query(
      "SELECT stream, month, COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND year = 2025 AND subject_code = '0181' GROUP BY stream, month ORDER BY stream, month"
    );
    
    if (allScores.rows.length > 0) {
      console.log('Found scores:');
      allScores.rows.forEach(row => {
        console.log(`   Stream: ${row.stream}, Month: ${row.month}, Count: ${row.count}`);
      });
      
      // Get sample scores
      console.log('\nSample scores:');
      const samples = await query(
        "SELECT adm_no, stream, month, score FROM individual_scores WHERE level = 'FORM I' AND year = 2025 AND subject_code = '0181' ORDER BY stream, month, adm_no LIMIT 10"
      );
      samples.rows.forEach(s => {
        console.log(`   ${s.adm_no} | Stream: ${s.stream} | Month: ${s.month} | Score: ${s.score}`);
      });
    } else {
      console.log('❌ No scores found for subject 0181, FORM I, year 2025');
      
      // Check if scores exist for this subject at all
      const anyScores = await query(
        "SELECT COUNT(*) as count FROM individual_scores WHERE subject_code = '0181'"
      );
      console.log(`\nTotal scores for subject 0181 across all forms: ${anyScores.rows[0].count}`);
      
      // Check what subjects have scores
      const subjectsWithScores = await query(
        "SELECT DISTINCT subject_code, level, stream, COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND year = 2025 GROUP BY subject_code, level, stream ORDER BY subject_code LIMIT 10"
      );
      if (subjectsWithScores.rows.length > 0) {
        console.log('\nSubjects with scores for FORM I, year 2025:');
        subjectsWithScores.rows.forEach(row => {
          console.log(`   ${row.subject_code} | Stream: ${row.stream} | Count: ${row.count}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

findAllScores();
