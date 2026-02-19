/**
 * Check if subjects exist in the database for a specific form and year
 */
const { query } = require('../config/database');

async function checkSubjects(level = 'FORM I', year = 2025) {
  try {
    console.log(`\n🔍 Checking subjects for ${level} ${year}...\n`);
    
    // Check all subjects for this level and year (stream = 'A' for FORM I-IV)
    const result = await query(
      `SELECT * FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3 
       ORDER BY subject_code`,
      [level, 'A', parseInt(year)]
    );
    
    console.log(`📊 Found ${result.rows.length} subjects for ${level} ${year}:`);
    console.log('─'.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ No subjects found in database!');
      console.log('\n💡 The database is empty for this form and year.');
      console.log('   You can add subjects using the "Add First Subject" button in the UI.');
    } else {
      result.rows.forEach((subject, index) => {
        console.log(`${index + 1}. ${subject.subject_name} (${subject.subject_code})`);
        console.log(`   Abbreviation: ${subject.subject_abbreviation || 'N/A'}`);
        console.log(`   Level: ${subject.level}, Stream: ${subject.stream}, Year: ${subject.year}`);
        console.log('');
      });
    }
    
    // Also check total subjects count
    const totalResult = await query('SELECT COUNT(*) as total FROM subjects');
    console.log(`\n📈 Total subjects in database: ${totalResult.rows[0].total}`);
    
    // Check subjects by level
    const byLevelResult = await query(
      `SELECT level, year, COUNT(*) as count 
       FROM subjects 
       GROUP BY level, year 
       ORDER BY level, year`
    );
    
    if (byLevelResult.rows.length > 0) {
      console.log('\n📋 Subjects by Level and Year:');
      console.log('─'.repeat(80));
      byLevelResult.rows.forEach(row => {
        console.log(`   ${row.level} ${row.year}: ${row.count} subjects`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking subjects:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const level = args[0] || 'FORM I';
const year = args[1] || 2025;

checkSubjects(level, year);
