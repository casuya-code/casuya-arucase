/**
 * Add missing tables to the database
 * Run: node backend/scripts/addMissingTables.js
 * 
 * This script adds the missing public_events and public_gallery tables
 */
require('dotenv').config();
const { query } = require('../config/database');

async function addMissingTables() {
  console.log('='.repeat(80));
  console.log('ADDING MISSING TABLES');
  console.log('='.repeat(80));
  console.log();

  try {
    // Test database connection
    const connectionTest = await query('SELECT NOW() as current_time');
    console.log(`✅ Database connected at: ${connectionTest.rows[0].current_time}`);
    console.log();

    // Check if public_events table exists
    const eventsExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_events'
      )
    `);

    if (!eventsExists.rows[0].exists) {
      console.log('Creating public_events table...');
      await query(`
        CREATE TABLE public_events (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_date VARCHAR(50) NOT NULL,
          event_time VARCHAR(50),
          location VARCHAR(255),
          category VARCHAR(100),
          image VARCHAR(255),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Public events table created');
    } else {
      console.log('⚠️  Public events table already exists');
    }

    // Check if public_gallery table exists
    const galleryExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_gallery'
      )
    `);

    if (!galleryExists.rows[0].exists) {
      console.log('Creating public_gallery table...');
      await query(`
        CREATE TABLE public_gallery (
          id VARCHAR(100) PRIMARY KEY,
          path VARCHAR(255) NOT NULL,
          category VARCHAR(50) DEFAULT 'general',
          caption TEXT,
          date VARCHAR(50),
          uploaded_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Public gallery table created');
    } else {
      console.log('⚠️  Public gallery table already exists');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ MISSING TABLES ADDED SUCCESSFULLY');
    console.log('='.repeat(80));

    // Verify tables exist
    console.log();
    console.log('Verifying tables...');
    const verifyEvents = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_events'
      )
    `);
    const verifyGallery = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_gallery'
      )
    `);

    console.log(`public_events exists: ${verifyEvents.rows[0].exists ? '✅' : '❌'}`);
    console.log(`public_gallery exists: ${verifyGallery.rows[0].exists ? '✅' : '❌'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding missing tables:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addMissingTables();
