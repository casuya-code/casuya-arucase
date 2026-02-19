/**
 * Add missing FORM II subjects for 2025
 * Based on FORM I subjects but adjusted for FORM II
 */
const { query } = require('../config/database');

// Standard FORM II subjects (based on FORM I pattern)
// Subject codes: FORM I uses 01xx, FORM II uses 02xx pattern
// Existing: 0241 (MATHEMATICS), 0251 (CIVICS)
const formIISubjects = [
  { code: '0221', name: 'ENGLISH LANGUAGE', abbreviation: 'ENG' },
  { code: '0222', name: 'BIBLE KNOWLEDGE', abbreviation: 'B/K' },
  { code: '0223', name: 'KISWAHILI', abbreviation: 'KIS' },
  { code: '0241', name: 'MATHEMATICS', abbreviation: 'MAT' }, // Already exists
  { code: '0225', name: 'BUSINESS STUDIES', abbreviation: 'BUS' },
  { code: '0226', name: 'GEOGRAPHY', abbreviation: 'GEO' },
  { code: '0227', name: 'HISTORY', abbreviation: 'HIS' },
  { code: '0228', name: 'BIOLOGY', abbreviation: 'BIO' },
  { code: '0229', name: 'CHEMISTRY', abbreviation: 'CHE' },
  { code: '0230', name: 'PHYSICS', abbreviation: 'PHY' },
  { code: '0251', name: 'CIVICS', abbreviation: 'CIV' }, // Already exists
];

async function addFormIISubjects() {
  try {
    console.log('\n➕ Adding FORM II subjects for 2025...\n');
    
    const level = 'FORM II';
    const stream = 'A';
    const year = 2025;
    
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const subject of formIISubjects) {
      try {
        // Check if subject already exists
        const existing = await query(
          `SELECT * FROM subjects 
           WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4`,
          [level, stream, year, subject.code]
        );
        
        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipped: ${subject.code} - ${subject.name} (already exists)`);
          skipped++;
          continue;
        }
        
        // Insert subject
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
    console.log(`   ⏭️  Skipped: ${skipped} subjects`);
    console.log(`   ❌ Errors: ${errors} subjects`);
    
    // Verify final count
    const finalCheck = await query(
      `SELECT COUNT(*) as count FROM subjects 
       WHERE level = $1 AND stream = $2 AND year = $3`,
      [level, stream, year]
    );
    
    console.log(`\n📈 Total FORM II 2025 subjects: ${finalCheck.rows[0].count}`);
    
    if (finalCheck.rows[0].count < 10) {
      console.log(`\n⚠️  Still missing ${10 - finalCheck.rows[0].count} subjects.`);
      console.log('   Please verify the subject codes and add manually if needed.');
    } else {
      console.log(`\n✅ FORM II 2025 now has ${finalCheck.rows[0].count} subjects!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addFormIISubjects();
