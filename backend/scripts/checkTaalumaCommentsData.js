/**
 * Check all database information for Taaluma Comments page
 * Form VI, Stream PCM, Year 2025, Term I
 * Run: node backend/scripts/checkTaalumaCommentsData.js
 */

require('dotenv').config();
const { query, pool } = require('../config/database');
const { normalizeStream } = require('../utils/streamNormalizer');

async function checkTaalumaCommentsData() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING TAALUMA COMMENTS DATABASE INFORMATION');
    console.log('Form VI, Stream PCM, Year 2025, Term I');
    console.log('='.repeat(80));
    console.log();

    const level = 'FORM VI';
    const stream = 'PCM';
    const normalizedStream = normalizeStream(stream);
    const year = 2025;
    const term = 'Term I';
    const commentType = 'taaluma';

    // 1. Check Students
    console.log('👥 STUDENTS:');
    console.log('-'.repeat(80));
    
    const studentsResult = await query(`
      SELECT 
        adm_no,
        first_name,
        middle_name,
        surname,
        student_index,
        stream,
        level,
        year
      FROM students 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4
      ORDER BY CAST(student_index AS INTEGER)
    `, [level, normalizedStream, 'NA', year]);

    console.log(`   Found: ${studentsResult.rows.length} students\n`);

    if (studentsResult.rows.length === 0) {
      console.log('   ❌ No students found\n');
    } else {
      studentsResult.rows.forEach((student, index) => {
        console.log(`   ${index + 1}. Adm No: ${student.adm_no}, Index: ${student.student_index || 'N/A'}, Stream: ${student.stream}`);
        console.log(`      Name: ${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim());
      });
      console.log();
    }

    // 2. Check Taaluma Comments
    console.log('📝 TAALUMA COMMENTS:');
    console.log('-'.repeat(80));
    
    const commentsResult = await query(`
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
    `, [commentType, level, normalizedStream, 'NA', year, term]);

    console.log(`   Found: ${commentsResult.rows.length} comments\n`);

    if (commentsResult.rows.length === 0) {
      console.log('   ❌ No taaluma comments found\n');
    } else {
      commentsResult.rows.forEach(row => {
        const student = studentsResult.rows.find(s => s.student_index === row.student_index);
        const studentName = student 
          ? `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim()
          : `Student Index ${row.student_index}`;
        
        console.log(`   Student Index ${row.student_index} (${studentName}):`);
        console.log(`      Comment: ${row.comment_text || '(empty)'}`);
        console.log(`      Stream: ${row.stream}`);
        console.log(`      Created: ${row.created_at}`);
        console.log(`      Updated: ${row.updated_at}`);
        console.log();
      });
    }

    // 3. Summary Statistics
    console.log('📈 SUMMARY STATISTICS:');
    console.log('-'.repeat(80));
    
    const totalStudents = studentsResult.rows.length;
    const totalComments = commentsResult.rows.length;
    const studentsWithComments = new Set(commentsResult.rows.map(c => c.student_index)).size;

    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Students with Comments: ${studentsWithComments}`);
    console.log(`   Total Comments: ${totalComments}`);
    console.log(`   Completion: ${totalStudents > 0 ? ((studentsWithComments / totalStudents) * 100).toFixed(1) : 0}%\n`);

    // 4. Check for missing comments
    console.log('🔍 MISSING COMMENTS ANALYSIS:');
    console.log('-'.repeat(80));
    
    if (totalStudents > 0) {
      const studentsWithCommentsSet = new Set(commentsResult.rows.map(c => c.student_index));
      const missing = studentsResult.rows.filter(s => !studentsWithCommentsSet.has(s.student_index));

      if (missing.length === 0) {
        console.log('   ✅ All students have comments\n');
      } else {
        console.log(`   ⚠️  Found ${missing.length} students without comments:\n`);
        missing.forEach(student => {
          console.log(`      Student Index ${student.student_index} (${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim() + ')');
        });
        console.log();
      }
    }

    // 5. Check stream normalization
    console.log('🔧 STREAM NORMALIZATION CHECK:');
    console.log('-'.repeat(80));
    
    const streamCheckStudents = await query(`
      SELECT stream, COUNT(*) as count
      FROM students
      WHERE level = $1 AND year = $2
      GROUP BY stream
      ORDER BY stream
    `, [level, year]);

    const streamCheckComments = await query(`
      SELECT stream, COUNT(*) as count
      FROM comments
      WHERE comment_type = $1 AND level = $2 AND year = $3 AND term = $4
      GROUP BY stream
      ORDER BY stream
    `, [commentType, level, year, term]);

    console.log('   Students by stream:');
    streamCheckStudents.rows.forEach(row => {
      console.log(`      ${row.stream}: ${row.count} students`);
    });

    console.log('\n   Comments by stream:');
    if (streamCheckComments.rows.length === 0) {
      console.log('      No comments found');
    } else {
      streamCheckComments.rows.forEach(row => {
        console.log(`      ${row.stream}: ${row.count} comments`);
      });
    }
    console.log();

    // 6. Check all comment types for this class
    console.log('📊 ALL COMMENT TYPES FOR THIS CLASS:');
    console.log('-'.repeat(80));
    
    const allCommentsResult = await query(`
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
    `, [level, normalizedStream, 'NA', year, term]);

    if (allCommentsResult.rows.length === 0) {
      console.log('   ❌ No comments found for this class\n');
    } else {
      allCommentsResult.rows.forEach(row => {
        console.log(`   ${row.comment_type}: ${row.count} total, ${row.non_empty_count} with text`);
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

checkTaalumaCommentsData();
