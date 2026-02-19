/**
 * Migration Script: SQLite to PostgreSQL
 * Migrates data from extracted JSON files to PostgreSQL database
 * 
 * Run: node backend/scripts/migrateSQLiteToPostgreSQL.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool } = require('../config/database');

// Path to extracted data folder
const EXTRACTED_DATA_PATH = path.join(__dirname, '../../extracted_data');

// Tables to skip (internal SQLite tables and user_activity)
const SKIP_TABLES = ['sqlite_sequence', 'sqlite_stat1', 'user_activity'];

// Tables that have fixed ID constraints (only one row allowed)
const SINGLE_ROW_TABLES = ['website_settings', 'school_logo', 'school_stamp', 'authority_data'];

// Tables with stream columns that need NA -> A normalization
const STREAM_COLUMNS = ['stream', 'from_stream', 'to_stream', 'current_stream', 'previous_stream'];

// Helper function to convert SQLite data types to PostgreSQL compatible values
function convertValue(value, columnName, columnType) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Normalize stream values: NA -> A
  if (STREAM_COLUMNS.includes(columnName) && typeof value === 'string') {
    if (value.trim().toUpperCase() === 'NA' || value.trim() === 'NA') {
      return 'A';
    }
  }
  
  // Handle dates/timestamps
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle strings that might be dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return value;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    return value;
  }
  
  // Convert everything else to string
  return String(value);
}

// Helper function to build INSERT query for a batch
function buildInsertQuery(tableName, columns, batchSize, startIndex, isSingleRowTable = false) {
  const columnNames = columns.join(', ');
  const placeholders = [];
  const params = [];
  
  for (let i = 0; i < batchSize; i++) {
    const rowPlaceholders = columns.map((_, j) => {
      const paramIndex = i * columns.length + j + 1;
      params.push(`$${startIndex + paramIndex}`);
      return `$${startIndex + paramIndex}`;
    }).join(', ');
    placeholders.push(`(${rowPlaceholders})`);
  }
  
  let query = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders.join(', ')}`;
  
  // For single row tables, use ON CONFLICT DO UPDATE
  if (isSingleRowTable) {
    const updateClause = columns
      .filter(col => col !== 'id')
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
    query += ` ON CONFLICT (id) DO UPDATE SET ${updateClause}`;
  } else {
    // For other tables, skip duplicates
    query += ` ON CONFLICT DO NOTHING`;
  }
  
  return { query, paramCount: params.length };
}

// Migrate a single table
async function migrateTable(tableName) {
  const jsonPath = path.join(EXTRACTED_DATA_PATH, `${tableName}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  JSON file not found for table: ${tableName}`);
    return { success: false, reason: 'File not found' };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  No data found in ${tableName}.json`);
      return { success: true, rows: 0 };
    }
    
    // Get column names from first row
    const columns = Object.keys(data[0]);
    
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    
    if (!tableCheck.rows[0].exists) {
      console.log(`⚠️  Table ${tableName} does not exist in PostgreSQL. Skipping...`);
      return { success: false, reason: 'Table does not exist' };
    }
    
    // Check if table is a single-row table
    const isSingleRowTable = SINGLE_ROW_TABLES.includes(tableName);
    
    // For single-row tables, only keep the first row
    const rowsToInsert = isSingleRowTable ? [data[0]] : data;
    
    if (rowsToInsert.length === 0) {
      return { success: true, rows: 0 };
    }
    
    // Process in batches to avoid query size limits
    const BATCH_SIZE = 100;
    let totalInserted = 0;
    let paramIndex = 1;
    
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      
      // Convert batch data to array of arrays (normalize stream values: NA -> A)
      const batchValues = batch.map(row => 
        columns.map(col => convertValue(row[col], col))
      );
      
      // Flatten values array for PostgreSQL
      const flatValues = batchValues.flat();
      
      // Build query for this batch
      const columnNames = columns.join(', ');
      const placeholders = batch.map((_, rowIdx) => {
        const rowPlaceholders = columns.map((_, colIdx) => {
          return `$${rowIdx * columns.length + colIdx + 1}`;
        }).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');
      
      let insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders}`;
      
      // Handle conflicts
      if (isSingleRowTable) {
        const updateClause = columns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');
        insertQuery += ` ON CONFLICT (id) DO UPDATE SET ${updateClause}`;
      } else {
        insertQuery += ` ON CONFLICT DO NOTHING`;
      }
      
      try {
        const result = await query(insertQuery, flatValues);
        totalInserted += batch.length;
      } catch (batchError) {
        // If batch insert fails, try inserting one by one
        console.log(`   ⚠️  Batch insert failed, trying individual inserts...`);
        for (const row of batch) {
          try {
            const rowValues = columns.map(col => convertValue(row[col], col));
            const rowPlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
            let rowQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${rowPlaceholders})`;
            
            if (isSingleRowTable) {
              const updateClause = columns
                .filter(col => col !== 'id')
                .map(col => `${col} = EXCLUDED.${col}`)
                .join(', ');
              rowQuery += ` ON CONFLICT (id) DO UPDATE SET ${updateClause}`;
            } else {
              rowQuery += ` ON CONFLICT DO NOTHING`;
            }
            
            await query(rowQuery, rowValues);
            totalInserted++;
          } catch (rowError) {
            // Skip rows that fail (likely duplicates or constraint violations)
            if (rowError.code !== '23505') { // Not a duplicate key error
              console.error(`   ⚠️  Failed to insert row: ${rowError.message}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Migrated ${totalInserted} row(s) to ${tableName}`);
    return { success: true, rows: totalInserted };
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
    
    // Try to get more details about the error
    if (error.code === '23505') {
      console.error(`   → Duplicate key violation (some rows may already exist)`);
    } else if (error.code === '23503') {
      console.error(`   → Foreign key violation`);
    } else if (error.code === '23502') {
      console.error(`   → Not null violation`);
    } else if (error.code === '42P01') {
      console.error(`   → Table does not exist`);
    }
    
    return { success: false, error: error.message };
  }
}

// Main migration function
async function migrateAll() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting SQLite to PostgreSQL Migration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test database connection
    await query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Get all JSON files
    const files = fs.readdirSync(EXTRACTED_DATA_PATH)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .filter(table => !SKIP_TABLES.includes(table));
    
    console.log(`Found ${files.length} tables to migrate:\n`);
    
    const results = {
      successful: [],
      failed: [],
      skipped: [],
      totalRows: 0
    };
    
    // Migrate each table
    for (const tableName of files) {
      const result = await migrateTable(tableName);
      
      if (result.success) {
        results.successful.push({ table: tableName, rows: result.rows });
        results.totalRows += result.rows;
      } else if (result.reason === 'File not found' || result.reason === 'Table does not exist') {
        results.skipped.push({ table: tableName, reason: result.reason });
      } else {
        results.failed.push({ table: tableName, error: result.error || result.reason });
      }
    }
    
    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`✅ Successful: ${results.successful.length} tables`);
    if (results.successful.length > 0) {
      results.successful.forEach(({ table, rows }) => {
        console.log(`   - ${table}: ${rows} row(s)`);
      });
    }
    
    console.log(`\n⚠️  Skipped: ${results.skipped.length} tables`);
    if (results.skipped.length > 0) {
      results.skipped.forEach(({ table, reason }) => {
        console.log(`   - ${table}: ${reason}`);
      });
    }
    
    console.log(`\n❌ Failed: ${results.failed.length} tables`);
    if (results.failed.length > 0) {
      results.failed.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
    }
    
    console.log(`\n📈 Total rows migrated: ${results.totalRows}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run migration
migrateAll();
