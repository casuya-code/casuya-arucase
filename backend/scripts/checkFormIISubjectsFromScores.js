/**
 * Check what FORM II subjects exist in the scores/individual_scores table
 */
const { query } = require('../config/database');

async function checkFormIISubjectsFromScores() {
  try {
    console.log('\n🔍 Checking FORM II subjects from scores data...\n');
    
    // Check individual_scores table for FORM II subjects
    const scoresResult = await query(
      `SELECT DISTINCT subject_code, level, stream, year
       FROM individual_scores 
       WHERE UPPER(TRIM(level)) = 'FORM II'
       ORDER BY year, subject_code`
    );
    
    console.log(`📊 Found ${scoresResult.rows.length} unique subject codes in scores for FORM II:\n`);
    
    // Group by year
    const byYear = {};
    scoresResult.rows.forEach(row => {
      const year = row.year || 'Unknown';
      if (!byYear[year]) {
        byYear[year] = [];
      }
      byYear[year].push(row);
    });
    
    Object.keys(byYear).sort().forEach(year => {
      console.log(`📅 Year ${year}: ${byYear[year].length} subjects`);
      byYear[year].forEach(s => {
        console.log(`   - ${s.subject_code} (stream: ${s.stream || 'N/A'})`);
      });
      console.log('');
    });
    
    // Check specifically for 2025
    const formII2025Scores = await query(
      `SELECT DISTINCT subject_code
       FROM individual_scores 
       WHERE UPPER(TRIM(level)) = 'FORM II' AND year = 2025
       ORDER BY subject_code`
    );
    
    console.log(`\n📚 FORM II 2025 subjects found in scores: ${formII2025Scores.rows.length}`);
    formII2025Scores.rows.forEach(row => {
      console.log(`   - ${row.subject_code}`);
    });
    
    // Get subject names from subjects table for these codes
    if (formII2025Scores.rows.length > 0) {
      const subjectCodes = formII2025Scores.rows.map(r => r.subject_code);
      const subjectsInfo = await query(
        `SELECT subject_code, subject_name, subject_abbreviation 
         FROM subjects 
         WHERE level = 'FORM II' AND year = 2025 AND subject_code = ANY($1)
         ORDER BY subject_code`,
        [subjectCodes]
      );
      
      console.log(`\n📋 Subjects in database matching score data:`);
      subjectsInfo.rows.forEach(s => {
        console.log(`   ✅ ${s.subject_code}: ${s.subject_name} (${s.subject_abbreviation || 'N/A'})`);
      });
      
      // Find missing subjects
      const missingCodes = subjectCodes.filter(code => 
        !subjectsInfo.rows.some(s => s.subject_code === code)
      );
      
      if (missingCodes.length > 0) {
        console.log(`\n⚠️  Missing subjects in database (found in scores but not in subjects table):`);
        missingCodes.forEach(code => {
          console.log(`   ❌ ${code}`);
        });
      }
    }
    
    // Count how many students have scores for each subject
    const subjectCounts = await query(
      `SELECT subject_code, COUNT(DISTINCT adm_no) as student_count
       FROM individual_scores 
       WHERE UPPER(TRIM(level)) = 'FORM II' AND year = 2025
       GROUP BY subject_code
       ORDER BY subject_code`
    );
    
    console.log(`\n📊 Student count per subject (FORM II 2025):`);
    subjectCounts.rows.forEach(row => {
      console.log(`   ${row.subject_code}: ${row.student_count} students`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFormIISubjectsFromScores();
