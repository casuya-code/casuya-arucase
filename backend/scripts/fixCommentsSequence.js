/**
 * Fix Comments Sequence - Reset the sequence to match the maximum ID
 * Run this once to fix the sequence out-of-sync issue
 */

const { query } = require('../config/database');

async function fixCommentsSequence() {
  try {
    console.log('🔧 Fixing comments sequence...');
    
    // Get the current maximum ID
    const result = await query('SELECT MAX(id) as max_id FROM comments');
    const maxId = result.rows[0]?.max_id || 0;
    
    console.log(`📊 Current maximum ID: ${maxId}`);
    
    // Reset the sequence to max_id + 1
    await query(`
      SELECT setval('comments_id_seq', $1, false)
    `, [maxId + 1]);
    
    console.log(`✅ Sequence reset to: ${maxId + 1}`);
    console.log('✅ Comments sequence fixed!');
    
    // Verify the sequence
    const seqResult = await query('SELECT last_value FROM comments_id_seq');
    console.log(`✅ Sequence last_value: ${seqResult.rows[0].last_value}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing comments sequence:', error);
    process.exit(1);
  }
}

fixCommentsSequence();

