/**
 * Count registered students in PostgreSQL database
 * Run: node backend/scripts/countStudents.js
 */

require('dotenv').config();
const { query } = require('../config/database');

async function countStudents() {
  try {
    console.log('📊 Counting registered students...\n');

    // Total students
    const totalResult = await query('SELECT COUNT(*) as count FROM students');
    const total = parseInt(totalResult.rows[0].count);

    // Students by level
    const byLevelResult = await query(`
      SELECT 
        level,
        COUNT(*) as count
      FROM students
      GROUP BY level
      ORDER BY 
        CASE level
          WHEN 'FORM I' THEN 1
          WHEN 'FORM II' THEN 2
          WHEN 'FORM III' THEN 3
          WHEN 'FORM IV' THEN 4
          WHEN 'FORM V' THEN 5
          WHEN 'FORM VI' THEN 6
          ELSE 7
        END
    `);

    // Students by stream
    const byStreamResult = await query(`
      SELECT 
        stream,
        COUNT(*) as count
      FROM students
      GROUP BY stream
      ORDER BY stream
    `);

    // Students by year
    const byYearResult = await query(`
      SELECT 
        year,
        COUNT(*) as count
      FROM students
      GROUP BY year
      ORDER BY year DESC
    `);

    // Students by status
    const byStatusResult = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM students
      GROUP BY status
      ORDER BY status
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 TOTAL STUDENTS: ${total}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 By Level:');
    byLevelResult.rows.forEach(row => {
      console.log(`   ${row.level}: ${row.count}`);
    });

    console.log('\n📊 By Stream:');
    byStreamResult.rows.forEach(row => {
      console.log(`   ${row.stream}: ${row.count}`);
    });

    console.log('\n📊 By Year:');
    byYearResult.rows.forEach(row => {
      console.log(`   ${row.year}: ${row.count}`);
    });

    console.log('\n📊 By Status:');
    byStatusResult.rows.forEach(row => {
      console.log(`   ${row.status || 'NULL'}: ${row.count}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

countStudents();

