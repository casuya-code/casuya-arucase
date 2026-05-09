const { query } = require('./config/database');

async function calculateInterviewResultsWorking() {
  try {
    console.log('🔍 RESULTS WORKING: Calculating and inserting interview results with correct structure...');
    
    const year = 2025;
    
    // Clear existing interview results
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    
    // Calculate interview results from scores
    console.log('🔍 RESULTS WORKING: Calculating results from interview scores...');
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
    
    console.log(`🔍 RESULTS WORKING: Found ${interviewResults.rowCount} students with interview scores`);
    
    // Insert results one by one with correct column order matching table structure
    let position = 1;
    for (const result of interviewResults.rows) {
      // Convert average to number for toFixed
      const averageNum = parseFloat(result.average);
      const grade = averageNum >= 75 ? 'A' : 
                   averageNum >= 65 ? 'B' : 
                   averageNum >= 50 ? 'C' : 
                   averageNum >= 40 ? 'D' : 'F';
      
      const remarks = averageNum >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      console.log(`🔍 RESULTS WORKING: Processing ${result.admission_number} - Average: ${averageNum.toFixed(2)}, Grade: ${grade}`);
      
      // Correct INSERT matching table structure exactly:
      // id (auto), student_id, admission_number, total_marks, average, grade, position, remarks, year, created_at, updated_at
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.admission_number, result.total_marks, averageNum, grade, position, remarks, year]);
      
      position++;
    }
    
    console.log('✅ RESULTS WORKING: Interview results calculated and inserted successfully!');
    console.log(`🔍 RESULTS WORKING: Summary:`);
    console.log(`  - Students processed: ${interviewResults.rowCount}`);
    console.log(`  - Results inserted: ${position - 1}`);
    console.log(`  - PDF Generation: READY`);
    
  } catch (error) {
    console.error('🔍 RESULTS WORKING: Error calculating results:', error);
    throw error;
  }
}

calculateInterviewResultsWorking()
  .then(() => {
    console.log('✅ RESULTS WORKING: Interview results calculation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RESULTS WORKING: Interview results calculation failed:', error);
    process.exit(1);
  });
