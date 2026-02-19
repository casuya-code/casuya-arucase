/**
 * Test subjects API endpoint
 */

require('dotenv').config();
const { query } = require('../config/database');

async function testSubjectsAPI() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 Testing Subjects API Endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test case 1: FORM I with stream A (should use NA)
    console.log('Test 1: FORM I, stream=A, year=2025');
    console.log('Expected: Should query with stream=NA');
    const result1 = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
      ['FORM I', 'NA', 2025]
    );
    console.log(`Found: ${result1.rows.length} subjects`);
    if (result1.rows.length > 0) {
      console.log('Sample subjects:');
      result1.rows.slice(0, 3).forEach(s => {
        console.log(`  - ${s.subject_code}: ${s.subject_name}`);
      });
    }
    console.log('');

    // Test case 2: FORM I with stream NA
    console.log('Test 2: FORM I, stream=NA, year=2025');
    const result2 = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
      ['FORM I', 'NA', 2025]
    );
    console.log(`Found: ${result2.rows.length} subjects\n`);

    // Test case 3: FORM V with actual stream
    console.log('Test 3: FORM V, stream=EGM, year=2025');
    const result3 = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
      ['FORM V', 'EGM', 2025]
    );
    console.log(`Found: ${result3.rows.length} subjects`);
    if (result3.rows.length > 0) {
      console.log('Sample subjects:');
      result3.rows.slice(0, 3).forEach(s => {
        console.log(`  - ${s.subject_code}: ${s.subject_name}`);
      });
    }
    console.log('');

    // Check all levels
    console.log('All subjects by level and stream:');
    const allSubjects = await query(`
      SELECT level, stream, year, COUNT(*) as count 
      FROM subjects 
      GROUP BY level, stream, year 
      ORDER BY level, stream, year
    `);
    allSubjects.rows.forEach(row => {
      console.log(`  ${row.level} ${row.stream} ${row.year}: ${row.count} subjects`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSubjectsAPI();

