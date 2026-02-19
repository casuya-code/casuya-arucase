/**
 * Check Form V subjects in database
 */
const { query } = require('../config/database');

async function checkSubjects() {
  try {
    console.log('Checking FORM V PCB 2026 subjects...\n');
    
    const result = await query(
      'SELECT level, stream, year, subject_code, subject_name FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
      ['FORM V', 'PCB', 2026]
    );
    
    console.log(`Found ${result.rows.length} subjects:\n`);
    result.rows.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.subject_code} - ${subject.subject_name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('\n⚠️  No subjects found! Checking 2025...\n');
      const result2025 = await query(
        'SELECT level, stream, year, subject_code, subject_name FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        ['FORM V', 'PCB', 2025]
      );
      console.log(`Found ${result2025.rows.length} subjects in 2025:\n`);
      result2025.rows.forEach((subject, index) => {
        console.log(`${index + 1}. ${subject.subject_code} - ${subject.subject_name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSubjects();
