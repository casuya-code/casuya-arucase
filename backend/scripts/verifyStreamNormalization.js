/**
 * Verify Stream Normalization
 * Checks that all NA stream values have been converted to A
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function verify() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Verifying Stream Normalization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const tables = [
      'students',
      'student_photos',
      'student_parishes',
      'comments',
      'subjects',
      'subject_teachers',
      'individual_scores',
      'tabia_mwenendo',
      'individual_debt',
      'fees_announcements'
    ];
    
    let totalNA = 0;
    let totalA = 0;
    
    for (const table of tables) {
      try {
        const naResult = await query(
          `SELECT COUNT(*) as count FROM ${table} WHERE stream = 'NA'`
        );
        const aResult = await query(
          `SELECT COUNT(*) as count FROM ${table} WHERE stream = 'A'`
        );
        
        const naCount = parseInt(naResult.rows[0].count);
        const aCount = parseInt(aResult.rows[0].count);
        
        totalNA += naCount;
        totalA += aCount;
        
        if (naCount > 0) {
          console.log(`⚠️  ${table}: ${naCount} records still with stream='NA'`);
        } else {
          console.log(`✅ ${table}: No NA records, ${aCount} records with stream='A'`);
        }
      } catch (error) {
        console.log(`⏭️  ${table}: ${error.message}`);
      }
    }
    
    // Check stream distribution in students
    console.log('\n📊 Stream Distribution in Students:');
    const streamDist = await query(
      `SELECT stream, COUNT(*) as count FROM students GROUP BY stream ORDER BY stream`
    );
    streamDist.rows.forEach(row => {
      console.log(`   ${row.stream}: ${row.count} students`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (totalNA === 0) {
      console.log('✅ All stream values normalized! No NA records found.');
    } else {
      console.log(`⚠️  Found ${totalNA} records still with stream='NA'`);
    }
    console.log(`📈 Total records with stream='A': ${totalA}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verify();
