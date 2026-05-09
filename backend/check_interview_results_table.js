const { query } = require('./config/database');

async function checkInterviewResultsTable() {
  try {
    console.log('🔍 TABLE CHECK: Checking preform_one_interview_results table structure...');
    
    const tableInfo = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_interview_results'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 TABLE CHECK: preform_one_interview_results table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('🔍 TABLE CHECK: Error checking table:', error);
  }
}

checkInterviewResultsTable();
