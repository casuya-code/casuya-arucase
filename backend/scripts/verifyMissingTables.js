/**
 * Verify missing tables were added
 * Run: node backend/scripts/verifyMissingTables.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function verifyTables() {
  try {
    console.log('Verifying missing tables...\n');
    
    const tables = ['public_events', 'public_gallery'];
    
    for (const tableName of tables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      const exists = result.rows[0].exists;
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`${status.padEnd(12)} ${tableName}`);
      
      if (exists) {
        // Get column info
        const columns = await query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`   Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
        
        // Get count
        const count = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   Records: ${count.rows[0].count}\n`);
      }
    }
    
    console.log('✅ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTables();
