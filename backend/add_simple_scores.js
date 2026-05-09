const { query } = require('./config/database');

async function addSimpleScores() {
  try {
    console.log('🔍 SIMPLE SCORES: Adding simple interview scores...');
    
    // Add some basic scores for existing students
    const students = await query('SELECT id, admission_number FROM preform_one_students WHERE year = 2025 LIMIT 3');
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code LIMIT 3');
    
    console.log(`🔍 SIMPLE SCORES: Found ${students.rowCount} students and ${subjects.rowCount} subjects`);
    
    // Clear existing scores first
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    
    // Add simple scores
    for (const student of students.rows) {
      for (const subject of subjects.rows) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [student.id, subject.id, score]);
        
        console.log(`🔍 SIMPLE SCORES: Added ${subject.subject_code}: ${score} for ${student.admission_number}`);
      }
    }
    
    // Recalculate interview results
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    
    const results = await query(`
      SELECT 
        sc.student_id,
        s.admission_number,
        s.first_name,
        s.surname,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      JOIN preform_one_students s ON sc.student_id = s.id
      WHERE sc.subject_type = 'interview' AND s.year = 2025
      GROUP BY sc.student_id, s.admission_number, s.first_name, s.surname
      ORDER BY average DESC
    `);
    
    let position = 1;
    for (const result of results.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, 2025, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 SIMPLE SCORES: Result for ${result.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ SIMPLE SCORES: Sample scores added successfully');
    
  } catch (error) {
    console.error('🔍 SIMPLE SCORES: Error:', error);
    throw error;
  }
}

addSimpleScores()
  .then(() => {
    console.log('✅ SIMPLE SCORES: Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SIMPLE SCORES: Process failed:', error);
    process.exit(1);
  });
