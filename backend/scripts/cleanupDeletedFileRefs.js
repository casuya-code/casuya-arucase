/**
 * Cleanup Database After File Deletion
 * Removes database references to deleted files. New uploads and deletes will continue to work.
 *
 * Run (from project root): node backend/scripts/cleanupDeletedFileRefs.js
 * Or (from backend): node scripts/cleanupDeletedFileRefs.js
 *
 * Cleans:
 * - gallery_photos: deletes all rows (photos were in static/uploads/photos)
 * - ai_matters_documents: deletes all rows (documents were in static/ai-matters)
 * - administrators: sets photo = NULL (keeps admin records, clears broken image refs)
 * - school_logo: sets logo_image_path = NULL
 * - school_stamp: sets stamp_image_path = NULL
 * - authority_data: sets signature_image_path = NULL
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../config/database');

async function cleanup() {
  try {
    console.log('Cleaning database references to deleted files...\n');

    // 1. Gallery photos
    const galleryResult = await query('DELETE FROM gallery_photos RETURNING id');
    console.log(`  gallery_photos: removed ${galleryResult.rowCount} row(s)`);

    // 2. AI Matters documents
    let aiResult = { rowCount: 0 };
    try {
      aiResult = await query('DELETE FROM ai_matters_documents RETURNING id');
      console.log(`  ai_matters_documents: removed ${aiResult.rowCount} row(s)`);
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        console.log('  ai_matters_documents: table does not exist (skipped)');
      } else throw e;
    }

    // 3. Administrators - clear photo refs (keep records)
    const adminResult = await query(
      "UPDATE administrators SET photo = NULL WHERE photo IS NOT NULL RETURNING id"
    );
    console.log(`  administrators: cleared photo for ${adminResult.rowCount} row(s)`);

    // 4. School logo
    try {
      const logoResult = await query(
        "UPDATE school_logo SET logo_image_path = NULL WHERE id = 1 AND logo_image_path IS NOT NULL RETURNING id"
      );
      console.log(`  school_logo: cleared ${logoResult.rowCount} row(s)`);
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        console.log('  school_logo: table does not exist (skipped)');
      } else throw e;
    }

    // 5. School stamp
    try {
      const stampResult = await query(
        "UPDATE school_stamp SET stamp_image_path = NULL WHERE id = 1 AND stamp_image_path IS NOT NULL RETURNING id"
      );
      console.log(`  school_stamp: cleared ${stampResult.rowCount} row(s)`);
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        console.log('  school_stamp: table does not exist (skipped)');
      } else throw e;
    }

    // 6. Authority signature image
    try {
      const authResult = await query(
        "UPDATE authority_data SET signature_image_path = NULL WHERE id = 1 AND signature_image_path IS NOT NULL RETURNING id"
      );
      console.log(`  authority_data: cleared signature_image_path for ${authResult.rowCount} row(s)`);
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        console.log('  authority_data: table does not exist (skipped)');
      } else throw e;
    }

    console.log('\nDone. New uploads and deletes will work normally.');
  } catch (error) {
    console.error('Cleanup error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

cleanup();
