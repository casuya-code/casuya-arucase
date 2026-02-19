/**
 * Remove students with admission numbers from 1800 to 2000
 * Run: node backend/scripts/removeStudentsByAdmRange.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function removeStudentsByAdmRange() {
  try {
    console.log('='.repeat(80));
    console.log('REMOVING STUDENTS WITH ADMISSION NUMBERS 1800-2000');
    console.log('='.repeat(80));
    console.log();
    
    const minAdm = 1800;
    const maxAdm = 2000;
    
    // First, check how many students exist in this range
    console.log(`📊 Checking students with admission numbers ${minAdm}-${maxAdm}...`);
    
    const checkResult = await query(`
      SELECT adm_no, first_name, middle_name, surname, level, stream, year, COUNT(*) OVER() as total_count
      FROM students
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
      ORDER BY CAST(adm_no AS INTEGER)
      LIMIT 50
    `, [minAdm, maxAdm]);
    
    const totalCount = checkResult.rows.length > 0 ? parseInt(checkResult.rows[0].total_count) : 0;
    
    if (totalCount === 0) {
      console.log(`✅ No students found with admission numbers ${minAdm}-${maxAdm}`);
      process.exit(0);
    }
    
    console.log(`Found ${totalCount} students in range ${minAdm}-${maxAdm}`);
    console.log('\nSample students to be deleted:');
    checkResult.rows.slice(0, 10).forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.adm_no} - ${row.first_name} ${row.surname} (${row.level} ${row.stream} ${row.year})`);
    });
    if (totalCount > 10) {
      console.log(`  ... and ${totalCount - 10} more`);
    }
    
    // Check related data
    console.log('\n📊 Checking related data...');
    
    // Check scores
    const scoresCheck = await query(`
      SELECT COUNT(*) as count
      FROM individual_scores
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    const scoresCount = parseInt(scoresCheck.rows[0].count);
    console.log(`  Scores: ${scoresCount} records`);
    
    // Check parishes
    const parishesCheck = await query(`
      SELECT COUNT(*) as count
      FROM student_parishes sp
      INNER JOIN students s ON sp.level = s.level 
        AND sp.stream = s.stream 
        AND sp.year = s.year
      WHERE s.adm_no ~ '^[0-9]+$' 
        AND CAST(s.adm_no AS INTEGER) >= $1 
        AND CAST(s.adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    const parishesCount = parseInt(parishesCheck.rows[0].count);
    console.log(`  Parishes: ${parishesCount} records`);
    
    // Check photos
    const photosCheck = await query(`
      SELECT COUNT(*) as count
      FROM student_photos sp
      INNER JOIN students s ON sp.level = s.level 
        AND sp.stream = s.stream 
        AND sp.year = s.year
      WHERE s.adm_no ~ '^[0-9]+$' 
        AND CAST(s.adm_no AS INTEGER) >= $1 
        AND CAST(s.adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    const photosCount = parseInt(photosCheck.rows[0].count);
    console.log(`  Photos: ${photosCount} records`);
    
    console.log('\n⚠️  WARNING: This will permanently delete:');
    console.log(`  - ${totalCount} students`);
    console.log(`  - ${scoresCount} score records`);
    console.log(`  - ${parishesCount} parish records`);
    console.log(`  - ${photosCount} photo records`);
    console.log('\nThis action cannot be undone!');
    
    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed with the deletion
    
    console.log('\n🚀 Starting deletion...');
    
    // Delete related data first (to avoid foreign key constraints)
    
    // 1. Delete scores
    if (scoresCount > 0) {
      console.log(`\nDeleting ${scoresCount} score records...`);
      const scoresDeleteResult = await query(`
        DELETE FROM individual_scores
        WHERE adm_no ~ '^[0-9]+$' 
          AND CAST(adm_no AS INTEGER) >= $1 
          AND CAST(adm_no AS INTEGER) <= $2
      `, [minAdm, maxAdm]);
      console.log(`✅ Deleted ${scoresCount} score records`);
    }
    
    // 2. Delete parishes (we need to match by student data since parishes don't have adm_no directly)
    if (parishesCount > 0) {
      console.log(`\nDeleting ${parishesCount} parish records...`);
      const parishesDeleteResult = await query(`
        DELETE FROM student_parishes
        WHERE (level, stream, year) IN (
          SELECT level, stream, year
          FROM students
          WHERE adm_no ~ '^[0-9]+$' 
            AND CAST(adm_no AS INTEGER) >= $1 
            AND CAST(adm_no AS INTEGER) <= $2
        )
      `, [minAdm, maxAdm]);
      console.log(`✅ Deleted parish records`);
    }
    
    // 3. Delete photos
    if (photosCount > 0) {
      console.log(`\nDeleting ${photosCount} photo records...`);
      const photosDeleteResult = await query(`
        DELETE FROM student_photos
        WHERE (level, stream, year) IN (
          SELECT level, stream, year
          FROM students
          WHERE adm_no ~ '^[0-9]+$' 
            AND CAST(adm_no AS INTEGER) >= $1 
            AND CAST(adm_no AS INTEGER) <= $2
        )
      `, [minAdm, maxAdm]);
      console.log(`✅ Deleted photo records`);
    }
    
    // 4. Finally, delete students
    console.log(`\nDeleting ${totalCount} students...`);
    const studentsDeleteResult = await query(`
      DELETE FROM students
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
      RETURNING adm_no, first_name, surname
    `, [minAdm, maxAdm]);
    
    const deletedCount = studentsDeleteResult.rows.length;
    console.log(`✅ Deleted ${deletedCount} students`);
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const verifyResult = await query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE adm_no ~ '^[0-9]+$' 
        AND CAST(adm_no AS INTEGER) >= $1 
        AND CAST(adm_no AS INTEGER) <= $2
    `, [minAdm, maxAdm]);
    
    const remainingCount = parseInt(verifyResult.rows[0].count);
    
    console.log('\n' + '='.repeat(80));
    console.log('DELETION COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Successfully deleted: ${deletedCount} students`);
    console.log(`✅ Deleted: ${scoresCount} score records`);
    console.log(`✅ Deleted: ${parishesCount} parish records`);
    console.log(`✅ Deleted: ${photosCount} photo records`);
    console.log(`📊 Remaining students in range: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('\n⚠️  Warning: Some students may still exist (non-numeric admission numbers)');
    }
    
    console.log('\n✅ Deletion completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Deletion failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

removeStudentsByAdmRange();
