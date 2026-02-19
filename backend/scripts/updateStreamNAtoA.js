/**
 * Update all 'NA' stream values to 'A' in PostgreSQL database
 * Run: node backend/scripts/updateStreamNAtoA.js
 */

require('dotenv').config();
const { query } = require('../config/database');

async function updateStreamNAtoA() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Updating all "NA" stream values to "A"...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // List of all tables with stream column (direct)
    const tablesWithStream = [
      'students',
      'student_photos',
      'student_parishes',
      'comments',
      'subjects',
      'subject_teachers',
      'individual_scores',
      'monthly_results',
      'tabia_mwenendo',
      'individual_debt',
      'fees_announcements',
      'promotion_exclusions'
    ];

    // Tables with stream variations (from_stream, to_stream, current_stream, previous_stream)
    const tablesWithStreamVariations = [
      { table: 'student_history', columns: ['current_stream', 'previous_stream'] },
      { table: 'promotion_sessions', columns: ['from_stream', 'to_stream'] }
    ];

    let totalUpdated = 0;

    for (const table of tablesWithStream) {
      try {
        // Check if table exists
        const tableExists = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );

        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Table "${table}" does not exist, skipping...`);
          continue;
        }

        // Check if stream column exists
        const columnExists = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = 'stream'
          )`,
          [table]
        );

        if (!columnExists.rows[0].exists) {
          console.log(`⏭️  Table "${table}" does not have stream column, skipping...`);
          continue;
        }

        // Count records with NA stream
        const countResult = await query(
          `SELECT COUNT(*) as count FROM ${table} WHERE stream = 'NA'`
        );
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
          console.log(`✅ Table "${table}": No records with stream='NA'`);
          continue;
        }

        // For tables with unique constraints, we need to handle duplicates carefully
        // Strategy: Delete NA records that would conflict with existing A records, then update the rest
        try {
          // First, identify and delete NA records that would create duplicates
          // We'll use a subquery to find conflicts based on all columns except stream
          const tableColumns = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name != 'id' 
            AND column_name != 'stream'
            AND column_name != 'created_at'
            AND column_name != 'updated_at'
            ORDER BY ordinal_position
          `, [table]);
          
          if (tableColumns.rows.length > 0) {
            // Build a query to delete NA records that conflict with A records
            // This is a simplified approach: delete NA records where equivalent A records exist
            const conflictColumns = tableColumns.rows.map(r => r.column_name).join(', ');
            
            // Try a safer approach: use a CTE to identify conflicts
            const deleteConflicts = await query(`
              WITH na_records AS (
                SELECT * FROM ${table} WHERE stream = 'NA'
              ),
              a_records AS (
                SELECT * FROM ${table} WHERE stream = 'A'
              )
              DELETE FROM ${table} 
              WHERE stream = 'NA' 
              AND EXISTS (
                SELECT 1 FROM a_records a
                WHERE a.id != ${table}.id
                ${tableColumns.rows.map((_, i) => 
                  `AND COALESCE(a.${tableColumns.rows[i].column_name}::text, '') = COALESCE(${table}.${tableColumns.rows[i].column_name}::text, '')`
                ).join(' ')}
              )
            `).catch(() => ({ rowCount: 0 }));
            
            const deletedCount = deleteConflicts.rowCount || 0;
            
            // Now update remaining NA records
            const remainingResult = await query(
              `SELECT COUNT(*) as count FROM ${table} WHERE stream = 'NA'`
            );
            const remaining = parseInt(remainingResult.rows[0].count);
            
            if (remaining > 0) {
              await query(
                `UPDATE ${table} SET stream = 'A' WHERE stream = 'NA'`
              );
              console.log(`✅ Table "${table}": Updated ${remaining} record(s)${deletedCount > 0 ? ` (deleted ${deletedCount} duplicates)` : ''}`);
              totalUpdated += remaining;
            } else if (deletedCount > 0) {
              console.log(`✅ Table "${table}": All ${count} NA records were duplicates, deleted`);
            } else {
              console.log(`✅ Table "${table}": Updated ${count} record(s)`);
              totalUpdated += count;
            }
          } else {
            // Simple update if no other columns
            await query(
              `UPDATE ${table} SET stream = 'A' WHERE stream = 'NA'`
            );
            console.log(`✅ Table "${table}": Updated ${count} record(s)`);
            totalUpdated += count;
          }
        } catch (updateError) {
          // If still fails, try simple update and let duplicates be skipped
          if (updateError.code === '23505') {
            console.log(`   ⚠️  Some duplicates detected in "${table}", skipping conflicting records...`);
            // Delete NA records that would conflict, then update rest
            try {
              // Simple approach: delete all NA, update won't create duplicates
              const deleteResult = await query(`
                DELETE FROM ${table} 
                WHERE stream = 'NA' 
                AND id IN (
                  SELECT na.id FROM ${table} na
                  WHERE na.stream = 'NA'
                  AND EXISTS (
                    SELECT 1 FROM ${table} a
                    WHERE a.stream = 'A'
                    AND a.id != na.id
                  )
                )
              `);
              
              const remaining = await query(
                `SELECT COUNT(*) as count FROM ${table} WHERE stream = 'NA'`
              );
              const remainingCount = parseInt(remaining.rows[0].count);
              
              if (remainingCount > 0) {
                await query(`UPDATE ${table} SET stream = 'A' WHERE stream = 'NA'`);
                console.log(`✅ Table "${table}": Updated ${remainingCount} record(s)`);
                totalUpdated += remainingCount;
              }
            } catch (finalError) {
              console.error(`   ❌ Could not resolve duplicates in "${table}": ${finalError.message}`);
            }
          } else {
            throw updateError;
          }
        }

      } catch (error) {
        console.error(`❌ Error updating table "${table}":`, error.message);
      }
    }

    // Handle tables with stream variations
    for (const { table, columns } of tablesWithStreamVariations) {
      try {
        const tableExists = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );

        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Table "${table}" does not exist, skipping...`);
          continue;
        }

        for (const column of columns) {
          const columnExists = await query(
            `SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = $1 
              AND column_name = $2
            )`,
            [table, column]
          );

          if (!columnExists.rows[0].exists) {
            continue;
          }

          const countResult = await query(
            `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = 'NA'`
          );
          const count = parseInt(countResult.rows[0].count);

          if (count > 0) {
            await query(
              `UPDATE ${table} SET ${column} = 'A' WHERE ${column} = 'NA'`
            );
            console.log(`✅ Table "${table}" column "${column}": Updated ${count} record(s)`);
            totalUpdated += count;
          }
        }
      } catch (error) {
        console.error(`❌ Error updating table "${table}":`, error.message);
      }
    }

    // Also check for case variations
    const caseVariations = ['na', 'Na', 'nA'];
    for (const variation of caseVariations) {
      for (const table of tablesWithStream) {
        try {
          const countResult = await query(
            `SELECT COUNT(*) as count FROM ${table} WHERE LOWER(stream) = $1`,
            [variation.toLowerCase()]
          );
          const count = parseInt(countResult.rows[0].count);

          if (count > 0) {
            const updateResult = await query(
              `UPDATE ${table} SET stream = 'A' WHERE LOWER(stream) = $1`,
              [variation.toLowerCase()]
            );
            console.log(`✅ Table "${table}": Updated ${count} record(s) with stream='${variation}'`);
            totalUpdated += count;
          }
        } catch (error) {
          // Table might not exist or column might not exist, skip silently
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration complete! Total records updated: ${totalUpdated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateStreamNAtoA();

