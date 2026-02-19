/**
 * Normalize all comments: Update stream='NA' to stream='A'
 * Run: node backend/scripts/normalizeCommentsStreams.js
 */

require('dotenv').config();
const { query, pool } = require('../config/database');

async function normalizeCommentsStreams() {
  try {
    console.log('='.repeat(80));
    console.log('NORMALIZING COMMENTS STREAMS: NA -> A');
    console.log('='.repeat(80));
    console.log();

    // First, check how many comments have stream='NA'
    const naCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM comments 
      WHERE stream = 'NA'
    `);
    const naCount = parseInt(naCountResult.rows[0].count);
    
    console.log(`📊 Found ${naCount} comments with stream='NA'\n`);

    if (naCount === 0) {
      console.log('✅ All comments already normalized. No changes needed.\n');
      return;
    }

    // Check for potential conflicts (where both NA and A versions exist)
    // The unique constraint is on (comment_type, level, stream, year, term, student_index)
    console.log('🔍 Checking for potential conflicts...\n');
    
    const conflictsResult = await query(`
      SELECT 
        c1.comment_type,
        c1.level,
        c1.year,
        c1.term,
        c1.student_index
      FROM comments c1
      WHERE c1.stream = 'NA'
        AND EXISTS (
          SELECT 1 
          FROM comments c2 
          WHERE c2.comment_type = c1.comment_type
            AND c2.level = c1.level
            AND c2.stream = 'A'
            AND c2.year = c1.year
            AND c2.term = c1.term
            AND c2.student_index = c1.student_index
        )
    `);

    const conflictCount = conflictsResult.rows.length;
    
    if (conflictCount > 0) {
      console.log(`⚠️  Found ${conflictCount} potential conflicts (both NA and A versions exist)`);
      console.log('   Strategy: Will keep A version and delete NA version\n');
      
      // Delete conflicting NA entries (keep A versions)
      const deleteResult = await query(`
        DELETE FROM comments
        WHERE stream = 'NA'
          AND (comment_type, level, year, term, student_index) IN (
            SELECT comment_type, level, year, term, student_index
            FROM comments
            WHERE stream = 'A'
          )
      `);
      
      const deletedCount = deleteResult.rowCount || 0;
      console.log(`✅ Deleted ${deletedCount} conflicting NA entries (kept A versions)\n`);
    } else {
      console.log('✅ No conflicts found. Safe to proceed with normalization.\n');
    }

    // Update remaining NA entries to A
    console.log('🔄 Updating stream from NA to A...\n');
    
    const updateResult = await query(`
      UPDATE comments
      SET stream = 'A'
      WHERE stream = 'NA'
    `);

    const updatedCount = updateResult.rowCount || 0;
    
    console.log(`✅ Updated ${updatedCount} comments from stream='NA' to stream='A'\n`);

    // Verify the update
    console.log('🔍 Verifying normalization...\n');
    
    const remainingNAResult = await query(`
      SELECT COUNT(*) as count 
      FROM comments 
      WHERE stream = 'NA'
    `);
    const remainingNA = parseInt(remainingNAResult.rows[0].count);

    const aCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM comments 
      WHERE stream = 'A'
    `);
    const aCount = parseInt(aCountResult.rows[0].count);

    console.log('📊 Final Statistics:');
    console.log(`   Comments with stream='NA': ${remainingNA}`);
    console.log(`   Comments with stream='A': ${aCount}`);
    console.log();

    if (remainingNA === 0) {
      console.log('✅ SUCCESS: All comments normalized!\n');
    } else {
      console.log(`⚠️  WARNING: ${remainingNA} comments still have stream='NA'\n`);
    }

    // Show breakdown by comment type
    console.log('📊 Breakdown by Comment Type (stream=A):');
    console.log('-'.repeat(80));
    
    const breakdownResult = await query(`
      SELECT 
        comment_type,
        COUNT(*) as count
      FROM comments
      WHERE stream = 'A'
      GROUP BY comment_type
      ORDER BY comment_type
    `);

    breakdownResult.rows.forEach(row => {
      console.log(`   ${row.comment_type}: ${row.count} comments`);
    });
    console.log();

    // Show breakdown by level
    console.log('📊 Breakdown by Level (stream=A):');
    console.log('-'.repeat(80));
    
    const levelBreakdownResult = await query(`
      SELECT 
        level,
        COUNT(*) as count
      FROM comments
      WHERE stream = 'A'
      GROUP BY level
      ORDER BY 
        CASE level
          WHEN 'FORM I' THEN 1
          WHEN 'FORM II' THEN 2
          WHEN 'FORM III' THEN 3
          WHEN 'FORM IV' THEN 4
          WHEN 'FORM V' THEN 5
          WHEN 'FORM VI' THEN 6
          ELSE 7
        END
    `);

    levelBreakdownResult.rows.forEach(row => {
      console.log(`   ${row.level}: ${row.count} comments`);
    });
    console.log();

    console.log('='.repeat(80));
    console.log('NORMALIZATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

normalizeCommentsStreams();
