const { query } = require('./config/database');

async function checkInterviewResultsStructure() {
  try {
    console.log('🔍 STRUCTURE: Checking preform_one_interview_results table structure...');
    
    // Get table structure
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'preform_one_interview_results'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 STRUCTURE: Table columns:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Get sample data to see what's currently there
    const sampleData = await query('SELECT * FROM preform_one_interview_results LIMIT 1');
    console.log(`🔍 STRUCTURE: Sample rows: ${sampleData.rowCount}`);
    if (sampleData.rowCount > 0) {
      console.log('🔍 STRUCTURE: Sample data:', sampleData.rows[0]);
    }
    
    console.log('✅ STRUCTURE: Table structure check completed');
    
  } catch (error) {
    console.error('🔍 STRUCTURE: Error checking table structure:', error);
    throw error;
  }
}

checkInterviewResultsStructure()
  .then(() => {
    console.log('✅ STRUCTURE: Structure check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ STRUCTURE: Structure check failed:', error);
    process.exit(1);
  });
