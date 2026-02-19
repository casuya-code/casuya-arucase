/**
 * Check Subjects for FORM VI, stream HGE (example)
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkSubjects() {
  try {
    console.log('Checking subjects for FORM VI, stream HGE, year 2025...\n');
    
    const subjects = await query(
      "SELECT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = 'FORM VI' AND stream = 'HGE' AND year = 2025 ORDER BY subject_code"
    );
    
    console.log(`Found ${subjects.rows.length} subjects:\n`);
    subjects.rows.forEach(subject => {
      console.log(`  ${subject.subject_code}: ${subject.subject_name} (${subject.subject_abbreviation || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSubjects();
