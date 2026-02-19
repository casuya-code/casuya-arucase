/**
 * Check what streams exist for FORM V and FORM VI in students, scores, and subjects tables
 */
const { query } = require('../config/database');

async function checkFormVVIStreams() {
  try {
    console.log('\n🔍 Checking FORM V and FORM VI streams...\n');
    
    // Check streams in students table
    console.log('📚 Streams in STUDENTS table:');
    const studentsStreams = await query(
      `SELECT DISTINCT level, stream, COUNT(*) as count
       FROM students 
       WHERE level IN ('FORM V', 'FORM VI')
       GROUP BY level, stream
       ORDER BY level, stream`
    );
    
    studentsStreams.rows.forEach(row => {
      console.log(`   ${row.level} - Stream ${row.stream}: ${row.count} students`);
    });
    
    // Check streams in scores table
    console.log('\n📊 Streams in SCORES (individual_scores) table:');
    const scoresStreams = await query(
      `SELECT DISTINCT UPPER(TRIM(level)) as level, stream, COUNT(DISTINCT adm_no) as student_count
       FROM individual_scores 
       WHERE UPPER(TRIM(level)) IN ('FORM V', 'FORM VI')
       GROUP BY UPPER(TRIM(level)), stream
       ORDER BY level, stream`
    );
    
    scoresStreams.rows.forEach(row => {
      console.log(`   ${row.level} - Stream ${row.stream}: ${row.student_count} students`);
    });
    
    // Check streams in subjects table
    console.log('\n📖 Streams in SUBJECTS table:');
    const subjectsStreams = await query(
      `SELECT DISTINCT level, stream, COUNT(*) as subject_count
       FROM subjects 
       WHERE level IN ('FORM V', 'FORM VI')
       GROUP BY level, stream
       ORDER BY level, stream`
    );
    
    subjectsStreams.rows.forEach(row => {
      console.log(`   ${row.level} - Stream ${row.stream}: ${row.subject_count} subjects`);
    });
    
    // Check specifically for HGE stream
    console.log('\n🔍 Checking HGE stream specifically:\n');
    
    const hgeStudents = await query(
      `SELECT COUNT(*) as count FROM students 
       WHERE level IN ('FORM V', 'FORM VI') AND stream = 'HGE'`
    );
    console.log(`   Students with HGE stream: ${hgeStudents.rows[0].count}`);
    
    const hgeScores = await query(
      `SELECT COUNT(DISTINCT adm_no) as count FROM individual_scores 
       WHERE UPPER(TRIM(level)) IN ('FORM V', 'FORM VI') AND stream = 'HGE'`
    );
    console.log(`   Students with scores in HGE stream: ${hgeScores.rows[0].count}`);
    
    const hgeSubjects = await query(
      `SELECT COUNT(*) as count FROM subjects 
       WHERE level IN ('FORM V', 'FORM VI') AND stream = 'HGE'`
    );
    console.log(`   Subjects for HGE stream: ${hgeSubjects.rows[0].count}`);
    
    // Check if HGE exists in scores but not in subjects
    const hgeSubjectsInScores = await query(
      `SELECT DISTINCT subject_code, level, year
       FROM individual_scores 
       WHERE UPPER(TRIM(level)) IN ('FORM V', 'FORM VI') AND stream = 'HGE'
       ORDER BY level, year, subject_code`
    );
    
    if (hgeSubjectsInScores.rows.length > 0) {
      console.log(`\n📋 Subjects found in scores for HGE stream:`);
      const byLevelYear = {};
      hgeSubjectsInScores.rows.forEach(row => {
        const key = `${row.level}_${row.year}`;
        if (!byLevelYear[key]) {
          byLevelYear[key] = [];
        }
        byLevelYear[key].push(row.subject_code);
      });
      
      Object.keys(byLevelYear).forEach(key => {
        const [level, year] = key.split('_');
        console.log(`   ${level} ${year}: ${byLevelYear[key].join(', ')}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFormVVIStreams();
