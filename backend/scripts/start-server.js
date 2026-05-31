#!/usr/bin/env node

/**
 * Railway / production startup script.
 * Runs pending DB migrations, then loads server.js.
 */

async function main() {
  console.log('🚀 Starting Railway server initialization...');
  console.log('📊 Node.js version:', process.version);
  console.log('📊 Environment:', process.env.NODE_ENV || 'development');
  console.log('📊 Working directory:', process.cwd());

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }

  console.log('🔧 Environment variables configured');
  console.log('📊 PORT:', process.env.PORT);
  console.log('📊 NODE_ENV:', process.env.NODE_ENV);

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log('📊 PUPPETEER_EXECUTABLE_PATH (env):', process.env.PUPPETEER_EXECUTABLE_PATH);
  } else {
    try {
      const { resolveExecutablePath } = require('../utils/puppeteerLaunch');
      const resolved = resolveExecutablePath();
      if (resolved) console.log('📊 Puppeteer will use:', resolved);
    } catch {
      /* resolved at first PDF request */
    }
  }

  const fs = require('fs');
  const path = require('path');

  const serverPath = path.join(__dirname, '../server.js');
  if (!fs.existsSync(serverPath)) {
    console.error('❌ ERROR: server.js not found at:', serverPath);
    process.exit(1);
  }

  console.log('✅ server.js found');

  try {
    const { runMigrations } = require('./runMigrations');
    await runMigrations();
  } catch (migrationError) {
    console.error('❌ Database migration failed — aborting startup:', migrationError.message);
    process.exit(1);
  }

  try {
    console.log('🔄 Running admin photos volume setup...');
    const { setupAdminPhotosVolume } = require('./setup-admin-photos-volume');
    setupAdminPhotosVolume();
  } catch (setupError) {
    console.error('⚠️  Admin photos volume setup encountered an error:', setupError.message);
  }

  try {
    console.log('🔄 Loading server.js...');

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      console.error('Stack:', error.stack);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      console.log('📡 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('📡 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    require('../server.js');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
