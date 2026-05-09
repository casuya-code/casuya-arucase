const { query } = require('./config/database');

async function fixInterviewResults() {
  try {
    console.log('🔍 FIX RESULTS: Fixing interview results...');
    
    // Clear existing interview results
    await query('DELETE FROM preform_one_interview_results WHERE year = 2025');
    console.log('🔍 FIX RESULTS: Cleared existing interview results');
    
    // Get current interview scores
    const interviewScores = await query(`
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
    
    console.log(`🔍 FIX RESULTS: Found ${interviewScores.rowCount} students with interview scores`);
    
    // Insert interview results one by one
    let position = 1;
    for (const scoreData of interviewScores.rows) {
      const grade = scoreData.average >= 75 ? 'A' : 
                   scoreData.average >= 65 ? 'B' : 
                   scoreData.average >= 50 ? 'C' : 
                   scoreData.average >= 40 ? 'D' : 'F';
      
      const remarks = scoreData.average >= 55 ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';
      
      await query(`
        INSERT INTO preform_one_interview_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES ($1, 2025, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [scoreData.student_id, scoreData.total_marks, scoreData.average, grade, position, remarks]);
      
      console.log(`🔍 FIX RESULTS: Added result for ${scoreData.admission_number} - Position: ${position}, Grade: ${grade}`);
      position++;
    }
    
    console.log(`✅ FIX RESULTS: Successfully created ${interviewScores.rowCount} interview results`);
    
  } catch (error) {
    console.error('🔍 FIX RESULTS: Error:', error);
    throw error;
  }
}

fixInterviewResults()
  .then(() => {
    console.log('✅ FIX RESULTS: Interview results fixed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FIX RESULTS: Interview results fix failed:', error);
    process.exit(1);
  });
