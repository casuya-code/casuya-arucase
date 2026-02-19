/**
 * Check all database information for Tabia & Mwenendo page
 * Form VI, Stream EGM, Year 2025, Term II
 * Run: node backend/scripts/checkTabiaMwenendoData.js
 */

require('dotenv').config();
const { query, pool } = require('../config/database');
const { normalizeStream } = require('../utils/streamNormalizer');

async function checkTabiaMwenendoData() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING TABIA & MWENENDO DATABASE INFORMATION');
    console.log('Form VI, Stream EGM, Year 2025, Term II');
    console.log('='.repeat(80));
    console.log();

    const level = 'FORM VI';
    const stream = 'EGM';
    const normalizedStream = normalizeStream(stream);
    const year = 2025;
    const term = 'Term II';

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

    // 2. Check Tabia & Mwenendo Evaluations
    console.log('📊 TABIA & MWENENDO EVALUATIONS:');
    console.log('-'.repeat(80));
    
    const evaluationsResult = await query(`
      SELECT 
        student_index,
        criterion,
        evaluation,
        created_at,
        updated_at
      FROM tabia_mwenendo 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4 
        AND term = $5
      ORDER BY CAST(student_index AS INTEGER), criterion
    `, [level, normalizedStream, 'NA', year, term]);

    console.log(`   Found: ${evaluationsResult.rows.length} evaluations\n`);

    if (evaluationsResult.rows.length === 0) {
      console.log('   ❌ No evaluations found\n');
    } else {
      // Group by student_index
      const byStudent = {};
      evaluationsResult.rows.forEach(row => {
        if (!byStudent[row.student_index]) {
          byStudent[row.student_index] = [];
        }
        byStudent[row.student_index].push({
          criterion: row.criterion,
          evaluation: row.evaluation,
          updated: row.updated_at
        });
      });

      Object.keys(byStudent).sort((a, b) => parseInt(a) - parseInt(b)).forEach(studentIndex => {
        const student = studentsResult.rows.find(s => s.student_index === studentIndex);
        const studentName = student 
          ? `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim()
          : `Student Index ${studentIndex}`;
        
        console.log(`   Student Index ${studentIndex} (${studentName}):`);
        byStudent[studentIndex].forEach(eval => {
          console.log(`      Criterion ${eval.criterion}: ${eval.evaluation} (Updated: ${eval.updated})`);
        });
        console.log();
      });
    }

    // 3. Summary Statistics
    console.log('📈 SUMMARY STATISTICS:');
    console.log('-'.repeat(80));
    
    const summaryResult = await query(`
      SELECT 
        COUNT(DISTINCT student_index) as students_with_evaluations,
        COUNT(*) as total_evaluations,
        criterion,
        COUNT(*) as criterion_count,
        STRING_AGG(DISTINCT evaluation, ', ' ORDER BY evaluation) as grades_used
      FROM tabia_mwenendo 
      WHERE level = $1 
        AND stream IN ($2, $3)
        AND year = $4 
        AND term = $5
      GROUP BY criterion
      ORDER BY criterion
    `, [level, normalizedStream, 'NA', year, term]);

    const totalStudents = studentsResult.rows.length;
    const studentsWithEvals = summaryResult.rows.length > 0 
      ? parseInt(summaryResult.rows[0].students_with_evaluations || 0)
      : 0;
    const totalEvaluations = evaluationsResult.rows.length;

    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Students with Evaluations: ${studentsWithEvals}`);
    console.log(`   Total Evaluations: ${totalEvaluations}`);
    console.log(`   Expected Evaluations (11 criteria × ${totalStudents} students): ${11 * totalStudents}`);
    console.log(`   Completion: ${totalStudents > 0 ? ((totalEvaluations / (11 * totalStudents)) * 100).toFixed(1) : 0}%\n`);

    if (summaryResult.rows.length > 0) {
      console.log('   Breakdown by Criterion:');
      summaryResult.rows.forEach(row => {
        console.log(`      Criterion ${row.criterion}: ${row.criterion_count} evaluations (Grades: ${row.grades_used})`);
      });
      console.log();
    }

    // 4. Check for missing evaluations
    console.log('🔍 MISSING EVALUATIONS ANALYSIS:');
    console.log('-'.repeat(80));
    
    if (totalStudents > 0) {
      const criteria = ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911'];
      const missing = [];

      studentsResult.rows.forEach(student => {
        const studentIndex = student.student_index;
        const studentEvals = evaluationsResult.rows.filter(e => e.student_index === studentIndex);
        const evalCriteria = new Set(studentEvals.map(e => e.criterion));
        
        criteria.forEach(criterion => {
          if (!evalCriteria.has(criterion)) {
            missing.push({
              student_index: studentIndex,
              student_name: `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim(),
              criterion: criterion
            });
          }
        });
      });

      if (missing.length === 0) {
        console.log('   ✅ All students have complete evaluations (all 11 criteria)\n');
      } else {
        console.log(`   ⚠️  Found ${missing.length} missing evaluations:\n`);
        
        // Group by student
        const byStudentMissing = {};
        missing.forEach(m => {
          if (!byStudentMissing[m.student_index]) {
            byStudentMissing[m.student_index] = {
              name: m.student_name,
              criteria: []
            };
          }
          byStudentMissing[m.student_index].criteria.push(m.criterion);
        });

        Object.keys(byStudentMissing).sort((a, b) => parseInt(a) - parseInt(b)).forEach(studentIndex => {
          const data = byStudentMissing[studentIndex];
          console.log(`      Student Index ${studentIndex} (${data.name}): Missing criteria ${data.criteria.join(', ')}`);
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

    const streamCheckEvals = await query(`
      SELECT stream, COUNT(*) as count
      FROM tabia_mwenendo
      WHERE level = $1 AND year = $2 AND term = $3
      GROUP BY stream
      ORDER BY stream
    `, [level, year, term]);

    console.log('   Students by stream:');
    streamCheckStudents.rows.forEach(row => {
      console.log(`      ${row.stream}: ${row.count} students`);
    });

    console.log('\n   Evaluations by stream:');
    if (streamCheckEvals.rows.length === 0) {
      console.log('      No evaluations found');
    } else {
      streamCheckEvals.rows.forEach(row => {
        console.log(`      ${row.stream}: ${row.count} evaluations`);
      });
    }
    console.log();

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

checkTabiaMwenendoData();
