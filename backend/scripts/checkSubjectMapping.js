/**
 * Check Subject Code vs Abbreviation Mapping
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkMapping() {
  try {
    console.log('Checking subject code mapping...\n');
    
    // Get subject 0181 details
    const subject = await query(
      "SELECT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181'"
    );
    
    if (subject.rows.length > 0) {
      const subj = subject.rows[0];
      console.log(`Subject 0181:`);
      console.log(`   Code: ${subj.subject_code}`);
      console.log(`   Name: ${subj.subject_name}`);
      console.log(`   Abbreviation: ${subj.subject_abbreviation}\n`);
      
      // Check scores with code
      const scoresByCode = await query(
        "SELECT COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = '0181'"
      );
      console.log(`Scores with subject_code='0181': ${scoresByCode.rows[0].count}`);
      
      // Check scores with abbreviation
      const scoresByAbbr = await query(
        "SELECT COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = $1",
        [subj.subject_abbreviation]
      );
      console.log(`Scores with subject_code='${subj.subject_abbreviation}': ${scoresByAbbr.rows[0].count}`);
      
      // Check what subject_codes are actually used in scores
      console.log('\nSubject codes used in scores for FORM I, stream A, year 2025:');
      const usedCodes = await query(
        "SELECT DISTINCT subject_code, COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 GROUP BY subject_code ORDER BY subject_code"
      );
      usedCodes.rows.forEach(row => {
        console.log(`   ${row.subject_code}: ${row.count} scores`);
      });
      
      // Check if BIO scores exist for November
      if (subj.subject_abbreviation) {
        const novScores = await query(
          "SELECT COUNT(*) as count FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = $1 AND month = 'November'",
          [subj.subject_abbreviation]
        );
        console.log(`\nScores for ${subj.subject_abbreviation} in November: ${novScores.rows[0].count}`);
        
        if (parseInt(novScores.rows[0].count) > 0) {
          const samples = await query(
            "SELECT adm_no, score FROM individual_scores WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND subject_code = $1 AND month = 'November' ORDER BY adm_no LIMIT 5",
            [subj.subject_abbreviation]
          );
          console.log('Sample scores:');
          samples.rows.forEach(s => {
            console.log(`   ${s.adm_no}: ${s.score}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkMapping();
