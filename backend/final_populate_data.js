const { query } = require('./config/database');

async function finalPopulateData() {
  try {
    console.log('🔍 FINAL: Populating complete PreFormOne data...');
    
    // Clear all existing data first
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    await query('DELETE FROM preform_one_continuing_results WHERE year = 2025');
    
    console.log('🔍 FINAL: Cleared all existing data');
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = 2025 ORDER BY admission_number LIMIT 2');
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code LIMIT 2');
    
    console.log(`🔍 FINAL: Processing ${students.rowCount} students with ${interviewSubjects.rowCount} subjects`);
    
    // Add interview scores for first 2 students
    for (const student of students.rows) {
      for (let i = 0; i < interviewSubjects.rowCount; i++) {
        const score = Math.floor(Math.random() * 25) + 75; // 75-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, interviewSubjects.rows[i].id, score]);
      }
    }
    
    // Create interview results
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
    
    let position = 1;
    for (const result of interviewResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, 2025, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET total_marks = $2, average = $3, grade = $4, position = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 FINAL: Interview result - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ FINAL: PreFormOne data populated successfully!');
    console.log(`🔍 FINAL: Interview results: ${interviewResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 FINAL: Error populating data:', error);
    throw error;
  }
}

finalPopulateData()
  .then(() => {
    console.log('✅ FINAL: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FINAL: Data population failed:', error);
    process.exit(1);
  });
