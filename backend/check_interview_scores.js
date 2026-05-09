const { query } = require('./config/database');

async function checkInterviewScores() {
  try {
    console.log('🔍 SCORES CHECK: Checking interview scores for 2025...');
    
    const year = 2025;
    
    // Check interview results
    const interviewResults = await query(`
      SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number 
      FROM preform_one_interview_results r 
      JOIN preform_one_students s ON r.student_id = s.id 
      WHERE r.year = $1 
      ORDER BY r.position
    `, [year]);
    
    console.log(`🔍 SCORES CHECK: Interview results found: ${interviewResults.rowCount}`);
    
    if (interviewResults.rows.length > 0) {
      console.log('🔍 SCORES CHECK: Interview results:');
      interviewResults.rows.forEach(result => {
        console.log(`  - ${result.admission_number}: ${result.first_name} ${result.surname} - Total: ${result.total_marks}, Grade: ${result.grade}, Position: ${result.position}`);
      });
    }
    
    // Check interview scores
    const interviewScores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code, s.admission_number, s.first_name, s.surname
      FROM preform_one_scores sc
      JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
      JOIN preform_one_students s ON sc.student_id = s.id
      WHERE sc.subject_type = 'interview' AND s.year = $1
      ORDER BY s.admission_number, sub.subject_code
    `, [year]);
    
    console.log(`🔍 SCORES CHECK: Interview scores found: ${interviewScores.rowCount}`);
    
    if (interviewScores.rows.length > 0) {
      console.log('🔍 SCORES CHECK: Interview scores by student:');
      const scoresByStudent = {};
      interviewScores.rows.forEach(score => {
        if (!scoresByStudent[score.student_id]) {
          scoresByStudent[score.student_id] = {
            admission_number: score.admission_number,
            name: `${score.first_name} ${score.surname}`,
            scores: {}
          };
        }
        scoresByStudent[score.student_id].scores[score.subject_code] = score.score;
      });
      
      Object.values(scoresByStudent).forEach(student => {
        console.log(`  - ${student.admission_number} (${student.name}):`);
        Object.entries(student.scores).forEach(([subject, score]) => {
          console.log(`    ${subject}: ${score}`);
        });
      });
    } else {
      console.log('❌ SCORES CHECK: No interview scores found!');
      console.log('🔍 SCORES CHECK: This is why PDF generation might fail - no scores to include');
    }
    
    // Check subjects
    const subjects = await query(`
      SELECT id, subject_code 
      FROM preformone_interview_subjects 
      WHERE is_active = true 
      ORDER BY subject_code
    `);
    
    console.log(`🔍 SCORES CHECK: Available interview subjects: ${subjects.rowCount}`);
    subjects.rows.forEach(subject => {
      console.log(`  - ${subject.subject_code} (ID: ${subject.id})`);
    });
    
  } catch (error) {
    console.error('🔍 SCORES CHECK: Error:', error);
  }
}

checkInterviewScores()
  .then(() => {
    console.log('✅ SCORES CHECK: Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SCORES CHECK: Check failed:', error);
    process.exit(1);
  });
