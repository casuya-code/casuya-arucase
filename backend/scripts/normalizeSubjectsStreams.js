/**
 * Normalize subject stream values: Change 'NA' to 'A' for FORM I-IV subjects
 */
const { query } = require('../config/database');

async function normalizeSubjectsStreams() {
  try {
    console.log('\n🔄 Normalizing subject stream values...\n');
    
    // Check how many subjects need to be updated
    const checkResult = await query(
      `SELECT COUNT(*) as count FROM subjects 
       WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV') 
       AND stream = 'NA'`
    );
    
    const countToUpdate = parseInt(checkResult.rows[0].count);
    console.log(`📊 Found ${countToUpdate} subjects with stream='NA' that need normalization`);
    
    if (countToUpdate === 0) {
      console.log('✅ All subjects are already normalized!');
      process.exit(0);
    }
    
    // Show subjects that will be updated
    const subjectsToUpdate = await query(
      `SELECT level, year, subject_code, subject_name, stream 
       FROM subjects 
       WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV') 
       AND stream = 'NA'
       ORDER BY level, year, subject_code`
    );
    
    console.log('\n📋 Subjects to be updated:');
    console.log('─'.repeat(100));
    subjectsToUpdate.rows.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.subject_name} (${subject.subject_code})`);
      console.log(`   ${subject.level} ${subject.year} - stream: "${subject.stream}" -> "A"`);
    });
    
    // Update subjects: change 'NA' to 'A' for FORM I-IV
    const updateResult = await query(
      `UPDATE subjects 
       SET stream = 'A' 
       WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV') 
       AND stream = 'NA'`
    );
    
    console.log(`\n✅ Updated ${updateResult.rowCount} subjects`);
    
    // Verify the update
    const verifyResult = await query(
      `SELECT COUNT(*) as count FROM subjects 
       WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV') 
       AND stream = 'NA'`
    );
    
    const remainingNA = parseInt(verifyResult.rows[0].count);
    if (remainingNA === 0) {
      console.log('✅ Verification passed: No subjects with stream="NA" remain for FORM I-IV');
    } else {
      console.log(`⚠️  Warning: ${remainingNA} subjects still have stream="NA"`);
    }
    
    // Show summary by level
    const summaryResult = await query(
      `SELECT level, stream, COUNT(*) as count 
       FROM subjects 
       WHERE level IN ('FORM I', 'FORM II', 'FORM III', 'FORM IV')
       GROUP BY level, stream 
       ORDER BY level, stream`
    );
    
    console.log('\n📊 Summary by Level and Stream:');
    console.log('─'.repeat(100));
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.level} - stream "${row.stream}": ${row.count} subjects`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error normalizing subjects:', error);
    process.exit(1);
  }
}

normalizeSubjectsStreams();
