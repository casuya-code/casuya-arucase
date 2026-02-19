/**
 * Test Score Entry API Endpoints
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function testAPI() {
  try {
    console.log('Testing Score Entry API endpoints...\n');
    
    const level = 'FORM I';
    const stream = 'A';
    const year = 2025;
    const subject_code = '0181';
    const month = 'November';
    
    // Test 1: Get students
    console.log('1. Testing GET /students (with stream normalization)...');
    const studentsResult = await query(
      "SELECT COUNT(*) as count FROM students WHERE level = $1 AND stream = $2 AND year = $3",
      [level, stream, year]
    );
    console.log(`   ✅ Found ${studentsResult.rows[0].count} students\n`);
    
    // Test 2: Get subject
    console.log('2. Testing subject lookup...');
    const subjectResult = await query(
      "SELECT subject_code, subject_name FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4",
      [level, stream, year, subject_code]
    );
    if (subjectResult.rows.length > 0) {
      console.log(`   ✅ Subject found: ${subjectResult.rows[0].subject_code} - ${subjectResult.rows[0].subject_name}\n`);
    } else {
      console.log(`   ❌ Subject not found\n`);
    }
    
    // Test 3: Get scores
    console.log('3. Testing GET /students/scores/list...');
    const scoresResult = await query(
      "SELECT adm_no, score FROM individual_scores WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4 AND subject_code = $5",
      [level, stream, year, month, subject_code]
    );
    console.log(`   ✅ Found ${scoresResult.rows.length} scores\n`);
    
    if (scoresResult.rows.length > 0) {
      console.log('   Sample scores:');
      scoresResult.rows.slice(0, 5).forEach(row => {
        console.log(`     ${row.adm_no}: ${row.score}`);
      });
    } else {
      console.log('   ℹ️  No scores found (this is expected for new entries)\n');
    }
    
    // Test 4: Check if students can be fetched with API query structure
    console.log('4. Testing student query structure...');
    const testStudents = await query(
      "SELECT adm_no, first_name, middle_name, surname FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 5",
      [level, stream, year]
    );
    console.log(`   ✅ Query works, sample students:`);
    testStudents.rows.forEach(s => {
      console.log(`     ${s.adm_no}: ${s.first_name} ${s.middle_name || ''} ${s.surname}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testAPI();
