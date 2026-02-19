/**
 * Test Database Connection Script
 * Verifies PostgreSQL connection and lists all tables
 * 
 * Run: node backend/scripts/testDatabaseConnection.js
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function testConnection() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Testing PostgreSQL Database Connection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test basic connection
    console.log('1. Testing basic connection...');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connection successful!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}\n`);
    
    // List all tables
    console.log('2. Listing all tables...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Count records in key tables
    console.log('\n3. Counting records in key tables...\n');
    const keyTables = [
      'students',
      'users',
      'subjects',
      'individual_scores',
      'comments',
      'student_photos',
      'student_parishes'
    ];
    
    for (const tableName of keyTables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;
        console.log(`   ${tableName}: ${count} record(s)`);
      } catch (error) {
        console.log(`   ${tableName}: Error - ${error.message}`);
      }
    }
    
    // Test a sample query
    console.log('\n4. Testing sample queries...\n');
    
    // Test students query
    try {
      const studentsResult = await query('SELECT COUNT(*) as count FROM students');
      console.log(`   ✅ Students table accessible: ${studentsResult.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ Students table error: ${error.message}`);
    }
    
    // Test users query
    try {
      const usersResult = await query('SELECT COUNT(*) as count FROM users');
      console.log(`   ✅ Users table accessible: ${usersResult.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ Users table error: ${error.message}`);
    }
    
    // Test website settings
    try {
      const settingsResult = await query('SELECT * FROM website_settings WHERE id = 1');
      if (settingsResult.rows.length > 0) {
        console.log(`   ✅ Website settings found`);
      } else {
        console.log(`   ⚠️  Website settings not configured`);
      }
    } catch (error) {
      console.log(`   ❌ Website settings error: ${error.message}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database connection test complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Database connection test failed!');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database is running');
    console.error('2. Environment variables are set correctly (.env file)');
    console.error('3. Database credentials are correct');
    console.error('4. Network connectivity to database server\n');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testConnection();
