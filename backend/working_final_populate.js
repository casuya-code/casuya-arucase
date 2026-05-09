const { query } = require('./config/database');

async function workingFinalPopulate() {
  try {
    console.log('🔍 WORKING FINAL: Working final population...');
    
    const year = 2025;
    
    // Clear existing data
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = $1 ORDER BY admission_number LIMIT 2', [year]);
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code LIMIT 2', []);
    
    console.log(`🔍 WORKING FINAL: Processing ${students.rowCount} students with ${subjects.rowCount} subjects`);
    
    // Add interview scores
    for (const student of students.rows) {
      for (const subject of subjects.rows) {
        const score = Math.floor(Math.random() * 20) + 80; // 80-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Create interview results
    const interviewResults = await query(`
      SELECT 
        sc.student_id,
        s.admission_number,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      JOIN preform_one_students s ON sc.student_id = s.id
      WHERE sc.subject_type = 'interview' AND s.year = $1
      GROUP BY sc.student_id, s.admission_number
      ORDER BY average DESC
    `, [year]);
    
    let position = 1;
    for (const result of interviewResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          admission_number = $2,
          total_marks = $4, 
          average = $5, 
          grade = $6, 
          position = $7, 
          remarks = $7, 
          updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.admission_number, year, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 WORKING FINAL: Interview result for ${result.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ WORKING FINAL: PreFormOne interview data populated successfully!');
    console.log(`🔍 WORKING FINAL: Interview results: ${interviewResults.rowCount} students positioned`);
    console.log(`🔍 WORKING FINAL: PDF Generation: READY`);
    
  } catch (error) {
    console.error('🔍 WORKING FINAL: Error populating data:', error);
    throw error;
  }
}

workingFinalPopulate()
  .then(() => {
    console.log('✅ WORKING FINAL: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ WORKING FINAL: Data population failed:', error);
    process.exit(1);
  });
