/**
 * Count students by form level
 * Run: node backend/scripts/countStudentsByForm.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function countStudentsByForm() {
  try {
    console.log('='.repeat(80));
    console.log('STUDENT COUNT BY FORM LEVEL');
    console.log('='.repeat(80));
    console.log();
    
    // Get counts by form level
    const result = await query(`
      SELECT 
        level,
        COUNT(*) as total_students,
        COUNT(DISTINCT stream) as streams,
        COUNT(DISTINCT year) as years,
        STRING_AGG(DISTINCT stream, ', ') as stream_list,
        STRING_AGG(DISTINCT year::text, ', ') as year_list
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
    
    if (result.rows.length === 0) {
      console.log('❌ No students found in database');
      process.exit(0);
    }
    
    console.log('📊 Student Count by Form Level:\n');
    
    let grandTotal = 0;
    result.rows.forEach(row => {
      console.log(`${row.level}:`);
      console.log(`  Total Students: ${row.total_students}`);
      console.log(`  Streams: ${row.streams} (${row.stream_list})`);
      console.log(`  Years: ${row.years} (${row.year_list})`);
      console.log();
      grandTotal += parseInt(row.total_students);
    });
    
    console.log('='.repeat(80));
    console.log(`GRAND TOTAL: ${grandTotal} students`);
    console.log('='.repeat(80));
    
    // Get breakdown by stream for each form
    console.log('\n📋 Detailed Breakdown by Form and Stream:\n');
    
    const detailedResult = await query(`
      SELECT 
        level,
        stream,
        year,
        COUNT(*) as count
      FROM students
      GROUP BY level, stream, year
      ORDER BY 
        CASE level
          WHEN 'FORM I' THEN 1
          WHEN 'FORM II' THEN 2
          WHEN 'FORM III' THEN 3
          WHEN 'FORM IV' THEN 4
          WHEN 'FORM V' THEN 5
          WHEN 'FORM VI' THEN 6
          ELSE 7
        END,
        stream,
        year
    `);
    
    let currentLevel = '';
    detailedResult.rows.forEach(row => {
      if (row.level !== currentLevel) {
        if (currentLevel !== '') {
          console.log();
        }
        currentLevel = row.level;
        console.log(`${row.level}:`);
      }
      console.log(`  ${row.stream} ${row.year}: ${row.count} students`);
    });
    
    // Get admission number range for each form
    console.log('\n📊 Admission Number Ranges:\n');
    
    const admRangeResult = await query(`
      SELECT 
        level,
        MIN(CAST(adm_no AS INTEGER)) FILTER (WHERE adm_no ~ '^[0-9]+$') as min_adm,
        MAX(CAST(adm_no AS INTEGER)) FILTER (WHERE adm_no ~ '^[0-9]+$') as max_adm,
        COUNT(*) FILTER (WHERE adm_no ~ '^[0-9]+$') as numeric_adm_count,
        COUNT(*) FILTER (WHERE NOT (adm_no ~ '^[0-9]+$')) as non_numeric_adm_count
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
    
    admRangeResult.rows.forEach(row => {
      console.log(`${row.level}:`);
      if (row.min_adm !== null) {
        console.log(`  Admission Numbers: ${row.min_adm} - ${row.max_adm}`);
        console.log(`  Numeric: ${row.numeric_adm_count}, Non-numeric: ${row.non_numeric_adm_count || 0}`);
      } else {
        console.log(`  No numeric admission numbers`);
        console.log(`  Non-numeric: ${row.non_numeric_adm_count || 0}`);
      }
      console.log();
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

countStudentsByForm();
