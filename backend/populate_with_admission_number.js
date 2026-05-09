const { query } = require('./config/database');

async function populateWithAdmissionNumber() {
  try {
    console.log('🔍 ADMISSION: Populating data with admission numbers...');
    
    // Clear all existing data first
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    
    // Get students with admission numbers
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = 2025 ORDER BY admission_number LIMIT 2');
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code LIMIT 2');
    
    console.log(`🔍 ADMISSION: Processing ${students.rowCount} students with ${subjects.rowCount} subjects`);
    
    // Add interview scores
    for (const student of students.rows) {
      for (const subject of subjects.rows) {
        const score = Math.floor(Math.random() * 25) + 75; // 75-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Create interview results with admission numbers
    const interviewResults = await query(`
      SELECT 
        sc.student_id,
        s.admission_number,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      JOIN preform_one_students s ON sc.student_id = s.id
      WHERE sc.subject_type = 'interview' AND s.year = 2025
      GROUP BY sc.student_id, s.admission_number
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
        (student_id, admission_number, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, 2025, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          admission_number = $2,
          total_marks = $3, 
          average = $4, 
          grade = $5, 
          position = $6, 
          remarks = $7, 
          updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.admission_number, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 ADMISSION: Result for ${result.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ ADMISSION: PreFormOne data populated successfully!');
    console.log(`🔍 ADMISSION: Interview results: ${interviewResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 ADMISSION: Error populating data:', error);
    throw error;
  }
}

populateWithAdmissionNumber()
  .then(() => {
    console.log('✅ ADMISSION: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ADMISSION: Data population failed:', error);
    process.exit(1);
  });
