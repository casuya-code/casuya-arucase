/**
 * Fix subjects for all classes and streams based on what's actually in the scores table
 */
const { query } = require('../config/database');

async function getAllSubjectsFromScores() {
  try {
    console.log('\n🔍 Analyzing scores data to determine correct subjects...\n');
    
    // Get all unique subject codes by level, stream, and year from scores
    const scoresResult = await query(
      `SELECT DISTINCT 
         UPPER(TRIM(level)) as level,
         stream,
         year,
         subject_code,
         COUNT(DISTINCT adm_no) as student_count
       FROM individual_scores 
       WHERE level IS NOT NULL AND subject_code IS NOT NULL
       GROUP BY UPPER(TRIM(level)), stream, year, subject_code
       ORDER BY level, year, stream, subject_code`
    );
    
    console.log(`📊 Found ${scoresResult.rows.length} unique subject/class/stream/year combinations in scores\n`);
    
    // Group by level, year, and stream
    const subjectsByClass = {};
    
    scoresResult.rows.forEach(row => {
      const level = row.level;
      const year = row.year;
      const stream = row.stream || 'A';
      const key = `${level}_${year}_${stream}`;
      
      if (!subjectsByClass[key]) {
        subjectsByClass[key] = {
          level,
          year,
          stream,
          subjects: []
        };
      }
      
      subjectsByClass[key].subjects.push({
        code: row.subject_code,
        studentCount: parseInt(row.student_count)
      });
    });
    
    return Object.values(subjectsByClass);
  } catch (error) {
    console.error('❌ Error getting subjects from scores:', error);
    throw error;
  }
}

async function getSubjectNameFromCode(code) {
  // Try to infer subject name from code
  const codeMap = {
    'ENG': 'ENGLISH LANGUAGE',
    'B/K': 'BIBLE KNOWLEDGE',
    'KIS': 'KISWAHILI',
    'MAT': 'MATHEMATICS',
    'B/MAT': 'BASIC MATHEMATICS',
    'B/MT': 'BASIC MATHEMATICS',
    'BUS': 'BUSINESS STUDIES',
    'GEO': 'GEOGRAPHY',
    'HIS': 'HISTORY',
    'BIO': 'BIOLOGY',
    'CHE': 'CHEMISTRY',
    'PHY': 'PHYSICS',
    'CIV': 'CIVICS',
    'HTM': 'HISTORIA YA TANZANIA NA MAADILI',
    'COM': 'COMPUTER STUDIES',
    'A/COM': 'ADVANCED COMPUTER STUDIES',
    'A/HTM': 'ADVANCED HISTORIA YA TANZANIA NA MAADILI',
    'A/MAT': 'ADVANCED MATHEMATICS',
    'A/PHY': 'ADVANCED PHYSICS',
    'A/CHE': 'ADVANCED CHEMISTRY',
    'A/BIO': 'ADVANCED BIOLOGY',
    'A/DIV': 'ADVANCED DIVINITY',
    'DIV': 'DIVINITY',
    'ECO': 'ECONOMICS',
    'BAM': 'BASIC APPLIED MATHEMATICS',
    'B/MATH': 'BASIC MATHEMATICS',
    'G/S': 'GENERAL STUDIES',
    'PHY/CHE': 'PHYSICS/CHEMISTRY',
    'BIO/CHE': 'BIOLOGY/CHEMISTRY',
  };
  
  return codeMap[code] || code;
}

async function fixAllSubjects() {
  try {
    console.log('\n🔧 Fixing subjects for all classes and streams...\n');
    
    // Get subjects from scores
    const classesFromScores = await getAllSubjectsFromScores();
    
    let totalFixed = 0;
    let totalDeleted = 0;
    let totalAdded = 0;
    
    for (const classData of classesFromScores) {
      const { level, year, stream, subjects } = classData;
      
      // Normalize stream: NA -> A for FORM I-IV
      const normalizedStream = (level.includes('FORM V') || level.includes('FORM VI')) 
        ? stream 
        : (stream === 'NA' ? 'A' : stream);
      
      console.log(`\n📚 ${level} ${year} - Stream: ${normalizedStream} (${subjects.length} subjects)`);
      console.log('─'.repeat(80));
      
      // Delete existing subjects for this class/stream/year
      const deleteResult = await query(
        `DELETE FROM subjects WHERE level = $1 AND stream = $2 AND year = $3`,
        [level, normalizedStream, year]
      );
      
      if (deleteResult.rowCount > 0) {
        console.log(`   🗑️  Deleted ${deleteResult.rowCount} existing subjects`);
        totalDeleted += deleteResult.rowCount;
      }
      
      // Add subjects from scores
      for (const subject of subjects) {
        try {
          const subjectName = await getSubjectNameFromCode(subject.code);
          
          await query(
            `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [level, normalizedStream, year, subject.code, subjectName, subject.code]
          );
          
          console.log(`   ✅ ${subject.code} - ${subjectName} (${subject.studentCount} students)`);
          totalAdded++;
        } catch (error) {
          console.error(`   ❌ Error adding ${subject.code}:`, error.message);
        }
      }
      
      totalFixed++;
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${totalFixed} class/stream/year combinations`);
    console.log(`   🗑️  Deleted: ${totalDeleted} old subjects`);
    console.log(`   ➕ Added: ${totalAdded} subjects`);
    
    // Show final counts by level
    const finalCounts = await query(
      `SELECT level, year, stream, COUNT(*) as count
       FROM subjects
       GROUP BY level, year, stream
       ORDER BY level, year, stream`
    );
    
    console.log(`\n📈 Final subject counts by class:`);
    console.log('─'.repeat(80));
    finalCounts.rows.forEach(row => {
      console.log(`   ${row.level} ${row.year} - Stream ${row.stream}: ${row.count} subjects`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllSubjects();
