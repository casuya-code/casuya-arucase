/**
 * Migrate scores from SQLite to PostgreSQL
 * Run: node backend/scripts/migrateScoresFromSQLite.js
 */
require('dotenv').config();
const { query } = require('../config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Subject code mapping from SQLite format to PostgreSQL format
const SUBJECT_CODE_MAP = {
  'ENG': '0111',  // ENGLISH LANGUAGE
  'B/K': '0121',  // BIBLE KNOWLEDGE
  'KIS': '0131',  // KISWAHILI
  'B/MAT': '0141', // BASIC MATHEMATICS
  'BUS': '0151',  // BUSINESS STUDIES
  'GEO': '0161',  // GEOGRAPHY
  'HIS': '0171',  // HISTORY
  'BIO': '0181',  // BIOLOGY
  'CHE': '0191',  // CHEMISTRY
  'PHY': '0201',  // PHYSICS
  'CIV': null,    // CIVICS - need to check if this exists
  'COM': null,    // COMPUTER - need to check if this exists
  'HTM': null,    // HOME ECONOMICS - need to check if this exists
};

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

// Get subject code mapping
async function getSubjectCodeMapping(pgQuery) {
  const result = await pgQuery(`
    SELECT subject_code, subject_name 
    FROM subjects 
    WHERE level = 'FORM I' AND year = 2025
  `);
  
  const mapping = {};
  result.rows.forEach(row => {
    const nameUpper = row.subject_name.toUpperCase();
    
    // Map by name patterns
    if (nameUpper.includes('ENGLISH')) mapping['ENG'] = row.subject_code;
    if (nameUpper.includes('BIBLE') || nameUpper.includes('B/K')) mapping['B/K'] = row.subject_code;
    if (nameUpper.includes('KISWAHILI') || nameUpper.includes('KIS')) mapping['KIS'] = row.subject_code;
    if (nameUpper.includes('BASIC MATH') || nameUpper.includes('B/MAT')) mapping['B/MAT'] = row.subject_code;
    if (nameUpper.includes('BUSINESS')) mapping['BUS'] = row.subject_code;
    if (nameUpper.includes('GEOGRAPHY') || nameUpper.includes('GEO')) mapping['GEO'] = row.subject_code;
    if (nameUpper.includes('HISTORY') || nameUpper.includes('HIS')) mapping['HIS'] = row.subject_code;
    if (nameUpper.includes('BIOLOGY') || nameUpper.includes('BIO')) mapping['BIO'] = row.subject_code;
    if (nameUpper.includes('CHEMISTRY') || nameUpper.includes('CHE')) mapping['CHE'] = row.subject_code;
    if (nameUpper.includes('PHYSICS') || nameUpper.includes('PHY')) mapping['PHY'] = row.subject_code;
  });
  
  return mapping;
}

// Get student stream mapping (map students from NA to their actual streams)
async function getStudentStreamMapping(pgQuery) {
  const result = await pgQuery(`
    SELECT adm_no, level, stream, year
    FROM students
    WHERE level = 'FORM I' AND year = 2025
  `);
  
  const mapping = {};
  result.rows.forEach(row => {
    const key = `${row.adm_no}_${row.level}_${row.year}`;
    mapping[key] = row.stream;
  });
  
  return mapping;
}

// Fix sequence for individual_scores table
async function fixIndividualScoresSequence() {
  try {
    console.log('\n🔧 Fixing individual_scores sequence...');
    
    // Get the actual sequence name
    const seqResult = await query(`
      SELECT pg_get_serial_sequence('individual_scores', 'id') as seq_name
    `);
    
    const seqName = seqResult.rows[0]?.seq_name;
    if (!seqName) {
      console.warn('⚠️  Could not find sequence for individual_scores.id');
      return false;
    }
    
    // Get the current max ID
    const maxIdResult = await query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM individual_scores
    `);
    const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
    const nextVal = maxId + 1;
    
    console.log(`   Current max ID: ${maxId}, Setting sequence to: ${nextVal}`);
    
    // Reset the sequence to the max id + 1
    const setValResult = await query(`
      SELECT setval($1::regclass, $2, false) as current_val
    `, [seqName, nextVal]);
    
    console.log(`✅ Sequence ${seqName} fixed: ${setValResult.rows[0]?.current_val}`);
    return true;
  } catch (error) {
    console.error('❌ Error fixing sequence:', error.message);
    // Try alternative method if the first one fails
    try {
      console.log('   Trying alternative sequence fix method...');
      await query(`
        SELECT setval('individual_scores_id_seq', 
          COALESCE((SELECT MAX(id) FROM individual_scores), 0) + 1, 
          false
        )
      `);
      console.log('✅ Alternative sequence fix succeeded');
      return true;
    } catch (altError) {
      console.error('❌ Alternative sequence fix also failed:', altError.message);
      return false;
    }
  }
}

async function migrateScores() {
  let sqliteDb = null;
  
  try {
    console.log('='.repeat(80));
    console.log('MIGRATING SCORES FROM SQLITE TO POSTGRESQL');
    console.log('='.repeat(80));
    console.log();
    
    // Find SQLite database
    const sqlitePath = findSQLiteDatabase();
    if (!sqlitePath) {
      console.error('❌ SQLite database not found!');
      console.log('Searched in:');
      console.log('  - backend/data/school_data.db');
      console.log('  - backend/arucase456copy/data/school_data.db');
      console.log('  - data directory');
      process.exit(1);
    }
    
    console.log(`✅ Found SQLite database: ${sqlitePath}`);
    
    // Open SQLite database
    sqliteDb = await openSQLiteDatabase(sqlitePath);
    console.log('✅ Connected to SQLite database');
    
    // Get subject code mapping from PostgreSQL
    console.log('\n📋 Getting subject code mappings...');
    const subjectMapping = await getSubjectCodeMapping(query);
    console.log('Subject mappings:', subjectMapping);
    
    // Get student stream mapping
    console.log('\n👥 Getting student stream mappings...');
    const studentStreamMapping = await getStudentStreamMapping(query);
    console.log(`Mapped ${Object.keys(studentStreamMapping).length} students`);
    
    // Get all scores from SQLite for FORM I 2025
    console.log('\n📊 Fetching scores from SQLite...');
    const sqliteScores = await querySQLite(sqliteDb, `
      SELECT level, stream, year, month, subject_code, adm_no, score
      FROM individual_scores
      WHERE level = 'FORM I' AND year = 2025
      ORDER BY stream, subject_code, month, adm_no
    `);
    
    console.log(`Found ${sqliteScores.length} scores in SQLite`);
    
    if (sqliteScores.length === 0) {
      console.log('❌ No scores found in SQLite database');
      process.exit(0);
    }
    
    // Group scores by subject code to show statistics
    const subjectStats = {};
    sqliteScores.forEach(score => {
      if (!subjectStats[score.subject_code]) {
        subjectStats[score.subject_code] = {
          count: 0,
          mapped: subjectMapping[score.subject_code] || null
        };
      }
      subjectStats[score.subject_code].count++;
    });
    
    console.log('\n📈 Score statistics by subject:');
    Object.entries(subjectStats).forEach(([code, stats]) => {
      const mapped = stats.mapped ? `→ ${stats.mapped}` : '❌ NO MAPPING';
      console.log(`  ${code}: ${stats.count} scores ${mapped}`);
    });
    
    // Filter scores that can be migrated (have valid subject mapping)
    const migratableScores = sqliteScores.filter(score => {
      return subjectMapping[score.subject_code] !== undefined;
    });
    
    console.log(`\n✅ ${migratableScores.length} scores can be migrated`);
    console.log(`❌ ${sqliteScores.length - migratableScores.length} scores skipped (no subject mapping)`);
    
    if (migratableScores.length === 0) {
      console.log('\n❌ No scores can be migrated. Check subject code mappings.');
      process.exit(1);
    }
    
    // Fix sequence before migration
    await fixIndividualScoresSequence();
    
    // Check existing scores in PostgreSQL
    console.log('\n🔍 Checking existing scores in PostgreSQL...');
    const existingScoresResult = await query(`
      SELECT COUNT(*) as count 
      FROM individual_scores 
      WHERE level = 'FORM I' AND year = 2025
    `);
    const existingCount = parseInt(existingScoresResult.rows[0].count);
    console.log(`Found ${existingCount} existing scores in PostgreSQL`);
    
    if (existingCount > 0) {
      console.log('\n⚠️  WARNING: Scores already exist in PostgreSQL!');
      console.log('This migration will use ON CONFLICT to update existing scores.');
      
      // Show breakdown of existing scores
      const existingBreakdown = await query(`
        SELECT subject_code, COUNT(*) as count 
        FROM individual_scores 
        WHERE level = 'FORM I' AND year = 2025
        GROUP BY subject_code
        ORDER BY subject_code
      `);
      console.log('\nExisting scores by subject:');
      existingBreakdown.rows.forEach(row => {
        console.log(`  ${row.subject_code}: ${row.count} scores`);
      });
    }
    
    // Migrate scores in batches
    console.log('\n🚀 Starting migration...');
    const batchSize = 100;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < migratableScores.length; i += batchSize) {
      const batch = migratableScores.slice(i, i + batchSize);
      
      for (const score of batch) {
        try {
          // Get the mapped subject code
          const mappedSubjectCode = subjectMapping[score.subject_code];
          
          // Determine the stream
          // If stream is 'NA', try to get actual stream from student mapping
          let targetStream = score.stream;
          if (score.stream === 'NA') {
            const studentKey = `${score.adm_no}_FORM I_2025`;
            targetStream = studentStreamMapping[studentKey] || 'NA';
          }
          
          // Normalize level
          const normalizedLevel = score.level.toUpperCase();
          
          // Insert or update score
          await query(`
            INSERT INTO individual_scores 
            (level, stream, year, month, subject_code, adm_no, score)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (level, stream, year, month, subject_code, adm_no)
            DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
          `, [
            normalizedLevel,
            targetStream,
            parseInt(score.year),
            score.month,
            mappedSubjectCode,
            score.adm_no,
            parseFloat(score.score)
          ]);
          
          migrated++;
          
          if (migrated % 100 === 0) {
            process.stdout.write(`\r  Migrated: ${migrated}/${migratableScores.length}...`);
          }
        } catch (error) {
          errors++;
          
          // Handle duplicate key errors (primary key conflict)
          if (error.code === '23505' && error.constraint === 'individual_scores_pkey') {
            // Fix sequence and retry
            console.log(`\n⚠️  Primary key conflict for ${score.adm_no}, fixing sequence and retrying...`);
            await fixIndividualScoresSequence();
            
            try {
              // Retry the insert
              await query(`
                INSERT INTO individual_scores 
                (level, stream, year, month, subject_code, adm_no, score)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (level, stream, year, month, subject_code, adm_no)
                DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
              `, [
                normalizedLevel,
                targetStream,
                parseInt(score.year),
                score.month,
                mappedSubjectCode,
                score.adm_no,
                parseFloat(score.score)
              ]);
              
              migrated++;
              errors--; // Don't count as error since we retried successfully
              console.log(`✅ Retry successful for ${score.adm_no}`);
            } catch (retryError) {
              console.error(`❌ Retry failed for ${score.adm_no}:`, retryError.message);
            }
          } else {
            console.error(`\n❌ Error migrating score for ${score.adm_no} (${score.subject_code}):`, error.message);
            if (error.code) {
              console.error(`   Error code: ${error.code}, Constraint: ${error.constraint || 'N/A'}`);
            }
          }
        }
      }
    }
    
    console.log('\n');
    console.log('='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Successfully migrated: ${migrated} scores`);
    console.log(`⏭️  Skipped (no mapping): ${sqliteScores.length - migratableScores.length} scores`);
    console.log(`❌ Errors: ${errors}`);
    
    // Fix sequence one more time after migration
    console.log('\n🔧 Fixing sequence after migration...');
    await fixIndividualScoresSequence();
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await query(`
      SELECT COUNT(*) as count 
      FROM individual_scores 
      WHERE level = 'FORM I' AND year = 2025
    `);
    const finalCount = parseInt(verifyResult.rows[0].count);
    console.log(`Total scores in PostgreSQL: ${finalCount}`);
    
    // Show breakdown by subject
    const breakdownResult = await query(`
      SELECT subject_code, COUNT(*) as count 
      FROM individual_scores 
      WHERE level = 'FORM I' AND year = 2025
      GROUP BY subject_code
      ORDER BY subject_code
    `);
    
    console.log('\n📊 Scores by subject:');
    breakdownResult.rows.forEach(row => {
      console.log(`  ${row.subject_code}: ${row.count} scores`);
    });
    
    // Show breakdown by stream
    const streamBreakdown = await query(`
      SELECT stream, COUNT(*) as count 
      FROM individual_scores 
      WHERE level = 'FORM I' AND year = 2025
      GROUP BY stream
      ORDER BY stream
    `);
    
    console.log('\n📊 Scores by stream:');
    streamBreakdown.rows.forEach(row => {
      console.log(`  ${row.stream}: ${row.count} scores`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
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

migrateScores();
