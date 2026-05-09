const { query } = require('./config/database');

async function testCurrentData() {
  try {
    console.log('🔍 CURRENT DATA: Testing current data state...');
    
    // Check what's currently in the database
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students WHERE year = 2025 ORDER BY admission_number');
    const interviewResults = await query('SELECT COUNT(*) as count FROM preform_one_interview_results WHERE year = 2025');
    const interviewScores = await query('SELECT COUNT(*) as count FROM preform_one_scores WHERE subject_type = \'interview\' AND student_id IN (SELECT id FROM preform_one_students WHERE year = 2025)');
    
    console.log(`🔍 CURRENT DATA: Students: ${students.rowCount}`);
    console.log(`🔍 CURRENT DATA: Interview Results: ${interviewResults.rows[0].count}`);
    console.log(`🔍 CURRENT DATA: Interview Scores: ${interviewScores.rows[0].count}`);
    
    if (interviewResults.rows[0].count > 0) {
      console.log('🔍 CURRENT DATA: Interview results already exist - PDF should work');
    } else {
      console.log('🔍 CURRENT DATA: No interview results - need to add scores first');
    }
    
  } catch (error) {
    console.error('🔍 CURRENT DATA: Error:', error);
  }
}

testCurrentData();
