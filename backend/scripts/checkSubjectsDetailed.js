/**
 * Detailed check of subjects in database - shows all columns
 */
const { query } = require('../config/database');

async function checkSubjectsDetailed(level = 'FORM I', year = 2025) {
  try {
    console.log(`\n🔍 Detailed check for ${level} ${year}...\n`);
    
    // Check ALL subjects for this level and year (any stream)
    const result = await query(
      `SELECT * FROM subjects 
       WHERE level = $1 AND year = $2 
       ORDER BY stream, subject_code`,
      [level, parseInt(year)]
    );
    
    console.log(`📊 Found ${result.rows.length} subjects for ${level} ${year} (all streams):`);
    console.log('─'.repeat(100));
    
    if (result.rows.length === 0) {
      console.log('❌ No subjects found!');
    } else {
      result.rows.forEach((subject, index) => {
        console.log(`${index + 1}. ${subject.subject_name} (${subject.subject_code})`);
        console.log(`   Stream: "${subject.stream}" | Level: "${subject.level}" | Year: ${subject.year}`);
        console.log(`   Abbreviation: ${subject.subject_abbreviation || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check specifically with stream = 'A'
    const streamAResult = await query(
      `SELECT * FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3 
       ORDER BY subject_code`,
      [level, 'A', parseInt(year)]
    );
    
    console.log(`\n📊 Subjects with stream = 'A': ${streamAResult.rows.length}`);
    
    // Check with stream = 'NA'
    const streamNAResult = await query(
      `SELECT * FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3 
       ORDER BY subject_code`,
      [level, 'NA', parseInt(year)]
    );
    
    console.log(`📊 Subjects with stream = 'NA': ${streamNAResult.rows.length}`);
    
    // Show all unique stream values for this level/year
    const streamsResult = await query(
      `SELECT DISTINCT stream FROM subjects 
       WHERE level = $1 AND year = $2 
       ORDER BY stream`,
      [level, parseInt(year)]
    );
    
    console.log(`\n📋 Unique stream values for ${level} ${year}:`);
    streamsResult.rows.forEach(row => {
      console.log(`   - "${row.stream}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const level = args[0] || 'FORM I';
const year = args[1] || 2025;

checkSubjectsDetailed(level, year);
