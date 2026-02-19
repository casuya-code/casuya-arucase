/**
 * Fix students table sequence
 * Run: node backend/scripts/fixStudentsSequence.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function fixStudentsSequence() {
  try {
    console.log('='.repeat(80));
    console.log('FIXING STUDENTS TABLE SEQUENCE');
    console.log('='.repeat(80));
    console.log();
    
    // Get the actual sequence name
    const seqResult = await query(`
      SELECT pg_get_serial_sequence('students', 'id') as seq_name
    `);
    
    const seqName = seqResult.rows[0]?.seq_name;
    if (!seqName) {
      console.error('❌ Could not find sequence for students.id');
      process.exit(1);
    }
    
    // Get the current max ID
    const maxIdResult = await query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM students
    `);
    const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
    const nextVal = maxId + 1;
    
    console.log(`Current max ID: ${maxId}`);
    console.log(`Setting sequence to: ${nextVal}`);
    
    // Reset the sequence to the max id + 1
    const setValResult = await query(`
      SELECT setval($1::regclass, $2, false) as current_val
    `, [seqName, nextVal]);
    
    console.log(`✅ Sequence ${seqName} fixed: ${setValResult.rows[0]?.current_val}`);
    console.log('\n✅ Sequence fix completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
    process.exit(1);
  }
}

fixStudentsSequence();
