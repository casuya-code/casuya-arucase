/**
 * Restore students with admission numbers 1800-2000 from SQLite database
 * Run: node backend/scripts/restoreStudentsFromSQLite.js
 */
require('dotenv').config();
const { query } = require('../config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Find SQLite database file
function findSQLiteDatabase() {
  const possiblePaths = [
    path.join(__dirname, '../../data/school_data.db'),
    path.join(__dirname, '../../arucase456copy/data/school_data.db'),
    path.join(__dirname, '../../../arucase456copy/data/school_data.db'),
    path.join(__dirname, '../../school_data.db'),
  ];
  
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }
  
  // Try to find any .db file in data directory
  const dataDir = path.join(__dirname, '../../data');
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    const dbFile = files.find(f => f.endsWith('.db'));
    if (dbFile) {
      return path.join(dataDir, dbFile);
    }
  }
  
  return null;
}

// Open SQLite database
function openSQLiteDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Query SQLite database
function querySQLite(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function restoreStudentsFromSQLite() {
  let sqliteDb = null;
  
  try {
    console.log('='.repeat(80));
    console.log('RESTORING STUDENTS WITH ADMISSION NUMBERS 1800-2000 FROM SQLITE');
    console.log('='.repeat(80));
    console.log();
    
    const minAdm = 1800;
    const maxAdm = 2000;
    
    // Find SQLite database
    const sqlitePath = findSQLiteDatabase();
    if (!sqlitePath) {
      console.error('❌ SQLite database not found!');
      console.log('Cannot restore students - SQLite database is required.');
      console.log('The students may have been permanently deleted.');
      process.exit(1);
    }
    
    console.log(`✅ Found SQLite database: ${sqlitePath}`);
    
    // Open SQLite database
    sqliteDb = await openSQLiteDatabase(sqlitePath);
    console.log('✅ Connected to SQLite database');
    
    // Check if students table exists in SQLite
    const tableCheck = await querySQLite(sqliteDb, `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='students'
    `);
    
    if (tableCheck.length === 0) {
      console.error('❌ Students table not found in SQLite database!');
      process.exit(1);
    }
    
    // Get students from SQLite in the range 1800-2000
    console.log(`\n📊 Fetching students with admission numbers ${minAdm}-${maxAdm} from SQLite...`);
    
    // SQLite doesn't support regex, so we'll filter numeric adm_no values
    // First get all students, then filter in JavaScript
    const allStudents = await querySQLite(sqliteDb, `
      SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, status
      FROM students
      ORDER BY adm_no
    `);
    
    // Filter students with numeric adm_no in range 1800-2000
    const sqliteStudents = allStudents.filter(student => {
      const admNo = parseInt(student.adm_no);
      return !isNaN(admNo) && admNo >= minAdm && admNo <= maxAdm;
    });
    
    if (sqliteStudents.length === 0) {
      console.log(`❌ No students found in SQLite database with admission numbers ${minAdm}-${maxAdm}`);
      console.log('Cannot restore - students do not exist in SQLite database.');
      process.exit(0);
    }
    
    console.log(`Found ${sqliteStudents.length} students in SQLite database`);
    console.log('\nSample students to restore:');
    sqliteStudents.slice(0, 10).forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.adm_no} - ${row.first_name} ${row.surname} (${row.level} ${row.stream} ${row.year})`);
    });
    if (sqliteStudents.length > 10) {
      console.log(`  ... and ${sqliteStudents.length - 10} more`);
    }
    
    // Check if students already exist in PostgreSQL
    console.log('\n🔍 Checking existing students in PostgreSQL...');
    const existingCheck = await query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    
    const existingCount = parseInt(existingCheck.rows[0].count);
    console.log(`Found ${existingCount} existing students in PostgreSQL`);
    
    if (existingCount > 0) {
      console.log('\n⚠️  WARNING: Some students already exist in PostgreSQL!');
      console.log('This will use INSERT ... ON CONFLICT to update existing records.');
    }
    
    // Fix sequence before restoration
    console.log('\n🔧 Fixing students sequence...');
    try {
      const seqResult = await query(`
        SELECT pg_get_serial_sequence('students', 'id') as seq_name
      `);
      const seqName = seqResult.rows[0]?.seq_name;
      if (seqName) {
        const maxIdResult = await query(`SELECT COALESCE(MAX(id), 0) as max_id FROM students`);
        const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
        await query(`SELECT setval($1::regclass, $2, false)`, [seqName, maxId + 1]);
        console.log(`✅ Sequence fixed: ${maxId + 1}`);
      }
    } catch (seqError) {
      console.warn('⚠️  Could not fix sequence:', seqError.message);
    }
    
    // Restore students
    console.log('\n🚀 Starting restoration...');
    let restored = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const student of sqliteStudents) {
      try {
        // Check if student already exists
        const existingStudent = await query(`
          SELECT id FROM students 
          WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4
        `, [
          student.adm_no,
          student.level.toUpperCase(),
          student.stream,
          parseInt(student.year)
        ]);
        
        if (existingStudent.rows.length > 0) {
          // Update existing student
          await query(`
            UPDATE students SET 
              first_name = $1,
              middle_name = $2,
              surname = $3,
              sex = $4,
              status = $5
            WHERE adm_no = $6 AND level = $7 AND stream = $8 AND year = $9
          `, [
            student.first_name,
            student.middle_name || null,
            student.surname,
            student.sex,
            student.status || 'PENDING',
            student.adm_no,
            student.level.toUpperCase(),
            student.stream,
            parseInt(student.year)
          ]);
          updated++;
        } else {
          // Insert new student - use INSERT with ON CONFLICT to handle any edge cases
          try {
            await query(`
              INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              student.adm_no,
              student.first_name,
              student.middle_name || null,
              student.surname,
              student.sex,
              student.level.toUpperCase(),
              student.stream,
              parseInt(student.year),
              student.status || 'PENDING'
            ]);
            restored++;
          } catch (insertError) {
            // If primary key conflict, fix sequence and retry
            if (insertError.code === '23505' && insertError.constraint === 'students_pkey') {
              try {
                const seqResult = await query(`SELECT pg_get_serial_sequence('students', 'id') as seq_name`);
                const seqName = seqResult.rows[0]?.seq_name;
                if (seqName) {
                  const maxIdResult = await query(`SELECT COALESCE(MAX(id), 0) as max_id FROM students`);
                  const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
                  await query(`SELECT setval($1::regclass, $2, false)`, [seqName, maxId + 1]);
                  
                  // Retry insert
                  await query(`
                    INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  `, [
                    student.adm_no,
                    student.first_name,
                    student.middle_name || null,
                    student.surname,
                    student.sex,
                    student.level.toUpperCase(),
                    student.stream,
                    parseInt(student.year),
                    student.status || 'PENDING'
                  ]);
                  restored++;
                } else {
                  skipped++;
                }
              } catch (retryError) {
                skipped++;
              }
            } else if (insertError.code === '23505') {
              // Unique constraint violation (adm_no, level, stream, year) - student already exists
              skipped++;
            } else {
              throw insertError;
            }
          }
        }
        
        if ((restored + updated + skipped) % 50 === 0) {
          process.stdout.write(`\r  Processed: ${restored + updated + skipped}/${sqliteStudents.length}...`);
        }
      } catch (error) {
        errors++;
        if (error.code !== '23505') {
          console.error(`\n❌ Error restoring student ${student.adm_no}:`, error.message);
        } else {
          skipped++;
        }
      }
    }
    
    console.log('\n');
    console.log('='.repeat(80));
    console.log('RESTORATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Restored: ${restored} students (new)`);
    console.log(`🔄 Updated: ${updated} students (existing)`);
    console.log(`⏭️  Skipped: ${skipped} students (duplicates)`);
    console.log(`❌ Errors: ${errors}`);
    
    // Verify restoration
    console.log('\n🔍 Verifying restoration...');
    const verifyResult = await query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    
    const finalCount = parseInt(verifyResult.rows[0].count);
    console.log(`Total students in range ${minAdm}-${maxAdm}: ${finalCount}`);
    
    if (finalCount === sqliteStudents.length) {
      console.log('\n✅ All students successfully restored!');
    } else {
      console.log(`\n⚠️  Warning: Expected ${sqliteStudents.length} students, but found ${finalCount}`);
    }
    
    console.log('\n📝 Note: Related data (scores, parishes, photos) were not restored.');
    console.log('You may need to re-enter this data or restore from backups.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Restoration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err);
        }
      });
    }
  }
}

restoreStudentsFromSQLite();
