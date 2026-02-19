/**
 * Add indexes for scaling to 2000+ students with photos and data across years.
 * Run once on existing DB: node backend/scripts/addIndexesFor2000Students.js
 * (initDatabase.js already creates these for new installs.)
 */
require('dotenv').config();
const { query } = require('../config/database');

async function run() {
  try {
    await query('CREATE INDEX IF NOT EXISTS idx_students_adm_year ON students(adm_no, year)');
    console.log('✅ idx_students_adm_year');
    await query('CREATE INDEX IF NOT EXISTS idx_student_photos_class ON student_photos(level, stream, year)');
    console.log('✅ idx_student_photos_class');
    console.log('Done. Database is ready for 2000+ students.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

run();
