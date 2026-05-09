const { query } = require('./config/database');

async function populateCompleteInterviewData() {
  try {
    console.log('🔍 COMPLETE: Populating complete interview data (scores + results)...');
    
    const year = 2025;
    
    // Clear existing data
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = $1)', [year]);
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    
    // Get all students and interview subjects
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = $1 ORDER BY admission_number', [year]);
    const interviewSubjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code', []);
    
    console.log(`🔍 COMPLETE: Found ${students.rowCount} students and ${interviewSubjects.rowCount} interview subjects`);
    
    // Populate interview scores for all students and all subjects
    console.log('🔍 COMPLETE: Creating interview scores...');
    for (const student of students.rows) {
      console.log(`🔍 COMPLETE: Creating scores for ${student.admission_number} - ${student.first_name} ${student.surname}`);
      
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
    console.log('🔍 COMPLETE: Calculating interview results...');
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
      const averageNum = parseFloat(result.average);
      const grade = averageNum >= 75 ? 'A' : 
                   averageNum >= 65 ? 'B' : 
                   averageNum >= 50 ? 'C' : 
                   averageNum >= 40 ? 'D' : 'F';
      
      const remarks = averageNum >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      console.log(`🔍 COMPLETE: Processing ${result.admission_number} - Average: ${averageNum.toFixed(2)}, Grade: ${grade}, Position: ${position}`);
      
      // Correct INSERT matching table structure exactly
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.admission_number, result.total_marks, averageNum, grade, position, remarks, year]);
      
      position++;
    }
    
    console.log('✅ COMPLETE: All interview data populated successfully!');
    console.log(`🔍 COMPLETE: Summary:`);
    console.log(`  - Students: ${students.rowCount}`);
    console.log(`  - Interview Subjects: ${interviewSubjects.rowCount}`);
    console.log(`  - Scores Created: ${students.rowCount * interviewSubjects.rowCount}`);
    console.log(`  - Results Inserted: ${interviewResults.rowCount}`);
    console.log(`  - PDF Generation: READY`);
    console.log(`🔍 COMPLETE: Run 'node test_pdf_generation.js' to verify PDF generation works`);
    
  } catch (error) {
    console.error('🔍 COMPLETE: Error populating data:', error);
    throw error;
  }
}

populateCompleteInterviewData()
  .then(() => {
    console.log('✅ COMPLETE: Complete interview data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ COMPLETE: Complete interview data population failed:', error);
    process.exit(1);
  });
