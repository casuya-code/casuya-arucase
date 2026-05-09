const { query } = require('./config/database');

async function testPromotionAPI() {
  try {
    console.log('🔍 API TEST: Testing promotion API...');
    
    // Test basic database connection
    const testQuery = 'SELECT COUNT(*) FROM preform_one_students';
    const result = await query(testQuery);
    console.log('🔍 API TEST: Database connection result:', result.rows[0]);
    
    // Test eligible students query for 2025
    const year = 2025;
    const eligibleQuery = `
      SELECT id, admission_number, serial_number, first_name, middle_name, surname, sex, parish, year
      FROM preform_one_students 
      WHERE year = $1 
      ORDER BY admission_number
      LIMIT 5
    `;
    
    console.time('🔍 API TEST: Query execution time');
    const eligibleResult = await query(eligibleQuery, [year]);
    console.timeEnd('🔍 API TEST: Query execution time');
    
    console.log('🔍 API TEST: Eligible students result:', {
      count: eligibleResult.rowCount,
      data: eligibleResult.rows
    });
    
    return {
      success: true,
      data: eligibleResult.rows,
      count: eligibleResult.rowCount
    };
    
  } catch (error) {
    console.error('🔍 API TEST: Database error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testPromotionAPI()
  .then(() => {
    console.log('✅ API TEST: Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ API TEST: Test failed:', error);
    process.exit(1);
  });
