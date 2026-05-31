/**
 * Run pending node-pg-migrate SQL migrations.
 * Used automatically on production startup (see start-server.js).
 */
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const backendRoot = path.join(__dirname, '..');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB;

  if (host && user && database) {
    const auth = password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user);
    return `postgresql://${auth}@${host}:${port}/${database}`;
  }

  return null;
}

function shouldRunMigrations() {
  const flag = process.env.RUN_DB_MIGRATIONS;
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return process.env.NODE_ENV === 'production';
}

function runMigrationsOnce() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL (or PGHOST/PGUSER/PGDATABASE) is not set. Migrations cannot run. Set DATABASE_URL or disable with RUN_DB_MIGRATIONS=false.'
    );
  }

  process.env.DATABASE_URL = databaseUrl;

  const migrateBin = path.join(
    backendRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'node-pg-migrate.cmd' : 'node-pg-migrate'
  );
  const args = [
    'up',
    '--migrations-dir',
    'migrations',
    '--migrations-table',
    'pgmigrations',
    '--migration-file-language',
    'sql',
    '--single-transaction',
  ];

  console.log('🔄 Running database migrations (node-pg-migrate up)...');

  const result = spawnSync(migrateBin, args, {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Database migrations failed with exit code ${result.status ?? 'unknown'}`);
  }

  console.log('✅ Database migrations complete');
}

async function runMigrations(options = {}) {
  const force = options.force === true;
  if (!force && !shouldRunMigrations()) {
    console.log('⏭️  Skipping database migrations (RUN_DB_MIGRATIONS / NODE_ENV)');
    return;
  }

  const maxAttempts = Math.max(1, parseInt(options.maxAttempts, 10) || 5);
  const delayMs = Math.max(500, parseInt(options.delayMs, 10) || 3000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      runMigrationsOnce();
      return;
    } catch (err) {
      const isLast = attempt === maxAttempts;
      console.error(
        `❌ Migration attempt ${attempt}/${maxAttempts} failed:`,
        err.message || err
      );
      if (isLast) throw err;
      console.log(`⏳ Retrying migrations in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
}

module.exports = { runMigrations, shouldRunMigrations, runMigrationsOnce };

if (require.main === module) {
  runMigrations({ force: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
