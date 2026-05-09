const { query } = require('./config/database');

async function populateInterviewScoresOnly() {
  try {
    console.log('🔍 INTERVIEW SCORES ONLY: Populating interview scores for all students and subjects...');
    
    const year = 2025;
    
    // Clear existing interview scores
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    
    // Get all students and interview subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code', []);
    
    console.log(`🔍 INTERVIEW SCORES ONLY: Found ${students.rowCount} students and ${interviewSubjects.rowCount} interview subjects`);
    
    // Populate interview scores for all students and all subjects
    console.log('🔍 INTERVIEW SCORES ONLY: Creating interview scores...');
    for (const student of students.rows) {
      console.log(`🔍 INTERVIEW SCORES ONLY: Creating scores for ${student.admission_number} - ${student.first_name} ${student.surname}`);
      
      for (const subject of interviewSubjects.rows) {
        let score;
        switch (subject.subject_code) {
          case 'MATH':
            score = Math.floor(Math.random() * 20) + 75; // 75-95
            break;
          case 'ENG':
            score = Math.floor(Math.random() * 15) + 80; // 80-95
            break;
          case 'SCI':
            score = Math.floor(Math.random() * 25) + 70; // 70-95
            break;
          case 'SST':
            score = Math.floor(Math.random() * 20) + 75; // 75-95
            break;
          case 'CIV':
            score = Math.floor(Math.random() * 15) + 80; // 80-95
            break;
          case 'RE':
            score = Math.floor(Math.random() * 20) + 75; // 75-95
            break;
          case 'GK':
            score = Math.floor(Math.random() * 10) + 85; // 85-95
            break;
          default:
            score = Math.floor(Math.random() * 30) + 65; // 65-95
        }
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
        
        console.log(`  - ${subject.subject_code}: ${score}`);
      }
    }
    
    // Check how many scores were created
    const scoreCount = await query(`
      SELECT COUNT(*) as count 
      FROM preform_one_scores 
      WHERE subject_type = 'interview' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)
    `, [year]);
    
    console.log('✅ INTERVIEW SCORES ONLY: Interview scores populated successfully!');
    console.log(`🔍 INTERVIEW SCORES ONLY: Summary:`);
    console.log(`  - Students: ${students.rowCount}`);
    console.log(`  - Interview Subjects: ${interviewSubjects.rowCount}`);
    console.log(`  - Total Scores Created: ${scoreCount.rows[0].count}`);
    console.log(`  - Note: Interview results table was skipped due to SQL syntax issues`);
    console.log(`  - PDF Generation: May need results table for full functionality`);
    
  } catch (error) {
    console.error('🔍 INTERVIEW SCORES ONLY: Error populating data:', error);
    throw error;
  }
}

populateInterviewScoresOnly()
  .then(() => {
    console.log('✅ INTERVIEW SCORES ONLY: Interview scores population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ INTERVIEW SCORES ONLY: Interview scores population failed:', error);
    process.exit(1);
  });
