const { query } = require('./config/database');

async function populateInterviewSubjectsFixed() {
  try {
    console.log('🔍 INTERVIEW FIXED: Populating all interview subjects with sample data...');
    
    const year = 2025;
    
    // Clear existing interview scores
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    
    // Get all students and interview subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code', []);
    
    console.log(`🔍 INTERVIEW FIXED: Found ${students.rowCount} students and ${interviewSubjects.rowCount} interview subjects`);
    
    // Populate interview scores for all students and all subjects
    console.log('🔍 INTERVIEW FIXED: Creating interview scores...');
    for (const student of students.rows) {
      console.log(`🔍 INTERVIEW FIXED: Creating scores for ${student.admission_number} - ${student.first_name} ${student.surname}`);
      
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
    
    // Calculate and insert interview results
    console.log('🔍 INTERVIEW FIXED: Calculating interview results...');
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
      
      console.log(`🔍 INTERVIEW FIXED: Interview result for ${result.admission_number} - Position: ${position}, Grade: ${grade}, Average: ${result.average.toFixed(2)}`);
      position++;
    }
    
    console.log('✅ INTERVIEW FIXED: All interview subjects populated successfully!');
    console.log(`🔍 INTERVIEW FIXED: Summary:`);
    console.log(`  - Students: ${students.rowCount}`);
    console.log(`  - Interview Subjects: ${interviewSubjects.rowCount}`);
    console.log(`  - Interview Results: ${interviewResults.rowCount}`);
    console.log(`  - PDF Generation: READY`);
    
  } catch (error) {
    console.error('🔍 INTERVIEW FIXED: Error populating data:', error);
    throw error;
  }
}

populateInterviewSubjectsFixed()
  .then(() => {
    console.log('✅ INTERVIEW FIXED: All interview subjects population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ INTERVIEW FIXED: All interview subjects population failed:', error);
    process.exit(1);
  });
