const { query } = require('./config/database');

async function addPromotionIndexes() {
  try {
    console.log('🔍 INDEXES: Adding performance indexes for promotion queries...');
    
    // Add index for students table admission_number queries (for promotion status)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_students_admission_number_promotion 
      ON students (admission_number) 
      WHERE admission_number LIKE '789ABC%';
    `);
    
    // Add index for students table created_at year queries (for promotion status)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_students_created_at_year 
      ON students (EXTRACT(YEAR FROM created_at), admission_number) 
      WHERE admission_number LIKE '789ABC%';
    `);
    
    // Add index for preform_one_students year queries (already exists but ensure it's optimized)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_preform_one_students_year_optimized 
      ON preform_one_students (year, admission_number);
    `);
    
    console.log('✅ INDEXES: Performance indexes added successfully');
    
  } catch (error) {
    console.error('🔍 INDEXES: Error adding indexes:', error);
    throw error;
  }
}

// Run the function
addPromotionIndexes()
  .then(() => {
    console.log('✅ INDEXES: Index optimization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ INDEXES: Index optimization failed:', error);
    process.exit(1);
  });
