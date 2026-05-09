const { query } = require('./config/database');

async function checkStudentsTable() {
  try {
    console.log('🔍 TABLE CHECK: Checking students table structure...');
    
    // Get table structure
    const tableInfo = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 TABLE CHECK: Students table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if admission_number column exists
    const hasAdmissionNumber = tableInfo.rows.some(col => col.column_name === 'admission_number');
    console.log(`🔍 TABLE CHECK: Has admission_number column: ${hasAdmissionNumber}`);
    
    if (!hasAdmissionNumber) {
      console.log('❌ TABLE CHECK: ERROR: students table missing admission_number column');
    } else {
      console.log('✅ TABLE CHECK: students table has admission_number column');
    }
    
  } catch (error) {
    console.error('🔍 TABLE CHECK: Error checking table:', error);
  }
}

// Run the check
checkStudentsTable();
