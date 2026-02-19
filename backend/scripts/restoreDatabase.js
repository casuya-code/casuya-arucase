/**
 * PostgreSQL restore from a custom-format dump (from backupDatabase.js).
 * Run from project root: node backend/scripts/restoreDatabase.js <path-to-dump>
 *
 * Example: node backend/scripts/restoreDatabase.js backend/backups/arucase_2025-02-18_11-30.dump
 *
 * WARNING: This can overwrite existing data. Use only on a copy or empty database.
 *
 * Requires: pg_restore on PATH. Uses .env for target connection.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { spawn } = require('child_process');
const path = require('path');

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error('Usage: node backend/scripts/restoreDatabase.js <path-to-dump>');
  console.error('Example: node backend/scripts/restoreDatabase.js backend/backups/arucase_2025-02-18_11-30.dump');
  process.exit(1);
}

const resolved = path.resolve(process.cwd(), dumpPath);
const fs = require('fs');
if (!fs.existsSync(resolved)) {
  console.error('File not found:', resolved);
  process.exit(1);
}

const env = { ...process.env };
const args = ['--clean', '--if-exists', '-d'];
if (env.DATABASE_URL) {
  args.push(env.DATABASE_URL);
} else {
  const db = env.PGDATABASE || env.POSTGRES_DB || 'railway';
  args.push(db);
}
args.push(resolved);

const child = spawn('pg_restore', args, {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error('pg_restore exited with code', code);
    process.exit(code);
  }
  console.log('✅ Restore completed.');
});
