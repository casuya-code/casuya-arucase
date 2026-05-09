const { query } = require('./config/database');

async function createSampleInterviewScores() {
  try {
    console.log('🔍 SAMPLE SCORES: Creating sample interview scores for 2025...');
    
    // Get students and subjects
    const students = await query('SELECT id, admission_number FROM preform_one_students WHERE year = 2025');
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    
    console.log(`🔍 SAMPLE SCORES: Found ${students.rowCount} students and ${subjects.rowCount} subjects`);
    
    // Clear existing interview scores
    await query('DELETE FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    console.log('🔍 SAMPLE SCORES: Cleared existing interview scores');
    
    // Create sample scores for each student
    for (const student of students.rows) {
      console.log(`🔍 SAMPLE SCORES: Creating scores for student ${student.admission_number}`);
      
      for (const subject of subjects.rows) {
        // Generate realistic scores (60-95 range)
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
          ON CONFLICT (student_id, subject_id, subject_type) 
          DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
        `, [student.id, subject.id, score]);
        
        console.log(`  - ${subject.subject_code}: ${score}`);
      }
    }
    
    // Update interview results with calculated totals
    console.log('🔍 SAMPLE SCORES: Calculating interview results...');
    await query(`
      DELETE FROM preform_one_interview_results WHERE year = 2025
    `);
    
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
        INSERT INTO preform_one_interview_results (
          student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at
        ) VALUES ($1, 2025, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.total_marks, result.average, grade, position, remarks]);
      
      console.log(`🔍 SAMPLE SCORES: Result for ${result.admission_number} - Total: ${result.total_marks}, Avg: ${result.average.toFixed(2)}, Grade: ${grade}, Position: ${position}`);
      position++;
    }
    
    console.log(`✅ SAMPLE SCORES: Created interview scores for ${students.rowCount} students`);
    
  } catch (error) {
    console.error('🔍 SAMPLE SCORES: Error creating sample scores:', error);
    throw error;
  }
}

createSampleInterviewScores()
  .then(() => {
    console.log('✅ SAMPLE SCORES: Sample scores creation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SAMPLE SCORES: Sample scores creation failed:', error);
    process.exit(1);
  });
