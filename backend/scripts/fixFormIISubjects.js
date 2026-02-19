/**
 * Fix FORM II subjects to match what's actually in the scores table
 * Scores use abbreviations as subject codes: B/K, BIO, CHE, CIV, ENG, GEO, HIS, KIS, MAT, PHY
 */
const { query } = require('../config/database');

// FORM II subjects based on actual scores data (10 subjects)
const formIISubjects = [
  { code: 'B/K', name: 'BIBLE KNOWLEDGE', abbreviation: 'B/K' },
  { code: 'BIO', name: 'BIOLOGY', abbreviation: 'BIO' },
  { code: 'CHE', name: 'CHEMISTRY', abbreviation: 'CHE' },
  { code: 'CIV', name: 'CIVICS', abbreviation: 'CIV' },
  { code: 'ENG', name: 'ENGLISH LANGUAGE', abbreviation: 'ENG' },
  { code: 'GEO', name: 'GEOGRAPHY', abbreviation: 'GEO' },
  { code: 'HIS', name: 'HISTORY', abbreviation: 'HIS' },
  { code: 'KIS', name: 'KISWAHILI', abbreviation: 'KIS' },
  { code: 'MAT', name: 'MATHEMATICS', abbreviation: 'MAT' },
  { code: 'PHY', name: 'PHYSICS', abbreviation: 'PHY' },
];

async function fixFormIISubjects() {
  try {
    console.log('\n🔧 Fixing FORM II subjects to match scores data...\n');
    
    const level = 'FORM II';
    const stream = 'A';
    const year = 2025;
    
    // First, delete all existing FORM II 2025 subjects
    const deleteResult = await query(
      `DELETE FROM subjects WHERE level = $1 AND year = $2`,
      [level, year]
    );
    console.log(`🗑️  Deleted ${deleteResult.rowCount} existing FORM II 2025 subjects\n`);
    
    // Now add the correct subjects based on scores
    let added = 0;
    let errors = 0;
    
    for (const subject of formIISubjects) {
      try {
        await query(
          `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [level, stream, year, subject.code, subject.name, subject.abbreviation]
        );
        
        console.log(`✅ Added: ${subject.code} - ${subject.name} (${subject.abbreviation})`);
        added++;
      } catch (error) {
        console.error(`❌ Error adding ${subject.code} - ${subject.name}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Added: ${added} subjects`);
    console.log(`   ❌ Errors: ${errors} subjects`);
    
    // Verify final count
    const finalCheck = await query(
      `SELECT COUNT(*) as count FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3`,
      [level, stream, year]
    );
    
    console.log(`\n📈 Total FORM II 2025 subjects: ${finalCheck.rows[0].count}`);
    
    // List all subjects
    const allSubjects = await query(
      `SELECT subject_code, subject_name, subject_abbreviation 
       FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3
       ORDER BY subject_code`,
      [level, stream, year]
    );
    
    console.log(`\n📋 FORM II 2025 subjects:`);
    allSubjects.rows.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.subject_code} - ${s.subject_name} (${s.subject_abbreviation})`);
    });
    
    if (finalCheck.rows[0].count === 10) {
      console.log(`\n✅ FORM II 2025 now has exactly 10 subjects matching the scores data!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixFormIISubjects();
