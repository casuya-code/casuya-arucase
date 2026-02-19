/**
 * Check all data in the system
 * Run: node backend/scripts/checkAllData.js
 * 
 * This script checks all tables in the database and reports:
 * - Total record counts per table
 * - Sample data from each table
 * - Summary of data availability
 */
require('dotenv').config();
const { query } = require('../config/database');

// List of all tables in the system
const TABLES = [
  'users',
  'students',
  'student_photos',
  'student_parishes',
  'comments',
  'subjects',
  'subject_teachers',
  'individual_scores',
  'monthly_results',
  'tabia_mwenendo',
  'individual_debt',
  'fees_announcements',
  'public_announcements',
  'read_announcements',
  'public_pages',
  'website_settings',
  'public_events',
  'public_gallery'
];

async function checkTable(tableName) {
  try {
    // Check if table exists
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);

    if (!tableExists.rows[0].exists) {
      return {
        table: tableName,
        exists: false,
        count: 0,
        sample: []
      };
    }

    // Get count
    const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = parseInt(countResult.rows[0].count);

    // Get sample data (first 3 records)
    let sample = [];
    if (count > 0) {
      const sampleResult = await query(`SELECT * FROM ${tableName} LIMIT 3`);
      sample = sampleResult.rows;
    }

    return {
      table: tableName,
      exists: true,
      count: count,
      sample: sample
    };
  } catch (error) {
    return {
      table: tableName,
      exists: false,
      error: error.message,
      count: 0,
      sample: []
    };
  }
}

async function checkAllData() {
  console.log('='.repeat(80));
  console.log('CHECKING ALL DATA IN SYSTEM');
  console.log('='.repeat(80));
  console.log();

  try {
    // Test database connection
    const connectionTest = await query('SELECT NOW() as current_time');
    console.log(`✅ Database connected at: ${connectionTest.rows[0].current_time}`);
    console.log();

    const results = [];
    let totalRecords = 0;
    let tablesWithData = 0;
    let tablesWithoutData = 0;

    // Check each table
    for (const table of TABLES) {
      console.log(`Checking ${table}...`);
      const result = await checkTable(table);
      results.push(result);

      if (result.exists && !result.error) {
        totalRecords += result.count;
        if (result.count > 0) {
          tablesWithData++;
          console.log(`  ✅ Found ${result.count} records`);
        } else {
          tablesWithoutData++;
          console.log(`  ⚠️  Table exists but is empty`);
        }
      } else if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else {
        console.log(`  ⚠️  Table does not exist`);
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();

    // Detailed summary
    console.log('📊 TABLE SUMMARY:');
    console.log('-'.repeat(80));
    results.forEach(result => {
      const status = result.error 
        ? '❌ ERROR' 
        : !result.exists 
        ? '⚠️  MISSING' 
        : result.count > 0 
        ? '✅ HAS DATA' 
        : '⚠️  EMPTY';
      
      console.log(`${status.padEnd(12)} ${result.table.padEnd(30)} ${result.count.toString().padStart(8)} records`);
    });

    console.log();
    console.log('='.repeat(80));
    console.log('OVERALL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Tables Checked:     ${TABLES.length}`);
    console.log(`Tables with Data:         ${tablesWithData}`);
    console.log(`Tables without Data:      ${tablesWithoutData}`);
    console.log(`Tables Missing:           ${TABLES.length - results.filter(r => r.exists && !r.error).length}`);
    console.log(`Total Records in System:  ${totalRecords.toLocaleString()}`);
    console.log();

    // Key tables detail
    console.log('='.repeat(80));
    console.log('KEY TABLES DETAIL');
    console.log('='.repeat(80));
    console.log();

    const keyTables = ['users', 'students', 'subjects', 'individual_scores', 'public_announcements'];
    for (const tableName of keyTables) {
      const result = results.find(r => r.table === tableName);
      if (result && result.exists && !result.error) {
        console.log(`📋 ${tableName.toUpperCase()}:`);
        console.log(`   Count: ${result.count}`);
        
        if (result.count > 0 && result.sample.length > 0) {
          console.log(`   Sample data:`);
          result.sample.forEach((row, idx) => {
            const keys = Object.keys(row).slice(0, 5); // Show first 5 columns
            const sampleData = keys.map(key => `${key}: ${row[key]}`).join(', ');
            console.log(`     ${idx + 1}. ${sampleData}${keys.length < Object.keys(row).length ? '...' : ''}`);
          });
        }
        console.log();
      }
    }

    // Students breakdown
    const studentsResult = results.find(r => r.table === 'students');
    if (studentsResult && studentsResult.exists && studentsResult.count > 0) {
      console.log('📚 STUDENTS BREAKDOWN:');
      console.log('-'.repeat(80));
      try {
        const studentsBreakdown = await query(`
          SELECT level, stream, year, COUNT(*) as count 
          FROM students 
          GROUP BY level, stream, year 
          ORDER BY year, level, stream
        `);
        
        if (studentsBreakdown.rows.length > 0) {
          studentsBreakdown.rows.forEach(row => {
            console.log(`   ${row.level} | ${row.stream} | ${row.year}: ${row.count} students`);
          });
        }
      } catch (error) {
        console.log(`   Error getting breakdown: ${error.message}`);
      }
      console.log();
    }

    // Scores breakdown
    const scoresResult = results.find(r => r.table === 'individual_scores');
    if (scoresResult && scoresResult.exists && scoresResult.count > 0) {
      console.log('📊 SCORES BREAKDOWN:');
      console.log('-'.repeat(80));
      try {
        const scoresBreakdown = await query(`
          SELECT level, stream, year, month, COUNT(*) as count 
          FROM individual_scores 
          GROUP BY level, stream, year, month 
          ORDER BY year, level, stream, month
        `);
        
        if (scoresBreakdown.rows.length > 0) {
          scoresBreakdown.rows.forEach(row => {
            console.log(`   ${row.level} | ${row.stream} | ${row.year} | ${row.month}: ${row.count} scores`);
          });
        }
      } catch (error) {
        console.log(`   Error getting breakdown: ${error.message}`);
      }
      console.log();
    }

    // Subjects breakdown
    const subjectsResult = results.find(r => r.table === 'subjects');
    if (subjectsResult && subjectsResult.exists && subjectsResult.count > 0) {
      console.log('📖 SUBJECTS BREAKDOWN:');
      console.log('-'.repeat(80));
      try {
        const subjectsBreakdown = await query(`
          SELECT level, stream, year, COUNT(*) as count 
          FROM subjects 
          GROUP BY level, stream, year 
          ORDER BY year, level, stream
        `);
        
        if (subjectsBreakdown.rows.length > 0) {
          subjectsBreakdown.rows.forEach(row => {
            console.log(`   ${row.level} | ${row.stream} | ${row.year}: ${row.count} subjects`);
          });
        }
      } catch (error) {
        console.log(`   Error getting breakdown: ${error.message}`);
      }
      console.log();
    }

    // Final verdict
    console.log('='.repeat(80));
    if (totalRecords === 0) {
      console.log('⚠️  NO DATA FOUND IN SYSTEM');
      console.log('   The database is empty. You may need to:');
      console.log('   1. Initialize the database: node backend/scripts/initDatabase.js');
      console.log('   2. Create admin user: node backend/scripts/createAdmin.js');
      console.log('   3. Import or add data through the application');
    } else {
      console.log('✅ DATA FOUND IN SYSTEM');
      console.log(`   Total records: ${totalRecords.toLocaleString()}`);
      console.log(`   Tables with data: ${tablesWithData} out of ${TABLES.length}`);
    }
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking data:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkAllData();
