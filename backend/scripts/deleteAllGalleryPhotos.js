/**
 * Script to delete all gallery photos from database and file system
 * Usage: node backend/scripts/deleteAllGalleryPhotos.js
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Create database connection
const pool = new Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

async function deleteAllGalleryPhotos() {
  try {
    console.log('='.repeat(80));
    console.log('🗑️  DELETING ALL GALLERY PHOTOS');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Get all gallery photos from database
    console.log('📋 Fetching gallery photos from database...');
    const result = await query('SELECT id, path FROM gallery_photos');
    const photos = result.rows;
    console.log(`   Found ${photos.length} photo(s) in database`);
    console.log();

    // Step 2: Delete physical files
    const photosDir = path.join(__dirname, '../static/uploads/photos');
    let deletedFiles = 0;
    let failedFiles = 0;

    console.log('🗂️  Deleting physical files...');
    
    // Get all files in photos directory
    try {
      const files = await fs.readdir(photosDir);
      console.log(`   Found ${files.length} file(s) in photos directory`);
      
      for (const file of files) {
        try {
          const filePath = path.join(photosDir, file);
          await fs.unlink(filePath);
          deletedFiles++;
          console.log(`   ✓ Deleted: ${file}`);
        } catch (err) {
          failedFiles++;
          console.error(`   ✗ Failed to delete ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('   ⚠️  Photos directory does not exist, skipping file deletion');
      } else {
        console.error(`   ✗ Error reading photos directory: ${err.message}`);
      }
    }

    console.log();
    console.log(`   Summary: ${deletedFiles} file(s) deleted, ${failedFiles} failed`);
    console.log();

    // Step 3: Delete all records from database
    console.log('💾 Deleting database records...');
    const deleteResult = await query('DELETE FROM gallery_photos');
    console.log(`   ✓ Deleted ${deleteResult.rowCount} record(s) from database`);
    console.log();

    // Step 4: Verify deletion
    console.log('✅ Verifying deletion...');
    const verifyResult = await query('SELECT COUNT(*) as count FROM gallery_photos');
    const remainingCount = parseInt(verifyResult.rows[0].count);
    
    if (remainingCount === 0) {
      console.log('   ✓ All gallery photos successfully deleted from database');
    } else {
      console.log(`   ⚠️  Warning: ${remainingCount} record(s) still remain in database`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ CLEANUP COMPLETED');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log(`   - Database records deleted: ${photos.length}`);
    console.log(`   - Physical files deleted: ${deletedFiles}`);
    console.log(`   - Failed file deletions: ${failedFiles}`);
    console.log(`   - Remaining database records: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting gallery photos:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
deleteAllGalleryPhotos();

