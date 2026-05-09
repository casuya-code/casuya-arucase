const { query } = require('./config/database');

async function finalWorkingPopulate() {
  try {
    console.log('🔍 FINAL: Final working population of PreFormOne subjects...');
    
    const year = 2025;
    
    // Clear existing data
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    await query('DELETE FROM preform_one_continuing_results WHERE year = $1', [year]);
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    const continuingSubjects = await query('SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code');
    
    console.log(`🔍 FINAL: Found ${students.rowCount} students, ${interviewSubjects.rowCount} interview subjects, ${continuingSubjects.rowCount} continuing subjects`);
    
    // Add interview scores
    console.log('🔍 FINAL: Creating interview scores...');
    for (const student of students.rows) {
      for (const subject of interviewSubjects.rows) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Add continuing scores
    console.log('🔍 FINAL: Creating continuing scores...');
    for (const student of students.rows) {
      for (const subject of continuingSubjects.rows) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'continuing', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Calculate interview results
    console.log('🔍 FINAL: Calculating interview results...');
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
          total_marks = $3, 
          average = $4, 
          grade = $5, 
          position = $6, 
          remarks = $7, 
          updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.admission_number, year, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 FINAL: Interview result for ${result.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    // Calculate continuing results
    console.log('🔍 FINAL: Calculating continuing results...');
    const continuingResults = await query(`
      SELECT 
        sc.student_id,
        s.admission_number,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      JOIN preform_one_students s ON sc.student_id = s.id
      WHERE sc.subject_type = 'continuing' AND s.year = $1
      GROUP BY sc.student_id, s.admission_number
      ORDER BY average DESC
    `, [year]);
    
    position = 1;
    for (const result of continuingResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_continuing_results 
        (student_id, admission_number, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          admission_number = $2,
          total_marks = $3, 
          average = $4, 
          grade = $5, 
          position = $6, 
          remarks = $7, 
          updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.admission_number, year, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 FINAL: Continuing result for ${result.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ FINAL: ALL PreFormOne subjects populated successfully!');
    console.log(`🔍 FINAL: Summary:`);
    console.log(`  - Students: ${students.rowCount}`);
    console.log(`  - Interview Subjects: ${interviewSubjects.rowCount}`);
    console.log(`  - Continuing Subjects: ${continuingSubjects.rowCount}`);
    console.log(`  - Interview Results: ${interviewResults.rowCount}`);
    console.log(`  - Continuing Results: ${continuingResults.rowCount}`);
    console.log(`  - PDF Generation: READY`);
    
  } catch (error) {
    console.error('🔍 FINAL: Error populating data:', error);
    throw error;
  }
}

finalWorkingPopulate()
  .then(() => {
    console.log('✅ FINAL: All PreFormOne subjects population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FINAL: All PreFormOne subjects population failed:', error);
    process.exit(1);
  });
