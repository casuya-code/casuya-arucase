/**
 * Fix student_parishes sequence
 * Run: node backend/scripts/fixParishesSequence.js
 * 
 * This script fixes the sequence for student_parishes table
 * to prevent duplicate key errors
 */
require('dotenv').config();
const { query } = require('../config/database');

async function fixSequence() {
  try {
    console.log('Fixing student_parishes sequence...');
    
    // Get the actual sequence name
    const seqResult = await query(`
      SELECT pg_get_serial_sequence('student_parishes', 'id') as seq_name
    `);
    
    const seqName = seqResult.rows[0]?.seq_name;
    if (!seqName) {
      console.error('❌ Could not find sequence for student_parishes.id');
      process.exit(1);
    }
    
    console.log(`Found sequence: ${seqName}`);
    
    // Get the current max ID
    const maxIdResult = await query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM student_parishes
    `);
    const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
    const nextVal = maxId + 1;
    
    console.log(`Current max ID: ${maxId}`);
    console.log(`Setting sequence to: ${nextVal}`);
    
    // Reset the sequence
    const setValResult = await query(`
      SELECT setval($1::regclass, $2, false) as current_val
    `, [seqName, nextVal]);
    
    console.log(`✅ Sequence fixed! Current value: ${setValResult.rows[0]?.current_val}`);
    
    // Verify
    const verifyResult = await query(`SELECT last_value FROM ${seqName}`);
    console.log(`✅ Verified sequence value: ${verifyResult.rows[0]?.last_value}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
    process.exit(1);
  }
}

fixSequence();
