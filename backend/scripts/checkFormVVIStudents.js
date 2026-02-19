/**
 * Check Form V and Form VI Students in Database
 * Run: node backend/scripts/checkFormVVIStudents.js
 */

require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkFormVVIStudents() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING FORM V AND FORM VI STUDENTS');
    console.log('='.repeat(80));
    console.log();

    // Check Form V students
    console.log('📚 FORM V STUDENTS:');
    console.log('-'.repeat(80));
    
    const formVTotal = await query("SELECT COUNT(*) as count FROM students WHERE level = 'FORM V'");
    console.log(`Total Form V Students: ${formVTotal.rows[0].count}\n`);

    // Form V by stream and year
    const formVByStream = await query(`
      SELECT 
        stream,
        year,
        COUNT(*) as count,
        STRING_AGG(adm_no, ', ' ORDER BY adm_no) as adm_numbers
      FROM students 
      WHERE level = 'FORM V'
      GROUP BY stream, year
      ORDER BY stream, year DESC
    `);

    if (formVByStream.rows.length === 0) {
      console.log('  ❌ No Form V students found\n');
    } else {
      formVByStream.rows.forEach(row => {
        console.log(`  Stream: ${row.stream}, Year: ${row.year}, Count: ${row.count}`);
        console.log(`    Adm Nos: ${row.adm_numbers}`);
        console.log();
      });
    }

    // Check Form VI students
    console.log('📚 FORM VI STUDENTS:');
    console.log('-'.repeat(80));
    
    const formVITotal = await query("SELECT COUNT(*) as count FROM students WHERE level = 'FORM VI'");
    console.log(`Total Form VI Students: ${formVITotal.rows[0].count}\n`);

    // Form VI by stream and year
    const formVIByStream = await query(`
      SELECT 
        stream,
        year,
        COUNT(*) as count,
        STRING_AGG(adm_no, ', ' ORDER BY adm_no) as adm_numbers
      FROM students 
      WHERE level = 'FORM VI'
      GROUP BY stream, year
      ORDER BY stream, year DESC
    `);

    if (formVIByStream.rows.length === 0) {
      console.log('  ❌ No Form VI students found\n');
    } else {
      formVIByStream.rows.forEach(row => {
        console.log(`  Stream: ${row.stream}, Year: ${row.year}, Count: ${row.count}`);
        console.log(`    Adm Nos: ${row.adm_numbers}`);
        console.log();
      });
    }

    // Check specifically for HKL stream in both forms
    console.log('🔍 CHECKING HKL STREAM SPECIFICALLY:');
    console.log('-'.repeat(80));
    
    const formVHKL = await query(`
      SELECT 
        level,
        stream,
        year,
        COUNT(*) as count,
        STRING_AGG(adm_no, ', ' ORDER BY adm_no) as adm_numbers
      FROM students 
      WHERE level IN ('FORM V', 'FORM VI') AND stream = 'HKL'
      GROUP BY level, stream, year
      ORDER BY level, year DESC
    `);

    if (formVHKL.rows.length === 0) {
      console.log('  ❌ No HKL stream students found in Form V or Form VI\n');
    } else {
      formVHKL.rows.forEach(row => {
        console.log(`  ${row.level} ${row.stream} ${row.year}: ${row.count} students`);
        console.log(`    Adm Nos: ${row.adm_numbers}`);
        console.log();
      });
    }

    // Check HGL stream
    console.log('🔍 CHECKING HGL STREAM SPECIFICALLY:');
    console.log('-'.repeat(80));
    
    const formVHGL = await query(`
      SELECT 
        level,
        stream,
        year,
        COUNT(*) as count,
        STRING_AGG(adm_no, ', ' ORDER BY adm_no) as adm_numbers
      FROM students 
      WHERE level IN ('FORM V', 'FORM VI') AND stream = 'HGL'
      GROUP BY level, stream, year
      ORDER BY level, year DESC
    `);

    if (formVHGL.rows.length === 0) {
      console.log('  ❌ No HGL stream students found in Form V or Form VI\n');
    } else {
      formVHGL.rows.forEach(row => {
        console.log(`  ${row.level} ${row.stream} ${row.year}: ${row.count} students`);
        console.log(`    Adm Nos: ${row.adm_numbers}`);
        console.log();
      });
    }

    // Summary of all streams for Form V and VI
    console.log('📊 SUMMARY - ALL STREAMS FOR FORM V & VI:');
    console.log('-'.repeat(80));
    
    const allStreams = await query(`
      SELECT 
        level,
        stream,
        COUNT(*) as total_count,
        COUNT(DISTINCT year) as years_count,
        STRING_AGG(DISTINCT year::text, ', ') as years
      FROM students 
      WHERE level IN ('FORM V', 'FORM VI')
      GROUP BY level, stream
      ORDER BY level, stream
    `);

    if (allStreams.rows.length === 0) {
      console.log('  ❌ No students found for Form V or Form VI\n');
    } else {
      allStreams.rows.forEach(row => {
        console.log(`  ${row.level} - Stream ${row.stream}: ${row.total_count} students across ${row.years_count} year(s) - Years: ${row.years}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECK COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkFormVVIStudents();
