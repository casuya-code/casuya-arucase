const { query } = require('./config/database');

async function populateSimpleData() {
  try {
    console.log('🔍 SIMPLE DATA: Populating simple PreFormOne data...');
    
    const year = 2025;
    
    // 1. Get students and subjects
    const students = await query('SELECT id, admission_number FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    const continuingSubjects = await query('SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code');
    
    console.log(`🔍 SIMPLE DATA: Found ${students.rowCount} students, ${interviewSubjects.rowCount} interview subjects, ${continuingSubjects.rowCount} continuing subjects`);
    
    // 2. Clear existing data
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'continuing\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    await query('DELETE FROM preform_one_continuing_results WHERE year = $1', [year]);
    
    // 3. Add interview scores
    console.log('🔍 SIMPLE DATA: Creating interview scores...');
    for (const student of students.rows) {
      for (const subject of interviewSubjects.rows) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'interview', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [student.id, subject.id, score]);
      }
    }
    
    // 4. Add continuing scores
    console.log('🔍 SIMPLE DATA: Creating continuing scores...');
    for (const student of students.rows) {
      for (const subject of continuingSubjects.rows) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'continuing', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [student.id, subject.id, score]);
      }
    }
    
    // 5. Calculate interview results
    console.log('🔍 SIMPLE DATA: Calculating interview results...');
    const interviewResults = await query(`
      SELECT 
        sc.student_id,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      WHERE sc.subject_type = 'interview' AND sc.student_id IN (SELECT id FROM preform_one_students WHERE year = $1)
      GROUP BY sc.student_id
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
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, year, result.total_marks, result.average, grade, position, remarks]);
      
      position++;
    }
    
    // 6. Calculate continuing results
    console.log('🔍 SIMPLE DATA: Calculating continuing results...');
    const continuingResults = await query(`
      SELECT 
        sc.student_id,
        COUNT(sc.subject_id) as subject_count,
        COALESCE(SUM(sc.score), 0) as total_marks,
        COALESCE(AVG(sc.score), 0) as average
      FROM preform_one_scores sc
      WHERE sc.subject_type = 'continuing' AND sc.student_id IN (SELECT id FROM preform_one_students WHERE year = $1)
      GROUP BY sc.student_id
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
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, year, result.total_marks, result.average, grade, position, remarks]);
      
      position++;
    }
    
    console.log('✅ SIMPLE DATA: All PreFormOne data populated successfully!');
    console.log(`🔍 SIMPLE DATA: Created data for ${students.rowCount} students`);
    console.log(`🔍 SIMPLE DATA: Interview results: ${interviewResults.rowCount} students positioned`);
    console.log(`🔍 SIMPLE DATA: Continuing results: ${continuingResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 SIMPLE DATA: Error populating data:', error);
    throw error;
  }
}

populateSimpleData()
  .then(() => {
    console.log('✅ SIMPLE DATA: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SIMPLE DATA: Data population failed:', error);
    process.exit(1);
  });
