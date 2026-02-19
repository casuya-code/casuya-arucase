/**
 * Check why FORM I student performance is not showing
 * Investigates stream mismatch between students and scores tables
 */
const { query } = require('../config/database');

async function checkStudentPerformanceIssue() {
  try {
    console.log('\n🔍 Checking FORM I student performance issue...\n');
    
    // Check a sample FORM I student
    const studentResult = await query(
      `SELECT adm_no, first_name, surname, level, stream, year 
       FROM students 
       WHERE level = 'FORM I' AND year = 2025 
       LIMIT 5`
    );
    
    console.log(`📚 Found ${studentResult.rows.length} FORM I students:\n`);
    studentResult.rows.forEach((student, i) => {
      console.log(`${i + 1}. ${student.first_name} ${student.surname} (${student.adm_no})`);
      console.log(`   Level: ${student.level}, Stream: "${student.stream}", Year: ${student.year}`);
    });
    
    if (studentResult.rows.length === 0) {
      console.log('❌ No FORM I students found');
      process.exit(0);
    }
    
    const testStudent = studentResult.rows[0];
    console.log(`\n🔍 Checking scores for: ${testStudent.first_name} ${testStudent.surname} (${testStudent.adm_no})\n`);
    
    // Check scores with student's actual stream
    const scoresWithActualStream = await query(
      `SELECT COUNT(*) as count, 
              COUNT(DISTINCT subject_code) as subjects,
              COUNT(DISTINCT month) as months
       FROM individual_scores 
       WHERE adm_no = $1 AND level = $2 AND stream = $3`,
      [testStudent.adm_no, testStudent.level, testStudent.stream]
    );
    
    console.log(`📊 Scores with stream="${testStudent.stream}":`);
    console.log(`   Total scores: ${scoresWithActualStream.rows[0].count}`);
    console.log(`   Subjects: ${scoresWithActualStream.rows[0].subjects}`);
    console.log(`   Months: ${scoresWithActualStream.rows[0].months}`);
    
    // Check scores with normalized stream (A)
    const normalizedStream = testStudent.stream === 'NA' ? 'A' : testStudent.stream;
    const scoresWithNormalizedStream = await query(
      `SELECT COUNT(*) as count, 
              COUNT(DISTINCT subject_code) as subjects,
              COUNT(DISTINCT month) as months
       FROM individual_scores 
       WHERE adm_no = $1 AND level = $2 AND stream = $3`,
      [testStudent.adm_no, testStudent.level, normalizedStream]
    );
    
    console.log(`\n📊 Scores with stream="${normalizedStream}" (normalized):`);
    console.log(`   Total scores: ${scoresWithNormalizedStream.rows[0].count}`);
    console.log(`   Subjects: ${scoresWithNormalizedStream.rows[0].subjects}`);
    console.log(`   Months: ${scoresWithNormalizedStream.rows[0].months}`);
    
    // Check what stream values exist in scores for this student
    const streamValuesInScores = await query(
      `SELECT DISTINCT stream, COUNT(*) as count
       FROM individual_scores 
       WHERE adm_no = $1 AND level = $2
       GROUP BY stream`,
      [testStudent.adm_no, testStudent.level]
    );
    
    console.log(`\n📋 Stream values in scores for this student:`);
    streamValuesInScores.rows.forEach(row => {
      console.log(`   Stream "${row.stream}": ${row.count} scores`);
    });
    
    // Check if there's a mismatch
    const studentStream = testStudent.stream;
    const hasScoresWithStudentStream = streamValuesInScores.rows.some(r => r.stream === studentStream);
    const hasScoresWithNormalizedStream = streamValuesInScores.rows.some(r => r.stream === normalizedStream);
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   Student stream: "${studentStream}"`);
    console.log(`   Normalized stream: "${normalizedStream}"`);
    console.log(`   Scores exist with student stream: ${hasScoresWithStudentStream}`);
    console.log(`   Scores exist with normalized stream: ${hasScoresWithNormalizedStream}`);
    
    if (!hasScoresWithStudentStream && !hasScoresWithNormalizedStream) {
      console.log(`\n❌ No scores found for this student at all!`);
    } else if (!hasScoresWithStudentStream && hasScoresWithNormalizedStream) {
      console.log(`\n⚠️  MISMATCH: Student has stream="${studentStream}" but scores are stored with stream="${normalizedStream}"`);
      console.log(`   The analytics endpoint needs to check both streams!`);
    } else if (hasScoresWithStudentStream && !hasScoresWithNormalizedStream) {
      console.log(`\n⚠️  MISMATCH: Student has stream="${studentStream}" and scores match, but normalized stream="${normalizedStream}" doesn't match`);
    } else {
      console.log(`\n✅ Both streams have scores - should work correctly`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudentPerformanceIssue();
