const { query } = require('./config/database');

async function populateAllPreFormOneData() {
  try {
    console.log('🔍 POPULATE: Populating all PreFormOne subjects data...');
    
    const year = 2025;
    
    // 1. Clear existing data
    console.log('🔍 POPULATE: Clearing existing data...');
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'continuing\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    await query('DELETE FROM preform_one_continuing_results WHERE year = $1', [year]);
    
    // 2. Get students and subjects
    const students = await query('SELECT id, admission_number, first_name, middle_name, surname, sex FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    const continuingSubjects = await query('SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code');
    
    console.log(`🔍 POPULATE: Found ${students.rowCount} students, ${interviewSubjects.rowCount} interview subjects, ${continuingSubjects.rowCount} continuing subjects`);
    
    // 3. Create interview scores for all students
    console.log('🔍 POPULATE: Creating interview scores...');
    for (const student of students.rows) {
      console.log(`🔍 POPULATE: Creating interview scores for ${student.admission_number} - ${student.first_name} ${student.surname}`);
      
      for (const subject of interviewSubjects.rows) {
        let score;
        switch (subject.subject_code) {
          case 'MATH':
            score = Math.floor(Math.random() * 25) + 70; // 70-95
            break;
          case 'ENG':
            score = Math.floor(Math.random() * 20) + 75; // 75-95
            break;
          case 'SCI':
            score = Math.floor(Math.random() * 30) + 65; // 65-95
            break;
          case 'SST':
            score = Math.floor(Math.random() * 25) + 70; // 70-95
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
        `, [student.id, subject.id, score]);
      }
    }
    
    // 4. Create continuing scores for all students
    console.log('🔍 POPULATE: Creating continuing scores...');
    for (const student of students.rows) {
      console.log(`🔍 POPULATE: Creating continuing scores for ${student.admission_number}`);
      
      for (const subject of continuingSubjects.rows) {
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
          case 'BIO':
            score = Math.floor(Math.random() * 15) + 80; // 80-95
            break;
          case 'CRE':
            score = Math.floor(Math.random() * 20) + 75; // 75-95
            break;
          case 'AGRI':
            score = Math.floor(Math.random() * 25) + 70; // 70-95
            break;
          case 'PE':
            score = Math.floor(Math.random() * 10) + 85; // 85-95
            break;
          default:
            score = Math.floor(Math.random() * 30) + 65; // 65-95
        }
        
        await query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
          VALUES ($1, $2, 'continuing', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [student.id, subject.id, score]);
      }
    }
    
    // 5. Calculate and insert interview results
    console.log('🔍 POPULATE: Calculating interview results...');
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
        INSERT INTO preform_one_interview_results (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, year, result.total_marks, result.average, grade, position, remarks]);
      
      position++;
    }
    
    // 6. Calculate and insert continuing results
    console.log('🔍 POPULATE: Calculating continuing results...');
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
        INSERT INTO preform_one_continuing_results (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, year, result.total_marks, result.average, grade, position, remarks]);
      
      position++;
    }
    
    console.log('✅ POPULATE: All PreFormOne data populated successfully!');
    console.log(`🔍 POPULATE: Created data for ${students.rowCount} students`);
    console.log(`🔍 POPULATE: Interview results: ${interviewResults.rowCount} students positioned`);
    console.log(`🔍 POPULATE: Continuing results: ${continuingResults.rowCount} students positioned`);
    
  } catch (error) {
    console.error('🔍 POPULATE: Error populating data:', error);
    throw error;
  }
}

populateAllPreFormOneData()
  .then(() => {
    console.log('✅ POPULATE: Data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ POPULATE: Data population failed:', error);
    process.exit(1);
  });
