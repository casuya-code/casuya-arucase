const { query } = require('./config/database');

async function clearAndPopulate() {
  try {
    console.log('🔍 CLEAR POPULATE: Clearing all existing PreFormOne data...');
    
    // Clear all existing data
    await query('DELETE FROM preform_one_scores WHERE student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    await query('DELETE FROM preform_one_continuing_results WHERE year = 2025');
    
    console.log('🔍 CLEAR POPULATE: Cleared all existing data');
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = 2025 ORDER BY admission_number');
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    const continuingSubjects = await query('SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code');
    
    console.log(`🔍 CLEAR POPULATE: Found ${students.rowCount} students, ${interviewSubjects.rowCount} interview subjects, ${continuingSubjects.rowCount} continuing subjects`);
    
    // Add interview scores for first 3 students
    for (let i = 0; i < Math.min(3, students.rowCount); i++) {
      const student = students.rows[i];
      console.log(`🔍 CLEAR POPULATE: Adding interview scores for ${student.admission_number}`);
      
      for (const subject of interviewSubjects.rows.slice(0, 3)) { // Only first 3 subjects
        const score = Math.floor(Math.random() * 25) + 75; // 75-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Add continuing scores for first 3 students
    for (let i = 0; i < Math.min(3, students.rowCount); i++) {
      const student = students.rows[i];
      console.log(`🔍 CLEAR POPULATE: Adding continuing scores for ${student.admission_number}`);
      
      for (const subject of continuingSubjects.rows.slice(0, 3)) { // Only first 3 subjects
        const score = Math.floor(Math.random() * 25) + 75; // 75-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'continuing', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
      }
    }
    
    // Calculate interview results
    console.log('🔍 CLEAR POPULATE: Calculating interview results...');
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
        VALUES ($1, 2025, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET total_marks = $2, average = $3, grade = $4, position = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 CLEAR POPULATE: Interview result for student - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    // Calculate continuing results
    console.log('🔍 CLEAR POPULATE: Calculating continuing results...');
    const continuingResults = await query(`
      SELECT 
        sc.student_id,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      WHERE sc.subject_type = 'continuing' AND sc.student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)
      GROUP BY sc.student_id
      ORDER BY average DESC
    `);
    
    position = 1;
    for (const result of continuingResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_continuing_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, 2025, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET total_marks = $2, average = $3, grade = $4, position = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 CLEAR POPULATE: Continuing result for student - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log('✅ CLEAR POPULATE: All PreFormOne data populated successfully!');
    console.log(`🔍 CLEAR POPULATE: Interview results: ${interviewResults.rowCount} students positioned`);
    console.log(`🔍 CLEAR POPULATE: Continuing results: ${continuingResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 CLEAR POPULATE: Error populating data:', error);
    throw error;
  }
}

clearAndPopulate()
  .then(() => {
    console.log('✅ CLEAR POPULATE: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CLEAR POPULATE: Data population failed:', error);
    process.exit(1);
  });
