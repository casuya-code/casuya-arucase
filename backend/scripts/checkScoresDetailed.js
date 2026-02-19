/**
 * Detailed Check of Scores for FORM I, stream A, subject 0181, month November, year 2025
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkScoresDetailed() {
  try {
    console.log('Detailed check of scores...\n');
    
    const level = 'FORM I';
    const stream = 'A';
    const year = 2025;
    const subject_code = '0181';
    const month = 'November';
    
    // Check all possible stream values
    console.log('1. Checking scores with different stream values:');
    
    const streamsToCheck = ['A', 'NA', 'a', 'na'];
    for (const testStream of streamsToCheck) {
      const result = await query(
        "SELECT COUNT(*) as count FROM individual_scores WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 AND month = $5",
        [level, testStream, year, subject_code, month]
      );
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        console.log(`   ✅ Found ${count} scores with stream='${testStream}'`);
        
        // Get sample scores
        const samples = await query(
          "SELECT adm_no, score FROM individual_scores WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 AND month = $5 ORDER BY adm_no LIMIT 5",
          [level, testStream, year, subject_code, month]
        );
        console.log('   Sample scores:');
        samples.rows.forEach(s => {
          console.log(`     ${s.adm_no}: ${s.score}`);
        });
      } else {
        console.log(`   ❌ No scores with stream='${testStream}'`);
      }
    }
    
    // Check what streams actually exist in the database
    console.log('\n2. Checking what stream values exist in individual_scores:');
    const streamDist = await query(
      "SELECT DISTINCT stream, COUNT(*) as count FROM individual_scores WHERE level = $1 AND year = $2 AND subject_code = $3 AND month = $4 GROUP BY stream",
      [level, year, subject_code, month]
    );
    if (streamDist.rows.length > 0) {
      console.log('   Streams found:');
      streamDist.rows.forEach(row => {
        console.log(`     ${row.stream}: ${row.count} scores`);
      });
    } else {
      console.log('   No scores found for this subject/month combination');
    }
    
    // Check if there are scores with different months
    console.log('\n3. Checking scores for this subject in other months:');
    const monthsResult = await query(
      "SELECT DISTINCT month, stream, COUNT(*) as count FROM individual_scores WHERE level = $1 AND year = $2 AND subject_code = $3 GROUP BY month, stream ORDER BY month",
      [level, year, subject_code]
    );
    if (monthsResult.rows.length > 0) {
      console.log('   Months and streams found:');
      monthsResult.rows.forEach(row => {
        console.log(`     ${row.month} (stream: ${row.stream}): ${row.count} scores`);
      });
    } else {
      console.log('   No scores found for this subject');
    }
    
    // Check total scores for this subject regardless of stream
    console.log('\n4. Total scores for subject 0181, FORM I, year 2025:');
    const totalResult = await query(
      "SELECT COUNT(*) as count FROM individual_scores WHERE level = $1 AND year = $2 AND subject_code = $3",
      [level, year, subject_code]
    );
    console.log(`   Total: ${totalResult.rows[0].count} scores`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkScoresDetailed();
