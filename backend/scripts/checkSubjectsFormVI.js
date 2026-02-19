/**
 * Check Subjects for FORM VI, stream HKL, year 2025
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkSubjects() {
  try {
    console.log('Checking subjects for FORM VI, stream HKL, year 2025...\n');
    
    // Check all streams for Form VI
    const streamsResult = await query(
      "SELECT stream, COUNT(*) as count FROM subjects WHERE level = 'FORM VI' AND year = 2025 GROUP BY stream ORDER BY stream"
    );
    
    console.log('Stream distribution for FORM VI, year 2025:');
    streamsResult.rows.forEach(row => {
      console.log(`  ${row.stream}: ${row.count} subjects`);
    });
    
    console.log('\n---\n');
    
    // Check specifically for HKL
    const hklResult = await query(
      "SELECT COUNT(*) as count FROM subjects WHERE level = 'FORM VI' AND stream = 'HKL' AND year = 2025"
    );
    
    console.log(`Subjects for FORM VI, stream HKL, year 2025: ${hklResult.rows[0].count}\n`);
    
    if (parseInt(hklResult.rows[0].count) > 0) {
      const subjects = await query(
        "SELECT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = 'FORM VI' AND stream = 'HKL' AND year = 2025 ORDER BY subject_code"
      );
      
      console.log('Subjects:');
      subjects.rows.forEach(subject => {
        console.log(`  ${subject.subject_code}: ${subject.subject_name} (${subject.subject_abbreviation || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No subjects found for FORM VI, stream HKL, year 2025');
      console.log('\nChecking if HKL exists with different case or as NA...');
      
      const checkNA = await query(
        "SELECT COUNT(*) as count FROM subjects WHERE level = 'FORM VI' AND stream = 'A' AND year = 2025"
      );
      console.log(`Subjects with stream='A': ${checkNA.rows[0].count}`);
      
      const checkCase = await query(
        "SELECT DISTINCT stream FROM subjects WHERE level = 'FORM VI' AND year = 2025"
      );
      console.log('\nAvailable streams for FORM VI, year 2025:');
      checkCase.rows.forEach(row => {
        console.log(`  - ${row.stream}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSubjects();
