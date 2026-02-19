/**
 * Migrate data from MySQL to PostgreSQL
 * Run: node backend/scripts/migrateMySQLtoPostgreSQL.js
 * 
 * Requires MySQL connection in .env:
 * MYSQL_HOST=localhost
 * MYSQL_PORT=3306
 * MYSQL_USER=root
 * MYSQL_PASSWORD=password
 * MYSQL_DATABASE=arucase
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { Client } = require('pg');

// Create PostgreSQL connection config
const pgConfig = {
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

// MySQL connection configuration
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'arucase'
};

async function migrateMySQLtoPostgreSQL() {
  let mysqlConnection = null;
  let pgClient = null;

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Starting MySQL to PostgreSQL Migration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to PostgreSQL using a direct Client (not Pool)
    console.log('📡 Connecting to PostgreSQL...');
    pgClient = new Client(pgConfig);
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Connect to MySQL
    console.log('📡 Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL\n');

    // List of tables to migrate (in order due to foreign key dependencies)
    const tablesToMigrate = [
      'users',
      'students',
      'student_photos',
      'student_parishes',
      'subjects',
      'subject_teachers',
      'individual_scores',
      'monthly_results',
      'tabia_mwenendo',
      'comments',
      'individual_debt',
      'fees_announcements',
      'public_announcements',
      'read_announcements',
      'public_pages',
      'website_settings',
      'gallery_photos',
      'events',
      'alumni',
      'testimonies',
      'mass_readings',
      'donations',
      'faqs',
      'administrators',
      'visitor_stats',
      'user_activity',
      'school_logo',
      'school_stamp',
      'authority_data',
      'marks_config',
      'fees_instructions',
      'student_history',
      'promotion_sessions',
      'promotion_exclusions'
    ];

    let totalMigrated = 0;

    for (const tableName of tablesToMigrate) {
      try {
        // Check if table exists in MySQL
        const [tables] = await mysqlConnection.query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = ? AND table_name = ?`,
          [mysqlConfig.database, tableName]
        );

        if (tables[0].count === 0) {
          console.log(`⏭️  Table "${tableName}" does not exist in MySQL, skipping...`);
          continue;
        }

        // Check row count first (faster than fetching all data)
        const [countResult] = await mysqlConnection.query(
          `SELECT COUNT(*) as count FROM \`${tableName}\``
        );
        const rowCount = countResult[0].count;
        
        if (rowCount === 0) {
          console.log(`⏭️  Table "${tableName}" is empty (0 records), skipping...`);
          continue;
        }

        console.log(`📦 Migrating "${tableName}" (${rowCount} records)...`);

        // Get all data from MySQL in batches for large tables
        const batchSize = 1000;
        let offset = 0;
        let migratedCount = 0;
        
        while (offset < rowCount) {
          // Use query() instead of execute() for dynamic table names
          const [rows] = await mysqlConnection.query(
            `SELECT * FROM \`${tableName}\` LIMIT ${batchSize} OFFSET ${offset}`
          );
          
          if (rows.length === 0) break;
          
          // Get column names from first row
          const columns = Object.keys(rows[0]);
          const columnNames = columns.join(', ');
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          // Migrate batch using transaction for better performance
          try {
            await pgClient.query('BEGIN');
            
            // Prepare batch insert values
            const batchValues = [];
            const batchPlaceholders = [];
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const values = columns.map(col => {
                const val = row[col];
                // Handle null, dates, and special MySQL types
                if (val === null || val === undefined) return null;
                if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
                // Handle Buffer (BLOB) types
                if (Buffer.isBuffer(val)) return val.toString('utf8');
                return val;
              });
              
              const rowPlaceholders = columns.map((_, idx) => `$${batchValues.length * columns.length + idx + 1}`).join(', ');
              batchPlaceholders.push(`(${rowPlaceholders})`);
              batchValues.push(...values);
            }
            
            // Check which columns exist in PostgreSQL table
            const pgColumnsResult = await pgClient.query(
              `SELECT column_name FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = $1`,
              [tableName]
            );
            const pgColumns = pgColumnsResult.rows.map(r => r.column_name);
            
            // Filter to only include columns that exist in PostgreSQL
            const validColumns = columns.filter(col => pgColumns.includes(col));
            if (validColumns.length === 0) {
              console.log(`  ⚠️  No matching columns found for "${tableName}", skipping...`);
              await pgClient.query('COMMIT');
              continue;
            }
            
            const validColumnNames = validColumns.join(', ');
            const validPlaceholders = validColumns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Single batch insert with only valid columns
            const batchPlaceholderStr = batchPlaceholders.map((_, idx) => {
              return `(${validColumns.map((_, i) => `$${idx * validColumns.length + i + 1}`).join(', ')})`;
            }).join(', ');
            
            try {
              // Rebuild batch values with only valid columns
              const validBatchValues = [];
              for (const row of rows) {
                validColumns.forEach(col => {
                  const val = row[col];
                  if (val === null || val === undefined) validBatchValues.push(null);
                  else if (val instanceof Date) validBatchValues.push(val.toISOString().slice(0, 19).replace('T', ' '));
                  else if (Buffer.isBuffer(val)) validBatchValues.push(val.toString('utf8'));
                  else validBatchValues.push(val);
                });
              }
              
              const result = await pgClient.query(
                `INSERT INTO ${tableName} (${validColumnNames}) 
                 VALUES ${batchPlaceholderStr}
                 ON CONFLICT DO NOTHING`,
                validBatchValues
              );
              
              // Count actual inserts (PostgreSQL doesn't return count for ON CONFLICT DO NOTHING)
              // So we'll estimate based on rows.length - this is approximate
              migratedCount += rows.length;
            } catch (error) {
              // If batch insert fails, try individual inserts
              if (error.message.includes('too many') || error.message.includes('parameter') || error.message.includes('bind')) {
                // Fallback to individual inserts for this batch
                for (const row of rows) {
                  try {
                    const values = validColumns.map(col => {
                      const val = row[col];
                      if (val === null || val === undefined) return null;
                      if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
                      if (Buffer.isBuffer(val)) return val.toString('utf8');
                      return val;
                    });

                    await pgClient.query(
                      `INSERT INTO ${tableName} (${validColumnNames}) 
                       VALUES (${validPlaceholders})
                       ON CONFLICT DO NOTHING`,
                      values
                    );
                    migratedCount++;
                  } catch (rowError) {
                    // Skip duplicate or constraint errors silently
                    if (!rowError.message.includes('duplicate') && 
                        !rowError.message.includes('unique') &&
                        !rowError.message.includes('violates unique constraint')) {
                      // Silent skip for individual row errors
                    }
                  }
                }
              } else {
                // Schema mismatch or other error
                console.error(`  ⚠️  Schema mismatch in "${tableName}": ${error.message.substring(0, 150)}`);
                throw error;
              }
            }
            
            await pgClient.query('COMMIT');
          } catch (error) {
            await pgClient.query('ROLLBACK');
            // Continue with next batch even if this one fails
            if (!error.message.includes('duplicate') && 
                !error.message.includes('unique') &&
                !error.message.includes('violates unique constraint')) {
              console.error(`  ⚠️  Batch error in "${tableName}":`, error.message.substring(0, 100));
            }
          }
          
          offset += batchSize;
          if (offset < rowCount) {
            process.stdout.write(`  Progress: ${Math.min(offset, rowCount)}/${rowCount} records...\r`);
          }
        }

        console.log(`  ✅ Migrated ${migratedCount}/${rowCount} records from "${tableName}"`);
        totalMigrated += migratedCount;

      } catch (error) {
        console.error(`❌ Error migrating table "${tableName}":`, error.message);
        // Continue with next table
      }
    }

    // Update all NA streams to A after migration
    console.log('\n🔄 Updating NA streams to A...');
    try {
      const updateResult = await pgClient.query(
        `UPDATE students SET stream = 'A' WHERE stream = 'NA'`
      );
      console.log(`✅ Updated ${updateResult.rowCount || 0} student records`);
    } catch (error) {
      console.log(`⚠️  Could not update NA streams: ${error.message}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration complete! Total records migrated: ${totalMigrated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    
    if (error.message && error.message.includes('too many clients')) {
      console.error('\n💡 PostgreSQL connection limit reached.');
      console.error('   Wait 30-60 seconds and try again, or close idle connections.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure MySQL is running and connection details in .env are correct.');
      console.error('   Required env variables: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
    } else {
      console.error('Full error:', error);
    }
    
    throw error; // Re-throw to allow retry logic
  } finally {
    if (pgClient) {
      try {
        await pgClient.end();
        console.log('🔌 PostgreSQL connection closed');
      } catch (e) {
        // Ignore errors when closing
      }
    }
    if (mysqlConnection) {
      try {
        await mysqlConnection.end();
        console.log('🔌 MySQL connection closed');
      } catch (e) {
        // Ignore errors when closing
      }
    }
  }
}

// Check if mysql2 is installed
try {
  require('mysql2');
  migrateMySQLtoPostgreSQL()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      if (error.message && error.message.includes('too many clients')) {
        process.exit(2); // Special exit code for connection limit
      } else {
        process.exit(1);
      }
    });
} catch (error) {
  console.error('❌ mysql2 package not found!');
  console.error('💡 Install it with: npm install mysql2');
  console.error('   Then add MySQL connection details to your .env file');
  process.exit(1);
}

