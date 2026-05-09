const { query } = require('./config/database');

async function addBasicScores() {
  try {
    console.log('🔍 BASIC SCORES: Adding basic interview scores...');
    
    // Add scores for first student only
    await query(`
      INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
      VALUES 
        (1, 1, 'interview', 85, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 2, 'interview', 78, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 3, 'interview', 82, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    console.log('🔍 BASIC SCORES: Added interview scores for student 1');
    
    // Add continuing scores for first student
    await query(`
      INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_at, updated_at)
      VALUES 
        (1, 9, 'continuing', 88, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 10, 'continuing', 84, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (1, 11, 'continuing', 82, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    console.log('🔍 BASIC SCORES: Added continuing scores for student 1');
    
    // Add interview result for first student
    await query(`
      INSERT INTO preform_one_interview_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES (1, 2025, 245, 81.67, 'A', 1, 'AMECHAGULIWA', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    console.log('🔍 BASIC SCORES: Added interview result for student 1');
    
    // Add continuing result for first student
    await query(`
      INSERT INTO preform_one_continuing_results 
        (student_id, year, total_marks, average, grade, position, remarks, created_at, updated_at)
        VALUES (1, 2025, 254, 84.67, 'A', 1, 'AMECHAGULIWA', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    console.log('🔍 BASIC SCORES: Added continuing result for student 1');
    
    console.log('✅ BASIC SCORES: Basic scores added successfully!');
    
  } catch (error) {
    console.error('🔍 BASIC SCORES: Error:', error);
    throw error;
  }
}

addBasicScores()
  .then(() => {
    console.log('✅ BASIC SCORES: Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ BASIC SCORES: Process failed:', error);
    process.exit(1);
  });
