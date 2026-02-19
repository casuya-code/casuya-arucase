/**
 * PostgreSQL backup using pg_dump.
 * Run from project root: node backend/scripts/backupDatabase.js
 *
 * Requires: pg_dump on PATH (from PostgreSQL client tools).
 * Uses .env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE or DATABASE_URL.
 *
 * Creates: backend/backups/arucase_YYYY-MM-DD_HH-mm.dump (custom format).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const now = new Date();
const dateStr = now.toISOString().slice(0, 10);
const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
const outFile = path.join(backupsDir, `arucase_${dateStr}_${timeStr}.dump`);

const env = { ...process.env };
if (env.DATABASE_URL) {
  // pg_dump accepts -d connection_string
  const args = ['-Fc', '-f', outFile, '-d', env.DATABASE_URL];
  runPgDump(args, env);
} else {
  const db = env.PGDATABASE || env.POSTGRES_DB || 'railway';
  const args = ['-Fc', '-f', outFile, '-d', db];
  runPgDump(args, env);
}

function runPgDump(args, env) {
  const child = spawn('pg_dump', args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true, // so pg_dump is found on Windows
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Backup written to:', outFile);
    } else {
      console.error('pg_dump failed (code %s). Ensure PostgreSQL client tools are installed and .env has correct DB settings.', code);
      if (stderr) console.error(stderr);
      process.exit(1);
    }
  });
}
