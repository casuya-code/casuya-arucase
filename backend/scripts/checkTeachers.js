/**
 * Check Teachers for FORM I, year 2025
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkTeachers() {
  try {
    console.log('Checking teachers for FORM I, year 2025...\n');
    
    // Check teachers with stream A
    const teachersA = await query(
      "SELECT COUNT(*) as count FROM subject_teachers WHERE level = 'FORM I' AND stream = 'A' AND year = 2025"
    );
    console.log(`Teachers with stream='A': ${teachersA.rows[0].count}`);
    
    // Check teachers with stream NA
    const teachersNA = await query(
      "SELECT COUNT(*) as count FROM subject_teachers WHERE level = 'FORM I' AND stream = 'NA' AND year = 2025"
    );
    console.log(`Teachers with stream='NA': ${teachersNA.rows[0].count}`);
    
    // Get all streams for FORM I
    console.log('\nStreams with teachers for FORM I, year 2025:');
    const streamsResult = await query(
      "SELECT stream, COUNT(*) as count FROM subject_teachers WHERE level = 'FORM I' AND year = 2025 GROUP BY stream ORDER BY stream"
    );
    streamsResult.rows.forEach(row => {
      console.log(`   ${row.stream}: ${row.count} teachers`);
    });
    
    // Get sample teachers
    if (parseInt(teachersA.rows[0].count) > 0) {
      console.log('\nSample teachers (stream A):');
      const samples = await query(
        "SELECT subject_code, teacher_name, teacher_signature FROM subject_teachers WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 ORDER BY subject_code LIMIT 10"
      );
      samples.rows.forEach(t => {
        console.log(`   ${t.subject_code}: ${t.teacher_name}`);
      });
    }
    
    // Check all teachers regardless of stream
    console.log('\nTotal teachers for FORM I, year 2025:');
    const totalResult = await query(
      "SELECT COUNT(*) as count FROM subject_teachers WHERE level = 'FORM I' AND year = 2025"
    );
    console.log(`   Total: ${totalResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkTeachers();
