/**
 * Check Marks Configuration
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkConfig() {
  try {
    console.log('Checking marks configuration...\n');
    
    const result = await query('SELECT month, weight FROM marks_config ORDER BY month');
    
    if (result.rows.length === 0) {
      console.log('No marks configuration found');
    } else {
      console.log('Current marks config:');
      let total = 0;
      result.rows.forEach(row => {
        console.log(`  ${row.month}: ${row.weight}%`);
        total += parseFloat(row.weight);
      });
      console.log(`\nTotal: ${total.toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkConfig();
