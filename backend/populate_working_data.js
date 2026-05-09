const { query } = require('./config/database');

async function populateWorkingData() {
  try {
    console.log('🔍 WORKING DATA: Populating working PreFormOne data...');
    
    // Clear all existing data first
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    await query('DELETE FROM preform_one_continuing_results WHERE year = 2025');
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number FROM preform_one_students WHERE year = 2025 ORDER BY admission_number LIMIT 3');
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code LIMIT 3');
    
    console.log(`🔍 WORKING DATA: Found ${students.rowCount} students and ${interviewSubjects.rowCount} subjects`);
    
    // Add interview scores one by one
    for (let i = 0; i < students.rowCount; i++) {
      const student = students.rows[i];
      const subject = interviewSubjects.rows[i % interviewSubjects.rowCount];
      const score = Math.floor(Math.random() * 25) + 75; // 75-100
      
      await query(`
        INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
        VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [student.id, subject.id, score]);
      
      console.log(`🔍 WORKING DATA: Added ${subject.subject_code}: ${score} for ${student.admission_number}`);
    }
    
    // Calculate interview results
    const interviewResults = await query(`
      SELECT 
        sc.student_id,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      WHERE sc.subject_type = 'interview' AND sc.student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)
      GROUP BY sc.student_id
      ORDER BY average DESC
    `);
    
    // Add interview results
    let position = 1;
    for (const result of interviewResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_interview_results (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, 2025, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 WORKING DATA: Interview result for student - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ WORKING DATA: PreFormOne data populated successfully!');
    console.log(`🔍 WORKING DATA: Interview results: ${interviewResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 WORKING DATA: Error populating data:', error);
    throw error;
  }
}

populateWorkingData()
  .then(() => {
    console.log('✅ WORKING DATA: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ WORKING DATA: Data population failed:', error);
    process.exit(1);
  });
