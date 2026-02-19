/**
 * Check Comments for Term II from extracted JSON file
 * This shows what data SHOULD be in the database
 * Run: node backend/scripts/checkCommentsFromJSON.js
 */

const fs = require('fs');
const path = require('path');

const commentsFile = path.join(__dirname, '../../extracted_data/comments.json');

function checkCommentsFromJSON() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING COMMENTS FROM EXTRACTED JSON FILE');
    console.log('Form I, Year 2025, Stream A/NA, Term II, Comment Type: huduma');
    console.log('='.repeat(80));
    console.log();

    if (!fs.existsSync(commentsFile)) {
      console.log('❌ Comments file not found:', commentsFile);
      process.exit(1);
    }

    const commentsData = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));

    // Filter for huduma comments - Form I, Stream A or NA, Year 2025, Term II
    const hudumaComments = commentsData.filter(comment => 
      comment.comment_type === 'huduma' &&
      comment.level === 'FORM I' &&
      (comment.stream === 'A' || comment.stream === 'NA') &&
      comment.year === 2025 &&
      comment.term === 'Term II'
    );

    console.log(`📝 HUDUMA COMMENTS - Form I, Stream A/NA, Year 2025, Term II:`);
    console.log(`   Found: ${hudumaComments.length} comments\n`);

    if (hudumaComments.length === 0) {
      console.log('  ❌ No huduma comments found for Term II\n');
    } else {
      hudumaComments.forEach(comment => {
        console.log(`  ID: ${comment.id}`);
        console.log(`  Stream: ${comment.stream} (should be normalized to 'A' in database)`);
        console.log(`  Student Index: ${comment.student_index}`);
        console.log(`  Comment: ${comment.comment_text || '(empty)'}`);
        console.log(`  Created: ${comment.created_at}`);
        console.log(`  Updated: ${comment.updated_at}`);
        console.log();
      });
    }

    // Check all comment types for Term II
    console.log('📊 ALL COMMENT TYPES FOR TERM II (Form I, Stream A/NA, Year 2025):');
    console.log('-'.repeat(80));
    
    const allTermIIComments = commentsData.filter(comment =>
      comment.level === 'FORM I' &&
      (comment.stream === 'A' || comment.stream === 'NA') &&
      comment.year === 2025 &&
      comment.term === 'Term II'
    );

    const byType = {};
    allTermIIComments.forEach(comment => {
      if (!byType[comment.comment_type]) {
        byType[comment.comment_type] = {
          total: 0,
          withText: 0,
          streams: new Set()
        };
      }
      byType[comment.comment_type].total++;
      byType[comment.comment_type].streams.add(comment.stream);
      if (comment.comment_text && comment.comment_text.trim() !== '') {
        byType[comment.comment_type].withText++;
      }
    });

    Object.keys(byType).sort().forEach(type => {
      const data = byType[type];
      console.log(`  ${type}: ${data.total} total, ${data.withText} with text, streams: ${Array.from(data.streams).join(', ')}`);
    });
    console.log();

    // Comparison Term I vs Term II
    console.log('📊 COMPARISON - TERM I vs TERM II:');
    console.log('-'.repeat(80));
    
    const termIComments = commentsData.filter(comment =>
      comment.level === 'FORM I' &&
      (comment.stream === 'A' || comment.stream === 'NA') &&
      comment.year === 2025 &&
      comment.term === 'Term I'
    );

    const termIIComments = commentsData.filter(comment =>
      comment.level === 'FORM I' &&
      (comment.stream === 'A' || comment.stream === 'NA') &&
      comment.year === 2025 &&
      comment.term === 'Term II'
    );

    const termIByType = {};
    termIComments.forEach(comment => {
      termIByType[comment.comment_type] = (termIByType[comment.comment_type] || 0) + 1;
    });

    const termIIByType = {};
    termIIComments.forEach(comment => {
      termIIByType[comment.comment_type] = (termIIByType[comment.comment_type] || 0) + 1;
    });

    const allTypes = new Set([...Object.keys(termIByType), ...Object.keys(termIIByType)]);
    
    allTypes.forEach(type => {
      const termICount = termIByType[type] || 0;
      const termIICount = termIIByType[type] || 0;
      console.log(`  ${type}:`);
      console.log(`    Term I: ${termICount} comments`);
      console.log(`    Term II: ${termIICount} comments`);
    });
    console.log();

    // Detailed huduma breakdown
    console.log('🔍 DETAILED HUDUMA COMMENTS - TERM I vs TERM II:');
    console.log('-'.repeat(80));
    
    const hudumaTermI = commentsData.filter(comment =>
      comment.comment_type === 'huduma' &&
      comment.level === 'FORM I' &&
      (comment.stream === 'A' || comment.stream === 'NA') &&
      comment.year === 2025 &&
      comment.term === 'Term I'
    );

    console.log(`\n  Term I (${hudumaTermI.length} comments):`);
    hudumaTermI.sort((a, b) => parseInt(a.student_index) - parseInt(b.student_index));
    hudumaTermI.forEach(comment => {
      console.log(`    Student ${comment.student_index} (stream: ${comment.stream}): ${comment.comment_text || '(empty)'}`);
    });

    console.log(`\n  Term II (${hudumaComments.length} comments):`);
    hudumaComments.sort((a, b) => parseInt(a.student_index) - parseInt(b.student_index));
    hudumaComments.forEach(comment => {
      console.log(`    Student ${comment.student_index} (stream: ${comment.stream}): ${comment.comment_text || '(empty)'}`);
    });
    console.log();

    console.log('='.repeat(80));
    console.log('IMPORTANT NOTES:');
    console.log('='.repeat(80));
    console.log('1. Stream "NA" should be normalized to "A" in the database');
    console.log('2. The API endpoint queries for stream="A" (normalized)');
    console.log('3. If comments are stored as stream="NA" in database, they won\'t be found');
    console.log('4. Check if stream normalization was applied during migration');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkCommentsFromJSON();
