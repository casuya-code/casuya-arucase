const { query } = require('./config/database');

async function calculateInterviewResultsSimple() {
  try {
    console.log('🔍 RESULTS SIMPLE: Calculating and inserting interview results...');
    
    const year = 2025;
    
    // Clear existing interview results
    await query('DELETE FROM preform_one_interview_results WHERE year = $1', [year]);
    
    // Calculate interview results from scores
    console.log('🔍 RESULTS SIMPLE: Calculating results from interview scores...');
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
    
    console.log(`🔍 RESULTS SIMPLE: Found ${interviewResults.rowCount} students with interview scores`);
    
    // Insert results one by one with simple INSERT
    let position = 1;
    for (const result of interviewResults.rows) {
      const grade = result.average >= 75 ? 'A' : 
                   result.average >= 65 ? 'B' : 
                   result.average >= 50 ? 'C' : 
                   result.average >= 40 ? 'D' : 'F';
      
      const remarks = result.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      console.log(`🔍 RESULTS SIMPLE: Processing ${result.admission_number} - Average: ${result.average.toFixed(2)}, Grade: ${grade}`);
      
      // Simple INSERT without ON CONFLICT for now
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [result.student_id, result.admission_number, year, result.total_marks, result.average, grade, position, remarks]);
      
      position++;
    }
    
    console.log('✅ RESULTS SIMPLE: Interview results calculated and inserted successfully!');
    console.log(`🔍 RESULTS SIMPLE: Summary:`);
    console.log(`  - Students processed: ${interviewResults.rowCount}`);
    console.log(`  - Results inserted: ${position - 1}`);
    console.log(`  - PDF Generation: READY`);
    
  } catch (error) {
    console.error('🔍 RESULTS SIMPLE: Error calculating results:', error);
    throw error;
  }
}

calculateInterviewResultsSimple()
  .then(() => {
    console.log('✅ RESULTS SIMPLE: Interview results calculation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RESULTS SIMPLE: Interview results calculation failed:', error);
    process.exit(1);
  });
