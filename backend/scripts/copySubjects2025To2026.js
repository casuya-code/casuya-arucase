/**
 * Copy Subjects from 2025 to 2026
 * 
 * Copies subjects from:
 * - FORM I 2025 → FORM II 2026 (promote)
 * - FORM II 2025 → FORM III 2026 (promote)
 * - FORM III 2025 → FORM IV 2026 (promote)
 * - FORM I 2025 → FORM I 2026 (copy for new students)
 * - FORM V 2025 → FORM V 2026 (copy for next year)
 * - FORM VI 2025 → FORM VI 2026 (copy for next year)
 * 
 * Handles all streams:
 * - Form I-IV: A, B, C, D
 * - Form V-VI: PCB, PCM, CBG, HGL, HKL, EGM, HGE
 */
const { query } = require('../config/database');
const { normalizeStream } = require('../utils/streamNormalizer');

async function copySubjects() {
  try {
    console.log('='.repeat(80));
    console.log('COPYING SUBJECTS FROM 2025 TO 2026');
    console.log('='.repeat(80));
    console.log();

    const copyOperations = [
      { fromLevel: 'FORM I', fromYear: 2025, toLevel: 'FORM II', toYear: 2026, description: 'FORM I 2025 → FORM II 2026', isFormVOrVI: false },
      { fromLevel: 'FORM II', fromYear: 2025, toLevel: 'FORM III', toYear: 2026, description: 'FORM II 2025 → FORM III 2026', isFormVOrVI: false },
      { fromLevel: 'FORM III', fromYear: 2025, toLevel: 'FORM IV', toYear: 2026, description: 'FORM III 2025 → FORM IV 2026', isFormVOrVI: false },
      { fromLevel: 'FORM I', fromYear: 2025, toLevel: 'FORM I', toYear: 2026, description: 'FORM I 2025 → FORM I 2026', isFormVOrVI: false },
      { fromLevel: 'FORM V', fromYear: 2025, toLevel: 'FORM V', toYear: 2026, description: 'FORM V 2025 → FORM V 2026', isFormVOrVI: true },
      { fromLevel: 'FORM VI', fromYear: 2025, toLevel: 'FORM VI', toYear: 2026, description: 'FORM VI 2025 → FORM VI 2026', isFormVOrVI: true },
    ];

    // Streams for Form I-IV
    const formIIVStreams = ['A', 'B', 'C', 'D'];
    // Streams for Form V-VI
    const formVVIStreams = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];

    let totalCopied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const operation of copyOperations) {
      console.log(`\n📚 ${operation.description}`);
      console.log('─'.repeat(80));

      // Select appropriate streams based on form level
      const streams = operation.isFormVOrVI ? formVVIStreams : formIIVStreams;

      for (const stream of streams) {
        // For Form I-IV, normalize stream (NA -> A)
        // For Form V-VI, use stream as-is
        const normalizedStream = operation.isFormVOrVI ? stream : normalizeStream(stream);
        
        try {
          // Get existing subjects in destination
          const existingSubjectsResult = await query(
            'SELECT subject_code FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
            [operation.toLevel, normalizedStream, operation.toYear]
          );
          const existingSubjectCodes = new Set(existingSubjectsResult.rows.map(s => s.subject_code));

          // Get source subjects
          let sourceSubjectsResult;
          if (operation.isFormVOrVI) {
            // For Form V-VI, use the actual stream
            sourceSubjectsResult = await query(
              'SELECT DISTINCT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
              [operation.fromLevel, stream, operation.fromYear]
            );
          } else {
            // For Form I-IV, check both 'A' and 'NA' to handle legacy data
            sourceSubjectsResult = await query(
              'SELECT DISTINCT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
              [operation.fromLevel, 'A', 'NA', operation.fromYear]
            );
          }

          if (sourceSubjectsResult.rows.length === 0) {
            console.log(`   ⚠️  Stream ${stream}: No subjects found in source (${operation.fromLevel} ${operation.fromYear})`);
            continue;
          }

          let copied = 0;
          let skipped = 0;

          for (const subject of sourceSubjectsResult.rows) {
            if (existingSubjectCodes.has(subject.subject_code)) {
              skipped++;
              continue;
            }

            try {
              await query(
                `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (level, stream, year, subject_code)
                 DO UPDATE SET subject_name = EXCLUDED.subject_name, subject_abbreviation = EXCLUDED.subject_abbreviation`,
                [
                  operation.toLevel,
                  normalizedStream,
                  operation.toYear,
                  subject.subject_code,
                  subject.subject_name,
                  subject.subject_abbreviation || null
                ]
              );
              copied++;
              console.log(`   ✅ Stream ${stream}: ${subject.subject_code} - ${subject.subject_name}`);
            } catch (error) {
              console.error(`   ❌ Stream ${stream}: Error copying ${subject.subject_code}:`, error.message);
              totalErrors++;
            }
          }

          if (copied > 0 || skipped > 0) {
            console.log(`   📊 Stream ${stream}: Copied ${copied}, Skipped ${skipped} (already exist)`);
          }

          totalCopied += copied;
          totalSkipped += skipped;
        } catch (error) {
          console.error(`   ❌ Stream ${stream}: Error processing:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Total subjects copied: ${totalCopied}`);
    console.log(`⏭️  Total subjects skipped (already exist): ${totalSkipped}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log('='.repeat(80));
    console.log('\n✅ Subject copying completed!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  copySubjects()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { copySubjects };
