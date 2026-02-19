/**
 * Add Mass Reading Position Control to Database
 */
require('dotenv').config();
const { query } = require('../config/database');

async function addMassReadingPosition() {
  try {
    // Add columns if they don't exist
    await query(`
      DO $$ 
      BEGIN
        -- Add mass_reading_enabled column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='website_settings' AND column_name='mass_reading_enabled'
        ) THEN
          ALTER TABLE website_settings ADD COLUMN mass_reading_enabled BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- Add mass_reading_position column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='website_settings' AND column_name='mass_reading_position'
        ) THEN
          ALTER TABLE website_settings ADD COLUMN mass_reading_position INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);
    
    console.log('✅ Mass Reading position columns added successfully!');
    
    // Set default values for existing records
    await query(`
      UPDATE website_settings 
      SET 
        mass_reading_enabled = COALESCE(mass_reading_enabled, TRUE),
        mass_reading_position = COALESCE(mass_reading_position, 1)
      WHERE id = 1;
    `);
    
    console.log('✅ Default values set for Mass Reading position');
  } catch (error) {
    console.error('❌ Error adding Mass Reading position columns:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addMassReadingPosition()
    .then(() => {
      console.log('✅ Mass Reading position setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = addMassReadingPosition;

