const { query } = require('./config/database');

async function checkAllTables() {
  try {
    console.log('🔍 TABLES CHECK: Checking all PreFormOne table structures...');
    
    // Check preform_one_interview_results
    const interviewResultsTable = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_interview_results'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 TABLES CHECK: preform_one_interview_results columns:');
    interviewResultsTable.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check preform_one_continuing_results
    const continuingResultsTable = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_continuing_results'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 TABLES CHECK: preform_one_continuing_results columns:');
    continuingResultsTable.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check preform_one_scores
    const scoresTable = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_scores'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 TABLES CHECK: preform_one_scores columns:');
    scoresTable.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('🔍 TABLES CHECK: Error checking tables:', error);
  }
}

checkAllTables();
