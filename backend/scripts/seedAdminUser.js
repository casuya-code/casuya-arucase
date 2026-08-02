/**
 * Seed Admin User Script
 * Ensures the default admin user exists with the correct password hash.
 * Idempotent: safe to run multiple times.
 *
 * Run standalone: node backend/scripts/seedAdminUser.js
 * Also called automatically at the end of initDatabase.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_FULL_NAME = 'Administrator';
const ADMIN_ROLE = 'superadmin';
const ADMIN_STATUS = 'active';
const ADMIN_PERMISSIONS = JSON.stringify({ modules: ['all'] });

async function seedAdminUser() {
  try {
    if (!ADMIN_PASSWORD) {
      throw new Error(
        'SEED_ADMIN_PASSWORD is not set. Add it to backend/.env (see backend/.env.example).'
      );
    }
    console.log('🔐 Seeding admin user...');

    // Check whether the admin user already exists
    const existing = await query(
      'SELECT id, username FROM users WHERE username = $1',
      [ADMIN_USERNAME]
    );

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (existing.rows.length === 0) {
      // User does not exist — create it
      await query(
        `INSERT INTO users (username, password_hash, full_name, role, status, permissions)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ADMIN_USERNAME, passwordHash, ADMIN_FULL_NAME, ADMIN_ROLE, ADMIN_STATUS, ADMIN_PERMISSIONS]
      );
      console.log('✅ Admin user created successfully');
    } else {
      // User exists — update the password hash and ensure superadmin role
      await query(
        `UPDATE users
         SET password_hash = $1,
             full_name     = $2,
             role          = $3,
             status        = $4,
             permissions   = $5,
             updated_at    = CURRENT_TIMESTAMP
         WHERE username = $6`,
        [passwordHash, ADMIN_FULL_NAME, ADMIN_ROLE, ADMIN_STATUS, ADMIN_PERMISSIONS, ADMIN_USERNAME]
      );
      console.log('✅ Admin user password hash updated successfully');
    }
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error.message);
    throw error;
  }
}

// Allow running as a standalone script
if (require.main === module) {
  seedAdminUser()
    .then(() => {
      console.log('✅ Admin user seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin user seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAdminUser };
