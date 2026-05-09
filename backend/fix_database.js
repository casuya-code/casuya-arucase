const { query } = require('./config/database');

async function fixDatabase() {
  try {
    console.log('🔍 DATABASE FIX: Starting database table fix...');
    
    // Drop existing table with errors
    await query('DROP TABLE IF EXISTS preform_one_students CASCADE');
    console.log('🔍 DATABASE FIX: Dropped existing table');
    
    // Create table with correct syntax
    const createTableSQL = `
      CREATE TABLE preform_one_students (
        id SERIAL PRIMARY KEY,
        admission_number VARCHAR(50) UNIQUE NOT NULL,
        serial_number VARCHAR(50) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        surname VARCHAR(100) NOT NULL,
        sex VARCHAR(10) NOT NULL CHECK (sex IN ('Male', 'Female')),
        parish VARCHAR(200),
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await query(createTableSQL);
    console.log('🔍 DATABASE FIX: Created new table with correct syntax');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_preform_one_admission_number ON preform_one_students(admission_number)');
    await query('CREATE INDEX IF NOT EXISTS idx_preform_one_serial_number ON preform_one_students(serial_number)');
    await query('CREATE INDEX IF NOT EXISTS idx_preform_one_year ON preform_one_students(year)');
    await query('CREATE INDEX IF NOT EXISTS idx_preform_one_parish ON preform_one_students(parish)');
    console.log('🔍 DATABASE FIX: Created indexes');
    
    console.log('✅ DATABASE FIX: PreForm One students table fixed successfully');
    
  } catch (error) {
    console.error('🔍 DATABASE FIX ERROR:', error);
    throw error;
  }
}

// Run the fix
fixDatabase()
  .then(() => {
    console.log('✅ DATABASE FIX: Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🔍 DATABASE FIX FAILED:', error);
    process.exit(1);
  });
