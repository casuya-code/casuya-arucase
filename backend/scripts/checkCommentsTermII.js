/**
 * Check Comments for Term II - Form I, Year 2025, Stream A, Huduma
 * Run: node backend/scripts/checkCommentsTermII.js
 */

require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkCommentsTermII() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING COMMENTS FOR TERM II');
    console.log('Form I, Year 2025, Stream A, Comment Type: huduma');
    console.log('='.repeat(80));
    console.log();

    // Check for huduma comments specifically (check both 'A' and 'NA' since NA is normalized to A)
    const hudumaComments = await query(`
      SELECT 
        id,
        comment_type,
        level,
        stream,
        year,
        term,
        student_index,
        comment_text,
        created_at,
        updated_at
      FROM comments 
      WHERE comment_type = $1 
        AND level = $2 
        AND stream IN ($3, $4)
        AND year = $5 
        AND term = $6
      ORDER BY CAST(student_index AS INTEGER)
    `, ['huduma', 'FORM I', 'A', 'NA', 2025, 'Term II']);

    console.log(`📝 HUDUMA COMMENTS - Form I, Stream A, Year 2025, Term II:`);
    console.log(`   Found: ${hudumaComments.rows.length} comments\n`);

    if (hudumaComments.rows.length === 0) {
      console.log('  ❌ No huduma comments found for Term II\n');
    } else {
      hudumaComments.rows.forEach(row => {
        console.log(`  Student Index: ${row.student_index}`);
        console.log(`  Comment: ${row.comment_text || '(empty)'}`);
        console.log(`  Created: ${row.created_at}`);
        console.log(`  Updated: ${row.updated_at}`);
        console.log();
      });
    }

    // Check all comment types for Term II (Form I, Stream A, Year 2025)
    console.log('📊 ALL COMMENT TYPES FOR TERM II (Form I, Stream A, Year 2025):');
    console.log('-'.repeat(80));
    
    const allComments = await query(`
      SELECT 
        comment_type,
        COUNT(*) as count,
        COUNT(CASE WHEN comment_text IS NOT NULL AND comment_text != '' THEN 1 END) as non_empty_count
      FROM comments 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4 
        AND term = $5
      GROUP BY comment_type
      ORDER BY comment_type
    `, ['FORM I', 'A', 'NA', 2025, 'Term II']);

    if (allComments.rows.length === 0) {
      console.log('  ❌ No comments found for Term II\n');
    } else {
      allComments.rows.forEach(row => {
        console.log(`  ${row.comment_type}: ${row.count} total, ${row.non_empty_count} with text`);
      });
      console.log();
    }

    // Check Term I for comparison
    console.log('📊 COMPARISON - TERM I vs TERM II:');
    console.log('-'.repeat(80));
    
    const termComparison = await query(`
      SELECT 
        term,
        comment_type,
        COUNT(*) as count
      FROM comments 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4 
        AND term IN ('Term I', 'Term II')
      GROUP BY term, comment_type
      ORDER BY term, comment_type
    `, ['FORM I', 'A', 'NA', 2025]);

    if (termComparison.rows.length === 0) {
      console.log('  ❌ No comments found for Term I or Term II\n');
    } else {
      termComparison.rows.forEach(row => {
        console.log(`  ${row.term} - ${row.comment_type}: ${row.count} comments`);
      });
      console.log();
    }

    // Detailed breakdown for huduma comments in both terms
    console.log('🔍 DETAILED HUDUMA COMMENTS - TERM I vs TERM II:');
    console.log('-'.repeat(80));
    
    const hudumaDetailed = await query(`
      SELECT 
        term,
        stream,
        student_index,
        comment_text,
        updated_at
      FROM comments 
      WHERE comment_type = $1 
        AND level = $2 
        AND stream IN ($3, $4)
        AND year = $5 
        AND term IN ('Term I', 'Term II')
      ORDER BY term, CAST(student_index AS INTEGER)
    `, ['huduma', 'FORM I', 'A', 'NA', 2025]);

    if (hudumaDetailed.rows.length === 0) {
      console.log('  ❌ No huduma comments found for Term I or Term II\n');
    } else {
      let currentTerm = '';
      hudumaDetailed.rows.forEach(row => {
        if (row.term !== currentTerm) {
          currentTerm = row.term;
          console.log(`\n  ${currentTerm}:`);
        }
        console.log(`    Student ${row.student_index} (stream: ${row.stream}): ${row.comment_text || '(empty)'}`);
      });
      console.log();
    }

    // Check if students exist for this class
    console.log('👥 STUDENTS IN THIS CLASS:');
    console.log('-'.repeat(80));
    
    const students = await query(`
      SELECT 
        adm_no,
        first_name,
        middle_name,
        surname,
        student_index,
        stream
      FROM students 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4
      ORDER BY CAST(student_index AS INTEGER)
    `, ['FORM I', 'A', 'NA', 2025]);

    console.log(`   Total students: ${students.rows.length}\n`);
    
    if (students.rows.length > 0) {
      students.rows.forEach((student, index) => {
        console.log(`   ${index + 1}. Adm No: ${student.adm_no}, Index: ${student.student_index || 'N/A'}, Name: ${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim());
      });
      console.log();
    }

    console.log('='.repeat(80));
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

checkCommentsTermII();
